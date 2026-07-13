import type { DoorEstimatorConfig, DoorSelection, FinishTier, PriceBreakdown, PublicDoorCatalog } from "./types"

export const SUPPORTED_WIDTHS: DoorSelection["width"][] = [8, 9, 10, 12, 14, 15, 16, 17, 18]
export const SUPPORTED_HEIGHTS: DoorSelection["height"][] = [7, 8, 9]

export function getWidthGroup(width: DoorSelection["width"]): string {
  if (width >= 14 && width <= 16) return "14/15/16"
  if (width >= 17) return "17/18"
  return String(width)
}

export function roundRetailPrice(value: number, config: DoorEstimatorConfig): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid retail price")
  if (config.roundingMethod === "nearest_hundred_minus_one") return Math.max(0, Math.round(value / 100) * 100 - 1)
  if (config.roundingMethod === "up_hundred_minus_one") return Math.max(0, Math.ceil(value / 100) * 100 - 1)
  if (config.roundingMethod === "nearest_fifty_minus_one") return Math.max(0, Math.round(value / 50) * 50 - 1)
  return Math.round(value * 100) / 100
}

function windowQuantity(group: string, width: number): number {
  if (group === "short") return width <= 10 ? 4 : width === 12 ? 6 : 8
  return width <= 10 ? 2 : width === 12 ? 3 : 4
}

export function validateSelection(config: DoorEstimatorConfig, selection: DoorSelection, mode: "website" | "field") {
  if (!SUPPORTED_WIDTHS.includes(selection.width) || !SUPPORTED_HEIGHTS.includes(selection.height)) throw new Error("That size is unavailable")
  if (!Number.isInteger(selection.quantity) || selection.quantity < 1 || selection.quantity > 10) throw new Error("Quantity must be between 1 and 10")
  const construction = config.constructions.find(x => x.code === selection.constructionCode && x.active)
  const style = config.styles.find(x => x.code === selection.styleCode && x.active)
  const color = config.colors.find(x => x.code === selection.colorCode && x.active)
  const window = config.windows.find(x => x.code === selection.windowCode && x.active)
  const opener = config.openers.find(x => x.code === selection.openerCode && x.active)
  if (!construction || !style || !color || !window || !opener) throw new Error("One or more selections are unavailable")
  if (mode === "website" && (!style.websiteEnabled || !color.websiteEnabled || !window.websiteEnabled || !opener.websiteEnabled)) throw new Error("One or more selections are unavailable online")
  if (mode === "field" && (!style.fieldEnabled || !color.fieldEnabled || !window.fieldEnabled || !opener.fieldEnabled)) throw new Error("One or more selections are unavailable")
  if (!style.constructionCodes.includes(construction.code)) throw new Error("That style is unavailable with the selected construction")
  if (!style.finishTiers.includes(color.finishTier) || !construction.finishTiers.includes(color.finishTier)) throw new Error("That finish is unavailable")
  if (color.styleCodes && !color.styleCodes.includes(style.code)) throw new Error("That color is unavailable for this style")
  if (color.constructionCodes && !color.constructionCodes.includes(construction.code)) throw new Error("That color is unavailable for this construction")
  if (!window.groups.includes(style.windowGroup)) throw new Error("That window does not fit this style")
  if (window.constructionCodes && !window.constructionCodes.includes(construction.code)) throw new Error("That window is unavailable for this construction")
  if (opener.costsByHeight[selection.height] === undefined) throw new Error("That opener is unavailable for this height")
  const priceRow = config.priceRows.find(row => row.active && row.constructionCode === construction.code && row.finishTier === color.finishTier && row.widthGroup === getWidthGroup(selection.width) && row.height === selection.height)
  if (!priceRow) throw new Error("Pricing is unavailable for this configuration")
  return { construction, style, color, window, opener, priceRow }
}

export function calculateDoorPrice(config: DoorEstimatorConfig, selection: DoorSelection, mode: "website" | "field"): PriceBreakdown {
  const { style, window, opener, priceRow } = validateSelection(config, selection, mode)
  const doorVendorCost = priceRow.vendorCost
  const windowUnitCost = window.code === "none" ? 0 : window.costs[selection.constructionCode]?.[style.windowGroup] ?? 0
  const windowVendorCost = windowUnitCost * windowQuantity(style.windowGroup, selection.width)
  const openerVendorCost = opener.costsByHeight[selection.height] ?? 0
  const unitVendorCost = doorVendorCost + windowVendorCost + openerVendorCost
  const totalVendorCost = unitVendorCost * selection.quantity
  const unitRawRetailPrice = unitVendorCost * config.multiplier
  const unitRetailPrice = roundRetailPrice(unitRawRetailPrice, config)
  const retailPrice = unitRetailPrice * selection.quantity
  const grossProfit = retailPrice - totalVendorCost
  return { doorVendorCost, windowVendorCost, openerVendorCost, unitVendorCost, quantity: selection.quantity, totalVendorCost, rawRetailPrice: unitRawRetailPrice * selection.quantity, retailPrice, grossProfit, grossMargin: retailPrice ? grossProfit / retailPrice : 0, pricebookVersion: config.version, pricebookName: config.pricebookName, effectiveDate: config.effectiveDate }
}

export function sanitizeCatalog(config: DoorEstimatorConfig, mode: "website" | "field"): PublicDoorCatalog {
  const enabled = <T extends { active: boolean; websiteEnabled?: boolean; fieldEnabled?: boolean }>(item: T) => item.active && (mode === "website" ? item.websiteEnabled !== false : item.fieldEnabled !== false)
  // Never let internal distributor/part references reach a public catalog.
  const stripRef = <T extends { internalRef?: string }>(item: T) => { const clone = { ...item }; delete clone.internalRef; return clone }
  return {
    version: config.version,
    pricebookName: config.pricebookName,
    effectiveDate: config.effectiveDate,
    roundingMethod: config.roundingMethod,
    priceEnding: config.priceEnding,
    removalIncluded: config.removalIncluded,
    websiteDisclaimer: config.websiteDisclaimer,
    constructions: config.constructions.filter(x => x.active).map(stripRef),
    styles: config.styles.filter(enabled),
    colors: config.colors.filter(enabled),
    windows: config.windows.filter(enabled).map(x => ({ ...x, costs: {} })),
    openers: config.openers.filter(enabled).map(x => stripRef({ ...x, costsByHeight: {} })),
    widths: SUPPORTED_WIDTHS,
    heights: SUPPORTED_HEIGHTS,
  }
}

export function getFinishTierForSelection(config: DoorEstimatorConfig, colorCode: string): FinishTier {
  const color = config.colors.find(x => x.code === colorCode)
  if (!color) throw new Error("Color is unavailable")
  return color.finishTier
}
