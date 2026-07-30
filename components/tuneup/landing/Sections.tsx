"use client"

// Presentational sections for the /tuneup landing page. Interactive pieces
// (CTA clicks, phone clicks) report through the callbacks so TuneUpLanding
// owns analytics and scrolling. Icons are inline SVG in the brand green —
// no emoji anywhere, per the site style rules.
import { BUSINESS, TESTIMONIALS, rollerPhrase, savings, type Testimonial } from "@/lib/tuneup/booking-config"
import { INCLUDED_ITEMS, SYMPTOMS, OFFER_DISCLOSURE, type FaqItem } from "@/lib/tuneup/landing-copy"

export const GREEN = "#00FF47"

export function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`${className} shrink-0`} aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke={GREEN} strokeWidth="1.5" />
      <path d="M6 10.2l2.6 2.6L14 7.4" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`${className} shrink-0`} aria-hidden="true">
      <path d="M3.6 2.8A1.5 1.5 0 015.1 2h1.9c.7 0 1.3.5 1.5 1.2l.6 2.6c.1.6-.1 1.2-.6 1.5l-1.2.9a12.6 12.6 0 004.5 4.5l.9-1.2c.4-.5 1-.7 1.5-.6l2.6.6c.7.2 1.2.8 1.2 1.5v1.9a1.5 1.5 0 01-1.6 1.5C8.9 15.9 4.1 11.1 3.6 2.8z" />
    </svg>
  )
}

function StarRow() {
  return (
    <span className="text-amber-400 tracking-[3px]" aria-label="5 out of 5 stars">
      {"★★★★★"}
    </span>
  )
}

type CtaProps = { onPrimary: () => void; onPhone: () => void }

// ---- 1. Hero -------------------------------------------------------------

