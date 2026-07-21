import { db } from "@/lib/db"
import { tryEmail } from "@/lib/email"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"
import { dripEmail, DRIP_OFFSETS_DAYS } from "@/lib/door-estimator/lead-emails"
import { tuneupDripEmail, TUNEUP_DRIP_OFFSETS_DAYS } from "@/lib/tuneup/tuneup-emails"

// Follow-up sequence runner: day 1 / 2 / 3 / 5 / 7 emails after a Buyer Report
// lead. Invoked by a systemd timer on the VPS (curl with the admin key) —
// idempotent, advances each lead at most one stage per call, never re-sends.
export async function POST(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  const now = new Date()
  const due = await db.doorEstimate.findMany({
    where: {
      status: "lead",
      emailOptOut: false,
      email: { not: null },
      nextDripAt: { not: null, lte: now },
      dripStage: { lt: DRIP_OFFSETS_DAYS.length },
    },
    take: 25,
  })

  let sent = 0
  for (const lead of due) {
    const stage = lead.dripStage
    const message = dripEmail(stage, lead)
    const delivered = await tryEmail(lead.email!, message.subject, message.html)
    const nextStage = stage + 1
    const nextOffset = DRIP_OFFSETS_DAYS[nextStage]
    await db.doorEstimate.update({
      where: { id: lead.id },
      data: {
        // advance even on a failed send so a bad address can't wedge the queue
        dripStage: nextStage,
        lastEmailAt: delivered ? now : lead.lastEmailAt,
        nextDripAt: nextOffset !== undefined ? new Date(lead.createdAt.getTime() + nextOffset * 86400000) : null,
      },
    })
    if (delivered) sent++
  }

  // tune-up quiz sequence (day 1 / 3 / 5 / 7) — same advance-once semantics
  const tuneupDue = await db.tuneUpLead.findMany({
    where: {
      emailOptOut: false,
      email: { not: null },
      nextDripAt: { not: null, lte: now },
      dripStage: { lt: TUNEUP_DRIP_OFFSETS_DAYS.length },
    },
    take: 25,
  })
  let tuneupSent = 0
  for (const lead of tuneupDue) {
    const message = tuneupDripEmail(lead.dripStage, lead)
    const delivered = await tryEmail(lead.email!, message.subject, message.html)
    const nextStage = lead.dripStage + 1
    const nextOffset = TUNEUP_DRIP_OFFSETS_DAYS[nextStage]
    await db.tuneUpLead.update({
      where: { id: lead.id },
      data: {
        dripStage: nextStage,
        lastEmailAt: delivered ? now : lead.lastEmailAt,
        nextDripAt: nextOffset !== undefined ? new Date(lead.createdAt.getTime() + nextOffset * 86400000) : null,
      },
    })
    if (delivered) tuneupSent++
  }
  return Response.json({ due: due.length, sent, tuneupDue: tuneupDue.length, tuneupSent })
}
