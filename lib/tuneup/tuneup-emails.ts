// Emails for the Noise & Safety Check funnel: score delivery, office alerts,
// and the day 1 / 3 / 5 / 7 follow-up sequence for the $129 tune-up.
import { TIERS, TUNEUP_DISCLAIMER, type Tier } from "./quiz"

const SITE = "https://straightshotoverhead.com"
const ESTIMATE_BASE = process.env.PUBLIC_BASE_URL || "https://estimate.straightshotoverhead.com"
const OFFICE_PHONE = "(903) 245-1182"
const OFFICE_TEL = "9032451182"

export type TuneUpLeadRecord = {
  token: string
  firstName: string
  email: string | null
  phone: string | null
  zip: string | null
  score: number
  tier: string
  preferredDay: string | null
  preferredWindow: string | null
}

const shell = (body: string, unsubscribeToken?: string) => `<!doctype html>
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;line-height:1.6">
  <div style="background:#000;padding:18px 24px;border-radius:8px 8px 0 0">
    <span style="color:#fff;font-weight:bold;font-size:18px;letter-spacing:1px">STRAIGHTSHOT <span style="color:#00d23a">OVERHEAD</span></span>
  </div>
  <div style="border:1px solid #e3e3e3;border-top:none;border-radius:0 0 8px 8px;padding:26px 24px">
    ${body}
    <p style="margin:28px 0 0;font-size:13px;color:#888">StraightShot Overhead — Garage Door Sales &amp; Service, East Texas<br>
    Office: <a href="tel:${OFFICE_TEL}" style="color:#00a02e">${OFFICE_PHONE}</a> · <a href="${SITE}" style="color:#00a02e">straightshotoverhead.com</a></p>
    ${unsubscribeToken ? `<p style="margin:14px 0 0;font-size:11px;color:#aaa">No longer interested? <a href="${ESTIMATE_BASE}/api/door-estimator/unsubscribe?token=${unsubscribeToken}" style="color:#aaa">Unsubscribe from these emails</a>.</p>` : ""}
  </div>
</div>`

const cta = (label: string, href: string) =>
  `<p style="margin:22px 0"><a href="${href}" style="background:#00d23a;color:#000;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:5px;display:inline-block">${label}</a></p>`

const bookCta = () => cta(`Book My $129 Tune-Up: ${OFFICE_PHONE}`, `tel:${OFFICE_TEL}`)
const disclaimer = `<p style="font-size:12px;color:#999;margin-top:18px">${TUNEUP_DISCLAIMER}</p>`

export function scoreEmail(lead: TuneUpLeadRecord): { subject: string; html: string } {
  const tier = TIERS[lead.tier as Tier] ?? TIERS.wear
  return {
    subject: `${lead.firstName}, your Garage Door Noise & Safety Score: ${tier.name}`,
    html: shell(`
      <h2 style="margin:0 0 6px">Your score: ${tier.name}</h2>
      <p style="margin:0 0 14px;color:#888">From the 60-Second Garage Door Noise &amp; Safety Check</p>
      <p>${tier.body}</p>
      <p><strong>The next step:</strong> the $129 Quiet Door Tune-Up — a professional inspection, tune-up, and replacement of the included rollers, for one straightforward price. We reserve a limited number of tune-up appointments each week so our technicians have time to inspect each door properly.</p>
      ${bookCta()}
      ${disclaimer}
    `, lead.token),
  }
}

export function quizLeadAlert(lead: TuneUpLeadRecord): { subject: string; html: string } {
  return {
    subject: `Tune-up quiz lead: ${lead.firstName} — ${TIERS[lead.tier as Tier]?.name ?? lead.tier} (${lead.zip || "no ZIP"})`,
    html: shell(`
      <h2 style="margin:0 0 12px">New Noise &amp; Safety Check lead</h2>
      <p><strong>${lead.firstName}</strong><br>
      ${lead.email ? `Email: <a href="mailto:${lead.email}">${lead.email}</a><br>` : ""}
      ${lead.phone ? `Phone: <a href="tel:${lead.phone}">${lead.phone}</a><br>` : ""}
      ZIP: ${lead.zip || "—"}<br>
      Score: <strong>${lead.score} — ${TIERS[lead.tier as Tier]?.name ?? lead.tier}</strong></p>
      <p style="font-size:13px;color:#888">They saw the $129 tune-up offer on their results screen. If they also request an appointment you'll get a booking alert.</p>
    `),
  }
}

