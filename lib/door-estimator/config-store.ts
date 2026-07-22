import { db } from "@/lib/db"
import { DEFAULT_DOOR_ESTIMATOR_CONFIG } from "./default-config"
import type { DoorEstimatorConfig } from "./types"

const CONFIG_ID = "default"
const supplementalColors: DoorEstimatorConfig["colors"] = [
  { code: "walnut", publicName: "Walnut", swatch: "#6d2f20", finishTier: "wood", styleCodes: ["short-recessed","carriage-short","carriage-long","louvered","long-recessed"], websiteEnabled: true, fieldEnabled: true, active: true },
  { code: "driftwood", publicName: "Driftwood", swatch: "#77766e", finishTier: "wood", styleCodes: ["short-recessed","carriage-short","carriage-long","louvered","long-recessed"], websiteEnabled: true, fieldEnabled: true, active: true },
  { code: "plank-walnut", publicName: "Walnut", swatch: "#5a241c", finishTier: "plank", styleCodes: ["horizontal-plank"], constructionCodes: ["premium"], websiteEnabled: true, fieldEnabled: true, active: true },
  { code: "plank-driftwood", publicName: "Driftwood", swatch: "#5a5b59", finishTier: "plank", styleCodes: ["horizontal-plank"], constructionCodes: ["premium"], websiteEnabled: true, fieldEnabled: true, active: true },
  { code: "plank-cypress", publicName: "Cypress", swatch: "#7f3a29", finishTier: "plank", styleCodes: ["horizontal-plank"], constructionCodes: ["premium"], websiteEnabled: true, fieldEnabled: true, active: true },
]

function normalizeConfig(config: DoorEstimatorConfig): DoorEstimatorConfig {
  const existing = new Set(config.colors.map(color => color.code))
  // Internal distributor/part references are code-managed: overlay them from the
  // default config on every load so stored price books stay current without a
  // republish. They are stripped from public catalogs in sanitizeCatalog.
  const refFor = <T extends { code: string; internalRef?: string }>(items: T[], defaults: T[]) =>
    items.map(item => ({ ...item, internalRef: defaults.find(d => d.code === item.code)?.internalRef ?? item.internalRef }))
  return {
    ...config,
    distributorName: DEFAULT_DOOR_ESTIMATOR_CONFIG.distributorName,
    internalNotes: DEFAULT_DOOR_ESTIMATOR_CONFIG.internalNotes,
    constructions: refFor(config.constructions, DEFAULT_DOOR_ESTIMATOR_CONFIG.constructions),
    openers: refFor(config.openers, DEFAULT_DOOR_ESTIMATOR_CONFIG.openers),
    // style photos are code-managed too — overlay them so price books published
    // before the images existed still render photos everywhere
    styles: config.styles.map(style => ({
      ...style,
      imagePath: style.imagePath || DEFAULT_DOOR_ESTIMATOR_CONFIG.styles.find(s => s.code === style.code)?.imagePath || "",
    })),
    colors: [...config.colors, ...supplementalColors.filter(color => !existing.has(color.code))],
  }
}

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
  const parsed = normalizeConfig(JSON.parse(record.catalogJson) as DoorEstimatorConfig)
  return { ...parsed, version: record.version, pricebookName: record.pricebookName, effectiveDate: record.effectiveDate ? record.effectiveDate.toISOString().slice(0, 10) : parsed.effectiveDate, multiplier: record.multiplier, roundingMethod: record.roundingMethod as DoorEstimatorConfig["roundingMethod"], removalIncluded: record.removalIncluded }
}

export async function saveDoorEstimatorConfig(incoming: DoorEstimatorConfig): Promise<DoorEstimatorConfig> {
  const current = await loadDoorEstimatorConfig()
  const next = normalizeConfig({ ...incoming, version: current.version + 1 })
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
