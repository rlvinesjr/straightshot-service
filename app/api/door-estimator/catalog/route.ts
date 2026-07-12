import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { publicCorsHeaders } from "@/lib/door-estimator/api-utils"
import { sanitizeCatalog } from "@/lib/door-estimator/pricing"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("mode") === "field" ? "field" : "website"
  const config = await loadDoorEstimatorConfig()
  return Response.json(sanitizeCatalog(config, mode), {
    headers: publicCorsHeaders(request),
  })
}
