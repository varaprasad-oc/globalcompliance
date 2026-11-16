const { sampleDeal } = require('./fixtures');
const C = () => global.__ctx;
const fresh = () => { const d = JSON.parse(JSON.stringify(sampleDeal)); d.docs = { PROPOSAL: true, ORDER_FORM: true, TOS: true, DPA: true }; d.narrative.notes = 'Franchisee for SKECHERS, ANTA, ECCO; 46 stores; wants one program.'; return d; };

test('AI prompt contains notes, selected modules and the no-prices rule', () => {
  const p = C().buildNarrativePrompt(global.M, fresh(), { tone: 'formal' });
  eq(p.includes('Franchisee for SKECHERS'), true);
  eq(p.includes('Affiliates/Referrals'), true, 'Advanced module listed');
  eq(p.includes('Do not mention any price'), true);
  eq(p.includes('MULTI-BRAND GROUP: yes'), true);
  eq(/USD|\d{2,},\d{3}/.test(p.split('MODULES')[0].replace(/STORES: \d+/, '')), false, 'no prices leak into the prompt');
});

test('Sanitizer parses JSON, strips money sentences, limits journeys', () => {
  const raw = '```json\n' + JSON.stringify({ executiveSummary: 'FRG runs 46 stores. It pays USD 70 per store.\n\nOne program for all brands.', journeys: ['A: x.', 'B: y.', 'C: z.', 'D: w.'], multiBrandIntro: 'Save 20% off today. Shared wallet.' }) + '\n```';
  const r = C().sanitizeNarrative(raw, global.M);
  eq(r.ok, true);
  eq(r.narrative.executiveSummary, 'FRG runs 46 stores.\n\nOne program for all brands.');
  eq(r.narrative.journeys.length, 3);
  eq(r.narrative.multiBrandIntro, 'Shared wallet.');
  eq(r.warnings.filter((w) => /money/.test(w)).length, 2);
});

test('Sanitizer rejects non-JSON or empty summaries', () => {
  eq(C().sanitizeNarrative('Sorry, I cannot help', global.M).ok, false);
  eq(C().sanitizeNarrative('{"executiveSummary":""}', global.M).ok, false);
});

test('Generation plan: DRAFT when approval needed, FINAL when approved or not needed', () => {
  const d = fresh();
  const ev = C().evaluateDeal(global.M, d);
  const p1 = C().planGeneration(d, ev, 'Required');
  eq([p1.ok, p1.mode, p1.status, p1.docTypes.length], [true, 'DRAFT', 'Pending approval', 2]);
  eq(C().planGeneration(d, ev, 'Approved').mode, 'FINAL');
  d.commercial.specialPrices = {};
  const ev2 = C().evaluateDeal(global.M, d);
  eq([C().planGeneration(d, ev2, 'Not required').mode, C().planGeneration(d, ev2, 'Not required').status], ['FINAL', 'Generated']);
});

test('Generation refuses with missing info, lists what is missing', () => {
  const d = fresh(); delete d.client.billingContact;
  const p = C().planGeneration(d, C().evaluateDeal(global.M, d), 'Required');
  eq(p.ok, false);
  eq(/ORDER_FORM \(Billing contact email\)/.test(p.reason), true);
});

test('Document numbers are reused across versions', () => {
  eq(C().docNumbersNeeded({ docNos: { PROPOSAL: 'OC-P-2026-0001' } }, ['PROPOSAL', 'DPA']), ['DPA']);
  eq(C().docNumbersNeeded({}, ['TOS']), ['TOS']);
});

test('Approval status survives a re-save only if the quote is unchanged', () => {
  const d = fresh(); d.dealId = 'D-1';
  const ev = C().evaluateDeal(global.M, d);
  const base = C().dealRecord(d, ev, 'r@optculture.com', 't1', null);
  eq(C().dealRecord(d, ev, 'r@optculture.com', 't2', Object.assign({}, base, { approval_status: 'Approved' })).approval_status, 'Approved');
  d.commercial.specialPrices = { Loyalty: 60 };
  const ev2 = C().evaluateDeal(global.M, d);
  eq(C().dealRecord(d, ev2, 'r@optculture.com', 't3', Object.assign({}, base, { approval_status: 'Approved' })).approval_status, 'Required', 'price changed → re-approval');
});

test('Rep gets ONE email with PDFs attached and no Google Doc links; drafts say do not send', () => {
  const deal = { dealId: 'D-202611-0001', version: 1, client: { legalName: 'FRG SAE', shortName: 'FRG' } };
  const res = [{ label: 'Quotation & Order Form', docNo: 'OC-Q-2026-0001', docUrl: 'https://docs.google.com/d1', pdfId: 'p1' },
    { label: 'Master Services Agreement', docNo: 'OC-MSA-2026-0001', docUrl: 'https://docs.google.com/d2', pdfId: 'p2' }, { label: 'X', docNo: 'X-1', error: 'boom' }];
  const m = C().generationEmails(deal, res, 'FINAL');
  eq([m.length, m[0].subject, m[0].pdfIds], [1, 'OptCulture documents – FRG', ['p1', 'p2']]);
  eq([/docs\.google\.com/.test(m[0].body), /FAILED: boom/.test(m[0].body), /open the deal in the app/.test(m[0].body)], [false, true, true]);
  const dr = C().generationEmails(deal, res, 'DRAFT');
  eq([dr.length, dr[0].subject.indexOf('[DRAFT') === 0, /do NOT send/.test(dr[0].body), dr[0].pdfIds], [1, true, true, ['p1', 'p2']]);
});

test('Approver email lists only what needs approval, item by item', () => {
  const { sampleDeal } = require('./fixtures');
  const d = JSON.parse(JSON.stringify(sampleDeal)); d.stage = 'CONTRACT'; d.commercial.msaRef = ''; d.msaExceptions = 'Clause 3: cure period 45 days.';
  const ev = C().evaluateDeal(global.M, d);
  const body = C().approvalEmailBody(d, ev, { name: 'Rep', email: 'r@optculture.com' }, 'https://salestools.optculturecx.com');
  eq(/NEEDS YOUR APPROVAL \(2\)/.test(body), true);
  eq(/Subscription – Loyalty plan – licence: USD 70 per site \/ month vs standard USD 75 \(-6\.7%\)/.test(body), true, body);
  eq(/MSA special terms:\n {4}"Clause 3: cure period 45 days\."/.test(body), true);
  eq(ev.approvalItems.map((x) => x.area), ['Subscription', 'MSA special terms']);
});
