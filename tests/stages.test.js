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

test('Converted deal generates Order Form + MSA, keeps numbers and version', () => {
  const d = base(); d.stage = 'PROPOSAL'; d.version = 1; d.docNos = { PROPOSAL: 'OC-P-2026-0001' }; d.status = 'Proposal generated';
  const c = C().convertToContract(d);
  eq([c.stage, c.status, c.docs, c.commercial.orderPackage, c.docNos.PROPOSAL, c.version], ['CONTRACT', 'Contract draft', { ORDER_FORM: true, MSA: true }, 'Loyalty', 'OC-P-2026-0001', 1]);
  c.commercial.specialPrices = {};
  const plan = C().planGeneration(c, C().evaluateDeal(global.M, c), 'Not required');
  eq([plan.docTypes, plan.status], [['ORDER_FORM', 'MSA'], 'Contract generated']);
});

test('Saving a contract draft keeps stage and version; Order Form cannot be unticked', () => {
  const stored = C().convertToContract(Object.assign(base(), { stage: 'PROPOSAL', version: 1 }));
  const incoming = JSON.parse(JSON.stringify(stored)); incoming.stage = 'PROPOSAL'; incoming.docs = { ORDER_FORM: false, MSA: false, PROPOSAL: true };
  const d = C().protectDealFields(incoming, stored, 'Contract draft', {});
  eq([d.stage, d.version, d.status, d.docs], ['CONTRACT', 1, 'Contract draft', { ORDER_FORM: true, MSA: false }]);
  const d2 = C().protectDealFields(incoming, stored, 'Contract generated', {});
  eq([d2.version, d2.status], [2, 'Contract draft'], 'editing after contract generation = new version');
});

test('Approved proposal pricing carries to the contract (final documents, no new approval)', () => {
  const d = base(); d.stage = 'CONTRACT'; d.docs = { ORDER_FORM: true, MSA: true };
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

test('First contract = Order Form + MSA; numbers reserved together; Order Form cites the MSA, MSA cites the Order Form', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.specialPrices = {}; d.commercial.msaRef = '';
  eq(C().contractMode(d), 'NEW_MSA');
  const plan = C().planGeneration(d, C().evaluateDeal(global.M, d), 'Not required');
  eq([plan.ok, plan.docTypes], [true, ['ORDER_FORM', 'MSA']]);
  eq(C().docNumbersNeeded(d, plan.docTypes), ['ORDER_FORM', 'MSA']);
  d.docNos = { PROPOSAL: 'OC-P-2026-0001', ORDER_FORM: 'OC-Q-2026-0009', MSA: 'OC-MSA-2026-0003' };
  const rel = C().relatedNumbers(d), q = C().evaluateDeal(global.M, d).quote;
  const of = C().buildDocData('ORDER_FORM', global.M, d, q, { docNo: d.docNos.ORDER_FORM, related: rel });
  const msa = C().buildDocData('MSA', global.M, d, q, { docNo: d.docNos.MSA, related: rel });
  eq([of.fields.ProposalNo, of.fields.MsaRef, msa.fields.InitialOrderFormNo], ['OC-P-2026-0001', 'OC-MSA-2026-0003', 'OC-Q-2026-0009']);
});

test('Client with a signed MSA from another deal = Order Form only citing it; "new MSA anyway" adds the MSA again', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.specialPrices = {}; d.commercial.msaRef = '';
  d.msa = { no: 'OC-MSA-2026-0002', dealId: 'D-OLD' };
  eq(C().contractMode(d), 'ORDER_ONLY');
  eq(C().planGeneration(d, C().evaluateDeal(global.M, d), 'Not required').docTypes, ['ORDER_FORM']);
  eq(C().relatedNumbers(d).MSA, 'OC-MSA-2026-0002');
  d.newMsa = true; eq(C().contractMode(d), 'NEW_MSA');
  delete d.newMsa; d.msa.dealId = 'D-1'; eq(C().contractMode(d), 'NEW_MSA', 'the deal that created the MSA keeps producing it on revisions');
});

test('MSA typed in "Existing MSA reference" (signed outside the app) = Order Form only', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.msaRef = 'MSA-LEGACY-1';
  eq([C().contractMode(d), C().relatedNumbers(d).MSA], ['ORDER_ONLY', 'MSA-LEGACY-1']);
});

test('MSA exceptions need Superadmin approval; approval is lost when the text changes; ignored when no MSA is generated', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.specialPrices = {}; d.commercial.msaRef = '';
  eq(C().evaluateDeal(global.M, d).needsApproval, false);
  d.msaExceptions = 'None';
  eq(C().evaluateDeal(global.M, d).needsApproval, false, '"None" is not an exception');
  d.msaExceptions = 'Cure period 60 days';
  const ev = C().evaluateDeal(global.M, d);
  eq([ev.needsApproval, ev.approvalReasons], [true, ['MSA special terms / exceptions: Cure period 60 days']]);
  eq(C().planGeneration(d, ev, 'Required').mode, 'DRAFT');
  const rec = C().dealRecord(d, ev, 'r@optculture.com', '2026-11-15', null); rec.approval_status = 'Approved';
  eq(C().dealRecord(d, ev, 'r@optculture.com', '2026-11-15', rec).approval_status, 'Approved', 'same text keeps approval');
  const d2 = JSON.parse(JSON.stringify(d)); d2.msaExceptions = 'Cure period 90 days';
  eq(C().dealRecord(d2, C().evaluateDeal(global.M, d2), 'r@optculture.com', '2026-11-15', rec).approval_status, 'Required', 'changed text needs approval again');
  d.msa = { no: 'OC-MSA-2026-0001', dealId: 'D-OLD' };
  eq(C().evaluateDeal(global.M, d).needsApproval, false, 'Order Form only: no MSA, exceptions not printed');
});
