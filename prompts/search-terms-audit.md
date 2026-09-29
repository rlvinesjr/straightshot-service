# Search-terms audit — SSO — Search — Smith County — Repair

Use weekly. Input: the Search terms report (last 7 days) exported from Google Ads, plus the
current `campaigns/smith-county-repair/negatives-proposal.csv`.

1. Classify every search term as one of:
   - **Customer, repair** — someone with a residential door problem in or near Smith County.
   - **Customer, other service** — new door, opener install, insulation (not this ad group's job, but a real customer).
   - **Not a customer** — employment, training, DIY, parts shopping, commercial/industrial doors, other states.
   - **Unclear** — not enough to tell.
2. For **Not a customer** terms, propose a negative: the shortest phrase that blocks the pattern
   without blocking customer searches. State the match type (phrase by default), the terms it
   would have blocked this week, and any customer term it could also block.
3. Never propose a negative because a term had one click with no conversion. Never block a
   term that describes a real residential repair need.
4. Do not propose broad exclusions of "overhead door" (it is part of company names, including ours).
5. Output a table: term, clicks, cost, conversions, class, proposed action, risk. Changes are
   applied only after Ricky approves them — except rules he has explicitly approved in advance
   as unambiguous (write each such rule down in this file when he does).

Approved automatic rules: none yet.
