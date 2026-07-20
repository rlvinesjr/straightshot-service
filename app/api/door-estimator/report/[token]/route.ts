import { db } from "@/lib/db"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { buildBuyerReport } from "@/lib/door-estimator/buyer-report"
import type { DoorSelection, PriceBreakdown } from "@/lib/door-estimator/types"

// Tokenized report download — the token is the secret, minted only after the
// lead form was submitted. The PDF is regenerated on demand from the stored
// selection and the price snapshot the visitor originally saw.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const record = await db.doorEstimate.findUnique({ where: { token } })
    if (!record || record.status !== "lead") return jsonError("Report not found", 404, publicCorsHeaders(request))

    const configuration = JSON.parse(record.configurationJson) as { selection: DoorSelection }
    const breakdown = JSON.parse(record.pricingSnapshotJson) as PriceBreakdown
    const config = await loadDoorEstimatorConfig()
    const generatedOn = record.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago" })

    const bytes = await buildBuyerReport(config, configuration.selection, breakdown, {
      firstName: record.customerName || "Homeowner",
      zip: record.zip || "",
    }, generatedOn)

    return new Response(Buffer.from(bytes), {
      headers: {
        ...publicCorsHeaders(request),
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="StraightShot-Garage-Door-Buyer-Report.pdf"',
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to build the report"
    return jsonError(message, 400, publicCorsHeaders(request))
  }
}
