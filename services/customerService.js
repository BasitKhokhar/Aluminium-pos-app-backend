const prisma = require('../prisma/client');

// Shared ledger helper — call inside the SAME $transaction as the write that
// triggers the balance change (bill creation, bill payment, standalone khata
// payment) so `balance` never drifts out of sync with its source rows.
// delta > 0 = customer now owes more; delta < 0 = customer paid some down.
async function adjustCustomerBalance(tx, customerId, delta) {
    if (!customerId || !delta) return;
    await tx.customer.update({
        where: { id: customerId },
        data: { balance: { increment: delta } },
    });
}

async function createCustomer(tenant, { name, phone }) {
    return prisma.customer.create({
        data: { shopId: tenant.shopId, name, phone: phone || null },
    });
}

async function listCustomers(tenant) {
    return prisma.customer.findMany({
        where: { shopId: tenant.shopId, isDeleted: false },
        orderBy: { updatedAt: 'desc' },
    });
}

async function getCustomerById(tenant, customerId) {
    return prisma.customer.findFirst({
        where: { id: customerId, shopId: tenant.shopId },
        include: {
            bills: { orderBy: { createdAt: 'desc' }, take: 50 },
            payments: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 50 },
        },
    });
}

async function updateCustomer(tenant, customerId, { name, phone }) {
    return prisma.customer.update({
        where: { id: customerId, shopId: tenant.shopId },
        data: { name, phone },
    });
}

// Soft-delete (tombstone for sync, matches Category/Product convention).
async function deleteCustomer(tenant, customerId) {
    return prisma.customer.update({
        where: { id: customerId, shopId: tenant.shopId },
        data: { isDeleted: true, deletedAt: new Date() },
    });
}

// Standalone khata payment — not tied to settling one specific Bill.
async function recordPayment(tenant, customerId, { amount, note }, deviceId) {
    const amt = parseFloat(amount) || 0;

    return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({ where: { id: customerId, shopId: tenant.shopId } });
        if (!customer) throw new Error('Customer not found');

        const payment = await tx.customerPayment.create({
            data: {
                shopId: tenant.shopId,
                customerId,
                amount: amt,
                note: note || null,
                deviceId,
            },
        });

        await adjustCustomerBalance(tx, customerId, -amt);

        return payment;
    });
}

async function getCustomerPayments(tenant, customerId) {
    return prisma.customerPayment.findMany({
        where: { shopId: tenant.shopId, customerId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
    });
}

module.exports = {
    adjustCustomerBalance,
    createCustomer,
    listCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    recordPayment,
    getCustomerPayments,
};
