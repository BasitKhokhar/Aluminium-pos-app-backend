const customerService = require('../services/customerService');

exports.createCustomer = async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name) return res.status(400).json({ message: 'name is required' });

        const customer = await customerService.createCustomer(req.tenant, { name, phone });
        res.status(201).json({ message: 'Customer created successfully', customer });
    } catch (err) {
        console.error('Create Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getCustomers = async (req, res) => {
    try {
        const customers = await customerService.listCustomers(req.tenant);
        res.json({ customers });
    } catch (err) {
        console.error('Get Customers Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Ownership resolved by middleware.tenantContext.byResourceId
exports.getCustomerById = async (req, res) => {
    try {
        const customer = await customerService.getCustomerById(req.tenant, parseInt(req.params.id));
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        console.error('Get Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const customer = await customerService.updateCustomer(req.tenant, parseInt(req.params.id), { name, phone });
        res.json({ message: 'Customer updated successfully', customer });
    } catch (err) {
        console.error('Update Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        await customerService.deleteCustomer(req.tenant, parseInt(req.params.id));
        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error('Delete Customer Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.recordPayment = async (req, res) => {
    try {
        const { amount, note } = req.body;
        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'A positive amount is required' });
        }

        const deviceId = req.headers['x-device-id'] || null;
        const payment = await customerService.recordPayment(req.tenant, parseInt(req.params.id), { amount, note }, deviceId);
        res.status(201).json({ message: 'Payment recorded successfully', payment });
    } catch (err) {
        console.error('Record Customer Payment Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getCustomerPayments = async (req, res) => {
    try {
        const payments = await customerService.getCustomerPayments(req.tenant, parseInt(req.params.id));
        res.json({ payments });
    } catch (err) {
        console.error('Get Customer Payments Error:', err);
        res.status(500).json({ error: err.message });
    }
};
