"use client"

// The hybrid booking flow: ZIP check → door screening (with emergency
// routing) → arrival window → contact details → review → confirmation.
// Every dead end offers the phone. Submissions are REQUESTS — the office
// confirms by text or call before anything is final.
import { useEffect, useRef, useState } from "react"
import { BUSINESS, SCHEDULING } from "@/lib/tuneup/booking-config"
import { requiresCall, windowLabel, zipEligibility } from "@/lib/tuneup/booking"
import type { DayAvailability } from "@/lib/tuneup/booking-provider"
import { track, getAttribution } from "@/lib/tuneup/analytics"
import {
  ServiceAreaStep,
  DoorConditionStep,
  AppointmentWindowStep,
  ContactDetailsStep,
  BookingReviewStep,
  CallButton,
  StepHeading,
  FieldError,
  inputCls,
  primaryBtn,
  ghostBtn,
  type Screening,
  type Contact,
} from "./steps"

type Phase = "zip" | "area-review" | "screening" | "call-route" | "window" | "contact" | "review" | "done"

const PHASE_LABELS: Record<string, { n: number; label: string }> = {
  zip: { n: 1, label: "Service area" },
  screening: { n: 2, label: "Your door" },
  window: { n: 3, label: "Arrival window" },
  contact: { n: 4, label: "Your details" },
  review: { n: 5, label: "Review" },
}
const TOTAL_STEPS = 5

const emptyContact: Contact = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  serviceAddress: "",
  city: "",
  preferredContactMethod: "text",
  notes: "",
  consentAccepted: false,
  company: "",
}

const emptyScreening: Screening = { doorOperatingStatus: "", issueType: "", doorCount: "", specialConditions: [] }

export type ConfirmedBooking = {
  reference: string
  date: string
  window: string
  address: string
  contactMethod: string
}

export default function BookingFlow() {
  const [phase, setPhase] = useState<Phase>("zip")
  const [zip, setZip] = useState("")
  const [zipError, setZipError] = useState<string | undefined>()
  const [screening, setScreening] = useState<Screening>(emptyScreening)
  const [days, setDays] = useState<DayAvailability[] | null>(null)
  const [availabilityFailed, setAvailabilityFailed] = useState(false)
  const [timezoneLabel, setTimezoneLabel] = useState<string>(SCHEDULING.timezoneLabel)
  const [date, setDate] = useState("")
  const [window_, setWindow] = useState("")
  const [windowNotice, setWindowNotice] = useState<string | undefined>()
  const [contact, setContact] = useState<Contact>(emptyContact)
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>()
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!started.current) {
      started.current = true
      track("scheduler_started")
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

  function submitZip() {
    if (!/^\d{5}$/.test(zip)) {
      setZipError("Please enter a 5-digit ZIP code")
      return
    }
    setZipError(undefined)
    track("zip_submitted", { zip })
    if (zipEligibility(zip) === "eligible") {
      track("service_area_eligible")
      setPhase("screening")
    } else {
      track("service_area_ineligible")
      setPhase("area-review")
    }
  }

  function submitScreening() {
    if (requiresCall(screening)) {
      track("emergency_route_triggered", { reason: screening.specialConditions.join(",") || screening.doorOperatingStatus || screening.doorCount })
      setPhase("call-route")
      return
    }
    setPhase("window")
    void loadAvailability()
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

  function toReview() {
    // Light client-side pass; the server re-validates everything.
    const errors: Record<string, string> = {}
    if (contact.firstName.trim().length < 2) errors.firstName = "Please enter your first name"
    if (contact.lastName.trim().length < 2) errors.lastName = "Please enter your last name"
    if (contact.phone.replace(/\D/g, "").length < 10) errors.phone = "Please enter a valid 10-digit mobile number"
    if (contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim())) errors.email = "That email address doesn't look right"
    if (contact.serviceAddress.trim().length < 5) errors.serviceAddress = "Please enter the service address"
    if (contact.city.trim().length < 2) errors.city = "Please enter the city"
    if (!contact.consentAccepted) errors.consentAccepted = "Please check the acknowledgement box to continue"
    setContactErrors(errors)
    if (Object.keys(errors).length === 0) {
      setSubmitError(undefined)
      setPhase("review")
    }
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
          zipCode: zip,
          ...screening,
          requestedDate: date,
          requestedWindow: window_,
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
        address: `${contact.serviceAddress}, ${contact.city} ${zip}`,
        contactMethod: contact.preferredContactMethod === "phone" ? "phone call" : "text",
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
      {phase === "zip" && <ServiceAreaStep zip={zip} onZip={setZip} onSubmit={submitZip} error={zipError} />}
      {phase === "area-review" && <AreaReviewScreen zip={zip} onBack={() => setPhase("zip")} />}
      {phase === "screening" && (
        <DoorConditionStep value={screening} onChange={setScreening} onContinue={submitScreening} onBack={() => setPhase("zip")} />
      )}
      {phase === "call-route" && <CallRouteScreen zip={zip} screening={screening} onBack={() => setPhase("screening")} />}
      {phase === "window" && (
        <AppointmentWindowStep
          days={days}
          loadFailed={availabilityFailed}
          timezoneLabel={timezoneLabel}
          date={date}
          window={window_}
          onPick={pickWindow}
          onContinue={toContact}
          onBack={() => setPhase("screening")}
          onPhone={() => track("phone_click", { placement: "scheduler" })}
          notice={windowNotice}
        />
      )}
      {phase === "contact" && (
        <ContactDetailsStep value={contact} errors={contactErrors} onChange={setContact} onContinue={toReview} onBack={() => setPhase("window")} />
      )}
      {phase === "review" && (
        <BookingReviewStep
          contact={contact}
          screening={screening}
          zip={zip}
          date={date}
          window={window_}
          submitting={submitting}
          error={submitError}
          onSubmit={submitBooking}
          onBack={() => setPhase("contact")}
          onPhone={() => track("phone_click", { placement: "submit-error" })}
        />
      )}
      {phase === "done" && confirmed && <BookingConfirmation booking={confirmed} />}
    </div>
  )
}

