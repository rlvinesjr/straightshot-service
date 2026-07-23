-- CreateTable
CREATE TABLE "TuneUpBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'text',
    "serviceAddress" TEXT,
    "city" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "TuneUpBooking_token_key" ON "TuneUpBooking"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TuneUpBooking_reference_key" ON "TuneUpBooking"("reference");
