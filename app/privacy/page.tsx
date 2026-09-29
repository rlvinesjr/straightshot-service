import type { Metadata } from "next"
import Link from "next/link"
import { BUSINESS } from "@/lib/tuneup/booking-config"

// DRAFT privacy notice for the forms on estimate.straightshotoverhead.com.
// Plain statements of what this app actually does — keep it in step with the
// code. Needs the owner's review before paid traffic is sent to these pages.
export const metadata: Metadata = {
  title: `Privacy | ${BUSINESS.companyName}`,
  robots: { index: false, follow: true },
}

const UPDATED = "September 28, 2026"

export default function PrivacyPage() {
  const h2 = "mt-8 text-xl font-black uppercase tracking-tight text-white"
  const p = "mt-3 leading-relaxed text-zinc-300"
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <main className="mx-auto max-w-2xl">
        <Link href="/lp/garage-door-repair" className="text-sm text-zinc-400 underline">← Back</Link>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white">Privacy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {UPDATED}</p>

        <p className={p}>
          This notice covers the request forms on estimate.straightshotoverhead.com, run by {BUSINESS.companyName}, a
          residential garage door service in East Texas.
        </p>

        <h2 className={h2}>What we collect</h2>
        <p className={p}>
          What you type into a form: your name, phone number and ZIP code; your service address on the booking forms; and
          — if you choose to give them — your email address and a description of the problem. If you arrived from an online ad, we also record the ad&rsquo;s click
          identifier and campaign labels from the link you followed.
        </p>

        <h2 className={h2}>How we use it</h2>
        <p className={p}>
          To contact you about your request and arrange service. Your request is stored in our own job software, which only
          StraightShot staff can sign in to.
        </p>
        <p className={p}>
          To measure our advertising. We may tell Google Ads that a click led to a request or a paid job, using the click
          identifier, the date and the job value. We do not send your name, phone number, email or address to Google for this.
          If our Google advertising tag is active on a page, Google may set cookies to measure ad clicks.
        </p>

        <h2 className={h2}>What we don&rsquo;t do</h2>
        <p className={p}>We don&rsquo;t sell your information, and we don&rsquo;t add you to marketing lists from this form.</p>

        <h2 className={h2}>Questions or removal</h2>
        <p className={p}>
          Call or text {BUSINESS.companyName} at{" "}
          <a href={BUSINESS.phoneHref} className="font-bold text-white underline">{BUSINESS.phoneNumber}</a> to ask what we hold
          about you or to have it removed.
        </p>
      </main>
    </div>
  )
}
