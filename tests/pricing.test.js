/* Pricing engine tests — expected values taken from "Pricing MasterSheet 2026 / Pricing v2". */
const C = () => global.__ctx;
test('setup', (ctx) => { global.__ctx = ctx; global.M = ctx.masterFromSeed(ctx.SEED); });

const q = (input) => C().buildQuote(M, Object.assign({ market: 'Developed', currency: 'USD', stores: 5, ecomSites: 0, packages: ['Engagement', 'Loyalty', 'Advanced'] }, input));
const pkg = (quote, name) => quote.packages.find((p) => p.package === name);
const line = (lines, id) => lines.find((l) => l.id === id);

test('Developed / USD / <10 sites matches rate card exactly', () => {
  const r = q({ ecomSites: 1 });
  eq(r.ok, true);
  eq(r.packages.map((p) => p.standardPricePerSite), [90, 125, 175], 'per site/month');
  eq(r.packages.map((p) => line(p.oneTime, 'SETUP').unitPrice), [1200, 1800, 3500], 'set-up');
  eq(r.packages.map((p) => line(p.oneTime, 'STORE_INSTALL').unitPrice), [150, 150, 150], 'store install');
  eq(r.packages.map((p) => line(p.oneTime, 'ECOM_INSTALL').unitPrice), [500, 1000, 1000], 'ecom install');
  eq(r.packages.map((p) => p.overagePer1000), [30, 45, 60], 'overage');
  eq(line(r.usage, 'STORAGE_10GB').unitPrice, 10);
  eq(line(r.usage, 'PLATFORM_COMMS').unitPrice, 250);
  eq(r.rateCardOneTime.map((l) => l.unitPrice), [150, 125, 1000, 4000, null, 10000, 20000]);
  eq(r.rateCardAddOns.map((l) => l.unitPrice), [50, 50, 5000, 2500, 10000, 500]);
  eq(r.needsApproval, false);
});

test('Totals: Loyalty, 5 stores + 1 e-com, Developed USD', () => {
  const p = pkg(q({ ecomSites: 1 }), 'Loyalty');
  eq(p.sites, 6);
  eq(p.licenceMonthly, 750);
  eq(p.licenceAnnual, 9000);
  eq(p.oneTimeTotal, 1800 + 150 * 5 + 1000);
  eq(p.firstYearTotal, 3550 + 9000);
});

test('Slab is auto-calculated from sites (stores + e-com)', () => {
  const slab = (s, e) => q({ stores: s, ecomSites: e }).discounts.slabPct;
  eq([slab(9, 0), slab(9, 1), slab(49, 0), slab(49, 1), slab(99, 0), slab(99, 1)], [0, 0.1, 0.1, 0.15, 0.15, 0.2]);
});

test('Emerging / EGP / 46 stores + 1 e-com (FRG-like)', () => {
  const r = q({ market: 'Emerging', currency: 'EGP', stores: 46, ecomSites: 1 });
  eq(r.discounts.combinedPct, 0.415, 'combined discount in USD terms');
  const p = pkg(r, 'Loyalty');
  eq(p.standardPricePerSite, 4020, '125 x 0.65 x 0.9 x 55 = 4021.875 -> 4020');
  eq(line(p.oneTime, 'SETUP').unitPrice, 57915);
  eq(p.overagePer1000, 1450);
  eq(line(r.usage, 'STORAGE_10GB').unitPrice, 320);
  eq(line(r.usage, 'PLATFORM_COMMS').unitPrice, 13750, 'FX only, no discount');
});

test('High Income / AED rounding: nearest 5, small values to whole number', () => {
  const r = q({ market: 'High Income', currency: 'AED' });
  eq(pkg(r, 'Loyalty').standardPricePerSite, 345, '344.06 -> 345');
  eq(pkg(r, 'Engagement').overagePer1000, 85, '82.58 -> 85');
  eq(line(r.usage, 'STORAGE_10GB').unitPrice, 28, '27.53 -> 28 (below 50)');
});

test('WhatsApp text uses the 17.5% markup', () => {
  eq(line(q({}).usage, 'WHATSAPP').text, 'Actuals as per Meta price list + 17.5%');
});

test('Special price below standard needs approval; above does not', () => {
  const r = q({ market: 'Emerging', stores: 46, ecomSites: 1, packages: ['Loyalty', 'Advanced'], specialPrices: { Loyalty: 60, Advanced: 150 } });
  const l = pkg(r, 'Loyalty'), a = pkg(r, 'Advanced');
  eq(l.standardPricePerSite, 75);
  eq(l.finalPricePerSite, 60);
  eq(l.specialDiscountPct, 0.2);
  eq(a.finalPricePerSite, 150);
  eq(r.needsApproval, true);
  eq(r.approvalReasons.length, 1);
});

test('Special discount increases the discount (sheet bug fixed)', () => {
  const p = pkg(q({ packages: ['Loyalty'], specialPrices: { Loyalty: 100 } }), 'Loyalty');
  eq(p.effectiveDiscountPct, 0.2);
});

test('Add-ons only apply to allowed packages', () => {
  const r = q({ addOns: ['GIFT_CARDS', 'MANAGED_SERVICES'] });
  eq(pkg(r, 'Engagement').addOns.map((a) => a.id), ['MANAGED_SERVICES']);
  eq(pkg(r, 'Loyalty').addOns.map((a) => a.id), ['GIFT_CARDS', 'MANAGED_SERVICES']);
  eq(pkg(r, 'Loyalty').addOnsMonthly, 5050);
});

test('Optional one-time items', () => {
  const r = q({ oneTimeItems: [{ id: 'MIGRATION_100K', qty: 1 }, { id: 'CUSTOM_INT_HOUR', qty: 10 }, { id: 'MIGRATION_GT1M' }] });
  eq(r.optionalOneTime.map((l) => l.total), [1000, 1250, null]);
  eq(r.optionalOneTimeTotal, 2250);
});

test('Validation errors', () => {
  const r = C().buildQuote(M, { market: 'Mars', currency: 'XXX', stores: 0, ecomSites: 0, packages: [], specialPrices: { Loyalty: -5 } });
  eq(r.ok, false);
  eq(r.errors.length, 5);
});

test('Feature matrix', () => {
  const fm = C().featureMatrix(M, ['Loyalty', 'Advanced']);
  const ref = fm.find((f) => f.feature === 'Affiliates/Referrals');
  eq(ref.values, { Loyalty: 'Not included', Advanced: 'Included' });
});

test('Formatting helpers', () => {
  eq(C().formatMoney('USD', 1800), 'USD 1,800');
  eq(C().formatPct(0.175), '17.5%');
  eq(C().formatLongDate('2026-11-01T00:00:00'), '1st November 2026');
});
