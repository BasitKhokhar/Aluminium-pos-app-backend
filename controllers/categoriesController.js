const prisma = require('../prisma/client');

// Create a new Category
exports.createCategory = async (req, res) => {
    try {
        const { name, image, shopId } = req.body;

        if (!shopId) {
            return res.status(400).json({ message: 'shopId is required' });
        }

        const category = await prisma.category.create({
            data: { name, image, shopId: parseInt(shopId) },
        });

        res.status(201).json({ message: 'Category created successfully', category });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        console.error('Create Category Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all categories
exports.getCategories = async (req, res) => {
    try {
        const { shopId } = req.query;

        let whereClause = {};
        if (shopId) {
            whereClause.shopId = parseInt(shopId);
        }

        const categories = await prisma.category.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });
        res.json(categories);
    } catch (err) {
        console.error('Get Categories Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get single category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await prisma.category.findUnique({
            where: { id: parseInt(id) },
            include: {
                _count: {
                    select: { products: true }
                }
            }
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
        const { id } = req.params;
        const { name, image } = req.body;

        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data: { name, image },
        });

        res.json({ message: 'Category updated successfully', category });
    } catch (err) {
        console.error('Update Category Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.category.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Delete Category Error:', err);
        res.status(500).json({ error: err.message });
    }
};
