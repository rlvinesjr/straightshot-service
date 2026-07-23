"use client"

// Vendor-neutral analytics hooks for the tune-up landing page.
//
// Events are pushed to window.dataLayer (Google Tag Manager / gtag picks
// these up automatically once installed) AND dispatched as a DOM
// CustomEvent("tuneup-analytics") so any other vendor script can listen
// without code changes here. Nothing is sent anywhere by this module itself.
//
// Event names used by the page:
//   landing_page_view, primary_cta_click, phone_click, scheduler_started,
//   zip_submitted, service_area_eligible, service_area_ineligible,
//   emergency_route_triggered, appointment_window_selected,
//   booking_form_started, booking_request_submitted,
//   booking_request_success, booking_request_error

export type Attribution = {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  gclid: string | null
  fbclid: string | null
}

const STORAGE_KEY = "ss-tuneup-attribution"

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return
  const payload = { event, ...props }
  try {
    ;(window.dataLayer = window.dataLayer || []).push(payload)
    window.dispatchEvent(new CustomEvent("tuneup-analytics", { detail: payload }))
  } catch {
    /* analytics must never break the page */
  }
  if (process.env.NODE_ENV !== "production") console.log("[analytics]", payload)
}

// Captures UTM / click IDs from the landing URL once and keeps them for the
// session so they survive the multi-step flow and land on the booking record.
export function getAttribution(): Attribution {
  const empty: Attribution = { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, gclid: null, fbclid: null }
  if (typeof window === "undefined") return empty
  try {
    const params = new URLSearchParams(window.location.search)
    const fromUrl: Attribution = {
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      utmContent: params.get("utm_content"),
      gclid: params.get("gclid"),
      fbclid: params.get("fbclid"),
    }
    const hasAny = Object.values(fromUrl).some(Boolean)
    if (hasAny) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl))
      return fromUrl
    }
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? { ...empty, ...(JSON.parse(stored) as Attribution) } : empty
  } catch {
    return empty
  }
}
