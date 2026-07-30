// Notifications for tune-up booking requests.
//
// Adapter boundaries: notifyCustomer / notifyBusiness are the only functions
// the API route calls. Today they send email through lib/email.ts (the
// dependency-free SMTP client). To add SMS (e.g. Twilio) implement it inside
// notifyCustomer behind TWILIO_* env vars — the call site stays the same.
// When no transport is configured the functions log a safe development
// message (no full contact details) and return.
import { tryEmail } from "@/lib/email"
import { BUSINESS, rollerPhrase } from "./booking-config"
import { formatPhone, windowLabel, type BookingStatus } from "./booking"

export type BookingRecord = {
  reference: string
  status: string
  serviceType: string
  firstName: string
  lastName: string | null
  phone: string
  email: string | null
  preferredContactMethod: string
  serviceAddress: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  doorCount: string | null
  doorOperatingStatus: string | null
  issueType: string | null
  specialConditions: string | null
  notes: string | null
  requestedDate: string | null
  requestedWindow: string | null
  source: string | null
  utmSource: string | null
  utmCampaign: string | null
}

const OFFICE_TEL = BUSINESS.phoneHref.replace("tel:", "")

const shell = (body: string) => `<!doctype html>
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;line-height:1.6">
  <div style="background:#000;padding:18px 24px;border-radius:8px 8px 0 0">
    <span style="color:#fff;font-weight:bold;font-size:18px;letter-spacing:1px">STRAIGHTSHOT <span style="color:#00d23a">OVERHEAD</span></span>
  </div>
  <div style="border:1px solid #e3e3e3;border-top:none;border-radius:0 0 8px 8px;padding:26px 24px">
    ${body}
    <p style="margin:28px 0 0;font-size:13px;color:#888">${BUSINESS.companyName} — Garage Door Sales &amp; Service, East Texas<br>
    Office: <a href="tel:${OFFICE_TEL}" style="color:#00a02e">${BUSINESS.phoneNumber}</a> · <a href="${BUSINESS.websiteUrl}" style="color:#00a02e">straightshotoverhead.com</a></p>
  </div>
</div>`

function fullAddress(b: Pick<BookingRecord, "serviceAddress" | "city" | "state" | "zipCode">): string {
  if (!b.serviceAddress) return "—"
  return `${b.serviceAddress}${b.city ? `, ${b.city}` : ""}${b.state ? `, ${b.state}` : ""}${b.zipCode ? ` ${b.zipCode}` : ""}`
}

function prettyDate(key: string | null): string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return key ?? "—"
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

