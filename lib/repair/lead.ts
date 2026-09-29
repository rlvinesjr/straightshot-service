// Server-side validation for repair requests from /lp/*. Pure — no database, no
// Next.js — so scripts/validate-repair-lead.ts can exercise every rule directly.
import { landingFor } from "./landing"

export type RepairLeadInput = {
  submissionId: string
  firstName: string
  lastName: string | null
  phone: string // 10 digits
  zipCode: string // 5 digits — recorded, NOT treated as proof of county
  residentialConfirmed: true
  notes: string | null // "what is the door doing?"
  email: string | null
  landingPath: string
  landingKeyword: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
}

export type RepairValidation =
  | { ok: true; data: RepairLeadInput }
  | { ok: false; errors: Record<string, string> }

const clean = (v: unknown, max: number): string =>
  String(v ?? "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)

const orNull = (s: string) => (s ? s : null)

// Click IDs are opaque tokens from Google; anything outside this charset is not one.
const clickId = (v: unknown): string | null => {
  const s = String(v ?? "").trim()
  return /^[A-Za-z0-9_\-.]{10,200}$/.test(s) ? s : null
}
// UTM values are free text chosen by whoever built the ad URL — keep them short and inert.
const utm = (v: unknown): string | null => orNull(clean(v, 120))

export function validateRepairLead(raw: Record<string, unknown>): RepairValidation {
  const errors: Record<string, string> = {}

  const submissionId = String(raw.submissionId ?? "").trim()
  if (!/^[A-Za-z0-9-]{16,64}$/.test(submissionId)) errors.form = "Please reload the page and try again"

  // One "name" box on the form: first word is the first name, the rest is kept as the last name.
  const name = clean(raw.name, 80)
  if (name.length < 2) errors.name = "Enter your name"
  const [first, ...rest] = name.split(" ")

  const digits = String(raw.phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) errors.phone = "Enter a 10-digit phone number"

  const zip = String(raw.zipCode ?? "").trim().slice(0, 10)
  if (!/^\d{5}(-\d{4})?$/.test(zip)) errors.zipCode = "Enter a 5-digit ZIP code"

  if (raw.residentialConfirmed !== true && raw.residentialConfirmed !== "on" && raw.residentialConfirmed !== "true") {
    errors.residentialConfirmed = "Please confirm this is a garage door at a home"
  }

  const notes = clean(raw.problem, 600)

  const email = clean(raw.email, 120)
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) errors.email = "That email doesn't look right — fix it or leave it blank"

  const landing = landingFor(String(raw.landing ?? ""))
  if (!landing) errors.form = "Please reload the page and try again"

  if (Object.keys(errors).length) return { ok: false, errors }

  return {
    ok: true,
    data: {
      submissionId,
      firstName: first,
      lastName: orNull(rest.join(" ")),
      phone: digits,
      zipCode: zip.slice(0, 5),
      residentialConfirmed: true,
      notes: orNull(notes),
      email: orNull(email.toLowerCase()),
      landingPath: `/lp/${landing!.slug}`,
      landingKeyword: landing!.keyword,
      utmSource: utm(raw.utmSource),
      utmMedium: utm(raw.utmMedium),
      utmCampaign: utm(raw.utmCampaign),
      utmTerm: utm(raw.utmTerm),
      utmContent: utm(raw.utmContent),
      gclid: clickId(raw.gclid),
      gbraid: clickId(raw.gbraid),
      wbraid: clickId(raw.wbraid),
    },
  }
}

/** Where the lead came from, in words — for the office email. No click IDs. */
export function describeSource(r: { gclid: string | null; gbraid: string | null; wbraid: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null }): string {
  const paid = !!(r.gclid || r.gbraid || r.wbraid)
  const parts = [
    paid ? "Google Ads click" : null,
    r.utmSource || r.utmMedium ? [r.utmSource, r.utmMedium].filter(Boolean).join(" / ") : null,
    r.utmCampaign ? `campaign "${r.utmCampaign}"` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : "Direct / unknown (no ad click recorded)"
}

export const formatPhone = (d: string) => (d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d)
