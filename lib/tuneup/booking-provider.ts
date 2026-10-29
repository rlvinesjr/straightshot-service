// Booking-provider boundary for the tune-up scheduler.
//
// The landing page talks to a BookingProvider interface so availability can
// later come from a real calendar or field-service system (Google Calendar,
// Jobber, Housecall Pro, ServiceTitan, GoHighLevel, ...). To integrate one:
//   1. Implement BookingProvider (getAvailability + reserve).
//   2. Return it from getBookingProvider() based on env BOOKING_PROVIDER.
//   3. Keep reserve() side-effect free on failure — the API route persists
//      the request itself and treats reserve() as advisory.
//
// The default LocalMockProvider does NOT sync with any live calendar. It
// generates windows from SCHEDULING config and counts this app's own open
// requests per window so a window stops being offered once it fills up.
// Appointments are always confirmed by a human afterward, which is why the
// flow submits a *request*, never a guaranteed slot.
import { db } from "@/lib/db"
import { SCHEDULING } from "./booking-config"
import { dateKey, isSelectableDate } from "./booking"

export type DayAvailability = {
  date: string // YYYY-MM-DD
  weekdayLabel: string // "Fri, Jul 24"
  windows: { id: string; label: string; available: boolean }[]
}

export interface BookingProvider {
  /** Selectable days (already filtered to business rules) with per-window availability. */
  getAvailability(): Promise<DayAvailability[]>
  /** Best-effort hold. Returns false if the window filled since the customer picked it. */
  reserve(date: string, windowId: string): Promise<boolean>
}

const OPEN_STATUSES = ["requested", "pending_confirmation", "confirmed"]

class LocalMockProvider implements BookingProvider {
  async getAvailability(): Promise<DayAvailability[]> {
    const days: DayAvailability[] = []
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: SCHEDULING.timezone }))
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)

    const candidates: string[] = []
    for (let offset = 0; offset <= SCHEDULING.maxDaysOut; offset++) {
      const d = new Date(start)
      d.setDate(d.getDate() + offset)
      const key = dateKey(d)
      if (isSelectableDate(key)) candidates.push(key)
    }
    if (candidates.length === 0) return []

    const booked = await db.tuneUpBooking.groupBy({
      by: ["requestedDate", "requestedWindow"],
      where: { requestedDate: { in: candidates }, status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    })
    const counts = new Map(booked.map(b => [`${b.requestedDate}|${b.requestedWindow}`, b._count._all]))

    for (const key of candidates) {
      const [y, m, d] = key.split("-").map(Number)
      const date = new Date(y, m - 1, d)
      days.push({
        date: key,
        weekdayLabel: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        windows: SCHEDULING.arrivalWindows.map(w => ({
          id: w.id,
          label: w.label,
          available: (counts.get(`${key}|${w.id}`) ?? 0) < SCHEDULING.requestsPerWindow,
        })),
      })
    }
    return days
  }

  async reserve(date: string, windowId: string): Promise<boolean> {
    if (!isSelectableDate(date)) return false
    const open = await db.tuneUpBooking.count({
      where: { requestedDate: date, requestedWindow: windowId, status: { in: OPEN_STATUSES } },
    })
    return open < SCHEDULING.requestsPerWindow
  }
}

// ---- Field app dispatch-board integration ---------------------------------
//
// FieldAppProvider layers the StraightShot Field dispatch board on top of the
// local rules: a window is also unavailable when ANY scheduled job or tech
// time-off block overlaps it (one-crew rule, per the owner). Busy intervals
// come from the fieldapp's key-protected GET /api/booking-busy and are pure
// Central wall-clock minutes — both apps store local times, so the comparison
// is string/minute math with no Date()/UTC conversion.
//
// Fail-open by design: if the fieldapp is down or slow, availability degrades
// to the local rules and a warning is logged. A customer request is never
// blocked by an internal outage — the office confirms every request anyway.

export type BusyInterval = { date: string; startMin: number; endMin: number }

export const WINDOW_MINUTES = 180

export function windowOverlapsBusy(busy: BusyInterval[] | null, date: string, startHour: number): boolean {
  if (!busy) return false // feed unavailable — fail open
  const ws = startHour * 60
  const we = ws + WINDOW_MINUTES
  return busy.some(b => b.date === date && b.startMin < we && b.endMin > ws)
}

// Crew-aware feed (owner decision, Oct 29 2026): the field app also sends who takes jobs (crew), each
// tech's busy time, jobs nobody on the crew is assigned to, and days closed to online booking. A window
// stays open while at least one crew member is free after unassigned jobs and website requests that
// aren't jobs yet are counted. One crew member = exactly the old one-crew rule.
export type CrewFeed = {
  busy: BusyInterval[]
  crew?: number[]
  techBusy?: (BusyInterval & { tech: number })[]
  unassigned?: BusyInterval[]
  closed?: string[]
}

