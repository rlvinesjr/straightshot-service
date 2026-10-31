// Which-ad attribution on website bookings (no DB / server needed).
// Run: npm run validate:attribution
import assert from "node:assert/strict"
import { bookingAttribution, adSource, adPlatform, adPlacementLabel, DEFAULT_AD_LABELS } from "../lib/tuneup/attribution"
import { validateBooking, isSelectableDate, dateKey } from "../lib/tuneup/booking"
import { bookingBusinessAlert, type BookingRecord } from "../lib/tuneup/booking-emails"

let passed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (error) { console.error(`FAIL  ${name}`); throw error }
}

const FBCLID = "IwZXh0bgNhZW0BMABhZGlkAasXyZ_" + "a".repeat(160) + "-_end"
const ADS: [string, string, string][] = [
  ["free-tuneup", "video-4x5", "Original mascot video"],
  ["free-tuneup", "hook-b-noisy-door", "Mascot B — Noisy Door"],
  ["free-tuneup", "hook-c-yes-really", "Mascot C — Yes, Really"],
  ["free-tuneup-whiteboard", "whiteboard-a-tyler", "Whiteboard A — Tyler Homeowners"],
  ["free-tuneup-whiteboard", "whiteboard-b-noisy-door", "Whiteboard B — Noisy Door"],
  ["free-tuneup-whiteboard", "whiteboard-c-yes-really", "Whiteboard C — Yes, Really"],
]
const at = new Date(Date.now() - 3600_000).toISOString()
const meta = { adCampaignId: "120211111111111111", adSetId: "120222222222222222", adId: "120233333333333333", adPlacement: "Facebook_Mobile_Reels", adSiteSource: "fb" }

function firstDate(): string {
  const d = new Date()
  for (let i = 0; i < 30; i++) { d.setDate(d.getDate() + 1); const k = dateKey(d); if (isSelectableDate(k)) return k }
  throw new Error("no selectable date")
}
const base = {
  kind: "general", firstName: "Pat", lastName: "Test", fullName: "Pat Test", phone: "9035550142", email: "pat@example.test",
  serviceAddress: "100 Test Lane", city: "Tyler", state: "TX", zipCode: "75701", notes: "Door is noisy", issue: "Door is noisy",
  requestedDate: firstDate(), requestedWindow: "8-11", consentAccepted: true,
}

test("each of the six ads is stored with its labels, Meta IDs, placement, time and the whole click ID", () => {
  for (const [campaign, content] of ADS) {
    const r = validateBooking({ ...base, utmSource: "facebook", utmMedium: "paid_social", utmCampaign: campaign, utmContent: content, ...meta, fbclid: FBCLID, attributedAt: at }, "general")
    assert.equal(r.ok, true, JSON.stringify(!r.ok && r.errors))
    if (!r.ok) return
    assert.equal(r.data.utmCampaign, campaign)
    assert.equal(r.data.utmContent, content)
    assert.equal(r.data.adId, meta.adId)
    assert.equal(r.data.adSetId, meta.adSetId)
    assert.equal(r.data.adCampaignId, meta.adCampaignId)
    assert.equal(r.data.adPlacement, "Facebook_Mobile_Reels")
    assert.equal(r.data.adSiteSource, "fb")
    assert.equal(r.data.fbclid, FBCLID, "not cut at 120 characters any more")
    assert.equal(r.data.attributedAt?.toISOString(), at)
    assert.equal(r.data.firstTouch, null)
  }
})

test("bad values are dropped, never a reason to refuse the booking", () => {
  const r = validateBooking({ ...base, utmContent: "whiteboard-b-noisy-door", adId: "{{ad.id}}", adPlacement: "<script>", gclid: "has spaces in it", fbclid: "x".repeat(501), attributedAt: "next tuesday" }, "general")
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.data.utmContent, "whiteboard-b-noisy-door")
  assert.equal(r.data.adId, null)
  assert.equal(r.data.adPlacement, null)
  assert.equal(r.data.gclid, null)
  assert.equal(r.data.fbclid, null)
  assert.equal(r.data.attributedAt, null)
  const none = validateBooking(base, "general")
  assert.equal(none.ok && none.data.utmContent, null)
  assert.equal(none.ok && none.data.attributedAt, null)
  const future = bookingAttribution({ utmContent: "video-4x5", attributedAt: new Date(Date.now() + 5 * 864e5).toISOString() })
  assert.equal(future.attributedAt, null, "a future time is not stored")
})

