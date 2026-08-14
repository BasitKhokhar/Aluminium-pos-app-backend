// Defense-in-depth tripwire (Layer 2 of the multi-tenancy enforcement design).
//
// The primary tenant-scoping mechanism is middleware/tenantContext.js +
// services/scopedQueries.js, which always merge `shopId` into every query.
// This extension is a cheap backstop: if any query against a tenant-scoped
// model ever reaches Prisma without a top-level `shopId` in its `where`
// clause, it throws immediately instead of silently returning cross-tenant
// data. It does not rewrite queries — it only detects the missing filter.
const TENANT_MODELS = ['product', 'category', 'bill', 'stockTransaction', 'device'];
const READ_ACTIONS = ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'];
const WRITE_ACTIONS = ['update', 'updateMany', 'delete', 'deleteMany'];
const GUARDED_ACTIONS = [...READ_ACTIONS, ...WRITE_ACTIONS];

function hasTopLevelShopId(where) {
    return !!where && Object.prototype.hasOwnProperty.call(where, 'shopId');
}

const tenantGuardExtension = {
    name: 'tenantGuard',
    query: TENANT_MODELS.reduce((acc, model) => {
        acc[model] = {
            async $allOperations({ operation, args, query }) {
                if (GUARDED_ACTIONS.includes(operation) && !hasTopLevelShopId(args.where)) {
                    throw new Error(
                        `[tenantGuard] Blocked unscoped ${model}.${operation}() — every tenant-model query must ` +
                        `filter by a top-level shopId. Use services/scopedQueries.js instead of the raw Prisma client.`
                    );
                }
                return query(args);
            },
        };
        return acc;
    }, {}),
};

module.exports = tenantGuardExtension;
