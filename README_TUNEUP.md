# $129 Tune-Up Landing Page (`/tuneup`)

Ad landing page + hybrid self-scheduling flow for the **Garage Door Tune-Up +
New Rollers for $129** offer. Customers pick an arrival window and submit an
appointment **request**; the office confirms by text or phone. Emergency /
special conditions (stuck door, broken spring, cable, off-track, commercial,
same-day, 2+ doors) are routed to a phone call instead.

Live URL: `https://estimate.straightshotoverhead.com/tuneup`
(point ads here; UTM parameters, `gclid`, and `fbclid` are captured onto each
booking record automatically).

## Run locally

```bash
npm install
npx prisma migrate dev
npm run dev            # http://localhost:3000/tuneup
npm run validate:tuneup   # booking-flow unit checks (no server needed)
npm run build          # production build + type check
```

## Where everything lives

| What | File |
| --- | --- |
| **Business config (all copy claims)** | `lib/tuneup/booking-config.ts` |
| Arrival windows / lead time / capacity | `SCHEDULING` in `booking-config.ts` |
| Status model, validation, routing rules | `lib/tuneup/booking.ts` |
| Booking provider (mock + integration boundary) | `lib/tuneup/booking-provider.ts` |
| Customer receipt + office alert emails | `lib/tuneup/booking-emails.ts` |
| Analytics hooks (vendor-neutral) | `lib/tuneup/analytics.ts` |
| FAQ / checklist copy + offer disclosure | `lib/tuneup/landing-copy.ts` |
| Page + structured data | `app/tuneup/page.tsx` |
| Landing sections | `components/tuneup/landing/` |
| Booking flow steps | `components/tuneup/booking/` |
| API (submit, availability) | `app/api/door-estimator/tuneup-booking/` |
| DB model | `TuneUpBooking` in `prisma/schema.prisma` |
| Tests | `scripts/validate-tuneup-booking.ts` |

## Updating business information

Everything customer-visible reads from `BUSINESS` in
`lib/tuneup/booking-config.ts`. **`null` means "not verified yet" and hides
the related section** — never invent a value:

- `serviceZipCodes: []` → empty list accepts every ZIP (recorded on the lead,
  verified by phone). Add ZIP strings (`["75701", "75702", ...]`) to turn on
  gating: unlisted ZIPs get the "outside our usual routes" screen and their
  leads are saved with status `service_area_review`.
- `rollerQuantity` / `rollerType` → until set, copy says "new standard
  rollers" with no count.
- `regularPrice` → set a real regular price to show the savings box (savings
  are computed, never hard-coded).
- `reviewRating` + `reviewCount`, `yearsInBusiness`, `licenseText`,
  `offerExpiration`, `promotionalAppointmentLimit`, `warrantyText`,
  `taxDisclosure`, `privacyPolicyUrl`, `termsUrl` → optional; hidden until real.
- Testimonials: `TESTIMONIALS` in the same file — currently the three real
  Google reviews published on the homepage. Never ship invented reviews.

## Arrival windows & availability

`SCHEDULING` in `booking-config.ts`: windows (`8-11`, `11-2`, `2-5`),
`minLeadDays` (1 = earliest is tomorrow), `maxDaysOut` (14), `closedWeekdays`
(Sunday), `requestsPerWindow` (2 — a window stops being offered once that many
open requests exist for it). Past/closed/full windows can't be selected client-
side and are re-rejected server-side.

**Production uses the Field app dispatch board** (`BOOKING_PROVIDER=fieldapp`
on the VPS): on top of the local rules, a window shows "Booked" when ANY
scheduled job or tech time-off block on the StraightShot Field dispatch board
overlaps it (one-crew rule). Busy intervals come from the fieldapp's
key-protected `GET /api/booking-busy` (`FIELDAPP_URL`, shared
`DOOR_ESTIMATOR_ADMIN_KEY`), cached 60s, and **fail open** to the local rules
if the fieldapp is unreachable. Booking requests appear in the Field app under
Door Leads → Bookings, where "+ Create job on dispatch board" turns one into a
customer (deduped by phone) + scheduled job and marks the booking confirmed.
With `BOOKING_PROVIDER` unset (local dev), the mock provider applies local
rules only. Other integrations (Google Calendar / Jobber / Housecall Pro /
ServiceTitan) would implement the same `BookingProvider` interface in
`lib/tuneup/booking-provider.ts`.

## Booking statuses

`requested` → new self-scheduled request (never auto-`confirmed`)
`pending_confirmation` → office has seen it, confirmation in flight
`confirmed` → office confirmed with the customer (set manually)
`call_required` → emergency/special-condition lead; call them
`service_area_review` → ZIP outside configured area; check the route
`cancelled` → dead

## Notifications

Office alerts + customer receipts send through the existing SMTP client
(`lib/email.ts`) using `SMTP_*` and `LEAD_ALERT_TO` env vars (already set on
the VPS). With no SMTP configured, a safe log line is written instead. SMS
(Twilio) and CRM webhooks are documented adapter points in
`lib/tuneup/booking-emails.ts` / `.env.example` — not wired yet.

## Anti-spam / safety

Server-side re-validation of every field, honeypot field (`company`),
per-IP rate limit (6 requests / 10 min), duplicate-submission idempotency
(same phone + window returns the original reference), sanitized free text,
PII-light logging (reference + routing only).

## Verify before launching ads

1. **Privacy policy**: publish one and set `privacyPolicyUrl` — Google Ads
   generally requires it on pages collecting contact info.
2. Roller count/type, warranty terms, tax handling — set real values in config
   when decided (copy stays hedged-but-honest until then).
3. `requestsPerWindow` and windows should match real crew capacity.
4. Send a test booking and confirm the office alert arrives.

## Deploy (VPS)

```bash
ssh -i ~/.ssh/straightshot_vps root@2.24.125.105
cd /opt/door-estimator
cp prisma/prod.db /root/backups/prod-$(date +%F).db   # backup before migrating
git checkout -- . && git pull                          # discard npm-install lockfile noise
git log --oneline -1                                   # MUST match the pushed commit
npx prisma generate && npx prisma migrate deploy
npm run build && systemctl restart straightshot-door-estimator
```

nginx: `/tuneup` must be in the allowlist of the
`estimate.straightshotoverhead.com` vhost (same pattern as `/noise-check`).
