const { sampleDeal, ctx } = require('./fixtures');
const C = () => global.__ctx;
const build = (type, deal) => {
  const M = global.M; const d = deal || sampleDeal;
  const q = C().buildQuote(M, d.commercial);
  return C().buildDocData(type, M, d, q, ctx);
};

test('Proposal: core fields, flags, modules, tables', () => {
  const d = build('PROPOSAL');
  eq(d.fields.ClientShortName, 'FRG');
  eq(d.fields.DocDate, '1st November 2026');
  eq(d.fields.ValidUntil, '1st December 2026', '30-day offer validity');
  eq(d.fields.WhatsAppMarkup, '17.5%');
  eq(d.flags.IsPartner, true);
  eq(d.flags.HasSpecialPrice, true);
  eq(d.tables.PlanMatrix.headers, ['Capability', 'Loyalty', 'Advanced']);
  eq(d.tables.PriceSummary.rows[1][0], 'Licence fee / site / month (special price)');
  eq(d.tables.PriceSummary.rows[1][1], 'USD 70');
  eq(d.lists.Journeys[0].title, 'Cross-channel activation');
  eq(d.lists.Modules.some((x) => x.title === 'Affiliates/Referrals'), true, 'Advanced-only module included when Advanced selected');
  eq(d.tables.OneTimeFees.rows[d.tables.OneTimeFees.rows.length - 1][0], 'Total one-time fees');
});

test('Proposal without special price omits the special-price row', () => {
  const deal = JSON.parse(JSON.stringify(sampleDeal)); deal.commercial.specialPrices = {};
  const d = build('PROPOSAL', deal);
  eq(d.flags.HasSpecialPrice, false);
  eq(d.tables.PriceSummary.rows.some((r) => /special/.test(r[0])), false);
});

test('Order Form: chosen package, lines, totals, dates', () => {
  const d = build('ORDER_FORM');
  eq(d.fields.OrderPackage, 'Loyalty');
  eq(d.fields.SubscriptionStartDate, '1st December 2026');
  eq(d.fields.SubscriptionEndDate, '30th November 2027');
  eq(d.fields.FinalPricePerSite, 'USD 70');
  eq(d.lists.SubscriptionLines.length, 2, 'licence + gift cards add-on');
  eq(d.lists.SubscriptionLines[0].amount, 'USD 39,480 / year', '70 x 47 x 12');
  eq(d.lists.UsageLines[0].metric, 'Receipts');
  eq(d.lists.OneTimeLines.some((l) => /migration/i.test(l.description)), true);
  eq(d.fields.EntityName, 'Congineer Business Solutions');
});

test('ToS lists only OptCulture entities', () => {
  const d = build('TOS');
  eq(d.lists.OptCultureEntities.map((e) => e.name), ['Retail Information Systems, Inc., doing business as OptCulture', 'RIS Services DMCC', 'OptCulture Private Limited']);
  eq(d.fields.NonSolicitMonths, '24');
  eq(d.fields.LiabilityCapMonths, '12');
});

test('DPA: addendum by country, partner adds platform sub-processor', () => {
  const d = build('DPA');
  eq(d.flags.Addendum4D, true);
  eq(d.flags.Addendum4A, false);
  eq(d.fields.HostingRegion, 'EU (Frankfurt)');
  eq(d.lists.SubProcessors[0].service, 'Operation of the OptCulture platform');
  const ksa = JSON.parse(JSON.stringify(sampleDeal)); ksa.client.country = 'Saudi Arabia';
  eq(build('DPA', ksa).flags.Addendum4A, true);
});

test('Missing-field check per document', () => {
  const deal = JSON.parse(JSON.stringify(sampleDeal)); delete deal.client.billingContact; delete deal.entityId;
  eq(C().missingForDoc('ORDER_FORM', deal), ['Billing contact email', 'Contracting entity / partner']);
  eq(C().missingForDoc('PROPOSAL', deal), []);
});

test('Template token checker flags unknown placeholders', () => {
  const d = build('PROPOSAL');
  const text = '{{ClientShortName}} {{#IF MultiBrand}}x{{/IF MultiBrand}} {{TABLE:PlanMatrix}} {{EACH:Usage}}{{label}} {{Typo}} {{#IF Nope}}';
  eq(C().checkTemplateTokens(text, d), ['Typo', '#IF Nope']);
});

test('ToS and SLA drafts use only known placeholders', () => {
  const fs = require('fs'), path = require('path');
  const d = build('TOS');
  const strip = (t) => t.replace(/`[^`]*`/g, '');
  const tos = strip(fs.readFileSync(path.join(__dirname, '..', 'docs', 'templates', 'TOS.md'), 'utf8'));
  const sla = strip(fs.readFileSync(path.join(__dirname, '..', 'docs', 'templates', 'SLA.md'), 'utf8'));
  eq(C().checkTemplateTokens(tos, d), []);
  eq(C().checkTemplateTokens(sla, d), []);
});

test('All 4 Google Doc templates use only known placeholders and balanced IF blocks', () => {
  const fs = require('fs'), path = require('path');
  const map = { PROPOSAL: 'proposal.html', ORDER_FORM: 'order_form.html', TOS: 'tos.html', DPA: 'dpa.html' };
  Object.keys(map).forEach((type) => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'templates', map[type]), 'utf8');
    const deal = JSON.parse(JSON.stringify(sampleDeal));
    const d = C().buildDocData(type, global.M, deal, C().buildQuote(global.M, deal.commercial), Object.assign({}, ctx, { related: { TOS: 'x', DPA: 'x', PROPOSAL: 'x' } }));
    eq(C().checkTemplateTokens(html, d), [], type + ' unknown tokens:');
    const opens = (html.match(/\{\{#IF !?(\w+)\}\}/g) || []).map((t) => t.replace(/\{\{#IF !?|\}\}/g, ''));
    const closes = (html.match(/\{\{\/IF (\w+)\}\}/g) || []).map((t) => t.replace(/\{\{\/IF |\}\}/g, ''));
    eq(opens.length, closes.length, type + ' IF open/close count');
  });
});
