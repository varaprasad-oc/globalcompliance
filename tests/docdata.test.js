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
  eq(d.tables.OneTimeFees.rows.some((r) => /Total/.test(r[0])), false, 'proposal shows no totals');
  eq(d.tables.OneTimeFees.rows.find((r) => r[0] === 'Installation per store')[1], 'USD 90 / store', 'unit price, not qty x price');
  eq([d.tables.OneTimeFees.headers[0], d.tables.OneTimeFees.headers.slice(-1)[0], d.tables.OneTimeFees.rows[0].slice(-1)[0], d.tables.OneTimeFees.boldValues], ['Scope of Work', 'Payment Terms', 'Advance', true], 'proposal fee table layout');
  eq(d.tables.PriceSummary.rows.some((r) => /Total licence/.test(r[0])), false);
  eq(d.lists.OptionalOneTime[0].amount, 'USD 585', 'rate-card price only');
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

test('MSA: parties, online ToS/DPA/SLA links, initial Order Form, exceptions or "None."', () => {
  const deal = JSON.parse(JSON.stringify(sampleDeal)); deal.stage = 'CONTRACT';
  let d = C().buildDocData('MSA', global.M, deal, C().buildQuote(global.M, deal.commercial), Object.assign({}, ctx, { docNo: 'OC-MSA-2026-0001', related: { ORDER_FORM: 'OC-Q-2026-0004', MSA: 'OC-MSA-2026-0001' } }));
  eq([d.fields.EntityName, d.fields.ClientLegalName, d.fields.InitialOrderFormNo, d.flags.HasInitialOrderForm], ['Congineer Business Solutions', 'Fashion Retail Group S.A.E.', 'OC-Q-2026-0004', true]);
  eq([d.fields.TosUrl, d.fields.DpaUrl, d.fields.SlaUrl], ['https://optculture.com/terms-of-service/', 'https://optculture.com/DPA/', 'https://optculture.com/SLA/']);
  eq([d.texts.MsaExceptions, d.flags.HasExceptions, d.fields.ClientNoticeEmail, d.fields.OptCultureNoticeEmail], ['None.', false, 'a@frg.example', 'legal@optculture.com']);
  deal.msaExceptions = 'Clause 3: 60 days cure period.\nClause 5: courts of Cairo.';
  d = C().buildDocData('MSA', global.M, deal, C().buildQuote(global.M, deal.commercial), ctx);
  eq([d.texts.MsaExceptions, d.flags.HasExceptions], ['Clause 3: 60 days cure period.\n\nClause 5: courts of Cairo.', true]);
});

test('Order Form cites the Proposal and the MSA, plus the online documents', () => {
  const deal = JSON.parse(JSON.stringify(sampleDeal)); deal.stage = 'CONTRACT';
  const d = C().buildDocData('ORDER_FORM', global.M, deal, C().buildQuote(global.M, deal.commercial), Object.assign({}, ctx, { related: { PROPOSAL: 'OC-P-2026-0002', MSA: 'OC-MSA-2026-0001' } }));
  eq([d.fields.ProposalNo, d.flags.HasProposalNo, d.fields.MsaRef, d.flags.HasMsa, d.fields.MsaNo], ['OC-P-2026-0002', true, 'OC-MSA-2026-0001', true, 'OC-MSA-2026-0001']);
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

test('All 3 Google Doc templates (Proposal, Order Form, MSA) use only known placeholders and balanced IF blocks', () => {
  const fs = require('fs'), path = require('path');
  const map = { PROPOSAL: 'proposal.html', ORDER_FORM: 'order_form.html', MSA: 'msa.html' };
  Object.keys(map).forEach((type) => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'templates', map[type]), 'utf8');
    const deal = JSON.parse(JSON.stringify(sampleDeal));
    const d = C().buildDocData(type, global.M, deal, C().buildQuote(global.M, deal.commercial), Object.assign({}, ctx, { related: { MSA: 'x', ORDER_FORM: 'x', PROPOSAL: 'x' } }));
    eq(C().checkTemplateTokens(html, d), [], type + ' unknown tokens:');
    const opens = (html.match(/\{\{#IF !?(\w+)\}\}/g) || []).map((t) => t.replace(/\{\{#IF !?|\}\}/g, ''));
    const closes = (html.match(/\{\{\/IF (\w+)\}\}/g) || []).map((t) => t.replace(/\{\{\/IF |\}\}/g, ''));
    eq(opens.length, closes.length, type + ' IF open/close count');
  });
});

test('Proposal shows selected add-ons table and brand style', () => {
  const d = build('PROPOSAL');
  eq(d.flags.HasAddOns, true);
  eq(d.tables.AddOns.rows, [['Gift Cards', 'USD 29', 'USD 29']]);
  eq(d.style.tableHeaderBg, '#7B3FE4');
  eq(d.images.OptCultureLogo, '1dURALQP4yA58Fp5eSZY509NrB3gqagb9');
});

test('Party lines drop blank registration/address cleanly', () => {
  const d = build('MSA');
  eq(d.fields.EntityPartyDetails, '', 'Congineer has no reg/address in seed');
  eq(d.fields.ClientPartyDetails, ', Commercial Registration No. 123456, Cairo, Egypt');
  eq([d.fields.EntityRegistration, d.fields.EntityAddressOrTbc], ['To be provided', 'To be provided']);
});

test('Journeys without a "Title:" get a numbered title (no stray colon)', () => {
  const deal = JSON.parse(JSON.stringify(sampleDeal)); deal.narrative.journeys = ['test', 'Win-back: lapsed shoppers'];
  const d = C().buildDocData('PROPOSAL', global.M, deal, C().buildQuote(global.M, deal.commercial), ctx);
  eq(d.lists.Journeys, [{ title: 'Journey 1', text: 'test' }, { title: 'Win-back', text: 'lapsed shoppers' }]);
});
