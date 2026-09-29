# Launch QA — repair landing page + paused campaign

Run after deploying the landing page and before enabling the campaign.

1. `npm run validate:repair && npm run validate:campaign && npm run build && npm run e2e:repair` all pass.
2. On a phone: open the final URL; the H1 reads "Garage Door Repair"; the form is visible without
   scrolling past the hero; every field has a label; errors keep what was typed.
3. Submit one request with the recipient temporarily set to a sandbox inbox: success shows a
   reference and "nothing is booked yet"; the email arrives with the right subject; the Door Leads
   → Repair card shows "Email to Ricky sent" and the waiting timer. Close the test lead after.
4. With the Google tag configured: Tag Assistant shows one conversion event after the success
   screen, with the reference as transaction ID, and none on a validation error.
5. The campaign in Google Ads is PAUSED, Search only, Smith County (county, ID 9059615), presence
   targeting, one phrase keyword, headline 1 pinned, $100/day.
6. No other campaign was changed.
