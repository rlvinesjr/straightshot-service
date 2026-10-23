// Website shop requests (openers, doors): snapshot checks, door price re-verification and email rendering.
// Run: npm run validate:shop   (uses the local dev database's door price book; sends no email)
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { checkShopSnapshot, finalizeSnapshot, shopKeyValid, validSubmissionId, ShopRequestError } from "../lib/tuneup/shop-request"
import { summaryEmail } from "../lib/tuneup/summary-email"
import { bookingBusinessAlert, bookingReceiptEmail, type BookingRecord } from "../lib/tuneup/booking-emails"
import { validateSnapshot, summaryFromBooking, STATUS, NO_PAYMENT } from "../lib/tuneup/summary-core.mjs"
import { loadDoorEstimatorConfig } from "../lib/door-estimator/config-store"
import { calculateDoorPrice } from "../lib/door-estimator/pricing"
import type { BookingPayload } from "../lib/tuneup/booking"

let passed = 0
async function test(name: string, fn: () => unknown) {
  try { await fn(); passed++; console.log(`  ok  ${name}`) } catch (error) { console.error(`FAIL  ${name}`); throw error }
}

const data: BookingPayload = {
  serviceType: "general", firstName: "Pat", lastName: "Homeowner", phone: "9035550142", email: "pat@example.test", preferredContactMethod: "text",
  serviceAddress: "100 Test Lane", city: "Tyler", state: "TX", zipCode: "75701", doorCount: "", doorOperatingStatus: "", issueType: "general-service",
  specialConditions: "", notes: "DOOR INSPECTION REQUEST: test", requestedDate: "2026-10-27", requestedWindow: "8-11", serviceAreaEligible: true, status: "requested",
  source: "shop-door", utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, gclid: null, fbclid: null, consentAccepted: true,
}
const basis = { quantity: 1, width: 9, height: 7, constructionCode: "essential", styleCode: "traditional-raised", colorCode: "sandstone", windowCode: "decorative", openerCode: "keep-existing" }
function doorSnapshot(amountCents: number | null, over: Record<string, unknown> = {}) {
  return {
    schema: "straightshot.shop-request", version: 1, kind: "door", visitType: { id: "door-inspection" },
    product: { id: "door-410", model: "410", name: "DoorLink 410 · Traditional Raised Panel", category: "Garage doors · Non Insulated", includes: "Standard installation and old-door removal and disposal.", exclusions: "A replacement opener." },
    selections: [
      { id: "model", label: "Door model", value: "410", display: "DoorLink 410 · Traditional Raised Panel" },
      { id: "insulation", label: "Construction", value: "non-insulated", display: "Non Insulated" },
      { id: "size", label: "Door size", value: "9x7", display: "9 × 7 ft" },
      { id: "color", label: "Color", value: "sandstone", display: "Sandstone" },
      { id: "windows", label: "Windows", value: "yes", display: "Yes" },
      { id: "insert", label: "Window insert", value: "306", display: "Sherwood #306" },
    ],
    price: { amountCents, wording: "Preliminary installed estimate · final price confirmed on site", source: { name: "Door Pricing", version: 1 }, basis: amountCents === null ? null : basis },
    visit: { date: "2026-10-27", windowId: "8-11", windowLabel: "8:00 AM – 11:00 AM" },
    customer: { name: "Someone Else", email: "other@example.test", phone: "9035550199", street: "1 Wrong St", city: "Tyler", state: "TX", zip: "75703", contactMethod: "phone", notes: "Gate code <b>1234</b>" },
    ...over,
  }
}

