-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DoorEstimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "customerName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "timeline" TEXT,
    "source" TEXT,
    "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
    "dripStage" INTEGER NOT NULL DEFAULT 0,
    "nextDripAt" DATETIME,
    "lastEmailAt" DATETIME,
    "configurationJson" TEXT NOT NULL,
    "vendorCostSnapshot" REAL NOT NULL,
    "retailPriceSnapshot" REAL NOT NULL,
    "pricingSnapshotJson" TEXT NOT NULL,
    "notes" TEXT,
    "signatureData" TEXT,
    "signedAt" DATETIME,
    "convertedEstimateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DoorEstimate" ("address", "city", "configurationJson", "convertedEstimateId", "createdAt", "customerName", "email", "id", "mode", "notes", "phone", "pricingSnapshotJson", "retailPriceSnapshot", "signatureData", "signedAt", "status", "token", "updatedAt", "vendorCostSnapshot") SELECT "address", "city", "configurationJson", "convertedEstimateId", "createdAt", "customerName", "email", "id", "mode", "notes", "phone", "pricingSnapshotJson", "retailPriceSnapshot", "signatureData", "signedAt", "status", "token", "updatedAt", "vendorCostSnapshot" FROM "DoorEstimate";
DROP TABLE "DoorEstimate";
ALTER TABLE "new_DoorEstimate" RENAME TO "DoorEstimate";
CREATE UNIQUE INDEX "DoorEstimate_token_key" ON "DoorEstimate"("token");
CREATE TABLE "new_DoorEstimatorConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "version" INTEGER NOT NULL DEFAULT 1,
    "pricebookName" TEXT NOT NULL,
    "effectiveDate" DATETIME,
    "multiplier" REAL NOT NULL DEFAULT 3,
    "roundingMethod" TEXT NOT NULL DEFAULT 'nearest_hundred_minus_one',
    "removalIncluded" BOOLEAN NOT NULL DEFAULT true,
    "catalogJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DoorEstimatorConfig" ("catalogJson", "createdAt", "effectiveDate", "id", "multiplier", "pricebookName", "removalIncluded", "roundingMethod", "updatedAt", "version") SELECT "catalogJson", "createdAt", "effectiveDate", "id", "multiplier", "pricebookName", "removalIncluded", "roundingMethod", "updatedAt", "version" FROM "DoorEstimatorConfig";
DROP TABLE "DoorEstimatorConfig";
ALTER TABLE "new_DoorEstimatorConfig" RENAME TO "DoorEstimatorConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
