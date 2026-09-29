import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"

// GET — the ad attribution for one request, for the Field app to copy onto the
// job it creates from it. Click IDs leave this app ONLY through this key-protected
// call, server to server; they are never in list payloads, emails or the browser.
export async function GET(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  const { reference } = await params
  const b = await db.tuneUpBooking.findUnique({ where: { reference } })
  if (!b) return jsonError("Booking not found", 404)
  return Response.json({
    reference: b.reference,
    serviceType: b.serviceType,
    createdAt: b.createdAt,
    source: b.source,
    landingPath: b.landingPath,
    landingKeyword: b.landingKeyword,
    gclid: b.gclid,
    gbraid: b.gbraid,
    wbraid: b.wbraid,
    utmSource: b.utmSource,
    utmMedium: b.utmMedium,
    utmCampaign: b.utmCampaign,
    utmTerm: b.utmTerm,
    utmContent: b.utmContent,
  })
}
