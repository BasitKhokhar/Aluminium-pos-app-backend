-- ============================================================================
-- SaaS multi-tenant upgrade
--
-- Restructures the single-vertical aluminum/glass schema into a generalized,
-- multi-tenant, multi-vertical SaaS schema with subscriptions, device/sync
-- support, and soft-delete tombstones.
--
-- This migration is written by hand (not raw `prisma migrate dev` output)
-- specifically to be SAFE to run against a database that already has real
-- rows in Admin/Shop/Category/Product/Bill/BillItem/StockTransaction — every
-- new NOT NULL column is added nullable, backfilled, then tightened, and
-- every string->enum conversion is normalized first. On an empty database
-- (fresh install) all the backfill/normalization statements are simply no-ops.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: New standalone tables that nothing existing depends on yet.
-- ----------------------------------------------------------------------------

CREATE TABLE `SuperAdmin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SuperAdmin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShopType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `labelUrdu` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `defaultStockType` ENUM('QUANTITY', 'AREA', 'LENGTH', 'PACK') NOT NULL DEFAULT 'QUANTITY',
    `suggestedCategories` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ShopType_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Device` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shopId` INTEGER NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `deviceName` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Device_shopId_idx`(`shopId`),
    UNIQUE INDEX `Device_shopId_deviceId_key`(`shopId`, `deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SubscriptionPlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `tier` ENUM('FREE_TRIAL', 'LIFETIME', 'CLOUD_SYNC') NOT NULL,
    `billingCycle` ENUM('MONTHLY', 'SEMIANNUAL', 'YEARLY') NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'PKR',
    `durationDays` INTEGER NULL,
    `isLifetime` BOOLEAN NOT NULL DEFAULT false,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `isTrialPlan` BOOLEAN NOT NULL DEFAULT false,
    `cloudEnabled` BOOLEAN NOT NULL DEFAULT false,
    `offlineEnabled` BOOLEAN NOT NULL DEFAULT true,
    `maxDevices` INTEGER NOT NULL DEFAULT 1,
    `revenueCatProductId` VARCHAR(191) NULL,
    `features` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionPlan_code_key`(`code`),
    UNIQUE INDEX `SubscriptionPlan_revenueCatProductId_key`(`revenueCatProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'GRACE_PERIOD', 'PAUSED', 'EXPIRED', 'CANCELLED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiryDate` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `isTrial` BOOLEAN NOT NULL DEFAULT false,
    `paymentProvider` ENUM('REVENUECAT', 'MANUAL') NOT NULL,
    `billingCycle` ENUM('MONTHLY', 'SEMIANNUAL', 'YEARLY') NULL,
    `pricePaid` DOUBLE NULL,
    `priceCurrency` VARCHAR(191) NULL DEFAULT 'PKR',
    `revenueCatAppUserId` VARCHAR(191) NULL,
    `originalTransactionId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `store` VARCHAR(191) NULL,
    `cloudEnabled` BOOLEAN NOT NULL DEFAULT false,
    `offlineEnabled` BOOLEAN NOT NULL DEFAULT true,
    `maxDevices` INTEGER NOT NULL DEFAULT 1,
    `assignedBySuperAdminId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserSubscription_adminId_idx`(`adminId`),
    INDEX `UserSubscription_adminId_status_idx`(`adminId`, `status`),
    INDEX `UserSubscription_status_expiryDate_idx`(`status`, `expiryDate`),
    INDEX `UserSubscription_revenueCatAppUserId_idx`(`revenueCatAppUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SubscriptionPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriptionId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'PKR',
    `paymentProvider` ENUM('REVENUECAT', 'MANUAL') NOT NULL,
    `paymentStatus` ENUM('PAID', 'FAILED', 'REFUNDED', 'PENDING') NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `revenueCatEventId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NULL,
    `rawPayload` JSON NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SubscriptionPayment_revenueCatEventId_key`(`revenueCatEventId`),
    INDEX `SubscriptionPayment_subscriptionId_idx`(`subscriptionId`),
    INDEX `SubscriptionPayment_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Device` ADD CONSTRAINT `Device_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `Shop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `UserSubscription` ADD CONSTRAINT `UserSubscription_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `UserSubscription` ADD CONSTRAINT `UserSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `UserSubscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- STEP 2: Seed the initial ShopType catalog. Required now (not deferred to
-- prisma/seed.js) because Shop.shopTypeId's backfill in STEP 5 needs a real
-- row to point existing shops at. Superadmins can add more / edit these
-- later via the ShopType CRUD API — this seed only runs once.
-- ----------------------------------------------------------------------------

INSERT INTO `ShopType` (`code`, `label`, `defaultStockType`, `suggestedCategories`, `isActive`, `sortOrder`, `updatedAt`) VALUES
('GLASS_ALUMINUM', 'Aluminum & Glass', 'AREA', NULL, true, 1, CURRENT_TIMESTAMP(3)),
('TILES_MARBLE', 'Tiles, Marble & Granite', 'AREA', NULL, true, 2, CURRENT_TIMESTAMP(3)),
('PLYWOOD_MDF', 'Plywood & MDF Boards', 'AREA', NULL, true, 3, CURRENT_TIMESTAMP(3)),
('FABRIC', 'Fabric & Textiles', 'AREA', NULL, true, 4, CURRENT_TIMESTAMP(3)),
('PIPE_PVC', 'Pipe & PVC', 'LENGTH', NULL, true, 5, CURRENT_TIMESTAMP(3)),
('WOOD_TIMBER', 'Wood & Timber', 'LENGTH', NULL, true, 6, CURRENT_TIMESTAMP(3)),
('CABLE_WIRE', 'Cable & Wire', 'LENGTH', NULL, true, 7, CURRENT_TIMESTAMP(3)),
('HARDWARE', 'Hardware & Electrical', 'QUANTITY', NULL, true, 8, CURRENT_TIMESTAMP(3)),
('GENERAL_STORE', 'General Store', 'QUANTITY', NULL, true, 9, CURRENT_TIMESTAMP(3)),
('STATIONERY', 'Stationery', 'QUANTITY', NULL, true, 10, CURRENT_TIMESTAMP(3)),
('FOOTWEAR', 'Footwear', 'QUANTITY', NULL, true, 11, CURRENT_TIMESTAMP(3)),
('PHARMACY', 'Pharmacy', 'QUANTITY', JSON_ARRAY('Tablets', 'Syrups', 'Injections', 'Surgical'), true, 12, CURRENT_TIMESTAMP(3)),
('MOBILE_ACCESSORIES', 'Mobile Accessories', 'QUANTITY', NULL, true, 13, CURRENT_TIMESTAMP(3));

-- ----------------------------------------------------------------------------
-- STEP 3: Normalize existing lowercase string values BEFORE converting their
-- columns to enums (UPPER() maps the old lowercase convention 'quantity' /
-- 'area' / 'length' / 'pending' / 'paid' directly onto the new enum member
-- names, so no other value mapping is needed). No-op on an empty table.
-- ----------------------------------------------------------------------------

UPDATE `Product` SET `stockType` = UPPER(`stockType`);
UPDATE `BillItem` SET `stockType` = UPPER(`stockType`);
UPDATE `Bill` SET `status` = UPPER(`status`);

-- ----------------------------------------------------------------------------
-- STEP 4: Category uniqueness is moving from a global `name` unique index to
-- a per-shop `(shopId, name)` unique index. The old global-unique constraint
-- made cross-shop name collisions structurally impossible, so this DROP is
-- safe by construction — verified via prisma/migrate-scripts/checkCategoryDuplicates.js
-- as a pre-flight check before running this migration in production.
-- ----------------------------------------------------------------------------

DROP INDEX `Category_name_key` ON `Category`;

-- ----------------------------------------------------------------------------
-- STEP 5: Alter existing tables — add new columns, convert normalized string
-- columns to enums, add soft-delete/sync columns. `updatedAt` additions are
-- added nullable + backfilled from `createdAt` + tightened, since MySQL
-- rejects a NOT NULL column with no default on a non-empty table.
-- ----------------------------------------------------------------------------

ALTER TABLE `Admin`
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `phone` VARCHAR(191) NULL;

ALTER TABLE `Product`
    ADD COLUMN `clientId` VARCHAR(191) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deviceId` VARCHAR(191) NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `packPurchasePrice` DOUBLE NULL,
    ADD COLUMN `packSalePrice` DOUBLE NULL,
    ADD COLUMN `packSize` INTEGER NULL,
    ADD COLUMN `stockLooseUnits` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `stockPacks` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `stockType` ENUM('QUANTITY', 'AREA', 'LENGTH', 'PACK') NOT NULL DEFAULT 'QUANTITY';

ALTER TABLE `BillItem`
    ADD COLUMN `looseQuantity` DOUBLE NULL,
    ADD COLUMN `packQuantity` DOUBLE NULL,
    MODIFY `stockType` ENUM('QUANTITY', 'AREA', 'LENGTH', 'PACK') NOT NULL;

ALTER TABLE `StockTransaction`
    ADD COLUMN `clientId` VARCHAR(191) NULL,
    ADD COLUMN `deviceId` VARCHAR(191) NULL;

ALTER TABLE `Category`
    ADD COLUMN `clientId` VARCHAR(191) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deviceId` VARCHAR(191) NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

UPDATE `Category` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;

ALTER TABLE `Category`
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

ALTER TABLE `Bill`
    ADD COLUMN `clientId` VARCHAR(191) NULL,
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deviceId` VARCHAR(191) NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `updatedAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING';

UPDATE `Bill` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;

ALTER TABLE `Bill`
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- ----------------------------------------------------------------------------
-- STEP 6: Shop.shopTypeId — add nullable, backfill every existing shop onto
-- the GLASS_ALUMINUM vertical (this is literally "Hamdan Glass POS" today),
-- then tighten to NOT NULL and attach the FK.
-- ----------------------------------------------------------------------------

ALTER TABLE `Shop` ADD COLUMN `shopTypeId` INTEGER NULL;

UPDATE `Shop`
SET `shopTypeId` = (SELECT `id` FROM `ShopType` WHERE `code` = 'GLASS_ALUMINUM' LIMIT 1)
WHERE `shopTypeId` IS NULL;

ALTER TABLE `Shop` MODIFY `shopTypeId` INTEGER NOT NULL;

-- ----------------------------------------------------------------------------
-- STEP 7: Remaining indexes and foreign keys.
-- ----------------------------------------------------------------------------

CREATE INDEX `Admin_email_idx` ON `Admin`(`email`);

CREATE INDEX `Bill_shopId_updatedAt_idx` ON `Bill`(`shopId`, `updatedAt`);
CREATE UNIQUE INDEX `Bill_shopId_clientId_key` ON `Bill`(`shopId`, `clientId`);

CREATE INDEX `Category_shopId_updatedAt_idx` ON `Category`(`shopId`, `updatedAt`);
CREATE UNIQUE INDEX `Category_shopId_name_key` ON `Category`(`shopId`, `name`);
CREATE UNIQUE INDEX `Category_shopId_clientId_key` ON `Category`(`shopId`, `clientId`);

CREATE INDEX `Product_shopId_categoryId_idx` ON `Product`(`shopId`, `categoryId`);
CREATE INDEX `Product_shopId_updatedAt_idx` ON `Product`(`shopId`, `updatedAt`);
CREATE UNIQUE INDEX `Product_shopId_clientId_key` ON `Product`(`shopId`, `clientId`);

CREATE INDEX `Shop_shopTypeId_idx` ON `Shop`(`shopTypeId`);

CREATE UNIQUE INDEX `StockTransaction_shopId_clientId_key` ON `StockTransaction`(`shopId`, `clientId`);

ALTER TABLE `Shop` ADD CONSTRAINT `Shop_shopTypeId_fkey` FOREIGN KEY (`shopTypeId`) REFERENCES `ShopType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
