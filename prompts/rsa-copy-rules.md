# Rules for writing or changing ad copy and landing copy

- Headlines ≤ 30 characters, descriptions ≤ 90, paths ≤ 15, callouts ≤ 25, sitelink text ≤ 25,
  sitelink descriptions ≤ 35. Run `npm run validate:campaign` after every change.
- The landing-page H1 matches the pinned headline 1 of the ad group it serves
  (`lib/repair/landing.ts`). Add new ad groups there — never render text from the URL.
- Only state what is true today: residential repair in Smith County, Texas — springs, cables,
  rollers, tracks, openers. No ratings, reviews, testimonials, warranties, licenses, discounts,
  guarantees, 24/7, emergency or same-day promises unless Ricky confirms them in writing.
- Never imply an appointment is booked. The form sends a request; we contact them to arrange a visit.
- Real photos only, from StraightShot jobs, captioned with what they actually show.
