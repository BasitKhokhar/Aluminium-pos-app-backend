const express = require('express');
const router = express.Router();
const { register, adminLogin, adminRefresh, updateAdminPassword } = require('../controllers/authController');
const { superAdminLogin, superAdminRefresh } = require('../controllers/superAdminController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Admin (shop owner) auth
router.post('/admin/register', register);
router.post('/admin/login', adminLogin);
router.post('/admin/refresh', adminRefresh);
router.put('/admin/update-password', verifyAdminToken, updateAdminPassword);

// Superadmin (platform) auth
router.post('/superadmin/login', superAdminLogin);
router.post('/superadmin/refresh', superAdminRefresh);

module.exports = router;
