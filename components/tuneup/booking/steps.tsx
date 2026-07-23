"use client"

// Individual steps of the tune-up booking flow. All state lives in
// BookingFlow; these components render one step each and report changes up.
import { useEffect, useRef } from "react"
import { BUSINESS } from "@/lib/tuneup/booking-config"
import {
  DOOR_OPERATING_OPTIONS,
  ISSUE_OPTIONS,
  DOOR_COUNT_OPTIONS,
  SPECIAL_CONDITION_OPTIONS,
  windowLabel,
} from "@/lib/tuneup/booking"
import type { DayAvailability } from "@/lib/tuneup/booking-provider"
import { PhoneIcon, CheckIcon } from "@/components/tuneup/landing/Sections"

export const inputCls =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-[16px] text-white placeholder-zinc-500 focus:border-[#00FF47] focus:outline-none min-h-[48px]"
export const primaryBtn =
  "min-h-[52px] w-full rounded-xl bg-[#00FF47] px-4 py-4 font-black uppercase text-black transition hover:bg-[#00e63f] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00FF47]"
export const ghostBtn =
  "min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 transition hover:text-white"
export const optionBtn = (selected: boolean) =>
  `w-full min-h-[48px] rounded-xl border px-4 py-3.5 text-left text-[15px] font-semibold transition ${
    selected ? "border-[#00FF47] bg-[#00FF47]/10 text-white" : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
  }`

export function CallButton({ label, onPhone }: { label?: string; onPhone?: () => void }) {
  return (
    <a
      href={BUSINESS.phoneHref}
      onClick={onPhone}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#00FF47] px-4 py-4 font-black uppercase text-black transition hover:bg-[#00e63f]"
    >
      <PhoneIcon /> {label ?? `Call ${BUSINESS.phoneNumber}`}
    </a>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-semibold text-red-400">
      {message}
    </p>
  )
}

// Moves focus to the step heading whenever the step mounts, so screen-reader
// and keyboard users land at the top of each new step.
export function StepHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div>
      <h3 ref={ref} tabIndex={-1} className="text-xl font-black text-white outline-none">
        {children}
      </h3>
      {sub && <p className="mt-1 text-sm text-zinc-400">{sub}</p>}
    </div>
  )
}

// ---- Step 1: service-area check -------------------------------------------

export function ServiceAreaStep(props: { zip: string; onZip: (v: string) => void; onSubmit: () => void; error?: string }) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        props.onSubmit()
      }}
      className="space-y-4"
    >
      <StepHeading sub="We'll make sure you're in our service area first.">Where is the garage door?</StepHeading>
      <div>
        <label htmlFor="ba-zip" className="mb-1.5 block text-sm font-bold text-zinc-300">
          ZIP code
        </label>
        <input
          id="ba-zip"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={props.zip}
          onChange={e => props.onZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className={inputCls}
          placeholder="75701"
          aria-describedby={props.error ? "ba-zip-error" : undefined}
          aria-invalid={props.error ? true : undefined}
        />
        <FieldError id="ba-zip-error" message={props.error} />
      </div>
      <button type="submit" className={primaryBtn}>
        Check My Area
      </button>
    </form>
  )
}

// ---- Step 2: door condition screening ---------------------------------------

export type Screening = {
  doorOperatingStatus: string
  issueType: string
  doorCount: string
  specialConditions: string[]
}

