const { getDashboardStats } = require('../../controllers/DashboardController');
const prisma = require('../../prisma/client');

async function testDashboard() {
    console.log("Starting Dashboard verification test...");

    const mockReq = {
        tenant: { adminId: 1, shopId: 1 },
        query: {}
    };

    const mockRes = {
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this.body = data;
            return this;
        }
    };

    try {
        await getDashboardStats(mockReq, mockRes);

        if (mockRes.statusCode === 200 || !mockRes.statusCode) {
            console.log("SUCCESS: Dashboard stats fetched!");
            console.log("Summary:", JSON.stringify(mockRes.body.summary, null, 2));

            const summary = mockRes.body.summary;
            if (summary.totalRevenue === null || isNaN(summary.totalRevenue)) {
                console.error("FAILURE: totalRevenue is still null or NaN");
            } else {
                console.log("totalRevenue is valid:", summary.totalRevenue);
            }
        } else {
            console.log("FAILED: Status code", mockRes.statusCode);
            console.log("Error:", JSON.stringify(mockRes.body, null, 2));
        }
    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

testDashboard();
