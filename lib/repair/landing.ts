// ---------------------------------------------------------------------------
// Repair ad landing pages (/lp/<slug>).
//
// ALLOWLIST. Each ad group gets one entry, and the page renders ITS headline on
// the server. Nothing from the query string is ever rendered — matching an
// approved keyword is not the same as knowing what someone actually searched,
// and echoing ?q= into HTML is how landing pages get defaced.
//
// Adding a later ad group = add an entry here (and its route is generated).
// ---------------------------------------------------------------------------

export type RepairLanding = {
  slug: string
  keyword: string // the approved positive keyword this page answers
  adGroup: string // Google Ads ad-group name it is built for
  h1: string // must match the pinned headline 1
  metaTitle: string
  metaDescription: string
}

export const REPAIR_LANDINGS: Record<string, RepairLanding> = {
  "garage-door-repair": {
    slug: "garage-door-repair",
    keyword: "garage door repair",
    adGroup: "Garage Door Repair",
    h1: "Garage Door Repair",
    metaTitle: "Garage Door Repair in Smith County, TX | StraightShot Overhead",
    metaDescription:
      "Residential garage door repair in Smith County, Texas — springs, cables, rollers, tracks and openers. Tell us what your door is doing and request service.",
  },
}

export const landingFor = (slug: string): RepairLanding | null =>
  Object.prototype.hasOwnProperty.call(REPAIR_LANDINGS, slug) ? REPAIR_LANDINGS[slug] : null

// Everything on the page that states a fact about the business. Keep it true.
export const REPAIR_COPY = {
  localLabel: "Residential service in Smith County, Texas",
  heroBody:
    "Door stuck, noisy, or not opening? StraightShot Overhead repairs residential garage doors, springs, cables, rollers, tracks, and openers. Tell us what is happening and request service.",
  cta: "Request Repair",
  clarification: "Send a service request. We will contact you to arrange an appointment.",
  county: "Smith County",
  state: "Texas",
  // The owner is the business. Keep this factual — no claims we can't back up.
  ownerIntro:
    "StraightShot Overhead is owned and operated by Ricky Vines, a local garage door technician. Requests from this page go straight to Ricky.",
} as const

export const REPAIR_SCOPE = [
  {
    title: "Springs & cables",
    body: "Broken torsion springs, cables off the drum, and doors that are heavy or crooked because a spring or cable has failed.",
  },
  {
    title: "Rollers & tracks",
    body: "Worn, noisy or broken rollers, bent or misaligned tracks, and doors that have come off track.",
  },
  {
    title: "Opener diagnosis & repair",
    body: "Openers that hum, click, reverse or won't run — including logic boards, capacitors and remotes.",
  },
] as const

export const REPAIR_PROCESS = [
  { title: "Request service", body: "Tell us what your door is doing. It takes about a minute." },
  { title: "Arrange a visit", body: "We contact you by phone or text to set a time that works." },
  { title: "Inspect and discuss repair options", body: "We look at the door, explain what we find, and go over options before any work starts." },
] as const

// Real photos from StraightShot jobs, already published in the articles on
// straightshotoverhead.com. Captions describe only what the photo shows.
export const REPAIR_PHOTOS = [
  {
    src: "/lp/repair/opener-logic-board-diagnosis.jpg",
    width: 960, height: 540,
    alt: "Technician diagnosing a garage door opener logic board in Tyler, Texas",
    caption: "Diagnosing an opener logic board in Tyler.",
  },
  {
    src: "/lp/repair/burned-logic-board-solder-joints.jpg",
    width: 960, height: 540,
    alt: "Heat-scorched solder joints on a failed garage door opener circuit board",
    caption: "Heat-scorched solder joints on a failed opener board.",
  },
  {
    src: "/lp/repair/failed-opener-capacitor.jpg",
    width: 640, height: 640,
    alt: "Hole in the top of a failed garage door opener capacitor",
    caption: "A failed opener capacitor with a hole in its top.",
  },
  {
    src: "/lp/repair/testing-opener-capacitor.jpg",
    width: 720, height: 636,
    alt: "Meter reading 33.2 microfarads on an opener capacitor labeled 50 to 60",
    caption: "Testing the old capacitor: 33.2 µF, below its labeled 50–60 µF range.",
  },
] as const

export const REPAIR_FAQ = [
  {
    q: "Do you work on commercial doors?",
    a: "No. StraightShot Overhead repairs residential garage doors only — the doors on houses. The form asks you to confirm the door is at a home.",
  },
  {
    q: "What area do you serve?",
    a: "This page is for homes in Smith County, Texas. Some ZIP codes cross county lines, so we confirm the address with you before setting a visit.",
  },
  {
    q: "When can you come out?",
    a: "After you send a request we contact you to arrange a time. Sending the form does not book an appointment — the visit is set when we talk.",
  },
  {
    q: "What information do you need?",
    a: "Your name, phone number and ZIP code, and a short note on what the door is doing — for example: won't open, loud bang, cable hanging, off track, opener clicking. Photos can wait until we talk.",
  },
  {
    q: "Do you repair openers?",
    a: "Yes. We diagnose and repair openers, including logic boards, capacitors and remotes. If an opener isn't worth repairing, we'll tell you and go over replacement options.",
  },
] as const
