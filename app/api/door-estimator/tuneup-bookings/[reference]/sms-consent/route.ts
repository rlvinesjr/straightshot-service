import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"

// GET — the optional text-message permission saved with one website booking, for the Field app to copy onto the
// customer's consent history when it creates the job. Key-protected, server to server (like /attribution).
// status null = unknown (not recorded with this booking); "not-provided" = the box was not checked (no permission,
// and not an opt-out); "granted" = the customer checked the box, with the exact wording, version, number and time.
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
    source: b.source,
    bookingCreatedAt: b.createdAt,
    status: b.smsConsentStatus ?? null,
    program: b.smsConsentProgram,
    purposes: b.smsConsentPurposes ? b.smsConsentPurposes.split(",").filter(Boolean) : [],
    disclosureVersion: b.smsConsentVersion,
    disclosureText: b.smsConsentText,
    phone: b.smsConsentPhone,
    recordedAt: b.smsConsentAt,
    method: b.smsConsentMethod,
  })
}
