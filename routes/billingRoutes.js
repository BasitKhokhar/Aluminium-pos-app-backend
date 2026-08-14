const express = require('express');
const router = express.Router();
const { createBill, getBills, getBillById, updateBill } = require('../controllers/billingControllers');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantContext');
const requireActiveEntitlement = require('../middleware/requireActiveEntitlement');
const prisma = require('../prisma/client');

router.use(verifyAdminToken);

router.post('/create', tenantContext, requireActiveEntitlement, createBill);
router.get('/getallbills', tenantContext, getBills);
router.get('/:id', tenantContext.byResourceId(prisma.bill), getBillById);
router.put('/update/:id', tenantContext.byResourceId(prisma.bill), updateBill);

module.exports = router;
