const axios = require('axios');
const prisma = require('../prisma/client');

const NEW_PURCHASE_EVENTS = ['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'];
const REACTIVATE_EVENTS = ['RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'];

function resolveAdminId(event) {
    // Contract with the mobile app: it must call Purchases.logIn(String(adminId))
    // right after our login succeeds, so app_user_id maps directly to Admin.id.
    const adminId = parseInt(event.app_user_id, 10);
    return Number.isNaN(adminId) ? null : adminId;
}

function statusForEvent(type) {
    if (type === 'EXPIRATION') return 'EXPIRED';
    if (type === 'BILLING_ISSUE') return 'GRACE_PERIOD';
    if (type === 'SUBSCRIPTION_PAUSED') return 'PAUSED';
    return 'ACTIVE';
}

// Processes one RevenueCat webhook event. Idempotent on event.id via the
// unique constraint on SubscriptionPayment.revenueCatEventId — a retried
// webhook delivery just hits P2002 and no-ops.
async function handleWebhookEvent(event) {
    const adminId = resolveAdminId(event);
    if (!adminId) {
        console.warn(`[revenueCat] Unmapped app_user_id "${event.app_user_id}" on event ${event.id} — skipping`);
        return { ok: true, skipped: true, reason: 'UNMAPPED_APP_USER_ID' };
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
        console.warn(`[revenueCat] No Admin #${adminId} for event ${event.id} — skipping`);
        return { ok: true, skipped: true, reason: 'ADMIN_NOT_FOUND' };
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { revenueCatProductId: event.product_id } });
    if (!plan) {
        console.warn(`[revenueCat] No SubscriptionPlan for product_id "${event.product_id}" on event ${event.id} — skipping`);
        return { ok: true, skipped: true, reason: 'PLAN_NOT_FOUND' };
    }

    try {
        return await prisma.$transaction(async (tx) => {
            const expiryDate = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
            const pricePaid = typeof event.price === 'number' ? event.price : null;

            let subscription;

            if (NEW_PURCHASE_EVENTS.includes(event.type)) {
                // A fresh purchase — supersede any other live subscription so
                // exactly one stays ACTIVE/GRACE_PERIOD at a time, then record
                // this purchase as its own row (preserves purchase history).
                await tx.userSubscription.updateMany({
                    where: { adminId, status: { in: ['ACTIVE', 'GRACE_PERIOD'] } },
                    data: { status: 'EXPIRED' },
                });

                subscription = await tx.userSubscription.create({
                    data: {
                        adminId,
                        planId: plan.id,
                        status: 'ACTIVE',
                        isTrial: false,
                        paymentProvider: 'REVENUECAT',
                        billingCycle: plan.billingCycle,
                        pricePaid,
                        priceCurrency: event.currency || plan.currency,
                        revenueCatAppUserId: event.app_user_id,
                        originalTransactionId: event.original_transaction_id || event.transaction_id,
                        productId: event.product_id,
                        store: event.store,
                        expiryDate,
                        cloudEnabled: plan.cloudEnabled,
                        offlineEnabled: plan.offlineEnabled,
                        maxDevices: plan.maxDevices,
                    },
                });
            } else {
                subscription = await tx.userSubscription.findFirst({
                    where: { adminId },
                    orderBy: { createdAt: 'desc' },
                });

                if (!subscription) {
                    // Out-of-order delivery (e.g. a RENEWAL arriving before its
                    // INITIAL_PURCHASE) — create the row now so we don't drop the event.
                    subscription = await tx.userSubscription.create({
                        data: {
                            adminId,
                            planId: plan.id,
                            status: statusForEvent(event.type),
                            isTrial: false,
                            paymentProvider: 'REVENUECAT',
                            billingCycle: plan.billingCycle,
                            pricePaid,
                            priceCurrency: event.currency || plan.currency,
                            revenueCatAppUserId: event.app_user_id,
                            productId: event.product_id,
                            store: event.store,
                            expiryDate,
                            cloudEnabled: plan.cloudEnabled,
                            offlineEnabled: plan.offlineEnabled,
                            maxDevices: plan.maxDevices,
                        },
                    });
                } else {
                    const data = {};

                    if (event.type === 'CANCELLATION') {
                        // Auto-renew turned off — don't revoke access yet, the
                        // current paid period hasn't ended. EXPIRATION/the cron
                        // sweep handles the actual revocation once it does.
                        data.cancelledAt = new Date();
                    } else {
                        data.status = statusForEvent(event.type);
                        if (expiryDate) data.expiryDate = expiryDate;
                        if (event.type === 'UNCANCELLATION') data.cancelledAt = null;
                    }

                    subscription = await tx.userSubscription.update({
                        where: { id: subscription.id },
                        data,
                    });
                }
            }

            await tx.subscriptionPayment.create({
                data: {
                    subscriptionId: subscription.id,
                    amount: pricePaid || 0,
                    currency: event.currency || plan.currency,
                    paymentProvider: 'REVENUECAT',
                    paymentStatus: event.type === 'BILLING_ISSUE' ? 'FAILED' : 'PAID',
                    transactionId: event.transaction_id,
                    revenueCatEventId: event.id,
                    eventType: event.type,
                    rawPayload: event,
                    paidAt: new Date(),
                },
            });

            return { ok: true, subscriptionId: subscription.id };
        });
    } catch (err) {
        if (err.code === 'P2002' && err.meta?.target?.includes('revenueCatEventId')) {
            // Already processed this exact event (RevenueCat retried delivery).
            return { ok: true, deduped: true };
        }
        throw err;
    }
}

