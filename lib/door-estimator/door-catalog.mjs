// GENERATED COPY of service-app/public/assets/door-catalog.js. Do not edit; run `npm run sync:summary` in service-app.
// source-sha256: 8309063b27474ca850a737246a9388214c4e08359d0d283608681a24817025e2
// StraightShot garage door shop catalog (approved October 26, 2026): eight styles × three constructions = 24 doors.
// The ONE product definition shared by the website (pages, gallery, server-side option checks) and the scheduler
// (door-estimator, which prices it). Product facts only: NO prices and NO costs live here. Every price comes from the
// job software's Admin Door Pricing through the scheduler. The scheduler keeps an exact copy at
// lib/door-estimator/door-catalog.mjs written by `npm run sync:summary` in service-app; never edit the copy.
// Model numbers are internal identifiers: customers see style names, never model numbers.

export const CATALOG_VERSION = '2026-10-26';
export const WIDTHS = [8, 9, 10, 12, 14, 15, 16, 17, 18];
export const HEIGHTS = [7, 8, 9];

// Insulation is the customer's LAST choice. `code` is the Door Pricing construction code.
export const CONSTRUCTIONS = {
 non: {key: 'non', code: 'essential', slug: 'non-insulated', label: 'Non Insulated', short: 'Non Insulated', gauge: '24-gauge steel', rating: null,
  heading: 'Steel front. Open interior.', copy: 'No insulation or backing layer. A straightforward steel door.', layers: [['steel', 'Steel front'], ['open', 'Open interior']],
  detailsHeading: 'Simple construction.', detailsCopy: 'This door combines 24-gauge steel with a two-coat prefinished surface.'},
 vinyl: {key: 'vinyl', code: 'comfort', slug: 'vinyl-back-insulated', label: 'Vinyl Back Insulated', short: 'Vinyl Back', gauge: '24-gauge steel', rating: 'R-6.85',
  heading: 'Insulation with a vinyl backing.', copy: 'Polystyrene insulation adds a thermal barrier behind the steel front, finished with a vinyl backing.', layers: [['steel', 'Steel front'], ['foam', 'Insulation'], ['vinyl', 'Vinyl back']],
  detailsHeading: 'Insulated comfort.', detailsCopy: 'This door combines 24-gauge exterior steel and vinyl-backed polystyrene insulation with a two-coat prefinished surface.'},
 steel: {key: 'steel', code: 'premium', slug: 'steel-back-insulated', label: 'Steel Back Insulated', short: 'Steel Back', gauge: '26-gauge steel', rating: 'R-10.25',
  heading: 'Insulation enclosed in steel.', copy: 'Polystyrene insulation sits between two steel skins. The steel interior covers and protects the insulation.', layers: [['steel', 'Steel front'], ['foam', 'Insulation'], ['steel', 'Steel back']],
  detailsHeading: 'Insulated comfort.', detailsCopy: 'This door combines 26-gauge exterior steel, polystyrene insulation, and an interior steel skin with a two-coat prefinished surface.'},
};
export const CONSTRUCTION_ORDER = ['non', 'vinyl', 'steel'];

// Window families follow the vendor window page (Short Panel, Long Panel, Long Panel Carriage); Door Pricing stores
// them as short / long / carriage. Window counts come from each style's brochure layout, by door width.
const SHORT_COUNT = {8: 4, 9: 4, 10: 5, 12: 6, 14: 7, 15: 7, 16: 8, 17: 8, 18: 8};
const CARRIAGE_COUNT = {8: 2, 9: 2, 10: 2, 12: 3, 14: 3, 15: 4, 16: 4, 17: 4, 18: 4};
const SHORT_GROOVED_COUNT = {8: 2, 9: 2, 10: 2, 12: 3, 14: 3, 15: 3, 16: 4, 17: 4, 18: 4};
const insert = (code, name) => ({code, name, label: '#' + code});
const TRADITIONAL_INSERTS = [insert('306', 'Sherwood'), insert('305', 'Williamsburg'), insert('591', 'Cascade'), insert('393', 'Cathedral'), insert('397', 'Stockton'), insert('597', 'Stockbridge'), insert('320', 'Waterton'), insert('897', 'Prairie')];
const CARRIAGE_INSERTS = [insert('287', 'Stockton Arch'), insert('388', 'Somerton'), insert('387', 'Stockton'), insert('588', 'Wyndbridge'), insert('587', 'Stockbridge'), insert('897', 'Prairie')];
const LONG_INSERTS = [insert('306', 'Sherwood'), insert('305', 'Williamsburg'), insert('591', 'Cascade'), insert('397', 'Stockton'), insert('597', 'Stockbridge'), insert('897', 'Prairie')];

