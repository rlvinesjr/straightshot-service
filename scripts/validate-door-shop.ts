// Website door shop pricing: 24 doors priced from Door Pricing + the shared catalog (no DB / server needed).
// Run: npm run validate:door-shop
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { DEFAULT_DOOR_ESTIMATOR_CONFIG } from "../lib/door-estimator/default-config"
import { quoteShopDoor, shopDoorDescription } from "../lib/door-estimator/shop-pricing"
import { sanitizeCatalog, calculateDoorPrice, retailFromUnitCost } from "../lib/door-estimator/pricing"
import { MODELS, WIDTHS, HEIGHTS, STYLES } from "../lib/door-estimator/door-catalog.mjs"
import type { DoorEstimatorConfig } from "../lib/door-estimator/types"

let passed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) } catch (error) { console.error(`FAIL  ${name}`); throw error }
}
// The vendor sheet as stored in Door Pricing, with the handoff's rule (1.8, no minimum profit) for the regression.
const book = (over: Partial<DoorEstimatorConfig> = {}): DoorEstimatorConfig => ({ ...DEFAULT_DOOR_ESTIMATOR_CONFIG, multiplier: 1.8, minimumProfit: 0, ...over })
const price = (config: DoorEstimatorConfig, model: string, sel: Record<string, unknown>) => quoteShopDoor(config, model, { windows: false, insert: "plain", ...sel }).retailPrice

test("the door catalog is an unedited copy of the website's source", () => {
  const [first, second, ...rest] = readFileSync("lib/door-estimator/door-catalog.mjs", "utf8").split("\n")
  assert.match(first, /^\/\/ GENERATED COPY of service-app\/public\/assets\/door-catalog\.js/)
  assert.equal(createHash("sha256").update(rest.join("\n")).digest("hex"), second.replace("// source-sha256: ", ""), "door-catalog.mjs was edited by hand: edit the website source and run npm run sync:summary")
})

test("24 doors: 8 styles in Non Insulated, Vinyl Back and Steel Back", () => {
  assert.equal(Object.keys(MODELS).length, 24)
  assert.equal(STYLES.length, 8)
  for (const s of STYLES) assert.deepEqual(Object.values(MODELS).filter(m => m.styleKey === s.key).map(m => m.construction).sort(), ["non", "steel", "vinyl"])
})

// Owner decisions, Oct 26 2026: Gray, Oak and Light Cypress removed from the shop; Flush Panel windows priced as
// Contemporary clear (2 / 3 / 4 windows by width). Everything else must still match the approved snapshot exactly.
const REMOVED_COLORS = ["Gray", "Oak", "Light Cypress"]
const FLUSH = ["450", "451", "3650"]

test("every combination matches the approved retail snapshot (vendor sheet, 1.8 rule, no minimum profit)", () => {
  const fixture = JSON.parse(readFileSync("scripts/fixtures/door-shop-retail-2026-10-26.json", "utf8")).models as Record<string, { colorFinishes: Record<string, string | null>; retail: Record<string, Record<string, Record<string, number>>> }>
  const config = book()
  let checked = 0, removed = 0
  for (const [model, f] of Object.entries(fixture)) {
    const m = MODELS[model]
    for (const [colorName, finish] of Object.entries(f.colorFinishes)) {
      if (REMOVED_COLORS.includes(colorName)) {
        assert.ok(!m.colors.some(c => c.name === colorName), `${model} ${colorName} removed`)
        assert.throws(() => price(config, model, { width: 9, height: 7, color: colorName }), Error, `${model} ${colorName} refused`)
        removed++
        continue
      }
      for (const w of WIDTHS) for (const h of HEIGHTS) for (const win of ["none", "plain", "decorative"]) {
        if (win === "decorative" && !m.inserts.length) continue
        if (win === "plain" && FLUSH.includes(model)) continue // newly priced: checked below
        const expected = finish ? f.retail[finish]?.[`${w}x${h}`]?.[win] ?? null : null
        const got = price(config, model, { width: w, height: h, color: colorName, windows: win !== "none", insert: win === "decorative" ? m.inserts[0].code : "plain" })
        assert.equal(got, expected, `${model} ${colorName} ${w}x${h} ${win}`)
        checked++
      }
    }
  }
  assert.equal(removed, 24 + 4 + 4, "Gray on all 24 doors; Oak and Light Cypress on the 4 steel-back woodgrain doors")
  assert.ok(checked > 13000, `${checked} checked`)
})

