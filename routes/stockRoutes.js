const express = require('express');
const router = express.Router();
const { addStockLog, getStockLogs, getProductStockInDetails } = require('../controllers/stockController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/', verifyAdminToken, addStockLog);
router.get('/', verifyAdminToken, getStockLogs);
router.get('/product-stock-in', verifyAdminToken, getProductStockInDetails);

module.exports = router;
