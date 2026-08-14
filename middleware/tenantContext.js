const prisma = require('../prisma/client');

// Resolves and verifies the target shop for a shop-scoped request, and sets
// req.tenant = { adminId, shopId } for downstream controllers/services.
//
// Runs after verifyAdminToken. Looks for the target shopId in (in order):
// route params, query string, request body, or the X-Shop-Id header — the
// same request can carry it in different places depending on the endpoint
// (e.g. :shopId route param vs a shopId field in a POST body).
//
// This single check replaces the ad hoc/missing `adminId`-vs-`shopId`
// comparisons that used to be duplicated (or absent) in individual controllers.
async function tenantContext(req, res, next) {
    try {
        const rawShopId =
            req.params.shopId ??
            req.query.shopId ??
            req.body?.shopId ??
            req.headers['x-shop-id'];

        const shopId = parseInt(rawShopId, 10);

        if (!rawShopId || Number.isNaN(shopId)) {
            return res.status(400).json({ message: 'Valid shopId is required' });
        }

        const shop = await prisma.shop.findFirst({
            where: { id: shopId, adminId: req.admin.id },
            select: { id: true },
        });

        if (!shop) {
            return res.status(403).json({ code: 'SHOP_NOT_OWNED', message: 'Shop not found or not owned by this admin' });
        }

        req.tenant = { adminId: req.admin.id, shopId: shop.id };
        next();
    } catch (err) {
        console.error('tenantContext error:', err);
        res.status(500).json({ message: 'Server error resolving shop context' });
    }
}

// Variant for routes identified only by a resource :id (e.g. GET /products/:id),
// where the client doesn't separately send shopId. Derives the owning shop from
// the resource itself, then verifies the admin owns that shop — fixes the
// cross-tenant read gap on the existing getProductById/getBillById/getCategoryById
// style endpoints without changing their request contract.
function byResourceId(model) {
    return async function (req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) {
                return res.status(400).json({ message: 'Valid id is required' });
            }

            const resource = await model.findUnique({ where: { id }, select: { id: true, shopId: true } });
            if (!resource) {
                return res.status(404).json({ message: 'Not found' });
            }

            const shop = await prisma.shop.findFirst({
                where: { id: resource.shopId, adminId: req.admin.id },
                select: { id: true },
            });

            if (!shop) {
                return res.status(403).json({ code: 'SHOP_NOT_OWNED', message: 'Not found or not owned by this admin' });
            }

            req.tenant = { adminId: req.admin.id, shopId: shop.id };
            next();
        } catch (err) {
            console.error('tenantContext.byResourceId error:', err);
            res.status(500).json({ message: 'Server error resolving shop context' });
        }
    };
}

module.exports = tenantContext;
module.exports.byResourceId = byResourceId;
