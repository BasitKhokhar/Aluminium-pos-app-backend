const express = require('express');
const router = express.Router();
const { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory } = require('../controllers/categoriesController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/add', verifyAdminToken, createCategory);
router.get('/get', verifyAdminToken, getCategories);
router.get('/get/:id', verifyAdminToken, getCategoryById);
router.put('/update/:id', verifyAdminToken, updateCategory);
router.delete('/delete/:id', verifyAdminToken, deleteCategory);

module.exports = router;
