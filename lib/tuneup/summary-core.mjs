// GENERATED COPY of service-app/public/assets/summary-core.js. Do not edit; run `npm run sync:summary` in service-app.
// source-sha256: ed5318ba416a1fe97bcaa5be93f107bc2604ce1a358bda429d8ca83b5115c757
// StraightShot shop request summary: the ONE shared contract for every shop product page.
// Source of truth: service-app/public/assets/summary-core.js. The scheduler (door-estimator) keeps an exact copy at
// lib/tuneup/summary-core.mjs, written by `npm run sync:summary` in service-app. Never edit the copy by hand.
//
// A request snapshot is built and validated on the website server, re-validated and stored by the scheduler with the
// booking, and returned to the browser. The on-screen confirmation, the Save as PDF file and the customer email are all
// rendered from that one stored snapshot, so they always show the same selections, price and reference.
// Dependency-free: runs in browsers, in Node (website) and in Next.js (scheduler).

export const SNAPSHOT_SCHEMA = 'straightshot.shop-request';
export const SNAPSHOT_VERSION = 1;
export const STATUS = 'Appointment awaiting confirmation';
export const NO_PAYMENT = 'No payment has been collected.';
export const CONTACT = '(903) 245-1182';
export const TIME_ZONE = 'America/Chicago';
export const PLACEHOLDER_IMAGE = 'summary-placeholder.png';

// Visit types differ by product: an opener request asks for an installation; a door request asks for a free site
// inspection and measurements. Keep them distinct.
export const VISIT_TYPES = {
 'opener-installation': 'Installation request',
 'door-inspection': 'Free site inspection & measurements',
};

// Central product registry. Every shop product's approved reference image and package text lives here; a product
// that is not registered renders the neutral placeholder image, never another product's photo.
export const PRODUCTS = {
 '2220l': {kind:'opener', model:'2220L', name:'LiftMaster 2220L', category:'Garage door openers', image:'liftmaster-2220l.png', imageAlt:'LiftMaster 2220L garage door opener', includes:'Professional installation, one remote, wall control, safety sensors, and rail matched to your confirmed door height. 19-point inspection, lubrication, and torsion-system balancing.'},
 '6580l': {kind:'opener', model:'6580L', name:'LiftMaster 6580L', category:'Garage door openers', image:'liftmaster-6580l.png', imageAlt:'LiftMaster 6580L garage door opener', includes:'Professional installation, one remote, motion-detecting wall control, safety sensors, backup battery, and belt-drive rail. 19-point inspection, lubrication, and torsion-system balancing.'},
 '6690l': {kind:'opener', model:'6690L', name:'LiftMaster 6690L', category:'Garage door openers', image:'liftmaster-6690l.png', imageAlt:'LiftMaster 6690L garage door opener', includes:'Professional installation, two remotes, keypad, LCD wall control, safety sensors, backup battery, and belt-drive rail. 19-point inspection, lubrication, and garage-door system adjustment.'},
 'door-410': {kind:'door', model:'410', name:'DoorLink 410 · Traditional Raised Panel', category:'Garage doors · Non Insulated', image:'summary-door-410.png', imageAlt:'Manufacturer brochure example of a white DoorLink 410 raised-panel door with plain windows', imageNote:'Brochure example: White with plain windows. Your selected finish and windows are listed below.'},
};
export const IMAGES = new Set([...Object.values(PRODUCTS).map(p => p.image), PLACEHOLDER_IMAGE]);

const OPENER_TERMS = 'We will confirm the appointment, product availability, compatibility, and installation scope with you, and explain payment arrangements before any work. Any additional work needs your approval.';
const DOOR_TERMS = 'This is a free site inspection and measurement request. We will confirm your appointment, dimensions, finish, window layout, availability, site conditions, and final price before you approve the work and pay.';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '';
const line = (value, max) => clean(value, max).replace(/\s+/g, ' ');

export function money(cents) {
 return cents === null || cents === undefined ? 'Price to confirm' : new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:cents % 100 ? 2 : 0}).format(cents / 100);
}
export function dateLabel(date) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return String(date || 'To confirm');
 const [y, m, d] = date.split('-').map(Number);
 return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC'});
}
export function phoneLabel(digits) {
 const d = String(digits || '').replace(/\D/g, '');
 return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(digits || '');
}
const CONTACT_METHODS = {text:'Text', phone:'Phone call'};

