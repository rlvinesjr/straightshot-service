// Copy for the /tuneup landing page that is shared between the visible React
// components and the SEO structured data (FAQPage JSON-LD must match what is
// actually rendered). Everything derives from the central business config.
import { BUSINESS, rollerPhrase } from "./booking-config"

export const INCLUDED_ITEMS: string[] = [
  `Replacement of ${rollerPhrase().replace("new ", "qualifying ")}`,
  "Roller parts and installation labor",
  "Inspection of springs, cables, tracks, hinges, hardware, and opener operation",
  "Lubrication of appropriate moving parts",
  "Tightening of accessible nuts, bolts, hinges, and hardware",
  "Door balance and movement check",
  "Minor operating adjustments where appropriate",
  "Safety-reversal system test",
  "Final operational test",
  "Clear service-condition summary",
]

export const SYMPTOMS: string[] = [
  "Squeaking, rattling, popping, or grinding",
  "Shaking or jerking while moving",
  "Slow or uneven operation",
  "Worn, cracked, or stiff rollers",
  "A door that has not been serviced recently",
  "A door that feels less reliable than it used to",
]

export type FaqItem = { question: string; answer: string }

export function faqItems(): FaqItem[] {
  const price = `$${BUSINESS.promotionalPrice}`
  const items: FaqItem[] = [
    {
      question: `What exactly is included in the ${price} service?`,
      answer: `One qualifying standard residential garage door gets a full professional tune-up: replacement of rollers with new Nylon Maintenance Free Ball Bearing Rollers, inspection of the springs, cables, tracks, hinges, hardware, and opener operation, lubrication of moving parts, tightening of any hardware, a door balance and movement check, minor operating adjustments where appropriate, a safety-reversal test, a final operational test, and a clear summary of the door's condition. Parts and labor for the listed work are included.`,
    },
    {
      question: `Is ${price} the complete price?`,
      answer: `${BUSINESS.serviceCallFeeDisclosure} ${BUSINESS.taxDisclosure ?? "We'll confirm your total, including any applicable tax, when we confirm the appointment."} Any work beyond the listed tune-up service is priced separately and only performed with your approval.`,
    },
    {
      question: "What types of garage doors qualify?",
      answer: `The offer covers one standard residential garage door that uses standard rollers. If you have more than one door we will be glad to do the same service on each door for ${price} each.`,
    },
    {
      question: "What happens if the technician finds another problem?",
      answer: `You get a straight explanation and a price before anything happens — that's our No-Surprise-Service Promise. You are never required to approve additional repairs, and the ${price} tune-up is completed either way.`,
    },
    {
      question: "Is the work covered by a warranty?",
      answer:
        BUSINESS.warrantyText ??
        `We stand behind our work. Ask about coverage for your specific service when we confirm your appointment, or call ${BUSINESS.phoneNumber} — we'll give you a straight answer before you book.`,
    },
  ]
  return items
}

export const OFFER_DISCLOSURE = `Offer applies per qualifying standard residential garage door ($${BUSINESS.promotionalPrice} each) and includes the listed tune-up services plus replacement of ${rollerPhrase().replace("new ", "qualifying ")}. Specialty parts, custom systems, commercial doors, ${BUSINESS.taxDisclosure ? "" : "taxes, "}fees, and additional repairs are handled according to the disclosures above. No additional work will be performed without authorization. Appointment requests are confirmed by phone or text before they are final.`
