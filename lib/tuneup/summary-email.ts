// Customer summary email for website shop requests. Sent AFTER the booking is saved and never at its expense.
// Every attempt is recorded on the booking (customerEmailStatus / Attempts / Error / SentAt), failures are retried by
// the notify timer, and an atomic claim guarantees one successful send at most — a retry never duplicates an email.
// The email is rendered from the stored request snapshot, the same one the website's confirmation and PDF use.
import { db } from "@/lib/db"
import { sendMail } from "@/lib/email"
import { emailHTML, summaryFromBooking, STATUS } from "./summary-core.mjs"

export const MAX_SUMMARY_ATTEMPTS = 8
const BACKOFF_MS = [0, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 3_600_000, 6 * 3_600_000, 12 * 3_600_000]
const STALE_SENDING_MS = 10 * 60_000
// Product images in the email load from the website's public asset folder (never customer data in image URLs).
const assetBase = () => (process.env.SHOP_ASSET_BASE || "https://straightshotoverhead.com/assets/").replace(/\/?$/, "/")

export function summaryEmail(record: Parameters<typeof summaryFromBooking>[0] & { reference: string }): { subject: string; html: string } | null {
  const summary = summaryFromBooking(record)
  if (!summary) return null
  return { subject: `Your StraightShot request ${record.reference}: ${STATUS.toLowerCase()}`, html: emailHTML(summary, assetBase()) }
}

export async function deliverSummaryEmail(id: string, now = new Date()): Promise<"sent" | "failed" | "skipped"> {
  const claim = await db.tuneUpBooking.updateMany({
    where: {
      id,
      requestSnapshot: { not: null },
      email: { not: null },
      customerEmailAttempts: { lt: MAX_SUMMARY_ATTEMPTS },
      OR: [
        { customerEmailStatus: { in: ["pending", "failed"] } },
        { customerEmailStatus: "sending", updatedAt: { lt: new Date(now.getTime() - STALE_SENDING_MS) } },
      ],
    },
    data: { customerEmailStatus: "sending", customerEmailAttempts: { increment: 1 } },
  })
  if (claim.count === 0) return "skipped"
  const record = await db.tuneUpBooking.findUnique({ where: { id } })
  if (!record || !record.email) return "skipped"
  try {
    const email = summaryEmail(record)
    if (!email) throw new Error("Stored request summary could not be read")
    await sendMail({ to: record.email, subject: email.subject, html: email.html })
    await db.tuneUpBooking.update({ where: { id }, data: { customerEmailStatus: "sent", customerEmailSentAt: new Date(), customerEmailError: null } })
    console.log(`[shop-request] ${record.reference} customer summary email sent (attempt ${record.customerEmailAttempts})`)
    return "sent"
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).split("\n")[0].slice(0, 300)
    await db.tuneUpBooking.update({ where: { id }, data: { customerEmailStatus: "failed", customerEmailError: message } })
    console.error(`[shop-request] ${record.reference} customer summary email FAILED (attempt ${record.customerEmailAttempts}): ${message}`)
    return "failed"
  }
}

/** Retry every customer summary email that is due. Called by the notify timer (every 5 minutes). */
export async function retryDueSummaryEmails(now = new Date()): Promise<{ attempted: number; sent: number }> {
  const candidates = await db.tuneUpBooking.findMany({
    where: { requestSnapshot: { not: null }, customerEmailStatus: { in: ["pending", "failed", "sending"] }, customerEmailAttempts: { lt: MAX_SUMMARY_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: 50,
  })
  let attempted = 0, sent = 0
  for (const r of candidates) {
    const wait = r.customerEmailStatus === "sending" ? STALE_SENDING_MS : BACKOFF_MS[Math.min(r.customerEmailAttempts, BACKOFF_MS.length - 1)]
    if (now.getTime() - r.updatedAt.getTime() < wait) continue
    attempted++
    if ((await deliverSummaryEmail(r.id, now)) === "sent") sent++
  }
  return { attempted, sent }
}
