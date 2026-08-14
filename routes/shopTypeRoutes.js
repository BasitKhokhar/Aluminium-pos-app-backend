const express = require('express');
const router = express.Router();
const {
    getActiveShopTypes,
    getAllShopTypes,
    createShopType,
    updateShopType,
    deactivateShopType,
} = require('../controllers/shopTypeController');
const { verifySuperAdminToken } = require('../middleware/authMiddleware');

// Public — used by the registration screen's shop-type picker.
router.get('/', getActiveShopTypes);

// Superadmin CRUD
router.get('/all', verifySuperAdminToken, getAllShopTypes);
router.post('/add', verifySuperAdminToken, createShopType);
router.put('/update/:id', verifySuperAdminToken, updateShopType);
router.delete('/deactivate/:id', verifySuperAdminToken, deactivateShopType);

module.exports = router;
