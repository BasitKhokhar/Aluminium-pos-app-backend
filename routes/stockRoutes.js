const express = require('express');
const router = express.Router();
const { addStockLog, getStockLogs, getProductStockInDetails } = require('../controllers/stockController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantContext');
const requireActiveEntitlement = require('../middleware/requireActiveEntitlement');

router.use(verifyAdminToken, tenantContext);

router.post('/', requireActiveEntitlement, addStockLog);
router.get('/', getStockLogs);
router.get('/product-stock-in', getProductStockInDetails);

module.exports = router;
