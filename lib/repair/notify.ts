// Office email for a repair request — sent AFTER the lead is saved, and never
// at the lead's expense. Every attempt is recorded on the lead itself
// (notifyStatus / notifyAttempts / notifyError / notifiedAt), so a failed email
// is visible in the Field app and retried here, and the visitor is never asked
// to resubmit a request we already have.
import type { TuneUpBooking } from "@prisma/client"
import { db } from "@/lib/db"
import { sendMail } from "@/lib/email"
import { describeSource, formatPhone } from "./lead"

export const repairAlertTo = () => (process.env.REPAIR_LEAD_ALERT_TO || "ricky@straightshotoverhead.com").trim()
const fieldLeadsUrl = () => `${(process.env.FIELDAPP_PUBLIC_URL || "https://straightshotservice.com").replace(/\/$/, "")}/#/doorleads`

export const MAX_ATTEMPTS = 8
// wait before attempt N+1, indexed by attempts already made
const BACKOFF_MS = [0, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 3_600_000, 6 * 3_600_000, 12 * 3_600_000]
// a "sending" claim older than this belongs to a process that died mid-send
const STALE_SENDING_MS = 10 * 60_000

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export const chicagoTime = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }) + " CT"

export const REPAIR_SUBJECT = "New Garage Door Repair Request — Smith County"

/** The email. Click IDs deliberately stay in the job software, not in anyone's inbox. */
export function repairEmail(r: TuneUpBooking): { subject: string; html: string } {
  const name = [r.firstName, r.lastName].filter(Boolean).join(" ")
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#111">${v}</td></tr>`
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;padding:16px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-top:4px solid #00b33c;padding:20px">
<h2 style="margin:0 0 4px;color:#111">New garage door repair request</h2>
<p style="margin:0 0 16px;color:#666">Reference ${esc(r.reference)} · from the Smith County repair page</p>
<table style="border-collapse:collapse;font-size:15px">
${row("Name", esc(name))}
${row("Phone", `<a href="tel:${esc(r.phone)}">${esc(formatPhone(r.phone))}</a>`)}
${row("ZIP", esc(r.zipCode) + ' <span style="color:#999">(confirm the county when you call)</span>')}
${row("Door problem", r.notes ? esc(r.notes) : '<span style="color:#999">not given</span>')}
${row("Email", r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '<span style="color:#999">not given</span>')}
${row("Submitted", esc(chicagoTime(r.createdAt)))}
${row("Source", esc(describeSource(r)))}
</table>
<p style="margin:20px 0 0"><a href="${esc(fieldLeadsUrl())}" style="display:inline-block;background:#00b33c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:bold">Open in Door Leads → Repair Requests</a></p>
<p style="margin:12px 0 0;color:#999;font-size:12px">Requires your StraightShot Field login. The customer was told we will contact them to arrange a visit — nothing is booked yet.</p>
</div></body></html>`
  return { subject: REPAIR_SUBJECT, html }
}

/**
 * One delivery attempt, guarded by an atomic claim so two overlapping callers
 * (the submit handler and the retry sweep) can never both send the same email.
 */
export async function deliverRepairNotification(id: string, now = new Date()): Promise<"sent" | "failed" | "skipped"> {
  const claim = await db.tuneUpBooking.updateMany({
    where: {
      id,
      serviceType: "repair",
      notifyAttempts: { lt: MAX_ATTEMPTS },
      OR: [
        { notifyStatus: { in: ["pending", "failed"] } },
        { notifyStatus: "sending", updatedAt: { lt: new Date(now.getTime() - STALE_SENDING_MS) } },
      ],
    },
    data: { notifyStatus: "sending", notifyAttempts: { increment: 1 } },
  })
  if (claim.count === 0) return "skipped"

  const record = await db.tuneUpBooking.findUnique({ where: { id } })
  if (!record) return "skipped"
  try {
    const { subject, html } = repairEmail(record)
    await sendMail({ to: repairAlertTo(), subject, html })
    await db.tuneUpBooking.update({ where: { id }, data: { notifyStatus: "sent", notifiedAt: new Date(), notifyError: null } })
    console.log(`[repair-lead] ${record.reference} office email sent (attempt ${record.notifyAttempts})`)
    return "sent"
  } catch (error) {
    // SMTP replies never contain the password; still, keep only the first line
    const message = (error instanceof Error ? error.message : String(error)).split("\n")[0].slice(0, 300)
    await db.tuneUpBooking.update({ where: { id }, data: { notifyStatus: "failed", notifyError: message } })
    console.error(`[repair-lead] ${record.reference} office email FAILED (attempt ${record.notifyAttempts}): ${message}`)
    return "failed"
  }
}

/** Retry every repair notification that is due. Called by cron and after each new request. */
export async function retryDueNotifications(now = new Date()): Promise<{ attempted: number; sent: number }> {
  const candidates = await db.tuneUpBooking.findMany({
    where: { serviceType: "repair", notifyStatus: { in: ["pending", "failed", "sending"] }, notifyAttempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: 50,
  })
  let attempted = 0, sent = 0
  for (const r of candidates) {
    const wait = r.notifyStatus === "sending" ? STALE_SENDING_MS : BACKOFF_MS[Math.min(r.notifyAttempts, BACKOFF_MS.length - 1)]
    if (now.getTime() - r.updatedAt.getTime() < wait) continue
    attempted++
    if ((await deliverRepairNotification(r.id, now)) === "sent") sent++
  }
  return { attempted, sent }
}
