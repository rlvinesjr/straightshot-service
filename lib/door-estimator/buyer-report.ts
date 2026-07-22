// The Garage Door Buyer Report — three pages, rebuilt to the owner's audit:
// page 1 the straight answer, page 2 the smartest options, page 3 the quote
// comparison. Numbers are computed with the live pricing engine; the voice is
// a helpful local technician, not a contract.
import { readFile } from "node:fs/promises"
import path from "node:path"
import QRCode from "qrcode"
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib"
import { calculateDoorPrice, validateSelection } from "./pricing"
import type { DoorEstimatorConfig, DoorSelection, PriceBreakdown } from "./types"

const GREEN = rgb(0, 0.85, 0.28)
const GREEN_PALE = rgb(0.965, 0.985, 0.968)
const BLACK = rgb(0.04, 0.04, 0.04)
const GRAY = rgb(0.38, 0.38, 0.38)
const LIGHT = rgb(0.92, 0.92, 0.92)
const WHITE = rgb(1, 1, 1)
const PAGE: [number, number] = [612, 792]
const MARGIN = 50
const WIDTH = PAGE[0] - MARGIN * 2
const OFFICE_PHONE = "(903) 245-1182"
// SMSTO works with every mainstream camera app; a homeowner scanning the
// printed report lands in a pre-addressed text to the office.
const BOOKING_QR_PAYLOAD = "SMSTO:9032451182:Hi StraightShot - I'd like to book my free garage door measurement."

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

export type LeadInfo = { firstName: string; zip: string }

type Ctx = { pdf: PDFDocument; helv: PDFFont; bold: PDFFont; logo: PDFImage | null; qr: PDFImage; pageNo: number }

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

function newPage(ctx: Ctx, subtitle: string): PDFPage {
  const page = ctx.pdf.addPage(PAGE)
  ctx.pageNo += 1
  page.drawRectangle({ x: 0, y: 792 - 76, width: 612, height: 76, color: BLACK })
  if (ctx.logo) {
    const w = 120
    const h = w * (ctx.logo.height / ctx.logo.width)
    page.drawImage(ctx.logo, { x: MARGIN, y: 792 - 76 + (76 - h) / 2, width: w, height: h })
  }
  page.drawText("GARAGE DOOR BUYER REPORT", { x: 612 - MARGIN - ctx.bold.widthOfTextAtSize("GARAGE DOOR BUYER REPORT", 13), y: 792 - 40, size: 13, font: ctx.bold, color: GREEN })
  page.drawText(subtitle, { x: 612 - MARGIN - ctx.helv.widthOfTextAtSize(subtitle, 9.5), y: 792 - 56, size: 9.5, font: ctx.helv, color: rgb(0.75, 0.75, 0.75) })
  page.drawLine({ start: { x: MARGIN, y: 46 }, end: { x: MARGIN + WIDTH, y: 46 }, thickness: 0.5, color: LIGHT })
  page.drawText("Preliminary estimate — your firm written quote comes after the free on-site measurement.", { x: MARGIN, y: 33, size: 8.5, font: ctx.helv, color: GRAY })
  const pn = `StraightShot Overhead · ${OFFICE_PHONE} · straightshotoverhead.com · Page ${ctx.pageNo} of 3`
  page.drawText(pn, { x: MARGIN, y: 21, size: 8.5, font: ctx.helv, color: GRAY })
  return page
}

function para(ctx: Ctx, page: PDFPage, y: number, text: string, opts: { size?: number; color?: ReturnType<typeof rgb>; font?: PDFFont; x?: number; width?: number; lineGap?: number } = {}): number {
  const size = opts.size ?? 10.5
  const font = opts.font ?? ctx.helv
  const x = opts.x ?? MARGIN
  const width = opts.width ?? WIDTH
  for (const line of wrap(text, font, size, width)) {
    page.drawText(line, { x, y, size, font, color: opts.color ?? BLACK })
    y -= size + (opts.lineGap ?? 4)
  }
  return y
}

