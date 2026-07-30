"use client"

// Lean booking page for general service: repairs, quotes, maintenance, new
// doors — anything the customer wants us out for. Same three-step scheduler
// as the tune-up page (window → info + issue → review), same dispatch-board
// availability behind it.
import { useEffect } from "react"
import { BUSINESS } from "@/lib/tuneup/booking-config"
import { track, getAttribution } from "@/lib/tuneup/analytics"
import BookingFlow from "@/components/tuneup/booking/BookingFlow"
import { Testimonials, TuneUpFooter, PhoneIcon, CheckIcon } from "./Sections"

const GENERAL_DISCLOSURE =
  "Booking requests are confirmed by phone or text before they are final. Diagnosis and any recommended work are explained and priced on site — no work is performed without your authorization, and no payment is required to request an appointment."

export default function GeneralBooking() {
  useEffect(() => {
    getAttribution()
    track("landing_page_view", { page: "book" })
  }, [])

  const phone = (placement: string) => () => track("phone_click", { placement })

  const points = [
    "Repairs, quotes, maintenance, new doors & openers",
    "Straight answers and pricing before any work",
    "No payment required to request an appointment",
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <a href={BUSINESS.websiteUrl} aria-label="StraightShot Overhead home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="StraightShot Overhead" className="h-8 w-auto" />
          </a>
          <a
            href={BUSINESS.phoneHref}
            onClick={phone("header")}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-white transition hover:border-[#00FF47] hover:text-[#00FF47]"
          >
            <PhoneIcon /> {BUSINESS.phoneNumber}
          </a>
        </div>
      </header>

      <main>
        <section className="px-4 pt-10 pb-2 md:pt-14">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.25em] text-[#00FF47]">{BUSINESS.serviceArea}</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-tight tracking-tight text-white md:text-5xl">
              Book Garage Door <span className="text-[#00FF47]">Service</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-zinc-300">
              Pick a time that works and tell us what&rsquo;s going on — we&rsquo;ll come out, take a look, and give you
              straight answers.
            </p>
            <ul className="mx-auto mt-5 flex max-w-lg flex-col items-start gap-2 text-left sm:items-center">
              {points.map(p => (
                <li key={p} className="flex items-center gap-2.5 text-[15px] text-zinc-200">
                  <CheckIcon /> {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="scheduler" aria-label="Schedule your service visit" className="scroll-mt-4 px-4 py-8">
          <div className="mx-auto max-w-xl">
            <BookingFlow variant="general" />
            <p className="mt-4 text-center text-sm text-zinc-500">
              Rather talk to a person? Call{" "}
              <a href={BUSINESS.phoneHref} onClick={phone("scheduler")} className="font-bold text-[#00FF47]">
                {BUSINESS.phoneNumber}
              </a>
              .
            </p>
          </div>
        </section>

        <Testimonials />
      </main>

      <TuneUpFooter onPhone={phone("footer")} disclosure={GENERAL_DISCLOSURE} />
    </div>
  )
}
