# Required shop booking standard

Approved by the owner on October 23, 2026. Applies to every current and future StraightShot shop product page. This document defines the required production implementation; the supplied preview is not evidence that all backend integration is already complete.

## One customer flow

1. Customer chooses a product and its options. Read availability and pricing from the existing authoritative catalog/price-book services. Keep future price updates centralized in the job software; do not hard-code separate page prices.
2. Customer requests the appropriate visit, supplies contact and service-address details, and reviews the complete product configuration and estimate before submission. Collect email, phone, and their contact preference. Door purchases begin with a free site inspection and measurement request. Opener purchases request installation, subject to fit, availability, and team confirmation. Do not describe every opener visit as a free inspection.
3. The server validates the product, every selected option, price, availability, and request details, then saves one booking request and a structured snapshot of the selections. Stale pricing requires a refreshed review; missing pricing shows Price to confirm. A failed save must not produce a success message, reference, or email.
4. After a successful save, show the shared branded confirmation and a working **Save as PDF** button. Display the actual saved reference and the exact status **Appointment awaiting confirmation**. State **No payment has been collected**. A requested window is not a guaranteed appointment.
5. Send the matching branded summary to the customer's supplied email through the existing server-side mail system. Email and PDF must use the same saved snapshot as the on-screen confirmation. Email sending must not depend on the browser staying open. Track send failures for the business and permit retry without creating a second booking or duplicating successful emails. Do not claim an email was sent until the send result supports that claim.
6. Explain the next step. For doors, confirm dimensions, finish, window layout, site conditions, availability, and final price on site before approval/payment. For openers, confirm appointment, product availability, compatibility, scope, and payment arrangements before work. Later team confirmation is a separate status transition; the initial message remains a request acknowledgment.

## Shared request snapshot

Define a versioned server-owned contract and normalize it once. Required information:

| Group | Required content |
| --- | --- |
| Identity | Booking reference, schema version, creation time, status, product ID/model/name, product category, requested visit type |
| Product | Approved product image/alt text, selected quantity where applicable, package contents, relevant exclusions |
| Selections | Every configurable field as stable option ID/value plus customer-readable label/value; include explicit No windows, No insert, Not sure, and measurements-needed states |
| Price | Validated amount or unknown, currency, tax treatment if verified, estimate/final-price wording, price-book/catalog version or calculation timestamp |
| Visit | Requested date, arrival window, America/Chicago time zone, confirmation status |
| Customer | Name, email, phone, service address including city/state/ZIP, preferred contact method, full permitted customer notes |
| Terms | No-payment statement, applicable inspection/fit/final-price conditions, business contact information |

For doors, retain the model internally but display the style name without a model number. Always retain insulation category, width/height or unknown size, color, windows yes/no, individual insert code/name, and any future glass, hardware, opener, or accessory selections. A generic decorative-window pricing group is not a substitute for the actual insert choice.

For openers, always retain model, selected door/rail height or Not sure, and any future accessory, remote, keypad, battery, package, or quantity selections. Include the applicable installed package contents.

Unknown values must be explicit, not silently defaulted. Adding a new selectable option requires mapping it into the shared snapshot before that option ships. All renderers must show the snapshot's complete selection list rather than maintaining separate lists of fields.

Do not render historical requests from the current editable catalog. A later price, product-description, option, or package change must not rewrite what the customer originally requested. Keep identifiers for audit while preserving the customer-facing values at submission time.

## Shared implementation

