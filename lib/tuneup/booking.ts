// Booking domain model for the $129 Tune-Up landing page: statuses, routing
// rules, sanitization, and full server-side validation of a booking request.
// Dependency-free by design (the repo hand-validates; no zod).
import { BUSINESS, SCHEDULING } from "./booking-config"

// A normal online submission starts as "requested" and stays unconfirmed
// until the office texts/calls the customer ("confirmed" is set manually).
export type BookingStatus =
  | "requested"
  | "pending_confirmation"
  | "confirmed"
  | "call_required"
  | "service_area_review"
  | "cancelled"

export const DOOR_COUNT_OPTIONS = [
  { id: "one", label: "One" },
  { id: "two-plus", label: "Two or more" },
] as const

export function zipEligibility(zip: string): "eligible" | "review" {
  const list = BUSINESS.serviceZipCodes
  if (list.length === 0) return "eligible" // no ZIP list configured — accept and verify by phone
  return list.includes(zip) ? "eligible" : "review"
}

// ---- sanitization -----------------------------------------------------

export function sanitizeText(value: unknown, max = 200): string {
  if (typeof value !== "string") return ""
  return value.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export function normalizePhone(value: unknown): string | null {
  const digits = sanitizeText(value, 30).replace(/\D/g, "")
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return null
}

export function formatPhone(digits: string): string {
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : digits
}

// ---- date / window rules ----------------------------------------------

function businessToday(): Date {
  // The VPS runs UTC; availability rules are in business-local time.
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: SCHEDULING.timezone }))
  now.setHours(0, 0, 0, 0)
  return now
}

export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function isSelectableDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const [y, m, d] = key.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false
  if ((SCHEDULING.closedWeekdays as readonly number[]).includes(date.getDay())) return false
  const today = businessToday()
  const min = new Date(today)
  min.setDate(min.getDate() + SCHEDULING.minLeadDays)
  const max = new Date(today)
  max.setDate(max.getDate() + SCHEDULING.maxDaysOut)
  return date >= min && date <= max
}

export function isKnownWindow(id: string): boolean {
  return SCHEDULING.arrivalWindows.some(w => w.id === id)
}

export function windowLabel(id: string | null): string {
  return SCHEDULING.arrivalWindows.find(w => w.id === id)?.label ?? id ?? "—"
}

// ---- request validation -------------------------------------------------

export type BookingPayload = {
  firstName: string
  lastName: string
  phone: string
  email: string | null
  preferredContactMethod: "text" | "phone"
  serviceAddress: string
  city: string
  state: string | null
  zipCode: string
  doorCount: string
  doorOperatingStatus: string
  issueType: string
  specialConditions: string
  notes: string | null
  requestedDate: string | null
  requestedWindow: string | null
  serviceAreaEligible: boolean
  status: BookingStatus
  source: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  gclid: string | null
  fbclid: string | null
  consentAccepted: boolean
}

export type ValidationResult =
  | { ok: true; data: BookingPayload }
  | { ok: false; errors: Record<string, string> }

const oneOf = (options: readonly { id: string }[], value: string) => options.some(o => o.id === value)

// Answers to "Is this for a residential garage door?" — the only screening
// question left in the low-friction flow. "commercial" never self-schedules.
export const RESIDENTIAL_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "not-sure", label: "I'm not sure" },
  { id: "commercial", label: "No, it is commercial" },
] as const

