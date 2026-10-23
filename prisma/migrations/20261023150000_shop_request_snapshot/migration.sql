-- Shop product requests: stored request snapshot + customer summary email tracking.
ALTER TABLE "TuneUpBooking" ADD COLUMN "requestSnapshot" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "customerEmailStatus" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "customerEmailAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TuneUpBooking" ADD COLUMN "customerEmailError" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "customerEmailSentAt" DATETIME;
