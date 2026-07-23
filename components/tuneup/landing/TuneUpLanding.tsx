"use client"

// Assembly for the /tuneup ad landing page. Owns analytics wiring, the
// scroll-to-scheduler behavior, and the sticky mobile CTA (which hides while
// the scheduler is on screen so it never covers form controls).
import { useEffect, useRef, useState } from "react"
import { BUSINESS } from "@/lib/tuneup/booking-config"
import { faqItems } from "@/lib/tuneup/landing-copy"
import { track, getAttribution } from "@/lib/tuneup/analytics"
import BookingFlow from "@/components/tuneup/booking/BookingFlow"
import {
  Hero,
  TrustStrip,
  SymptomList,
  IncludedServiceChecklist,
  WhyRollers,
  HowItWorks,
  Testimonials,
  FeaturedReview,
  ValueOffer,
  Faq,
  FinalCta,
  TuneUpFooter,
  StickyMobileCTA,
  PhoneIcon,
} from "./Sections"

export default function TuneUpLanding() {
  const schedulerRef = useRef<HTMLElement>(null)
  const [schedulerVisible, setSchedulerVisible] = useState(false)

  useEffect(() => {
    getAttribution() // capture UTMs / click IDs before any navigation within the page
    track("landing_page_view")
    const el = schedulerRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setSchedulerVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function goToScheduler(placement: string) {
    track("primary_cta_click", { placement })
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    schedulerRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }

  const phone = (placement: string) => () => track("phone_click", { placement })

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
        <Hero onPrimary={() => goToScheduler("hero")} onPhone={phone("hero")} />
        <TrustStrip />

        <section ref={schedulerRef} id="scheduler" aria-label="Schedule your tune-up" className="scroll-mt-4 px-4 py-12">
          <div className="mx-auto max-w-xl">
            <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white">
              Choose Your <span className="text-[#00FF47]">Appointment Window</span>
            </h2>
            <p className="mt-2 text-center text-sm text-zinc-400">
              About two minutes. No payment — we confirm by text or call before it&rsquo;s final.
            </p>
            <div className="mt-6">
              <BookingFlow />
            </div>
            <FeaturedReview />
          </div>
        </section>

        <SymptomList />
        <IncludedServiceChecklist />
        <WhyRollers />
        <HowItWorks />
        <Testimonials />
        <ValueOffer />
        <Faq items={faqItems()} />
        <FinalCta onPrimary={() => goToScheduler("final")} onPhone={phone("final")} />
      </main>

      <TuneUpFooter onPhone={phone("footer")} />
      <StickyMobileCTA onPrimary={() => goToScheduler("sticky")} onPhone={phone("sticky")} hidden={schedulerVisible} />
    </div>
  )
}
