import { jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig, requireDoorEstimatorAdmin, saveDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import type { DoorEstimatorConfig } from "@/lib/door-estimator/types"

export async function GET(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
    return Response.json(await loadDoorEstimatorConfig())
  } catch {
    return jsonError("Unauthorized", 401)
  }
}

export async function PATCH(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
    const incoming = (await request.json()) as DoorEstimatorConfig
    if (!Number.isFinite(incoming.multiplier) || incoming.multiplier <= 0) return jsonError("Multiplier must be greater than zero")
    return Response.json(await saveDoorEstimatorConfig(incoming))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save pricing"
    return jsonError(message === "UNAUTHORIZED" ? "Unauthorized" : message, message === "UNAUTHORIZED" ? 401 : 400)
  }
}
