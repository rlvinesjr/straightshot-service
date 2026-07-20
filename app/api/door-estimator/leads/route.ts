import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig, requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"
import type { DoorSelection } from "@/lib/door-estimator/types"

// Lead list for the Field app (proxied there behind its own login). Returns
// customer-facing fields only — no vendor costs, no pricing internals.
export async function GET(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  const config = await loadDoorEstimatorConfig()
  const name = (list: Array<{ code: string; publicName: string }>, code: string) => list.find(x => x.code === code)?.publicName ?? code
  const records = await db.doorEstimate.findMany({ where: { status: "lead" }, orderBy: { createdAt: "desc" }, take: 100 })
  return Response.json(records.map(record => {
    let summary = ""
    try {
      const { selection } = JSON.parse(record.configurationJson) as { selection: DoorSelection }
      summary = `${selection.width}x${selection.height} ${name(config.constructions, selection.constructionCode)} — ${name(config.styles, selection.styleCode)}, ${name(config.colors, selection.colorCode)}, ${name(config.windows, selection.windowCode)}, ${name(config.openers, selection.openerCode)}${selection.quantity > 1 ? ` (x${selection.quantity})` : ""}`
    } catch { /* summary stays empty for malformed rows */ }
    return {
      id: record.id,
      token: record.token,
      createdAt: record.createdAt,
      name: record.customerName,
      email: record.email,
      phone: record.phone,
      zip: record.zip,
      timeline: record.timeline,
      retailPrice: record.retailPriceSnapshot,
      summary,
      emailOptOut: record.emailOptOut,
      dripStage: record.dripStage,
    }
  }))
}