/** Is this window bookable? `pending` = website requests in this window not yet turned into jobs. */
export function windowOpen(feed: CrewFeed | null, date: string, startHour: number, pending = 0): boolean {
  if (!feed) return true // feed unavailable — fail open
  if (Array.isArray(feed.closed) && feed.closed.includes(date)) return false
  if (!Array.isArray(feed.crew) || feed.crew.length === 0) return !windowOverlapsBusy(feed.busy, date, startHour)
  const ws = startHour * 60
  const we = ws + WINDOW_MINUTES
  const overlaps = (b: BusyInterval) => b.date === date && b.startMin < we && b.endMin > ws
  const busyTechs = new Set((feed.techBusy || []).filter(overlaps).map(b => b.tech))
  const free = feed.crew.filter(t => !busyTechs.has(t)).length - (feed.unassigned || []).filter(overlaps).length - pending
  return free > 0
}

const BUSY_CACHE_MS = 60_000
const BUSY_NEGATIVE_CACHE_MS = 15_000
let busyCache: { at: number; busy: CrewFeed | null } | null = null

async function fetchBusyIntervals(): Promise<CrewFeed | null> {
  const now = Date.now()
  if (busyCache && now - busyCache.at < (busyCache.busy ? BUSY_CACHE_MS : BUSY_NEGATIVE_CACHE_MS)) {
    return busyCache.busy
  }
  const base = process.env.FIELDAPP_URL || "http://127.0.0.1:8745"
  const key = process.env.DOOR_ESTIMATOR_ADMIN_KEY
  if (!key) {
    console.warn("[booking-provider] DOOR_ESTIMATOR_ADMIN_KEY not set — dispatch busy feed disabled")
    busyCache = { at: now, busy: null }
    return null
  }
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: SCHEDULING.timezone }))
  const from = dateKey(today)
  const end = new Date(today)
  end.setDate(end.getDate() + SCHEDULING.maxDaysOut)
  const to = dateKey(end)
  try {
    const res = await fetch(`${base}/api/booking-busy?from=${from}&to=${to}`, {
      headers: { "X-Door-Estimator-Key": key },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Partial<CrewFeed>
    const busy: CrewFeed = {
      busy: Array.isArray(data.busy) ? data.busy : [],
      ...(Array.isArray(data.crew) ? { crew: data.crew, techBusy: data.techBusy || [], unassigned: data.unassigned || [], closed: data.closed || [] } : {}),
      ...(Array.isArray(data.closed) ? { closed: data.closed } : {}),
    }
    busyCache = { at: now, busy }
    return busy
  } catch (error) {
    console.warn("[booking-provider] fieldapp busy feed unavailable — failing open:", error instanceof Error ? error.message : error)
    busyCache = { at: now, busy: null }
    return null
  }
}

// website requests waiting to become jobs (a confirmed request is a job on the board already)
const PENDING_STATUSES = ["requested", "pending_confirmation"]
async function pendingCounts(dates: string[]): Promise<Map<string, number>> {
  if (!dates.length) return new Map()
  const rows = await db.tuneUpBooking.groupBy({
    by: ["requestedDate", "requestedWindow"],
    where: { requestedDate: { in: dates }, status: { in: PENDING_STATUSES } },
    _count: { _all: true },
  })
  return new Map(rows.map(r => [`${r.requestedDate}|${r.requestedWindow}`, r._count._all]))
}
const crewMode = (feed: CrewFeed | null) => !!feed && Array.isArray(feed.crew) && feed.crew.length > 0

class FieldAppProvider extends LocalMockProvider {
  async getAvailability(): Promise<DayAvailability[]> {
    const [days, busy] = await Promise.all([super.getAvailability(), fetchBusyIntervals()])
    const pending = crewMode(busy) ? await pendingCounts(days.map(d => d.date)) : new Map<string, number>()
    for (const day of days) {
      for (const w of day.windows) {
        const startHour = SCHEDULING.arrivalWindows.find(x => x.id === w.id)?.startHour ?? 0
        if (crewMode(busy)) w.available = windowOpen(busy, day.date, startHour, pending.get(`${day.date}|${w.id}`) ?? 0)
        else if (w.available && !windowOpen(busy, day.date, startHour)) w.available = false
      }
    }
    return days
  }

  async reserve(date: string, windowId: string): Promise<boolean> {
    const startHour = SCHEDULING.arrivalWindows.find(x => x.id === windowId)?.startHour
    if (startHour === undefined) return false
    const busy = await fetchBusyIntervals()
    if (crewMode(busy)) {
      if (!isSelectableDate(date)) return false
      return windowOpen(busy, date, startHour, (await pendingCounts([date])).get(`${date}|${windowId}`) ?? 0)
    }
    if (!(await super.reserve(date, windowId))) return false
    return windowOpen(busy, date, startHour)
  }
}

export function getBookingProvider(): BookingProvider {
  // BOOKING_PROVIDER=fieldapp overlays dispatch-board conflicts; anything else
  // (or unset) uses the local mock rules only. Future adapters: google, jobber...
  return process.env.BOOKING_PROVIDER === "fieldapp" ? new FieldAppProvider() : new LocalMockProvider()
}
