// Validation tests for the tune-up booking flow (no DB / server needed).
// Run: npm run validate:tuneup   (tsx scripts/validate-tuneup-booking.ts)
import assert from "node:assert/strict"
import {
  validateBooking,
  zipEligibility,
  sanitizeText,
  normalizePhone,
  isSelectableDate,
  isKnownWindow,
  makeReference,
  dateKey,
} from "../lib/tuneup/booking"
import { BUSINESS, SCHEDULING, savings } from "../lib/tuneup/booking-config"
import { windowOverlapsBusy, windowOpen } from "../lib/tuneup/booking-provider"

let passed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok  ${name}`)
  } catch (error) {
    console.error(`FAIL  ${name}`)
    throw error
  }
}

// A date that the business rules accept (skips closed weekdays / lead time).
function firstSelectableDate(): string {
  for (let offset = 0; offset <= SCHEDULING.maxDaysOut; offset++) {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const key = dateKey(d)
    if (isSelectableDate(key)) return key
  }
  throw new Error("no selectable date found in range")
}

const goodWindow = SCHEDULING.arrivalWindows[0].id
const goodDate = firstSelectableDate()

const standardBody = {
  fullName: "Pat Tester",
  phone: "(903) 555-0142",
  email: "pat@example.com",
  serviceAddress: "123 Main St",
  city: "Tyler",
  state: "tx",
  zipCode: "75701",
  residential: "yes",
  doorCount: "one",
  requestedDate: goodDate,
  requestedWindow: goodWindow,
  consentAccepted: true,
}

// ---- ZIP eligibility ---------------------------------------------------

test("empty ZIP config accepts any ZIP (recorded, verified by phone)", () => {
  assert.equal(BUSINESS.serviceZipCodes.length, 0)
  assert.equal(zipEligibility("75701"), "eligible")
})

test("configured ZIP list gates eligibility", () => {
  BUSINESS.serviceZipCodes.push("75701")
  try {
    assert.equal(zipEligibility("75701"), "eligible")
    assert.equal(zipEligibility("10001"), "review")
  } finally {
    BUSINESS.serviceZipCodes.length = 0
  }
})

test("out-of-area callback lead becomes service_area_review", () => {
  BUSINESS.serviceZipCodes.push("75701")
  try {
    const r = validateBooking({ firstName: "Pat", phone: "9035550142", zipCode: "10001" }, "callback")
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.data.status, "service_area_review")
      assert.equal(r.data.serviceAreaEligible, false)
    }
  } finally {
    BUSINESS.serviceZipCodes.length = 0
  }
})

// ---- residential screening -------------------------------------------------

test("commercial doors are rejected from self-scheduling", () => {
  const r = validateBooking({ ...standardBody, residential: "commercial" }, "standard")
  assert.ok(!r.ok)
  if (!r.ok) assert.ok(r.errors.routing)
})
test("'I'm not sure' proceeds and is flagged for the office", () => {
  const r = validateBooking({ ...standardBody, residential: "not-sure" }, "standard")
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.data.doorOperatingStatus, "not-sure-if-residential")
})
test("the residential answer is required", () => {
  const r = validateBooking({ ...standardBody, residential: "" }, "standard")
  assert.ok(!r.ok && Boolean(r.errors.residential))
})
test("multi-door standard booking passes validation", () => {
  const r = validateBooking({ ...standardBody, doorCount: "two-plus" }, "standard")
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.data.doorCount, "two-plus")
})

// ---- general service bookings ------------------------------------------------

const generalBody = {
  fullName: "Pat Tester",
  phone: "(903) 555-0142",
  email: "pat@example.com",
  serviceAddress: "123 Main St",
  city: "Tyler",
  state: "TX",
  zipCode: "75701",
  issue: "Door won't open, spring looks broken",
  requestedDate: goodDate,
  requestedWindow: goodWindow,
  consentAccepted: true,
}

test("general booking passes without residential/door-count answers", () => {
  const r = validateBooking(generalBody, "general")
  assert.ok(r.ok, JSON.stringify(!r.ok && r.errors))
  if (r.ok) {
    assert.equal(r.data.serviceType, "general")
    assert.equal(r.data.status, "requested")
    assert.equal(r.data.notes, "Door won't open, spring looks broken")
    assert.equal(r.data.issueType, "general-service")
    assert.equal(r.data.source, "booking-page")
  }
})

test("general booking requires the issue description", () => {
  const r = validateBooking({ ...generalBody, issue: "" }, "general")
  assert.ok(!r.ok && Boolean(r.errors.issue))
})

test("general booking still requires the complete address, email, and window", () => {
  const r = validateBooking({ ...generalBody, city: "", email: "", requestedWindow: "" }, "general")
  assert.ok(!r.ok)
  if (!r.ok) {
    assert.ok(r.errors.city)
    assert.ok(r.errors.email)
    assert.ok(r.errors.requestedWindow)
  }
})

test("tune-up bookings keep serviceType tuneup and TU source", () => {
  const r = validateBooking(standardBody, "standard")
  assert.ok(r.ok)
  if (r.ok) {
    assert.equal(r.data.serviceType, "tuneup")
    assert.equal(r.data.source, "tuneup-landing")
  }
})

test("references support both prefixes", () => {
  assert.match(makeReference("SR"), /^SR-[A-Z2-9]{5}$/)
  assert.match(makeReference(), /^TU-[A-Z2-9]{5}$/)
})

// ---- standard booking path ---------------------------------------------------

test("valid standard booking passes and starts as requested", () => {
  const r = validateBooking(standardBody, "standard")
  assert.ok(r.ok, JSON.stringify(!r.ok && r.errors))
  if (r.ok) {
    assert.equal(r.data.status, "requested")
    assert.equal(r.data.phone, "9035550142")
    assert.equal(r.data.requestedDate, goodDate)
    assert.equal(r.data.consentAccepted, true)
  }
})

test("full name is split into first and last for storage", () => {
  const r = validateBooking({ ...standardBody, fullName: "Mary Ann Van Buren" }, "standard")
  assert.ok(r.ok)
  if (r.ok) {
    assert.equal(r.data.firstName, "Mary")
    assert.equal(r.data.lastName, "Ann Van Buren")
  }
})

test("complete address is required and state is normalized to uppercase", () => {
  const r = validateBooking(standardBody, "standard")
  assert.ok(r.ok)
  if (r.ok) {
    assert.equal(r.data.city, "Tyler")
    assert.equal(r.data.state, "TX")
    assert.equal(r.data.zipCode, "75701")
  }
  const bad = validateBooking({ ...standardBody, city: "", state: "Texas", zipCode: "757" }, "standard")
  assert.ok(!bad.ok)
  if (!bad.ok) {
    assert.ok(bad.errors.city)
    assert.ok(bad.errors.state)
    assert.ok(bad.errors.zipCode)
  }
})

test("email is required for self-scheduled bookings", () => {
  const r = validateBooking({ ...standardBody, email: "" }, "standard")
  assert.ok(!r.ok && Boolean(r.errors.email))
})

test("required fields are enforced", () => {
  const r = validateBooking({}, "standard")
  assert.ok(!r.ok)
  if (!r.ok) {
    for (const key of ["fullName", "phone", "email", "serviceAddress", "city", "state", "zipCode", "residential", "doorCount", "requestedDate", "requestedWindow", "consentAccepted"]) {
      assert.ok(r.errors[key], `expected error for ${key}`)
    }
  }
})

test("past dates are rejected", () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  assert.ok(!isSelectableDate(dateKey(yesterday)))
  const r = validateBooking({ ...standardBody, requestedDate: dateKey(yesterday) }, "standard")
  assert.ok(!r.ok && Boolean(r.errors.requestedDate))
})

test("same-day is rejected (min lead time)", () => {
  if (SCHEDULING.minLeadDays > 0) assert.ok(!isSelectableDate(dateKey(new Date())))
})

test("unknown or unavailable window ids are rejected", () => {
  assert.ok(!isKnownWindow("3-6"))
  const r = validateBooking({ ...standardBody, requestedWindow: "3-6" }, "standard")
  assert.ok(!r.ok && Boolean(r.errors.requestedWindow))
})

test("consent is required for standard bookings", () => {
  const r = validateBooking({ ...standardBody, consentAccepted: false }, "standard")
  assert.ok(!r.ok && Boolean(r.errors.consentAccepted))
})

test("callback leads need only name + phone (+ zip) and become call_required", () => {
  const r = validateBooking({ firstName: "Pat", phone: "903-555-0142", zipCode: "75701" }, "callback")
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.data.status, "call_required")
})

// ---- sanitization ---------------------------------------------------------

test("free text is sanitized (control chars, angle brackets, length)", () => {
  assert.equal(sanitizeText("hello <script>world"), "hello script world")
  assert.equal(sanitizeText("  spaced   out  "), "spaced out")
  assert.equal(sanitizeText("x".repeat(999), 10).length, 10)
  assert.equal(sanitizeText(12345 as unknown as string), "")
})

test("phone numbers normalize to 10 digits", () => {
  assert.equal(normalizePhone("(903) 555-0142"), "9035550142")
  assert.equal(normalizePhone("1-903-555-0142"), "9035550142")
  assert.equal(normalizePhone("555-0142"), null)
})

test("attribution fields are captured", () => {
  const r = validateBooking({ ...standardBody, utmSource: "google", gclid: "abc123" }, "standard")
  assert.ok(r.ok)
  if (r.ok) {
    assert.equal(r.data.utmSource, "google")
    assert.equal(r.data.gclid, "abc123")
  }
})

// ---- optional trust claims / savings ------------------------------------------

test("savings section stays hidden without a real regular price", () => {
  assert.equal(BUSINESS.regularPrice, null)
  assert.equal(savings(), null)
})

test("savings is computed from config, never hard-coded", () => {
  const mutable = BUSINESS as unknown as { regularPrice: number | null }
  mutable.regularPrice = 199
  try {
    assert.equal(savings(), 199 - BUSINESS.promotionalPrice)
  } finally {
    mutable.regularPrice = null
  }
})

test("references look like TU-XXXXX and avoid ambiguous characters", () => {
  for (let i = 0; i < 50; i++) assert.match(makeReference(), /^TU-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/)
})

// ---- dispatch-board overlap math (one-crew rule) ---------------------------

test("dispatch job overlapping a window blocks it", () => {
  // job 9:00-12:00 blocks the 8-11 window (startHour 8) and the 11-2 window (startHour 11)
  const busy = [{ date: "2026-08-06", startMin: 540, endMin: 720 }]
  assert.ok(windowOverlapsBusy(busy, "2026-08-06", 8))
  assert.ok(windowOverlapsBusy(busy, "2026-08-06", 11))
  assert.ok(!windowOverlapsBusy(busy, "2026-08-06", 14))
  assert.ok(!windowOverlapsBusy(busy, "2026-08-07", 8), "other days unaffected")
})

test("touching intervals do not block (job ends exactly when window starts)", () => {
  const busy = [{ date: "2026-08-06", startMin: 5 * 60, endMin: 8 * 60 }]
  assert.ok(!windowOverlapsBusy(busy, "2026-08-06", 8))
  const after = [{ date: "2026-08-06", startMin: 11 * 60, endMin: 12 * 60 }]
  assert.ok(!windowOverlapsBusy(after, "2026-08-06", 8), "job starting at window end doesn't block")
})

test("partial one-minute overlap blocks", () => {
  const busy = [{ date: "2026-08-06", startMin: 8 * 60 + 179, endMin: 8 * 60 + 240 }]
  assert.ok(windowOverlapsBusy(busy, "2026-08-06", 8))
})

test("missing busy feed fails open (null = no constraint)", () => {
  assert.ok(!windowOverlapsBusy(null, "2026-08-06", 8))
})

test("crew feed: one tech = one-crew rule; two techs keep a window open until both are busy", () => {
  const job = (tech: number, h: number) => ({ tech, date: "2026-08-06", startMin: h * 60, endMin: h * 60 + 180 })
  const one = { busy: [], crew: [1], techBusy: [job(1, 8)], unassigned: [], closed: [] }
  assert.ok(!windowOpen(one, "2026-08-06", 8), "solo: an 8:00 job fills 8-11")
  assert.ok(windowOpen(one, "2026-08-06", 14))
  const two = { busy: [], crew: [1, 2], techBusy: [job(1, 8)], unassigned: [], closed: [] }
  assert.ok(windowOpen(two, "2026-08-06", 8), "second tech still free at 8")
  assert.ok(!windowOpen(two, "2026-08-06", 8, 1), "a website request not yet a job takes the second spot")
  assert.ok(!windowOpen({ ...two, techBusy: [job(1, 8), job(2, 8)] }, "2026-08-06", 8), "both busy")
  assert.ok(!windowOpen({ ...two, unassigned: [{ date: "2026-08-06", startMin: 480, endMin: 660 }] }, "2026-08-06", 8), "an unassigned job takes a spot")
  assert.ok(!windowOpen({ ...two, techBusy: [], closed: ["2026-08-06"] }, "2026-08-06", 14), "closed day")
  assert.ok(windowOpen({ busy: [] }, "2026-08-06", 8), "old feed shape still works")
  assert.ok(!windowOpen({ busy: [{ date: "2026-08-06", startMin: 480, endMin: 660 }] }, "2026-08-06", 8))
  assert.ok(windowOpen(null, "2026-08-06", 8), "feed down: fail open")
})

console.log(`\n${passed} tune-up booking checks passed`)
