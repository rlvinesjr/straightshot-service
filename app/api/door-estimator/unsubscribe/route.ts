import { db } from "@/lib/db"

// One-click unsubscribe for the follow-up sequence. Returns a small branded
// confirmation page rather than JSON since humans land here from email.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? ""
  let message = "We couldn't find that subscription — you may already be unsubscribed."
  if (token) {
    const record = await db.doorEstimate.findUnique({ where: { token } })
    if (record) {
      await db.doorEstimate.update({ where: { id: record.id }, data: { emailOptOut: true, nextDripAt: null } })
      message = "You're unsubscribed. No more emails about this estimate — your report link keeps working if you ever need it."
    }
  }
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribed | StraightShot Overhead</title></head>
<body style="margin:0;background:#000;color:#ccc;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;padding:40px 24px;text-align:center">
    <p style="color:#00FF47;font-weight:bold;letter-spacing:2px;margin:0 0 16px">STRAIGHTSHOT OVERHEAD</p>
    <h1 style="color:#fff;font-size:26px;margin:0 0 14px">Done.</h1>
    <p style="line-height:1.7">${message}</p>
    <p style="margin-top:26px;font-size:14px">Change your mind later? <a href="/door-estimator" style="color:#00FF47">The price planner is always free.</a></p>
  </div>
</body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
}
