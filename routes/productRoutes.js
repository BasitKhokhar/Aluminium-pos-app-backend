const express = require('express');
const router = express.Router();
const { createProduct, getProducts, getAllProducts, getProductById, updateProduct, deleteProduct, searchProducts } = require('../controllers/productsController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/add', verifyAdminToken, createProduct);
router.get('/getproducts', verifyAdminToken, getProducts);
router.get('/getallproducts/:shopId', verifyAdminToken, getAllProducts);
router.get('/getproduct/:id', verifyAdminToken, getProductById);
router.get('/search', verifyAdminToken, searchProducts);
router.put('/updateproduct/:id', verifyAdminToken, updateProduct);
router.delete('/deleteproduct/:id', verifyAdminToken, deleteProduct);

module.exports = router;
