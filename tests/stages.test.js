const { sampleDeal } = require('./fixtures');
const C = () => global.__ctx;
const base = () => { const d = JSON.parse(JSON.stringify(sampleDeal)); d.dealId = 'D-1'; return d; };

test('New deal starts in the PROPOSAL stage with only the proposal selected', () => {
  const d = C().protectDealFields({ client: { legalName: 'X' }, docs: { PROPOSAL: true, ORDER_FORM: true, DPA: true } }, null, null, {});
  eq([d.stage, d.docs], ['PROPOSAL', { PROPOSAL: true }]);
});

test('Proposal stage: only the proposal is generated; contract details are not required', () => {
  const d = base(); d.stage = 'PROPOSAL'; d.docs = { PROPOSAL: true, ORDER_FORM: true };
  delete d.client.address; delete d.client.billingContact; delete d.commercial.termMonths;
  const ev = C().evaluateDeal(global.M, d);
  eq(ev.missing, {}, 'no Order Form fields needed yet');
  d.commercial.specialPrices = {};
  const plan = C().planGeneration(d, C().evaluateDeal(global.M, d), 'Not required');
  eq([plan.docTypes, plan.status], [['PROPOSAL'], 'Proposal generated']);
});

test('Convert only after the proposal is generated or sent', () => {
  const d = base(); d.stage = 'PROPOSAL';
  eq([C().canConvertToContract(d, 'Draft'), C().canConvertToContract(d, 'Pending approval'), C().canConvertToContract(d, 'Proposal generated'), C().canConvertToContract(d, 'Sent')], [false, false, true, true]);
  eq(C().canConvertToContract(Object.assign(base(), { stage: 'CONTRACT' }), 'Sent'), false);
});

test('Converted deal generates Order Form + ToS + DPA, keeps numbers and version', () => {
  const d = base(); d.stage = 'PROPOSAL'; d.version = 1; d.docNos = { PROPOSAL: 'OC-P-2026-0001' }; d.status = 'Proposal generated';
  const c = C().convertToContract(d);
  eq([c.stage, c.status, c.docs, c.commercial.orderPackage, c.docNos.PROPOSAL, c.version], ['CONTRACT', 'Contract draft', { ORDER_FORM: true, TOS: true, DPA: true }, 'Loyalty', 'OC-P-2026-0001', 1]);
  c.commercial.specialPrices = {};
  const plan = C().planGeneration(c, C().evaluateDeal(global.M, c), 'Not required');
  eq([plan.docTypes, plan.status], [['TOS', 'ORDER_FORM', 'DPA'], 'Contract generated']);
});

test('Saving a contract draft keeps stage and version; Order Form cannot be unticked', () => {
  const stored = C().convertToContract(Object.assign(base(), { stage: 'PROPOSAL', version: 1 }));
  const incoming = JSON.parse(JSON.stringify(stored)); incoming.stage = 'PROPOSAL'; incoming.docs = { ORDER_FORM: false, TOS: true, DPA: false, PROPOSAL: true };
  const d = C().protectDealFields(incoming, stored, 'Contract draft', {});
  eq([d.stage, d.version, d.status, d.docs], ['CONTRACT', 1, 'Contract draft', { ORDER_FORM: true, TOS: true, DPA: false }]);
  const d2 = C().protectDealFields(incoming, stored, 'Contract generated', {});
  eq([d2.version, d2.status], [2, 'Contract draft'], 'editing after contract generation = new version');
});

test('Approved proposal pricing carries to the contract (final documents, no new approval)', () => {
  const d = base(); d.stage = 'CONTRACT'; d.docs = { ORDER_FORM: true, TOS: true, DPA: true };
  const ev = C().evaluateDeal(global.M, d);
  eq(ev.needsApproval, true);
  eq(C().planGeneration(d, ev, 'Approved').mode, 'FINAL');
});

test('Pipeline status allowed after proposal or contract generation', () => {
  eq([C().canSetStatus('Proposal generated', 'Sent'), C().canSetStatus('Contract generated', 'Won'), C().canSetStatus('Contract draft', 'Won')], [true, true, false]);
});

