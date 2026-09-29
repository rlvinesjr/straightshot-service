// Checks the campaign manifest against Google's limits and the brief's rules.
// Run: npm run validate:campaign
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

const DIR = path.resolve(import.meta.dirname, "..", "campaigns", "smith-county-repair")
const m = JSON.parse(readFileSync(path.join(DIR, "manifest.json"), "utf8"))
const landing = readFileSync(path.resolve(import.meta.dirname, "..", "lib", "repair", "landing.ts"), "utf8")
// Google counts characters; these limits are for Latin-script ads
const LIMIT = { headline: 30, description: 90, path: 15, callout: 25, snippet: 25, sitelinkText: 25, sitelinkDesc: 35 }

let passed = 0
const test = (name, fn) => { fn(); passed++; console.log(`  ok  ${name}`) }
const len = s => [...s].length

const c = m.campaign
const ag = m.adGroups[0]
const ad = ag.responsiveSearchAd

test("campaign is PAUSED, Search only, no Display expansion, no Performance Max", () => {
  assert.equal(m.mode, "DRY_RUN")
  assert.equal(c.status, "PAUSED")
  assert.equal(c.type, "SEARCH")
  assert.equal(c.networks.googleSearch, true)
  assert.equal(c.networks.displayExpansion, false)
  assert.equal(c.performanceMax, false)
  assert.equal(c.name, "SSO — Search — Smith County — Repair")
})

test("USD 100 average daily budget, no automatic increases", () => {
  assert.equal(c.budget.amountMicros, 100_000_000)
  assert.equal(c.budget.currency, "USD")
  assert.equal(c.budget.type, "AVERAGE_DAILY")
  assert.equal(c.budget.automaticIncreases, false)
})

test("Smith County, Texas by ID, presence targeting, no radius", () => {
  assert.equal(c.locations.positive.length, 1)
  const loc = c.locations.positive[0]
  assert.equal(loc.criteriaId, 9059615)
  assert.equal(loc.canonicalName, "Smith County,Texas,United States")
  assert.equal(loc.parentId, 21176)
  assert.equal(c.locations.positiveLocationOption, "PRESENCE")
})

test("exclusions never touch the target or its parents", () => {
  const rows = readFileSync(path.join(DIR, c.locations.excludedLocationsFile), "utf8").trim().split(/\r?\n/).slice(1)
  const ids = rows.map(r => Number(r.split(",")[0]))
  assert.ok(ids.length > 100)
  for (const forbidden of [9059615, 21176, 2840]) assert.ok(!ids.includes(forbidden), `${forbidden} must not be excluded`)
  assert.ok(rows.every(r => r.endsWith(",Country")), "countries only")
})

test("one PHRASE keyword: garage door repair", () => {
  assert.equal(m.adGroups.length, 1)
  assert.equal(ag.name, "Garage Door Repair")
  assert.deepEqual(ag.keywords.map(k => [k.text, k.matchType]), [["garage door repair", "PHRASE"]])
})

test("exactly 15 headlines ≤30 chars, only headline 1 pinned, to position 1", () => {
  assert.equal(ad.headlines.length, 15)
  for (const h of ad.headlines) assert.ok(len(h.text) <= LIMIT.headline, `"${h.text}" is ${len(h.text)} chars`)
  const pinned = ad.headlines.filter(h => h.pin)
  assert.equal(pinned.length, 1)
  assert.deepEqual(pinned[0], { text: "Garage Door Repair", pin: "HEADLINE_1" })
  assert.equal(new Set(ad.headlines.map(h => h.text.toLowerCase())).size, 15, "no duplicate headlines")
})

test("exactly 4 descriptions ≤90 chars", () => {
  assert.equal(ad.descriptions.length, 4)
  for (const d of ad.descriptions) assert.ok(len(d) <= LIMIT.description, `"${d}" is ${len(d)} chars`)
})

test("display paths and final URL; landing H1 matches the pinned headline", () => {
  assert.equal(ad.path1, "garage-door"); assert.ok(len(ad.path1) <= LIMIT.path)
  assert.equal(ad.path2, "repair"); assert.ok(len(ad.path2) <= LIMIT.path)
  assert.equal(ad.finalUrl, "https://estimate.straightshotoverhead.com/lp/garage-door-repair")
  assert.match(landing, /"garage-door-repair": \{[\s\S]*?h1: "Garage Door Repair"/)
})

test("no ratings, guarantees, 24/7 or unconditional same-day claims in ad text", () => {
  const text = JSON.stringify([ad, m.assets.callouts, m.assets.structuredSnippet.values,
    m.assets.sitelinks.map(s => [s.text, s.description1, s.description2])])
  for (const bad of [/★|\bstars?\b|rating|review|testimonial/i, /guarantee|warranty/i, /24\/7|24 hours/i, /same[- ]day/i, /licensed|insured/i, /discount|% off|coupon/i]) {
    assert.ok(!bad.test(text), `ad text matches ${bad}`)
  }
})

test("assets within limits; held sitelinks have no URL and a reason", () => {
  for (const cl of m.assets.callouts) assert.ok(len(cl) <= LIMIT.callout, cl)
  for (const v of m.assets.structuredSnippet.values) assert.ok(len(v) <= LIMIT.snippet, v)
  const live = m.assets.sitelinks.filter(s => s.status !== "HELD")
  for (const s of m.assets.sitelinks) {
    assert.ok(len(s.text) <= LIMIT.sitelinkText, s.text)
    assert.ok(len(s.description1) <= LIMIT.sitelinkDesc && len(s.description2) <= LIMIT.sitelinkDesc, s.text)
    if (s.status === "HELD") assert.ok(!s.finalUrl && s.reason, `${s.text} held properly`)
  }
  assert.equal(new Set(live.map(s => s.finalUrl)).size, live.length, "no duplicate sitelink URLs")
  assert.ok(!live.some(s => s.finalUrl === ad.finalUrl), "sitelinks do not repeat the ad's final URL")
})

test("bidding and schedule are explicit decisions, with no invented targets", () => {
  assert.equal(c.bidding.status, "DECISION_REQUIRED")
  assert.equal(c.bidding.targetCpaUsd, null)
  assert.equal(c.bidding.targetRoas, null)
  assert.equal(c.bidding.maxCpcLimitUsd, null)
  assert.equal(c.adSchedule.timezone, "America/Chicago")
})

test("negatives are PHRASE proposals; the risky ones are flagged, not silently added", () => {
  const rows = readFileSync(path.join(DIR, "negatives-proposal.csv"), "utf8").trim().split(/\r?\n/).slice(1)
  const byKw = Object.fromEntries(rows.map(r => { const [k, mt, , rec] = r.split(","); return [k, { mt, rec }] }))
  for (const t of ["indeed", "ziprecruiter", "salary", "apprenticeship", "job", "school", "course", "diy", "free", "coupon"]) {
    assert.ok(byKw[t], `report term "${t}" is in the proposal`)
    assert.equal(byKw[t].mt, "Phrase")
  }
  for (const t of ["job", "free", "coupon"]) assert.equal(byKw[t].rec, "DECIDE", `"${t}" can block customers — flagged`)
  assert.ok(!Object.keys(byKw).some(k => /overhead door/i.test(k)), "generic \"overhead door\" is not excluded")
})

console.log(`\n${passed} campaign checks passed`)
