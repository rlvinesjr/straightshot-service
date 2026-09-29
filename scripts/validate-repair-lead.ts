// Rules for the repair-request form and landing pages (no DB / server needed).
// Run: npm run validate:repair   (tsx scripts/validate-repair-lead.ts)
import assert from "node:assert/strict"
import { validateRepairLead, describeSource } from "../lib/repair/lead"
import { REPAIR_LANDINGS, REPAIR_COPY, REPAIR_FAQ, REPAIR_SCOPE, REPAIR_PHOTOS, REPAIR_PROCESS, landingFor } from "../lib/repair/landing"
import { repairEmail, REPAIR_SUBJECT, repairAlertTo } from "../lib/repair/notify"
import { readFileSync } from "node:fs"

let passed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (error) { console.error(`FAIL  ${name}`); throw error }
}

const good = {
  submissionId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  name: "Pat Homeowner", phone: "(903) 555-0142", zipCode: "75703",
  residentialConfirmed: true, problem: "Loud bang, door won't open", email: "",
  landing: "garage-door-repair", gclid: "Cj0KCQjw_test-click_ID.value", utmSource: "google", utmMedium: "cpc",
}

test("a complete request validates and is normalised", () => {
  const r = validateRepairLead(good)
  assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.data.firstName, "Pat")
  assert.equal(r.data.lastName, "Homeowner")
  assert.equal(r.data.phone, "9035550142")
  assert.equal(r.data.zipCode, "75703")
  assert.equal(r.data.email, null, "blank optional email is null, not an empty string")
  assert.equal(r.data.landingPath, "/lp/garage-door-repair")
  assert.equal(r.data.landingKeyword, "garage door repair")
  assert.equal(r.data.gclid, good.gclid)
})

test("name, phone, ZIP and the residential box are required", () => {
  for (const [k, v] of [["name", ""], ["phone", "555-0142"], ["zipCode", "7570"], ["residentialConfirmed", false]] as const) {
    const r = validateRepairLead({ ...good, [k]: v })
    assert.ok(!r.ok, `${k}=${String(v)} should fail`)
    if (!r.ok) assert.ok(r.errors[k], `error is reported on ${k}`)
  }
})

test("problem and email are optional; a malformed email is refused", () => {
  assert.ok(validateRepairLead({ ...good, problem: "", email: "" }).ok)
  assert.ok(validateRepairLead({ ...good, email: "pat@example.com" }).ok)
  assert.ok(!validateRepairLead({ ...good, email: "pat@example" }).ok)
})

test("a leading US country code is accepted; impossible numbers are not", () => {
  const r = validateRepairLead({ ...good, phone: "+1 903 555 0142" })
  assert.ok(r.ok && r.data.phone === "9035550142")
  assert.ok(!validateRepairLead({ ...good, phone: "(103) 555-0142" }).ok)
})

test("the landing must be allowlisted — no arbitrary page names", () => {
  assert.ok(!validateRepairLead({ ...good, landing: "<script>alert(1)</script>" }).ok)
  assert.equal(landingFor("constructor"), null, "prototype keys are not landings")
  assert.equal(landingFor("toString"), null)
})

test("a submission without an ID is refused (idempotency depends on it)", () => {
  assert.ok(!validateRepairLead({ ...good, submissionId: "" }).ok)
})

test("click IDs that aren't click IDs are dropped, not stored", () => {
  const r = validateRepairLead({ ...good, gclid: "<img src=x onerror=alert(1)>" })
  assert.ok(r.ok && r.data.gclid === null)
})

test("free text is stripped of control characters and capped", () => {
  const r = validateRepairLead({ ...good, problem: "a\u0000b\u0007c " + "x".repeat(2000) })
  assert.ok(r.ok && r.data.notes!.startsWith("a b c") && r.data.notes!.length <= 600)
})

test("the H1 matches the pinned ad headline and the brief", () => {
  assert.equal(REPAIR_LANDINGS["garage-door-repair"].h1, "Garage Door Repair")
  assert.equal(REPAIR_COPY.cta, "Request Repair")
  assert.equal(REPAIR_COPY.localLabel, "Residential service in Smith County, Texas")
})

test("no testimonials, ratings, guarantees or 24/7 promises in the page copy", () => {
  // the rendered page is re-checked the same way in scripts/e2e-repair-lead.mjs; here, the copy
  // sources plus the components with their code comments stripped (they explain the rule)
  const code = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
  const copy = JSON.stringify([REPAIR_COPY, REPAIR_FAQ, REPAIR_SCOPE, REPAIR_PROCESS, REPAIR_PHOTOS, REPAIR_LANDINGS])
    + code("components/repair/RepairLandingPage.tsx") + code("components/repair/RepairForm.tsx")
  for (const banned of [/testimonial/i, /review/i, /rating/i, /★/, /stars?\b/i, /guarantee/i, /24\/7/, /same[- ]day/i, /emergency/i, /licensed/i, /warranty/i, /discount/i]) {
    assert.ok(!banned.test(copy), `page copy must not contain ${banned}`)
  }
})

test("office email: right recipient, exact subject, no click IDs", () => {
  assert.equal(repairAlertTo(), "ricky@straightshotoverhead.com")
  const { subject, html } = repairEmail({
    reference: "RR-TEST1", firstName: "Pat", lastName: "Homeowner", phone: "9035550142", zipCode: "75703",
    notes: "<b>bang</b>", email: null, createdAt: new Date("2026-09-28T19:00:00Z"),
    gclid: "SECRET-CLICK-ID-123", gbraid: null, wbraid: null, utmSource: "google", utmMedium: "cpc", utmCampaign: "SSO — Search — Smith County — Repair",
  } as never)
  assert.equal(subject, REPAIR_SUBJECT)
  assert.equal(subject, "New Garage Door Repair Request — Smith County")
  assert.ok(!html.includes("SECRET-CLICK-ID-123"), "click ID stays out of the inbox")
  assert.ok(html.includes("&lt;b&gt;bang&lt;/b&gt;"), "customer text is escaped")
  assert.ok(html.includes("(903) 555-0142") && html.includes("75703") && html.includes("Google Ads click"))
  assert.ok(html.includes("2:00 PM CT"), "local (Central) submission time")
  assert.ok(html.includes("/#/doorleads"), "links to the login-protected Door Leads screen")
})

test("source description never leaks the click ID", () => {
  assert.equal(describeSource({ gclid: null, gbraid: null, wbraid: null, utmSource: null, utmMedium: null, utmCampaign: null }), "Direct / unknown (no ad click recorded)")
})

console.log(`\n${passed} repair-lead checks passed`)
