const prisma = require('../prisma/client');
const { convertToCm, calculateAreaCm2, getAreaConversionFactor } = require('../utils/unitConverter');
const bucketStorage = require('../utils/bucketStorage');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Create a new Product
exports.createProduct = [
    upload.single("image"),
    async (req, res) => {
        const {
            shopId,
            categoryId,
            name,
            stockType, // unitbased | areabased
            quantity,
            purchasePrice,
            salePrice,
            unit, // for areabased: feet | meter | inch | cm
            sheetWidth,
            sheetHeight,
        } = req.body;

        const file = req.file;

        console.log("📥 Creating product:", req.body);
        console.log("📥 Product image file:", file);

        if (!shopId || shopId === 'undefined' || isNaN(parseInt(shopId))) {
            return res.status(400).json({ message: 'Valid shopId is required' });
        }

        try {
            let imageUrl = req.body.image; // Fallback if image URL is passed as string

            // 1️⃣ Upload buffer to bucket if a file is provided
            if (file && file.buffer) {
                const filename = `products/${Date.now()}_${file.originalname}`;
                imageUrl = await bucketStorage.uploadImageFromBuffer(
                    file.buffer,
                    file.mimetype,
                    filename
                );
            }

            let data = {
                shopId: parseInt(shopId),
                categoryId: categoryId && categoryId !== 'undefined' && !isNaN(parseInt(categoryId)) ? parseInt(categoryId) : null,
                name,
                image: imageUrl,
                purchasePrice: parseFloat(purchasePrice),
                salePrice: parseFloat(salePrice),
            };

            if (stockType === 'areabased') {
                const widthCm = convertToCm(parseFloat(sheetWidth), unit);
                const heightCm = convertToCm(parseFloat(sheetHeight), unit);
                const areaCm2 = calculateAreaCm2(parseFloat(sheetWidth), parseFloat(sheetHeight), unit);
                const areaFactor = getAreaConversionFactor(unit);

                data.stockType = 'area';
                data.sheetWidthCm = widthCm;
                data.sheetHeightCm = heightCm;
                data.sheetAreaCm2 = areaCm2;
                data.stockAreaCm2 = areaCm2 * (parseFloat(quantity) || 0);
                data.stockQuantity = parseFloat(quantity) || 0;

                // Adjust prices to smallest unit (cm2) if input unit is not cm
                if (areaFactor > 1) {
                    data.purchasePrice = parseFloat(purchasePrice) / areaFactor;
                    data.salePrice = parseFloat(salePrice) / areaFactor;
                }
            } else {
                // Default to unitbased/quantity
                data.stockType = 'quantity';
                data.stockQuantity = parseFloat(quantity) || 0;
            }

            const product = await prisma.product.create({ data });

            res.status(201).json({ message: 'Product created successfully', product });
        } catch (err) {
            console.error('❌ Create Product Error:', err);
            res.status(500).json({ error: err.message });
        }
    }
];


