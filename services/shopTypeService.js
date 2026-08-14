// Seeds a new shop's starting Category rows from its ShopType's suggested
// list (e.g. a PHARMACY shop gets "Tablets", "Syrups", ... pre-created).
// Runs once, at shop-creation time, inside the same transaction as the shop
// itself. The seeded categories are ordinary Category rows afterward —
// editable/deletable like any other category, not a special template link.
async function seedDefaultCategoriesForShop(tx, shopId, shopType) {
    const suggested = Array.isArray(shopType?.suggestedCategories) ? shopType.suggestedCategories : [];
    if (suggested.length === 0) return [];

    const categories = [];
    for (const name of suggested) {
        if (typeof name !== 'string' || !name.trim()) continue;
        const category = await tx.category.create({
            data: { shopId, name: name.trim() },
        });
        categories.push(category);
    }
    return categories;
}

module.exports = { seedDefaultCategoriesForShop };
