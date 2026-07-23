// ---------------------------------------------------------------------------
// CENTRAL BUSINESS CONFIGURATION for the $129 Tune-Up landing page (/tuneup).
//
// Every business-specific claim on the landing page reads from this file so
// copy can be updated in one place. Rules:
//   - `null` means "not verified / not configured yet" — sections that depend
//     on a null value are HIDDEN rather than rendered with a made-up number.
//   - Do not enter a value here unless it is operationally true; everything
//     in this file is shown to customers and used in ad-landing copy.
// ---------------------------------------------------------------------------

export type ArrivalWindow = {
  id: string
  label: string // shown to the customer, e.g. "8:00 AM – 11:00 AM"
  startHour: number // 24h, local business time — used to hide past windows today
}

export const BUSINESS = {
  companyName: "StraightShot Overhead",
  phoneNumber: "(903) 245-1182",
  phoneHref: "tel:9032451182",
  smsHref: "sms:9032451182",
  websiteUrl: "https://straightshotoverhead.com",
  landingUrl: "https://estimate.straightshotoverhead.com/tuneup",
  serviceArea: "Tyler and the surrounding East Texas area",

  // Legal pages — null hides the footer link. NOTE: most ad platforms
  // (Google Ads especially) require a privacy policy on pages that collect
  // contact info; publish one and set the URL before running paid traffic.
  privacyPolicyUrl: null as string | null,
  termsUrl: null as string | null,

  // Optional trust claims — leave null until verified; null hides the claim.
  serviceZipCodes: [] as string[], // empty = accept any ZIP, record it, and verify by phone (no hard gating)
  businessAddress: null as string | null,
  yearsInBusiness: null as number | null,
  reviewRating: null as number | null, // e.g. 5.0 — only with a verified count
  reviewCount: null as number | null,
  licenseText: null as string | null, // e.g. "Licensed & insured — TX #000000"

  // The offer. Roller count/type are deliberately unset until the owner
  // finalizes them — copy renders the hedged "included standard rollers".
  promotionalPrice: 129,
  regularPrice: null as number | null, // set to show the savings section
  rollerQuantity: null as number | null, // e.g. 10 — renders "up to 10 new standard rollers"
  rollerType: "standard rollers",
  offerExpiration: null as string | null, // e.g. "August 31, 2026" — only when genuinely true
  promotionalAppointmentLimit: null as number | null, // e.g. 8 per week — only when genuinely enforced
  appointmentDurationMinutes: null as number | null,
  warrantyText: null as string | null, // e.g. "90-day workmanship warranty on the tune-up"
  taxDisclosure: null as string | null, // e.g. "Price includes sales tax." — omit tax language until decided
  serviceCallFeeDisclosure:
    "The $129 is one straightforward price for the tune-up visit — there is no separate trip or service-call fee for this offer.",
} as const

export const SCHEDULING = {
  timezoneLabel: "Central Time (your local time in East Texas)",
  timezone: "America/Chicago",
  arrivalWindows: [
    { id: "8-11", label: "8:00 AM – 11:00 AM", startHour: 8 },
    { id: "11-2", label: "11:00 AM – 2:00 PM", startHour: 11 },
    { id: "2-5", label: "2:00 PM – 5:00 PM", startHour: 14 },
  ] as ArrivalWindow[],
  // Mock-provider availability rules (see lib/tuneup/booking-provider.ts).
  // These do NOT sync with a real calendar — requests are confirmed by phone.
  minLeadDays: 1, // earliest selectable date is tomorrow
  maxDaysOut: 14,
  requestsPerWindow: 2, // a window disappears once this many open requests exist for it
  closedWeekdays: [0], // 0 = Sunday
} as const

// Real Google reviews (same ones published on the straightshotoverhead.com
// homepage). Replace or extend here — never ship invented reviews.
export type Testimonial = {
  text: string
  firstName: string
  lastName?: string
  city?: string
  source: string
  rating: number
}

export const TESTIMONIALS: Testimonial[] = [
  {
    text: "Excellent local business. Ricky is friendly and does great work. He installed a new garage door for me.",
    firstName: "Matthew",
    lastName: "Johnson",
    source: "Google",
    rating: 5,
  },
  {
    text: "Mr Vines is extremely knowledgeable and upfront about what will be done. Was never pushy. Very clean work and respectful of my property.",
    firstName: "Clint",
    lastName: "Beggs",
    source: "Google",
    rating: 5,
  },
  {
    text: "Very professional service. Great communication and we were happy with the results!",
    firstName: "Katie",
    lastName: "Cook",
    source: "Google",
    rating: 5,
  },
]

// Copy fragments that depend on the (possibly unset) roller config.
export function rollerPhrase(): string {
  const { rollerQuantity, rollerType } = BUSINESS
  return rollerQuantity ? `up to ${rollerQuantity} new ${rollerType}` : `new ${rollerType}`
}

export function savings(): number | null {
  return BUSINESS.regularPrice ? BUSINESS.regularPrice - BUSINESS.promotionalPrice : null
}