// Validates and normalizes a raw request body into a storable payload.
// `kind` controls how much is required:
//   "standard"  — full self-schedule request: name, phone, email, address,
//                 residential answer, door count, date + window
//   "callback"  — call_required / service_area_review lead (name + phone only)
export function validateBooking(raw: Record<string, unknown>, kind: "standard" | "callback"): ValidationResult {
  const errors: Record<string, string> = {}

  // "Full name" is a single field in the flow; split it for storage. The
  // callback form still sends firstName directly.
  let firstName = sanitizeText(raw.firstName, 60)
  let lastName = sanitizeText(raw.lastName, 60)
  const fullName = sanitizeText(raw.fullName, 120)
  if (fullName) {
    const parts = fullName.split(" ")
    firstName = parts[0]
    lastName = parts.slice(1).join(" ")
  }
  if (firstName.length < 2) errors.fullName = errors.firstName = "Please enter your full name"

  const phone = normalizePhone(raw.phone)
  if (!phone) errors.phone = "Please enter a valid 10-digit mobile number"

  const emailRaw = sanitizeText(raw.email, 120)
  let email: string | null = null
  if (emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailRaw)) email = emailRaw.toLowerCase()
  if (kind === "standard" && !email) errors.email = "Please enter a valid email address for your appointment details"
  else if (emailRaw && !email) errors.email = "That email address doesn't look right"

  const preferredContactMethod = raw.preferredContactMethod === "phone" ? "phone" : "text"

  // Complete service address: street, city, state, and ZIP are all required
  // for self-scheduled requests (browser autofill fills all four at once).
  const serviceAddress = sanitizeText(raw.serviceAddress, 200)
  const city = sanitizeText(raw.city, 80)
  const state = sanitizeText(raw.state, 20).toUpperCase()
  let zipCode = sanitizeText(raw.zipCode, 10)
  if (kind === "standard") {
    if (serviceAddress.length < 5) errors.serviceAddress = "Please enter the street address"
    if (city.length < 2) errors.city = "Please enter the city"
    if (!/^[A-Z]{2}$/.test(state)) errors.state = "Please enter the 2-letter state"
    if (!/^\d{5}$/.test(zipCode)) errors.zipCode = "Please enter the 5-digit ZIP code"
  }
  if (!/^\d{5}$/.test(zipCode)) zipCode = ""

  const residential = sanitizeText(raw.residential, 20)
  const doorCount = sanitizeText(raw.doorCount, 30)
  if (doorCount && !oneOf(DOOR_COUNT_OPTIONS, doorCount)) errors.doorCount = "Invalid selection"
  if (kind === "standard") {
    if (!oneOf(RESIDENTIAL_OPTIONS, residential)) errors.residential = "Please answer the residential question"
    else if (residential === "commercial") errors.routing = "This offer is currently available for residential garage doors only — please call us"
    if (!doorCount) errors.doorCount = "Please tell us how many doors need service"
  }
  const doorOperatingStatus =
    residential === "yes" ? "residential" : residential === "not-sure" ? "not-sure-if-residential" : sanitizeText(raw.doorOperatingStatus, 30) || ""
  const issueType = sanitizeText(raw.issueType, 30)
  const specialConditions: string[] = []

  const notes = sanitizeText(raw.notes, 500) || null

  let requestedDate: string | null = null
  let requestedWindow: string | null = null
  if (kind === "standard") {
    const date = sanitizeText(raw.requestedDate, 10)
    const window = sanitizeText(raw.requestedWindow, 20)
    if (!isSelectableDate(date)) errors.requestedDate = "Please pick an available date"
    else requestedDate = date
    if (!isKnownWindow(window)) errors.requestedWindow = "Please pick an arrival window"
    else requestedWindow = window
  }

  // Submitting the review screen (which states the no-payment and
  // confirmation policy) is the acknowledgement — no separate checkbox.
  const consentAccepted = raw.consentAccepted === true
  if (kind === "standard" && !consentAccepted) errors.consentAccepted = "Please confirm the service acknowledgements"

  const eligibility = zipEligibility(zipCode)
  const status: BookingStatus =
    kind === "callback"
      ? eligibility === "review" ? "service_area_review" : "call_required"
      : "requested"

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const attribution = (key: string) => sanitizeText(raw[key], 120) || null

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      phone: phone as string,
      email,
      preferredContactMethod,
      serviceAddress,
      city,
      state: state || null,
      zipCode,
      doorCount,
      doorOperatingStatus,
      issueType,
      specialConditions: specialConditions.join(","),
      notes,
      requestedDate,
      requestedWindow,
      serviceAreaEligible: eligibility === "eligible",
      status,
      source: attribution("source") ?? "tuneup-landing",
      utmSource: attribution("utmSource"),
      utmMedium: attribution("utmMedium"),
      utmCampaign: attribution("utmCampaign"),
      utmContent: attribution("utmContent"),
      gclid: attribution("gclid"),
      fbclid: attribution("fbclid"),
      consentAccepted,
    },
  }
}

// Short human-friendly reference like "TU-8K3F2" shown on the confirmation
// screen and in office alerts. Uniqueness is enforced by the DB column.
export function makeReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `TU-${out}`
}
