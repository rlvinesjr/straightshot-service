# Tracking map — Smith County repair campaign

Checked 2026-09-28: **no Google tag, Tag Manager container, GA4 property or Ads conversion
action is installed** on straightshotoverhead.com or estimate.straightshotoverhead.com (the
insulation page has a commented-out placeholder only). So nothing below duplicates an existing
tag. Account-side settings (auto-tagging, existing conversion actions) could not be inspected —
there is no Google Ads access from this project.

## The path of one lead

| Step | Where | What is recorded | Identifier |
|---|---|---|---|
| Ad click | Google Ads | auto-tagging appends `gclid` (or `gbraid`/`wbraid` on iOS); final URL suffix adds `utm_*` with campaign / ad-group IDs and the matched keyword | gclid |
| Landing | `/lp/garage-door-repair` (estimate app) | allowlisted params only → `sessionStorage` for the visit. Nothing from the URL is rendered | — |
| Form submit | `POST /api/repair-request` | **Lead saved first**: `TuneUpBooking` row, `serviceType=repair`, `status=call_required`, `submissionId`, gclid/gbraid/wbraid, utm_*, `landingPath`, `landingKeyword`, `createdAt` | reference `RR-XXXXX` |
| Lead conversion | browser, after the 201/200 | `dataLayer` event `repair_request_success` `{reference}`; if the Google tag is configured, `gtag('event','conversion',{send_to, transaction_id: reference})`. **Never fires on a storage failure** (the server returns no reference) | transaction_id = RR-XXXXX |
| Office email | estimate app, after the response | to ricky@straightshotoverhead.com via the existing SMTP sender. `notifyStatus`/`notifyAttempts`/`notifyError`/`notifiedAt` on the lead. Failed sends retry on a backoff (5-minute timer) | — |
| First human response | Field app → Door Leads → Repair → "I reached them" | `firstResponseAt` (first time only). Automation never sets it | — |
| Booked | Field app → "+ Create job" | job + customer created; `bookedAt`, `fieldJobId` upstream; **`lead_attribution` row** in the Field app copies the click IDs + UTMs server-to-server | job_id |
| Sale | Field app, invoice on that job paid in full | existing `invoices.status='paid'`, `paid_at`, `subtotal` — no parallel ledger | invoice_id |
| Offline conversion | Field app → Door Leads → Repair → "Google Ads upload file" (admin) | CSV in Google's click-conversion template; exports logged in `ads_conversion_exports` | gclid + name + time |

## Internal record fields (brief → where they live)

| Brief field | Stored as |
|---|---|
| lead_id | `TuneUpBooking.reference` (RR-XXXXX) — also `lead_attribution.lead_ref` |
| created_at | `TuneUpBooking.createdAt` / `lead_attribution.lead_created_at` |
| gclid, UTMs | `TuneUpBooking.gclid/gbraid/wbraid/utm*` → copied to `lead_attribution` at job creation |
| landing_url | `landingPath` (path only — the query string is never stored raw) |
| approved keyword / ad-group IDs | `landingKeyword` (allowlisted); ad-group and campaign IDs via `utm_content={adgroupid}` / `utm_campaign={campaignid}` |
| service_type | `serviceType = "repair"` |
| county | **not asserted** — ZIP is recorded and the county is confirmed on the call (ZIPs cross county lines) |
| status | `TuneUpBooking.status` (call_required → pending_confirmation → confirmed / cancelled) |
| job_id | `fieldJobId` upstream; `lead_attribution.job_id` in the Field app |
| paid_at, revenue, currency | Field app `invoices.paid_at`, `invoices.subtotal` (pre-tax), USD |

## What never goes to analytics
Name, phone, email, ZIP and problem text are never in URLs, `dataLayer` events or Google tags.
The only identifier sent is the lead reference as `transaction_id`. Click IDs are kept out of
the office email, list payloads and the browser; they leave the estimate app only through the
key-protected `/attribution` call to the Field app, and leave the Field app only in the
admin-only upload file.

## Conversion goals (DECISION REQUIRED)
- **Repair Request (website)** — proposed PRIMARY at launch: it is the only signal with volume.
- **Paid Repair Job (offline)** — proposed SECONDARY: reported for ROAS, not bid on, until paid
  jobs arrive regularly. A lead and its later sale are different events; they are not both
  primary, so bidding never counts one customer twice.

## Offline import rules the file follows
- Google's template (support.google.com/google-ads/answer/7014069, checked 2026-09-28):
  `Parameters:TimeZone=America/Chicago`, then
  `Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency`.
- Only **paid in full** invoices. Estimates, unpaid and part-paid invoices never count.
- Value = invoice subtotal (pre-tax). Currency USD.
- Rows are left out — and listed on screen with the reason — when there is no gclid, only an
  iOS `gbraid`/`wbraid` (not accepted by this file; needs an API upload), a zero value, or the
  sale came more than 90 days after the click.
- Google may not record a conversion uploaded within a day of its click — upload a day later.
- Re-uploading the same click + conversion name + time is de-duplicated by Google; exports are
  logged in `ads_conversion_exports` so you can see what has been sent.
- Refunds: the Field app has no refund flow. If a paid job is later refunded, adjust or retract
  that conversion in Google Ads by hand.

## Status
- Built and tested: everything in the "path of one lead" table up to and including the upload file.
- Simulated only: the upload itself — the tests check the file against the template using obvious
  fixture click IDs. **Live import verification is pending** a real, eligible paid job from a real click.
- Not built: Google Ads API upload (manual file upload instead); GA4 (none exists; not required).
