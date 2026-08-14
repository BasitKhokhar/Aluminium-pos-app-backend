const { handleWebhookEvent } = require('../services/revenueCatService');

// POST /webhooks/revenuecat — verified via a shared-secret header (configured
// in the RevenueCat dashboard), not JWT, since RevenueCat's servers call this.
exports.revenueCatWebhook = async (req, res) => {
    const providedSecret = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

    if (!process.env.REVENUECAT_WEBHOOK_SECRET || providedSecret !== process.env.REVENUECAT_WEBHOOK_SECRET) {
        return res.status(401).json({ message: 'Invalid webhook secret' });
    }

    const event = req.body?.event;
    if (!event || !event.id || !event.type) {
        return res.status(400).json({ message: 'Malformed webhook payload' });
    }

    try {
        const result = await handleWebhookEvent(event);
        res.status(200).json(result);
    } catch (err) {
        console.error('RevenueCat webhook error:', err);
        // Still 200 on unexpected errors after logging, to avoid RevenueCat
        // retry storms on a payload that will never succeed; genuinely
        // transient failures are rare enough to reconcile manually via
        // POST /subscriptions/verify instead.
        res.status(200).json({ ok: false, error: err.message });
    }
};
