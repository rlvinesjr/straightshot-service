import DoorEstimatorBuilder from "@/components/door-estimator/DoorEstimatorBuilder"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { sanitizeCatalog } from "@/lib/door-estimator/pricing"

export const dynamic = "force-dynamic"

export default async function FieldDoorEstimatorPage() {
  const config = await loadDoorEstimatorConfig()
  return <DoorEstimatorBuilder catalog={sanitizeCatalog(config, "field")} mode="field" />
}
