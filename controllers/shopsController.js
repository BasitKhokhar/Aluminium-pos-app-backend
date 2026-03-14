const prisma = require('../prisma/client');
const bucketStorage = require('../utils/bucketStorage');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Create a new Shop
exports.createShop = [
    upload.single("logo"),
    async (req, res) => {
        try {
            const { name, address, phone } = req.body;
            const file = req.file;

            console.log("📥 Creating shop:", name, address, phone);
            console.log("📥 Shop logo file:", file);

            const adminId = req.admin.id; // From verifyAdminToken middleware

            let logoUrl = req.body.logo;

            // Upload logo if provided
            if (file && file.buffer) {
                // Remove folder prefix since 'HamdanPOS' is already in .env paths.
                // This ensures images go directly into /ImagesBucket/HamdanPOS/
                const filename = `${Date.now()}_${file.originalname}`;
                logoUrl = await bucketStorage.uploadImageFromBuffer(
                    file.buffer,
                    file.mimetype,
                    filename
                );
            }
            console.log("payload sendign to create shop:", {
                name,
                address,
                phone,
                logo: logoUrl,
                adminId,
            });
            const shop = await prisma.shop.create({
                data: {
                    name,
                    address,
                    phone,
                    logo: logoUrl,
                    adminId,
                },
            });

            res.status(201).json({ message: 'Shop created successfully', shop, id: shop.id });
        } catch (err) {
            console.error('Create Shop Error:', err);
            res.status(500).json({ error: err.message });
        }
    }
];

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
exports.updateShop = [
    upload.single("logo"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { name, address, phone } = req.body;
            const file = req.file;
            const adminId = req.admin.id;

            const existingShop = await prisma.shop.findFirst({
                where: { id: parseInt(id), adminId }
            });

            if (!existingShop) return res.status(404).json({ message: 'Shop not found or unauthorized' });

            let logoUrl = req.body.logo || existingShop.logo;

            // Upload new logo if provided
            if (file && file.buffer) {
                const filename = `${Date.now()}_${file.originalname}`;
                logoUrl = await bucketStorage.uploadImageFromBuffer(
                    file.buffer,
                    file.mimetype,
                    filename
                );
            }

            const shop = await prisma.shop.update({
                where: { id: parseInt(id) },
                data: { name, address, phone, logo: logoUrl },
            });

            res.json({ message: 'Shop updated successfully', shop });
        } catch (err) {
            console.error('Update Shop Error:', err);
            res.status(500).json({ error: err.message });
        }
    }
];

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

