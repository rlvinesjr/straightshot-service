import { db } from "@/lib/db"
import { DEFAULT_DOOR_ESTIMATOR_CONFIG } from "./default-config"
import type { DoorEstimatorConfig } from "./types"

const CONFIG_ID = "default"

export async function loadDoorEstimatorConfig(): Promise<DoorEstimatorConfig> {
  const record = await db.doorEstimatorConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: {
      id: CONFIG_ID,
      version: DEFAULT_DOOR_ESTIMATOR_CONFIG.version,
      pricebookName: DEFAULT_DOOR_ESTIMATOR_CONFIG.pricebookName,
      effectiveDate: new Date(`${DEFAULT_DOOR_ESTIMATOR_CONFIG.effectiveDate}T00:00:00.000Z`),
      multiplier: DEFAULT_DOOR_ESTIMATOR_CONFIG.multiplier,
      roundingMethod: DEFAULT_DOOR_ESTIMATOR_CONFIG.roundingMethod,
      removalIncluded: DEFAULT_DOOR_ESTIMATOR_CONFIG.removalIncluded,
      catalogJson: JSON.stringify(DEFAULT_DOOR_ESTIMATOR_CONFIG),
    },
  })
  const parsed = JSON.parse(record.catalogJson) as DoorEstimatorConfig
  return { ...parsed, version: record.version, pricebookName: record.pricebookName, effectiveDate: record.effectiveDate ? record.effectiveDate.toISOString().slice(0, 10) : parsed.effectiveDate, multiplier: record.multiplier, roundingMethod: record.roundingMethod as DoorEstimatorConfig["roundingMethod"], removalIncluded: record.removalIncluded }
}

export async function saveDoorEstimatorConfig(incoming: DoorEstimatorConfig): Promise<DoorEstimatorConfig> {
  const current = await loadDoorEstimatorConfig()
  const next = { ...incoming, version: current.version + 1 }
  await db.doorEstimatorConfig.update({
    where: { id: CONFIG_ID },
    data: { version: next.version, pricebookName: next.pricebookName, effectiveDate: next.effectiveDate ? new Date(`${next.effectiveDate}T00:00:00.000Z`) : null, multiplier: next.multiplier, roundingMethod: next.roundingMethod, removalIncluded: next.removalIncluded, catalogJson: JSON.stringify(next) },
  })
  return next
}

export function requireDoorEstimatorAdmin(request: Request): void {
  const supplied = request.headers.get("x-door-estimator-key")
  const configured = process.env.DOOR_ESTIMATOR_ADMIN_KEY
  if (!configured && process.env.NODE_ENV !== "production" && supplied === "straightshot-dev") return
  if (!configured || supplied !== configured) throw new Error("UNAUTHORIZED")
}
