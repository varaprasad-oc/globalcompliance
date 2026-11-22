const { sampleDeal } = require('./fixtures');
const C = () => global.__ctx;
const base = () => { const d = JSON.parse(JSON.stringify(sampleDeal)); d.dealId = 'D-1'; return d; };

test('Single stage: a new deal is an Order Form deal from the start', () => {
  const d = C().protectDealFields({ client: { legalName: 'X' }, docs: { PROPOSAL: true, ORDER_FORM: true, DPA: true } }, null, null, {});
  eq([d.stage, d.docs, d.status], ['CONTRACT', { ORDER_FORM: true }, 'Draft']);
});

test('Compare several packages, only the Order Form package can need approval', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.packages = ['Loyalty', 'Advanced']; d.commercial.specialPrices = { Advanced: 80 }; d.commercial.orderPackage = 'Loyalty';
  eq(C().evaluateDeal(global.M, d).needsApproval, false, 'special price on a compared (not chosen) package');
  d.commercial.orderPackage = 'Advanced';
  eq(C().evaluateDeal(global.M, d).approvalItems.map((x) => x.item), ['Advanced plan – licence']);
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

test('Converted deal generates the Order Form only (MSA comes after acceptance), keeps numbers and version', () => {
  const d = base(); d.stage = 'PROPOSAL'; d.version = 1; d.docNos = { PROPOSAL: 'OC-P-2026-0001' }; d.status = 'Proposal generated';
  const c = C().convertToContract(d);
  eq([c.stage, c.status, c.docs, c.commercial.orderPackage, c.docNos.PROPOSAL, c.version], ['CONTRACT', 'Contract draft', { ORDER_FORM: true }, 'Loyalty', 'OC-P-2026-0001', 1]);
  c.commercial.specialPrices = {};
  const plan = C().planGeneration(c, C().evaluateDeal(global.M, c), 'Not required');
  eq([plan.docTypes, plan.status], [['ORDER_FORM'], 'Order Form generated']);
});

test('Saving a contract draft keeps stage and version; Order Form cannot be unticked', () => {
  const stored = C().convertToContract(Object.assign(base(), { stage: 'PROPOSAL', version: 1 }));
  const incoming = JSON.parse(JSON.stringify(stored)); incoming.stage = 'PROPOSAL'; incoming.docs = { ORDER_FORM: false, MSA: false, PROPOSAL: true };
  const d = C().protectDealFields(incoming, stored, 'Contract draft', {});
  eq([d.stage, d.version, d.status, d.docs], ['CONTRACT', 1, 'Contract draft', { ORDER_FORM: true }]);
  const d2 = C().protectDealFields(incoming, stored, 'Contract generated', {});
  eq([d2.version, d2.status], [2, 'Draft'], 'editing after Order Form generation = new version');
});

test('Approved proposal pricing carries to the contract (final documents, no new approval)', () => {
  const d = base(); d.stage = 'CONTRACT'; d.docs = { ORDER_FORM: true, MSA: true };
  const ev = C().evaluateDeal(global.M, d);
  eq(ev.needsApproval, true);
  eq(C().planGeneration(d, ev, 'Approved').mode, 'FINAL');
});

test('Pipeline status allowed after proposal or contract generation', () => {
  eq([C().canSetStatus('Proposal generated', 'Sent'), C().canSetStatus('Order Form sent', 'Lost'), C().canSetStatus('Order Form accepted', 'Lost'), C().canSetStatus('Contract draft', 'Lost')], [true, true, true, false]);
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

test('New client: Order Form first; acceptance moves the deal to the MSA stage; MSA cites the Order Form; MSA acceptance = Won', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.specialPrices = {}; d.commercial.msaRef = '';
  eq(C().contractMode(d), 'NEW_MSA');
  const plan = C().planGeneration(d, C().evaluateDeal(global.M, d), 'Not required');
  eq([plan.ok, plan.docTypes, plan.status], [true, ['ORDER_FORM'], 'Order Form generated']);
  d.docNos = { PROPOSAL: 'OC-P-2026-0001', ORDER_FORM: 'OC-Q-2026-0009' };
  const of = C().buildDocData('ORDER_FORM', global.M, d, C().evaluateDeal(global.M, d).quote, { docNo: d.docNos.ORDER_FORM, related: C().relatedNumbers(d) });
  eq([of.fields.ProposalNo, of.flags.HasMsa], ['OC-P-2026-0001', false], 'no MSA yet: interim online ToS line');
  eq([C().canSendForAcceptance(d, 'Order Form generated', 'ORDER_FORM'), C().canSendForAcceptance(d, 'Pending approval', 'ORDER_FORM')], [true, false]);
  const a = C().applyAcceptance(d, 'ORDER_FORM', { method: 'online', name: 'A. Client', at: '2026-11-21T10:00:00Z' });
  eq([a.stage, a.status, a.acceptance.ORDER_FORM.status], ['MSA', 'Order Form accepted', 'Accepted online']);
  const p2 = C().planGeneration(a, C().evaluateDeal(global.M, a), 'Not required');
  eq([p2.docTypes, p2.status], [['MSA'], 'MSA generated']);
  a.docNos.MSA = 'OC-MSA-2026-0003';
  const msa = C().buildDocData('MSA', global.M, a, C().evaluateDeal(global.M, a).quote, { docNo: a.docNos.MSA, related: C().relatedNumbers(a) });
  eq(msa.fields.InitialOrderFormNo, 'OC-Q-2026-0009');
  eq(C().applyAcceptance(a, 'MSA', { method: 'upload', signedFileId: 'f1' }).status, 'Won');
});

test('Existing MSA or top-up: Order Form acceptance = Won directly', () => {
  const d = base(); d.stage = 'CONTRACT'; d.msa = { no: 'OC-MSA-2026-0002', dealId: 'D-OLD' };
  eq(C().applyAcceptance(d, 'ORDER_FORM', { method: 'online' }).status, 'Won');
});

test('MSA stage: commercials locked, only signatory and §7 can change; prices are not re-approved', () => {
  const d = base(); d.stage = 'CONTRACT'; d.commercial.specialPrices = { Loyalty: 70 };
  const stored = C().applyAcceptance(d, 'ORDER_FORM', { method: 'online' });
  const inc = JSON.parse(JSON.stringify(stored)); inc.commercial.stores = 999; inc.client.legalName = 'Other'; inc.client.signatoryName = 'New Signer'; inc.msaExceptions = 'Clause 3: 45 days';
  const p = C().protectDealFields(inc, stored, 'Order Form accepted', {});
  eq([p.commercial.stores, p.client.legalName, p.client.signatoryName, p.stage, p.status], [46, 'Fashion Retail Group S.A.E.', 'New Signer', 'MSA', 'Order Form accepted']);
  const ev = C().evaluateDeal(global.M, p);
  eq([ev.needsApproval, ev.approvalItems.map((x) => x.area)], [true, ['MSA special terms']], 'only the exception, not the special price');
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

test('MSA exceptions need Superadmin approval at the MSA stage; approval is lost when the text changes; ignored without an MSA', () => {
  const d = base(); d.stage = 'MSA'; d.commercial.specialPrices = {}; d.commercial.msaRef = '';
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
  const c = base(); c.stage = 'CONTRACT'; c.commercial.specialPrices = {}; c.msaExceptions = 'Cure period 60 days';
  eq(C().evaluateDeal(global.M, c).needsApproval, false, 'Order Form stage: exceptions are not printed yet');
});
