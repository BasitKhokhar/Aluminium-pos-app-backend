const prisma = require('../prisma/client');

// Create a new Bill
exports.createBill = async (req, res) => {
    const { shopId, customerName, customerPhone, subtotal, discount, totalAmount, totalReceived, changeDue, remainingDue, items, status } = req.body;
    console.log("data in craete bill api", req.body)
    try {
        // Start a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the Bill
            const bill = await tx.bill.create({
                data: {
                    shopId: parseInt(shopId),
                    customerName,
                    customerPhone,
                    subtotal: parseFloat(subtotal) || 0,
                    discount: parseFloat(discount) || 0,
                    totalAmount: parseFloat(totalAmount) || 0,
                    totalReceived: parseFloat(totalReceived) || 0,
                    changeDue: parseFloat(changeDue) || 0,
                    remainingDue: parseFloat(remainingDue) || 0,
                    status: status || 'pending',
                },
            });

            // 2. Loop through items to create BillItems and update Stock
            const billItems = [];
            for (const item of items) {
                const productId = parseInt(item.productId);

                if (isNaN(productId)) {
                    throw new Error(`Invalid or missing productId for item: ${item.productName || 'Unknown'}`);
                }

                const quantity = parseFloat(item.quantity) || 0;
                const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
                const total = parseFloat(item.total) || (quantity * pricePerUnit);

                // Create BillItem
                const billItem = await tx.billItem.create({
                    data: {
                        billId: bill.id,
                        productId: productId,
                        productName: item.productName || 'No Product',
                        stockType: item.stockType || 'quantity',
                        quantity,
                        unit: item.unit || null,
                        width: parseFloat(item.width) || null,
                        height: parseFloat(item.height) || null,
                        unitArea: parseFloat(item.unitArea) || null,
                        totalArea: parseFloat(item.totalArea) || null,
                        lengthCm: parseFloat(item.lengthCm) || null,
                        pricePerUnit,
                        total,
                    },
                });
                billItems.push(billItem);

                // Update Product Stock based on stockType
                const updateData = {};
                if (item.stockType === 'area') {
                    updateData.stockAreaCm2 = { decrement: parseFloat(item.totalArea) || 0 };
                } else if (item.stockType === 'length') {
                    updateData.stockLengthCm = { decrement: parseFloat(item.lengthCm) || 0 };
                } else {
                    updateData.stockQuantity = { decrement: quantity };
                }

                await tx.product.update({
                    where: { id: productId },
                    data: updateData,
                });

                // Log Stock Transaction (OUT)
                await tx.stockTransaction.create({
                    data: {
                        shopId: parseInt(shopId),
                        productId: productId,
                        type: 'OUT',
                        quantity,
                        price: pricePerUnit,
                        description: `Sold in Bill #${bill.id}`,
                    },
                });
            }

            return { bill, billItems };
        });

        res.status(201).json({ message: 'Bill generated successfully', ...result });
    } catch (err) {
        console.error('Create Bill Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all bills for a shop (paginated)
// exports.getBills = async (req, res) => {
//     try {
//         const { shopId } = req.query;
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 10;
//         const skip = (page - 1) * limit;

//         if (!shopId) return res.status(400).json({ message: 'shopId is required' });

//         const where = { shopId: parseInt(shopId) };

//         const bills = await prisma.bill.findMany({
//             where,
//             include: {
//                 _count: { select: { items: true } }
//             },
//             orderBy: { createdAt: 'desc' },
//             skip,
//             take: limit,
//         });

//         const total = await prisma.bill.count({ where });
//         const hasMore = skip + limit < total;

//         res.json({
//             success: true,
//             bills,
//             total,
//             page,
//             limit,
//             hasMore,
//         });
//     } catch (err) {
//         console.error('Get Bills Error:', err);
//         res.status(500).json({ success: false, message: 'Server error', error: err.message });
//     }
// };
exports.getBills = async (req, res) => {
    try {
        const { shopId, status = "all", startDate, endDate } = req.query;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (!shopId) {
            return res.status(400).json({ message: "shopId is required" });
        }

        const where = {
            shopId: parseInt(shopId),
        };

        // 🟣 STATUS FILTER
        if (status !== "all") {
            where.status = status;
        }

        // 📅 DATE RANGE FILTER
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate + "T00:00:00.000Z"),
                lte: new Date(endDate + "T23:59:59.999Z"),
            };
        }

        const bills = await prisma.bill.findMany({
            where,
            include: {
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        });

        const total = await prisma.bill.count({ where });
        const hasMore = skip + limit < total;

        res.json({
            success: true,
            bills,
            total,
            page,
            limit,
            hasMore,
        });

    } catch (err) {
        console.error("Get Bills Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};


// Get single bill with items
exports.getBillById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("id", id);
        const bill = await prisma.bill.findUnique({
            where: { id: parseInt(id) },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                shop: true
            }
        });

        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        res.json(bill);
    } catch (err) {
        console.error('Get Bill Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update an existing Bill
exports.updateBill = async (req, res) => {
    const { id } = req.params;
    const { shopId, customerName, customerPhone, subtotal, discount, totalAmount, totalReceived, changeDue, remainingDue, items, status, NewRecivedPyament } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch the existing bill and its items
            const existingBill = await tx.bill.findUnique({
                where: { id: parseInt(id) },
                include: { items: true },
            });

            if (!existingBill) {
                throw new Error('Bill not found');
            }

            // 2. Revert Old Items (Stock and Transactions)
            for (const oldItem of existingBill.items) {
                // Return stock based on stockType
                const revertData = {};
                if (oldItem.stockType === 'area') {
                    revertData.stockAreaCm2 = { increment: parseFloat(oldItem.totalArea) || 0 };
                } else if (oldItem.stockType === 'length') {
                    revertData.stockLengthCm = { increment: parseFloat(oldItem.lengthCm) || 0 };
                } else {
                    revertData.stockQuantity = { increment: oldItem.quantity || 0 };
                }

                await tx.product.update({
                    where: { id: oldItem.productId },
                    data: revertData,
                });

                // Log Stock Reversal Transaction (IN)
                await tx.stockTransaction.create({
                    data: {
                        shopId: existingBill.shopId,
                        productId: oldItem.productId,
                        type: 'IN', // Reversing the previous sale
                        quantity: oldItem.quantity,
                        price: oldItem.pricePerUnit || oldItem.price, // handle both old and new field names
                        description: `Reverted for Bill Update #${existingBill.id}`,
                    },
                });
            }

            // Delete old items
            await tx.billItem.deleteMany({
                where: { billId: existingBill.id },
            });

            // 3. Update the Bill
            let finalTotalReceived = parseFloat(totalReceived) || 0;
            let finalRemainingDue = parseFloat(remainingDue) || 0;

            if (NewRecivedPyament) {
                const addedPayment = parseFloat(NewRecivedPyament) || 0;
                finalTotalReceived += addedPayment;
                finalRemainingDue -= addedPayment;
            }

            const updatedBill = await tx.bill.update({
                where: { id: existingBill.id },
                data: {
                    shopId: parseInt(shopId),
                    customerName,
                    customerPhone,
                    subtotal: parseFloat(subtotal) || 0,
                    discount: parseFloat(discount) || 0,
                    totalAmount: parseFloat(totalAmount) || 0,
                    totalReceived: finalTotalReceived,
                    changeDue: parseFloat(changeDue) || 0,
                    remainingDue: finalRemainingDue,
                    status: status || 'pending',
                },
            });

            // 4. Insert New Items
            const newBillItems = [];
            for (const item of items) {
                const productId = parseInt(item.productId);

                if (isNaN(productId)) {
                    throw new Error(`Invalid or missing productId for item: ${item.productName || 'Unknown'}`);
                }

                const quantity = parseFloat(item.quantity) || 0;
                const pricePerUnit = parseFloat(item.pricePerUnit) || 0;
                const total = parseFloat(item.total) || (quantity * pricePerUnit);

                // Create BillItem
                const billItem = await tx.billItem.create({
                    data: {
                        billId: updatedBill.id,
                        productId: productId,
                        productName: item.productName || 'No Product',
                        stockType: item.stockType || 'quantity',
                        quantity,
                        unit: item.unit || null,
                        width: parseFloat(item.width) || null,
                        height: parseFloat(item.height) || null,
                        unitArea: parseFloat(item.unitArea) || null,
                        totalArea: parseFloat(item.totalArea) || null,
                        lengthCm: parseFloat(item.lengthCm) || null,
                        pricePerUnit,
                        total,
                    },
                });
                newBillItems.push(billItem);

                // Update Product Stock based on stockType
                const updateData = {};
                if (item.stockType === 'area') {
                    updateData.stockAreaCm2 = { decrement: parseFloat(item.totalArea) || 0 };
                } else if (item.stockType === 'length') {
                    updateData.stockLengthCm = { decrement: parseFloat(item.lengthCm) || 0 };
                } else {
                    updateData.stockQuantity = { decrement: quantity };
                }

                await tx.product.update({
                    where: { id: productId },
                    data: updateData,
                });

                // Log Stock Transaction (OUT)
                await tx.stockTransaction.create({
                    data: {
                        shopId: parseInt(shopId),
                        productId: productId,
                        type: 'OUT',
                        quantity,
                        price: pricePerUnit,
                        description: `Sold in Updated Bill #${updatedBill.id}`,
                    },
                });
            }

            return { bill: updatedBill, billItems: newBillItems };
        });

        res.status(200).json({ message: 'Bill updated successfully', ...result });
    } catch (err) {
        console.error('Update Bill Error:', err);
        res.status(500).json({ error: err.message });
    }
};
