// The "Garage Door Buyer Report" — a five-page personalized PDF that is the
// lead magnet's deliverable. Price adjustments are computed with the real
// pricing engine, not canned copy, so every number matches the estimator.
import { readFile } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib"
import { calculateDoorPrice, validateSelection } from "./pricing"
import type { DoorEstimatorConfig, DoorSelection, PriceBreakdown } from "./types"

const GREEN = rgb(0, 0.85, 0.28)
const BLACK = rgb(0.04, 0.04, 0.04)
const GRAY = rgb(0.42, 0.42, 0.42)
const LIGHT = rgb(0.94, 0.94, 0.94)
const PAGE: [number, number] = [612, 792]
const MARGIN = 54
const WIDTH = PAGE[0] - MARGIN * 2
const OFFICE_PHONE = "(903) 245-1182"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export type LeadInfo = { firstName: string; zip: string }

type Ctx = {
  pdf: PDFDocument
  helv: PDFFont
  bold: PDFFont
  logo: PDFImage | null
  pageNo: number
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) { lines.push(line); line = word }
    else line = candidate
  }
  if (line) lines.push(line)
  return lines
}

function newPage(ctx: Ctx, title: string): { page: PDFPage; y: number } {
  const page = ctx.pdf.addPage(PAGE)
  ctx.pageNo += 1
  page.drawRectangle({ x: 0, y: 792 - 84, width: 612, height: 84, color: BLACK })
  if (ctx.logo) {
    const w = 132
    const h = w * (ctx.logo.height / ctx.logo.width)
    page.drawImage(ctx.logo, { x: MARGIN, y: 792 - 84 + (84 - h) / 2, width: w, height: h })
  }
  page.drawText("GARAGE DOOR BUYER REPORT", { x: 612 - MARGIN - ctx.bold.widthOfTextAtSize("GARAGE DOOR BUYER REPORT", 12), y: 792 - 44, size: 12, font: ctx.bold, color: GREEN })
  page.drawText(title, { x: 612 - MARGIN - ctx.helv.widthOfTextAtSize(title, 9.5), y: 792 - 60, size: 9.5, font: ctx.helv, color: rgb(0.75, 0.75, 0.75) })
  // footer
  page.drawLine({ start: { x: MARGIN, y: 52 }, end: { x: MARGIN + WIDTH, y: 52 }, thickness: 0.5, color: LIGHT })
  page.drawText("StraightShot Overhead — East Texas", { x: MARGIN, y: 38, size: 8.5, font: ctx.bold, color: BLACK })
  page.drawText(`Office: ${OFFICE_PHONE}  ·  straightshotoverhead.com`, { x: MARGIN, y: 26, size: 8.5, font: ctx.helv, color: GRAY })
  const pn = `Page ${ctx.pageNo} of 5`
  page.drawText(pn, { x: 612 - MARGIN - ctx.helv.widthOfTextAtSize(pn, 8.5), y: 32, size: 8.5, font: ctx.helv, color: GRAY })
  return { page, y: 792 - 118 }
}

function heading(ctx: Ctx, page: PDFPage, y: number, text: string): number {
  page.drawText(text, { x: MARGIN, y, size: 19, font: ctx.bold, color: BLACK })
  return y - 26
}

function sub(ctx: Ctx, page: PDFPage, y: number, text: string, size = 10): number {
  for (const line of wrap(text, ctx.helv, size, WIDTH)) {
    page.drawText(line, { x: MARGIN, y, size, font: ctx.helv, color: GRAY })
    y -= size + 3.5
  }
  return y - 4
}

