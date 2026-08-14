// Layer 1 of the multi-tenancy enforcement design: every controller reads/writes
// tenant-scoped models (Product, Category, Bill, StockTransaction, Device) through
// these wrappers instead of calling `prisma.<model>.*` directly, so `shopId` is
// always merged in and can never be accidentally omitted.
//
// `tenant` is `{ adminId, shopId }`, set by middleware/tenantContext.js.
const prisma = require('../prisma/client');

function withShop(tenant, where = {}) {
    return { ...where, shopId: tenant.shopId };
}

function makeScopedModel(model) {
    return {
        findMany: (tenant, args = {}) =>
            model.findMany({ ...args, where: withShop(tenant, args.where) }),

        findFirst: (tenant, args = {}) =>
            model.findFirst({ ...args, where: withShop(tenant, args.where) }),

        count: (tenant, args = {}) =>
            model.count({ ...args, where: withShop(tenant, args.where) }),

        create: (tenant, data, args = {}) =>
            model.create({ ...args, data: { ...data, shopId: tenant.shopId } }),

        update: (tenant, where, data, args = {}) =>
            model.update({ ...args, where: withShop(tenant, where), data }),

        // Soft delete — tenant models never hard-delete (needed for sync tombstones
        // and because hard delete on Product/Category throws once referenced by a
        // Bill/StockTransaction row under MySQL's default RESTRICT behavior).
        softDelete: (tenant, where) =>
            model.update({
                where: withShop(tenant, where),
                data: { isDeleted: true, deletedAt: new Date() },
            }),
    };
}

module.exports = {
    product: makeScopedModel(prisma.product),
    category: makeScopedModel(prisma.category),
    bill: makeScopedModel(prisma.bill),
    stockTransaction: makeScopedModel(prisma.stockTransaction),
    device: makeScopedModel(prisma.device),
};
