import { readFile } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { calculateDoorPrice, validateSelection } from "@/lib/door-estimator/pricing"
import type { DoorSelection } from "@/lib/door-estimator/types"

const GREEN = rgb(0, 0.85, 0.28)
const BLACK = rgb(0.04, 0.04, 0.04)
const GRAY = rgb(0.42, 0.42, 0.42)
const LIGHT = rgb(0.94, 0.94, 0.94)
const OFFICE_PHONE = "(903) 245-1182"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

// Stateless by design: builds the PDF and returns it. No customer data is
// collected or stored — the estimate belongs to the visitor.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { selection?: DoorSelection }
    if (!body.selection) return jsonError("A door selection is required", 400, publicCorsHeaders(request))

    const config = await loadDoorEstimatorConfig()
    const { construction, style, color, window: windowChoice, opener } = validateSelection(config, body.selection, "website")
    const breakdown = calculateDoorPrice(config, body.selection, "website")
    const selection = body.selection

    const pdf = await PDFDocument.create()
    const page = pdf.addPage([612, 792])
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const margin = 54
    const width = 612 - margin * 2

    // header band with the white-text logo
    page.drawRectangle({ x: 0, y: 792 - 110, width: 612, height: 110, color: BLACK })
    try {
      const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "logo.png")))
      const logoWidth = 168
      page.drawImage(logo, { x: margin, y: 792 - 110 + (110 - logoWidth * (logo.height / logo.width)) / 2, width: logoWidth, height: logoWidth * (logo.height / logo.width) })
    } catch { /* logo missing — header text still identifies the document */ }
    page.drawText("PRELIMINARY ESTIMATE", { x: 612 - margin - bold.widthOfTextAtSize("PRELIMINARY ESTIMATE", 15), y: 792 - 58, size: 15, font: bold, color: GREEN })
    const dateLine = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago" })
    page.drawText(dateLine, { x: 612 - margin - helv.widthOfTextAtSize(dateLine, 10), y: 792 - 76, size: 10, font: helv, color: rgb(0.75, 0.75, 0.75) })

    let y = 792 - 150
    page.drawText("Your Garage Door", { x: margin, y, size: 20, font: bold, color: BLACK })
    y -= 12
    page.drawText("Configured at estimate.straightshotoverhead.com", { x: margin, y, size: 9.5, font: helv, color: GRAY })
    y -= 26

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
      page.drawLine({ start: { x: margin, y: y - 7 }, end: { x: margin + width, y: y - 7 }, thickness: 0.5, color: LIGHT })
      page.drawText(label, { x: margin, y, size: 11, font: helv, color: GRAY })
      page.drawText(value, { x: margin + width - bold.widthOfTextAtSize(value, 11), y, size: 11, font: bold, color: BLACK })
      y -= 24
    }

    // price block
    y -= 14
    page.drawRectangle({ x: margin, y: y - 46, width, height: 68, color: rgb(0.965, 0.985, 0.968) })
    page.drawRectangle({ x: margin, y: y - 46, width: 4, height: 68, color: GREEN })
    page.drawText("ESTIMATED INSTALLED PRICE", { x: margin + 18, y: y - 2, size: 10, font: bold, color: GRAY })
    const priceText = money.format(breakdown.retailPrice)
    page.drawText(priceText, { x: margin + 18, y: y - 32, size: 26, font: bold, color: BLACK })
    const includes = "Includes standard installation, removal & disposal"
    page.drawText(includes, { x: margin + width - 18 - helv.widthOfTextAtSize(includes, 10), y: y - 28, size: 10, font: helv, color: GRAY })
    y -= 78

    // disclaimer
    const disclaimer = `ESTIMATE ONLY — NOT A FINAL QUOTE. ${config.websiteDisclaimer} A StraightShot technician will verify everything on-site before any work is scheduled or any price is final.`
    const disclaimerLines = wrap(disclaimer, helv, 9.5, width - 24)
    const boxHeight = disclaimerLines.length * 13 + 22
    page.drawRectangle({ x: margin, y: y - boxHeight + 12, width, height: boxHeight, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.75 })
    let ty = y - 4
    for (const line of disclaimerLines) {
      page.drawText(line, { x: margin + 12, y: ty, size: 9.5, font: helv, color: GRAY })
      ty -= 13
    }
    y = y - boxHeight - 12

    // next step
    page.drawText("Ready for the next step?", { x: margin, y, size: 13, font: bold, color: BLACK })
    y -= 18
    const cta = `Call our office at ${OFFICE_PHONE} to schedule your free on-site consultation.`
    page.drawText(cta, { x: margin, y, size: 11, font: helv, color: BLACK })
    y -= 15
    page.drawText("No pressure, no obligation — we measure, confirm your options, and give you the exact price.", { x: margin, y, size: 9.5, font: helv, color: GRAY })

    // footer
    page.drawLine({ start: { x: margin, y: 64 }, end: { x: margin + width, y: 64 }, thickness: 0.5, color: LIGHT })
    page.drawText("StraightShot Overhead — Garage Door Sales & Service, East Texas", { x: margin, y: 48, size: 9, font: bold, color: BLACK })
    page.drawText(`Office: ${OFFICE_PHONE}   ·   straightshotoverhead.com`, { x: margin, y: 34, size: 9, font: helv, color: GRAY })

    const bytes = await pdf.save()
    return new Response(Buffer.from(bytes), {
      headers: {
        ...publicCorsHeaders(request),
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="StraightShot-Garage-Door-Estimate.pdf"',
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the estimate document"
    return jsonError(message, 400, publicCorsHeaders(request))
  }
}
