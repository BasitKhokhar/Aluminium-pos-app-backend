const prisma = require('../prisma/client');

// GET /shop-types — public, used by the registration screen's shop-type picker.
exports.getActiveShopTypes = async (req, res) => {
    try {
        const shopTypes = await prisma.shopType.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        res.json({ shopTypes });
    } catch (err) {
        console.error('Get Active Shop Types Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// -------- Superadmin CRUD --------

exports.getAllShopTypes = async (req, res) => {
    try {
        const shopTypes = await prisma.shopType.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json({ shopTypes });
    } catch (err) {
        console.error('Get All Shop Types Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createShopType = async (req, res) => {
    try {
        const shopType = await prisma.shopType.create({ data: req.body });
        res.status(201).json({ message: 'Shop type created', shopType });
    } catch (err) {
        if (err.code === 'P2002') return res.status(400).json({ message: 'Shop type code already exists' });
        console.error('Create Shop Type Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateShopType = async (req, res) => {
    try {
        const { id } = req.params;
        const shopType = await prisma.shopType.update({ where: { id: parseInt(id) }, data: req.body });
        res.json({ message: 'Shop type updated', shopType });
    } catch (err) {
        console.error('Update Shop Type Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Never hard-deleted (Shop.shopTypeId references it) — only deactivated so it
// drops out of the registration picker.
exports.deactivateShopType = async (req, res) => {
    try {
        const { id } = req.params;
        const shopType = await prisma.shopType.update({ where: { id: parseInt(id) }, data: { isActive: false } });
        res.json({ message: 'Shop type deactivated', shopType });
    } catch (err) {
        console.error('Deactivate Shop Type Error:', err);
        res.status(500).json({ error: err.message });
    }
};
