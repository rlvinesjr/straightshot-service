import type { Metadata } from "next"
import { notFound } from "next/navigation"
import RepairLandingPage from "@/components/repair/RepairLandingPage"
import { REPAIR_LANDINGS, landingFor } from "@/lib/repair/landing"

const BASE = "https://estimate.straightshotoverhead.com"

// Only allowlisted landing pages exist; any other /lp/<anything> is a 404.
export const dynamicParams = false
export function generateStaticParams() {
  return Object.keys(REPAIR_LANDINGS).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const landing = landingFor((await params).slug)
  if (!landing) return {}
  const url = `${BASE}/lp/${landing.slug}`
  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: url },
    // ad landing page: keep it out of organic search so it never competes with
    // the existing SEO pages on straightshotoverhead.com
    robots: { index: false, follow: true },
    openGraph: { title: landing.metaTitle, description: landing.metaDescription, url, type: "website" },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const landing = landingFor((await params).slug)
  if (!landing) notFound()
  return <RepairLandingPage landing={landing} />
}
