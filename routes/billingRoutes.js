const express = require('express');
const router = express.Router();
const { createBill, getBills, getBillById, updateBill } = require('../controllers/billingControllers');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/create', verifyAdminToken, createBill);
router.get('/getallbills', verifyAdminToken, getBills);
router.get('/:id', verifyAdminToken, getBillById);
router.put('/update/:id', verifyAdminToken, updateBill);

module.exports = router;
