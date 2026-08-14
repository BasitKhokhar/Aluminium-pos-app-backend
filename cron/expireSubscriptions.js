const prisma = require('../prisma/client');

// Flips past-due ACTIVE/GRACE_PERIOD subscriptions to EXPIRED. Entitlement is
// computed at read time from status+expiryDate anyway, so this cron isn't
// load-bearing for correctness — it just keeps `status` accurate for anyone
// querying UserSubscription directly (superadmin dashboards, etc).
async function expireSubscriptions() {
    const result = await prisma.userSubscription.updateMany({
        where: {
            status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
            expiryDate: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
        console.log(`[cron] expireSubscriptions: marked ${result.count} subscription(s) EXPIRED`);
    }
}

module.exports = expireSubscriptions;
