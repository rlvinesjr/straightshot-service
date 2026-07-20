import { db } from "@/lib/db"
import { tryEmail } from "@/lib/email"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { hotLeadEmail, TIMELINE_LABELS } from "@/lib/door-estimator/lead-emails"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

// Post-submission timeline question. "asap" / "30-days" answers trigger a
// HOT LEAD alert so the office can call while the homeowner is still shopping.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; timeline?: string }
    if (!body.token || !body.timeline || !(body.timeline in TIMELINE_LABELS)) {
      return jsonError("A report token and valid timeline are required", 400, publicCorsHeaders(request))
    }
    const record = await db.doorEstimate.findUnique({ where: { token: body.token } })
    if (!record || record.status !== "lead") return jsonError("Report not found", 404, publicCorsHeaders(request))

    const updated = await db.doorEstimate.update({ where: { id: record.id }, data: { timeline: body.timeline } })

    const alertTo = process.env.LEAD_ALERT_TO
    if (alertTo && (body.timeline === "asap" || body.timeline === "30-days")) {
      const hot = hotLeadEmail(updated)
      void tryEmail(alertTo, hot.subject, hot.html)
    }
    return Response.json({ ok: true }, { headers: publicCorsHeaders(request) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save your timeline"
    return jsonError(message, 400, publicCorsHeaders(request))
  }
}