export function Hero({ onPrimary, onPhone }: CtaProps) {
  const benefits = [
    "One standard residential garage door",
    "Parts and installation included",
    "No additional work without approval",
    "Local appointment windows available",
  ]
  return (
    <section className="px-4 pt-10 pb-8 md:pt-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-[#00FF47]">
          {BUSINESS.serviceArea}
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-tight tracking-tight text-white md:text-6xl">
          Garage Door Tune-Up + New Rollers for <span className="text-[#00FF47]">$129</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-300">
          Get a quieter, smoother-running garage door with a professional tune-up and {rollerPhrase()} — parts and labor included.
        </p>
        <ul className="mx-auto mt-6 grid max-w-xl grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
          {benefits.map(b => (
            <li key={b} className="flex items-center gap-2.5 text-[15px] text-zinc-200">
              <CheckIcon /> {b}
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          <button
            onClick={onPrimary}
            className="min-h-[52px] w-full rounded-xl bg-[#00FF47] px-6 py-4 text-lg font-black uppercase text-black transition hover:bg-[#00e63f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00FF47]"
          >
            Choose My Appointment
          </button>
          <a
            href={BUSINESS.phoneHref}
            onClick={onPhone}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 px-6 py-4 text-lg font-bold text-white transition hover:border-[#00FF47] hover:text-[#00FF47]"
          >
            <PhoneIcon /> Call {BUSINESS.phoneNumber}
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm text-zinc-500">
          No payment is required to request an appointment. We&rsquo;ll call or text to confirm your service window.
        </p>
      </div>
    </section>
  )
}

// ---- 2. Trust strip (only renders configured claims) ----------------------

export function TrustStrip() {
  const items: string[] = []
  if (BUSINESS.reviewRating && BUSINESS.reviewCount) items.push(`${BUSINESS.reviewRating.toFixed(1)}-star rating from ${BUSINESS.reviewCount} reviews`)
  if (BUSINESS.licenseText) items.push(BUSINESS.licenseText)
  if (BUSINESS.yearsInBusiness) items.push(`${BUSINESS.yearsInBusiness} years serving East Texas`)
  items.push("Local company — no unauthorized repairs, ever")
  return (
    <section className="border-y border-zinc-800 bg-zinc-900/60 px-4 py-4">
      <ul className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {items.map(t => (
          <li key={t} className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <CheckIcon className="h-4 w-4" /> {t}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---- 3. Symptoms -----------------------------------------------------------

export function SymptomList() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white">
          Does Your Garage Door Sound Like This?
        </h2>
        <ul className="mx-auto mt-7 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {SYMPTOMS.map(s => (
            <li key={s} className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-[15px] text-zinc-200">
              <CheckIcon /> {s}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-2xl text-center text-zinc-400">
          You do not need to diagnose the problem yourself. Our technician will inspect the system, complete the included
          service, and explain anything else we find.
        </p>
      </div>
    </section>
  )
}

// ---- 4. What's included + promise box --------------------------------------

export function IncludedServiceChecklist() {
  return (
    <section className="border-y border-zinc-800 bg-zinc-900/40 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white">
          Everything Included in Your <span className="text-[#00FF47]">$129</span> Service
        </h2>
        <ul className="mx-auto mt-7 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {INCLUDED_ITEMS.map(item => (
            <li key={item} className="flex items-start gap-2.5 text-[15px] text-zinc-200">
              <CheckIcon /> {item}
            </li>
          ))}
        </ul>
        <PromiseCard />
      </div>
    </section>
  )
}

export function PromiseCard() {
  return (
    <div className="mx-auto mt-9 max-w-2xl rounded-2xl border-2 border-[#00FF47] bg-zinc-950 p-6 text-center">
      <p className="text-lg font-black uppercase tracking-wide text-[#00FF47]">No-Surprise-Service Promise</p>
      <p className="mt-2 text-zinc-200">
        We will explain and price any work outside the $129 offer before doing it. You are never required to approve
        additional repairs.
      </p>
    </div>
  )
}

// ---- 5. Why rollers matter ---------------------------------------------------

export function WhyRollers() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Why Rollers Matter</h2>
        <p className="mt-4 text-zinc-300">
          Worn rollers can cause rattling, shaking, and uneven movement. Replacing them can help the door travel more
          smoothly and reduce unnecessary strain on the system. Your technician will also inspect surrounding components
          for visible signs of wear.
        </p>
      </div>
    </section>
  )
}

// ---- 6. How it works ---------------------------------------------------------

export function HowItWorks() {
  const steps = [
    { title: "Choose an arrival window", body: "Select an available date and service window." },
    { title: "We confirm your appointment", body: "We review your location and service details, then confirm by text or phone." },
    {
      title: "We tune up and test the door",
      body: "The technician completes the included service and explains any additional findings before optional work is performed.",
    },
  ]
  return (
    <section className="border-y border-zinc-800 bg-zinc-900/40 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white">How It Works</h2>
        <ol className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00FF47] text-base font-black text-black" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-400">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ---- 7. Testimonials (real Google reviews from config) -----------------------

export function TestimonialCard({ review }: { review: Testimonial }) {
  return (
    <figure className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <StarRow />
      <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-zinc-300">&ldquo;{review.text}&rdquo;</blockquote>
      <figcaption className="mt-4 border-t border-zinc-800 pt-3 text-sm">
        <span className="font-bold text-white">
          {review.firstName}
          {review.lastName ? ` ${review.lastName}` : ""}
        </span>
        <span className="text-zinc-500">
          {review.city ? ` · ${review.city}` : ""} · {review.source} review
        </span>
      </figcaption>
    </figure>
  )
}

export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white">
          What East Texas Homeowners Say
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.slice(0, 3).map(r => (
            <TestimonialCard key={r.firstName + (r.lastName ?? "")} review={r} />
          ))}
        </div>
      </div>
    </section>
  )
}

// All three Google reviews, stacked — shown right under the scheduler.
export function FeaturedReview() {
  if (TESTIMONIALS.length === 0) return null
  return (
    <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-4">
      {TESTIMONIALS.slice(0, 3).map(r => (
        <TestimonialCard key={r.firstName + (r.lastName ?? "")} review={r} />
      ))}
    </div>
  )
}

// ---- 8. Value section (only with a real configured regular price) ------------

export function ValueOffer() {
  const save = savings()
  if (!save || !BUSINESS.regularPrice) return null
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-7 text-center">
        <p className="text-zinc-400">
          Regular tune-up and roller replacement price: <s>${BUSINESS.regularPrice}</s>
        </p>
        <p className="mt-1 text-2xl font-black text-white">
          Promotional price: <span className="text-[#00FF47]">${BUSINESS.promotionalPrice}</span>
        </p>
        <p className="mt-1 font-bold text-zinc-200">You save: ${save}</p>
      </div>
    </section>
  )
}

