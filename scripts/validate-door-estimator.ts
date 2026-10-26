import { DEFAULT_DOOR_ESTIMATOR_CONFIG as config } from "../lib/door-estimator/default-config"
import { calculateDoorPrice, SUPPORTED_HEIGHTS, SUPPORTED_WIDTHS } from "../lib/door-estimator/pricing"
import type { DoorSelection } from "../lib/door-estimator/types"

const example = { quantity: 1, width: 9, height: 7, constructionCode: "essential", styleCode: "traditional-raised", colorCode: "white", windowCode: "none", openerCode: "keep-existing" } satisfies DoorSelection
const testConfig = { ...config, priceRows: config.priceRows.map(row => row.constructionCode === "essential" && row.finishTier === "standard" && row.widthGroup === "9" && row.height === 7 ? { ...row, vendorCost: 900 } : row) }
const price = calculateDoorPrice(testConfig, example, "website")
if (price.retailPrice !== 2699) throw new Error(`Expected $2,699 from $900, received ${price.retailPrice}`)
if (price.minimumProfitApplied) throw new Error("$900 x 3 clears the $600 floor on its own")

// Minimum profit: a door whose multiplier price would leave less than $600 is lifted to cost + $600,
// rounded UP to the next ...99 so rounding can never take profit under the floor.
const withCost = (cost: number, extra: Partial<typeof config> = {}) => calculateDoorPrice({ ...testConfig, ...extra, priceRows: testConfig.priceRows.map(row => row.constructionCode === "essential" && row.finishTier === "standard" && row.widthGroup === "9" && row.height === 7 ? { ...row, vendorCost: cost } : row) }, example, "website")
const lowMult = { multiplier: 1.2 }
let p = withCost(1000, lowMult)                 // 1.2x = 1,200 → profit 200 → floor 1,600 → 1,699
if (p.retailPrice !== 1699 || p.grossProfit < 600 || !p.minimumProfitApplied) throw new Error(`Floor: expected $1,699, received ${p.retailPrice}`)
p = withCost(1001, lowMult)                     // floor 1,601 → 1,699
if (p.retailPrice !== 1699 || p.grossProfit < 600) throw new Error(`Floor: expected $1,699, received ${p.retailPrice}`)
p = withCost(1099.5, lowMult)                   // floor 1,699.50 → can't be 1,699 → 1,799
if (p.retailPrice !== 1799 || p.grossProfit < 600) throw new Error(`Floor rounding: expected $1,799, received ${p.retailPrice}`)
p = withCost(150)                               // 3x = 450 → floor 750 → 799
if (p.retailPrice !== 799 || p.grossProfit < 600) throw new Error(`Small door: expected $799, received ${p.retailPrice}`)
p = withCost(150, { minimumProfit: 0 })         // floor off → multiplier only: 450 → 499
if (p.retailPrice !== 499 || p.minimumProfitApplied) throw new Error(`No floor: expected $499, received ${p.retailPrice}`)
p = calculateDoorPrice({ ...testConfig, multiplier: 1.2 }, { ...example, quantity: 2 }, "website")   // per door, x quantity
if (p.grossProfit < 1200) throw new Error(`Two doors should clear $1,200 profit, got ${p.grossProfit}`)

let combinations = 0
let floorHits = 0
for (const construction of config.constructions) for (const style of config.styles.filter(x => x.constructionCodes.includes(construction.code))) for (const color of config.colors.filter(x => style.finishTiers.includes(x.finishTier) && construction.finishTiers.includes(x.finishTier))) for (const width of SUPPORTED_WIDTHS) for (const height of SUPPORTED_HEIGHTS) {
  const selection: DoorSelection = { quantity: 1, width, height, constructionCode: construction.code, styleCode: style.code, colorCode: color.code, windowCode: "none", openerCode: "keep-existing" }
  const b = calculateDoorPrice({ ...config, multiplier: 1.1 }, selection, "website")   // a thin multiplier: the floor must hold everywhere
  if (b.grossProfit < (config.minimumProfit ?? 0) - 0.001) throw new Error(`Profit under the floor for ${JSON.stringify(selection)}: ${b.grossProfit}`)
  if (b.minimumProfitApplied) floorHits++
  combinations++
}
console.log(`Minimum profit held on every combination at a 1.1x multiplier (${floorHits} lifted by the floor)`)
console.log(`Door estimator validated: ${combinations} base combinations; $900 -> $2,699`)