/** Checks and normalizes a snapshot. Throws an Error whose message is safe to show. Display prices are always
 * re-derived from the amount, so a stored snapshot can never show a price that differs from its amount. */
export function validateSnapshot(input) {
 const fail = message => { throw new Error(message); };
 if (!input || typeof input !== 'object' || Array.isArray(input)) fail('The request summary is missing.');
 if (input.schema !== SNAPSHOT_SCHEMA || input.version !== SNAPSHOT_VERSION) fail('The request summary format is not supported.');
 const kind = input.kind === 'door' ? 'door' : input.kind === 'opener' ? 'opener' : fail('Unknown product type.');
 const visitTypeId = input.visitType?.id;
 if (!VISIT_TYPES[visitTypeId]) fail('Unknown visit type.');
 if ((kind === 'door') !== (visitTypeId === 'door-inspection')) fail('The visit type does not match the product.');
 const p = input.product || {};
 const registered = PRODUCTS[p.id];
 if (registered && registered.kind !== kind) fail('The product does not match the request type.');
 const product = {
  id: line(p.id, 40), model: line(p.model, 40), name: line(p.name, 120), category: line(p.category, 80),
  image: registered?.image || PLACEHOLDER_IMAGE,
  imageAlt: line(p.imageAlt, 200) || (registered ? registered.imageAlt : 'Product image to be confirmed'),
  imageNote: line(p.imageNote, 200) || (registered ? 'Product reference image' : 'Reference image to be confirmed'),
  quantity: Number.isSafeInteger(p.quantity) && p.quantity >= 1 && p.quantity <= 10 ? p.quantity : 1,
  includes: clean(p.includes, 600), exclusions: clean(p.exclusions, 400),
 };
 if (!product.id || !product.name) fail('The product is missing.');
 if (!Array.isArray(input.selections) || input.selections.length < 1 || input.selections.length > 30) fail('The selections are missing.');
 const selections = input.selections.map(s => {
  const item = {id: line(s?.id, 40), label: line(s?.label, 60), value: line(s?.value, 80), display: line(s?.display, 160)};
  if (!item.id || !item.label || !item.display) fail('A selection is incomplete.');
  return item;
 });
 if (new Set(selections.map(s => s.id)).size !== selections.length) fail('A selection is listed twice.');
 const pr = input.price || {};
 const amount = pr.amountCents === null || pr.amountCents === undefined ? null : pr.amountCents;
 if (amount !== null && !(Number.isSafeInteger(amount) && amount >= 0 && amount <= 10000000)) fail('The price is not valid.');
 const basis = pr.basis && typeof pr.basis === 'object' ? JSON.parse(JSON.stringify(pr.basis)) : null;
 const price = {
  amountCents: amount, currency: 'USD', display: money(amount),
  tax: pr.tax === 'included' ? 'included' : 'not-stated',
  wording: line(pr.wording, 160) || (amount === null ? 'Price to confirm' : 'Estimate'),
  source: {name: line(pr.source?.name, 80), version: Number.isSafeInteger(pr.source?.version) ? pr.source.version : null, calculatedAt: line(pr.source?.calculatedAt, 40)},
  basis: amount === null ? null : basis,
 };
 const v = input.visit || {};
 const visit = {
  date: /^\d{4}-\d{2}-\d{2}$/.test(v.date || '') ? v.date : fail('The visit date is missing.'),
  windowId: line(v.windowId, 20), windowLabel: line(v.windowLabel, 60) || fail('The arrival window is missing.'),
  timeZone: TIME_ZONE, confirmation: 'awaiting',
 };
 const c = input.customer || {};
 const customer = {
  name: line(c.name, 120), email: line(c.email, 120), phone: String(c.phone || '').replace(/\D/g, '').slice(0, 10),
  street: line(c.street, 200), city: line(c.city, 80), state: line(c.state, 2).toUpperCase(), zip: line(c.zip, 5),
  contactMethod: c.contactMethod === 'phone' ? 'phone' : 'text', notes: clean(c.notes, 500),
 };
 if (customer.name.length < 2 || customer.phone.length !== 10 || !customer.email || !customer.street || !customer.city || !/^[A-Z]{2}$/.test(customer.state) || !/^\d{5}$/.test(customer.zip)) fail('The customer details are incomplete.');
 return {
  schema: SNAPSHOT_SCHEMA, version: SNAPSHOT_VERSION,
  reference: input.reference ? line(input.reference, 20) : null,
  createdAt: input.createdAt ? line(input.createdAt, 40) : null,
  status: {code: 'requested', label: STATUS},
  kind, visitType: {id: visitTypeId, label: VISIT_TYPES[visitTypeId]},
  product, selections, price, visit, customer,
  terms: {payment: NO_PAYMENT, nextSteps: kind === 'door' ? DOOR_TERMS : OPENER_TERMS, contactPhone: CONTACT},
 };
}