// ---- 9. FAQ -------------------------------------------------------------------

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section className="border-y border-zinc-800 bg-zinc-900/40 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white">Straight Answers</h2>
        <div className="mt-7 space-y-3">
          {items.map(f => (
            <details key={f.question} className="group rounded-xl border border-zinc-800 bg-zinc-950">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-bold text-white [&::-webkit-details-marker]:hidden">
                {f.question}
                <span className="text-[#00FF47] transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-relaxed text-zinc-300">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---- 10. Final CTA --------------------------------------------------------------

export function FinalCta({ onPrimary, onPhone }: CtaProps) {
  return (
    <section className="px-4 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          Quiet the Noise Before It Becomes a Bigger Problem
        </h2>
        <p className="mt-3 text-zinc-300">
          A full professional tune-up plus {rollerPhrase()} for one qualifying residential door —{" "}
          <span className="font-black text-[#00FF47]">$129</span>, parts and labor included.
        </p>
        {BUSINESS.offerExpiration && (
          <p className="mt-2 text-sm font-bold text-zinc-400">Offer available through {BUSINESS.offerExpiration}.</p>
        )}
        <div className="mx-auto mt-7 flex max-w-md flex-col gap-3">
          <button
            onClick={onPrimary}
            className="min-h-[52px] w-full rounded-xl bg-[#00FF47] px-6 py-4 text-lg font-black uppercase text-black transition hover:bg-[#00e63f]"
          >
            Choose My Appointment
          </button>
          <a
            href={BUSINESS.phoneHref}
            onClick={onPhone}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 px-6 py-4 text-lg font-bold text-white transition hover:border-[#00FF47] hover:text-[#00FF47]"
          >
            <PhoneIcon /> Call {BUSINESS.phoneNumber}
          </a>
        </div>
        <p className="mt-4 text-sm text-zinc-500">Proudly serving {BUSINESS.serviceArea}.</p>
      </div>
    </section>
  )
}

// ---- 11. Footer -----------------------------------------------------------------

export function TuneUpFooter({ onPhone, disclosure = OFFER_DISCLOSURE }: { onPhone: () => void; disclosure?: string | null }) {
  return (
    <footer className="border-t border-zinc-800 px-4 pb-28 pt-10 md:pb-10">
      <div className="mx-auto max-w-3xl text-center text-sm text-zinc-500">
        <p className="font-bold text-zinc-300">{BUSINESS.companyName}</p>
        <p className="mt-1">
          <a href={BUSINESS.phoneHref} onClick={onPhone} className="text-[#00FF47] hover:underline">
            {BUSINESS.phoneNumber}
          </a>
          {BUSINESS.businessAddress ? ` · ${BUSINESS.businessAddress}` : ""} · Serving {BUSINESS.serviceArea}
        </p>
        {BUSINESS.licenseText && <p className="mt-1">{BUSINESS.licenseText}</p>}
        <p className="mt-4">
          {BUSINESS.privacyPolicyUrl && (
            <>
              <a href={BUSINESS.privacyPolicyUrl} className="hover:text-zinc-300">Privacy Policy</a>
              {" · "}
            </>
          )}
          {BUSINESS.termsUrl && (
            <>
              <a href={BUSINESS.termsUrl} className="hover:text-zinc-300">Terms</a>
              {" · "}
            </>
          )}
          <a href={BUSINESS.websiteUrl} className="hover:text-zinc-300">straightshotoverhead.com</a>
        </p>
        {disclosure && <p className="mx-auto mt-5 max-w-2xl text-xs leading-relaxed text-zinc-600">{disclosure}</p>}
      </div>
    </footer>
  )
}

// ---- Sticky mobile CTA ------------------------------------------------------------

export function StickyMobileCTA({ onPrimary, onPhone, hidden }: CtaProps & { hidden: boolean }) {
  if (hidden) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 p-3 backdrop-blur md:hidden" role="region" aria-label="Quick actions">
      <div className="mx-auto flex max-w-md gap-2.5">
        <button
          onClick={onPrimary}
          className="min-h-[48px] flex-1 rounded-xl bg-[#00FF47] px-4 py-3 text-sm font-black uppercase text-black"
        >
          Choose My Appointment
        </button>
        <a
          href={BUSINESS.phoneHref}
          onClick={onPhone}
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-white"
        >
          <PhoneIcon /> Call
        </a>
      </div>
    </div>
  )
}
