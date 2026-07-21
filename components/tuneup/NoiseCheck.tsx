"use client"

// The 60-Second Garage Door Noise & Safety Check — mobile-first quiz funnel
// for the $129 Quiet Door Tune-Up. Flow: intro → 8 questions → contact →
// personalized score → booking request.
import { useMemo, useState } from "react"
import { QUIZ, TIERS, TUNEUP_DISCLAIMER, type QuizAnswers, type Tier } from "@/lib/tuneup/quiz"

const OFFICE_PHONE = "(903) 245-1182"
const OFFICE_TEL = "tel:9032451182"

type Step = "intro" | "quiz" | "contact" | "result"

const card = "rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
const primaryBtn = "w-full rounded-xl bg-[#00FF47] px-4 py-4 font-black uppercase text-black transition hover:bg-[#00e63f] disabled:opacity-40"
const optionBtn = "w-full rounded-xl border px-4 py-3.5 text-left text-[15px] font-semibold transition"

export default function NoiseCheck() {
  const [step, setStep] = useState<Step>("intro")
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [lead, setLead] = useState({ firstName: "", contact: "", zip: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ token: string; tier: Tier; emailed: boolean } | null>(null)
  const [booking, setBooking] = useState({ phone: "", preferredDay: "", preferredWindow: "" })
  const [bookingState, setBookingState] = useState<"idle" | "sending" | "sent">("idle")

  const question = QUIZ[index]
  const contactIsPhone = useMemo(() => /^[\d\s().-]+$/.test(lead.contact.trim()) && lead.contact.replace(/\D/g, "").length >= 10, [lead.contact])

  function choose(value: string) {
    const next = { ...answers }
    if (question.multi) {
      const current = new Set(Array.isArray(next[question.id]) ? (next[question.id] as string[]) : [])
      if (value === "none") { current.clear(); current.add("none") }
      else {
        current.delete("none")
        if (current.has(value)) current.delete(value)
        else current.add(value)
      }
      next[question.id] = [...current]
      setAnswers(next)
      return
    }
    next[question.id] = value
    setAnswers(next)
    advance(next)
  }

  function advance(current: QuizAnswers) {
    if (index < QUIZ.length - 1) setIndex(index + 1)
    else { void current; setStep("contact") }
  }

  async function submit() {
    setError("")
    setSubmitting(true)
    try {
      const response = await fetch("/api/door-estimator/tuneup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, lead }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.error || "Unable to score your check"); return }
      setResult({ token: data.token, tier: data.tier, emailed: Boolean(data.emailed) })
      if (contactIsPhone) setBooking(b => ({ ...b, phone: lead.contact }))
      setStep("result")
      window.scrollTo({ top: 0 })
    } finally {
      setSubmitting(false)
    }
  }

  async function requestBooking() {
    if (!result) return
    setError("")
    setBookingState("sending")
    try {
      const response = await fetch("/api/door-estimator/tuneup/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: result.token, ...booking }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.error || "Unable to send your request"); setBookingState("idle"); return }
      setBookingState("sent")
    } catch {
      setBookingState("idle")
    }
  }

  const tier = result ? TIERS[result.tier] : null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-xl p-4 py-8 md:py-12">
        <a href="https://straightshotoverhead.com" className="mb-6 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="StraightShot Overhead" className="h-8 w-auto" />
        </a>

        {step === "intro" && <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-[#00FF47]">The 60-Second Garage Door Noise &amp; Safety Check</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white md:text-5xl">Is your garage door just noisy &mdash; or starting to wear out?</h1>
          <p className="mt-4 text-zinc-400">Your garage door should not sound like it is fighting for its life. Answer a few simple questions about the sounds and movement you are already noticing, and get a personalized condition score with the next step we recommend.</p>
          <button onClick={() => setStep("quiz")} className={`${primaryBtn} mt-6`}>Check My Garage Door</button>
          <p className="mt-3 text-center text-xs text-zinc-500">No tools required. Do not touch or adjust the springs, cables, or other high-tension components.</p>
        </div>}

        {step === "quiz" && <div className={card}>
          <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
            <span>Question {index + 1} of {QUIZ.length}</span>
            <span className="font-bold uppercase tracking-widest text-[#00FF47]">60-Second Check</span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-[#00FF47] transition-all" style={{ width: `${(index / QUIZ.length) * 100}%` }} /></div>
          <h2 className="text-xl font-black text-white">{question.prompt}</h2>
          {question.multi && <p className="mt-1 text-xs text-zinc-500">Select all that apply, then continue.</p>}
          <div className="mt-4 space-y-2.5">
            {question.options.map(option => {
              const selected = question.multi
                ? Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option.value)
                : answers[question.id] === option.value
              return <button key={option.value} onClick={() => choose(option.value)} className={`${optionBtn} ${selected ? "border-[#00FF47] bg-[#00ff4712] text-white" : "border-zinc-700 text-zinc-200 hover:border-zinc-500"}`}>{option.label}</button>
            })}
          </div>
          <div className="mt-5 flex gap-3">
            {index > 0 && <button onClick={() => setIndex(index - 1)} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300">Back</button>}
            {question.multi && <button onClick={() => advance(answers)} disabled={!answers[question.id] || (answers[question.id] as string[]).length === 0} className={`${primaryBtn} flex-1`}>Continue</button>}
          </div>
        </div>}

        {step === "contact" && <div className={card}>
          <p className="text-sm font-bold uppercase tracking-widest text-[#00FF47]">Almost done</p>
          <h2 className="mt-1 text-2xl font-black text-white">Where should we send your results?</h2>
          <p className="mt-2 text-sm text-zinc-400">You&rsquo;ll see your Garage Door Condition Score right here on screen, and we&rsquo;ll send you a copy with what it means.</p>
          <div className="mt-4 space-y-3">
            <input placeholder="First name" value={lead.firstName} onChange={e => setLead({ ...lead, firstName: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" autoComplete="given-name" />
            <input placeholder="Email or mobile number" value={lead.contact} onChange={e => setLead({ ...lead, contact: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" autoComplete="email" />
            <input placeholder="ZIP code" value={lead.zip} onChange={e => setLead({ ...lead, zip: e.target.value.replace(/\D/g, "").slice(0, 5) })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" autoComplete="postal-code" inputMode="numeric" />
          </div>
          <button onClick={submit} disabled={submitting || lead.firstName.length < 2 || !lead.contact || lead.zip.length !== 5} className={`${primaryBtn} mt-4`}>{submitting ? "Scoring…" : "Show My Score"}</button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <p className="mt-3 text-center text-xs text-zinc-500">Your information is used to deliver your results and help with your garage door. No pressure and no obligation.</p>
        </div>}

        {step === "result" && tier && <div>
          <div className={`${card} border-[#00FF47]`}>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Your Garage Door Condition Score</p>
            <h2 className="mt-2 text-3xl font-black uppercase text-[#00FF47]">{tier.name}</h2>
            <p className="mt-3 text-zinc-300">{tier.body}</p>
            {result?.emailed && <p className="mt-3 text-xs text-zinc-500">A copy of your results is on the way to your inbox.</p>}
          </div>

          {bookingState !== "sent" && <div className={`${card} mt-4`}>
            <h3 className="text-xl font-black uppercase text-white">Get your door tuned &amp; rollers replaced for $129</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
              {["Professional garage-door inspection", "Garage-door tune-up", "Replacement of the included rollers", "Plain explanation of anything else the technician finds", "No additional repair work without your approval"].map(item => (
                <li key={item} className="flex gap-2"><span className="mt-0.5 text-[#00FF47]">✓</span>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-500">We reserve a limited number of $129 tune-up appointments each week so technicians have enough time to inspect each door properly.</p>
            <div className="mt-4 space-y-3">
              {!contactIsPhone && <input placeholder="Mobile number (to confirm your appointment)" value={booking.phone} onChange={e => setBooking({ ...booking, phone: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" inputMode="tel" autoComplete="tel" />}
              <input placeholder="Preferred day (e.g. Tuesday, or a date)" value={booking.preferredDay} onChange={e => setBooking({ ...booking, preferredDay: e.target.value })} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3" />
              <div className="grid grid-cols-3 gap-2">
                {[["morning", "Morning"], ["afternoon", "Afternoon"], ["flexible", "Flexible"]].map(([value, label]) => (
                  <button key={value} onClick={() => setBooking({ ...booking, preferredWindow: value })} className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${booking.preferredWindow === value ? "border-[#00FF47] text-[#00FF47]" : "border-zinc-700 text-zinc-300"}`}>{label}</button>
                ))}
              </div>
            </div>
            <button onClick={requestBooking} disabled={bookingState === "sending" || (!contactIsPhone && booking.phone.replace(/\D/g, "").length < 10)} className={`${primaryBtn} mt-4`}>{bookingState === "sending" ? "Sending…" : tier.cta}</button>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <p className="mt-3 text-center text-xs text-zinc-500">Or call now: <a href={OFFICE_TEL} className="font-bold text-[#00FF47]">{OFFICE_PHONE}</a></p>
          </div>}

          {bookingState === "sent" && <div className={`${card} mt-4 border-[#00FF47]`}>
            <h3 className="text-xl font-black uppercase text-[#00FF47]">Request received</h3>
            <p className="mt-2 text-sm text-zinc-300">We&rsquo;ll call or text to confirm your $129 Quiet Door Tune-Up. Want it locked in faster? <a href={OFFICE_TEL} className="font-bold text-[#00FF47]">Call {OFFICE_PHONE}</a> &mdash; because it is easier to maintain a working garage door than to schedule an emergency repair after it stops moving.</p>
          </div>}

          <p className="mt-4 text-xs leading-relaxed text-zinc-600">{TUNEUP_DISCLAIMER}</p>
        </div>}
      </div>
    </div>
  )
}