test("every offered color is priced by Door Pricing (no 'Price to confirm' for a chosen size)", () => {
  const c = book()
  for (const [model, m] of Object.entries(MODELS)) for (const color of m.colors) for (const w of WIDTHS) for (const h of HEIGHTS) {
    assert.ok(color.finish === "standard" || color.finish === "wood", `${model} ${color.name}`)
    assert.ok(price(c, model, { width: w, height: h, color: color.name }), `${model} ${color.name} ${w}x${h}`)
    if (m.inserts.length || FLUSH.includes(model)) assert.ok(price(c, model, { width: w, height: h, color: color.name, windows: true }), `${model} ${color.name} ${w}x${h} windows`)
  }
})

test("Flush Panel windows: Contemporary clear, per window, 2 / 3 / 4 by width", () => {
  const c = book()
  const rate = (code: string) => DEFAULT_DOOR_ESTIMATOR_CONFIG.windows.find(w => w.code === "contemporary-clear")!.costs[code as "essential"]!.contemporary!
  const row = (code: string, w: number, h: number) => DEFAULT_DOOR_ESTIMATOR_CONFIG.priceRows.find(r => r.active && r.constructionCode === code && r.finishTier === "standard" && r.height === h
    && r.widthGroup === (w >= 14 && w <= 16 ? "14/15/16" : w >= 17 ? "17/18" : String(w)))!.vendorCost
  for (const [model, code] of [["450", "essential"], ["451", "comfort"], ["3650", "premium"]] as const) for (const [w, n] of [[8, 2], [9, 2], [10, 2], [12, 3], [14, 3], [15, 4], [16, 4], [17, 4], [18, 4]]) {
    const expected = retailFromUnitCost(c, Math.round((row(code, w, 7) + rate(code) * n) * 100) / 100).unitRetailPrice
    assert.equal(price(c, model, { width: w, height: 7, color: "White", windows: true }), expected, `${model} ${w}x7`)
  }
  assert.ok(price(c, "450", { width: 16, height: 7, color: "White", windows: true })! > price(c, "450", { width: 16, height: 7, color: "White" })!)
})

test("the handoff's checked examples", () => {
  const c = book()
  assert.equal(price(c, "410", { width: 9, height: 7, color: "White" }), 899)
  assert.equal(price(c, "411", { width: 9, height: 7, color: "White" }), 1199)
  assert.equal(price(c, "3610", { width: 9, height: 7, color: "White" }), 1399)
  assert.equal(price(c, "420", { width: 15, height: 7, color: "White", windows: true }), 1999)
  assert.equal(price(c, "430", { width: 15, height: 7, color: "White", windows: true }), 1899, "430 has three windows at 15 ft")
  assert.equal(price(c, "441", { width: 9, height: 7, color: "Walnut", windows: true, insert: "587" }), 1899)
  assert.equal(price(c, "3640", { width: 16, height: 8, color: "Driftwood", windows: true, insert: "587" }), 4199)
})

test("the Field app's line description uses plain names only, never model numbers or costs", () => {
  const q = quoteShopDoor(book(), "441", { width: 16, height: 7, color: "Walnut", windows: true, insert: "587" })
  const d = shopDoorDescription("441", q.selection)
  assert.equal(d.style, "Carriage House Long Grooved")
  assert.equal(d.construction, "Vinyl Back Insulated")
  assert.equal(d.size, "16 × 7 ft")
  assert.equal(d.color, "Walnut")
  assert.equal(d.windows, "Stockbridge #587 inserts")
  assert.ok(!/441|cost|margin/i.test(JSON.stringify({ ...d, image: "" })))
})

