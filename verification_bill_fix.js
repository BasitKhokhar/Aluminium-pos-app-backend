const { createBill } = require('./controllers/billingControllers');
const prisma = require('./prisma/client');

async function testFix() {
    console.log("Starting verification test...");

    const mockReq = {
        body: {
            shopId: 1,
            customerName: 'Basit',
            customerPhone: '03154949862',
            subtotal: 1347.99,
            discount: 3.668,
            totalAmount: 1560.0004000000001,
            totalReceived: 1560,
            changeDue: 0,
            remainingDue: 0.00040000000012696546,
            items: [
                {
                    productId: 9,
                    productName: 'TemperedGlass 10mm',
                    stockType: 'area',
                    quantity: 1,
                    unit: 'meter',
                    width: 2,
                    height: 3,
                    unitArea: 60000,
                    totalArea: 60000,
                    lengthCm: null,
                    pricePerUnit: 47.99,
                    total: 47.99
                },
                {
                    productId: 7,
                    productName: 'Aluminum door',
                    stockType: 'quantity',
                    quantity: 1,
                    unit: null,
                    width: null,
                    height: null,
                    unitArea: null,
                    totalArea: null,
                    lengthCm: null,
                    pricePerUnit: 1300,
                    total: 1300
                }
            ],
            status: 'pending'
        }
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
        // Need to make sure products 7 and 9 exist in the DB for this test if possible,
        // or just rely on the logic review. 
        // Since I can't easily setup the DB state, I'll just check if the code runs 
        // without the specific ValidationError reported.

        // Actually, a better way is to mock the prisma transaction if I could, 
        // but let's see if I can run it against the real DB if the user has it set up.

        await createBill(mockReq, mockRes);

        if (mockRes.statusCode === 201) {
            console.log("SUCCESS: Bill created successfully!");
            console.log("Response:", JSON.stringify(mockRes.body, null, 2));
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

testFix();
