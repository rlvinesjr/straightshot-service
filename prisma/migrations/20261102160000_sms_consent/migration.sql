-- Optional text-message permission sent with website bookings, kept as evidence (wording, version, phone, time).
-- All nullable: existing bookings stay "unknown" and older clients are unaffected.
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentStatus" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentProgram" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentPurposes" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentVersion" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentText" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentPhone" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentAt" DATETIME;
ALTER TABLE "TuneUpBooking" ADD COLUMN "smsConsentMethod" TEXT;
