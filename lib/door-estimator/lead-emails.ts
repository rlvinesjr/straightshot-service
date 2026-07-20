// Email bodies for the lead funnel: report delivery, office alerts, and the
// 5-touch follow-up sequence. Plain table-free HTML that renders everywhere.
const SITE = "https://straightshotoverhead.com"
const ESTIMATE_BASE = process.env.PUBLIC_BASE_URL || "https://estimate.straightshotoverhead.com"
const OFFICE_PHONE = "(903) 245-1182"
const OFFICE_TEL = "9032451182"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export type LeadRecord = {
  token: string
  customerName: string | null
  email: string | null
  phone: string | null
  zip: string | null
  timeline: string | null
  retailPriceSnapshot: number
  createdAt: Date
}

export const TIMELINE_LABELS: Record<string, string> = {
  "asap": "As soon as possible",
  "30-days": "Within 30 days",
  "1-3-months": "One to three months",
  "researching": "Just researching",
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
    ${unsubscribeToken ? `<p style="margin:14px 0 0;font-size:11px;color:#aaa">No longer shopping for a door? <a href="${ESTIMATE_BASE}/api/door-estimator/unsubscribe?token=${unsubscribeToken}" style="color:#aaa">Unsubscribe from these emails</a>.</p>` : ""}
  </div>
</div>`

const cta = (label: string, href: string) =>
  `<p style="margin:22px 0"><a href="${href}" style="background:#00d23a;color:#000;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:5px;display:inline-block">${label}</a></p>`

const first = (lead: LeadRecord) => (lead.customerName || "there").split(" ")[0]

export function reportDeliveryEmail(lead: LeadRecord): { subject: string; html: string } {
  return {
    subject: `${first(lead)}, your Garage Door Buyer Report (estimate: ${money.format(lead.retailPriceSnapshot)})`,
    html: shell(`
      <h2 style="margin:0 0 12px">Your report is ready, ${first(lead)}</h2>
      <p>Your preliminary installed estimate came out to <strong>${money.format(lead.retailPriceSnapshot)}</strong> — standard installation, removal, and disposal included.</p>
      <p>Your personalized Buyer Report has your full configuration, real ways to adjust the price, the repair-or-replace scorecard, and the quote-comparison sheet to hold any installer's quote against.</p>
      ${cta("Download My Buyer Report (PDF)", `${ESTIMATE_BASE}/api/door-estimator/report/${lead.token}`)}
      <p><strong>Ready to turn this into an exact quote?</strong> An online planner cannot see your opening, clearance, tracks, or opener. The on-site measurement is free and comes with a firm written price.</p>
      ${cta(`Call to Book: ${OFFICE_PHONE}`, `tel:${OFFICE_TEL}`)}
      <p style="font-size:13px;color:#888">No pressure and no obligation — the estimate and report are yours either way.</p>
    `, lead.token),
  }
}

export function leadAlertEmail(lead: LeadRecord, configSummary: string): { subject: string; html: string } {
  return {
    subject: `New door lead: ${lead.customerName || "Unknown"} — ${money.format(lead.retailPriceSnapshot)} (${lead.zip || "no ZIP"})`,
    html: shell(`
      <h2 style="margin:0 0 12px">New Buyer Report lead</h2>
      <p><strong>${lead.customerName || "—"}</strong><br>
      ${lead.email ? `Email: <a href="mailto:${lead.email}">${lead.email}</a><br>` : ""}
      ${lead.phone ? `Phone: <a href="tel:${lead.phone}">${lead.phone}</a><br>` : ""}
      ZIP: ${lead.zip || "—"}<br>
      Timeline: ${lead.timeline ? TIMELINE_LABELS[lead.timeline] ?? lead.timeline : "not answered yet"}</p>
      <p><strong>Configured door:</strong> ${configSummary}<br>
      <strong>Estimate shown:</strong> ${money.format(lead.retailPriceSnapshot)}</p>
      <p style="font-size:13px;color:#888">Their report: <a href="${ESTIMATE_BASE}/api/door-estimator/report/${lead.token}">download PDF</a></p>
    `),
  }
}

export function hotLeadEmail(lead: LeadRecord): { subject: string; html: string } {
  return {
    subject: `HOT LEAD — ${lead.customerName || "Unknown"} wants a door ${lead.timeline === "asap" ? "ASAP" : "within 30 days"} (${money.format(lead.retailPriceSnapshot)})`,
    html: shell(`
      <h2 style="margin:0 0 12px;color:#c40000">Hot lead — call while they're shopping</h2>
      <p><strong>${lead.customerName || "—"}</strong> just said their timeline is <strong>${TIMELINE_LABELS[lead.timeline ?? ""] ?? lead.timeline}</strong>.</p>
      <p>${lead.phone ? `Phone: <a href="tel:${lead.phone}"><strong>${lead.phone}</strong></a><br>` : ""}
      ${lead.email ? `Email: <a href="mailto:${lead.email}">${lead.email}</a><br>` : ""}
      ZIP: ${lead.zip || "—"} · Estimate: <strong>${money.format(lead.retailPriceSnapshot)}</strong></p>
    `),
  }
}

// ---- follow-up sequence: day 1, 2, 3, 5, 7 ----
export const DRIP_OFFSETS_DAYS = [1, 2, 3, 5, 7]

export function dripEmail(stage: number, lead: LeadRecord): { subject: string; html: string } {
  const f = first(lead)
  const report = cta("Re-download My Buyer Report", `${ESTIMATE_BASE}/api/door-estimator/report/${lead.token}`)
  const book = cta(`Book My Free Measurement: ${OFFICE_PHONE}`, `tel:${OFFICE_TEL}`)
  switch (stage) {
    case 0: return {
      subject: `${f}, should you repair your current door instead?`,
      html: shell(`
        <h2 style="margin:0 0 12px">Repair it, or replace it?</h2>
        <p>Before you spend ${money.format(lead.retailPriceSnapshot)} on a new door, it's worth an honest look at whether your current one can be fixed. Not every door needs replacing — and we'd rather tell you that on day one.</p>
        <p>Page 3 of your Buyer Report has the 8-question scorecard. Two or fewer checks? A repair probably serves you better. Five or more? Replacement usually stops the money bleed.</p>
        <p>More depth here: <a href="${SITE}/replace-old-garage-door-opener" style="color:#00a02e">when repair beats replacement</a> and our <a href="${SITE}/garage-door-torsion-springs" style="color:#00a02e">guide to springs and door balance</a>.</p>
        ${report}
      `, lead.token),
    }
    case 1: return {
      subject: `${f}, is an insulated door worth it in East Texas?`,
      html: shell(`
        <h2 style="margin:0 0 12px">The insulation question</h2>
        <p>Short version: if your garage is attached, shares a wall with living space, or doubles as a shop — insulation is usually worth it in our summers. Detached and rarely used? Save the money.</p>
        <p>We wrote up the full East Texas comparison here: <a href="${SITE}/insulated-vs-non-insulated-garage-doors-east-texas" style="color:#00a02e">insulated vs. non-insulated garage doors</a>.</p>
        <p>Want to see the exact price difference for your door? Rebuild it in the planner and switch the construction — the price updates live.</p>
        ${cta("Reopen the Price Planner", `${ESTIMATE_BASE}/door-estimator`)}
      `, lead.token),
    }
    case 2: return {
      subject: `${f}, 7 things missing from cheap garage door quotes`,
      html: shell(`
        <h2 style="margin:0 0 12px">Why the lowest quote is rarely the cheapest</h2>
        <p>The pattern we see: a low number up front, then springs, disposal, tracks, seals, or opener work appear as "extras" on install day. The seven most commonly missing items:</p>
        <ol style="padding-left:20px">
          <li>New springs rated for the new door's weight</li>
          <li>Removal &amp; disposal of the old door</li>
          <li>Track inspection or replacement</li>
          <li>New rollers and hinges</li>
          <li>Bottom + perimeter weather seal</li>
          <li>Opener compatibility work</li>
          <li>A written parts <em>and labor</em> warranty</li>
        </ol>
        <p>Page 4 of your Buyer Report is a print-ready checklist to hold any quote against — including ours.</p>
        ${report}
      `, lead.token),
    }
    case 3: return {
      subject: `${f}, can your current opener handle the new door?`,
      html: shell(`
        <h2 style="margin:0 0 12px">The opener question everyone skips</h2>
        <p>A new door is usually heavier and better sealed than the one it replaces. An older opener that "still works" may strain, fail early, or skip the safety reversal test with the new weight.</p>
        <p>Good background reads: <a href="${SITE}/replace-old-garage-door-opener" style="color:#00a02e">should you replace an opener that still works?</a> and <a href="${SITE}/garage-door-logic-board-repair-tyler-tx" style="color:#00a02e">signs an opener's electronics are failing</a>.</p>
        <p>We test your opener as part of the free measurement — no guessing.</p>
        ${book}
      `, lead.token),
    }
    default: return {
      subject: `${f}, ready to turn your ${money.format(lead.retailPriceSnapshot)} estimate into an exact quote?`,
      html: shell(`
        <h2 style="margin:0 0 12px">The last step is a tape measure</h2>
        <p>Your online estimate of <strong>${money.format(lead.retailPriceSnapshot)}</strong> is a realistic starting point. What it can't see: your exact opening, side room, headroom, track condition, framing, and opener.</p>
        <p>A free 30-minute measurement turns it into a firm written quote — and if a repair is the smarter call, we'll tell you that instead.</p>
        ${book}
        <p style="font-size:13px;color:#888">This is the last scheduled email about your estimate. Your report link stays live if you need it later.</p>
      `, lead.token),
    }
  }
}
