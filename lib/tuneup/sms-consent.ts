// Customer text-message permission sent with a website booking (Twilio A2P 10DLC "service-notifications" program).
// The website's server records the customer's checkbox choice with the exact wording shown (see the website's
// public/assets/sms-consent.js). This app only stores that evidence with the booking; the Field app copies it onto
// the customer's consent history. This app never sends texts.
//
// Trust rules:
// - Only a request carrying the website's key (X-Shop-Booking-Key) can record permission. A direct post here, an
//   old cached page or the $129 page records nothing (null = unknown).
// - "granted" needs the website's own record: status "granted", a known program, the wording and its version, a
//   server time, and the SAME normalized phone as the booking. Anything else becomes "not-provided".
// - "not-provided" is not an opt-out. It never revokes a past permission; the Field app decides status from history.

export const SMS_PROGRAM = "service-notifications"
const PURPOSES = new Set(["appointment-confirmations", "appointment-reminders", "scheduling-changes", "technician-arrival-updates", "job-conversations"])

export type BookingSmsConsent = {
  smsConsentStatus: "granted" | "not-provided"
  smsConsentProgram: string
  smsConsentPurposes: string
  smsConsentVersion: string | null
  smsConsentText: string | null
  smsConsentPhone: string
  smsConsentAt: Date
  smsConsentMethod: string
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** The booking's SMS consent fields, or null when the request did not come from the website's server. */
export function websiteSmsConsent(raw: Record<string, unknown>, fromWebsite: boolean, bookingPhoneDigits: string, now = new Date()): BookingSmsConsent | null {
  if (!fromWebsite) return null
  const c = raw.smsConsent && typeof raw.smsConsent === "object" && !Array.isArray(raw.smsConsent) ? (raw.smsConsent as Record<string, unknown>) : {}
  const phone = "+1" + bookingPhoneDigits
  const version = str(c.disclosureVersion, 60)
  const text = str(c.disclosureText, 2000)
  const at = typeof c.recordedAt === "string" ? new Date(c.recordedAt) : null
  const purposes = Array.isArray(c.purposes) ? c.purposes.filter((p): p is string => typeof p === "string" && PURPOSES.has(p)) : []
  const valid =
    c.status === "granted" &&
    c.program === SMS_PROGRAM &&
    /^web-\d{4}-\d{2}-\d{2}$/.test(version) &&
    text.length >= 100 && /StraightShot Overhead/.test(text) && /STOP/.test(text) && /HELP/.test(text) &&
    c.phone === phone &&
    at !== null && !Number.isNaN(at.getTime()) && Math.abs(at.getTime() - now.getTime()) < 10 * 60 * 1000 &&
    purposes.length > 0
  return {
    smsConsentStatus: valid ? "granted" : "not-provided",
    smsConsentProgram: SMS_PROGRAM,
    smsConsentPurposes: valid ? purposes.join(",") : "",
    smsConsentVersion: version && /^web-\d{4}-\d{2}-\d{2}$/.test(version) ? version : null,
    smsConsentText: version && text ? text : null,
    smsConsentPhone: phone,
    // the time this app saved it; the website's own time is kept only when it is plausible (checked above)
    smsConsentAt: valid && at ? at : now,
    smsConsentMethod: "website-booking-checkbox",
  }
}
