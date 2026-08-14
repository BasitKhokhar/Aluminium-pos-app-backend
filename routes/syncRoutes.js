const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantContext');
const requireCloudAccess = require('../middleware/requireCloudAccess');
const requireDeviceRegistered = require('../middleware/requireDeviceRegistered');

// Every /sync/* route requires: a valid admin JWT, a shop the admin owns
// (sent as shopId in the body/query/header), and an active cloud-sync
// entitlement — applied here at the router level so no future endpoint can
// be added to this file without inheriting the gate.
router.use(verifyAdminToken, tenantContext, requireCloudAccess);

router.post('/devices/register', syncController.registerDevice);
router.get('/status', syncController.status);

router.get('/pull', requireDeviceRegistered, syncController.pull);
router.post('/push/categories', requireDeviceRegistered, syncController.pushCategories);
router.post('/push/products', requireDeviceRegistered, syncController.pushProducts);
router.post('/push/stock-adjustments', requireDeviceRegistered, syncController.pushStockAdjustments);
router.post('/push/bills', requireDeviceRegistered, syncController.pushBills);
router.post('/push/customers', requireDeviceRegistered, syncController.pushCustomers);
router.post('/push/customer-payments', requireDeviceRegistered, syncController.pushCustomerPayments);

module.exports = router;