export function bookingAlert(lead: TuneUpLeadRecord): { subject: string; html: string } {
  return {
    subject: `TUNE-UP BOOKING REQUEST — ${lead.firstName} (${lead.preferredDay || "any day"}, ${lead.preferredWindow || "any time"})`,
    html: shell(`
      <h2 style="margin:0 0 12px;color:#c40000">$129 tune-up booking request</h2>
      <p><strong>${lead.firstName}</strong> asked to schedule — call or text to confirm.</p>
      <p>${lead.phone ? `Phone: <a href="tel:${lead.phone}"><strong>${lead.phone}</strong></a><br>` : ""}
      ${lead.email ? `Email: <a href="mailto:${lead.email}">${lead.email}</a><br>` : ""}
      ZIP: ${lead.zip || "—"}<br>
      Preferred: <strong>${lead.preferredDay || "any day"}, ${lead.preferredWindow || "any window"}</strong><br>
      Quiz score: ${lead.score} — ${TIERS[lead.tier as Tier]?.name ?? lead.tier}</p>
    `),
  }
}

// day 1 / 3 / 5 / 7
export const TUNEUP_DRIP_OFFSETS_DAYS = [1, 3, 5, 7]

export function tuneupDripEmail(stage: number, lead: TuneUpLeadRecord): { subject: string; html: string } {
  const f = lead.firstName
  switch (stage) {
    case 0: return {
      subject: `${f}, why garage doors get louder so gradually`,
      html: shell(`
        <h2 style="margin:0 0 12px">You adapt. The door doesn't heal.</h2>
        <p>Garage doors rarely get loud overnight. Rollers wear a little, hardware loosens a little, lubrication dries out a little — and because it happens over months, your ear adjusts right along with it.</p>
        <p>That's why most homeowners can't say when the noise started. The useful question isn't "is it loud?" — it's "is it louder than it has to be?" A tuned door with fresh rollers is startlingly quiet.</p>
        <p>Our <a href="${SITE}/garage-door-maintenance" style="color:#00a02e">maintenance guide</a> covers what you can safely do yourself — and what should stay professional.</p>
        ${bookCta()}
        ${disclaimer}
      `, lead.token),
    }
    case 1: return {
      subject: `${f}, what worn garage-door rollers sound like`,
      html: shell(`
        <h2 style="margin:0 0 12px">The sounds worn rollers make</h2>
        <p>Worn or dried-out rollers commonly show up as squeaking or chirping on every trip, a rough grinding as the door moves through the curve of the track, or a rhythmic knock as a flat spot comes around.</p>
        <p>We can't diagnose your exact door from a distance — similar sounds can also come from hinges, bearings, or the opener itself. That's what the in-person inspection sorts out, and it's built into the $129 tune-up along with replacement of the included rollers.</p>
        ${bookCta()}
        ${disclaimer}
      `, lead.token),
    }
    case 2: return {
      subject: `${f}, what's included in the $129 tune-up?`,
      html: shell(`
        <h2 style="margin:0 0 12px">The $129 Quiet Door Tune-Up, spelled out</h2>
        <p>Your service includes:</p>
        <ul style="padding-left:20px">
          <li>Professional garage-door inspection</li>
          <li>Garage-door tune-up — lubrication and adjustment of the appropriate components</li>
          <li>Replacement of the included rollers</li>
          <li>A plain explanation of anything else the technician finds</li>
          <li>No additional repair work without your approval</li>
        </ul>
        <p>It applies to qualifying residential garage doors in our East Texas service area. If your door needs more than a tune-up, you'll get an honest quote — never surprise work.</p>
        ${bookCta()}
        ${disclaimer}
      `, lead.token),
    }
    default: return {
      subject: `${f}, still hearing that squeaking or rattling?`,
      html: shell(`
        <h2 style="margin:0 0 12px">A noisy door today is an inconvenient door later</h2>
        <p>Small garage-door problems rarely become more convenient. It is easier to plan a $129 tune-up than to deal with a door that unexpectedly stops moving on a workday morning.</p>
        <p>One visit: inspection, tune-up, included rollers replaced, and straight answers about anything else we see.</p>
        ${bookCta()}
        <p style="font-size:13px;color:#888">This is the last scheduled email about your Noise &amp; Safety Check.</p>
        ${disclaimer}
      `, lead.token),
    }
  }
}