// Get all products (filtered by shop and optionally category)
exports.getProducts = async (req, res) => {
    try {
        const { shopId, categoryId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!shopId || shopId === 'undefined' || isNaN(parseInt(shopId))) {
            return res.status(400).json({ message: 'Valid shopId is required' });
        }

        const where = { shopId: parseInt(shopId) };
        if (categoryId) where.categoryId = parseInt(categoryId);

        // Fetch paginated products
        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        const total = await prisma.product.count({ where });
        const hasMore = skip + limit < total;

        res.json({
            success: true,
            products,
            total,
            page,
            limit,
            hasMore,
        });
    } catch (err) {
        console.error('Get Products Error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// Get all products (filtered by shop)
exports.getAllProducts = async (req, res) => {
    try {
        const { shopId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        console.log("📥 Fetching paginated products for shop:", shopId, { page, limit });

        if (!shopId || shopId === 'undefined' || isNaN(parseInt(shopId))) {
            return res.status(400).json({ message: 'Valid shopId is required' });
        }

        const where = { shopId: parseInt(shopId) };

        // Fetch paginated products
        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        // Total product count for this shop
        const total = await prisma.product.count({ where });

        const hasMore = skip + limit < total;

        res.json({
            success: true,
            products,
            total,
            page,
            limit,
            hasMore,
        });
    } catch (err) {
        console.error('❌ Error fetching products:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};
// Get single product by ID
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                category: true,
                shop: true
            }
        });

        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error('Get Product Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update a product
exports.updateProduct = [
    upload.single("image"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const {
                categoryId,
                name,
                stockType,
                quantity,
                purchasePrice,
                salePrice,
                unit,
                sheetWidth,
                sheetHeight
            } = req.body;

            const file = req.file;

            const existingProduct = await prisma.product.findUnique({ where: { id: parseInt(id) } });
            if (!existingProduct) return res.status(404).json({ message: 'Product not found' });

            let imageUrl = req.body.image || existingProduct.image;

            // Upload new image if provided
            if (file && file.buffer) {
                const filename = `products/${Date.now()}_${file.originalname}`;
                imageUrl = await bucketStorage.uploadImageFromBuffer(
                    file.buffer,
                    file.mimetype,
                    filename
                );
            }

            const updateData = {
                name,
                image: imageUrl,
                purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
                salePrice: salePrice ? parseFloat(salePrice) : undefined,
            };

            if (categoryId !== undefined && categoryId !== 'undefined') {
                const parsedId = parseInt(categoryId);
                updateData.categoryId = !isNaN(parsedId) ? parsedId : null;
            }

            // Handle Stock Updates
            const currentStockType = stockType || existingProduct.stockType;

            if (currentStockType === 'areabased' || currentStockType === 'area') {
                updateData.stockType = 'area';

                const sWidth = sheetWidth !== undefined ? parseFloat(sheetWidth) : (existingProduct.sheetWidthCm); // Note: this assumes existing is in CM if we don't have unit
                const sHeight = sheetHeight !== undefined ? parseFloat(sheetHeight) : (existingProduct.sheetHeightCm);

                if (sheetWidth !== undefined || sheetHeight !== undefined || unit !== undefined) {
                    // If any dimension or unit changed, recalculate CM values
                    const useUnit = unit || 'cm';
                    const widthCm = convertToCm(sWidth, useUnit);
                    const heightCm = convertToCm(sHeight, useUnit);
                    const areaCm2 = calculateAreaCm2(sWidth, sHeight, useUnit);
                    const areaFactor = getAreaConversionFactor(useUnit);

                    updateData.sheetWidthCm = widthCm;
                    updateData.sheetHeightCm = heightCm;
                    updateData.sheetAreaCm2 = areaCm2;

                    if (purchasePrice !== undefined && areaFactor > 1) {
                        updateData.purchasePrice = parseFloat(purchasePrice) / areaFactor;
                    }
                    if (salePrice !== undefined && areaFactor > 1) {
                        updateData.salePrice = parseFloat(salePrice) / areaFactor;
                    }

                    if (quantity !== undefined) {
                        updateData.stockQuantity = parseFloat(quantity);
                        updateData.stockAreaCm2 = areaCm2 * parseFloat(quantity);
                    } else {
                        updateData.stockAreaCm2 = areaCm2 * existingProduct.stockQuantity;
                    }
                } else if (quantity !== undefined) {
                    updateData.stockQuantity = parseFloat(quantity);
                    updateData.stockAreaCm2 = (existingProduct.sheetAreaCm2 || 0) * parseFloat(quantity);
                }
            } else {
                updateData.stockType = 'quantity';
                if (quantity !== undefined) updateData.stockQuantity = parseFloat(quantity);
            }

            const product = await prisma.product.update({
                where: { id: parseInt(id) },
                data: updateData,
            });

            res.json({ message: 'Product updated successfully', product });
        } catch (err) {
            console.error('Update Product Error:', err);
            res.status(500).json({ error: err.message });
        }
    }
];


// Delete a product
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.product.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Delete Product Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Search products by name within a shop
exports.searchProducts = async (req, res) => {
    try {
        const { q, shopId, page, limit } = req.query;
        console.log("🔍 Incoming product search query:", q, "for shop:", shopId);

        if (!q || q.trim() === "") {
            return res.status(400).json({ message: "Search query is required" });
        }

        if (!shopId || shopId === 'undefined' || isNaN(parseInt(shopId))) {
            return res.status(400).json({ message: "Valid shopId is required" });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            shopId: parseInt(shopId),
            name: {
                contains: q,
                // mode: 'insensitive' // Prisma supports this for MySQL if using a recent version and provider
            }
        };

        // Note: For MySQL, 'contains' is case-insensitive by default with most collations.
        // If case-sensitivity is an issue, we can use raw queries as in the example provided by the user.
        // However, findMany is cleaner if it works.

        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        });

        const total = await prisma.product.count({ where });

        console.log(`✅ ${products.length} products found for "${q}" (Shop ${shopId}, Page ${page})`);

        return res.status(200).json({
            success: true,
            products,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            hasMore: skip + products.length < total,
        });
    } catch (err) {
        console.error("❌ Error in searchProducts:", err);
        return res.status(500).json({
            success: false,
            message: "Server error while searching products",
            error: err.message,
        });
    }
};
