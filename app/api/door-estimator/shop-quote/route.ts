import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { quoteShopDoor } from "@/lib/door-estimator/shop-pricing"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

// POST /api/door-estimator/shop-quote  {model, selection:{width, height, unknownSize, color, windows, insert}}
// Customer retail price for one website door-shop configuration, from the saved Door Pricing.
// Returns only the customer price (or null + a note) — never costs, multipliers or margins.
export async function POST(request: Request) {
  const headers = publicCorsHeaders(request)
  try {
    const body = (await request.json().catch(() => null)) as { model?: unknown; selection?: unknown } | null
    if (!body || typeof body.model !== "string") return jsonError("Choose an available door.", 400, headers)
    const quote = quoteShopDoor(await loadDoorEstimatorConfig(), body.model, body.selection)
    return Response.json(
      { retailPrice: quote.retailPrice, note: quote.note, reason: quote.reason, pricebookVersion: quote.pricebookVersion, removalIncluded: quote.removalIncluded },
      { headers: { ...headers, "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to calculate the estimate", 400, headers)
  }
}