test("the live minimum-profit rule applies to the shop exactly as to the Field calculator", () => {
  const c = book({ minimumProfit: 600 })
  for (const [model, sel] of [["410", { width: 9, height: 7, color: "White" }], ["3640", { width: 18, height: 9, color: "Driftwood", windows: true, insert: "587" }]] as const) {
    const quote = quoteShopDoor(c, model, { insert: "plain", ...sel, windows: "windows" in sel ? sel.windows : false })
    assert.ok(quote.retailPrice && quote.retailPrice % 100 === 99)
  }
  // Same price as the existing calculator for a configuration both can price (410 9×7 white, no windows).
  const field = calculateDoorPrice(c, { quantity: 1, width: 9, height: 7, constructionCode: "essential", styleCode: "traditional-raised", colorCode: "white", windowCode: "none", openerCode: "keep-existing" }, "website").retailPrice
  assert.equal(price(c, "410", { width: 9, height: 7, color: "White" }), field)
})

test("no size, a partial size and 'not sure' never produce a number", () => {
  const c = book()
  for (const sel of [{}, { width: 9 }, { height: 7 }, { width: "", height: "" }, { unknownSize: true, width: 9, height: 7 }]) assert.equal(price(c, "410", { color: "White", ...sel }), null, JSON.stringify(sel))
})

test("windows without a vendor rate fail closed", () => {
  const c = book()
  const noContemporary = book({ windows: DEFAULT_DOOR_ESTIMATOR_CONFIG.windows.filter(w => w.code !== "contemporary-clear") })
  assert.equal(price(noContemporary, "450", { width: 9, height: 7, color: "White", windows: true }), null, "missing Contemporary clear rate = Price to confirm")
  assert.ok(price(c, "450", { width: 9, height: 7, color: "White" }))
  const noWood = book({ windows: DEFAULT_DOOR_ESTIMATOR_CONFIG.windows.map(({ woodCosts: _w, ...w }) => w) })
  assert.equal(price(noWood, "441", { width: 9, height: 7, color: "Walnut", windows: true }), null, "missing wood-finish window rate = Price to confirm, never the standard rate")
  assert.ok(price(noWood, "441", { width: 9, height: 7, color: "Walnut" }))
})

test("options a door doesn't offer are refused", () => {
  const c = book()
  for (const [model, sel] of [["410", { width: 11, height: 7, color: "White" }], ["410", { width: 9, height: 10, color: "White" }], ["410", { width: 9, height: 7, color: "Walnut" }],
    ["420", { width: 9, height: 7, color: "Driftwood" }], ["410", { width: 9, height: 7, color: "White", windows: true, insert: "587" }], ["999", { width: 9, height: 7, color: "White" }],
    ["410", { width: 9, height: 7, color: "White", windows: "yes" }]] as const) {
    assert.throws(() => quoteShopDoor(c, model, { insert: "plain", windows: false, ...sel }), Error, `${model} ${JSON.stringify(sel)}`)
  }
})

test("Door Pricing edits change new estimates", () => {
  const a = price(book(), "3610", { width: 16, height: 7, color: "White" })
  const b = price(book({ multiplier: 2 }), "3610", { width: 16, height: 7, color: "White" })
  assert.ok(a && b && b > a)
  const cheaper = book({ priceRows: DEFAULT_DOOR_ESTIMATOR_CONFIG.priceRows.map(r => ({ ...r, vendorCost: r.vendorCost / 2 })) })
  assert.ok((price(cheaper, "3610", { width: 16, height: 7, color: "White" }) ?? 0) < (a ?? 0))
})

test("wood-finish window costs never reach the public catalog", () => {
  const pub = JSON.stringify(sanitizeCatalog(DEFAULT_DOOR_ESTIMATOR_CONFIG, "website"))
  assert.ok(!pub.includes("woodCosts") && !pub.includes("103.35") && !pub.includes("82.15"))
})

console.log(`\n${passed} door-shop checks passed`)
