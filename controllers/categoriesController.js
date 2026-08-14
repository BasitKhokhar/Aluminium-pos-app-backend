const prisma = require('../prisma/client');
const bucketStorage = require('../utils/bucketStorage');

// Create a new Category
// Note: multer (`upload.single('image')`) is applied in the route file, BEFORE
// tenantContext — tenantContext reads req.body.shopId, which multer must have
// already parsed off the multipart body for that to be populated.
exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const shopId = req.tenant.shopId;
        const file = req.file;

        let imageUrl = req.body.image;

        if (file && file.buffer) {
            const filename = `${Date.now()}_${file.originalname}`;
            imageUrl = await bucketStorage.uploadImageFromBuffer(file.buffer, file.mimetype, filename);
        }

        const category = await prisma.category.create({
            data: { name, image: imageUrl, shopId },
        });

        res.status(201).json({ message: 'Category created successfully', category });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'A category with this name already exists in this shop' });
        }
        console.error('Create Category Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all categories for the shop
exports.getCategories = async (req, res) => {
    try {
        const shopId = req.tenant.shopId;

        const categories = await prisma.category.findMany({
            where: { shopId, isDeleted: false },
            include: { _count: { select: { products: true } } },
        });
        res.json(categories);
    } catch (err) {
        console.error('Get Categories Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get single category by ID (ownership resolved by middleware.tenantContext.byResourceId)
exports.getCategoryById = async (req, res) => {
    try {
        const category = await prisma.category.findFirst({
            where: { id: parseInt(req.params.id), shopId: req.tenant.shopId },
            include: { _count: { select: { products: true } } },
        });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (err) {
        console.error('Get Category Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const shopId = req.tenant.shopId;
        const { name } = req.body;
        const file = req.file;

        const existingCategory = await prisma.category.findFirst({ where: { id: categoryId, shopId } });
        if (!existingCategory) return res.status(404).json({ message: 'Category not found' });

        let imageUrl = req.body.image || existingCategory.image;

        if (file && file.buffer) {
            const filename = `${Date.now()}_${file.originalname}`;
            imageUrl = await bucketStorage.uploadImageFromBuffer(file.buffer, file.mimetype, filename);
        }

        const category = await prisma.category.update({
            where: { id: categoryId, shopId },
            data: { name, image: imageUrl },
        });

        res.json({ message: 'Category updated successfully', category });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'A category with this name already exists in this shop' });
        }
        console.error('Update Category Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Soft-delete a category (tombstone for sync; avoids the FK-RESTRICT hard-delete failure)
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const shopId = req.tenant.shopId;

        const existing = await prisma.category.findFirst({ where: { id: categoryId, shopId } });
        if (!existing) return res.status(404).json({ message: 'Category not found' });

        await prisma.category.update({
            where: { id: categoryId, shopId },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Delete Category Error:', err);
        res.status(500).json({ error: err.message });
    }
};
