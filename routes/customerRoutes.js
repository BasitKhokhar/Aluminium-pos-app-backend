const express = require('express');
const router = express.Router();
const {
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    recordPayment,
    getCustomerPayments,
} = require('../controllers/customerController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const tenantContext = require('../middleware/tenantContext');
const requireActiveEntitlement = require('../middleware/requireActiveEntitlement');
const prisma = require('../prisma/client');

router.use(verifyAdminToken);

router.post('/add', tenantContext, requireActiveEntitlement, createCustomer);
router.get('/list', tenantContext, getCustomers);
router.get('/:id', tenantContext.byResourceId(prisma.customer), getCustomerById);
router.put('/update/:id', tenantContext.byResourceId(prisma.customer), updateCustomer);
router.delete('/delete/:id', tenantContext.byResourceId(prisma.customer), deleteCustomer);

// Recording a khata payment is not gated by requireActiveEntitlement — same
// precedent as updateBill's NewRecivedPyament path: collecting money a
// customer already owes should never be blocked by a lapsed plan.
router.post('/:id/payments', tenantContext.byResourceId(prisma.customer), recordPayment);
router.get('/:id/payments', tenantContext.byResourceId(prisma.customer), getCustomerPayments);

module.exports = router;
