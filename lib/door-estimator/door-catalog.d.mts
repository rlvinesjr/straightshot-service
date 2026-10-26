// Types for door-catalog.mjs (a generated copy of the website's public/assets/door-catalog.js).
export type DoorColor = { name: string; code: string; swatch: string; finish: "standard" | "wood" | "oak" | null; note: string | null }
export type DoorInsert = { code: string; name: string; label: string; image?: string }
export type DoorConstructionKey = "non" | "vinyl" | "steel"
export type DoorConstruction = { key: DoorConstructionKey; code: "essential" | "comfort" | "premium"; slug: string; label: string; short: string; gauge: string; rating: string | null }
export type DoorStyle = { key: string; slug: string; styleCode: string; name: string; windowFamily: "short" | "long" | "carriage" | null; windowCount: Record<number, number> | null; inserts: DoorInsert[]; quoteWindows: boolean }
export type DoorModel = { model: string; styleKey: string; construction: DoorConstructionKey; brochure: string; image: string; colors: DoorColor[]; inserts: DoorInsert[]; example: string }
export type DoorSelection = {
  model: string
  unknownSize: boolean
  width: number | null
  height: number | null
  sizeState: "selected" | "unknown" | "partial" | "none"
  color: DoorColor
  windows: boolean
  insert: DoorInsert | null
  quoteWindows: boolean
}
export type PriceBookLike = {
  priceRows?: { active: boolean; constructionCode: string; finishTier: string; widthGroup: string; height: number; vendorCost: number }[]
  windows?: { code: string; active?: boolean; costs?: Record<string, Record<string, number | undefined> | undefined>; woodCosts?: Record<string, Record<string, number | undefined> | undefined> }[]
}
export const CATALOG_VERSION: string
export const WIDTHS: number[]
export const HEIGHTS: number[]
export const CONSTRUCTIONS: Record<DoorConstructionKey, DoorConstruction>
export const STYLES: DoorStyle[]
export const MODELS: Record<string, DoorModel>
export const UNPRICED_NOTES: Record<string, string>
export function styleFor(model: string): DoorStyle | undefined
export function normalizeDoorSelection(model: string, raw: unknown): DoorSelection
export function sizeLabel(sel: DoorSelection): string
export function windowsLabel(sel: DoorSelection): string
export function doorVendorCost(priceBook: PriceBookLike, model: string, sel: DoorSelection): { unitVendorCost: number; windowCount: number; unpriced?: undefined } | { unpriced: string; unitVendorCost?: undefined }
