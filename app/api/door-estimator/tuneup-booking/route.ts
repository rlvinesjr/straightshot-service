import { db } from "@/lib/db"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { validateBooking, makeReference, type BookingPayload } from "@/lib/tuneup/booking"
import { getBookingProvider } from "@/lib/tuneup/booking-provider"
import { notifyBooking } from "@/lib/tuneup/booking-emails"
import { checkShopSnapshot, finalizeSnapshot, shopKeyValid, validSubmissionId, ShopRequestError } from "@/lib/tuneup/shop-request"
import { deliverSummaryEmail } from "@/lib/tuneup/summary-email"
import { Prisma, type TuneUpBooking } from "@prisma/client"

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
  const prefix = data.serviceType === "general" ? "SR" : "TU"
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.tuneUpBooking.create({ data: { ...data, reference: makeReference(prefix) } })
    } catch (error) {
      const collision = error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002"
      if (!collision || attempt === 3) throw error
    }
  }
  throw new Error("unreachable")
}

// ---- website shop requests -------------------------------------------------
// How long the request waits for the first customer-email attempt, so the website can say "sent" truthfully.
// Anything slower is finished by the background attempt and the retry timer; the booking is already saved.
const EMAIL_WAIT_MS = 7000

function shopResponse(record: TuneUpBooking, duplicate: boolean, emailStatus: string | null, headers: HeadersInit, status: number) {
  return Response.json(
    {
      reference: record.reference,
      status: record.status,
      requestedDate: record.requestedDate,
      requestedWindow: record.requestedWindow,
      requestSnapshot: record.requestSnapshot ? JSON.parse(record.requestSnapshot) : null,
      emailStatus: emailStatus ?? record.customerEmailStatus,
      ...(duplicate ? { duplicate: true } : {}),
    },
    { status, headers },
  )
}

async function saveShopRequest(raw: Record<string, unknown>, data: BookingPayload, headers: HeadersInit): Promise<Response> {
  const submissionId = validSubmissionId(raw.submissionId)
  if (!submissionId) return jsonError("Invalid request", 400, headers)

  // The same reviewed submission sent again (retry, double tap, lost response): return the ORIGINAL saved request.
  const prior = await db.tuneUpBooking.findUnique({ where: { submissionId } })
  if (prior) return shopResponse(prior, true, null, headers, 200)

  let snapshot
  try {
    snapshot = await checkShopSnapshot(raw.requestSnapshot, data)
  } catch (error) {
    if (error instanceof ShopRequestError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers })
    throw error
  }

  // A different request for the same phone + window: never attach these new choices to the old reference.
  const existing = await db.tuneUpBooking.findFirst({
    where: { phone: data.phone, requestedDate: data.requestedDate, requestedWindow: data.requestedWindow, status: { notIn: ["cancelled"] } },
  })
  if (existing) return Response.json({ error: "You already have a request for this arrival window.", code: "duplicate_request" }, { status: 409, headers })

  if (data.requestedDate && data.requestedWindow && !(await getBookingProvider().reserve(data.requestedDate, data.requestedWindow))) {
    return Response.json({ error: "That arrival window just filled up — please pick another one", code: "window_unavailable" }, { status: 409, headers })
  }

  let record: TuneUpBooking | null = null
  for (let attempt = 0; attempt < 4 && !record; attempt++) {
    const reference = makeReference("SR"), createdAt = new Date()
    try {
      record = await db.tuneUpBooking.create({
        data: {
          ...data,
          reference,
          createdAt,
          issueType: snapshot.visitType.id,
          submissionId,
          requestSnapshot: JSON.stringify(finalizeSnapshot(snapshot, reference, createdAt)),
          customerEmailStatus: data.email ? "pending" : null,
        },
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error
      const target = String((error.meta as { target?: unknown } | undefined)?.target ?? "")
      if (target.includes("submissionId")) {
        const winner = await db.tuneUpBooking.findUnique({ where: { submissionId } })
        if (winner) return shopResponse(winner, true, null, headers, 200) // a concurrent resend of the same submission won
      }
      if (attempt === 3) throw error
    }
  }
  if (!record) throw new Error("unreachable")

  console.log(`[tuneup-booking] ${record.reference} status=${record.status} shop=${snapshot.kind} window=${record.requestedDate ?? "-"}/${record.requestedWindow ?? "-"} zip=${record.zipCode ?? "-"}`)
  void notifyBooking(record) // office alert; the customer summary email goes through the tracked path below
  const emailStatus = await Promise.race([
    deliverSummaryEmail(record.id),
    new Promise<"pending">(resolve => setTimeout(() => resolve("pending"), EMAIL_WAIT_MS)),
  ])
  return shopResponse(record, false, emailStatus === "skipped" ? "pending" : emailStatus, headers, 201)
}

// POST /api/door-estimator/tuneup-booking
// body.kind: "standard" ($129 tune-up) | "general" (service/quote visit) |
// "callback" (call_required / service_area_review lead). Validation and
// routing are re-checked server-side.
export async function POST(request: Request) {
  const headers = publicCorsHeaders(request)
  try {
    // The website's server submits shop requests for every visitor from one address, and limits them itself.
    const shopRequestAuthorized = shopKeyValid(request)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!shopRequestAuthorized && rateLimited(ip)) return jsonError("Too many requests — please call us instead", 429, headers)

    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!raw) return jsonError("Invalid request", 400, headers)

    // Honeypot: real users never see or fill the hidden "hp" field. Pretend
    // success so bots don't learn anything; store nothing — but LOG it, so a
    // false positive is visible in the journal. Deliberately ONLY "hp": the
    // old field was named "company" and Chrome autofill filled it for real
    // customers; a stale cached page still sends that key, so it must be
    // ignored rather than trapped.
    if (typeof raw.hp === "string" && raw.hp.trim() !== "") {
      console.warn("[tuneup-booking] honeypot tripped — request discarded")
      return Response.json({ reference: makeReference(), status: "requested" }, { status: 201, headers })
    }

    const kind = raw.kind === "callback" ? "callback" : raw.kind === "general" ? "general" : "standard"
    const result = validateBooking(raw, kind)
    if (!result.ok) {
      const [firstError] = Object.values(result.errors)
      return Response.json({ error: firstError, errors: result.errors }, { status: 400, headers })
    }
    const data = result.data

    // Website shop requests (openers, doors) carry a structured request snapshot. Separate path: see shop-request.ts.
    if (raw.requestSnapshot !== undefined) {
      if (!shopRequestAuthorized) return jsonError("Shop requests must come from the website", 403, headers)
      if (kind !== "general") return jsonError("Invalid request", 400, headers)
      return await saveShopRequest(raw, data, headers)
    }

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
    if (kind !== "callback" && data.requestedDate && data.requestedWindow) {
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