test("the first tagged visit is kept only when it was a different visit, and never merged into the latest", () => {
  const first = { utmSource: "facebook", utmCampaign: "free-tuneup", utmContent: "video-4x5", fbclid: "IwAR_first", at }
  const a = bookingAttribution({ utmSource: "google", gclid: "Cj0_latest", attributedAt: at, firstTouch: first })
  assert.equal(a.utmContent, null, "nothing from the first visit leaks into the latest")
  assert.equal(a.fbclid, null)
  assert.deepEqual(JSON.parse(a.firstTouch ?? "{}").utmContent, "video-4x5")
  const same = bookingAttribution({ ...first, attributedAt: at, firstTouch: first })
  assert.equal(same.firstTouch, null)
})

test("readable ad source: platform, campaign, ad name and placement; unknown labels show as recorded", () => {
  for (const [campaign, content, name] of ADS) {
    const s = adSource({ utmSource: "facebook", utmCampaign: campaign, utmContent: content, ...meta, attributedAt: at })
    assert.equal(s.ad, name)
    assert.equal(s.campaign, campaign === "free-tuneup" ? "Original campaign" : "Whiteboard campaign")
    assert.equal(s.platform, "Facebook")
    assert.equal(s.placement, "Reels")
  }
  assert.equal(adPlatform({ adSiteSource: "ig" }), "Instagram")
  assert.equal(adPlatform({ adPlacement: "Instagram_Stories" }), "Instagram")
  assert.equal(adPlatform({ utmSource: "facebook" }), "Meta (Facebook or Instagram)", "utm_source alone does not say which app")
  assert.equal(adPlatform({ gclid: "Cj0" }), "Google")
  assert.equal(adPlatform({ utmSource: "newsletter" }), "newsletter")
  assert.equal(adPlatform({}), null)
  assert.equal(adPlacementLabel("Instagram_Explore_Grid_Home"), "Explore Grid Home")
  assert.equal(adPlacementLabel("Facebook_Mobile_Feed"), "Feed")
  const later = adSource({ utmCampaign: "free-tuneup-spring", utmContent: "whiteboard-d-new" }, DEFAULT_AD_LABELS)
  assert.equal(later.ad, "whiteboard-d-new")
  assert.equal(later.campaign, "free-tuneup-spring")
  const named = adSource({ utmContent: "whiteboard-d-new" }, { campaigns: {}, ads: { "whiteboard-d-new": "Whiteboard D — New" } })
  assert.equal(named.ad, "Whiteboard D — New", "names from the Field app need no code change")
  assert.equal(adSource({}).recorded, false)
})

const record = (over: Partial<BookingRecord>): BookingRecord => ({
  reference: "SR-TEST1", status: "requested", serviceType: "general", firstName: "Pat", lastName: "Test", phone: "9035550142", email: null,
  preferredContactMethod: "text", serviceAddress: "100 Test Lane", city: "Tyler", state: "TX", zipCode: "75701", doorCount: null,
  doorOperatingStatus: null, issueType: null, specialConditions: null, notes: "Noisy", requestedDate: "2026-11-04", requestedWindow: "8-11",
  source: "free-tuneup-landing", utmSource: null, utmCampaign: null, ...over,
})

test("the office email shows the ad in plain words, never the click ID, and says when the source is missing", () => {
  const html = bookingBusinessAlert(record({ utmSource: "facebook", utmCampaign: "free-tuneup-whiteboard", utmContent: "whiteboard-b-noisy-door", ...meta, adPlacement: "Instagram_Reels", adSiteSource: "ig", fbclid: FBCLID, attributedAt: at })).html
  assert.match(html, /Ad source/)
  assert.match(html, /Instagram/)
  assert.match(html, /Whiteboard campaign/)
  assert.match(html, /Whiteboard B — Noisy Door/)
  assert.match(html, /Reels/)
  assert.match(html, /Facebook click ID on file/)
  assert.ok(!html.includes(FBCLID) && !html.includes("IwZXh0"), "no click ID in the email")
  assert.ok(!html.includes("utm_source="))
  const bare = bookingBusinessAlert(record({})).html
  assert.match(bare, /Source not recorded/)
  assert.ok(!/organic/i.test(bare))
  const xss = bookingBusinessAlert(record({ utmContent: "a&b" })).html
  assert.match(xss, /a&amp;b/)
})

console.log(`\n${passed} ad attribution checks passed`)
