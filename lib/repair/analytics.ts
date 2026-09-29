"use client"

// Attribution + analytics for the repair landing pages. Rules:
//   - Only these allowlisted URL parameters are ever read; nothing else in the
//     query string is stored or rendered.
//   - Events carry NO name, phone, email or ZIP. The only identifier sent to an
//     analytics or ads tag is the lead reference (RR-XXXXX), as transaction_id,
//     so Google can de-duplicate a conversion that fires twice.
//   - The Google tag loads only when NEXT_PUBLIC_GOOGLE_ADS_ID is configured
//     (see components/repair/GoogleTag.tsx). Until then, events still go to
//     window.dataLayer and nothing leaves the page.

export type RepairAttribution = {
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
}

const KEY = "ss-repair-attribution"
const PARAMS: [keyof RepairAttribution, string][] = [
  ["gclid", "gclid"], ["gbraid", "gbraid"], ["wbraid", "wbraid"],
  ["utmSource", "utm_source"], ["utmMedium", "utm_medium"], ["utmCampaign", "utm_campaign"],
  ["utmTerm", "utm_term"], ["utmContent", "utm_content"],
]
const EMPTY: RepairAttribution = { gclid: null, gbraid: null, wbraid: null, utmSource: null, utmMedium: null, utmCampaign: null, utmTerm: null, utmContent: null }

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Read the ad click / UTM parameters once, keep them for the visit (sessionStorage). */
export function captureAttribution(): RepairAttribution {
  if (typeof window === "undefined") return EMPTY
  try {
    const q = new URLSearchParams(window.location.search)
    const fromUrl = { ...EMPTY }
    let any = false
    for (const [k, p] of PARAMS) {
      const v = q.get(p)
      if (v) { fromUrl[k] = v.slice(0, 200); any = true }
    }
    if (any) {
      sessionStorage.setItem(KEY, JSON.stringify(fromUrl))
      return fromUrl
    }
    const stored = sessionStorage.getItem(KEY)
    return stored ? { ...EMPTY, ...(JSON.parse(stored) as Partial<RepairAttribution>) } : EMPTY
  } catch {
    return EMPTY
  }
}

export function track(event: string, props: Record<string, string | number | boolean> = {}): void {
  if (typeof window === "undefined") return
  try {
    ;(window.dataLayer = window.dataLayer || []).push({ event, ...props } as Record<string, unknown>)
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * Fired ONLY after the server confirms the lead is saved. A storage failure
 * never reaches this line, so it can never count as a conversion.
 */
export function reportLeadConversion(reference: string): void {
  track("repair_request_success", { reference })
  const sendTo = process.env.NEXT_PUBLIC_ADS_REPAIR_LEAD_SEND_TO
  if (sendTo && typeof window.gtag === "function") {
    window.gtag("event", "conversion", { send_to: sendTo, transaction_id: reference })
  }
}