export const STYLES = [
 {key: '10', slug: 'traditional-raised-panel', styleCode: 'traditional-raised', name: 'Traditional Raised Panel', windowFamily: 'short', windowCount: SHORT_COUNT, inserts: TRADITIONAL_INSERTS, quoteWindows: false,
  gallery: 'A familiar favorite with raised panels and a woodgrain texture.', headline: 'A classic look.', lead: 'Traditional raised panels with a rich woodgrain texture.', example: 'White with windows'},
 {key: '20', slug: 'short-recessed-panel', styleCode: 'short-recessed', name: 'Short Recessed Panel', windowFamily: 'carriage', windowCount: CARRIAGE_COUNT, inserts: CARRIAGE_INSERTS, quoteWindows: false,
  gallery: 'Crisp, compact recessed panels for a clean, balanced look.', headline: 'Clean lines.', lead: 'Short recessed panels and crisp details to complement your home.', example: 'White with windows'},
 {key: '30', slug: 'carriage-house-short-grooved', styleCode: 'carriage-short', name: 'Carriage House Short Grooved', windowFamily: 'carriage', windowCount: SHORT_GROOVED_COUNT, inserts: CARRIAGE_INSERTS, quoteWindows: false,
  gallery: 'Short grooved panels bring classic carriage house character.', headline: 'Classic character.', lead: 'Grooved panels and classic carriage house styling.', example: 'White with windows', exampleByBrochure: {'430': 'White with Stockbridge inserts'}},
 {key: '40', slug: 'carriage-house-long-grooved', styleCode: 'carriage-long', name: 'Carriage House Long Grooved', windowFamily: 'carriage', windowCount: CARRIAGE_COUNT, inserts: CARRIAGE_INSERTS, quoteWindows: false,
  gallery: 'Long grooved panels create a broad carriage house look.', headline: 'A welcoming entrance.', lead: 'Long grooved panels bring carriage house character to a wider, balanced design.', example: 'White with windows',
  hardwareNote: 'Decorative hardware shown is optional; availability and price to confirm.'},
 {key: '50', slug: 'flush-panel', styleCode: 'flush', name: 'Flush Panel', windowFamily: null, windowCount: null, inserts: [], quoteWindows: true,
  gallery: 'A smooth, understated panel design with a modern feel.', headline: 'Simply modern.', lead: 'A clean, flush surface for a simple, understated look.', example: 'White with windows'},
 {key: '60', slug: 'louvered-panel', styleCode: 'louvered', name: 'Louvered Panel', windowFamily: 'carriage', windowCount: CARRIAGE_COUNT, inserts: CARRIAGE_INSERTS, quoteWindows: false,
  gallery: 'Horizontal louvered detailing gives this style its distinctive texture.', headline: 'Texture with character.', lead: 'Horizontal louvered detailing adds texture and a distinctive finish.', example: 'White with no windows'},
 {key: '80', slug: 'long-recessed-panel', styleCode: 'long-recessed', name: 'Long Recessed Panel', windowFamily: 'carriage', windowCount: CARRIAGE_COUNT, inserts: CARRIAGE_INSERTS, quoteWindows: false,
  gallery: 'Wide recessed panels with simple lines and a spacious feel.', headline: 'Clean, confident lines.', lead: 'Long recessed panels create a broad, balanced look.', example: 'White with windows'},
 {key: '90', slug: 'raised-ranch-panel', styleCode: 'raised-ranch', name: 'Raised Ranch Panel', windowFamily: 'long', windowCount: CARRIAGE_COUNT, inserts: LONG_INSERTS, quoteWindows: false,
  gallery: 'Long raised panels put a wider spin on a traditional favorite.', headline: 'A wider classic.', lead: 'Long raised panels pair classic detail with a spacious, horizontal design.', example: 'White with windows'},
];