export function DoorConditionStep(props: {
  value: Screening
  onChange: (v: Screening) => void
  onContinue: () => void
  onBack: () => void
}) {
  const v = props.value
  const set = (patch: Partial<Screening>) => props.onChange({ ...v, ...patch })
  const toggleCondition = (id: string) => {
    let next: string[]
    if (id === "none") next = ["none"]
    else {
      next = v.specialConditions.filter(c => c !== "none")
      next = next.includes(id) ? next.filter(c => c !== id) : [...next, id]
    }
    set({ specialConditions: next })
  }
  const complete = v.doorOperatingStatus && v.issueType && v.doorCount && v.specialConditions.length > 0

  const group = (legend: string, options: readonly { id: string; label: string }[], selected: string, pick: (id: string) => void) => (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-zinc-300">{legend}</legend>
      <div className="space-y-2">
        {options.map(o => (
          <button key={o.id} type="button" onClick={() => pick(o.id)} className={optionBtn(selected === o.id)} aria-pressed={selected === o.id}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="space-y-6">
      <StepHeading sub="A few quick questions so we send the right technician.">Tell us about the door</StepHeading>
      {group("Is the garage door currently opening and closing?", DOOR_OPERATING_OPTIONS, v.doorOperatingStatus, id => set({ doorOperatingStatus: id }))}
      {group("What best describes the issue?", ISSUE_OPTIONS, v.issueType, id => set({ issueType: id }))}
      {group("How many garage doors need service?", DOOR_COUNT_OPTIONS, v.doorCount, id => set({ doorCount: id }))}
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-zinc-300">Do any of these apply? (select all that do)</legend>
        <div className="space-y-2">
          {SPECIAL_CONDITION_OPTIONS.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggleCondition(o.id)}
              className={optionBtn(v.specialConditions.includes(o.id))}
              aria-pressed={v.specialConditions.includes(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <button type="button" onClick={props.onContinue} disabled={!complete} className={primaryBtn}>
          Continue
        </button>
        <button type="button" onClick={props.onBack} className={ghostBtn}>
          Back
        </button>
      </div>
    </div>
  )
}

// ---- Step 3: appointment window ----------------------------------------------

export function AppointmentWindowStep(props: {
  days: DayAvailability[] | null // null = loading
  loadFailed: boolean
  timezoneLabel: string
  date: string
  window: string
  onPick: (date: string, window: string) => void
  onContinue: () => void
  onBack: () => void
  onPhone: () => void
  notice?: string
}) {
  const { days } = props
  const selectedDay = days?.find(d => d.date === props.date) ?? null

  if (props.loadFailed) {
    return (
      <div className="space-y-4">
        <StepHeading>Scheduling is having a moment</StepHeading>
        <p className="text-zinc-300">We couldn&rsquo;t load the appointment calendar. Call us and we&rsquo;ll find you a window right away.</p>
        <CallButton onPhone={props.onPhone} />
        <button type="button" onClick={props.onBack} className={ghostBtn}>Back</button>
      </div>
    )
  }
  if (days === null) {
    return (
      <div className="space-y-4" aria-busy="true">
        <StepHeading>Loading available windows&hellip;</StepHeading>
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }
  const openDays = days.filter(d => d.windows.some(w => w.available))
  if (openDays.length === 0) {
    return (
      <div className="space-y-4">
        <StepHeading>No open windows right now</StepHeading>
        <p className="text-zinc-300">
          Online windows for the next two weeks are spoken for. Call us — we can often fit tune-ups around scheduled jobs.
        </p>
        <CallButton onPhone={props.onPhone} />
        <button type="button" onClick={props.onBack} className={ghostBtn}>Back</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <StepHeading sub={`All times are ${props.timezoneLabel}. We arrive within the window you choose.`}>
        Choose an arrival window
      </StepHeading>
      {props.notice && (
        <p role="alert" className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
          {props.notice}
        </p>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-zinc-300">Date</legend>
        <div className="flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Available dates">
          {openDays.map(d => (
            <button
              key={d.date}
              type="button"
              role="option"
              aria-selected={props.date === d.date}
              onClick={() => props.onPick(d.date, "")}
              className={`min-h-[48px] shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                props.date === d.date ? "border-[#00FF47] bg-[#00FF47]/10 text-white" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {d.weekdayLabel}
            </button>
          ))}
        </div>
      </fieldset>
      {selectedDay && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-zinc-300">Arrival window</legend>
          <div className="space-y-2">
            {selectedDay.windows.map(w => (
              <button
                key={w.id}
                type="button"
                disabled={!w.available}
                onClick={() => props.onPick(selectedDay.date, w.id)}
                className={`${optionBtn(props.window === w.id)} disabled:cursor-not-allowed disabled:opacity-40`}
                aria-pressed={props.window === w.id}
              >
                {w.label}
                {!w.available && <span className="ml-2 text-xs font-bold uppercase text-zinc-500">Booked</span>}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="space-y-2">
        <button type="button" onClick={props.onContinue} disabled={!props.date || !props.window} className={primaryBtn}>
          Continue
        </button>
        <button type="button" onClick={props.onBack} className={ghostBtn}>Back</button>
      </div>
    </div>
  )
}

// ---- Step 4: contact details ----------------------------------------------------

export type Contact = {
  firstName: string
  lastName: string
  phone: string
  email: string
  serviceAddress: string
  city: string
  preferredContactMethod: "text" | "phone"
  notes: string
  consentAccepted: boolean
  company: string // honeypot — hidden from real users
}

export function ContactDetailsStep(props: {
  value: Contact
  errors: Record<string, string>
  onChange: (v: Contact) => void
  onContinue: () => void
  onBack: () => void
}) {
  const v = props.value
  const set = (patch: Partial<Contact>) => props.onChange({ ...v, ...patch })
  const field = (
    id: keyof Contact,
    label: string,
    opts: { type?: string; autoComplete?: string; inputMode?: "tel" | "email" | "text"; optional?: boolean; placeholder?: string } = {},
  ) => (
    <div>
      <label htmlFor={`ba-${id}`} className="mb-1.5 block text-sm font-bold text-zinc-300">
        {label}
        {opts.optional && <span className="ml-1 font-normal text-zinc-500">(optional)</span>}
      </label>
      <input
        id={`ba-${id}`}
        type={opts.type ?? "text"}
        autoComplete={opts.autoComplete}
        inputMode={opts.inputMode}
        placeholder={opts.placeholder}
        value={v[id] as string}
        onChange={e => set({ [id]: e.target.value } as Partial<Contact>)}
        className={inputCls}
        aria-describedby={props.errors[id] ? `ba-${id}-error` : undefined}
        aria-invalid={props.errors[id] ? true : undefined}
      />
      <FieldError id={`ba-${id}-error`} message={props.errors[id]} />
    </div>
  )

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        props.onContinue()
      }}
      className="space-y-4"
    >
      <StepHeading sub="So we can confirm your window and find the house.">Where do we send the technician?</StepHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("firstName", "First name", { autoComplete: "given-name" })}
        {field("lastName", "Last name", { autoComplete: "family-name" })}
      </div>
      {field("phone", "Mobile phone", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "(903) 555-0142" })}
      {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email", optional: true })}
      {field("serviceAddress", "Service address", { autoComplete: "street-address" })}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("city", "City", { autoComplete: "address-level2" })}
        <div>
          <span className="mb-1.5 block text-sm font-bold text-zinc-300">Best way to confirm</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Preferred contact method">
            {(["text", "phone"] as const).map(m => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={v.preferredContactMethod === m}
                onClick={() => set({ preferredContactMethod: m })}
                className={optionBtn(v.preferredContactMethod === m)}
              >
                {m === "text" ? "Text me" : "Call me"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="ba-notes" className="mb-1.5 block text-sm font-bold text-zinc-300">
          Anything we should know? <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="ba-notes"
          rows={2}
          value={v.notes}
          onChange={e => set({ notes: e.target.value })}
          className={inputCls}
          placeholder="Gate codes, dogs, which door, parking..."
        />
      </div>
      {/* Honeypot — invisible to people, tempting to bots. */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label htmlFor="ba-company">Company</label>
        <input id="ba-company" type="text" tabIndex={-1} autoComplete="off" value={v.company} onChange={e => set({ company: e.target.value })} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <input
          type="checkbox"
          checked={v.consentAccepted}
          onChange={e => set({ consentAccepted: e.target.checked })}
          className="mt-1 h-5 w-5 shrink-0 accent-[#00FF47]"
          aria-describedby={props.errors.consentAccepted ? "ba-consent-error" : undefined}
        />
        <span className="text-sm text-zinc-300">
          I&rsquo;m authorized to request service at this property. I understand the appointment isn&rsquo;t final until{" "}
          {BUSINESS.companyName} confirms it, and that any repairs beyond the $129 tune-up require my separate approval.
        </span>
      </label>
      <FieldError id="ba-consent-error" message={props.errors.consentAccepted} />
      <div className="space-y-2">
        <button type="submit" className={primaryBtn}>
          Review My Request
        </button>
        <button type="button" onClick={props.onBack} className={ghostBtn}>Back</button>
      </div>
    </form>
  )
}

// ---- Step 5: review ---------------------------------------------------------------

export function BookingReviewStep(props: {
  contact: Contact
  screening: Screening
  zip: string
  date: string
  window: string
  submitting: boolean
  error?: string
  onSubmit: () => void
  onBack: () => void
  onPhone: () => void
}) {
  const { contact, screening } = props
  const issue = ISSUE_OPTIONS.find(o => o.id === screening.issueType)?.label ?? "—"
  const prettyDate = (() => {
    const [y, m, d] = props.date.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  })()
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-b border-zinc-800 py-2.5 text-[15px] last:border-0">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="text-right font-semibold text-zinc-100">{value}</span>
    </div>
  )
  return (
    <div className="space-y-5">
      <StepHeading sub="Look it over — nothing is charged and nothing is final until we confirm.">Review your request</StepHeading>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2">
        {row("Service", "Garage Door Tune-Up + New Rollers")}
        {row("Price", `$${BUSINESS.promotionalPrice} — parts & labor for the listed service`)}
        {row("Date", prettyDate)}
        {row("Arrival window", windowLabel(props.window))}
        {row("Address", `${contact.serviceAddress}, ${contact.city} ${props.zip}`)}
        {row("Reported issue", issue)}
        {row("Contact", `${contact.firstName} ${contact.lastName} · ${contact.phone}`)}
        {row("Confirm by", contact.preferredContactMethod === "phone" ? "Phone call" : "Text")}
      </div>
      <ul className="space-y-1.5 text-sm text-zinc-400">
        <li className="flex gap-2"><CheckIcon className="h-4 w-4 mt-0.5" /> Covers one qualifying standard residential door; specialty parts and extra repairs are quoted separately for your approval.</li>
        <li className="flex gap-2"><CheckIcon className="h-4 w-4 mt-0.5" /> This is a request — we&rsquo;ll {contact.preferredContactMethod === "phone" ? "call" : "text"} to confirm before it&rsquo;s on the schedule.</li>
        <li className="flex gap-2"><CheckIcon className="h-4 w-4 mt-0.5" /> No payment now. You pay after the service is done.</li>
      </ul>
      {props.error && (
        <div role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          <p>{props.error}</p>
          <a href={BUSINESS.phoneHref} onClick={props.onPhone} className="mt-1 inline-block font-black text-white underline">
            Or call {BUSINESS.phoneNumber} and we&rsquo;ll book it for you
          </a>
        </div>
      )}
      <div className="space-y-2">
        <button type="button" onClick={props.onSubmit} disabled={props.submitting} className={primaryBtn} aria-busy={props.submitting}>
          {props.submitting ? "Sending your request..." : "Request My $129 Appointment"}
        </button>
        <button type="button" onClick={props.onBack} disabled={props.submitting} className={ghostBtn}>Back</button>
      </div>
    </div>
  )
}
