import type { Metadata } from "next"
import GeneralBooking from "@/components/tuneup/landing/GeneralBooking"
import { BUSINESS } from "@/lib/tuneup/booking-config"

const TITLE = `Book Garage Door Service Online | ${BUSINESS.companyName}`
const DESCRIPTION = `Schedule a garage door service visit in ${BUSINESS.serviceArea} — repairs, quotes, maintenance, new doors and openers. Pick an arrival window online; no payment required to request an appointment.`
const URL = "https://estimate.straightshotoverhead.com/book"

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: BUSINESS.companyName, type: "website" },
}

function structuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Garage Door Service Visit",
    serviceType: "Garage door repair and maintenance",
    provider: { "@type": "LocalBusiness", name: BUSINESS.companyName, telephone: BUSINESS.phoneNumber, url: BUSINESS.websiteUrl },
    areaServed: BUSINESS.serviceArea,
  }
}

export default function BookPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }} />
      <GeneralBooking />
    </>
  )
}
