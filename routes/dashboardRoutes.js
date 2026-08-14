const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getSalesTrend,
    getSalesByProduct,
    getSalesByCategory,
    getProfitMarginTrend,
    exportAnalyticsCsv,
} = require('../controllers/DashboardController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantContext');

router.get('/stats', verifyAdminToken, tenantContext, getDashboardStats);
router.get('/analytics/sales-trend', verifyAdminToken, tenantContext, getSalesTrend);
router.get('/analytics/by-product', verifyAdminToken, tenantContext, getSalesByProduct);
router.get('/analytics/by-category', verifyAdminToken, tenantContext, getSalesByCategory);
router.get('/analytics/profit-margin', verifyAdminToken, tenantContext, getProfitMarginTrend);
router.get('/export', verifyAdminToken, tenantContext, exportAnalyticsCsv);

module.exports = router;
