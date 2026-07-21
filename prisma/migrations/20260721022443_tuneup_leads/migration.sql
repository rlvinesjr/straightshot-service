-- CreateTable
CREATE TABLE "TuneUpLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'quiz',
    "firstName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "zip" TEXT,
    "score" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "answersJson" TEXT NOT NULL,
    "preferredDay" TEXT,
    "preferredWindow" TEXT,
    "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
    "dripStage" INTEGER NOT NULL DEFAULT 0,
    "nextDripAt" DATETIME,
    "lastEmailAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TuneUpLead_token_key" ON "TuneUpLead"("token");
