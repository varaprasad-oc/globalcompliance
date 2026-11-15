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

test('Dashboard funnel, win/conversion rates, monthly trend, top deals and actions', () => {
  const mk = (id, status, stage, valueUsd, created, approval) => ({ dealId: id, clientName: id, status, stage, valueUsd, createdAt: created, approvalStatus: approval || 'Not required', createdBy: 'rep@optculture.com', orderPackage: 'Loyalty', discountPct: 0.1 });
  const rows = [mk('A', 'Draft', 'PROPOSAL', 0, '2026-11-02'), mk('B', 'Proposal generated', 'PROPOSAL', 1000, '2026-11-03'),
    mk('C', 'Contract generated', 'CONTRACT', 5000, '2026-10-10'), mk('D', 'Won', 'CONTRACT', 3000, '2026-09-01'), mk('E', 'Lost', 'PROPOSAL', 2000, '2026-08-15'),
    mk('F', 'Pending approval', 'PROPOSAL', 800, '2026-11-10', 'Pending')];
  const s = C().dashboardStats(rows, [{ email: 'rep@optculture.com', name: 'Rep' }], new Date('2026-11-15'));
  eq(s.funnel.map((f) => f.count), [2, 1, 1, 1, 1], 'draft incl. pending, sent, contract, won, lost');
  eq(s.winRate, 0.5);
  eq(s.conversionRate, 0.5, '(contract + won) / reached proposal = 2/4');
  eq(s.byMonth.map((m) => m.label), ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
  eq(s.byMonth[5].count, 3);
  eq(s.topOpen.map((t) => t.dealId), ['C', 'B', 'F']);
  eq([s.actions.toConvert.map((x) => x.dealId), s.actions.pending.map((x) => x.dealId), s.actions.notSent.map((x) => x.dealId)], [['B'], ['F'], ['C']]);
});
