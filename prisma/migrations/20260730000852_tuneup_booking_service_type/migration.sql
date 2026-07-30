-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TuneUpBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "serviceType" TEXT NOT NULL DEFAULT 'tuneup',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'text',
    "serviceAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "doorCount" TEXT,
    "doorOperatingStatus" TEXT,
    "issueType" TEXT,
    "specialConditions" TEXT,
    "notes" TEXT,
    "requestedDate" TEXT,
    "requestedWindow" TEXT,
    "serviceAreaEligible" BOOLEAN,
    "source" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TuneUpBooking" ("city", "consentAccepted", "createdAt", "doorCount", "doorOperatingStatus", "email", "fbclid", "firstName", "gclid", "id", "issueType", "lastName", "notes", "phone", "preferredContactMethod", "reference", "requestedDate", "requestedWindow", "serviceAddress", "serviceAreaEligible", "source", "specialConditions", "state", "status", "token", "updatedAt", "utmCampaign", "utmContent", "utmMedium", "utmSource", "zipCode") SELECT "city", "consentAccepted", "createdAt", "doorCount", "doorOperatingStatus", "email", "fbclid", "firstName", "gclid", "id", "issueType", "lastName", "notes", "phone", "preferredContactMethod", "reference", "requestedDate", "requestedWindow", "serviceAddress", "serviceAreaEligible", "source", "specialConditions", "state", "status", "token", "updatedAt", "utmCampaign", "utmContent", "utmMedium", "utmSource", "zipCode" FROM "TuneUpBooking";
DROP TABLE "TuneUpBooking";
ALTER TABLE "new_TuneUpBooking" RENAME TO "TuneUpBooking";
CREATE UNIQUE INDEX "TuneUpBooking_token_key" ON "TuneUpBooking"("token");
CREATE UNIQUE INDEX "TuneUpBooking_reference_key" ON "TuneUpBooking"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
