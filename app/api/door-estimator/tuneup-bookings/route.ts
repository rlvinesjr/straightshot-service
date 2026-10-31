import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"

// The first tagged visit, without its click IDs (those leave only through /attribution).
function firstTouchSummary(json: string | null) {
  if (!json) return null
  try {
    const { fbclid, gclid, gbraid, wbraid, ...rest } = JSON.parse(json) as Record<string, string>
    return { ...rest, hasClickId: !!(fbclid || gclid || gbraid || wbraid) }
  } catch {
    return null
  }
}

// Self-scheduled tune-up booking requests for the Field app's Door Leads
// screen (proxied there behind its own login). Token deliberately omitted —
// bookings have no customer-facing report link.
export async function GET(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  const records = await db.tuneUpBooking.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  return Response.json(records.map(b => ({
    reference: b.reference,
    status: b.status,
    serviceType: b.serviceType,
    createdAt: b.createdAt,
    firstName: b.firstName,
    lastName: b.lastName,
    phone: b.phone,
    email: b.email,
    preferredContactMethod: b.preferredContactMethod,
    serviceAddress: b.serviceAddress,
    city: b.city,
    state: b.state,
    zipCode: b.zipCode,
    doorCount: b.doorCount,
    doorOperatingStatus: b.doorOperatingStatus,
    issueType: b.issueType,
    specialConditions: b.specialConditions,
    notes: b.notes,
    requestedDate: b.requestedDate,
    requestedWindow: b.requestedWindow,
    serviceAreaEligible: b.serviceAreaEligible,
    source: b.source,
    utmSource: b.utmSource,
    utmMedium: b.utmMedium,
    utmCampaign: b.utmCampaign,
    utmContent: b.utmContent,
    // which ad (readable labels + Meta's IDs and placement; click IDs only as yes/no, see below)
    adCampaignId: b.adCampaignId,
    adSetId: b.adSetId,
    adId: b.adId,
    adPlacement: b.adPlacement,
    adSiteSource: b.adSiteSource,
    attributedAt: b.attributedAt,
    firstTouch: firstTouchSummary(b.firstTouch),
    hasFbclid: !!b.fbclid,
    // repair requests (/lp/*): delivery + speed-to-lead. Click IDs are NOT listed —
    // only whether one exists; the job software fetches them via /attribution.
    residentialConfirmed: b.residentialConfirmed,
    landingKeyword: b.landingKeyword,
    paidClick: !!(b.gclid || b.gbraid || b.wbraid),
    notifyStatus: b.notifyStatus,
    notifyAttempts: b.notifyAttempts,
    notifyError: b.notifyError,
    notifiedAt: b.notifiedAt,
    firstResponseAt: b.firstResponseAt,
    bookedAt: b.bookedAt,
    fieldJobId: b.fieldJobId,
    // website shop requests: every selection + the saved estimate, and the customer summary email's delivery
    requestSnapshot: b.requestSnapshot ? JSON.parse(b.requestSnapshot) : null,
    customerEmailStatus: b.customerEmailStatus,
    customerEmailAttempts: b.customerEmailAttempts,
    customerEmailError: b.customerEmailError,
    customerEmailSentAt: b.customerEmailSentAt,
  })))
}
