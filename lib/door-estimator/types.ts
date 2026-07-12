export type EstimatorMode = "website" | "field"
export type ConstructionCode = "essential" | "comfort" | "premium"
export type FinishTier = "standard" | "wood" | "plank"
export type RoundingMethod =
  | "nearest_hundred_minus_one"
  | "up_hundred_minus_one"
  | "nearest_fifty_minus_one"
  | "none"

export type DoorStyle = {
  code: string
  publicName: string
  category: "Traditional" | "Carriage House" | "Modern"
  description: string
  imagePath: string
  imagePosition?: string
  constructionCodes: ConstructionCode[]
  finishTiers: FinishTier[]
  windowGroup: "short" | "long" | "carriage" | "contemporary"
  websiteEnabled: boolean
  fieldEnabled: boolean
  active: boolean
}

export type DoorConstruction = {
  code: ConstructionCode
  publicName: string
  eyebrow: string
  description: string
  specifications: string[]
  rValue: number | null
  finishTiers: FinishTier[]
  active: boolean
}

export type DoorColor = {
  code: string
  publicName: string
  swatch: string
  finishTier: FinishTier
  styleCodes?: string[]
  constructionCodes?: ConstructionCode[]
  websiteEnabled: boolean
  fieldEnabled: boolean
  active: boolean
}

export type WindowOption = {
  code: string
  publicName: string
  description: string
  groups: DoorStyle["windowGroup"][]
  constructionCodes?: ConstructionCode[]
  glazing: "none" | "plain" | "decorative" | "satin" | "tinted"
  costs: Partial<Record<ConstructionCode, Partial<Record<DoorStyle["windowGroup"], number>>>>
  websiteEnabled: boolean
  fieldEnabled: boolean
  active: boolean
}

export type OpenerOption = {
  code: string
  publicName: string
  description: string
  features: string[]
  costsByHeight: Partial<Record<7 | 8 | 9, number>>
  websiteEnabled: boolean
  fieldEnabled: boolean
  active: boolean
}

export type DoorPriceRow = {
  constructionCode: ConstructionCode
  finishTier: FinishTier
  widthGroup: string
  height: 7 | 8 | 9
  vendorCost: number
  active: boolean
}

export type DoorEstimatorConfig = {
  version: number
  pricebookName: string
  effectiveDate: string
  multiplier: number
  roundingMethod: RoundingMethod
  priceEnding: number
  removalIncluded: boolean
  websiteDisclaimer: string
  constructions: DoorConstruction[]
  styles: DoorStyle[]
  colors: DoorColor[]
  windows: WindowOption[]
  openers: OpenerOption[]
  priceRows: DoorPriceRow[]
}

export type DoorSelection = {
  quantity: number
  width: 8 | 9 | 10 | 12 | 14 | 15 | 16 | 17 | 18
  height: 7 | 8 | 9
  constructionCode: ConstructionCode
  styleCode: string
  colorCode: string
  windowCode: string
  openerCode: string
}

export type PriceBreakdown = {
  doorVendorCost: number
  windowVendorCost: number
  openerVendorCost: number
  unitVendorCost: number
  quantity: number
  totalVendorCost: number
  rawRetailPrice: number
  retailPrice: number
  grossProfit: number
  grossMargin: number
  pricebookVersion: number
  pricebookName: string
  effectiveDate: string
}

export type PublicDoorCatalog = Omit<DoorEstimatorConfig, "priceRows" | "multiplier"> & {
  widths: DoorSelection["width"][]
  heights: DoorSelection["height"][]
}
