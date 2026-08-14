// Pre-flight check for the saas_multitenant_upgrade migration.
// Category.name is moving from a globally-unique constraint to a per-shop
// (shopId, name) unique constraint. The old global constraint made cross-shop
// duplicates structurally impossible, so this should always report zero rows —
// it exists purely as a safety net to run before the migration in production.
//
// Usage: node prisma/migrate-scripts/checkCategoryDuplicates.js
require('dotenv').config();
const prisma = require('../client');

async function main() {
    const duplicates = await prisma.$queryRaw`
        SELECT name, COUNT(DISTINCT shopId) as shopCount
        FROM Category
        GROUP BY name
        HAVING COUNT(DISTINCT shopId) > 1
    `;

    if (duplicates.length === 0) {
        console.log('No cross-shop Category name collisions found. Safe to run the migration.');
        return;
    }

    console.error('Found Category names shared across multiple shops — rename before migrating:');
    console.table(duplicates);
    process.exitCode = 1;
}

main()
    .catch((err) => {
        console.error('Check failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