test('Changes since proposal are listed (stores, price, add-ons, services, messaging)', () => {
  const d = base(); d.stage = 'PROPOSAL'; d.docNos = { PROPOSAL: 'OC-P-2026-0001' };
  d.commercial.addOnsByPackage = { Loyalty: ['GIFT_CARDS'], Advanced: [] };
  const q1 = C().buildQuote(global.M, d.commercial);
  const c = C().convertToContract(d, q1);
  eq(C().changesSinceProposal(global.M, c.proposalBaseline, c, q1), [], 'no changes right after conversion');
  c.commercial.stores = 50;
  c.commercial.specialPrices = { Loyalty: 65 };
  c.commercial.addOnsByPackage = { Loyalty: ['EMPLOYEE_DISCOUNT'], Advanced: [] };
  c.commercial.oneTimeItems = [];
  c.commercial.specialComms = { COMMS_100K: 200 };
  const q2 = C().buildQuote(global.M, c.commercial);
  const ch = C().changesSinceProposal(global.M, c.proposalBaseline, c, q2);
  eq(ch.includes('Stores: 46 → 50'), true);
  eq(ch.includes('Loyalty price / site / month: USD 70 → USD 65'), true);
  eq(ch.includes('Employee Discount Program added to Loyalty') && ch.includes('Gift Cards removed from Loyalty'), true);
  eq(ch.some((x) => /^Optional service removed: Data migration/.test(x)), true);
  eq(ch.includes('Messaging up to 100,000 / month: USD 250 → USD 200'), true);
  eq(c.proposalBaseline.docNo, 'OC-P-2026-0001');
});

test('Proposal baseline is server-owned', () => {
  const stored = C().convertToContract(Object.assign(base(), { stage: 'PROPOSAL' }), C().buildQuote(global.M, base().commercial));
  const incoming = JSON.parse(JSON.stringify(stored)); incoming.proposalBaseline = { prices: {}, commercial: {} };
  eq(C().protectDealFields(incoming, stored, 'Contract draft', {}).proposalBaseline.prices.Loyalty, 70);
});

test('Hybrid: first contract = one Agreement (ToS + Order Form + DPA, all numbers reserved together)', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.specialPrices = {}; d.commercial.msaRef = '';
  eq(C().contractMode(d), 'AGREEMENT');
  const plan = C().planGeneration(d, C().evaluateDeal(global.M, d), 'Not required');
  eq([plan.docTypes, plan.combine], [['TOS', 'ORDER_FORM', 'DPA'], true]);
  eq(C().docNumbersNeeded(d, plan.docTypes), ['TOS', 'ORDER_FORM', 'DPA']);
  d.docNos = { TOS: 'OC-TOS-2026-0007', ORDER_FORM: 'OC-Q-2026-0009', DPA: 'OC-DPA-2026-0003' };
  const data = C().buildDocData('ORDER_FORM', global.M, d, C().evaluateDeal(global.M, d).quote, { docNo: d.docNos.ORDER_FORM, related: C().relatedNumbers(d) });
  eq([data.fields.MsaRef, data.flags.HasMsa, data.fields.TosNo], ['OC-TOS-2026-0007', true, 'OC-TOS-2026-0007'], 'Order Form cites the MSA number even if generated first');
});

test('Hybrid: client with a signed MSA from another deal = standalone Order Form citing it; override issues a new Agreement', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.specialPrices = {}; d.commercial.msaRef = '';
  d.msa = { no: 'OC-TOS-2026-0002', dpaNo: 'OC-DPA-2026-0002', dealId: 'D-OLD' };
  eq(C().contractMode(d), 'ORDER_ONLY');
  const plan = C().planGeneration(d, C().evaluateDeal(global.M, d), 'Not required');
  eq([plan.docTypes, plan.combine], [['ORDER_FORM'], false]);
  eq(C().relatedNumbers(d), { TOS: 'OC-TOS-2026-0002', DPA: 'OC-DPA-2026-0002' });
  d.newMsa = true; eq(C().contractMode(d), 'AGREEMENT');
  delete d.newMsa; d.msa.dealId = 'D-1'; eq(C().contractMode(d), 'AGREEMENT', 'the deal that created the MSA keeps producing the Agreement on revisions');
});

test('Hybrid: MSA typed in "MSA reference" (signed outside the app) = Order Form only', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.msaRef = 'MSA-LEGACY-1';
  eq([C().contractMode(d), C().relatedNumbers(d).TOS], ['ORDER_ONLY', 'MSA-LEGACY-1']);
});
