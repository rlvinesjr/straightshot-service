// Optional text-message permission on website bookings (no DB / server needed).
// Run: npm run validate:sms-consent
import assert from "node:assert/strict"
import { websiteSmsConsent, SMS_PROGRAM } from "../lib/tuneup/sms-consent"

let passed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (error) { console.error(`FAIL  ${name}`); throw error }
}

const now = new Date("2026-11-02T15:00:00Z")
const TEXT = "Yes, StraightShot Overhead may send me automated text messages about my appointments and requested service, including appointment confirmations, reminders, scheduling changes, technician arrival updates, and job-related conversations. Message frequency varies. Message and data rates may apply. Text STOP to opt out or HELP for help. Agreeing to texts is optional and is not required to book or purchase services."
// exactly what the website's lib/booking.mjs smsConsentRecord() sends
const record = (over: Record<string, unknown> = {}) => ({
  status: "granted", program: SMS_PROGRAM,
  purposes: ["appointment-confirmations", "appointment-reminders", "scheduling-changes", "technician-arrival-updates", "job-conversations"],
  disclosureVersion: "web-2026-11-02", disclosureText: TEXT, phone: "+19035550142", recordedAt: "2026-11-02T14:59:58.000Z", method: "website-booking-checkbox", ...over,
})

test("a checked box from the website is permission, with the exact wording, version, number and time", () => {
  const c = websiteSmsConsent({ smsConsent: record() }, true, "9035550142", now)
  assert.ok(c)
  assert.equal(c.smsConsentStatus, "granted")
  assert.equal(c.smsConsentText, TEXT)
  assert.equal(c.smsConsentVersion, "web-2026-11-02")
  assert.equal(c.smsConsentPhone, "+19035550142")
  assert.equal(c.smsConsentAt.toISOString(), "2026-11-02T14:59:58.000Z")
  assert.equal(c.smsConsentPurposes.split(",").length, 5)
})

test("without the website's key nothing is recorded (unknown), even if the body claims permission", () => {
  assert.equal(websiteSmsConsent({ smsConsent: record() }, false, "9035550142", now), null)
})

test("unchecked, missing or malformed consent is never permission", () => {
  const cases: unknown[] = [
    undefined, null, true, "granted", [], {},
    record({ status: "not-provided" }), record({ status: "GRANTED" }), record({ status: true }),
    record({ program: "marketing" }), record({ disclosureVersion: "" }), record({ disclosureVersion: "v1" }),
    record({ disclosureText: "yes" }), record({ disclosureText: TEXT.replace("STOP", "") }),
    record({ phone: "+19035550199" }), record({ phone: "9035550142" }),
    record({ recordedAt: "not a date" }), record({ recordedAt: "2026-10-01T00:00:00Z" }),
    record({ purposes: ["marketing"] }), record({ purposes: "appointment-reminders" }),
  ]
  for (const smsConsent of cases) {
    const c = websiteSmsConsent({ smsConsent } as Record<string, unknown>, true, "9035550142", now)
    assert.equal(c?.smsConsentStatus, "not-provided", JSON.stringify(smsConsent))
    assert.equal(c?.smsConsentPurposes, "")
  }
})

test("consent is tied to the booking's own number: a different number never inherits it", () => {
  const c = websiteSmsConsent({ smsConsent: record() }, true, "9035550199", now)
  assert.equal(c?.smsConsentStatus, "not-provided")
  assert.equal(c?.smsConsentPhone, "+19035550199")
})

console.log(`\n${passed} sms-consent checks passed`)
