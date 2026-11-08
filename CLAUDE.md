@AGENTS.md

## Website shop requests: booking standard (owner decision, October 23, 2026)

Shop product requests from straightshotoverhead.com (openers, doors, and all future shop pages) follow `SHOP-BOOKING-STANDARD.md`:

- The website sends a versioned request snapshot with `X-Shop-Booking-Key`, which must equal `SHOP_BOOKING_KEY`.
- This scheduler validates the snapshot. It overwrites the customer and visit details with those of the booking it saves, and re-checks door prices against Door Pricing.
- It stores the snapshot in `TuneUpBooking.requestSnapshot`. Resending the same `submissionId` returns the original. A different request for the same phone and window is refused (409 `duplicate_request`).
- The customer summary email is rendered from the stored snapshot (`lib/tuneup/summary-email.ts`). It is tracked in `customerEmail*` and retried by the notify timer. A retry never sends a second copy.
- `lib/tuneup/summary-core.mjs` is a GENERATED copy of the website's `public/assets/summary-core.js`. Never edit it here: change the website source and run `npm run sync:summary` there. `npm run validate:shop` fails if the copy was edited by hand.
- The legacy opener-note parser (`summaryFromBooking` without a snapshot) is for compatibility only. Never extend it for new products.
- Run `npm run validate:shop` alongside the other validate scripts before deploying.

## Website door shop pricing (October 26, 2026)

- **Endpoint:** `POST /api/door-estimator/shop-quote` prices the website's 24 doors (8 styles × Non Insulated / Vinyl Back / Steel Back).
- **Rules and costs:** product rules (window families, window counts by width, finishes, inserts) come from `lib/door-estimator/door-catalog.mjs`. That file is a GENERATED copy of the website's `public/assets/door-catalog.js`, so never edit it here. Costs and the retail rule come only from the saved Door Pricing: `retailFromUnitCost` is shared with the Field calculator (multiplier, rounding, minimum profit).
- **Wood windows:** Walnut/Driftwood carriage windows use `windows[].woodCosts`, the vendor's wood-finish window row. If it's missing, the price is "Price to confirm", never the standard rate.
- **Flush Panel windows:** priced per window from the `contemporary-clear` window row (Contemporary 41" × 7", clear). The count is 2/3/4 by width, same as carriage. If the row is missing, the price is "Price to confirm".
- **Colors (owner, Oct 26 2026):** Gray, Oak and Light Cypress were removed from the shop. Every offered color is priced; a chosen size never shows "Price to confirm" unless pricing is down.
- **Cost privacy:** `sanitizeCatalog` must never expose `costs` or `woodCosts`.
- **Checks:** run `npm run validate:door-shop` before deploying. It compares every combination with the approved retail fixture (except the owner's Oct 26 changes above, which it checks separately) and covers the fail-closed rules.

## Text-message permission on website bookings (November 2, 2026)

- **What's stored:** the website sends each booking's optional texting choice as `smsConsent`. `lib/tuneup/sms-consent.ts` stores it on the booking, but only when the request carries the website key (`X-Shop-Booking-Key`, now sent with every website booking).
  - The `smsConsent*` columns hold the status, wording, version, phone and time.
  - "granted" needs the full, matching record. Anything else is "not-provided" (no permission, and not an opt-out). With no key, the columns stay null (unknown).
- **Field app copy:** the Field app copies the record onto the customer's consent history through the key-protected `GET /api/door-estimator/tuneup-bookings/<ref>/sms-consent` when it creates the job.
- **This app never sends texts.** Checks: `npm run validate:sms-consent`.
- **Deploying a schema change:** run `npx prisma generate` after `prisma migrate deploy` and before `npm run build`. A stale client fails the build and leaves no `.next`, which took the scheduler down for about 2 minutes on Nov 2, 2026.

## Two-hour arrival windows (November 8, 2026)

- **Windows:** every website booking form offers six two-hour arrival windows, 8–10 AM through 6–8 PM (`SCHEDULING.arrivalWindows`, owner's request).
- **The old three-hour windows** (8–11, 11–2, 2–5) are in `legacyArrivalWindows`:
  - They are never offered again.
  - Older requests keep their labels.
  - They still count against the new windows they overlap (`overlapCount`), so nothing is double-booked during the switch.
- **Field app:** it turns each window into a job start time plus a two-hour window, and the old ones into three hours (`server.js`, create-job).
