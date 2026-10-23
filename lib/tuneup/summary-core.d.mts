// Types for summary-core.mjs (a generated copy of the website's shared shop request summary module).
export type ShopSelection = { id: string; label: string; value: string; display: string }
export type ShopRequestSnapshot = {
  schema: "straightshot.shop-request"
  version: 1
  reference: string | null
  createdAt: string | null
  status: { code: "requested"; label: string }
  kind: "opener" | "door"
  visitType: { id: "opener-installation" | "door-inspection"; label: string }
  product: { id: string; model: string; name: string; category: string; image: string; imageAlt: string; imageNote: string; quantity: number; includes: string; exclusions: string }
  selections: ShopSelection[]
  price: {
    amountCents: number | null
    currency: "USD"
    display: string
    tax: "included" | "not-stated"
    wording: string
    source: { name: string; version: number | null; calculatedAt: string }
    basis: Record<string, unknown> | null
  }
  visit: { date: string; windowId: string; windowLabel: string; timeZone: string; confirmation: "awaiting" }
  customer: { name: string; email: string; phone: string; street: string; city: string; state: string; zip: string; contactMethod: "text" | "phone"; notes: string }
  terms: { payment: string; nextSteps: string; contactPhone: string }
}
export const SNAPSHOT_SCHEMA: "straightshot.shop-request"
export const SNAPSHOT_VERSION: 1
export const STATUS: string
export const NO_PAYMENT: string
export const CONTACT: string
export const VISIT_TYPES: Record<string, string>
export function validateSnapshot(input: unknown): ShopRequestSnapshot
export function summaryFromBooking(b: { requestSnapshot?: string | null; notes?: string | null; [key: string]: unknown }): ShopRequestSnapshot | null
export function emailHTML(summary: unknown, assetBase?: string): string
export function cardHTML(summary: unknown, assetBase?: string): string
export function detailRows(summary: ShopRequestSnapshot): [string, string][]
export function money(cents: number | null | undefined): string
