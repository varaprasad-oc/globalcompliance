const { sampleDeal } = require('./fixtures');
const C = () => global.__ctx;
function rec(id, owner, status, approval, special) {
  const d = JSON.parse(JSON.stringify(sampleDeal)); d.dealId = id; d.docs = { PROPOSAL: true };
  d.commercial.specialPrices = special ? { Loyalty: 70 } : {};
  const ev = C().evaluateDeal(global.M, d);
  const r = C().dealRecord(d, ev, owner, '2026-11-14T00:00:00Z', null);
  r.status = status; r.approval_status = approval || r.approval_status; return r;
}

test('Deal summary carries first-year value (USD) and discount of the Order Form package', () => {
  const s = C().dealSummary(rec('D-1', 'rep@optculture.com', 'Generated', null, true));
  eq(s.orderPackage, 'Loyalty');
  eq(s.value, 45608 + 585, 'Loyalty first year + optional migration');
  eq(s.valueUsd, 46193);
  eq(s.specialDiscountPct, 0.0667);
});

test('Dashboard stats: pipeline excludes Won/Lost, won total, pending approvals, by rep', () => {
  const users = [{ email: 'rep@optculture.com', name: 'Rep One' }, { email: 'rep2@optculture.com', name: 'Rep Two' }];
  const rows = [rec('D-1', 'rep@optculture.com', 'Generated'), rec('D-2', 'rep@optculture.com', 'Won'),
    rec('D-3', 'rep2@optculture.com', 'Lost'), rec('D-4', 'rep2@optculture.com', 'Pending approval', 'Pending', true)].map(C().dealSummary);
  const st = C().dashboardStats(rows, users);
  eq(st.deals, 4);
  eq(st.pendingApprovals, 1);
  eq(st.wonUsd, rows[1].valueUsd);
  eq(st.pipelineUsd, rows[0].valueUsd + rows[3].valueUsd);
  eq(st.byRep['Rep One'].count, 2);
  eq(st.byStatus.Lost.count, 1);
});

test('Pipeline status changes only after generation', () => {
  eq(C().canSetStatus('Generated', 'Sent'), true);
  eq(C().canSetStatus('Sent', 'Won'), true);
  eq(C().canSetStatus('Draft', 'Won'), false);
  eq(C().canSetStatus('Pending approval', 'Sent'), false);
  eq(C().canSetStatus('Generated', 'Approved'), false);
});
