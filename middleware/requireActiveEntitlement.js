const { getActiveEntitlement } = require('../services/subscriptionService');

// Gates create-only endpoints (add product/category/bill/stock/shop). Reads,
// login, and edits to existing records are never blocked — an expired trial
// or plan keeps full read/offline access, matching the non-blocking-login
// behavior the product is designed around.
module.exports = async function requireActiveEntitlement(req, res, next) {
    try {
        const entitlement = await getActiveEntitlement(req.admin.id);
        if (!entitlement.canWrite) {
            return res.status(402).json({
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'Your plan has expired. Please subscribe to add new records.',
                entitlement,
            });
        }
        req.entitlement = entitlement;
        next();
    } catch (err) {
        console.error('requireActiveEntitlement error:', err);
        res.status(500).json({ message: 'Server error checking subscription status' });
    }
};
