CREATE TABLE "DoorEstimatorConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
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

CREATE TABLE "DoorEstimate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "token" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "customerName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "city" TEXT,
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

CREATE UNIQUE INDEX "DoorEstimate_token_key" ON "DoorEstimate"("token");
