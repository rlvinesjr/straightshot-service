import type { Metadata } from "next"
import DoorEstimatorBuilder from "@/components/door-estimator/DoorEstimatorBuilder"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { sanitizeCatalog } from "@/lib/door-estimator/pricing"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Garage Door Estimator | StraightShot Overhead",
  description: "Build a residential garage door and get a preliminary installed price.",
}

const GUIDES = [
  { href: "https://straightshotoverhead.com/garage-door-buying-guide", label: "7 Questions Before You Buy" },
  { href: "https://straightshotoverhead.com/insulated-vs-non-insulated-garage-doors-east-texas", label: "Insulated vs. Non-Insulated" },
  { href: "https://straightshotoverhead.com/replace-old-garage-door-opener", label: "Do You Need a New Opener?" },
]

export default async function PublicDoorEstimatorPage() {
  const config = await loadDoorEstimatorConfig()
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[#222222] bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <a href="https://straightshotoverhead.com" className="group flex flex-col items-start gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="StraightShot Overhead" className="h-9 w-auto" />
            <span className="text-xs font-semibold text-[#00FF47] group-hover:underline">&larr; Back to straightshotoverhead.com</span>
          </a>
          <nav aria-label="Garage door buying guides" className="flex flex-wrap items-center gap-2">
            <span className="hidden text-[13px] text-[#888888] md:inline">Choosing a door?</span>
            {GUIDES.map(g => (
              <a key={g.href} href={g.href} target="_blank" rel="noopener" className="rounded-full border border-[#00FF47]/50 bg-[#00FF47]/10 px-3.5 py-1.5 text-[13px] font-bold text-[#00FF47] transition-colors hover:bg-[#00FF47] hover:text-black">{g.label}</a>
            ))}
          </nav>
        </div>
      </header>
      <DoorEstimatorBuilder catalog={sanitizeCatalog(config, "website")} mode="website" />
    </>
  )
}
