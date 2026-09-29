import { jsonError } from "@/lib/door-estimator/api-utils"
import { requireDoorEstimatorAdmin } from "@/lib/door-estimator/config-store"
import { retryDueNotifications } from "@/lib/repair/notify"

// POST /api/door-estimator/repair-notify-retry — run by straightshot-repair-notify.timer
// every 5 minutes (deploy/systemd/). Sends any repair-request office email that
// failed or never went out, on a backoff. Safe to call at any time.
export async function POST(request: Request) {
  try {
    requireDoorEstimatorAdmin(request)
  } catch {
    return jsonError("Unauthorized", 401)
  }
  return Response.json(await retryDueNotifications())
}
