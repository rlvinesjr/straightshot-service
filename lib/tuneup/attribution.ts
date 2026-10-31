// Which ad a website booking came from. The website (service-app public/assets/attribution.js) records the most
// recent tagged visit and sends it frozen with the booking; these rules are the same, re-applied here so nothing
// invalid is ever stored. A bad value is dropped, never a reason to refuse the booking.
//
// Readable names for tracking labels come from the Field app (Admin -> Settings -> Ad names), so a new ad needs no
// code change; an unknown label shows as itself. Click IDs are never shown in emails or lists, only "on file".

const label = (v: unknown): string | null => {
  if (typeof v !== "string") return null
  const s = v.replace(/[\u0000-\u001f\u007f<>"`]/g, " ").replace(/\s+/g, " ").trim()
  return s.length && s.length <= 120 ? s : null
}
const pattern = (re: RegExp) => (v: unknown): string | null => (typeof v === "string" && re.test(v) ? v : null)
const id = pattern(/^\d{1,25}$/)
const click = pattern(/^[A-Za-z0-9_\-.~]{1,500}$/)
const placement = pattern(/^[A-Za-z0-9_\- ]{1,60}$/)
const site = pattern(/^[A-Za-z]{1,12}$/)

export const ATTRIBUTION_RULES = {
  utmSource: label, utmMedium: label, utmCampaign: label, utmContent: label, utmTerm: label,
  adCampaignId: id, adSetId: id, adId: id, adPlacement: placement, adSiteSource: site,
  fbclid: click, gclid: click, gbraid: click, wbraid: click,
} as const
export type AttributionField = keyof typeof ATTRIBUTION_RULES
export type Touch = Partial<Record<AttributionField, string>> & { at?: string }

export type BookingAttribution = Record<AttributionField, string | null> & {
  attributedAt: Date | null
  firstTouch: string | null // JSON of the first tagged visit, only when it differs from the most recent one
}

const validDate = (v: unknown): Date | null => {
  if (typeof v !== "string" || Number.isNaN(Date.parse(v))) return null
  const d = new Date(v)
  return d.getTime() - Date.now() < 864e5 ? d : null // a future time is not believable
}

function cleanTouch(raw: unknown): Touch | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const out: Touch = {}
  for (const [field, rule] of Object.entries(ATTRIBUTION_RULES)) {
    const v = rule(r[field])
    if (v) out[field as AttributionField] = v
  }
  if (!Object.keys(out).length) return null
  const at = validDate(r.at)
  if (at) out.at = at.toISOString()
  return out
}
const sameVisit = (a: Touch, b: Touch) => (Object.keys(ATTRIBUTION_RULES) as AttributionField[]).every(k => (a[k] ?? "") === (b[k] ?? ""))

/** The attribution columns for a new booking, from the submitted body. */
export function bookingAttribution(raw: Record<string, unknown>): BookingAttribution {
  const last = cleanTouch(raw) ?? {}
  const out = Object.fromEntries((Object.keys(ATTRIBUTION_RULES) as AttributionField[]).map(k => [k, last[k] ?? null])) as BookingAttribution
  const any = (Object.keys(ATTRIBUTION_RULES) as AttributionField[]).some(k => out[k])
  out.attributedAt = any ? validDate(raw.attributedAt) : null
  const first = any ? cleanTouch(raw.firstTouch) : null
  out.firstTouch = first && !sameVisit(first, last) ? JSON.stringify(first) : null
  return out
}

// ---- readable "Ad source"
export type AdLabels = { campaigns: Record<string, string>; ads: Record<string, string> }
export const DEFAULT_AD_LABELS: AdLabels = {
  campaigns: { "free-tuneup": "Original campaign", "free-tuneup-whiteboard": "Whiteboard campaign" },
  ads: {
    "video-4x5": "Original mascot video",
    "hook-b-noisy-door": "Mascot B — Noisy Door",
    "hook-c-yes-really": "Mascot C — Yes, Really",
    "whiteboard-a-tyler": "Whiteboard A — Tyler Homeowners",
    "whiteboard-b-noisy-door": "Whiteboard B — Noisy Door",
    "whiteboard-c-yes-really": "Whiteboard C — Yes, Really",
  },
}

const SITES: Record<string, string> = { fb: "Facebook", ig: "Instagram", msg: "Messenger", an: "Audience Network" }
const META_SOURCES = /^(facebook|fb|instagram|ig|meta)$/i

export type AdSourceInput = Partial<Record<AttributionField, string | null>> & { attributedAt?: Date | string | null }
export type AdSource = {
  recorded: boolean
  platform: string | null
  campaign: string | null
  ad: string | null
  placement: string | null
  at: string | null
}

export function adPlatform(a: AdSourceInput): string | null {
  const s = (a.adSiteSource ?? "").toLowerCase()
  if (s) return SITES[s] ?? s
  const p = a.adPlacement ?? ""
  if (/^facebook/i.test(p)) return "Facebook"
  if (/^instagram/i.test(p)) return "Instagram"
  if (/^messenger/i.test(p)) return "Messenger"
  if (/^(an|audience)/i.test(p)) return "Audience Network"
  const u = a.utmSource ?? ""
  if (META_SOURCES.test(u)) return /^(instagram|ig)$/i.test(u) ? "Instagram" : "Meta (Facebook or Instagram)"
  if (/^(google|adwords|gads)$/i.test(u)) return "Google"
  if (u) return u
  if (a.fbclid) return "Meta (Facebook or Instagram)"
  if (a.gclid || a.gbraid || a.wbraid) return "Google"
  return null
}

/** "Facebook_Mobile_Reels" -> "Reels", "Instagram_Explore_Grid_Home" -> "Explore Grid Home". */
export function adPlacementLabel(p: string | null | undefined): string | null {
  if (!p) return null
  const words = p.split(/[_\s]+/).filter(Boolean)
  const rest = words.filter((w, i) => !(i === 0 && /^(facebook|instagram|messenger|an|audience)$/i.test(w)) && !/^(mobile|desktop)$/i.test(w))
  const out = (rest.length ? rest : words).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
  return out || null
}

export function adSource(a: AdSourceInput, labels: AdLabels = DEFAULT_AD_LABELS): AdSource {
  const platform = adPlatform(a)
  const campaign = a.utmCampaign ? labels.campaigns[a.utmCampaign] ?? a.utmCampaign : null
  const ad = a.utmContent ? labels.ads[a.utmContent] ?? a.utmContent : null
  const placementLabel = adPlacementLabel(a.adPlacement)
  const at = a.attributedAt ? new Date(a.attributedAt).toISOString() : null
  const recorded = !!(platform || campaign || ad || placementLabel || a.adCampaignId || a.adSetId || a.adId)
  return { recorded, platform, campaign, ad, placement: placementLabel, at }
}

// Names from the Field app, cached; the email never waits long and never fails because of them.
let labelCache: { at: number; ttl: number; labels: AdLabels } | null = null
export async function fetchAdLabels(): Promise<AdLabels> {
  if (labelCache && Date.now() - labelCache.at < labelCache.ttl) return labelCache.labels
  const key = process.env.DOOR_ESTIMATOR_ADMIN_KEY
  const base = process.env.FIELDAPP_URL || "http://127.0.0.1:8745"
  let labels = DEFAULT_AD_LABELS, ttl = 60_000
  if (key) {
    try {
      const res = await fetch(`${base}/api/ad-labels`, { headers: { "X-Door-Estimator-Key": key }, signal: AbortSignal.timeout(3000), cache: "no-store" })
      if (res.ok) {
        const d = (await res.json()) as Partial<AdLabels>
        const map = (m: unknown) => (m && typeof m === "object" && !Array.isArray(m) ? Object.fromEntries(Object.entries(m as Record<string, unknown>).filter(([k, v]) => typeof v === "string" && k.length <= 120).map(([k, v]) => [k, String(v).slice(0, 120)])) : {})
        labels = { campaigns: map(d.campaigns), ads: map(d.ads) }
        ttl = 10 * 60_000
      }
    } catch { /* defaults */ }
  }
  labelCache = { at: Date.now(), ttl, labels }
  return labels
}
