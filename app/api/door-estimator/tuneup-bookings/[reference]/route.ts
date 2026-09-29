import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"

const ALLOWED_STATUSES = ["confirmed", "cancelled", "pending_confirmation"] as const

// Office-side updates (via the Field app proxy): confirm after the customer is
// reached, or cancel. Customer-facing statuses ("requested", "call_required",
// "service_area_review") are only ever set by the booking flow itself, so they
// are not accepted here.
//
// Speed-to-lead stamps ride along, and are only ever set by a PERSON acting in
// the Field app — an automated acknowledgement is not a response:
//   contacted: true      -> firstResponseAt (first time only)
//   status "confirmed"   -> bookedAt (first time only)
//   fieldJobId: <int>    -> the Field app job created from this request
export async function PATCH(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  const { reference } = await params
  const body = (await request.json().catch(() => ({}))) as { status?: string; contacted?: boolean; fieldJobId?: unknown }
  const status = ALLOWED_STATUSES.find(s => s === body.status)
  if (body.status !== undefined && !status) return jsonError(`status must be one of: ${ALLOWED_STATUSES.join(", ")}`)
  const jobId = Number(body.fieldJobId)
  const hasJob = Number.isInteger(jobId) && jobId > 0
  if (!status && body.contacted !== true && !hasJob) return jsonError("Nothing to update")

  try {
    const current = await db.tuneUpBooking.findUnique({ where: { reference } })
    if (!current) return jsonError("Booking not found", 404)
    const now = new Date()
    const data: Prisma.TuneUpBookingUpdateInput = {}
    if (status) data.status = status
    if (body.contacted === true) {
      if (!current.firstResponseAt) data.firstResponseAt = now
      // a callback lead that has been reached is now "confirming", not "call them"
      if (!status && current.status === "call_required") data.status = "pending_confirmation"
    }
    if (status === "confirmed") {
      if (!current.bookedAt) data.bookedAt = now
      if (!current.firstResponseAt) data.firstResponseAt = now // booking them means someone reached them
    }
    if (hasJob) data.fieldJobId = jobId
    const record = await db.tuneUpBooking.update({ where: { reference }, data })
    console.log(`[tuneup-booking] ${record.reference} status -> ${record.status}${body.contacted ? " (contacted)" : ""}`)
    return Response.json({ reference: record.reference, status: record.status, firstResponseAt: record.firstResponseAt, bookedAt: record.bookedAt })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError("Booking not found", 404)
    }
    throw error
  }
}