// Colors. `finish` is what Door Pricing prices: standard / wood. null = no vendor price (always Price to confirm).
// Oak: steel-back solid doors use the wood-finish base cost; Oak windows have no vendor rate (Price to confirm).
const color = (name, code, swatch, finish, note = null) => ({name, code, swatch, finish, note});
const BASE_COLORS = [color('White', 'white', '#f7f7f2', 'standard'), color('Almond', 'almond', '#e8ddc4', 'standard'), color('Desert Tan', 'desert-tan', '#c9b99c', 'standard'),
 color('Sandstone', 'sandstone', '#aa9b83', 'standard'), color('Brown', 'brown', '#614d40', 'standard'),
 color('Gray', 'gray', '#a0a4a4', null, 'Gray appears in the brochure but is not listed in the current vendor pricing. We’ll confirm availability and price during your visit.'),
 color('Charcoal', 'charcoal', '#454a4d', 'standard'), color('Black', 'black', '#222324', 'standard')];
const WALNUT = color('Walnut', 'walnut', '#6d2f20', 'wood');
const STEEL_WOODS = [color('Driftwood', 'driftwood', '#77766e', 'wood'), color('Oak', 'oak', '#b88c56', 'oak', 'Oak window pricing needs confirmation. We’ll verify the matching frame, glass, and final price during your visit.'),
 color('Light Cypress', 'light-cypress', '#bba481', null, 'Light Cypress appears in the brochure but is not listed in the current vendor pricing. We’ll confirm availability and price during your visit.')];
const WOODGRAIN_STYLES = ['20', '30', '40', '80'];

const PREFIX = {non: '4', vinyl: '4', steel: '36'};
const SUFFIX = {non: '0', vinyl: '1', steel: '0'};
/** All 24 doors, keyed by internal model number (e.g. "410", "441", "3640"). */
export const MODELS = Object.fromEntries(STYLES.flatMap(style => CONSTRUCTION_ORDER.map(key => {
 const digit = style.key[0];
 const model = PREFIX[key] + digit + SUFFIX[key];
 // Vinyl back doors share the paired non-insulated brochure and photo; steel back doors have their own.
 const brochure = key === 'steel' ? model : PREFIX.non + digit + '0';
 const colors = [...BASE_COLORS, ...(WOODGRAIN_STYLES.includes(style.key) ? [WALNUT] : []), ...(key === 'steel' && WOODGRAIN_STYLES.includes(style.key) ? STEEL_WOODS : [])];
 return [model, {model, styleKey: style.key, construction: key, brochure, image: `summary-door-${brochure}.png`, colors,
  inserts: style.inserts.map(i => ({...i, image: `${brochure}-insert-${i.code}.png`})),
  example: style.exampleByBrochure?.[brochure] || style.example}];
})));

export const styleFor = model => STYLES.find(s => s.key === MODELS[model]?.styleKey);
export const modelFor = (styleKey, constructionKey) => Object.values(MODELS).find(m => m.styleKey === styleKey && m.construction === constructionKey) || null;
export const modelBySlug = (styleSlug, constructionSlug) => {
 const style = STYLES.find(s => s.slug === styleSlug), construction = Object.values(CONSTRUCTIONS).find(c => c.slug === constructionSlug);
 return style && construction ? modelFor(style.key, construction.key) : null;
};
export const pathFor = model => { const m = MODELS[model]; return m ? `/shop/doors/${styleFor(model).slug}/${CONSTRUCTIONS[m.construction].slug}` : null; };

/** Validates one customer configuration against the catalog. Throws an Error with a safe message for anything that
 * is not offered. Size may be unknown or incomplete: only an explicit valid width AND height can ever be priced. */
export function normalizeDoorSelection(model, raw) {
 const m = MODELS[model];
 if (!m) throw new Error('Choose an available door.');
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Choose your door options.');
 const unknownSize = raw.unknownSize === true;
 const pick = (value, allowed) => value === null || value === undefined || value === '' ? null : allowed.includes(Number(value)) ? Number(value) : NaN;
 const width = unknownSize ? null : pick(raw.width, WIDTHS), height = unknownSize ? null : pick(raw.height, HEIGHTS);
 if (Number.isNaN(width) || Number.isNaN(height)) throw new Error('Choose an available door size, or choose “I’m not sure”.');
 const c = m.colors.find(x => x.name === raw.color || x.code === raw.color);
 if (!c) throw new Error('Choose an available color.');
 if (typeof raw.windows !== 'boolean') throw new Error('Choose windows or no windows.');
 const style = styleFor(model);
 let ins = null;
 if (raw.windows && !style.quoteWindows && raw.insert && raw.insert !== 'plain') {
  ins = m.inserts.find(i => i.code === raw.insert);
  if (!ins) throw new Error('Choose an available window insert.');
 }
 const sizeState = unknownSize ? 'unknown' : width && height ? 'selected' : width || height ? 'partial' : 'none';
 return {model, unknownSize, width, height, sizeState, color: c, windows: raw.windows, insert: ins, quoteWindows: raw.windows && style.quoteWindows};
}

