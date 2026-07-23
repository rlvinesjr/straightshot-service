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

export function getBookingProvider(): BookingProvider {
  // env BOOKING_PROVIDER reserved for future adapters ("google", "jobber", ...).
  return new LocalMockProvider()
}
