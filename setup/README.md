# Setup — Smith County repair landing page & campaign

Everything here is **local and reversible**. Nothing is deployed and no Google Ads change has been made.

## 1. Deployment plan (estimate app on the VPS — do only after Ricky approves the preview)

The page lives in the existing Next.js app at `/opt/door-estimator` (estimate.straightshotoverhead.com).
Your main website (straightshotoverhead.com, separate hosting) is not touched.

1. **Back up** `/opt/door-estimator/prisma/prod.db` (or whatever `DATABASE_URL` points at).
2. `git pull` the branch, then `npm ci && npx prisma migrate deploy && npm run build`.
   The migration `repair_lead_fields` adds nullable columns to `TuneUpBooking`; the table is
   rebuilt with every existing row copied over.
3. **nginx** — the site only forwards listed paths. Add to `/etc/nginx/sites-available/estimate-straightshot`
   inside the 443 server block (same style as `/book`), then `nginx -t && systemctl reload nginx`:
   ```
   location /lp/ { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
   location = /privacy { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
   location /api/repair-request { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
   ```
   (Check first whether `/_next/` and `/api/door-estimator/` are already forwarded — they are, for `/book`.)
   `X-Forwarded-For` matters: the rate limit is per visitor IP.
4. **Env** (`/opt/door-estimator/.env`, never committed): existing `SMTP_*` are reused.
   Add `REPAIR_LEAD_ALERT_TO=ricky@straightshotoverhead.com` (optional — it is the default)
   and `FIELDAPP_PUBLIC_URL=https://straightshotservice.com`. Google tag variables only once
   the conversion action exists (step 3 of google-ads-build.md) — they are build-time, so rebuild after.
5. **Email retry timer**: copy `deploy/systemd/straightshot-repair-notify.{service,timer}` to
   `/etc/systemd/system/`, `systemctl daemon-reload && systemctl enable --now straightshot-repair-notify.timer`.
6. `systemctl restart straightshot-door-estimator`, then deploy the StraightShot Field changes
   (Door Leads → Repair tab, `lead_attribution`, upload file) the usual way.
7. **Smoke test with a sandbox address**: temporarily set `REPAIR_LEAD_ALERT_TO` to a test inbox,
   submit one request from a phone, confirm the email and the Door Leads card, close the test lead,
   then restore the recipient. Do not use a real customer's details.

## 2. Secrets
- Secrets stay in `.env` on the server (gitignored). `.env.example` holds placeholders only.
- OAuth client files, refresh tokens and `google-ads.yaml` are gitignored — never commit them.
- Logs: the repair route logs the reference, ZIP and whether a click ID exists — never the
  click ID, name, phone or email. SMTP errors are logged as their first line only.
- A `.env` file is not a security system: the VPS login, file permissions (`chmod 600 .env`) and
  the admin key on the estimator's office endpoints do the protecting.

## 3. Google Ads access (only needed for an API integration — the manual path needs none of this)
The campaign can be built by hand from `campaigns/smith-county-repair/manifest.json` using
`setup/google-ads-build.md`. An API integration later would need, from Ricky's side:
- the **customer ID** of the ads account (and the **manager account ID** if one is used, linked to it);
- a **developer token** from the manager account's API Center (basic access requires an application);
- a Google Cloud project with the Google Ads API enabled and an **OAuth client**. The consent
  screen can stay in *Testing* with Ricky's Google login as the only test user — publishing it
  is only needed for other people's accounts;
- the refresh token produced by that consent, stored server-side only.
None of these values should be pasted into chat; put them straight into the server `.env`.

## 4. Checks
```
npm run validate:repair     # form + page rules (12)
npm run validate:campaign   # manifest vs Google limits and the brief (12)
npm run build && npm run e2e:repair   # real server, throwaway DB, sandbox SMTP (12)
```
StraightShot Field: `node --test "test/*.test.js"` (includes `test/ads-revenue.test.js`).