export function sizeLabel(sel) {
 if (sel.sizeState === 'unknown') return 'Measurements needed';
 if (sel.sizeState === 'selected') return `${sel.width} × ${sel.height} ft`;
 if (sel.sizeState === 'partial') return sel.width ? `${sel.width} ft wide · Height needed` : `${sel.height} ft tall · Width needed`;
 return 'Size not selected';
}
export function windowsLabel(sel) {
 if (!sel.windows) return 'No windows';
 if (sel.quoteWindows) return 'Windows requested · Layout to confirm';
 return sel.insert ? `${sel.insert.name} ${sel.insert.label} inserts` : 'Plain windows · No insert';
}

/**
 * Vendor cost of one configuration, from a Door Pricing price book (the scheduler passes its saved config; this file
 * holds no costs). Returns {unitVendorCost, windowCount} or {unpriced: reason}. Never returns zero for an unknown cost.
 * Window rate: plain glass uses the PLAIN rate; any insert uses the WITH INSERTS rate (the complete unit rate).
 * Walnut/Driftwood carriage windows use the wood-finish window rate (window.woodCosts).
 */
export function doorVendorCost(priceBook, model, sel) {
 const m = MODELS[model], style = styleFor(model);
 if (!m || !style) return {unpriced: 'unknown-door'};
 if (sel.sizeState !== 'selected') return {unpriced: sel.sizeState === 'unknown' ? 'measure' : 'size-needed'};
 if (!sel.color.finish) return {unpriced: 'finish-not-priced'};
 if (sel.quoteWindows) return {unpriced: 'windows-quote'};
 const construction = CONSTRUCTIONS[m.construction].code;
 const baseFinish = sel.color.finish === 'oak' ? 'wood' : sel.color.finish;
 const group = sel.width >= 14 && sel.width <= 16 ? '14/15/16' : sel.width >= 17 ? '17/18' : String(sel.width);
 const row = (priceBook.priceRows || []).find(r => r.active && r.constructionCode === construction && r.finishTier === baseFinish && r.widthGroup === group && r.height === sel.height);
 if (!row || !Number.isFinite(row.vendorCost) || row.vendorCost <= 0) return {unpriced: 'base-not-priced'};
 let windowCost = 0, windowCount = 0;
 if (sel.windows) {
  if (sel.color.finish === 'oak') return {unpriced: 'oak-windows'};
  const option = (priceBook.windows || []).find(w => w.active !== false && w.code === (sel.insert ? 'decorative' : 'plain'));
  const table = sel.color.finish === 'wood' ? option?.woodCosts : option?.costs;
  const rate = table?.[construction]?.[style.windowFamily];
  windowCount = style.windowCount?.[sel.width] || 0;
  if (!Number.isFinite(rate) || rate <= 0 || !windowCount) return {unpriced: 'windows-not-priced'};
  windowCost = Math.round(rate * windowCount * 100) / 100;
 }
 return {unitVendorCost: Math.round((row.vendorCost + windowCost) * 100) / 100, windowCount};
}

export const UNPRICED_NOTES = {
 'measure': 'Price to confirm after we measure',
 'size-needed': 'Select a size for pricing',
 'finish-not-priced': 'This finish isn’t in the current vendor pricing. We’ll confirm availability and price at your visit.',
 'windows-quote': 'Window style, glass, layout, and price will be confirmed during your visit.',
 'oak-windows': 'Oak window pricing needs confirmation. We’ll verify the matching frame, glass, and final price during your visit.',
 'windows-not-priced': 'Window pricing for this combination needs confirmation at your visit.',
 'base-not-priced': 'This size isn’t priced online. We’ll confirm it at your visit.',
 'unknown-door': 'Price to confirm',
};