function check(ctx: Ctx, page: PDFPage, x: number, y: number, text: string, size = 10.5, width = WIDTH - 18): number {
  // vector checkmark — the standard PDF fonts cannot encode "✓"
  page.drawLine({ start: { x: x + 1, y: y + 3.5 }, end: { x: x + 3.8, y: y + 0.8 }, thickness: 1.6, color: GREEN })
  page.drawLine({ start: { x: x + 3.8, y: y + 0.8 }, end: { x: x + 9.5, y: y + 7 }, thickness: 1.6, color: GREEN })
  return para(ctx, page, y, text, { x: x + 16, width, size }) - 3
}

function box(ctx: Ctx, page: PDFPage, x: number, y: number, w: number, h: number, accent = true) {
  page.drawRectangle({ x, y: y - h, width: w, height: h, color: GREEN_PALE })
  if (accent) page.drawRectangle({ x, y: y - h, width: 4, height: h, color: GREEN })
}

function priceVariant(config: DoorEstimatorConfig, base: DoorSelection, patch: Partial<DoorSelection>): PriceBreakdown | null {
  try {
    return calculateDoorPrice(config, { ...base, ...patch }, "website")
  } catch {
    return null
  }
}

export async function buildBuyerReport(config: DoorEstimatorConfig, selection: DoorSelection, breakdown: PriceBreakdown, lead: LeadInfo, generatedOn: string): Promise<Uint8Array> {
  const { construction, style, color, window: windowChoice, opener } = validateSelection(config, selection, "website")
  const pdf = await PDFDocument.create()
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let logo: PDFImage | null = null
  try { logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "logo.png"))) } catch { /* header text still identifies us */ }
  const qrPng = await QRCode.toBuffer(BOOKING_QR_PAYLOAD, { margin: 1, width: 240, color: { dark: "#000000", light: "#ffffff" } })
  const qr = await pdf.embedPng(qrPng)
  let doorPhoto: PDFImage | null = null
  if (style.imagePath) {
    try { doorPhoto = await pdf.embedJpg(await readFile(path.join(process.cwd(), "public", style.imagePath))) } catch { /* fall back to text-only table */ }
  }
  const ctx: Ctx = { pdf, helv, bold, logo, qr, pageNo: 0 }
  const first = lead.firstName
  const keptOpener = selection.openerCode === "keep-existing"

  const bookingBlock = (page: PDFPage, yInput: number, heading: string, sub2?: string) => {
    const h = 96
    // never let the box collide with the page footer at y=46
    const y = Math.max(yInput, 46 + 10 + h)
    page.drawRectangle({ x: MARGIN, y: y - h, width: WIDTH, height: h, color: BLACK })
    page.drawImage(ctx.qr, { x: MARGIN + WIDTH - 86, y: y - h + 18, width: 70, height: 70 })
    page.drawText("Scan to text us", { x: MARGIN + WIDTH - 86 + (70 - helv.widthOfTextAtSize("Scan to text us", 7.5)) / 2, y: y - h + 9, size: 7.5, font: helv, color: rgb(0.6, 0.6, 0.6) })
    page.drawText(heading, { x: MARGIN + 18, y: y - 24, size: 13.5, font: bold, color: GREEN })
    page.drawText(`Call or text ${OFFICE_PHONE}`, { x: MARGIN + 18, y: y - 46, size: 15, font: bold, color: WHITE })
    let sy = y - 64
    for (const line of wrap(sub2 ?? "Free 30-minute measurement + opener inspection. No pressure, no obligation.", helv, 9.5, WIDTH - 18 - 110)) {
      page.drawText(line, { x: MARGIN + 18, y: sy, size: 9.5, font: helv, color: rgb(0.78, 0.78, 0.78) })
      sy -= 12.5
    }
    return y - h
  }

  // ================= PAGE 1 — THE STRAIGHT ANSWER =================
  {
    const page = newPage(ctx, `Prepared for ${first} · ZIP ${lead.zip} · ${generatedOn}`)
    let y = 792 - 100
    y = para(ctx, page, y, `${first}, here's the straight answer on your garage door.`, { font: bold, size: 19, lineGap: 6 })
    y = para(ctx, page, y, `Based on the choices you made, your complete new ${selection.width} ft x ${selection.height} ft ${color.publicName.toLowerCase()} ${style.publicName.toLowerCase()} garage door system starts at ${money.format(breakdown.retailPrice)} installed.`, { size: 11, color: GRAY, lineGap: 4.5 })
    y -= 6

    // price box with inclusions
    box(ctx, page, MARGIN, y, WIDTH, 96)
    page.drawText("YOUR PRELIMINARY INSTALLED PRICE", { x: MARGIN + 18, y: y - 20, size: 9.5, font: bold, color: GRAY })
    page.drawText(money.format(breakdown.retailPrice), { x: MARGIN + 18, y: y - 50, size: 28, font: bold, color: BLACK })
    let iy = y - 20
    const incX = MARGIN + 250
    for (const item of ["Complete new garage-door system", "Standard residential installation", "Removal of your old door", "Disposal of the old door and materials"]) {
      iy = check(ctx, page, incX, iy, item, 10, WIDTH - 250 - 30)
    }
    y -= 108

    // selected door table + photo
    const tableWidth = doorPhoto ? WIDTH - 190 : WIDTH
    page.drawText("Your selected door", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    if (doorPhoto) {
      const pw = 172
      const ph = pw * 0.68
      page.drawRectangle({ x: MARGIN + WIDTH - pw - 4, y: y - ph - 8, width: pw + 4, height: ph + 4, color: LIGHT })
      page.drawImage(doorPhoto, { x: MARGIN + WIDTH - pw - 2, y: y - ph - 6, width: pw, height: ph })
    }
    y -= 18
    const rows: Array<[string, string]> = [
      ["Size", `${selection.width} ft x ${selection.height} ft${selection.quantity > 1 ? `  (x${selection.quantity} doors)` : ""}`],
      ["Construction", construction.publicName],
      ["Style", style.publicName],
      ["Color", color.publicName],
      ["Windows", windowChoice.publicName],
    ]
    for (const [label, value] of rows) {
      page.drawLine({ start: { x: MARGIN, y: y - 5 }, end: { x: MARGIN + tableWidth - 20, y: y - 5 }, thickness: 0.5, color: LIGHT })
      page.drawText(label, { x: MARGIN, y, size: 10.5, font: helv, color: GRAY })
      page.drawText(value, { x: MARGIN + tableWidth - 20 - bold.widthOfTextAtSize(value, 10.5), y, size: 10.5, font: bold, color: BLACK })
      y -= 18.5
    }
    y -= 6

    page.drawText("What “complete new door system” means", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 17
    y = para(ctx, page, y, "Your new-door price includes new sections, tracks, springs, cables, drums, rollers, hinges, seals, and standard door hardware. Nothing from the old door is quietly reused.", { color: GRAY, size: 10.5 })
    y -= 6

    page.drawText("Your opener plan", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 17
    if (keptOpener) {
      y = para(ctx, page, y, "At the measurement, we test your current opener and explain the best next step:", { color: GRAY })
      y -= 2
      y = check(ctx, page, MARGIN, y, "Keep using it if it is safe and compatible with the new door")
      y = check(ctx, page, MARGIN, y, "Service or adjust it under a separate quote you approve first")
      y = check(ctx, page, MARGIN, y, "Replace it only when necessary — and only after your approval")
    } else {
      y = para(ctx, page, y, `Your plan includes the ${opener.publicName}. At the measurement we confirm fit and wiring, and if your existing opener turns out to be worth keeping, we'll say so — page 2 shows exactly what that saves.`, { color: GRAY })
    }
    y -= 7

    page.drawText("What could change the estimate?", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 17
    y = para(ctx, page, y, "The final written price depends on verified measurements, access, framing, electrical or structural conditions, product availability, and any separately approved opener work. We know the worry with online prices — a teaser number that grows on install day. That is not how we work.", { color: GRAY })
    y -= 4
    y = para(ctx, page, y, "Our promise: you will see the written total before work begins. No mystery add-ons and no additional work without your approval.", { font: bold, size: 10.5 })
    y -= 10

    bookingBlock(page, y, "TURN THIS INTO A FIRM WRITTEN QUOTE")
  }

  // ================= PAGE 2 — YOUR SMARTEST OPTIONS =================
  {
    const page = newPage(ctx, "Your smartest options")
    let y = 792 - 106
    y = para(ctx, page, y, "Choose the right door, not just the lowest number.", { font: bold, size: 17, lineGap: 6 })
    y = para(ctx, page, y, "The right choice depends on where the garage is, how often you use it, and how much temperature and noise matter to you.", { size: 10.5, color: GRAY })
    y -= 8

    // current plan vs upgrade, side by side
    const colW = (WIDTH - 16) / 2
    const boxH = 148
    const upgrade = construction.code === "essential"
      ? { target: "comfort", title: "COMFORT UPGRADE", name: "Insulated Construction" }
      : construction.code === "comfort"
        ? { target: "premium", title: "PREMIUM UPGRADE", name: "Steel-Back Construction" }
        : null
    const upgraded = upgrade ? priceVariant(config, selection, { constructionCode: upgrade.target as DoorSelection["constructionCode"] }) : null

    box(ctx, page, MARGIN, y, colW, boxH)
    page.drawText("YOUR CURRENT PLAN", { x: MARGIN + 14, y: y - 18, size: 9, font: bold, color: GRAY })
    page.drawText(`${construction.publicName} — ${money.format(breakdown.retailPrice)}`, { x: MARGIN + 14, y: y - 36, size: 12, font: bold, color: BLACK })
    let cy = y - 56
    cy = para(ctx, page, cy, construction.code === "essential"
      ? "A practical choice when budget is the priority and the garage is detached or lightly used."
      : construction.code === "comfort"
        ? "A strong middle ground — insulated, quieter, and comfortable for attached garages."
        : "Our strongest, quietest build — you've picked the best construction we install.", { x: MARGIN + 14, width: colW - 28, size: 9.5, color: GRAY })
    cy -= 2
    for (const item of ["Complete new door system", `${color.publicName} ${style.publicName.toLowerCase()}`, windowChoice.code === "none" ? "No windows" : windowChoice.publicName, "Installation, removal & disposal"]) {
      cy = check(ctx, page, MARGIN + 14, cy, item, 9.5, colW - 42)
    }

    const rx = MARGIN + colW + 16
    if (upgrade && upgraded) {
      box(ctx, page, rx, y, colW, boxH)
      page.drawText(upgrade.title, { x: rx + 14, y: y - 18, size: 9, font: bold, color: GRAY })
      page.drawText(`${upgrade.name} — ${money.format(upgraded.retailPrice)}`, { x: rx + 14, y: y - 36, size: 12, font: bold, color: BLACK })
      page.drawText(`${money.format(upgraded.retailPrice - breakdown.retailPrice)} more than your current plan`, { x: rx + 14, y: y - 52, size: 9.5, font: helv, color: GRAY })
      let uy = y - 70
      uy = para(ctx, page, uy, "Worth considering when the garage is:", { x: rx + 14, width: colW - 28, size: 9.5, color: GRAY })
      for (const item of ["Attached to the home", "Used as a workshop", "Below or beside a bedroom", "Uncomfortable in hot or cold weather"]) {
        uy = check(ctx, page, rx + 14, uy, item, 9.5, colW - 42)
      }
    } else {
      box(ctx, page, rx, y, colW, boxH, false)
      page.drawText("A WORD FROM THE FIELD", { x: rx + 14, y: y - 18, size: 9, font: bold, color: GRAY })
      para(ctx, page, y - 38, "Most attached-garage calls start the same way: the room over the garage is hot in July and the door rattles at 6 a.m. Insulated, steel-backed construction fixes both — and you've already chosen it.", { x: rx + 14, width: colW - 28, size: 9.5, color: GRAY })
    }
    y -= boxH + 18

    page.drawText("Ways to keep the project closer to your current estimate", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 17
    const savers: string[] = []
    if (selection.windowCode !== "none") {
      const v = priceVariant(config, selection, { windowCode: "none" })
      if (v && v.retailPrice < breakdown.retailPrice) savers.push(`Skip the windows — new estimate ${money.format(v.retailPrice)} (saves ${money.format(breakdown.retailPrice - v.retailPrice)})`)
    }
    if (!keptOpener) {
      const v = priceVariant(config, selection, { openerCode: "keep-existing" })
      if (v && v.retailPrice < breakdown.retailPrice) savers.push(`Keep your current opener if it passes inspection — new estimate ${money.format(v.retailPrice)} (saves ${money.format(breakdown.retailPrice - v.retailPrice)})`)
    }
    if (construction.code !== "essential") {
      const v = priceVariant(config, selection, { constructionCode: construction.code === "premium" ? "comfort" : "essential" })
      if (v && v.retailPrice < breakdown.retailPrice) savers.push(`Step down one construction level — new estimate ${money.format(v.retailPrice)} (saves ${money.format(breakdown.retailPrice - v.retailPrice)})`)
    }
    if (color.code !== "white") savers.push("Standard white finish is our most budget-friendly color option")
    savers.push("Avoid structural, framing, or electrical changes where none are needed")
    if (savers.length < 3) savers.unshift("You've already configured this build close to its most budget-friendly form")
    for (const saver of savers.slice(0, 4)) y = check(ctx, page, MARGIN, y, saver, 10)
    y -= 8

    page.drawText("Should you repair instead?", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 17
    const halfW = (WIDTH - 20) / 2
    page.drawText("Repair may make more sense when:", { x: MARGIN, y, size: 9.5, font: bold, color: GRAY })
    page.drawText("Replacement may make more sense when:", { x: MARGIN + halfW + 20, y, size: 9.5, font: bold, color: GRAY })
    y -= 15
    const repairs = ["Sections are straight and structurally sound", "The problem is isolated to springs, rollers, cables, or the opener", "You're happy with the look and insulation", "Repairs haven't become frequent"]
    const replaces = ["Sections are cracked, separating, or rusted", "Several components are worn at once", "Repairs are becoming frequent", "You want quieter operation, insulation, or a new look"]
    let ly = y, ry = y
    for (const item of repairs) ly = check(ctx, page, MARGIN, ly, item, 9, halfW - 18)
    for (const item of replaces) ry = check(ctx, page, MARGIN + halfW + 20, ry, item, 9, halfW - 18)
    y = Math.min(ly, ry) - 4
    y = para(ctx, page, y, "If repair is the smarter move, we will tell you. This report exists to help you make a good decision — not to pressure you into replacing a repairable door.", { font: bold, size: 10 })
    y -= 10

    page.drawText("Quick opener checklist — what we evaluate at the measurement", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 17
    const opChecks = ["Is the opener properly sized for the new, heavier door?", "Does it run smoothly and consistently?", "Do the safety sensors and reversal system pass testing?", "Are the rail, controls, and wiring in serviceable condition?"]
    for (const item of opChecks) {
      page.drawRectangle({ x: MARGIN, y: y - 1, width: 10, height: 10, borderColor: GRAY, borderWidth: 1 })
      y = para(ctx, page, y, item, { x: MARGIN + 18, size: 9.5 }) - 3
    }
  }

  // ================= PAGE 3 — COMPARE EVERY QUOTE =================
  {
    const page = newPage(ctx, "Compare every quote before signing")
    let y = 792 - 106
    y = para(ctx, page, y, "A low number isn't always a complete number.", { font: bold, size: 17, lineGap: 6 })
    y = para(ctx, page, y, "Some garage-door quotes look inexpensive because important items are missing — and those items come back later as change orders and installation-day surprises. Print this page and check every line for each quote you collect, including ours.", { size: 10.5, color: GRAY })
    y -= 10

    const colA = MARGIN + WIDTH - 120
    const colB = MARGIN + WIDTH - 55
    page.drawText("WHAT EVERY COMPLETE QUOTE SHOULD CLEARLY STATE", { x: MARGIN, y, size: 9.5, font: bold, color: GRAY })
    page.drawText("Quote A", { x: colA - 10, y, size: 9.5, font: bold, color: GRAY })
    page.drawText("Quote B", { x: colB - 10, y, size: 9.5, font: bold, color: GRAY })
    y -= 17
    const items = [
      "Exact door model, construction, color, and options",
      "New door sections or panels",
      "New vertical and horizontal tracks",
      "New springs, cables, and drums",
      "New rollers, hinges, seals, and hardware",
      "Standard installation labor",
      "Removal and disposal of the old door",
      "Opener work clearly included or excluded",
      "Safety-sensor and reversal testing",
      "Manufacturer, parts, and labor warranties",
      "Taxes, travel charges, and possible extras",
      "Firm written total before work begins",
    ]
    for (const item of items) {
      page.drawLine({ start: { x: MARGIN, y: y - 6 }, end: { x: MARGIN + WIDTH, y: y - 6 }, thickness: 0.4, color: LIGHT })
      page.drawText(item, { x: MARGIN, y, size: 10.5, font: helv, color: BLACK })
      page.drawRectangle({ x: colA, y: y - 2, width: 11, height: 11, borderColor: GRAY, borderWidth: 1 })
      page.drawRectangle({ x: colB, y: y - 2, width: 11, height: 11, borderColor: GRAY, borderWidth: 1 })
      y -= 22.5
    }
    y -= 2
    y = para(ctx, page, y, "Watch for this: a quote that doesn't identify what is new, reused, adjusted, or excluded is not yet a complete quote.", { font: bold, size: 10 })
    y -= 10

    page.drawText("How we turn your estimate into a firm price", { x: MARGIN, y, size: 13, font: bold, color: BLACK })
    y -= 17
    const steps: Array<[string, string]> = [
      ["1. Reserve a measurement", "about 30 minutes, at a time that suits you."],
      ["2. We measure and inspect", "opening, clearances, framing, access, and your current opener."],
      ["3. We confirm the build", "your exact configuration, availability, and opener recommendation."],
      ["4. You get a written quote", "price, inclusions, warranties, and options — before approving anything."],
    ]
    const stepW = (WIDTH - 16) / 2
    for (let i = 0; i < steps.length; i++) {
      const sx = MARGIN + (i % 2) * (stepW + 16)
      const sy = y - Math.floor(i / 2) * 42
      page.drawText(steps[i][0], { x: sx, y: sy, size: 10, font: bold, color: BLACK })
      para(ctx, page, sy - 13, steps[i][1], { x: sx, width: stepW, size: 9, color: GRAY, lineGap: 2.5 })
    }
    y -= 42 * 2 + 8

    const after = bookingBlock(page, y, "BOOK YOUR FREE MEASUREMENT + OPENER INSPECTION", "Mon–Fri 8am–6pm · Sat 8am–4pm · Questions welcome — a real person from our East Texas team answers.")
    void after
  }

  return pdf.save()
}
