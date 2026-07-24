"use client"

// The three-step booking flow: arrival window → your information →
// residential confirmation + review. Submissions are REQUESTS — the office
// confirms by text or call before anything is final. Every dead end offers
// the phone.
import { useEffect, useRef, useState } from "react"
import { BUSINESS, SCHEDULING } from "@/lib/tuneup/booking-config"
import { windowLabel } from "@/lib/tuneup/booking"
import type { DayAvailability } from "@/lib/tuneup/booking-provider"
import { track, getAttribution } from "@/lib/tuneup/analytics"
import {
  AppointmentWindowStep,
  ContactInfoStep,
  ConfirmStep,
  CallButton,
  prettyDay,
  type Contact,
  type ConfirmAnswers,
} from "./steps"

type Phase = "window" | "contact" | "confirm" | "done"

const PHASE_LABELS: Record<string, { n: number; label: string }> = {
  window: { n: 1, label: "Arrival window" },
  contact: { n: 2, label: "Your information" },
  confirm: { n: 3, label: "Confirm" },
}
const TOTAL_STEPS = 3

const emptyContact: Contact = { fullName: "", phone: "", email: "", serviceAddress: "", hp: "" }

export type ConfirmedBooking = {
  reference: string
  date: string
  window: string
  address: string
  contactMethod: string
}