async function main() {
  await test("the summary module is an unedited copy of the website's source", () => {
    const text = readFileSync("lib/tuneup/summary-core.mjs", "utf8")
    const [first, second, ...rest] = text.split("\n")
    assert.match(first, /^\/\/ GENERATED COPY/)
    const hash = second.replace("// source-sha256: ", "")
    assert.equal(createHash("sha256").update(rest.join("\n")).digest("hex"), hash, "summary-core.mjs was edited by hand: edit the website source and run npm run sync:summary")
  })

  await test("only the website's key may submit shop snapshots", () => {
    const req = (key?: string) => new Request("http://x", { headers: key ? { "x-shop-booking-key": key } : {} })
    const saved = process.env.SHOP_BOOKING_KEY
    process.env.SHOP_BOOKING_KEY = "k".repeat(40)
    assert.equal(shopKeyValid(req("k".repeat(40))), true)
    assert.equal(shopKeyValid(req("k".repeat(39))), false)
    assert.equal(shopKeyValid(req()), false)
    delete process.env.SHOP_BOOKING_KEY
    assert.equal(shopKeyValid(req("straightshot-dev")), process.env.NODE_ENV !== "production")
    if (saved) process.env.SHOP_BOOKING_KEY = saved
    assert.equal(validSubmissionId("3f1c9d0e-5b7a-4e21-9c44-1a2b3c4d5e6f"), "3f1c9d0e-5b7a-4e21-9c44-1a2b3c4d5e6f")
    for (const bad of ["short", "x".repeat(81), "has space in it xxxxxxxx", 12345]) assert.equal(validSubmissionId(bad), null)
  })

  const config = await loadDoorEstimatorConfig()
  const cents = calculateDoorPrice(config, basis as never, "website").retailPrice * 100

  await test("a door snapshot priced from the current Door Pricing is accepted; customer + visit come from the booking", async () => {
    const s = await checkShopSnapshot(doorSnapshot(cents), data)
    assert.equal(s.price.amountCents, cents)
    assert.equal(s.customer.name, "Pat Homeowner")
    assert.equal(s.customer.email, "pat@example.test")
    assert.equal(s.customer.phone, "9035550142")
    assert.equal(s.customer.street, "100 Test Lane")
    assert.equal(s.customer.contactMethod, "text")
    assert.equal(s.customer.notes, "Gate code <b>1234</b>", "the customer's note is kept (escaped when rendered)")
    assert.equal(s.visit.windowLabel, "8:00 AM – 11:00 AM")
    const saved = finalizeSnapshot(s, "SR-TEST1", new Date("2026-10-23T15:00:00Z"))
    assert.equal(saved.reference, "SR-TEST1")
    assert.equal(saved.createdAt, "2026-10-23T15:00:00.000Z")
  })

  await test("a stale or tampered door price is refused with price_changed", async () => {
    for (const bad of [cents - 10000, 100, 0]) {
      await assert.rejects(() => checkShopSnapshot(doorSnapshot(bad), data), (e: unknown) => e instanceof ShopRequestError && e.code === "price_changed" && e.status === 409)
    }
    const swapped = doorSnapshot(cents, {})
    ;(swapped.selections as { id: string; value: string }[])[3].value = "black"
    await assert.rejects(() => checkShopSnapshot(swapped, data), (e: unknown) => e instanceof ShopRequestError && e.code === "price_changed", "selections must match the priced configuration")
    const noBasis = doorSnapshot(cents, {})
    ;(noBasis.price as { basis: unknown }).basis = null
    await assert.rejects(() => checkShopSnapshot(noBasis, data), (e: unknown) => e instanceof ShopRequestError)
  })

  await test("unknown size / price to confirm is accepted without a number", async () => {
    const s = doorSnapshot(null)
    ;(s.selections as { id: string; label: string; value: string; display: string }[])[2] ={ id: "size", label: "Door size", value: "measure", display: "Measurements needed" }
    const ok = await checkShopSnapshot(s, data)
    assert.equal(ok.price.amountCents, null)
    assert.equal(ok.price.display, "Price to confirm")
  })

  await test("malformed snapshots and visit mismatches are refused", async () => {
    for (const bad of [null, {}, { ...doorSnapshot(cents), version: 2 }, { ...doorSnapshot(cents), kind: "opener" }, { ...doorSnapshot(cents), selections: [] },
      { ...doorSnapshot(cents), visit: { date: "2026-10-28", windowId: "8-11", windowLabel: "x" } }]) {
      await assert.rejects(() => checkShopSnapshot(bad, data), (e: unknown) => e instanceof ShopRequestError && e.status === 400)
    }
  })

  const savedSnapshot = finalizeSnapshot(await checkShopSnapshot(doorSnapshot(cents), data), "SR-TEST1", new Date())
  const record = { ...data, reference: "SR-TEST1", status: "requested", requestSnapshot: JSON.stringify(savedSnapshot), lastName: "Homeowner" } as unknown as BookingRecord

  await test("the customer email is rendered from the stored snapshot, with every selection and the required wording", () => {
    const email = summaryEmail(record as never)
    assert.ok(email)
    if (!email) return
    assert.match(email.subject, /SR-TEST1/)
    for (const text of [STATUS, NO_PAYMENT, "Free site inspection &amp; measurements", "DoorLink 410", "Sandstone", "Sherwood #306", "9 × 7 ft", "Non Insulated",
      "100 Test Lane, Tyler, TX 75701", "(903) 555-0142", "pat@example.test", "Text", "Gate code &lt;b&gt;1234&lt;/b&gt;", "8:00 AM – 11:00 AM · Central Time",
      "https://straightshotoverhead.com/assets/summary-door-410.png", "(903) 245-1182"]) assert.ok(email.html.includes(text), `email contains ${text}`)
    assert.ok(!email.html.includes("<b>1234</b>"), "customer text is escaped")
    assert.ok(!email.html.includes("Someone Else") && !email.html.includes("1 Wrong St"), "browser-supplied contact details never reach the email")
  })

  await test("the office alert lists the selections and estimate; the old receipt is not used for snapshot requests", () => {
    const alert = bookingBusinessAlert(record)
    assert.match(alert.subject, /^DOOR INSPECTION REQUEST SR-TEST1/)
    for (const text of ["Sandstone", "Sherwood #306", "9 × 7 ft", "Gate code &lt;b&gt;1234&lt;/b&gt;"]) assert.ok(alert.html.includes(text), `alert contains ${text}`)
    assert.ok(!bookingReceiptEmail(record).html.includes("Your choices. All in one place."), "snapshot requests are emailed by the tracked summary path, not here")
  })

  await test("legacy opener requests (note format only) still get the branded summary", () => {
    const legacy = { ...record, requestSnapshot: null, notes: "SHOP INSTALLATION REQUEST: LiftMaster 6690L; door/rail height: 8 ft; Installed package $1700.00, tax included. Includes installation; fit, scope, stock and appointment require confirmation. No payment collected. Customer note: Please call first." } as BookingRecord
    const s = summaryFromBooking({ ...legacy })
    assert.ok(s)
    assert.equal(s?.price.amountCents, 170000)
    assert.equal(s?.customer.notes, "Please call first.")
    assert.match(bookingReceiptEmail(legacy).html, /LiftMaster 6690L/)
    assert.equal(summaryFromBooking({ notes: "Noisy door" }), null)
    assert.equal(validateSnapshot(JSON.parse(record.requestSnapshot as string)).reference, "SR-TEST1")
  })

  console.log(`\n${passed} shop-request checks passed`)
}
main().then(() => process.exit(0), error => { console.error(error); process.exit(1) })
