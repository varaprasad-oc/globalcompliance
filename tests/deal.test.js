const { sampleDeal } = require('./fixtures');
const C = () => global.__ctx;
const fresh = () => { const d = JSON.parse(JSON.stringify(sampleDeal)); d.docs = { PROPOSAL: true, ORDER_FORM: true, TOS: true, DPA: true }; return d; };

test('Country defaults fill market, currency and entity only when blank', () => {
  const d = { client: { legalName: 'X', country: 'United Arab Emirates' }, commercial: {} };
  C().applyCountryDefaults(global.M, d);
  eq([d.commercial.market, d.commercial.currency, d.entityId], ['High Income', 'USD', 'OC-AE']);
  const e = { client: { country: 'Saudi Arabia' }, commercial: { market: 'Developed', currency: 'SAR' } };
  C().applyCountryDefaults(global.M, e);
  eq([e.commercial.market, e.commercial.currency, e.entityId], ['Developed', 'USD', undefined], 'KSA: market choice kept, currency forced to USD, partner must be picked');
  const cur = (country) => { const x = { client: { country }, commercial: { currency: 'AED' } }; C().applyCountryDefaults(global.M, x); return x.commercial.currency; };
  eq([cur('India'), cur('South Africa'), cur('Egypt'), cur('United States'), cur('Qatar')], ['INR', 'ZAR', 'USD', 'USD', 'USD']);
});

test('Complete sample deal evaluates as ready, with approval for the special price', () => {
  const ev = C().evaluateDeal(global.M, fresh());
  eq(ev.ok, true);
  eq(ev.readyToGenerate, true);
  eq(ev.needsApproval, true, 'Loyalty special USD 70 < standard USD 75');
});

test('Blocking errors and per-document missing fields', () => {
  const d = fresh();
  d.client.legalName = ''; d.docs = {}; d.client.billingContact = { email: 'bad-email' }; d.commercial.orderPackage = 'Engagement';
  const ev = C().evaluateDeal(global.M, d);
  eq(ev.ok, false);
  eq(ev.errors.includes('Client legal name is required'), true);
  eq(ev.errors.includes('Select at least one document'), true);
  eq(ev.errors.includes('Invalid email: bad-email'), true);
  const d2 = fresh(); delete d2.client.billingContact; d2.commercial.orderPackage = 'Engagement';
  const ev2 = C().evaluateDeal(global.M, d2);
  eq(ev2.errors.includes('Order Form package must be one of the quoted packages'), true);
  eq(ev2.missing.ORDER_FORM, ['Billing contact email']);
  eq(ev2.missing.PROPOSAL, undefined);
});

test('Access rules: rep own only, manager own + team, superadmin all', () => {
  const users = [{ email: 'rep@optculture.com', manager_email: 'mgr@optculture.com' }, { email: 'other@optculture.com', manager_email: 'x@optculture.com' }];
  const rep = { ok: true, email: 'rep@optculture.com', role: 'Rep' };
  const mgr = { ok: true, email: 'mgr@optculture.com', role: 'Manager' };
  const sa = { ok: true, email: 'amith.lulla@optculture.com', role: 'Superadmin' };
  eq([C().canAccessDeal(rep, 'rep@optculture.com', users), C().canAccessDeal(rep, 'other@optculture.com', users)], [true, false]);
  eq([C().canAccessDeal(mgr, 'rep@optculture.com', users), C().canAccessDeal(mgr, 'other@optculture.com', users)], [true, false]);
  eq(C().canAccessDeal(sa, 'other@optculture.com', users), true);
  eq(C().canAccessDeal({ ok: false }, 'rep@optculture.com', users), false);
});

test('Deal record keeps creator, flags approval, round-trips JSON', () => {
  const d = fresh(); d.dealId = 'D-1'; d.version = 1;
  const ev = C().evaluateDeal(global.M, d);
  const rec = C().dealRecord(d, ev, 'rep@optculture.com', '2026-11-14T10:00:00Z', null);
  eq([rec.created_by, rec.status, rec.needs_approval, rec.approval_status, rec.packages], ['rep@optculture.com', 'Draft', true, 'Required', 'Loyalty, Advanced']);
  eq(JSON.parse(rec.input_json).client.shortName, 'FRG');
  const rec2 = C().dealRecord(d, ev, 'mgr@optculture.com', '2026-11-15T10:00:00Z', rec);
  eq([rec2.created_by, rec2.created_at, rec2.updated_at], ['rep@optculture.com', '2026-11-14T10:00:00Z', '2026-11-15T10:00:00Z']);
  eq(C().dealSummary(rec2).needsApproval, true);
});

test('Clone resets id, version and status', () => {
  const d = fresh(); d.dealId = 'D-1'; d.version = 3; d.status = 'Generated';
  const c = C().cloneDeal(d, 'D-2');
  eq([c.dealId, c.version, c.status, c.client.shortName], ['D-2', 1, 'Draft', 'FRG']);
  eq(d.dealId, 'D-1', 'original untouched');
});
