import type { Metadata } from "next"
import TuneUpLanding from "@/components/tuneup/landing/TuneUpLanding"
import { BUSINESS, rollerPhrase } from "@/lib/tuneup/booking-config"
import { faqItems } from "@/lib/tuneup/landing-copy"

const TITLE = `$129 Garage Door Tune-Up With Roller Replacement | ${BUSINESS.companyName}`
const DESCRIPTION = `Get a professional garage door tune-up plus ${rollerPhrase()} for $129. Parts and labor included for one qualifying residential door in ${BUSINESS.serviceArea}.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: BUSINESS.landingUrl },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: BUSINESS.landingUrl,
    siteName: BUSINESS.companyName,
    type: "website",
  },
}

// LocalBusiness + Service structured data. Deliberately no aggregateRating —
// ratings only go in once a verified review count is configured.
function structuredData() {
  const business = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: BUSINESS.companyName,
    telephone: BUSINESS.phoneNumber,
    url: BUSINESS.websiteUrl,
    areaServed: BUSINESS.serviceArea,
    ...(BUSINESS.businessAddress ? { address: BUSINESS.businessAddress } : {}),
  }
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Garage Door Tune-Up with Roller Replacement",
    serviceType: "Garage door maintenance",
    provider: { "@type": "LocalBusiness", name: BUSINESS.companyName, telephone: BUSINESS.phoneNumber },
    areaServed: BUSINESS.serviceArea,
    offers: {
      "@type": "Offer",
      price: String(BUSINESS.promotionalPrice),
      priceCurrency: "USD",
      url: BUSINESS.landingUrl,
      description: DESCRIPTION,
    },
  }
  // FAQPage mirrors the FAQ that is actually rendered on the page.
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems().map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }
  return [business, service, faq]
}

export default function TuneUpPage() {
  return (
    <>
      {structuredData().map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
      <TuneUpLanding />
    </>
  )
}