/** Opener package request. `choice` is the server-validated quote: {model, height, priceCents}. */
export function openerSnapshot({choice, customer, visit, reference = null, createdAt = null, source = {}}) {
 const p = PRODUCTS[choice.model];
 if (!p || p.kind !== 'opener') throw new Error('Unknown opener.');
 const heights = {'7 ft':'7-ft', '8 ft':'8-ft', 'Not sure':'not-sure'};
 if (!heights[choice.height]) throw new Error('Unknown door height.');
 return validateSnapshot({
  schema: SNAPSHOT_SCHEMA, version: SNAPSHOT_VERSION, reference, createdAt, kind: 'opener',
  visitType: {id: 'opener-installation'},
  product: {id: choice.model, model: p.model, name: p.name, category: p.category, imageAlt: p.imageAlt, quantity: 1, includes: p.includes,
   exclusions: 'Door repairs, electrical work, taller doors, other rail lengths, and extra accessories are separate work that needs your approval first.'},
  selections: [
   {id: 'opener', label: 'Opener', value: choice.model, display: p.name},
   {id: 'door-height', label: 'Door / rail height', value: heights[choice.height], display: choice.height === 'Not sure' ? 'Not sure · we’ll confirm it' : choice.height},
  ],
  price: {amountCents: choice.priceCents ?? null, tax: 'included', wording: choice.priceCents === null || choice.priceCents === undefined ? 'Installed price to confirm' : 'Estimated installed package · tax included',
   source: {name: source.name || 'Website price book', version: source.version ?? null, calculatedAt: source.calculatedAt || ''}},
  visit, customer,
 });
}

/** Door inspection request. `door` is the server-validated configuration with its server-calculated price. */
export function doorSnapshot({door, customer, visit, reference = null, createdAt = null}) {
 const p = PRODUCTS[door.productId];
 if (!p || p.kind !== 'door') throw new Error('Unknown door.');
 const size = door.size ? `${door.size.width} × ${door.size.height} ft` : 'Measurements needed';
 const windows = !door.windows ? 'No windows' : 'Yes';
 const insert = !door.windows ? 'None · No windows' : door.insert ? `${door.insert.name} ${door.insert.label}` : 'No insert · Plain glass';
 return validateSnapshot({
  schema: SNAPSHOT_SCHEMA, version: SNAPSHOT_VERSION, reference, createdAt, kind: 'door',
  visitType: {id: 'door-inspection'},
  product: {id: door.productId, model: p.model, name: p.name, category: p.category, imageAlt: p.imageAlt, imageNote: p.imageNote, quantity: 1,
   includes: door.includes, exclusions: door.exclusions},
  selections: [
   {id: 'model', label: 'Door model', value: p.model, display: p.name},
   {id: 'insulation', label: 'Construction', value: door.insulation.code, display: door.insulation.label},
   {id: 'size', label: 'Door size', value: door.size ? `${door.size.width}x${door.size.height}` : 'measure', display: size},
   {id: 'color', label: 'Color', value: door.color.code, display: door.color.name + (door.color.note ? ` · ${door.color.note}` : '')},
   {id: 'windows', label: 'Windows', value: door.windows ? 'yes' : 'none', display: windows},
   {id: 'insert', label: 'Window insert', value: !door.windows ? 'none' : door.insert ? door.insert.code : 'plain', display: insert},
  ],
  price: {amountCents: door.priceCents ?? null, tax: 'not-stated',
   wording: door.priceCents === null || door.priceCents === undefined ? (door.priceNote || 'Price to confirm at your free visit') : 'Preliminary installed estimate · final price confirmed on site',
   source: {name: 'Door Pricing', version: door.pricebookVersion ?? null, calculatedAt: door.calculatedAt || ''}, basis: door.basis || null},
  visit, customer,
 });
}

