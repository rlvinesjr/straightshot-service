import { DEFAULT_DOOR_ESTIMATOR_CONFIG as config } from "../lib/door-estimator/default-config"
import { calculateDoorPrice, SUPPORTED_HEIGHTS, SUPPORTED_WIDTHS } from "../lib/door-estimator/pricing"
import type { DoorSelection } from "../lib/door-estimator/types"

const example = { quantity: 1, width: 9, height: 7, constructionCode: "essential", styleCode: "traditional-raised", colorCode: "white", windowCode: "none", openerCode: "keep-existing" } satisfies DoorSelection
const testConfig = { ...config, priceRows: config.priceRows.map(row => row.constructionCode === "essential" && row.finishTier === "standard" && row.widthGroup === "9" && row.height === 7 ? { ...row, vendorCost: 900 } : row) }
const price = calculateDoorPrice(testConfig, example, "website")
if (price.retailPrice !== 2699) throw new Error(`Expected $2,699 from $900, received ${price.retailPrice}`)

let combinations = 0
for (const construction of config.constructions) for (const style of config.styles.filter(x => x.constructionCodes.includes(construction.code))) for (const color of config.colors.filter(x => style.finishTiers.includes(x.finishTier) && construction.finishTiers.includes(x.finishTier))) for (const width of SUPPORTED_WIDTHS) for (const height of SUPPORTED_HEIGHTS) {
  const selection: DoorSelection = { quantity: 1, width, height, constructionCode: construction.code, styleCode: style.code, colorCode: color.code, windowCode: "none", openerCode: "keep-existing" }
  calculateDoorPrice(config, selection, "website")
  combinations++
}
console.log(`Door estimator validated: ${combinations} base combinations; $900 -> $2,699`)
