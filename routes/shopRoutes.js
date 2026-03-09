const express = require('express');
const router = express.Router();
const { createShop, getShops, getShopById, updateShop, deleteShop } = require('../controllers/shopsController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/add', verifyAdminToken, createShop);
router.get('/all', verifyAdminToken, getShops);
router.get('/:id', verifyAdminToken, getShopById);
router.put('/update/:id', verifyAdminToken, updateShop);
router.delete('/delete/:id', verifyAdminToken, deleteShop);

module.exports = router;