// Safety net for the race where a client finishes a purchase before the
// webhook lands: calls RevenueCat's REST API directly and reconciles.
async function verifySubscriberFromApi(adminId) {
    if (!process.env.REVENUECAT_API_KEY) {
        throw new Error('REVENUECAT_API_KEY is not configured');
    }

    const { data } = await axios.get(`https://api.revenuecat.com/v1/subscribers/${adminId}`, {
        headers: { Authorization: `Bearer ${process.env.REVENUECAT_API_KEY}` },
    });

    return data;
}

// Reconciles local state from RevenueCat's live subscriber snapshot, for the
// race where a client finishes checkout before the webhook has landed. Picks
// the most-recently-purchased non-expired entitlement (subscription or
// one-time product) and feeds it through the same path as a real webhook
// event, so there is only one place that actually writes UserSubscription rows.
async function reconcileFromSubscriber(adminId) {
    const data = await verifySubscriberFromApi(adminId);
    const subscriber = data.subscriber;
    if (!subscriber) return { ok: true, reconciled: false };

    const now = Date.now();
    let best = null;

    for (const [productId, sub] of Object.entries(subscriber.subscriptions || {})) {
        const expiresAtMs = sub.expires_date ? new Date(sub.expires_date).getTime() : null;
        if (expiresAtMs && expiresAtMs < now) continue;
        const purchasedAtMs = new Date(sub.purchase_date).getTime();
        if (!best || purchasedAtMs > best.purchasedAtMs) {
            best = { productId, expiresAtMs, purchasedAtMs, store: sub.store?.toUpperCase() || null, type: 'RENEWAL' };
        }
    }

    for (const [productId, entries] of Object.entries(subscriber.non_subscriptions || {})) {
        const latest = entries[entries.length - 1];
        if (!latest) continue;
        const purchasedAtMs = new Date(latest.purchase_date).getTime();
        if (!best || purchasedAtMs > best.purchasedAtMs) {
            best = { productId, expiresAtMs: null, purchasedAtMs, store: latest.store?.toUpperCase() || null, type: 'NON_RENEWING_PURCHASE' };
        }
    }

    if (!best) return { ok: true, reconciled: false };

    const syntheticEvent = {
        id: `verify_${adminId}_${best.purchasedAtMs}`,
        type: best.type,
        app_user_id: String(adminId),
        product_id: best.productId,
        expiration_at_ms: best.expiresAtMs,
        store: best.store,
        price: null,
        currency: null,
        transaction_id: `verify_${best.purchasedAtMs}`,
    };

    return handleWebhookEvent(syntheticEvent);
}

module.exports = {
    handleWebhookEvent,
    verifySubscriberFromApi,
    reconcileFromSubscriber,
};
