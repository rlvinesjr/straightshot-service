// One-time Door Pricing update for the website door shop (Oct 26 2026): adds the vendor's wood-finish
// (Driftwood & Walnut) Long Panel Carriage window rates from page 7 of "1-LGV Price Book 5-4-2026 PRELIM v4.24.2026"
// to the saved price book, so the owner can keep editing them centrally (Field app → Admin → Door Pricing).
// Changes nothing else. Saving creates a new price book version, exactly like publishing from the Field app.
//
//   node scripts/pricebook-add-wood-window-rates.mjs [--base http://127.0.0.1:3001] [--apply]
// Reads the admin key from DOOR_ESTIMATOR_ADMIN_KEY (or "straightshot-dev" on a local dev server). Dry run by default.
const args = process.argv.slice(2);
const base = (args[args.indexOf('--base') + 1] && args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:3001').replace(/\/$/, '');
const apply = args.includes('--apply');
const key = process.env.DOOR_ESTIMATOR_ADMIN_KEY || 'straightshot-dev';
const WOOD = {
  plain: { essential: { carriage: 82.15 }, comfort: { carriage: 96.99 }, premium: { carriage: 96.99 } },
  decorative: { essential: { carriage: 103.35 }, comfort: { carriage: 118.19 }, premium: { carriage: 118.19 } },
};
const headers = { 'X-Door-Estimator-Key': key, 'Content-Type': 'application/json' };
const res = await fetch(base + '/api/door-estimator/admin', { headers });
if (!res.ok) { console.error('Could not read Door Pricing:', res.status); process.exit(1); }
const config = await res.json();
const changes = [];
for (const w of config.windows) {
  if (!WOOD[w.code]) continue;
  if (JSON.stringify(w.woodCosts || null) === JSON.stringify(WOOD[w.code])) continue;
  if (w.woodCosts) { console.error(`"${w.code}" already has different wood-finish rates; leaving Door Pricing unchanged.`); process.exit(1); }
  w.woodCosts = WOOD[w.code];
  changes.push(w.code);
}
console.log(`Door Pricing v${config.version}: wood-finish window rates to add for: ${changes.join(', ') || 'nothing (already present)'}`);
if (!changes.length || !apply) { if (changes.length) console.log('Dry run. Re-run with --apply to save.'); process.exit(0); }
const saved = await fetch(base + '/api/door-estimator/admin', { method: 'PATCH', headers, body: JSON.stringify(config) });
const body = await saved.json().catch(() => ({}));
if (!saved.ok) { console.error('Save failed:', saved.status, body.error || ''); process.exit(1); }
console.log(`Saved as Door Pricing v${body.version}.`);
