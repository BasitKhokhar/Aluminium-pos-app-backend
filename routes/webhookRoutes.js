const express = require('express');
const router = express.Router();
const { revenueCatWebhook } = require('../controllers/webhookController');

// No JWT here — RevenueCat's servers call this directly, verified via a
// shared-secret header instead (see controllers/webhookController.js).
router.post('/revenuecat', revenueCatWebhook);

module.exports = router;
