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
  eq([plan.docTypes, plan.status], [['ORDER_FORM', 'TOS', 'DPA'], 'Contract generated']);
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