- Use a shared booking component/controller for collection, review, submission, pending/error handling, confirmation, and PDF saving. Product pages supply catalog/configuration data and a product adapter rather than duplicating the flow.
- Keep the existing job-software pricing and scheduling integrations as the source of truth. Extend the shared adapter for new product types; do not build competing price books or schedulers.
- Reuse `summary-core`, `summary-ui`, `summary-pdf`, and `summary.css`. Consolidate common source into a maintained shared module or synchronized build output for the website and email backend so the copies cannot drift.
- The current `summaryFromBooking()` parser supports legacy opener notes only. Migrate new requests to the versioned structured snapshot, retain compatibility for old requests, and make the email notifier consume that saved snapshot. The door flow must be connected before the door shop launches.
- Register each new product's real reference image and package data centrally. The preview now registers 24 standard doors and three openers; that explicit registry is not automatic support for future products. Replace its fallback to the 410 door image with a correct approved image or clearly labeled neutral placeholder; never show another product's image as though it is the selected product.
- Reference photos must be labeled when they do not portray the customer's selected finish/windows. Keep the simple brochure-photo approach approved by the owner; do not reintroduce generated door visualizations.
- Keep email images publicly accessible on the business's asset host, with usable alternative text. Customer addresses and other personal information must not appear in public image URLs or public summary files. Render values as text/escaped HTML.
- Use one successful booking reference for all three outputs. Duplicate submissions must return the original saved snapshot or a clear existing-request message, never a newly selected configuration falsely attached to an old reference. Retry handling must not create additional bookings.

## Consistent design

Retain the shop's branding, teal/white palette, readable typography, product reference image, clearly separated selection/visit sections, and business phone number (903) 245-1182. Keep the mobile layout usable, PDF text searchable, long fields wrapped, page breaks clean, and every selected option visible. PDF saving must download an actual file. The customer must be able to save it immediately after a successful request even if the email is delayed or fails.

Do not add a new per-page payment flow. Initial booking collects no payment. These are request summaries, not paid receipts or guaranteed appointment confirmations.

## Current rollout and future-page completion

Audit all actual shop routes first. Connect the three known opener pages to the shared production flow; complete the door integration for all 24 standard model pages in the supplied catalog and reuse it for each subsequent door page. Retain the style gallery, same-style construction switching and existing business integrations.

A current or future product page is complete only when these checks pass:

- Every selectable option survives the review, saved request, on-screen confirmation, email, and PDF with the same price and reference.
- A representative successful request shows Appointment awaiting confirmation and no-payment wording. It never claims the requested appointment is already confirmed.
- Unknown size/price, no windows/no inserts, optional notes, maximum-length contact fields, and each product's significant options render correctly.
- Pricing changes, unavailable times, invalid options, failed requests, repeat taps, retries, and existing duplicate requests do not create false confirmations or mismatched summaries.
- Email delivery success/failure and retry behavior are tested; a mail failure does not lose the saved booking or prevent PDF download.
- Mobile confirmation, product-image loading, PDF download/content, and long-field pagination are checked.
- Live verification follows the authorized deployment/test process and uses an approved test recipient; preview emails and mock booking responses are never presented as production verification.

Document the connected routes and outstanding integration work in the deployment handoff. A visual preview or reusable template by itself does not satisfy these production checks.

## How this is implemented (updated October 26, 2026: door shop with 24 doors)

Two repositories share two generated modules. Keep them in step.

