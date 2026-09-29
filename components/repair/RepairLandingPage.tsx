// Repair ad landing page. Server-rendered: the H1 is in the HTML Google fetches,
// and it comes from the allowlist in lib/repair/landing.ts — never the URL.
// No reviews, ratings or testimonials by design; real job photos and plain
// service facts instead.
import { BUSINESS } from "@/lib/tuneup/booking-config"
import { REPAIR_COPY, REPAIR_FAQ, REPAIR_PHOTOS, REPAIR_PROCESS, REPAIR_SCOPE, type RepairLanding } from "@/lib/repair/landing"
import RepairForm from "./RepairForm"
import GoogleTag from "./GoogleTag"

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">{children}</h2>
)

export default function RepairLandingPage({ landing }: { landing: RepairLanding }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <GoogleTag />
      <header className="border-b border-zinc-800 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <a href={BUSINESS.websiteUrl} aria-label={`${BUSINESS.companyName} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={BUSINESS.companyName} width={160} height={32} className="h-8 w-auto" />
          </a>
          <a href={BUSINESS.phoneHref} className="flex min-h-[44px] items-center rounded-xl border border-zinc-700 px-3 text-sm font-bold text-white hover:border-[#00FF47] hover:text-[#00FF47]">
            {BUSINESS.phoneNumber}
          </a>
        </div>
      </header>

      <main>
        {/* hero + form */}
        <section className="px-4 pb-12 pt-5 sm:pt-12">
          <div className="mx-auto grid max-w-5xl items-start gap-6 sm:gap-8 lg:grid-cols-[1fr_26rem]">
            <div className="lg:pt-6">
              <p className="inline-block rounded-full border border-[#00FF47]/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#00FF47]">
                {REPAIR_COPY.localLabel}
              </p>
              <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
                {landing.h1}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-300 sm:mt-5 sm:text-lg">{REPAIR_COPY.heroBody}</p>
              {/* on phones the form comes right after the paragraph; the list repeats it, so it waits for wider screens */}
              <ul className="mt-6 hidden max-w-xl grid-cols-2 gap-2 text-sm text-zinc-300 sm:grid">
                {["Springs & cables", "Rollers & tracks", "Opener diagnosis & repair", "Homes in Smith County"].map(t => (
                  <li key={t} className="flex items-center gap-2"><span aria-hidden className="h-2 w-2 rounded-full bg-[#00FF47]" />{t}</li>
                ))}
              </ul>
            </div>
            <div id="request" className="scroll-mt-4">
              <RepairForm landing={landing.slug} cta={REPAIR_COPY.cta} clarification={REPAIR_COPY.clarification}
                phoneNumber={BUSINESS.phoneNumber} phoneHref={BUSINESS.phoneHref} />
            </div>
          </div>
        </section>

        {/* real repair photos */}
        <section aria-labelledby="photos" className="border-t border-zinc-800 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div id="photos"><H2>From our repair jobs</H2></div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {REPAIR_PHOTOS.map(p => (
                <figure key={p.src} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                  <figcaption className="px-4 py-3 text-sm text-zinc-400">{p.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* repair scope */}
        <section aria-labelledby="scope" className="border-t border-zinc-800 bg-zinc-900/40 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div id="scope"><H2>What we repair</H2></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {REPAIR_SCOPE.map(s => (
                <div key={s.title} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                  <h3 className="text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* process */}
        <section aria-labelledby="process" className="border-t border-zinc-800 px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div id="process"><H2>How it works</H2></div>
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {REPAIR_PROCESS.map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00FF47] font-black text-black">{i + 1}</span>
                  <h3 className="mt-3 text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* owner + service area */}
        <section className="border-t border-zinc-800 bg-zinc-900/40 px-4 py-12">
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2">
            <div aria-labelledby="owner">
              <div id="owner"><H2>Who you&rsquo;ll be dealing with</H2></div>
              <p className="mt-4 leading-relaxed text-zinc-300">{REPAIR_COPY.ownerIntro}</p>
            </div>
            <div aria-labelledby="area">
              <div id="area"><H2>Service area</H2></div>
              <p className="mt-4 leading-relaxed text-zinc-300">
                This page is for homes in {REPAIR_COPY.county}, {REPAIR_COPY.state}. Some ZIP codes cross county lines, so we
                confirm your address before setting a visit.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq" className="border-t border-zinc-800 px-4 py-12">
          <div className="mx-auto max-w-3xl">
            <div id="faq"><H2>Questions</H2></div>
            <div className="mt-6 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900">
              {REPAIR_FAQ.map(item => (
                <details key={item.q} className="group px-5 py-4">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 font-bold text-white">
                    {item.q}
                    <span aria-hidden className="text-[#00FF47] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 leading-relaxed text-zinc-400">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* repeat CTA */}
        <section className="border-t border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center">
          <div className="mx-auto max-w-xl">
            <H2>Tell us what your door is doing</H2>
            <a href="#request" className="mt-6 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#00FF47] px-8 text-lg font-black uppercase tracking-wide text-black hover:bg-[#33ff6c]">
              {REPAIR_COPY.cta}
            </a>
            <p className="mt-3 text-sm text-zinc-400">{REPAIR_COPY.clarification}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-4 py-8 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {BUSINESS.companyName} · <a href={BUSINESS.phoneHref} className="text-zinc-300 hover:text-white">{BUSINESS.phoneNumber}</a> ·{" "}
            <a href={BUSINESS.websiteUrl} className="text-zinc-300 hover:text-white">straightshotoverhead.com</a>
          </p>
          <a href="/privacy" className="text-zinc-300 underline hover:text-white">Privacy</a>
        </div>
      </footer>
    </div>
  )
}
