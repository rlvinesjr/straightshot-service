"use client"

// The repair request form. Contract with the visitor:
//   - "Request received" appears ONLY after the server says the lead is saved.
//   - A failure keeps every field exactly as typed, and "try again" re-sends the
//     SAME submission ID, so a retry can never create a second lead or email.
//   - Nothing here implies an appointment is booked.
import { useEffect, useRef, useState } from "react"
import { captureAttribution, reportLeadConversion, track, type RepairAttribution } from "@/lib/repair/analytics"

type Fields = { name: string; phone: string; zipCode: string; problem: string; email: string; residentialConfirmed: boolean }
const EMPTY: Fields = { name: "", phone: "", zipCode: "", problem: "", email: "", residentialConfirmed: false }

const newSubmissionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`

function clientErrors(f: Fields): Record<string, string> {
  const e: Record<string, string> = {}
  if (f.name.trim().length < 2) e.name = "Enter your name"
  const d = f.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  if (d.length !== 10) e.phone = "Enter a 10-digit phone number"
  if (!/^\d{5}$/.test(f.zipCode.trim())) e.zipCode = "Enter a 5-digit ZIP code"
  if (!f.residentialConfirmed) e.residentialConfirmed = "Please confirm this is a garage door at a home"
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.trim())) e.email = "That email doesn't look right — fix it or leave it blank"
  return e
}

export default function RepairForm({ landing, cta, clarification, phoneNumber, phoneHref }: {
  landing: string; cta: string; clarification: string; phoneNumber: string; phoneHref: string
}) {
  const [f, setF] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<"idle" | "sending" | "error" | "done">("idle")
  const [message, setMessage] = useState("")
  const [reference, setReference] = useState("")
  const submissionId = useRef<string>("")
  const attribution = useRef<RepairAttribution | null>(null)
  const started = useRef(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    attribution.current = captureAttribution()
    submissionId.current = newSubmissionId()
  }, [])

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    if (!started.current) { started.current = true; track("repair_form_started") }
    setF(prev => ({ ...prev, [k]: v }))
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n })
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state === "sending") return // double-tap guard (the submission ID is the real one)
    const found = clientErrors(f)
    setErrors(found)
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0]
      document.getElementById(`rr-${first}`)?.focus()
      return
    }
    setState("sending")
    setMessage("")
    const hp = (e.currentTarget.elements.namedItem("hp") as HTMLInputElement | null)?.value ?? ""
    try {
      const res = await fetch("/api/repair-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          hp,
          landing,
          submissionId: submissionId.current,
          ...(attribution.current ?? {}),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; error?: string; errors?: Record<string, string> }
      if (res.ok && body.ok && body.reference) {
        setReference(body.reference)
        setState("done")
        reportLeadConversion(body.reference)
        requestAnimationFrame(() => statusRef.current?.focus())
        return
      }
      if (res.status === 400 && body.errors) setErrors(body.errors)
      setMessage(body.error || "We couldn't send your request. Please try again.")
      setState("error")
      track("repair_request_error", { status: res.status })
    } catch {
      setMessage("Your connection dropped before we could confirm. Tap the button again — it won't create a duplicate.")
      setState("error")
      track("repair_request_error", { status: 0 })
    }
    requestAnimationFrame(() => statusRef.current?.focus())
  }

  if (state === "done") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="rounded-2xl border border-[#00FF47]/40 bg-zinc-900 p-6 outline-none">
        <p className="text-sm font-bold uppercase tracking-wider text-[#00FF47]">Request received</p>
        <h2 className="mt-2 text-2xl font-black text-white">Thanks, {f.name.trim().split(" ")[0]}.</h2>
        <p className="mt-3 text-zinc-300">
          We have your request (reference <strong className="text-white">{reference}</strong>). We will contact you at{" "}
          <strong className="text-white">{f.phone}</strong> to arrange an appointment.
        </p>
        <p className="mt-3 text-sm text-zinc-400">Nothing is booked yet — the visit is set when we talk.</p>
        <p className="mt-4 text-sm text-zinc-400">
          Need to add something? Call <a href={phoneHref} className="font-bold text-white underline">{phoneNumber}</a>.
        </p>
      </div>
    )
  }

  const field = "mt-1 block w-full rounded-xl border bg-zinc-950 px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#00FF47]"
  const border = (k: string) => (errors[k] ? "border-red-500" : "border-zinc-700")
  const err = (k: string) =>
    errors[k] ? <p id={`rr-${k}-error`} className="mt-1 text-sm text-red-400">{errors[k]}</p> : null
  const described = (k: string) => (errors[k] ? `rr-${k}-error` : undefined)

  return (
    <form onSubmit={submit} noValidate aria-labelledby="rr-form-title" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      <h2 id="rr-form-title" className="text-xl font-black uppercase tracking-tight text-white">Request repair</h2>
      <p className="mt-1 text-sm text-zinc-400">About a minute. Required fields are marked *.</p>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="rr-name" className="text-sm font-semibold text-zinc-200">Name *</label>
          <input id="rr-name" name="name" autoComplete="name" required value={f.name} maxLength={80}
            onChange={e => set("name", e.target.value)} aria-invalid={!!errors.name} aria-describedby={described("name")}
            className={`${field} ${border("name")}`} />
          {err("name")}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
          <div>
            <label htmlFor="rr-phone" className="text-sm font-semibold text-zinc-200">Phone *</label>
            <input id="rr-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={f.phone} maxLength={20}
              onChange={e => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby={described("phone")}
              className={`${field} ${border("phone")}`} />
            {err("phone")}
          </div>
          <div>
            <label htmlFor="rr-zipCode" className="text-sm font-semibold text-zinc-200">ZIP code *</label>
            <input id="rr-zipCode" name="zipCode" inputMode="numeric" autoComplete="postal-code" required value={f.zipCode} maxLength={5}
              onChange={e => set("zipCode", e.target.value.replace(/\D/g, ""))} aria-invalid={!!errors.zipCode} aria-describedby={described("zipCode")}
              className={`${field} ${border("zipCode")}`} />
            {err("zipCode")}
          </div>
        </div>
        <div>
          <label htmlFor="rr-problem" className="text-sm font-semibold text-zinc-200">What is the door doing? <span className="font-normal text-zinc-500">(optional)</span></label>
          <textarea id="rr-problem" name="problem" rows={3} maxLength={600} value={f.problem}
            placeholder="e.g. won't open, loud bang, cable hanging, opener clicking"
            onChange={e => set("problem", e.target.value)} className={`${field} ${border("problem")}`} />
        </div>
        <div>
          <label htmlFor="rr-email" className="text-sm font-semibold text-zinc-200">Email <span className="font-normal text-zinc-500">(optional)</span></label>
          <input id="rr-email" name="email" type="email" inputMode="email" autoComplete="email" value={f.email} maxLength={120}
            onChange={e => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={described("email")}
            className={`${field} ${border("email")}`} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="rr-residentialConfirmed" className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-zinc-200">
            <input id="rr-residentialConfirmed" name="residentialConfirmed" type="checkbox" checked={f.residentialConfirmed}
              onChange={e => set("residentialConfirmed", e.target.checked)} aria-invalid={!!errors.residentialConfirmed}
              aria-describedby={described("residentialConfirmed")}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#00FF47]" />
            <span>This is a garage door at a home (residential). *</span>
          </label>
          {err("residentialConfirmed")}
        </div>

        {/* honeypot — hidden from people and from screen readers */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="rr-hp">Leave this empty</label>
          <input id="rr-hp" name="hp" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
      </div>

      <div ref={statusRef} tabIndex={-1} role="alert" aria-live="assertive" className="outline-none">
        {state === "error" && message ? (
          <p className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p>
        ) : null}
      </div>

      <button type="submit" disabled={state === "sending"}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#00FF47] px-6 text-lg font-black uppercase tracking-wide text-black transition hover:bg-[#33ff6c] disabled:cursor-wait disabled:opacity-70">
        {state === "sending" ? "Sending…" : state === "error" ? "Try again" : cta}
      </button>
      <p className="mt-3 text-center text-sm text-zinc-400">{clarification}</p>
    </form>
  )
}