export default function BookingFlow() {
  const [phase, setPhase] = useState<Phase>("window")
  const [days, setDays] = useState<DayAvailability[] | null>(null)
  const [availabilityFailed, setAvailabilityFailed] = useState(false)
  const [timezoneLabel, setTimezoneLabel] = useState<string>(SCHEDULING.timezoneLabel)
  const [date, setDate] = useState("")
  const [window_, setWindow] = useState("")
  const [windowNotice, setWindowNotice] = useState<string | undefined>()
  const [contact, setContact] = useState<Contact>(emptyContact)
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({})
  const [answers, setAnswers] = useState<ConfirmAnswers>({ residential: "", doorCount: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>()
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!started.current) {
      started.current = true
      track("scheduler_started")
      void loadAvailability()
    }
  }, [])

  async function loadAvailability() {
    setDays(null)
    setAvailabilityFailed(false)
    try {
      const res = await fetch("/api/door-estimator/tuneup-booking/availability")
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { days: DayAvailability[]; timezoneLabel: string }
      setDays(data.days)
      setTimezoneLabel(data.timezoneLabel)
      // Auto-select the first open date so the arrival windows are visible
      // immediately — users missed them when a date tap was required first.
      const open = data.days.filter(d => d.windows.some(w => w.available))
      setDate(current => (current && open.some(d => d.date === current) ? current : open[0]?.date ?? ""))
    } catch {
      setAvailabilityFailed(true)
    }
  }

  function pickWindow(d: string, w: string) {
    setDate(d)
    setWindow(w)
    if (w) track("appointment_window_selected", { date: d, window: w })
  }

  function toContact() {
    setWindowNotice(undefined)
    track("booking_form_started")
    setPhase("contact")
  }

  function changeTime() {
    setPhase("window")
  }

  function toConfirm() {
    // Light client-side pass; the server re-validates everything.
    const errors: Record<string, string> = {}
    if (contact.fullName.trim().length < 2) errors.fullName = "Please enter your full name"
    if (contact.phone.replace(/\D/g, "").length < 10) errors.phone = "Please enter a valid 10-digit mobile number"
    if (contact.serviceAddress.trim().length < 5) errors.serviceAddress = "Please enter the service address"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim())) errors.email = "Please enter a valid email address"
    setContactErrors(errors)
    if (Object.keys(errors).length === 0) {
      setSubmitError(undefined)
      setPhase("confirm")
    }
  }

  function updateAnswers(next: ConfirmAnswers) {
    if (next.residential === "commercial" && answers.residential !== "commercial") {
      track("emergency_route_triggered", { reason: "commercial" })
    }
    setAnswers(next)
  }

  async function submitBooking() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(undefined)
    track("booking_request_submitted")
    try {
      const res = await fetch("/api/door-estimator/tuneup-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "standard",
          ...contact,
          ...answers,
          requestedDate: date,
          requestedWindow: window_,
          consentAccepted: true, // the review screen states the no-payment + confirmation policy
          ...getAttribution(),
          source: "tuneup-landing",
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { reference?: string; error?: string; code?: string }
      if (res.status === 409 && data.code === "window_unavailable") {
        setWindowNotice("That arrival window just filled up — please choose another one.")
        setWindow("")
        setPhase("window")
        void loadAvailability()
        return
      }
      if (!res.ok || !data.reference) {
        track("booking_request_error", { status: res.status })
        setSubmitError(data.error ?? "Something went wrong sending your request.")
        return
      }
      track("booking_request_success", { reference: data.reference })
      setConfirmed({
        reference: data.reference,
        date,
        window: window_,
        address: contact.serviceAddress,
        contactMethod: "text or phone",
      })
      setPhase("done")
    } catch {
      track("booking_request_error", { status: "network" })
      setSubmitError("We couldn't reach the scheduler — check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const progress = PHASE_LABELS[phase]

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 md:p-7">
      {progress && (
        <p className="mb-5 text-xs font-bold uppercase tracking-widest text-zinc-500" aria-live="polite">
          Step {progress.n} of {TOTAL_STEPS} <span className="text-[#00FF47]">· {progress.label}</span>
        </p>
      )}
      {phase === "window" && (
        <AppointmentWindowStep
          days={days}
          loadFailed={availabilityFailed}
          timezoneLabel={timezoneLabel}
          date={date}
          window={window_}
          onPick={pickWindow}
          onContinue={toContact}
          onPhone={() => track("phone_click", { placement: "scheduler" })}
          notice={windowNotice}
        />
      )}
      {phase === "contact" && (
        <ContactInfoStep
          value={contact}
          errors={contactErrors}
          date={date}
          window={window_}
          onChange={setContact}
          onContinue={toConfirm}
          onChangeTime={changeTime}
        />
      )}
      {phase === "confirm" && (
        <ConfirmStep
          contact={contact}
          answers={answers}
          date={date}
          window={window_}
          submitting={submitting}
          error={submitError}
          onChangeAnswers={updateAnswers}
          onChangeTime={changeTime}
          onSubmit={submitBooking}
          onPhone={() => track("phone_click", { placement: "confirm" })}
        />
      )}
      {phase === "done" && confirmed && <BookingConfirmation booking={confirmed} />}
    </div>
  )
}

// ---- Confirmation ---------------------------------------------------------------

function icsHref(booking: ConfirmedBooking): string {
  const [y, m, d] = booking.date.split("-").map(Number)
  const startHour = SCHEDULING.arrivalWindows.find(w => w.id === booking.window)?.startHour ?? 8
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${y}${pad(m)}${pad(d)}T${pad(startHour)}0000`
  const end = `${y}${pad(m)}${pad(d)}T${pad(startHour + 3)}0000`
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StraightShot Overhead//TuneUp//EN",
    "BEGIN:VEVENT",
    `UID:${booking.reference}@straightshotoverhead.com`,
    `DTSTART;TZID=${SCHEDULING.timezone}:${stamp}`,
    `DTEND;TZID=${SCHEDULING.timezone}:${end}`,
    `SUMMARY:Tentative: $129 Garage Door Tune-Up (${booking.reference})`,
    `DESCRIPTION:Arrival window ${windowLabel(booking.window)}. Not final until ${BUSINESS.companyName} confirms by ${booking.contactMethod}. Questions: ${BUSINESS.phoneNumber}`,
    `LOCATION:${booking.address}`,
    "STATUS:TENTATIVE",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}

export function BookingConfirmation({ booking }: { booking: ConfirmedBooking }) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-b border-zinc-800 py-2.5 text-[15px] last:border-0">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="text-right font-semibold text-zinc-100">{value}</span>
    </div>
  )
  return (
    <div className="space-y-5" role="status">
      <div className="text-center">
        <svg viewBox="0 0 48 48" fill="none" className="mx-auto h-14 w-14" aria-hidden="true">
          <circle cx="24" cy="24" r="22" stroke="#00FF47" strokeWidth="3" />
          <path d="M15 24.5l6.2 6.2L33 18.5" stroke="#00FF47" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className="mt-3 text-2xl font-black text-white">Your appointment request has been received</h3>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2">
        {row("Reference", booking.reference)}
        {row("Requested date", prettyDay(booking.date))}
        {row("Arrival window", windowLabel(booking.window))}
        {row("Service address", booking.address)}
        {row("We'll confirm by", booking.contactMethod)}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
        <p className="font-bold text-white">What happens next</p>
        <p className="mt-1">
          We&rsquo;ll review your request and call or text you to confirm the appointment. Please do not consider the
          appointment final until you receive confirmation.
        </p>
        <p className="mt-2 text-zinc-400">
          Need urgent service, or something changed? Call{" "}
          <a href={BUSINESS.phoneHref} onClick={() => track("phone_click", { placement: "confirmation" })} className="font-bold text-[#00FF47]">
            {BUSINESS.phoneNumber}
          </a>{" "}
          and mention reference {booking.reference}.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <a
          href={icsHref(booking)}
          download={`${booking.reference}-tentative-tuneup.ics`}
          className="flex min-h-[48px] items-center justify-center rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-white transition hover:border-[#00FF47]"
        >
          Add to Calendar (tentative)
        </a>
        <CallButton label={`Call ${BUSINESS.phoneNumber}`} onPhone={() => track("phone_click", { placement: "confirmation" })} />
      </div>
    </div>
  )
}
