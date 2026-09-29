# Building the campaign in Google Ads — PAUSED

Source of truth: `campaigns/smith-county-repair/manifest.json` (run `npm run validate:campaign`
after any edit). Build it **paused**. Nothing spends until someone turns it on, and that should
wait for the decisions at the bottom.

Before starting, search the account for a campaign named **SSO — Search — Smith County — Repair**.
If it exists, edit that one — never build a second copy. Don't change any other campaign.

## 1. Account settings (once)
- **Time zone**: (GMT-06:00) Central Time. It is set when the account is created and cannot be
  changed — if it is something else, translate every schedule into it.
- **Auto-tagging**: Admin → Account settings → Auto-tagging → ON. Without it there is no gclid
  and no way to tie a paid job back to a click.

## 2. Campaign
New campaign → objective *Leads* or *no goal* → **Search**.
- Name: `SSO — Search — Smith County — Repair`
- Networks: **Google Search only**. Untick *Search Network partners* and *Display Network*.
- Locations: **Enter another location → Advanced search** → search `Smith County, Texas, United States`
  and confirm the result is the **County** (ID 9059615) — not the city of Tyler and not a radius.
- Location options → Target: **Presence: people in or regularly in your targeted locations**.
- Excluded locations: the 218 countries in `excluded-locations.csv` (Advanced search → Bulk
  locations, paste the names; check Google matched each one as a Country). Never exclude
  Texas or the United States.
- Languages: English.
- Budget: **$100 average daily**. No automatically applied budget recommendations.
- Bidding: **leave for the decision below**; if the screen forces a choice, pick
  *Maximize clicks* and set the max CPC limit Ricky chose.
- Campaign URL options → Final URL suffix:
  `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}`
- Ad schedule: the hours someone answers leads, in Central time.
- Automatically created assets: **off** (the copy was reviewed on purpose).

## 3. Conversion actions (Goals → Conversions → New)
1. **Website** → *Repair Request (website)*, category *Submit lead form*, count **One**, no value.
   Install with *Google tag → Install it yourself*. Copy the tag ID (`AW-…`) and the event's
   `send_to` (`AW-…/…`) into the estimate app's server `.env` as
   `NEXT_PUBLIC_GOOGLE_ADS_ID` and `NEXT_PUBLIC_ADS_REPAIR_LEAD_SEND_TO`, then rebuild. The page
   already fires the event (with the lead reference as transaction ID) only after the lead is saved.
2. **Import → Other data sources or CRMs → Track conversions from clicks** →
   *Paid Repair Job (offline)*, category *Purchase*, count **Every**, value *use different values*.
   The name must match the Field app setting `ads_offline_conversion_name` exactly.

## 4. Ad group, keyword, ad
- Ad group `Garage Door Repair`, one keyword: `"garage door repair"` (the quotes make it phrase match).
- Responsive search ad: final URL `https://estimate.straightshotoverhead.com/lp/garage-door-repair`,
  paths `garage-door` / `repair`, the 15 headlines and 4 descriptions from the manifest.
  **Pin only "Garage Door Repair" to position 1.** Leave everything else unpinned.

## 5. Assets
- Callouts, the *Service catalog* structured snippet and the **three** ready sitelinks from the
  manifest. The About sitelink is held (no about page). Before the *Repair Services* sitelink
  runs, confirm the same-day and guarantee statements on that page are accurate.
- No call asset until answering hours are confirmed.

## 6. Negatives
Campaign-level **phrase** negatives from `negatives-proposal.csv`: add the *Add* rows; decide on
the *DECIDE* rows (`job`, `free`, `coupon`). No competitor names until a verified list exists.

## 7. Before turning it on (decisions for Ricky)
1. Bidding: Maximize clicks + your max CPC limit (proposal), or something else.
2. Primary goal: *Repair Request (website)* primary, *Paid Repair Job (offline)* secondary (proposal).
3. Ad schedule = the hours leads are answered.
4. The three DECIDE negatives.
5. Privacy notice wording (`/privacy`).
6. Landing page deployed and the smoke test (setup/README.md §1.7) passed.

## After launch
- Weekly: run the search-terms audit (`prompts/search-terms-audit.md`).
- After each paid ad job: Field app → Door Leads → Repair → **Google Ads upload file** →
  Goals → Conversions → Uploads → upload. Check the upload's results for errors. Wait a day after
  the click before uploading.
