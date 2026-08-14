const prisma = require('../prisma/client');
const { getActiveEntitlement } = require('../services/subscriptionService');
const { reconcileFromSubscriber } = require('../services/revenueCatService');

// GET /subscriptions/plans — public catalog for the pricing/subscribe screen.
exports.getActivePlans = async (req, res) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        res.json({ plans });
    } catch (err) {
        console.error('Get Active Plans Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /subscriptions/me — the canonical "am I blocked" check for the client.
exports.getMyEntitlement = async (req, res) => {
    try {
        const entitlement = await getActiveEntitlement(req.admin.id);
        res.json(entitlement);
    } catch (err) {
        console.error('Get My Entitlement Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /subscriptions/my-history
exports.getMyHistory = async (req, res) => {
    try {
        const subscriptions = await prisma.userSubscription.findMany({
            where: { adminId: req.admin.id },
            include: { plan: true, payments: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ subscriptions });
    } catch (err) {
        console.error('Get My History Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /subscriptions/verify — safety net for the race where a client
// finishes a RevenueCat purchase before the webhook has landed.
exports.verifyMySubscription = async (req, res) => {
    try {
        const result = await reconcileFromSubscriber(req.admin.id);
        const entitlement = await getActiveEntitlement(req.admin.id);
        res.json({ ...result, entitlement });
    } catch (err) {
        console.error('Verify Subscription Error:', err);
        res.status(500).json({ error: err.message });
    }
};
