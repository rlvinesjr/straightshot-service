import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"

const ALLOWED_STATUSES = ["confirmed", "cancelled", "pending_confirmation"] as const

// Office-side status updates (via the Field app proxy): confirm after the
// customer is reached, or cancel. Customer-facing statuses ("requested",
// "call_required", "service_area_review") are only ever set by the booking
// flow itself, so they are not accepted here.
export async function PATCH(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  const { reference } = await params
  const body = (await request.json().catch(() => ({}))) as { status?: string }
  const status = ALLOWED_STATUSES.find(s => s === body.status)
  if (!status) return jsonError(`status must be one of: ${ALLOWED_STATUSES.join(", ")}`)
  try {
    const record = await db.tuneUpBooking.update({ where: { reference }, data: { status } })
    console.log(`[tuneup-booking] ${record.reference} status -> ${status}`)
    return Response.json({ reference: record.reference, status: record.status })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError("Booking not found", 404)
    }
    throw error
  }
}
