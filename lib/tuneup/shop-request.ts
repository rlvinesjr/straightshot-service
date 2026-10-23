// Shop product requests from the website (openers, doors): see SHOP-BOOKING-STANDARD.md.
// The website builds a versioned request snapshot; this scheduler re-validates it, makes its customer and visit
// details match the booking it saves, re-checks door prices against the current Door Pricing, and stores it with the
// booking. The customer email (summary-email.ts) and the website's confirmation + PDF are rendered from what is stored.
import { timingSafeEqual } from "node:crypto"
import { validateSnapshot, type ShopRequestSnapshot } from "./summary-core.mjs"
import { SCHEDULING } from "./booking-config"
import type { BookingPayload } from "./booking"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { calculateDoorPrice } from "@/lib/door-estimator/pricing"
import type { DoorSelection } from "@/lib/door-estimator/types"

export class ShopRequestError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message)
  }
}

/** Only the website may submit shop snapshots (it is the server that prices them). Key: SHOP_BOOKING_KEY. */
export function shopKeyValid(request: Request): boolean {
  const supplied = Buffer.from(request.headers.get("x-shop-booking-key") || "")
  const configured = process.env.SHOP_BOOKING_KEY || ""
  if (!configured) return process.env.NODE_ENV !== "production" && supplied.toString() === "straightshot-dev"
  const expected = Buffer.from(configured)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export function validSubmissionId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9-]{16,80}$/.test(value.trim()) ? value.trim() : null
}

const pick = (s: ShopRequestSnapshot, id: string) => s.selections.find(x => x.id === id)?.value

/** The door calculator inputs the price was based on, checked against the customer-facing selections. */
function doorBasis(s: ShopRequestSnapshot): DoorSelection {
  const b = (s.price.basis || {}) as Record<string, unknown>
  const basis = {
    quantity: Number(b.quantity), width: Number(b.width), height: Number(b.height),
    constructionCode: String(b.constructionCode || ""), styleCode: String(b.styleCode || ""), colorCode: String(b.colorCode || ""),
    windowCode: String(b.windowCode || ""), openerCode: String(b.openerCode || ""),
  } as DoorSelection
  const windows = pick(s, "windows"), insert = pick(s, "insert")
  const expectedWindow = windows === "none" ? "none" : insert === "plain" ? "plain" : "decorative"
  if (basis.quantity !== 1 || pick(s, "size") !== `${basis.width}x${basis.height}` || pick(s, "color") !== basis.colorCode || basis.windowCode !== expectedWindow)
    throw new ShopRequestError("The door selections don't match the estimate. Please review your request again.", "price_changed", 409)
  return basis
}

/** Validates the website's snapshot for one booking. Throws ShopRequestError (safe message + code). */
export async function checkShopSnapshot(raw: unknown, data: BookingPayload): Promise<ShopRequestSnapshot> {
  let s: ShopRequestSnapshot
  try {
    s = validateSnapshot(raw)
  } catch (error) {
    throw new ShopRequestError(error instanceof Error ? error.message : "The request summary is not valid.", "invalid_snapshot", 400)
  }
  if (s.visit.date !== data.requestedDate || s.visit.windowId !== data.requestedWindow)
    throw new ShopRequestError("The request summary doesn't match the requested visit.", "invalid_snapshot", 400)
  if (s.kind === "door" && s.price.amountCents !== null) {
    const config = await loadDoorEstimatorConfig()
    let cents: number
    try {
      cents = calculateDoorPrice(config, doorBasis(s), "website").retailPrice * 100
    } catch (error) {
      if (error instanceof ShopRequestError) throw error
      throw new ShopRequestError("That door configuration is no longer priced online. Please review your request again.", "price_changed", 409)
    }
    if (cents !== s.price.amountCents) throw new ShopRequestError("The estimated price changed. Please review your request again.", "price_changed", 409)
  }
  // The saved booking is the source of truth for who and when: the summary shows exactly what was stored.
  const window = SCHEDULING.arrivalWindows.find(w => w.id === data.requestedWindow)
  return validateSnapshot({
    ...s,
    visit: { ...s.visit, date: data.requestedDate, windowId: data.requestedWindow, windowLabel: window?.label || s.visit.windowLabel },
    customer: {
      ...s.customer,
      name: [data.firstName, data.lastName].filter(Boolean).join(" "),
      email: data.email || "",
      phone: data.phone,
      street: data.serviceAddress,
      city: data.city,
      state: data.state || "",
      zip: data.zipCode,
      contactMethod: data.preferredContactMethod,
    },
  })
}

/** The snapshot as stored for one saved booking (reference + creation time filled in). */
export function finalizeSnapshot(s: ShopRequestSnapshot, reference: string, createdAt: Date): ShopRequestSnapshot {
  return validateSnapshot({ ...s, reference, createdAt: createdAt.toISOString() })
}
