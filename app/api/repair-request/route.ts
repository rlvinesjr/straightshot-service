import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { makeReference } from "@/lib/tuneup/booking"
import { validateRepairLead, type RepairLeadInput } from "@/lib/repair/lead"
import { deliverRepairNotification, retryDueNotifications } from "@/lib/repair/notify"

// POST /api/repair-request — the form on /lp/<slug>. Same-origin only (no CORS
// headers): the page and this route are the same app.
//
// Order matters, and is the whole contract:
//   1. validate on the server  2. SAVE the lead  3. answer the visitor
//   4. email the office (after the answer; a failed email never fails the lead)
// A success response therefore always means "the lead is in the database".

const hits = new Map<string, number[]>()
const RATE_LIMIT = 6
const RATE_WINDOW_MS = 10 * 60 * 1000
const rateLimited = (ip: string) => {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every(t => now - t >= RATE_WINDOW_MS)) hits.delete(k)
  return recent.length > RATE_LIMIT
}

const saved = (reference: string, duplicate = false) =>
  Response.json({ ok: true, reference, duplicate }, { status: duplicate ? 200 : 201 })

async function createLead(data: RepairLeadInput) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.tuneUpBooking.create({
        data: {
          ...data,
          reference: makeReference("RR"),
          serviceType: "repair",
          status: "call_required", // no window was picked: someone has to reach out
          source: `lp:${data.landingPath}`,
          preferredContactMethod: "phone",
          consentAccepted: true, // they asked to be contacted about this request
          notifyStatus: "pending",
        },
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error
      const target = String((error.meta as { target?: unknown } | undefined)?.target ?? "")
      if (target.includes("submissionId")) return null // a concurrent retry of the same submission won
      if (attempt === 3) throw error // reference collision four times running
    }
  }
  return null
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!raw || typeof raw !== "object") return jsonError("Something went wrong — please try again", 400)

    // A retry of a submission we already hold is answered before anything else —
    // including the rate limit — so a flaky connection can never turn a saved
    // lead into an error on the visitor's screen.
    const sid = typeof raw.submissionId === "string" ? raw.submissionId.trim() : ""
    if (sid) {
      const prior = await db.tuneUpBooking.findUnique({ where: { submissionId: sid }, select: { reference: true } })
      if (prior) return saved(prior.reference, true)
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (rateLimited(ip)) return jsonError("Too many requests from this connection — please wait a few minutes and try again", 429)

    // Honeypot: a field people never see. Discard quietly and say nothing useful.
    if (typeof raw.hp === "string" && raw.hp.trim() !== "") {
      console.warn("[repair-lead] honeypot tripped — request discarded")
      return Response.json({ ok: true, reference: makeReference("RR") }, { status: 201 })
    }

    const result = validateRepairLead(raw)
    if (!result.ok) return Response.json({ error: Object.values(result.errors)[0], errors: result.errors }, { status: 400 })
    const data = result.data

    // Same phone within 10 minutes = the same person resubmitting (reloaded the
    // page, so a new submissionId). Keep the one lead and the one email.
    const recent = await db.tuneUpBooking.findFirst({
      where: { serviceType: "repair", phone: data.phone, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      select: { reference: true },
    })
    if (recent) return saved(recent.reference, true)

    const record = await createLead(data)
    if (!record) {
      const winner = await db.tuneUpBooking.findUnique({ where: { submissionId: data.submissionId }, select: { reference: true } })
      if (winner) return saved(winner.reference, true)
      throw new Error("lead not saved")
    }
    console.log(`[repair-lead] ${record.reference} saved zip=${record.zipCode} landing=${record.landingPath} paid_click=${!!(record.gclid || record.gbraid || record.wbraid)}`)

    // After the response is decided: email the office, then sweep any older
    // notifications that are due a retry. Neither can affect this answer.
    void deliverRepairNotification(record.id)
      .then(() => retryDueNotifications())
      .catch(e => console.error("[repair-lead] notify error:", e instanceof Error ? e.message : e))

    return saved(record.reference)
  } catch (error) {
    console.error("[repair-lead] failed:", error instanceof Error ? error.message : error)
    return jsonError("We couldn't save your request. Please try again — your details are still in the form.", 503)
  }
}
