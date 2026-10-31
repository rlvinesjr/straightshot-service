-- Which ad a website booking came from: Meta campaign / ad set / ad IDs, placement, platform, the time of the
-- tagged visit, and the first tagged visit (JSON) when different. All nullable: old rows and old clients are unaffected.
ALTER TABLE "TuneUpBooking" ADD COLUMN "adCampaignId" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "adSetId" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "adId" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "adPlacement" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "adSiteSource" TEXT;
ALTER TABLE "TuneUpBooking" ADD COLUMN "attributedAt" DATETIME;
ALTER TABLE "TuneUpBooking" ADD COLUMN "firstTouch" TEXT;
