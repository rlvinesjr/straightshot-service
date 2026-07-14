export function publicCorsHeaders(request?: Request): HeadersInit {
  const configured = process.env.DOOR_ESTIMATOR_ALLOWED_ORIGIN
  const requestOrigin = request?.headers.get("origin")
  const allowOrigin = process.env.NODE_ENV !== "production" ? requestOrigin ?? "*" : configured ?? "https://straightshotoverhead.com"
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Door-Estimator-Key",
    Vary: "Origin",
  }
}

export function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers })
}
