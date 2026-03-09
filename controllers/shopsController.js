const prisma = require('../prisma/client');

// Create a new Shop
exports.createShop = async (req, res) => {
    try {
        const { name, address, phone, logo } = req.body;
        console.log("data in create shop ", name, address, phone, logo)
        const adminId = req.admin.id; // From verifyAdminToken middleware

        const shop = await prisma.shop.create({
            data: {
                name,
                address,
                phone,
                logo,
                adminId,
            },
        });

        res.status(201).json({ message: 'Shop created successfully', shop, id: shop.id });
    } catch (err) {
        console.error('Create Shop Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all shops for the logged-in admin
exports.getShops = async (req, res) => {
    try {
        const adminId = req.admin.id;
        const shops = await prisma.shop.findMany({
            where: { adminId },
            include: {
                _count: {
                    select: { products: true, bills: true }
                }
            }
        });

        res.json(shops);
    } catch (err) {
        console.error('Get Shops Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get a single shop by ID
exports.getShopById = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin.id;

        const shop = await prisma.shop.findFirst({
            where: {
                id: parseInt(id),
                adminId: adminId,
            },
            include: {
                _count: {
                    select: { products: true, bills: true }
                }
            }
        });

        if (!shop) return res.status(404).json({ message: 'Shop not found' });

        res.json(shop);
    } catch (err) {
        console.error('Get Shop Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update a shop
exports.updateShop = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, logo } = req.body;
        const adminId = req.admin.id;

        const shop = await prisma.shop.updateMany({
            where: {
                id: parseInt(id),
                adminId: adminId,
            },
            data: { name, address, phone, logo },
        });

        if (shop.count === 0) return res.status(404).json({ message: 'Shop not found or unauthorized' });

        res.json({ message: 'Shop updated successfully' });
    } catch (err) {
        console.error('Update Shop Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete a shop
exports.deleteShop = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin.id;

        // Check if shop exists and belongs to admin
        const shop = await prisma.shop.findFirst({
            where: { id: parseInt(id), adminId }
        });

        if (!shop) return res.status(404).json({ message: 'Shop not found or unauthorized' });

        await prisma.shop.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Shop deleted successfully' });
    } catch (err) {
        console.error('Delete Shop Error:', err);
        res.status(500).json({ error: err.message });
    }
};
