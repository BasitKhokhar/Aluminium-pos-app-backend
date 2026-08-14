const express = require('express');
const router = express.Router();
const {
    createPlan,
    getAllPlans,
    updatePlan,
    deactivatePlan,
    assignSubscription,
    getAllAdmins,
    setAdminStatus,
} = require('../controllers/superAdminController');
const { verifySuperAdminToken } = require('../middleware/authMiddleware');

router.use(verifySuperAdminToken);

// Plan CRUD
router.post('/plans/add', createPlan);
router.get('/plans/all', getAllPlans);
router.put('/plans/update/:id', updatePlan);
router.delete('/plans/deactivate/:id', deactivatePlan);

// Manual subscription assignment (bank transfer sales, goodwill extensions)
router.post('/subscriptions/assign', assignSubscription);

// Admin (tenant) management
router.get('/admins', getAllAdmins);
router.put('/admins/:id/status', setAdminStatus);

module.exports = router;