| Piece | Where |
| --- | --- |
| Snapshot contract, validation, card and email HTML, legacy opener parser, product registry (3 openers and 24 doors) | `service-app/public/assets/summary-core.js` (source). Exact copy in `door-estimator/lib/tuneup/summary-core.mjs`. |
| Door catalog: 8 styles × 3 constructions, colors and finishes, inserts, window families and counts by width. No prices. | `service-app/public/assets/door-catalog.js` (source). Exact copy in `door-estimator/lib/door-estimator/door-catalog.mjs`. |
| Keeping the copies in sync | Run `npm run sync:summary` in service-app. Both repos' checks fail if a copy drifts or is edited by hand. |
| Door prices | `door-estimator/lib/door-estimator/shop-pricing.ts` plus `POST /api/door-estimator/shop-quote`. It reads the saved Door Pricing (Field app → Admin → Door Pricing): base door costs, window rates (`costs`, plus `woodCosts` for Walnut/Driftwood carriage windows), multiplier, rounding and minimum profit, all through `retailFromUnitCost`, the same rule the Field calculator uses. Unpriced cases return null. |
| Door pages | `service-app/lib/door-pages.mjs` renders the gallery (`/shop/doors`, from the `public/shop-doors.html` template) and 24 door pages (`/shop/doors/<style>/<construction>`, from `public/shop-door.html`) out of the catalog. Numbered and old addresses (for example `/shop/doors/410`) redirect permanently. |
| Browser scripts | `door-shop.js` (choices, live server prices, same-style insulation switching), `doors-gallery.js` (gallery), and the shared `shop-booking.js` flow. |
| Save as PDF | `service-app/public/assets/summary-pdf.js` (pdf-lib 1.17.1, `pdf-lib.min.js`, MIT licence alongside) |
| Opener adapter | `shop.js` + `lib/shop.mjs` (prices from the website price book, which the job software's Price Book updates) |
| Server-side snapshot building and stale-price refusal | `service-app/lib/shop-request.mjs`, `lib/doors.mjs`, `lib/booking.mjs` (sends `X-Shop-Booking-Key`) |
| Saving, door price re-check, idempotency, duplicates | `door-estimator/app/api/door-estimator/tuneup-booking/route.ts` + `lib/tuneup/shop-request.ts`. Stored in `TuneUpBooking.requestSnapshot`. |
| Customer email with delivery tracking and retry | `door-estimator/lib/tuneup/summary-email.ts`. The retry runs on the existing 5-minute notify timer. |

**Connected routes:**
- Openers: `/shop/2220l`, `/shop/6580l` and `/shop/6690l` (installation requests).
- Doors: the `/shop/doors` gallery and its 24 door pages (free site inspection and measurements). `/shop` links to both.

**Door pricing rules:** from the vendor price book, mapped in the catalog.
- **Window counts:** Short Panel is 4/4/5/6/7/7/8/8/8 for 8–18 ft widths. Long Panel Carriage is 2/2/2/3/3/4/4/4/4. Short-grooved carriage is 2/2/2/3/3/3/4/4/4. Long Panel follows the carriage counts.
- **Window rates:** plain glass uses the PLAIN rate; any insert uses the WITH INSERTS rate.
- **Flush Panel windows:** one option, Contemporary clear (41" × 7"), priced per window from Door Pricing's `contemporary-clear` row. The count is 2/2/2/3/3/4/4/4/4, the carriage counts.
- **Colors:** only colors the vendor prices are offered. Gray, Oak and Light Cypress were removed on October 26, 2026 (Light Cypress belongs to the Ozark series, which isn't in the shop).
- **Always Price to confirm:** "I'm not sure" sizes and any size that isn't fully chosen. Every other configuration shows a price unless pricing is unavailable.
- **Sizing help:** the size step offers "One-car garage · 9 × 7" and "Two-car garage · 16 × 7" quick picks, plus a width and height tip, and says we always measure on site.
- **Customer-facing text:** shows style names only, never model numbers. Model numbers appear only in office notes and records.

**Adding a product page:**
1. Add the product to `door-catalog.js` (doors) or the opener adapter. Register its approved image in `PRODUCTS` in `summary-core.js`. Run `npm run sync:summary`.
2. Map every new option into the snapshot `selections`.
3. Product pages reuse the booking dialog markup and `shop-booking.js`.
4. Add tests. Run `npm test` here, and `npm run validate:door-shop` and `npm run validate:shop` in door-estimator.
5. Go through the launch checks above with an owner-approved test recipient.

**Settings:**
- `SHOP_BOOKING_KEY` must be set to the same value on both servers: hPanel for the website, `/opt/door-estimator/.env` for the scheduler. The owner generates the value.
- `SHOP_ASSET_BASE` (optional) changes where email images load from. The default is `https://straightshotoverhead.com/assets/`.
- The wood-finish window rates were added to the live Door Pricing on Oct 26 2026 with `door-estimator/scripts/pricebook-add-wood-window-rates.mjs`.
