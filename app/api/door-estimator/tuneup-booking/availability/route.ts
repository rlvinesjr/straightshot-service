import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { getBookingProvider } from "@/lib/tuneup/booking-provider"
import { SCHEDULING } from "@/lib/tuneup/booking-config"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

// GET /api/door-estimator/tuneup-booking/availability
// Selectable days + arrival windows from the configured booking provider.
// Mock-provider data reflects this app's own open requests, not an external
// calendar — every request is still confirmed by the office.
export async function GET(request: Request) {
  try {
    const days = await getBookingProvider().getAvailability()
    return Response.json(
      { days, timezoneLabel: SCHEDULING.timezoneLabel },
      { headers: { ...publicCorsHeaders(request), "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[tuneup-availability] failed:", error instanceof Error ? error.message : error)
    return jsonError("Unable to load availability", 500, publicCorsHeaders(request))
  }
}
