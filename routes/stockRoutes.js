const express = require('express');
const router = express.Router();
const { addStockLog, getStockLogs } = require('../controllers/stockController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/', verifyAdminToken, addStockLog);
router.get('/', verifyAdminToken, getStockLogs);

module.exports = router;
