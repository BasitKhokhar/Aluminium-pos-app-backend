const { getActiveEntitlement } = require('../services/subscriptionService');

// Applied at the /sync router level so it is structurally impossible to add
// a new sync endpoint without inheriting the gate — the exact gap AttaChaki
// left open (it built the equivalent check but never wired it to its sync routes).
module.exports = async function requireCloudAccess(req, res, next) {
    try {
        const entitlement = await getActiveEntitlement(req.admin.id);
        if (!entitlement.cloudEnabled) {
            return res.status(403).json({
                code: 'CLOUD_ACCESS_REQUIRED',
                message: 'Cloud sync is not enabled on your current plan.',
            });
        }
        req.entitlement = entitlement;
        next();
    } catch (err) {
        console.error('requireCloudAccess error:', err);
        res.status(500).json({ message: 'Server error checking cloud access' });
    }
};
