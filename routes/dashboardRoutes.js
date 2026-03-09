const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/DashboardController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.get('/stats', verifyAdminToken, getDashboardStats);

module.exports = router;
