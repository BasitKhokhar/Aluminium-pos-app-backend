const express = require('express');
const router = express.Router();
const { createShop, getShops, getShopById, updateShop, deleteShop } = require('../controllers/shopsController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const requireActiveEntitlement = require('../middleware/requireActiveEntitlement');

router.use(verifyAdminToken);

router.post('/add', requireActiveEntitlement, createShop);
router.get('/all', getShops);
router.get('/:id', getShopById);
router.put('/update/:id', updateShop);
router.delete('/delete/:id', deleteShop);

module.exports = router;
