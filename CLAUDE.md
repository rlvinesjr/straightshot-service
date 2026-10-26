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
- **Cost privacy:** `sanitizeCatalog` must never expose `costs` or `woodCosts`.
- **Checks:** run `npm run validate:door-shop` before deploying. It compares every combination with the approved retail fixture and covers the fail-closed rules.
