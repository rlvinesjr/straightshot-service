import { db } from "@/lib/db"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { validateBooking, makeReference, type BookingPayload } from "@/lib/tuneup/booking"
import { getBookingProvider } from "@/lib/tuneup/booking-provider"
import { notifyBooking } from "@/lib/tuneup/booking-emails"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

// --- basic anti-spam: sliding-window rate limit per IP (in-memory; the app
// runs as a single long-lived Node process on the VPS, so this is effective).
const hits = new Map<string, number[]>()
const RATE_LIMIT = 6
const RATE_WINDOW_MS = 10 * 60 * 1000

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every(t => now - t >= RATE_WINDOW_MS)) hits.delete(k)
  }
  return recent.length > RATE_LIMIT
}

async function createWithUniqueReference(data: BookingPayload) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.tuneUpBooking.create({ data: { ...data, reference: makeReference() } })
    } catch (error) {
      const collision = error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002"
      if (!collision || attempt === 3) throw error
    }
  }
  throw new Error("unreachable")
}

// POST /api/door-estimator/tuneup-booking
// body.kind: "standard" (self-scheduled request) | "callback" (call_required /
// service_area_review lead). Validation and routing are re-checked server-side.
export async function POST(request: Request) {
  const headers = publicCorsHeaders(request)
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (rateLimited(ip)) return jsonError("Too many requests — please call us instead", 429, headers)

    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!raw) return jsonError("Invalid request", 400, headers)

    // Honeypot: real users never see or fill the "company" field. Pretend
    // success so bots don't learn anything; store nothing.
    if (typeof raw.company === "string" && raw.company.trim() !== "") {
      return Response.json({ reference: makeReference(), status: "requested" }, { status: 201, headers })
    }

    const kind = raw.kind === "callback" ? "callback" : "standard"
    const result = validateBooking(raw, kind)
    if (!result.ok) {
      const [firstError] = Object.values(result.errors)
      return Response.json({ error: firstError, errors: result.errors }, { status: 400, headers })
    }
    const data = result.data

    // Duplicate protection: same phone + same date/window (or same phone
    // within 10 minutes for callbacks) returns the existing request instead
    // of creating a second one — makes double-taps and retries idempotent.
    const existing = await db.tuneUpBooking.findFirst({
      where: data.requestedDate
        ? { phone: data.phone, requestedDate: data.requestedDate, requestedWindow: data.requestedWindow, status: { notIn: ["cancelled"] } }
        : { phone: data.phone, status: data.status, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
    })
    if (existing) {
      return Response.json({ reference: existing.reference, status: existing.status, duplicate: true }, { status: 200, headers })
    }

    // Advisory hold check — the window may have filled while they typed.
    if (kind === "standard" && data.requestedDate && data.requestedWindow) {
      const stillOpen = await getBookingProvider().reserve(data.requestedDate, data.requestedWindow)
      if (!stillOpen) {
        return Response.json(
          { error: "That arrival window just filled up — please pick another one", code: "window_unavailable" },
          { status: 409, headers },
        )
      }
    }

    const record = await createWithUniqueReference(data)

    // Log without unnecessary PII (reference + routing only).
    console.log(`[tuneup-booking] ${record.reference} status=${record.status} window=${record.requestedDate ?? "-"}/${record.requestedWindow ?? "-"} zip=${record.zipCode ?? "-"}`)

    void notifyBooking(record)

    return Response.json(
      {
        reference: record.reference,
        status: record.status,
        requestedDate: record.requestedDate,
        requestedWindow: record.requestedWindow,
      },
      { status: 201, headers },
    )
  } catch (error) {
    console.error("[tuneup-booking] failed:", error instanceof Error ? error.message : error)
    return jsonError("We couldn't save your request — please call us and we'll get you scheduled", 500, headers)
  }
}
