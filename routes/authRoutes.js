
const express = require('express');
const router = express.Router();
const { signup, login, deleteAccount, refreshToken, adminSignup, adminLogin, adminRefresh, logout, updatePassword, updateAdminPassword } = require('../controllers/authController');
const { verifyToken, verifyAdminToken } = require('../middleware/authMiddleware');

// user related 
router.post('/users/signup', signup);
router.post('/users/login', login);
router.delete('/users/delete', verifyToken, deleteAccount);
router.put('/users/update-password', verifyToken, updatePassword);

router.post('/refresh', refreshToken);

// Admin related
router.post('/admin/signup', adminSignup);
router.post('/admin/login', adminLogin);
router.post('/admin/refresh', adminRefresh);
router.put('/admin/update-password', verifyAdminToken, updateAdminPassword);

router.post('/users/logout', verifyToken, logout);
module.exports = router;