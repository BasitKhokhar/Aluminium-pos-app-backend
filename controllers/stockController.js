const prisma = require('../prisma/client');

// Manually add/remove stock
exports.addStockLog = async (req, res) => {
    const { shopId, productId, type, quantity, price, description } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Stock Transaction Log
            const log = await tx.stockTransaction.create({
                data: {
                    shopId: parseInt(shopId),
                    productId: parseInt(productId),
                    type, // IN or OUT
                    quantity: parseFloat(quantity),
                    price: price ? parseFloat(price) : null,
                    description,
                },
            });

            // 2. Update Product Stock Quantity
            const updateData = {};
            if (type === 'IN') {
                updateData.stockQuantity = { increment: parseFloat(quantity) };
            } else if (type === 'OUT') {
                updateData.stockQuantity = { decrement: parseFloat(quantity) };
            }

            const product = await tx.product.update({
                where: { id: parseInt(productId) },
                data: updateData,
            });

            return { log, product };
        });

        res.json({ message: 'Stock updated successfully', ...result });
    } catch (err) {
        console.error('Stock Log Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get stock transaction history for a product or shop
exports.getStockLogs = async (req, res) => {
    try {
        const { shopId, productId } = req.query;

        const where = {};
        if (shopId) where.shopId = parseInt(shopId);
        if (productId) where.productId = parseInt(productId);

        if (Object.keys(where).length === 0) {
            return res.status(400).json({ message: 'shopId or productId is required' });
        }

        const logs = await prisma.stockTransaction.findMany({
            where,
            include: {
                product: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(logs);
    } catch (err) {
        console.error('Get Stock Logs Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get specific product stock-in detail with date range
exports.getProductStockInDetails = async (req, res) => {
    try {
        const { productId, startDate, endDate, type = 'IN' } = req.query;

        if (!productId || !startDate || !endDate) {
            return res.status(400).json({ message: 'productId, startDate, and endDate are required' });
        }

        const where = {
            productId: parseInt(productId),
        };

        // 🟢 TYPE FILTER (IN, OUT, or all)
        if (type !== 'all') {
            where.type = type; // IN or OUT
        }

        // 📅 DATE RANGE FILTER
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate + "T00:00:00.000Z"),
                lte: new Date(endDate + "T23:59:59.999Z"),
            };
        }

        const logs = await prisma.stockTransaction.findMany({
            where,
            include: {
                product: {
                    select: {
                        name: true,
                        purchasePrice: true,
                        salePrice: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            logs
        });
    } catch (err) {
        console.error('Get Product Stock In Details Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