function bullet(ctx: Ctx, page: PDFPage, y: number, text: string, opts: { boldLead?: string; size?: number } = {}): number {
  const size = opts.size ?? 10.5
  page.drawCircle({ x: MARGIN + 4, y: y + 3.5, size: 2.4, color: GREEN })
  const x = MARGIN + 16
  const maxWidth = WIDTH - 16
  if (opts.boldLead) {
    const leadWidth = ctx.bold.widthOfTextAtSize(opts.boldLead + " ", size)
    page.drawText(opts.boldLead, { x, y, size, font: ctx.bold, color: BLACK })
    const rest = wrap(text, ctx.helv, size, maxWidth - leadWidth)
    if (rest.length) page.drawText(rest[0], { x: x + leadWidth, y, size, font: ctx.helv, color: BLACK })
    y -= size + 5
    const remaining = text.slice(rest[0]?.length ?? 0).trim()
    for (const line of remaining ? wrap(remaining, ctx.helv, size, maxWidth) : []) {
      page.drawText(line, { x, y, size, font: ctx.helv, color: BLACK })
      y -= size + 5
    }
    return y - 3
  }
  for (const line of wrap(text, ctx.helv, size, maxWidth)) {
    page.drawText(line, { x, y, size, font: ctx.helv, color: BLACK })
    y -= size + 5
  }
  return y - 3
}

function checkboxRow(ctx: Ctx, page: PDFPage, y: number, text: string, size = 10.5): number {
  page.drawRectangle({ x: MARGIN, y: y - 2, width: 11, height: 11, borderColor: GRAY, borderWidth: 1 })
  for (const [i, line] of wrap(text, ctx.helv, size, WIDTH - 22).entries()) {
    page.drawText(line, { x: MARGIN + 20, y: y - i * (size + 4.5), size, font: ctx.helv, color: BLACK })
  }
  const lines = wrap(text, ctx.helv, size, WIDTH - 22).length
  return y - lines * (size + 4.5) - 7
}

const describe = (config: DoorEstimatorConfig, selection: DoorSelection) => {
  const parts = validateSelection(config, selection, "website")
  return parts
}

// A candidate cheaper/upgraded variant of the visitor's selection. Returns null
// if the variant is invalid (e.g. the style doesn't exist in that construction)
// or doesn't change the price in the intended direction.
function priceVariant(config: DoorEstimatorConfig, base: DoorSelection, patch: Partial<DoorSelection>): PriceBreakdown | null {
  try {
    const candidate = { ...base, ...patch }
    const parts = validateSelection(config, candidate, "website")
    void parts
    return calculateDoorPrice(config, candidate, "website")
  } catch {
    return null
  }
}

