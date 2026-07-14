import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig, requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"
import { calculateDoorPrice } from "@/lib/door-estimator/pricing"
import type { DoorSelection } from "@/lib/door-estimator/types"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: "website" | "field"
      selection?: DoorSelection
      includeInternal?: boolean
    }
    const mode = body.mode === "field" ? "field" : "website"
    if (!body.selection) return jsonError("A door selection is required", 400, publicCorsHeaders(request))

    if (body.includeInternal) requireDoorEstimatorAdmin(request)

    const config = await loadDoorEstimatorConfig()
    const breakdown = calculateDoorPrice(config, body.selection, mode)

    const response = body.includeInternal
      ? breakdown
      : {
          retailPrice: breakdown.retailPrice,
          quantity: breakdown.quantity,
          pricebookVersion: breakdown.pricebookVersion,
          removalIncluded: config.removalIncluded,
          disclaimer: config.websiteDisclaimer,
        }

    return Response.json(response, { headers: publicCorsHeaders(request) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate the estimate"
    const status = message === "UNAUTHORIZED" ? 401 : 400
    return jsonError(status === 401 ? "Unauthorized" : message, status, publicCorsHeaders(request))
  }
}