// ---- Callback form shared by the call-route and area-review screens ----------

function CallbackForm({ zip, screening, heading }: { zip: string; screening?: Screening; heading: string }) {
  const [form, setForm] = useState({ firstName: "", phone: "", preferredContactMethod: "text" as "text" | "phone" })
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [error, setError] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (state === "sending") return
    setState("sending")
    setError("")
    try {
      const res = await fetch("/api/door-estimator/tuneup-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "callback",
          ...form,
          zipCode: zip,
          ...(screening ?? {}),
          ...getAttribution(),
          source: "tuneup-landing",
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? "We couldn't send that — please call us instead.")
        setState("error")
        return
      }
      setState("sent")
    } catch {
      setError("We couldn't send that — please call us instead.")
      setState("error")
    }
  }

  if (state === "sent") {
    return (
      <p role="status" className="rounded-xl border border-[#00FF47]/40 bg-[#00FF47]/10 px-4 py-3 text-sm font-semibold text-zinc-100">
        Got it — we&rsquo;ll reach out shortly. If it&rsquo;s urgent, call {BUSINESS.phoneNumber} now.
      </p>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm font-bold text-zinc-300">{heading}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          aria-label="First name"
          placeholder="First name"
          autoComplete="given-name"
          value={form.firstName}
          onChange={e => setForm({ ...form, firstName: e.target.value })}
          className={inputCls}
        />
        <input
          aria-label="Mobile phone"
          placeholder="Mobile phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          className={inputCls}
        />
      </div>
      {error && <FieldError id="cb-error" message={error} />}
      <button type="submit" disabled={state === "sending"} className={`${primaryBtn} !py-3 text-sm`}>
        {state === "sending" ? "Sending..." : "Request a Callback"}
      </button>
    </form>
  )
}

function CallRouteScreen({ zip, screening, onBack }: { zip: string; screening: Screening; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <StepHeading>Let&rsquo;s get you the right technician</StepHeading>
      <p className="text-zinc-300">
        This may require a different service appointment than the $129 tune-up. Call us so we can schedule the right
        technician and avoid delays.
      </p>
      <CallButton onPhone={() => track("phone_click", { placement: "call-route" })} />
      <CallbackForm zip={zip} screening={screening} heading="Prefer we contact you? Leave your info:" />
      <button type="button" onClick={onBack} className={ghostBtn}>Back to the questions</button>
    </div>
  )
}

function AreaReviewScreen({ zip, onBack }: { zip: string; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <StepHeading>You&rsquo;re a bit outside our usual routes</StepHeading>
      <p className="text-zinc-300">
        ZIP {zip} is outside the area we normally schedule online — but we may still be able to help. Call us, or leave
        your info and we&rsquo;ll check the route and get back to you.
      </p>
      <CallButton onPhone={() => track("phone_click", { placement: "area-review" })} />
      <CallbackForm zip={zip} heading="Ask us to review your address:" />
      <button type="button" onClick={onBack} className={ghostBtn}>Try a different ZIP</button>
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
  const [y, m, d] = booking.date.split("-").map(Number)
  const prettyDate = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
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
        {row("Requested date", prettyDate)}
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