// Receipt for the customer: confirms we RECEIVED the request — explicitly
// not a final confirmation, matching the on-screen policy.
export function bookingReceiptEmail(b: BookingRecord): { subject: string; html: string } {
  const general = b.serviceType === "general"
  const serviceName = general ? "garage door service" : "$129 garage door tune-up"
  return {
    subject: general
      ? `We received your service request (${b.reference})`
      : `We received your $129 tune-up request (${b.reference})`,
    html: shell(`
      <h2 style="margin:0 0 12px">Request received, ${b.firstName}</h2>
      <p>We received your ${serviceName} request for <strong>${prettyDate(b.requestedDate)}, ${windowLabel(b.requestedWindow)}</strong>. We'll contact you shortly to confirm the appointment.</p>
      <p style="margin:16px 0 4px"><strong>Request reference:</strong> ${b.reference}<br>
      <strong>Service address:</strong> ${fullAddress(b)}<br>
      <strong>We'll reach you by:</strong> text or phone at ${formatPhone(b.phone)}</p>
      <p><strong>Please don't consider the appointment final until you receive our confirmation.</strong></p>
      <p>${general
        ? `The technician will look at what you described${b.notes ? ` ("${b.notes.slice(0, 120)}${b.notes.length > 120 ? "..." : ""}")` : ""} and give you straight answers and pricing on site — no work is ever done without your approval.`
        : b.doorCount === "two-plus"
          ? `The $129 covers the tune-up service and ${rollerPhrase()} per qualifying standard residential door — since you have more than one door, we'll confirm the door count, total, and time needed when we confirm your appointment.`
          : `The $129 covers the tune-up service and ${rollerPhrase()} for one qualifying standard residential door.`} ${general ? "" : "Any additional work is always explained and priced for your approval first."}</p>
      <p>Questions, changes, or urgent service? Reply to this email or call <a href="tel:${OFFICE_TEL}" style="color:#00a02e"><strong>${BUSINESS.phoneNumber}</strong></a>.</p>
    `),
  }
}

const STATUS_HEADLINE: Record<string, string> = {
  requested: "$129 tune-up appointment request",
  call_required: "Tune-up lead needs a PHONE CALL (special condition)",
  service_area_review: "Tune-up lead OUTSIDE configured service area",
}

// Alert for the office with everything needed to confirm or triage.
export function bookingBusinessAlert(b: BookingRecord): { subject: string; html: string } {
  const general = b.serviceType === "general"
  const name = [b.firstName, b.lastName].filter(Boolean).join(" ")
  const when = b.requestedDate ? `${prettyDate(b.requestedDate)}, ${windowLabel(b.requestedWindow)}` : "no window selected"
  const kindLabel = general ? "SERVICE REQUEST" : b.status === "requested" ? "TUNE-UP REQUEST" : "TUNE-UP LEAD"
  return {
    subject: `${kindLabel} ${b.reference} — ${name} (${when})${b.doorCount === "two-plus" ? " — 2+ DOORS" : ""}`,
    html: shell(`
      <h2 style="margin:0 0 12px;color:${b.status === "requested" ? "#111" : "#c40000"}">${general ? "General service appointment request" : STATUS_HEADLINE[b.status] ?? b.status}</h2>
      <p><strong>${name}</strong><br>
      Phone: <a href="tel:${b.phone}"><strong>${formatPhone(b.phone)}</strong></a><br>
      ${b.email ? `Email: <a href="mailto:${b.email}">${b.email}</a><br>` : ""}
      Address: ${fullAddress(b)}</p>
      <p><strong>Requested:</strong> ${when}<br>
      ${general
        ? `<strong>Issue:</strong> ${b.notes ?? "—"}<br>`
        : `<strong>Residential:</strong> ${b.doorOperatingStatus === "residential" ? "yes" : b.doorOperatingStatus === "not-sure-if-residential" ? "customer wasn't sure" : "—"} · <strong>Doors:</strong> ${b.doorCount === "two-plus" ? "two or more ($129/door)" : b.doorCount ?? "—"}<br>${b.notes ? `<strong>Notes:</strong> ${b.notes}<br>` : ""}`}
      <strong>Status:</strong> ${b.status} · <strong>Ref:</strong> ${b.reference}<br>
      <strong>Source:</strong> ${b.source ?? "tuneup-landing"}${b.utmSource ? ` · utm_source=${b.utmSource}` : ""}${b.utmCampaign ? ` · utm_campaign=${b.utmCampaign}` : ""}</p>
      <p style="font-size:13px;color:#888">Text or call to confirm, then mark it on the schedule.</p>
    `),
  }
}

export async function notifyBooking(b: BookingRecord): Promise<void> {
  // Appointment requests go to the booking inbox; falls back to the general
  // lead-alert address if BOOKING_ALERT_TO is unset.
  const alertTo = process.env.BOOKING_ALERT_TO || process.env.LEAD_ALERT_TO
  if (alertTo) {
    const alert = bookingBusinessAlert(b)
    void tryEmail(alertTo, alert.subject, alert.html).then(sent =>
      console.log(`[tuneup-booking] ${b.reference} office alert ${sent ? "sent" : "FAILED"}`))
  } else {
    console.log(`[tuneup-booking] LEAD_ALERT_TO not set — business alert for ${b.reference} (${b.status}) not sent`)
  }
  if (b.email && (b.status as BookingStatus) === "requested") {
    const receipt = bookingReceiptEmail(b)
    void tryEmail(b.email, receipt.subject, receipt.html).then(sent =>
      console.log(`[tuneup-booking] ${b.reference} customer receipt ${sent ? "sent" : "FAILED"}`))
  }
}
