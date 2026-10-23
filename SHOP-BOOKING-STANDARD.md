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

For doors, always retain model, insulation category, width/height or unknown size, color, windows yes/no, individual insert code/name, and any future glass, hardware, opener, or accessory selections. A generic decorative-window pricing group is not a substitute for the actual insert choice.

For openers, always retain model, selected door/rail height or Not sure, and any future accessory, remote, keypad, battery, package, or quantity selections. Include the applicable installed package contents.

Unknown values must be explicit, not silently defaulted. Adding a new selectable option requires mapping it into the shared snapshot before that option ships. All renderers must show the snapshot's complete selection list rather than maintaining separate lists of fields.

Do not render historical requests from the current editable catalog. A later price, product-description, option, or package change must not rewrite what the customer originally requested. Keep identifiers for audit while preserving the customer-facing values at submission time.

## Shared implementation

- Use a shared booking component/controller for collection, review, submission, pending/error handling, confirmation, and PDF saving. Product pages supply catalog/configuration data and a product adapter rather than duplicating the flow.
- Keep the existing job-software pricing and scheduling integrations as the source of truth. Extend the shared adapter for new product types; do not build competing price books or schedulers.
- Reuse `summary-core`, `summary-ui`, `summary-pdf`, and `summary.css`. Consolidate common source into a maintained shared module or synchronized build output for the website and email backend so the copies cannot drift.
- The current `summaryFromBooking()` parser supports legacy opener notes only. Migrate new requests to the versioned structured snapshot, retain compatibility for old requests, and make the email notifier consume that saved snapshot. The door flow must be connected before the door shop launches.
- Register each new product's real reference image and package data centrally. The prototype's four-product registry is not automatic future-product support. Replace its fallback to the 410 door image with a correct approved image or clearly labeled neutral placeholder; never show another product's image as though it is the selected product.
- Reference photos must be labeled when they do not portray the customer's selected finish/windows. Keep the simple brochure-photo approach approved by the owner; do not reintroduce generated door visualizations.
- Keep email images publicly accessible on the business's asset host, with usable alternative text. Customer addresses and other personal information must not appear in public image URLs or public summary files. Render values as text/escaped HTML.
- Use one successful booking reference for all three outputs. Duplicate submissions must return the original saved snapshot or a clear existing-request message, never a newly selected configuration falsely attached to an old reference. Retry handling must not create additional bookings.

## Consistent design

Retain the shop's branding, teal/white palette, readable typography, product reference image, clearly separated selection/visit sections, and business phone number (903) 245-1182. Keep the mobile layout usable, PDF text searchable, long fields wrapped, page breaks clean, and every selected option visible. PDF saving must download an actual file. The customer must be able to save it immediately after a successful request even if the email is delayed or fails.

Do not add a new per-page payment flow. Initial booking collects no payment. These are request summaries, not paid receipts or guaranteed appointment confirmations.

## Current rollout and future-page completion

Audit all actual shop routes first. Connect the three known opener pages to the shared production flow; complete the door integration for the 410 page and reuse it for each subsequent door page in all three insulation categories. Retain the category/comparison navigation and existing working business integrations.

A current or future product page is complete only when these checks pass:

- Every selectable option survives the review, saved request, on-screen confirmation, email, and PDF with the same price and reference.
- A representative successful request shows Appointment awaiting confirmation and no-payment wording. It never claims the requested appointment is already confirmed.
- Unknown size/price, no windows/no inserts, optional notes, maximum-length contact fields, and each product's significant options render correctly.
- Pricing changes, unavailable times, invalid options, failed requests, repeat taps, retries, and existing duplicate requests do not create false confirmations or mismatched summaries.
- Email delivery success/failure and retry behavior are tested; a mail failure does not lose the saved booking or prevent PDF download.
- Mobile confirmation, product-image loading, PDF download/content, and long-field pagination are checked.
- Live verification follows the authorized deployment/test process and uses an approved test recipient; preview emails and mock booking responses are never presented as production verification.

Document the connected routes and outstanding integration work in the deployment handoff. A visual preview or reusable template by itself does not satisfy these production checks.

## How this is implemented (October 23, 2026)

Two repositories share one contract. Keep them in step.

| Piece | Where |
| --- | --- |
| Snapshot contract, validation, card and email HTML, legacy opener parser | `service-app/public/assets/summary-core.js` (source). Exact copy in `door-estimator/lib/tuneup/summary-core.mjs`, written by `npm run sync:summary` in service-app. Both repos' tests fail if the copy drifts or is hand-edited. |
| Save as PDF | `service-app/public/assets/summary-pdf.js` (pdf-lib 1.17.1, `pdf-lib.min.js`, MIT licence alongside) |
| Shared booking flow (browser) | `service-app/public/assets/shop-booking.js`. Product pages supply an adapter (`refresh`, `describe`, `payload`). |
| Opener adapter | `shop.js` + `lib/shop.mjs` (prices from the website price book, which the job software's Price Book updates) |
| Door adapter | `door-shop.js` + `lib/doors.mjs`. Prices come only from the scheduler's calculator (`/api/door-estimator/calculate`), which uses the job software's Door Pricing. Vendor costs never leave the scheduler. |
| Server-side snapshot building and stale-price refusal | `service-app/lib/shop-request.mjs`, `lib/booking.mjs` (sends `X-Shop-Booking-Key`) |
| Saving, door price re-check, idempotency, duplicates | `door-estimator/app/api/door-estimator/tuneup-booking/route.ts` + `lib/tuneup/shop-request.ts`. Stored in `TuneUpBooking.requestSnapshot`. |
| Customer email with delivery tracking and retry | `door-estimator/lib/tuneup/summary-email.ts`. The retry runs on the existing 5-minute notify timer. |

**Connected routes:** `/shop/2220l`, `/shop/6580l`, `/shop/6690l` (opener installation requests) and `/shop/doors/410` (free site inspection and measurements). `/shop` links to all of them, including the door categories Non Insulated, Vinyl Back Insulated and Steel Back Insulated.

**Adding a product page:**
1. Add the product to `PRODUCTS` in `summary-core.js`, with its approved image and package text. Run `npm run sync:summary`.
2. Add an adapter: a door model in `lib/doors.mjs`, or an opener in `lib/shop.mjs` plus `shop-request.mjs`. Map every new option into the snapshot `selections`.
3. Copy the booking dialog markup from an existing product page. Keep the element ids that `shop-booking.js` uses.
4. Add tests next to `tests/shop-standard.test.mjs`. Run both repos' checks: `npm test` here, `npm run validate:shop` in door-estimator.
5. Go through the launch checks above with an owner-approved test recipient.

**Settings:**
- `SHOP_BOOKING_KEY` must be set to the same value on both servers: hPanel for the website, `/opt/door-estimator/.env` for the scheduler. The owner generates the value.
- `SHOP_ASSET_BASE` (optional) changes where email images load from. The default is `https://straightshotoverhead.com/assets/`.
