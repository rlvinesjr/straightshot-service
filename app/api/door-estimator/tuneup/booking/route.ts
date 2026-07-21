import { db } from "@/lib/db"
import { tryEmail } from "@/lib/email"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { bookingAlert } from "@/lib/tuneup/tuneup-emails"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

const WINDOWS = new Set(["morning", "afternoon", "flexible"])

// Booking request from the results screen. A phone number is required here —
// this is a service appointment, not a download.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; phone?: string; preferredDay?: string; preferredWindow?: string }
    if (!body.token) return jsonError("Missing quiz token", 400, publicCorsHeaders(request))
    const record = await db.tuneUpLead.findUnique({ where: { token: body.token } })
    if (!record) return jsonError("Check not found", 404, publicCorsHeaders(request))

    const digits = (body.phone ?? "").replace(/\D/g, "")
    const phone = digits.length === 10 ? digits : digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : record.phone
    if (!phone) return jsonError("A mobile number is required so we can confirm your appointment", 400, publicCorsHeaders(request))

    const preferredDay = (body.preferredDay ?? "").trim().slice(0, 40) || null
    const preferredWindow = WINDOWS.has(body.preferredWindow ?? "") ? body.preferredWindow! : null

    const updated = await db.tuneUpLead.update({
      where: { id: record.id },
      data: { status: "booking-requested", phone, preferredDay, preferredWindow },
    })
    const alertTo = process.env.LEAD_ALERT_TO
    if (alertTo) {
      const alert = bookingAlert(updated)
      void tryEmail(alertTo, alert.subject, alert.html)
    }
    return Response.json({ ok: true }, { headers: publicCorsHeaders(request) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send your request"
    return jsonError(message, 400, publicCorsHeaders(request))
  }
}
