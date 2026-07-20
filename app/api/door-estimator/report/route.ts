import { db } from "@/lib/db"
import { tryEmail } from "@/lib/email"
import { publicCorsHeaders, jsonError } from "@/lib/door-estimator/api-utils"
import { loadDoorEstimatorConfig } from "@/lib/door-estimator/config-store"
import { calculateDoorPrice, validateSelection } from "@/lib/door-estimator/pricing"
import { leadAlertEmail, reportDeliveryEmail, DRIP_OFFSETS_DAYS } from "@/lib/door-estimator/lead-emails"
import type { DoorSelection } from "@/lib/door-estimator/types"

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicCorsHeaders(request) })
}

// Lead capture: name + (email|mobile) + ZIP in exchange for the Buyer Report.
// The on-screen estimate stays free; this is the only gate on the funnel.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      selection?: DoorSelection
      lead?: { firstName?: string; contact?: string; zip?: string }
    }
    if (!body.selection) return jsonError("A door selection is required", 400, publicCorsHeaders(request))

    const firstName = body.lead?.firstName?.trim() ?? ""
    const contactRaw = body.lead?.contact?.trim() ?? ""
    const zip = body.lead?.zip?.trim() ?? ""
    if (firstName.length < 2) return jsonError("Please enter your first name", 400, publicCorsHeaders(request))
    if (!/^\d{5}$/.test(zip)) return jsonError("Please enter a 5-digit ZIP code", 400, publicCorsHeaders(request))

    const digits = contactRaw.replace(/\D/g, "")
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactRaw)
    const isPhone = !isEmail && (digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))
    if (!isEmail && !isPhone) return jsonError("Please enter a valid email address or 10-digit mobile number", 400, publicCorsHeaders(request))
    const phone = isPhone ? (digits.length === 11 ? digits.slice(1) : digits) : null
    const email = isEmail ? contactRaw.toLowerCase() : null

    const config = await loadDoorEstimatorConfig()
    const parts = validateSelection(config, body.selection, "website")
    const breakdown = calculateDoorPrice(config, body.selection, "website")

    const record = await db.doorEstimate.create({
      data: {
        mode: "website",
        status: "lead",
        source: "price-planner",
        customerName: firstName,
        email,
        phone,
        zip,
        configurationJson: JSON.stringify({ selection: body.selection, configVersion: config.version }),
        vendorCostSnapshot: breakdown.totalVendorCost,
        retailPriceSnapshot: breakdown.retailPrice,
        pricingSnapshotJson: JSON.stringify(breakdown),
        // the drip only runs for email leads; phone-only leads get a manual call
        nextDripAt: email ? new Date(Date.now() + DRIP_OFFSETS_DAYS[0] * 86400000) : null,
      },
    })

    const summary = `${body.selection.width}x${body.selection.height} ${parts.construction.publicName}, ${parts.style.publicName}, ${parts.color.publicName}, ${parts.window.publicName}, ${parts.opener.publicName} (qty ${body.selection.quantity})`
    const alertTo = process.env.LEAD_ALERT_TO
    if (alertTo) {
      const alert = leadAlertEmail(record, summary)
      void tryEmail(alertTo, alert.subject, alert.html)
    }
    if (email) {
      const delivery = reportDeliveryEmail(record)
      void tryEmail(email, delivery.subject, delivery.html)
    }

    return Response.json(
      { token: record.token, retailPrice: record.retailPriceSnapshot, emailed: Boolean(email) },
      { status: 201, headers: publicCorsHeaders(request) },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create your report"
    return jsonError(message, 400, publicCorsHeaders(request))
  }
}
