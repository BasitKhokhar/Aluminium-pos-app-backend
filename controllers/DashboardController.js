const prisma = require('../prisma/client');

/**
 * Get Dashboard Stats
 * URL: /api/dashboard/stats
 * Method: GET
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const { shopId, startDate, endDate } = req.query;
        console.log("shopId", shopId)
        console.log("startDate", startDate)
        console.log("endDate", endDate)

        if (!shopId) {
            return res.status(400).json({ status: 'error', message: 'shopId is required' });
        }

        const parsedShopId = parseInt(shopId);

        // Date range filtering
        const where = { shopId: parsedShopId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate + "T00:00:00.000Z"),
                lte: new Date(endDate + "T23:59:59.999Z"),
            };
        }

        // 1. Calculate Summary Stats
        const bills = await prisma.bill.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                purchasePrice: true,
                            },
                        },
                    },
                },
            },
        });

        const totalSales = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
        const orderCount = bills.length;

        const totalRevenue = bills.reduce((sum, bill) => {
            const billProfit = bill.items.reduce((itemSum, item) => {
                // Total Sale Price for this item is already stored in item.total
                const itemSalePrice = item.total || 0;

                // Calculate item cost based on stock type factor
                const costPricePerBaseUnit = item.product?.purchasePrice || 0;

                let factor = item.quantity || 0;
                if (item.stockType === 'area') {
                    factor = item.totalArea || 0;
                } else if (item.stockType === 'length') {
                    factor = item.lengthCm || 0;
                }

                const itemCostPrice = costPricePerBaseUnit * factor;
                return itemSum + (itemSalePrice - itemCostPrice);
            }, 0);
            return sum + billProfit;
        }, 0);

        // 2. Total Inventory Value
        const products = await prisma.product.findMany({
            where: { shopId: parsedShopId },
            select: {
                stockType: true,
                stockQuantity: true,
                stockAreaCm2: true,
                stockLengthCm: true,
                salePrice: true,
                name: true,
                id: true,
            },
        });

        const totalInventoryValue = products.reduce((sum, prod) => {
            let stock = prod.stockQuantity || 0;
            if (prod.stockType === 'area') {
                stock = prod.stockAreaCm2 || 0;
            } else if (prod.stockType === 'length') {
                stock = prod.stockLengthCm || 0;
            }
            return sum + (prod.salePrice * stock);
        }, 0);

        // 3. Low Stock Alerts
        const lowStockThreshold = 10;
        const lowStockAlerts = products
            .filter(prod => prod.stockQuantity < lowStockThreshold)
            .map(prod => ({
                id: `PRD-${prod.id}`,
                name: prod.name,
                stock: prod.stockQuantity,
            }))
            .slice(0, 5); // Limit to top 5 for the dashboard

        // 4. Revenue Analytics (Grouped by Day)
        // For simplicity, we'll aggregate from the fetched bills
        const analyticsMap = {};

        // If range is provided, identify if it's weekly or monthly
        // Here we just map by day name or date based on range
        // For the design mockup format (Mon, Tue...), we'll use day names if it's roughly a week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        bills.forEach(bill => {
            const date = new Date(bill.createdAt);
            const label = days[date.getDay()];
            analyticsMap[label] = (analyticsMap[label] || 0) + bill.totalAmount;
        });

        const revenueAnalytics = days.map(day => ({
            label: day,
            value: analyticsMap[day] || 0,
        }));

        // 5. Recent Invoices
        const recentInvoices = await prisma.bill.findMany({
            where: { shopId: parsedShopId },
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                customerName: true,
                totalAmount: true,
                createdAt: true,
            },
        });

        const formattedRecentInvoices = recentInvoices.map(inv => ({
            id: `INV-${inv.id}`,
            customer: inv.customerName,
            amount: inv.totalAmount,
            date: inv.createdAt.toISOString(),
        }));

        res.json({
            summary: {
                totalSales: parseFloat(totalSales.toFixed(2)),
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                orderCount,
                totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
            },
            revenueAnalytics,
            lowStockAlerts,
            recentInvoices: formattedRecentInvoices,
        });

    } catch (err) {
        console.error('Get Dashboard Stats Error:', err);
        res.status(500).json({ status: 'error', message: 'Server error', error: err.message });
    }
};
