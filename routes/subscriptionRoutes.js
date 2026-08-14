const express = require('express');
const router = express.Router();
const {
    getActivePlans,
    getMyEntitlement,
    getMyHistory,
    verifyMySubscription,
} = require('../controllers/subscriptionController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Public pricing/plans catalog
router.get('/plans', getActivePlans);

// Authenticated admin (shop owner) endpoints
router.get('/me', verifyAdminToken, getMyEntitlement);
router.get('/my-history', verifyAdminToken, getMyHistory);
router.post('/verify', verifyAdminToken, verifyMySubscription);

module.exports = router;
