import { db } from "@/lib/db"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig, requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"
import { calculateDoorPrice } from "@/lib/door-estimator/pricing"
import type { DoorSelection } from "@/lib/door-estimator/types"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

export async function GET(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
    const records = await db.doorEstimate.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
    return Response.json(records, { headers: publicCorsHeaders(request) })
  } catch {
    return jsonError("Unauthorized", 401, publicCorsHeaders(request))
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: "website" | "field"
      selection?: DoorSelection
      options?: Array<{ label: string; selection: DoorSelection }>
      customer?: { name?: string; phone?: string; email?: string; address?: string; city?: string }
      notes?: string
      signatureData?: string
    }
    const mode = body.mode === "field" ? "field" : "website"
    if (mode === "field") requireDoorEstimatorAdmin(request)
    if (!body.selection && !body.options?.length) return jsonError("At least one selection is required", 400, publicCorsHeaders(request))
    if (mode === "website" && !body.customer?.phone && !body.customer?.email) return jsonError("A phone number or email is required", 400, publicCorsHeaders(request))

    const config = await loadDoorEstimatorConfig()
    const pricedOptions = (body.options?.length ? body.options : [{ label: mode === "field" ? "Estimate" : "Website baseline", selection: body.selection! }]).map(option => ({ ...option, pricing: calculateDoorPrice(config, option.selection, mode) }))
    const selected = pricedOptions[0]
    const record = await db.doorEstimate.create({
      data: {
        mode,
        status: mode === "website" ? "baseline" : "draft",
        customerName: body.customer?.name?.trim() || null,
        phone: body.customer?.phone?.trim() || null,
        email: body.customer?.email?.trim() || null,
        address: body.customer?.address?.trim() || null,
        city: body.customer?.city?.trim() || null,
        configurationJson: JSON.stringify({ selection: body.selection ?? selected.selection, options: pricedOptions, configVersion: config.version }),
        vendorCostSnapshot: selected.pricing.totalVendorCost,
        retailPriceSnapshot: selected.pricing.retailPrice,
        pricingSnapshotJson: JSON.stringify(selected.pricing),
        notes: body.notes?.trim() || null,
        signatureData: body.signatureData || null,
        signedAt: body.signatureData ? new Date() : null,
      },
    })
    return Response.json({ id: record.id, token: record.token, status: record.status, retailPrice: record.retailPriceSnapshot }, { status: 201, headers: publicCorsHeaders(request) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save estimate"
    const status = message === "UNAUTHORIZED" ? 401 : 400
    return jsonError(status === 401 ? "Unauthorized" : message, status, publicCorsHeaders(request))
  }
}
