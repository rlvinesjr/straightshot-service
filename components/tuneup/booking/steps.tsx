"use client"

// Steps of the low-friction tune-up booking flow:
//   1. Choose an arrival window
//   2. Your information (name, phone, address, email — one screen)
//   3. Residential confirmation + compact review → "Request My Appointment"
// All state lives in BookingFlow; these components render one step each.
import { useEffect, useRef } from "react"
import { BUSINESS } from "@/lib/tuneup/booking-config"
import { DOOR_COUNT_OPTIONS, RESIDENTIAL_OPTIONS, windowLabel } from "@/lib/tuneup/booking"
import type { DayAvailability } from "@/lib/tuneup/booking-provider"
import { PhoneIcon } from "@/components/tuneup/landing/Sections"

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

export function prettyDay(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

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
// and keyboard users land at the top of each new step. preventScroll matters:
// without it, step 1 grabbing focus on page load scrolls the whole page down
// to the scheduler instead of loading at the top.
export function StepHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
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

// Reassures the customer their window selection was saved (shown on steps 2 & 3).
export function SelectedWindowBanner({ date, window: windowId, onChange }: { date: string; window: string; onChange: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#00FF47]/40 bg-[#00FF47]/5 px-4 py-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Your selected arrival window</p>
        <p className="mt-0.5 font-bold text-white">
          {prettyDay(date)} · {windowLabel(windowId)}
        </p>
      </div>
      <button type="button" onClick={onChange} className="shrink-0 text-sm font-bold text-[#00FF47] underline-offset-2 hover:underline">
        Change time
      </button>
    </div>
  )
}

// ---- Step 1: arrival window --------------------------------------------------

export function AppointmentWindowStep(props: {
  days: DayAvailability[] | null // null = loading
  loadFailed: boolean
  timezoneLabel: string
  date: string
  window: string
  onPick: (date: string, window: string) => void
  onContinue: () => void
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
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-bold text-zinc-300">Date</legend>
        {/* Wrapping grid, not a horizontal scroller — fieldsets refuse to
            shrink below their content, so a scroll strip bleeds off-screen. */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="listbox" aria-label="Available dates">
          {openDays.map(d => (
            <button
              key={d.date}
              type="button"
              role="option"
              aria-selected={props.date === d.date}
              onClick={() => props.onPick(d.date, "")}
              className={`min-h-[48px] rounded-xl border px-1 py-2.5 text-center text-sm font-bold transition ${
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
      <button type="button" onClick={props.onContinue} disabled={!props.date || !props.window} className={primaryBtn}>
        Continue
      </button>
    </div>
  )
}

// ---- Step 2: your information (one screen, no splitting) ----------------------

export type Contact = {
  fullName: string
  phone: string
  email: string
  serviceAddress: string
  hp: string // honeypot — hidden from real users; name/label deliberately meaningless so browser autofill never touches it
}

export function ContactInfoStep(props: {
  value: Contact
  errors: Record<string, string>
  date: string
  window: string
  onChange: (v: Contact) => void
  onContinue: () => void
  onChangeTime: () => void
}) {
  const v = props.value
  const set = (patch: Partial<Contact>) => props.onChange({ ...v, ...patch })
  const field = (
    id: keyof Contact,
    label: string,
    opts: { type?: string; autoComplete?: string; inputMode?: "tel" | "email" | "text"; placeholder?: string; hint?: string } = {},
  ) => (
    <div>
      <label htmlFor={`ba-${id}`} className="mb-1.5 block text-sm font-bold text-zinc-300">
        {label}
      </label>
      <input
        id={`ba-${id}`}
        type={opts.type ?? "text"}
        autoComplete={opts.autoComplete}
        inputMode={opts.inputMode}
        placeholder={opts.placeholder}
        value={v[id]}
        onChange={e => set({ [id]: e.target.value } as Partial<Contact>)}
        className={inputCls}
        aria-describedby={props.errors[id] ? `ba-${id}-error` : opts.hint ? `ba-${id}-hint` : undefined}
        aria-invalid={props.errors[id] ? true : undefined}
      />
      {opts.hint && (
        <p id={`ba-${id}-hint`} className="mt-1.5 text-sm text-zinc-500">
          {opts.hint}
        </p>
      )}
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
      <SelectedWindowBanner date={props.date} window={props.window} onChange={props.onChangeTime} />
      <StepHeading>Where should we provide service?</StepHeading>
      {field("fullName", "Full name", { autoComplete: "name" })}
      {field("phone", "Mobile phone number", {
        type: "tel",
        autoComplete: "tel",
        inputMode: "tel",
        placeholder: "(903) 555-0142",
        hint: "We’ll use this number to confirm your appointment and let you know when we’re on the way.",
      })}
      {field("serviceAddress", "Service address", {
        autoComplete: "street-address",
        placeholder: "123 Example Street, Tyler, TX 75701",
      })}
      {field("email", "Email address", {
        type: "email",
        autoComplete: "email",
        inputMode: "email",
        hint: "For appointment details and your service receipt.",
      })}
      {/* Honeypot — invisible to people, tempting to bots. The id/label must
          never resemble a real field ("Company" got autofilled by Chrome and
          silently swallowed real customers). */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label htmlFor="ba-hp-check">Leave this field empty</label>
        <input id="ba-hp-check" type="text" tabIndex={-1} autoComplete="off" value={v.hp} onChange={e => set({ hp: e.target.value })} />
      </div>
      <button type="submit" className={primaryBtn}>
        Continue
      </button>
    </form>
  )
}

// ---- Step 3: residential confirmation + compact review -------------------------

export type ConfirmAnswers = {
  residential: string
  doorCount: string
}

export function ConfirmStep(props: {
  contact: Contact
  answers: ConfirmAnswers
  date: string
  window: string
  submitting: boolean
  error?: string
  onChangeAnswers: (v: ConfirmAnswers) => void
  onChangeTime: () => void
  onSubmit: () => void
  onPhone: () => void
}) {
  const { answers } = props
  const set = (patch: Partial<ConfirmAnswers>) => props.onChangeAnswers({ ...answers, ...patch })
  const commercial = answers.residential === "commercial"
  const ready = answers.residential !== "" && !commercial && answers.doorCount !== ""

  const row = (label: string, value: string) => (
    <div className="border-b border-zinc-800 py-2.5 text-[15px] last:border-0">
      <p className="text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-100">{value}</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <SelectedWindowBanner date={props.date} window={props.window} onChange={props.onChangeTime} />
      <StepHeading>One last thing</StepHeading>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-zinc-300">Is this for a residential garage door?</legend>
        <div className="space-y-2">
          {RESIDENTIAL_OPTIONS.map(o => (
            <button key={o.id} type="button" onClick={() => set({ residential: o.id })} className={optionBtn(answers.residential === o.id)} aria-pressed={answers.residential === o.id}>
              {o.label}
            </button>
          ))}
        </div>
        {commercial && (
          <div className="mt-3 space-y-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
            <p role="alert" className="text-sm font-semibold text-amber-200">
              This offer is currently available for residential garage doors only. Please call us if you would like help
              determining whether we can service your door.
            </p>
            <CallButton onPhone={props.onPhone} />
          </div>
        )}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-zinc-300">How many garage doors would you like us to service?</legend>
        <div className="grid grid-cols-2 gap-2">
          {DOOR_COUNT_OPTIONS.map(o => (
            <button key={o.id} type="button" onClick={() => set({ doorCount: o.id })} className={optionBtn(answers.doorCount === o.id)} aria-pressed={answers.doorCount === o.id}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          The ${BUSINESS.promotionalPrice} offer covers one qualifying residential garage door. We can service additional
          doors for ${BUSINESS.promotionalPrice} per door.
        </p>
      </fieldset>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2">
        {row("Appointment window", `${prettyDay(props.date)} · ${windowLabel(props.window)}`)}
        {row("Service address", props.contact.serviceAddress)}
        {row("Service", `$${BUSINESS.promotionalPrice} Garage Door Tune-Up with Roller Replacement${answers.doorCount === "two-plus" ? ` — $${BUSINESS.promotionalPrice} per door` : ""}`)}
      </div>
      <p className="text-sm text-zinc-400">
        No payment is required today. We&rsquo;ll contact you by text or phone to confirm the appointment before it is
        final.
      </p>
      {props.error && (
        <div role="alert" className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          <p>{props.error}</p>
          <a href={BUSINESS.phoneHref} onClick={props.onPhone} className="mt-1 inline-block font-black text-white underline">
            Or call {BUSINESS.phoneNumber} and we&rsquo;ll book it for you
          </a>
        </div>
      )}
      <button type="button" onClick={props.onSubmit} disabled={!ready || props.submitting} className={primaryBtn} aria-busy={props.submitting}>
        {props.submitting ? "Sending your request..." : "Request My Appointment"}
      </button>
    </div>
  )
}
