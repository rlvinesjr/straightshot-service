// Website door shop prices (24 doors: 8 styles × Non Insulated / Vinyl Back / Steel Back).
// Costs, multiplier, rounding and minimum profit all come from the saved Door Pricing (edited in the Field app's
// Admin → Door Pricing). Product rules (window families, window counts by width, finishes, inserts) come from the
// shared door catalog. Unknown or unpriced configurations return null — never zero, never a guess.
import type { DoorEstimatorConfig } from "./types"
import { retailFromUnitCost } from "./pricing"
import { normalizeDoorSelection, doorVendorCost, UNPRICED_NOTES, MODELS, CONSTRUCTIONS, styleFor, sizeLabel, windowsLabel, type DoorSelection } from "./door-catalog.mjs"

export type ShopDoorQuote = {
  retailPrice: number | null
  reason: string | null
  note: string
  pricebookVersion: number
  removalIncluded: boolean
  selection: DoorSelection
}

/** Throws Error("...") with a safe message for options the door doesn't offer. */
export function quoteShopDoor(config: DoorEstimatorConfig, model: string, rawSelection: unknown): ShopDoorQuote {
  if (!MODELS[model]) throw new Error("Choose an available door.")
  const selection = normalizeDoorSelection(model, rawSelection)
  const cost = doorVendorCost(config, model, selection)
  const base = { pricebookVersion: config.version, removalIncluded: config.removalIncluded, selection }
  if (cost.unpriced !== undefined) return { ...base, retailPrice: null, reason: cost.unpriced, note: UNPRICED_NOTES[cost.unpriced] || "Price to confirm" }
  const { unitRetailPrice } = retailFromUnitCost(config, cost.unitVendorCost)
  if (!Number.isFinite(unitRetailPrice) || unitRetailPrice <= 0) return { ...base, retailPrice: null, reason: "not-priced", note: "Price to confirm" }
  return { ...base, retailPrice: unitRetailPrice, reason: null, note: "" }
}

/** Plain names for one configuration (customer-facing words only, no model numbers, no costs). Used by the
 *  Field app to write the estimate line for a door picked from the website shop. */
export function shopDoorDescription(model: string, selection: DoorSelection) {
  const m = MODELS[model], style = styleFor(model), c = CONSTRUCTIONS[m.construction as keyof typeof CONSTRUCTIONS]
  return {
    style: style?.name || "", construction: c?.label || "", size: sizeLabel(selection),
    width: selection.width, height: selection.height, color: selection.color?.name || "",
    windows: windowsLabel(selection), image: m.image,
  }
}