export async function buildBuyerReport(config: DoorEstimatorConfig, selection: DoorSelection, breakdown: PriceBreakdown, lead: LeadInfo, generatedOn: string): Promise<Uint8Array> {
  const { construction, style, color, window: windowChoice, opener } = describe(config, selection)
  const pdf = await PDFDocument.create()
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let logo: PDFImage | null = null
  try { logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "logo.png"))) } catch { /* text header still works */ }
  const ctx: Ctx = { pdf, helv, bold, logo, pageNo: 0 }

  // ---------------- Page 1 — Your Door Plan ----------------
  {
    const { page } = newPage(ctx, `Prepared for ${lead.firstName} · ZIP ${lead.zip} · ${generatedOn}`)
    let y = 792 - 118
    y = heading(ctx, page, y, `${lead.firstName}, here is your door plan`)
    y = sub(ctx, page, y, "Built with the 60-Second East Texas Garage Door Price Planner. Every number in this report uses the same live pricing as our estimator.")
    y -= 6

    const rows: Array<[string, string]> = [
      ["Quantity", String(selection.quantity)],
      ["Door size", `${selection.width} ft wide x ${selection.height} ft tall`],
      ["Construction", construction.publicName],
      ["Style", style.publicName],
      ["Color", color.publicName],
      ["Windows", windowChoice.publicName],
      ["Opener", opener.publicName],
    ]
    for (const [label, value] of rows) {
      page.drawLine({ start: { x: MARGIN, y: y - 7 }, end: { x: MARGIN + WIDTH, y: y - 7 }, thickness: 0.5, color: LIGHT })
      page.drawText(label, { x: MARGIN, y, size: 11, font: helv, color: GRAY })
      page.drawText(value, { x: MARGIN + WIDTH - bold.widthOfTextAtSize(value, 11), y, size: 11, font: bold, color: BLACK })
      y -= 23
    }

    y -= 12
    page.drawRectangle({ x: MARGIN, y: y - 48, width: WIDTH, height: 70, color: rgb(0.965, 0.985, 0.968) })
    page.drawRectangle({ x: MARGIN, y: y - 48, width: 4, height: 70, color: GREEN })
    page.drawText("ESTIMATED INSTALLED PRICE", { x: MARGIN + 18, y: y - 2, size: 10, font: bold, color: GRAY })
    page.drawText(money.format(breakdown.retailPrice), { x: MARGIN + 18, y: y - 34, size: 26, font: bold, color: BLACK })
    const inc = "Standard installation, removal & disposal included"
    page.drawText(inc, { x: MARGIN + WIDTH - 18 - helv.widthOfTextAtSize(inc, 10), y: y - 30, size: 10, font: helv, color: GRAY })
    y -= 82

    const disclaimer = `PRELIMINARY ESTIMATE — NOT A FINAL QUOTE. ${config.websiteDisclaimer} A StraightShot technician verifies measurements, clearance, framing, tracks, springs, and opener compatibility on-site before any price is final.`
    const lines = wrap(disclaimer, helv, 9.5, WIDTH - 24)
    const boxH = lines.length * 13 + 22
    page.drawRectangle({ x: MARGIN, y: y - boxH + 12, width: WIDTH, height: boxH, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.75 })
    let ty = y - 4
    for (const line of lines) { page.drawText(line, { x: MARGIN + 12, y: ty, size: 9.5, font: helv, color: GRAY }); ty -= 13 }
    y = y - boxH - 14

    page.drawText("What's in this report", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 20
    for (const item of [
      "Real ways to lower — or smartly raise — this price, with exact dollar amounts",
      "Whether repairing your current door could still make sense",
      "The quote-comparison sheet: what every complete garage door quote must include",
      "What happens at a free StraightShot measurement, and the questions to ask anyone who quotes you",
    ]) y = bullet(ctx, page, y, item)
  }

  // ---------------- Page 2 — Ways to Adjust the Price ----------------
  {
    const { page } = newPage(ctx, "Your best-fit options")
    let y = 792 - 118
    y = heading(ctx, page, y, "Ways to adjust your price")
    y = sub(ctx, page, y, "These are computed from your exact configuration, not generic advice. Each line shows the new estimated installed price if you change just that one thing.")
    y -= 4

    page.drawText("Where you could save", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 20

    const savers: Array<{ label: string; result: PriceBreakdown | null }> = []
    if (selection.constructionCode !== "essential") {
      const cheaper = selection.constructionCode === "premium" ? "comfort" : "essential"
      const parts = priceVariant(config, selection, { constructionCode: cheaper as DoorSelection["constructionCode"] })
      const name = config.constructions.find(c => c.code === cheaper)?.publicName ?? cheaper
      savers.push({ label: `Step down to ${name} construction`, result: parts })
    }
    if (selection.windowCode !== "none") savers.push({ label: "Skip the windows", result: priceVariant(config, selection, { windowCode: "none" }) })
    if (selection.openerCode !== "keep-existing") savers.push({ label: "Keep your existing opener (if it passes inspection)", result: priceVariant(config, selection, { openerCode: "keep-existing" }) })

    let printedSavers = 0
    for (const saver of savers) {
      if (!saver.result || saver.result.retailPrice >= breakdown.retailPrice) continue
      const delta = breakdown.retailPrice - saver.result.retailPrice
      y = bullet(ctx, page, y, `— new estimate ${money.format(saver.result.retailPrice)} (saves ${money.format(delta)})`, { boldLead: saver.label })
      printedSavers++
    }
    if (!printedSavers) y = bullet(ctx, page, y, "You have already configured our most budget-friendly build for this size. The next lever is the door size itself — confirmed at measurement.")
    y -= 6

    page.drawText("Upgrades probably worth considering", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 20
    let printedUpgrades = 0
    if (selection.constructionCode === "essential") {
      const insulated = priceVariant(config, selection, { constructionCode: "comfort" })
      if (insulated) {
        y = bullet(ctx, page, y, `— insulation makes a real difference in East Texas heat, and the door runs quieter. New estimate ${money.format(insulated.retailPrice)} (+${money.format(insulated.retailPrice - breakdown.retailPrice)}).`, { boldLead: "Insulated construction:" })
        printedUpgrades++
      }
    }
    if (selection.openerCode === "keep-existing") {
      const battery = priceVariant(config, selection, { openerCode: "battery-belt" })
      if (battery) {
        y = bullet(ctx, page, y, `— a new door is heavier than an old worn one, and openers past ~10 years often fail compatibility. Adding a quiet belt opener with battery backup brings the estimate to ${money.format(battery.retailPrice)} (+${money.format(battery.retailPrice - breakdown.retailPrice)}).`, { boldLead: "Plan for the opener:" })
        printedUpgrades++
      }
    }
    if (!printedUpgrades) {
      y = bullet(ctx, page, y, "Your configuration already covers the upgrades we most often recommend for East Texas homes — insulation and a modern opener.")
    }
    y -= 6

    page.drawText("Where you probably should NOT cut", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 20
    for (const item of [
      "Springs matched to the new door's weight — reusing old springs on a heavier door is the #1 cause of early failures.",
      "Removal & disposal — already included in your estimate; in cheap quotes it often appears later as a surprise line item.",
      "Safety sensors and a proper reversal test on install day.",
    ]) y = bullet(ctx, page, y, item)

    y -= 8
    y = sub(ctx, page, y, `Insulation note for ZIP ${lead.zip}: if the garage is attached, shares a wall with living space, or is used as a shop, insulated construction usually pays for itself in comfort. For a detached, rarely used garage, non-insulated is a reasonable saving.`)
  }

  // ---------------- Page 3 — Repair or Replace ----------------
  {
    const { page } = newPage(ctx, "Repair-or-replace scorecard")
    let y = 792 - 118
    y = heading(ctx, page, y, "Should you even replace it?")
    y = sub(ctx, page, y, "Honest answer: not every door needs replacing. Check every box that applies to your current door, then read the score below.")
    y -= 4
    for (const item of [
      "The door is more than 15 years old",
      "Panels are cracked, rotted, rusted through, or badly dented",
      "It has been off-track or had cables replaced more than once",
      "Sections are separating, or the door looks wavy across its face",
      "The door is loud, shakes, or slams even after lubrication",
      "Repairs in the last 2 years add up to more than a few hundred dollars",
      "It is a wood door with moisture damage at the bottom sections",
      "You want insulation, quieter operation, or a new look anyway",
    ]) y = checkboxRow(ctx, page, y, item)

    y -= 8
    page.drawRectangle({ x: MARGIN, y: y - 86, width: WIDTH, height: 104, color: rgb(0.965, 0.985, 0.968) })
    page.drawRectangle({ x: MARGIN, y: y - 86, width: 4, height: 104, color: GREEN })
    let sy = y - 2
    page.drawText("How to read your score", { x: MARGIN + 16, y: sy, size: 11, font: bold, color: BLACK }); sy -= 18
    for (const [leadText, rest] of [
      ["0–2 boxes:", "repair is probably the smart move. Ask us about spring, roller, and panel-level fixes first."],
      ["3–4 boxes:", "borderline — get the full system inspected before spending on either path."],
      ["5+ boxes:", "replacement is usually the better investment; repairs at this stage tend to chase a failing door."],
    ] as const) {
      page.drawText(leadText, { x: MARGIN + 16, y: sy, size: 10, font: bold, color: BLACK })
      const lx = MARGIN + 16 + bold.widthOfTextAtSize(leadText + " ", 10)
      page.drawText(rest, { x: lx, y: sy, size: 10, font: helv, color: BLACK })
      sy -= 16
    }
    sy -= 2
    page.drawText("Either way, the inspection is free — and we will tell you if a repair is the better call.", { x: MARGIN + 16, y: sy, size: 9.5, font: helv, color: GRAY })
    y = y - 104 - 16

    y = sub(ctx, page, y, "Things an inspection catches that a homeowner usually cannot: spring cycle life remaining, track wear, opener force settings, framing rot behind the trim, and whether your opening is actually square.")
  }

  // ---------------- Page 4 — Quote Comparison Sheet ----------------
  {
    const { page } = newPage(ctx, "Compare any quotes side by side")
    let y = 792 - 118
    y = heading(ctx, page, y, "What every complete quote must include")
    y = sub(ctx, page, y, "Print this page and check off each line for every quote you collect. An unusually low quote is usually missing rows from this list — and they reappear as add-ons on install day.")
    y -= 2

    const col1 = MARGIN, colA = MARGIN + WIDTH - 130, colB = MARGIN + WIDTH - 60
    page.drawText("Included in the quote?", { x: col1, y, size: 10, font: bold, color: GRAY })
    page.drawText("Quote A", { x: colA - 8, y, size: 10, font: bold, color: GRAY })
    page.drawText("Quote B", { x: colB - 8, y, size: 10, font: bold, color: GRAY })
    y -= 18
    for (const item of [
      "The door itself — exact model, gauge, insulation R-value",
      "Standard installation labor",
      "Removal and disposal of the old door",
      "NEW springs rated for the new door's weight",
      "Track inspection / replacement if worn",
      "New rollers and hinges (not reused old hardware)",
      "Bottom seal and perimeter weather seal",
      "Opener compatibility check, adjustment, or replacement",
      "Reconnect and test safety sensors + reversal test",
      "Written warranty: parts, door, and labor terms",
      "A firm written total — not an 'estimate subject to extras'",
    ]) {
      page.drawLine({ start: { x: col1, y: y - 6 }, end: { x: MARGIN + WIDTH, y: y - 6 }, thickness: 0.4, color: LIGHT })
      const lines = wrap(item, helv, 10, colA - col1 - 24)
      for (const [i, line] of lines.entries()) page.drawText(line, { x: col1, y: y - i * 13, size: 10, font: helv, color: BLACK })
      page.drawRectangle({ x: colA, y: y - 2, width: 11, height: 11, borderColor: GRAY, borderWidth: 1 })
      page.drawRectangle({ x: colB, y: y - 2, width: 11, height: 11, borderColor: GRAY, borderWidth: 1 })
      y -= lines.length * 13 + 9
    }
    y -= 4
    y = sub(ctx, page, y, `For reference: your StraightShot estimate of ${money.format(breakdown.retailPrice)} already includes standard installation, removal, and disposal — and our on-site quote itemizes every remaining row above.`)
  }

  // ---------------- Page 5 — Next Steps ----------------
  {
    const { page } = newPage(ctx, "Turn this estimate into an exact quote")
    let y = 792 - 118
    y = heading(ctx, page, y, "Next step: the free exact-price measurement")
    y = sub(ctx, page, y, "An online planner cannot see your opening dimensions, clearance, framing, track condition, or opener. A 30-minute visit turns this preliminary number into a firm quote — before any work begins.")
    y -= 2

    page.drawText("What happens during a StraightShot measurement", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 20
    for (const item of [
      "We measure the opening, side room, headroom, and backroom clearance.",
      "We inspect the tracks, springs, framing, and existing hardware.",
      "We test your current opener and confirm whether it can run the new door safely.",
      "We confirm product availability for your exact style, color, and windows.",
      "You get a firm written quote — and if a repair is the smarter call, we will say so.",
    ]) y = bullet(ctx, page, y, item)
    y -= 6

    page.drawText("Questions to ask anyone who quotes you (including us)", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 20
    for (const item of [
      "Are the springs new, and are they rated for this door's weight?",
      "Is removal and disposal of my old door included in this number?",
      "What exactly does the warranty cover — door, parts, and labor?",
      "Will you test my opener and the safety sensors before you leave?",
      "Is this a firm total, or can it change after work starts?",
    ]) y = bullet(ctx, page, y, item)
    y -= 14

    page.drawRectangle({ x: MARGIN, y: y - 74, width: WIDTH, height: 92, color: BLACK })
    page.drawText("BOOK MY FREE EXACT-PRICE MEASUREMENT", { x: MARGIN + 20, y: y - 6, size: 13, font: bold, color: GREEN })
    page.drawText(`Call or text our office: ${OFFICE_PHONE}`, { x: MARGIN + 20, y: y - 30, size: 15, font: bold, color: rgb(1, 1, 1) })
    page.drawText("Mon–Fri 8am–6pm · Sat 8am–4pm · straightshotoverhead.com", { x: MARGIN + 20, y: y - 50, size: 10, font: helv, color: rgb(0.75, 0.75, 0.75) })
    page.drawText("No pressure, no obligation — measurement and quote are free.", { x: MARGIN + 20, y: y - 66, size: 10, font: helv, color: rgb(0.75, 0.75, 0.75) })
  }

  return pdf.save()
}
