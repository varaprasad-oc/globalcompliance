const { sampleDeal } = require('./fixtures');
const C = () => global.__ctx;
/** A Won parent: Loyalty at special USD 70 / site / month, 46 stores + 1 e-com (47 sites), MSA OC-MSA-2026-0001. */
function wonParent() {
  const d = JSON.parse(JSON.stringify(sampleDeal));
  d.dealId = 'D-2026-0005'; d.stage = 'CONTRACT'; d.status = 'Won';
  d.docNos = { PROPOSAL: 'OC-P-2026-0001', ORDER_FORM: 'OC-Q-2026-0003', MSA: 'OC-MSA-2026-0001' };
  return d;
}
function topUp() {
  const p = wonParent();
  return C().makeTopUp(p, C().buildQuote(global.M, p.commercial));
}

test('Top-up offered only on Won contract deals (not on top-ups)', () => {
  const p = wonParent();
  eq([C().canTopUp(p, 'Won'), C().canTopUp(p, 'Sent'), C().canTopUp(Object.assign({}, p, { dealType: 'TOPUP' }), 'Won')], [true, false, false]);
});

test('Top-up deal: contract stage, Order Form only under the parent MSA, contracted price locked', () => {
  const t = topUp();
  eq([t.dealType, t.stage, t.topupOf.dealId, t.topupOf.orderFormNo, t.topupOf.msaNo, t.topupOf.package, t.topupOf.contractedPricePerSite, t.topupOf.baseSites],
    ['TOPUP', 'CONTRACT', 'D-2026-0005', 'OC-Q-2026-0003', 'OC-MSA-2026-0001', 'Loyalty', 70, 47]);
  t.dealId = 'D-2026-0009';
  eq([C().contractMode(t), C().selectedDocs(t), C().relatedNumbers(t).MSA], ['ORDER_ONLY', ['ORDER_FORM'], 'OC-MSA-2026-0001']);
});

test('Top-up with nothing added is refused', () => {
  const t = topUp();
  const ev = C().evaluateDeal(global.M, t);
  eq([ev.ok, ev.errors], [false, ['Add at least one item to the top-up']]);
});

test('Top-up: 5 new stores at contracted price + installation; no set-up fee; slab stays contracted', () => {
  const t = topUp(); t.topup.addStores = 5;
  const ev = C().evaluateDeal(global.M, t);
  const p = ev.quote.packages[0];
  eq([ev.ok, ev.needsApproval, p.sites, p.finalPricePerSite, p.licenceMonthly], [true, false, 5, 70, 350]);
  eq(p.oneTime.map((l) => [l.id, l.qty]), [['STORE_INSTALL', 5]]);
  eq(ev.quote.discounts.slabLabel, C().buildQuote(global.M, wonParent().commercial).discounts.slabLabel, 'contracted slab (47 sites), not the 5-site slab');
  t.topup.licencePrice = 65;
  eq(C().evaluateDeal(global.M, t).approvalReasons, ['Top-up licence: USD 65 vs contracted USD 70 per site/month']);
});

test('Top-up: add-on, comms pack and WhatsApp credits (3 types, every credit line needs approval)', () => {
  const t = topUp();
  t.topup.addOns = ['GIFT_CARDS'];
  t.topup.commsTiers = ['COMMS_100K'];
  t.topup.whatsapp = [{ type: 'Promotional', credits: 10000, pricePerCredit: 0.06 }, { type: 'Authentication', credits: 5000, pricePerCredit: 0.03 }];
  t.commercial.termMonths = 24;
  const ev = C().evaluateDeal(global.M, t);
  const p = ev.quote.packages[0];
  eq([ev.ok, p.sites, p.addOns.map((a) => a.id), ev.quote.topup.comms.map((c) => c.id)], [true, 0, ['GIFT_CARDS'], ['COMMS_100K']]);
  eq(ev.quote.topup.whatsapp.map((w) => [w.label, w.qty, w.unitPrice, w.total]), [['WhatsApp Promotional credits', 10000, 0.06, 600], ['WhatsApp Authentication credits', 5000, 0.03, 150]]);
  eq([p.oneTimeTotal, p.recurringMonthly, p.termTotal], [750, p.addOnsMonthly + p.commsMonthly, 750 + (p.addOnsMonthly + p.commsMonthly) * 24]);
  eq(ev.needsApproval, true);
  eq(ev.approvalReasons.filter((r) => /WhatsApp/.test(r)).length, 2);
  t.topup.addOns = []; t.topup.commsTiers = []; t.topup.whatsapp = [{ type: 'Promotional', credits: 0, pricePerCredit: 0 }];
  eq(C().evaluateDeal(global.M, t).ok, false, 'empty rows ignored → nothing added');
  t.topup.whatsapp = [{ type: 'Promotional', credits: 100, pricePerCredit: '' }];
  eq(C().evaluateDeal(global.M, t).errors, ['WhatsApp Promotional credits: enter credit count and price per credit']);
});

test('Top-up fields are server-owned (browser cannot change contracted price or parent)', () => {
  const stored = topUp(); stored.dealId = 'D-2026-0009';
  const incoming = JSON.parse(JSON.stringify(stored));
  incoming.topupOf.contractedPricePerSite = 1; incoming.dealType = 'NEW';
  const d = C().protectDealFields(incoming, stored, 'Contract draft', {});
  eq([d.dealType, d.topupOf.contractedPricePerSite], ['TOPUP', 70]);
  eq(C().protectDealFields({ dealType: 'TOPUP', topupOf: {}, client: {} }, null, null, {}).dealType, undefined, 'a new deal cannot be created as a top-up from the browser');
});

test('Top-up Order Form data: header flag, parent references, licence/comms/WhatsApp lines', () => {
  const t = topUp(); t.dealId = 'D-2026-0009';
  t.topup.addStores = 2; t.topup.commsTiers = ['COMMS_100K']; t.topup.whatsapp = [{ type: 'Transactional', credits: 1000, pricePerCredit: 0.02 }];
  const ev = C().evaluateDeal(global.M, t);
  const d = C().buildDocData('ORDER_FORM', global.M, t, ev.quote, { docNo: 'OC-Q-2026-0010', related: C().relatedNumbers(t) });
  eq([d.flags.IsTopUp, d.fields.ParentOrderFormNo, d.fields.ParentDealId, d.fields.MsaRef], [true, 'OC-Q-2026-0003', 'D-2026-0005', 'OC-MSA-2026-0001']);
  eq(d.lists.SubscriptionLines.map((l) => l.product), ['Additional licences – OptCulture Loyalty Plan', 'Platform messaging – up to 100,000 / month']);
  eq(d.lists.OneTimeLines.map((l) => l.description), ['Installation per store', 'WhatsApp Transactional credits']);
  eq(d.lists.OneTimeLines[1].scope, '1,000 credits × USD 0.02');
});