const fullAddress = c => `${c.street}, ${c.city}, ${c.state} ${c.zip}`;
/** Every row shown on screen, in the PDF and in the email: all selections, then the visit, then the customer. */
export function detailRows(s) {
 return [
  ...s.selections.map(x => [x.label, x.display]),
  ['Visit type', s.visitType.label],
  ['Requested visit', dateLabel(s.visit.date)],
  ['Arrival window', s.visit.windowLabel + ' · Central Time'],
  ['Customer', s.customer.name],
  ['Service address', fullAddress(s.customer)],
  ['Phone', phoneLabel(s.customer.phone)],
  ['Email', s.customer.email],
  ['Preferred contact', CONTACT_METHODS[s.customer.contactMethod] || 'Text'],
 ];
}
export const imagePath = s => IMAGES.has(s.product.image) ? s.product.image : PLACEHOLDER_IMAGE;
const packageHeading = s => s.kind === 'door' ? 'Included in your estimate' : 'Included in your package';

export function emailHTML(snapshot, assetBase = 'https://straightshotoverhead.com/assets/') {
 const s = validateSnapshot(snapshot), e = escape;
 const rows = detailRows(s).map(([label, value]) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #dce7e9;color:#526b75;width:37%;vertical-align:top;font-size:13px">${e(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #dce7e9;font-size:13px;overflow-wrap:anywhere">${e(value)}</td></tr>`).join('');
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your StraightShot request</title></head><body style="margin:0;padding:18px 8px;background:#edf4f5;color:#173641;font-family:Arial,Helvetica,sans-serif"><table role="presentation" style="width:100%;max-width:620px;margin:auto;border-collapse:collapse;background:#fff"><tr><td style="padding:24px 26px;border-bottom:4px solid #008b9e"><strong style="font-size:22px;letter-spacing:.8px">STRAIGHTSHOT</strong><br><span style="font-size:10px;letter-spacing:4px;color:#006d7c">OVERHEAD</span></td></tr><tr><td style="padding:24px 26px 10px"><p style="font-size:11px;color:#526b75;letter-spacing:1px">REFERENCE ${e(s.reference || '')}</p><h1 style="font-size:29px;line-height:1.15;margin:8px 0 16px">Your choices. All in one place.</h1><p style="background:#eaf6f7;border-left:4px solid #008b9e;padding:14px;font-size:14px;font-weight:bold;color:#006d7c">${STATUS}</p><p style="font-size:14px;line-height:1.6"><strong>${e(s.visitType.label)}.</strong> We received your request. Keep this overview of your selections and preferred visit time. Our team will contact you to confirm. ${NO_PAYMENT}</p></td></tr><tr><td style="padding:8px 26px 20px;text-align:center"><img src="${e(assetBase + imagePath(s))}" alt="${e(s.product.imageAlt)}" width="230" style="display:block;width:230px;max-width:100%;height:auto;margin:0 auto 12px"><p style="font-size:11px;color:#526b75">${e(s.product.imageNote)}</p><h2 style="font-size:22px;margin:16px 0 10px">${e(s.product.name)}</h2><strong style="font-size:32px;color:#006d7c">${e(s.price.display)}</strong><p style="font-size:12px;color:#526b75">${e(s.price.wording)}</p></td></tr><tr><td style="padding:0 26px"><table role="presentation" style="border-collapse:collapse;width:100%">${rows}</table></td></tr><tr><td style="padding:22px 26px">${s.product.includes ? `<h3 style="font-size:15px">${packageHeading(s)}</h3><p style="font-size:13px;line-height:1.7">${e(s.product.includes)}</p>` : ''}${s.product.exclusions ? `<h3 style="font-size:15px">Not included</h3><p style="font-size:13px;line-height:1.7">${e(s.product.exclusions)}</p>` : ''}${s.customer.notes ? `<h3 style="font-size:15px">Your notes</h3><p style="font-size:13px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere">${e(s.customer.notes)}</p>` : ''}<h3 style="font-size:15px">What happens next?</h3><p style="font-size:13px;line-height:1.7"><strong>${NO_PAYMENT}</strong> ${e(s.terms.nextSteps)}</p></td></tr><tr><td style="padding:22px 26px;background:#173641;color:#fff"><strong>Questions or changes?</strong><p style="font-size:14px">Call <a href="tel:+19032451182" style="color:#fff">${CONTACT}</a> or reply to this email.</p><span style="font-size:11px">StraightShot Overhead · Tyler &amp; East Texas</span></td></tr></table></body></html>`;
}

export function cardHTML(snapshot, assetBase = '/assets/') {
 const s = validateSnapshot(snapshot), e = escape;
 return `<article class="ss-summary"><div class="ss-brand">STRAIGHTSHOT <span>OVERHEAD</span></div><p class="ss-reference">REFERENCE ${e(s.reference || '')}</p><h2>Your choices.<br><em>All in one place.</em></h2><p class="ss-status">${STATUS}</p><p class="ss-payment"><strong>${e(s.visitType.label)}.</strong> ${NO_PAYMENT}</p><div class="ss-product"><img src="${e(assetBase + imagePath(s))}" alt="${e(s.product.imageAlt)}"><div><h3>${e(s.product.name)}</h3><strong>${e(s.price.display)}</strong><p>${e(s.price.wording)}</p></div></div><p class="ss-muted">${e(s.product.imageNote)}</p><dl>${detailRows(s).map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>${s.product.includes ? `<h3>${packageHeading(s)}</h3><p>${e(s.product.includes)}</p>` : ''}${s.product.exclusions ? `<h3>Not included</h3><p>${e(s.product.exclusions)}</p>` : ''}${s.customer.notes ? `<h3>Your notes</h3><p class="ss-notes">${e(s.customer.notes)}</p>` : ''}<h3>What happens next?</h3><p><strong>${NO_PAYMENT}</strong> ${e(s.terms.nextSteps)}</p><footer>Questions or changes? <a href="tel:+19032451182">${CONTACT}</a></footer></article>`;
}

/** Summary for a saved booking. New requests carry their stored snapshot; requests saved before snapshots existed
 * fall back to the legacy opener note format (compatibility only — never extend this parser for new products). */
export function summaryFromBooking(b) {
 if (b && b.requestSnapshot) {
  try { return validateSnapshot({...JSON.parse(b.requestSnapshot), reference: b.reference}); } catch { return null; }
 }
 const notes = b?.notes || '';
 const match = notes.match(/^SHOP INSTALLATION REQUEST: LiftMaster (2220L|6580L|6690L); door\/rail height: (7 ft|8 ft|Not sure); (Installed package \$(\d+\.\d{2}), tax included|Installed price to confirm)\./);
 if (!match) return null;
 const windows = {'8-11':'8:00 AM – 11:00 AM', '11-2':'11:00 AM – 2:00 PM', '2-5':'2:00 PM – 5:00 PM'};
 try {
  return openerSnapshot({
   choice: {model: match[1].toLowerCase(), height: match[2], priceCents: match[4] ? Math.round(Number(match[4]) * 100) : null},
   customer: {name: [b.firstName, b.lastName].filter(Boolean).join(' '), email: b.email || '', phone: b.phone, street: b.serviceAddress, city: b.city, state: b.state, zip: b.zipCode,
    contactMethod: b.preferredContactMethod === 'phone' ? 'phone' : 'text', notes: notes.includes(' Customer note: ') ? notes.split(' Customer note: ').slice(1).join(' Customer note: ') : ''},
   visit: {date: b.requestedDate, windowId: b.requestedWindow, windowLabel: windows[b.requestedWindow] || b.requestedWindow},
   reference: b.reference, source: {name: 'Legacy opener request'},
  });
 } catch { return null; }
}
