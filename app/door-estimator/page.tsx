import type { Metadata } from "next"
import DoorEstimatorBuilder from "@/components/door-estimator/DoorEstimatorBuilder"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { sanitizeCatalog } from "@/lib/door-estimator/pricing"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Garage Door Estimator | StraightShot Overhead",
  description: "Build a residential garage door and get a preliminary installed price.",
}

export default async function PublicDoorEstimatorPage() {
  const config = await loadDoorEstimatorConfig()
  return <DoorEstimatorBuilder catalog={sanitizeCatalog(config, "website")} mode="website" />
}
