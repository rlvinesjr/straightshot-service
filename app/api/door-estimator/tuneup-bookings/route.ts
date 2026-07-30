import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"

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
    utmCampaign: b.utmCampaign,
  })))
}
