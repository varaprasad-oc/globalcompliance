const { sampleDeal, ctx } = require('./fixtures');
const C = () => global.__ctx;

test('Admin row validation: users, discounts, fx, tiers, features, templates', () => {
  const H = (t) => C().SEED[t].headers;
  let r = C().coerceAdminRow('Users', H('Users'), { email: 'New.Rep@OptCulture.com', name: 'New Rep', role: 'Rep', manager_email: 'varaprasad@optculture.com', active: 'TRUE' });
  eq([r.ok, r.row.email, r.row.active], [true, 'new.rep@optculture.com', true]);
  eq(C().coerceAdminRow('Users', H('Users'), { email: 'x@gmail.com', role: 'Boss' }).errors.length, 2);
  eq(C().coerceAdminRow('Markets', H('Markets'), { market: 'X', discount: 25 }).errors, ['discount must be between 0 and 0.99 (e.g. 0.25 for 25%)']);
  eq(C().coerceAdminRow('Packages', H('Packages'), { package: 'Loyalty', price_per_site_month: 'abc' }).errors, ['price_per_site_month must be a number']);
  eq(C().coerceAdminRow('Currencies', H('Currencies'), { code: 'QAR', fx_rate: 0 }).ok, false);
  eq(C().coerceAdminRow('CommsTiers', H('CommsTiers'), { tier_id: 'T', list_usd: 100, floor_usd: 200 }).errors, ['floor_usd cannot be above list_usd']);
  eq(C().coerceAdminRow('Features', H('Features'), { feature: 'F', Engagement: 'Yes', Loyalty: 'Included', Advanced: 'Add-on' }).ok, false);
  eq(C().coerceAdminRow('Templates', H('Templates'), { doc_type: 'MSA', language: 'AR', file_id: 'abc', active: true }).ok, true);
  eq(C().coerceAdminRow('Deals', ['deal_id'], { deal_id: 'x' }).ok, false, 'records tabs are not editable');
});

test('Price snapshot keeps old prices after a price-list change', () => {
  const M = JSON.parse(JSON.stringify(global.M));
  const snap = C().pricingSnapshot(M);
  M.Packages.find((p) => p.package === 'Loyalty').price_per_site_month = 200;  // later price rise
  const deal = { market: 'Developed', currency: 'USD', stores: 5, ecomSites: 0, packages: ['Loyalty'] };
  eq(C().buildQuote(M, deal).packages[0].standardPricePerSite, 200, 'new deals use the new price');
  eq(C().buildQuote(C().withSnapshot(M, snap), deal).packages[0].standardPricePerSite, 125, 'old deal keeps 125');
  eq(C().withSnapshot(M, snap).Users === M.Users, true, 'non-pricing tabs stay current');
});

test('Clone drops document numbers and the price snapshot', () => {
  const d = JSON.parse(JSON.stringify(sampleDeal)); d.docNos = { PROPOSAL: 'OC-P-2026-0001' }; d.pricingSnapshot = { takenAt: 'x' }; d.approvalNote = 'n';
  const c = C().cloneDeal(d, 'D-9');
  eq([c.docNos, c.pricingSnapshot, c.approvalNote], [undefined, undefined, undefined]);
});

test('Available languages come from active templates', () => {
  const M = JSON.parse(JSON.stringify(global.M));
  M.Templates = [{ doc_type: 'MSA', language: 'EN', file_id: 'a', active: true }, { doc_type: 'MSA', language: 'AR', file_id: 'b', active: true },
    { doc_type: 'ORDER_FORM', language: 'AR', file_id: 'c', active: false }];
  eq(C().availableLanguages(M), { PROPOSAL: [], ORDER_FORM: [], MSA: ['EN', 'AR'] });
});

test('Arabic documents: Arabic dates and Arabic module text with English fallback', () => {
  const M = JSON.parse(JSON.stringify(global.M));
  M.Features.find((f) => f.feature === 'E-receipts').description_ar = 'إيصالات رقمية تفاعلية';
  const deal = JSON.parse(JSON.stringify(sampleDeal));
  const d = C().buildDocData('PROPOSAL', M, deal, C().buildQuote(M, deal.commercial), Object.assign({}, ctx, { language: 'AR' }));
  eq(d.fields.DocDate, '1 نوفمبر 2026');
  eq(d.lists.Modules.find((x) => x.title === 'E-receipts').text, 'إيصالات رقمية تفاعلية');
  eq(/^A flexible loyalty/.test(d.lists.Modules.find((x) => x.title === 'Loyalty').text), true, 'falls back to English when no Arabic text');
  eq(d.language, 'AR');
});
