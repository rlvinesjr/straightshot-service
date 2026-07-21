import { db } from "@/lib/db"
import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"
import { TIERS, type Tier } from "@/lib/tuneup/quiz"

// Tune-up quiz leads for the Field app's Door Leads screen (proxied there
// behind its own login).
export async function GET(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  const records = await db.tuneUpLead.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  return Response.json(records.map(record => ({
    id: record.id,
    createdAt: record.createdAt,
    name: record.firstName,
    email: record.email,
    phone: record.phone,
    zip: record.zip,
    score: record.score,
    tier: record.tier,
    tierName: TIERS[record.tier as Tier]?.name ?? record.tier,
    status: record.status,
    preferredDay: record.preferredDay,
    preferredWindow: record.preferredWindow,
    emailOptOut: record.emailOptOut,
    dripStage: record.dripStage,
  })))
}
