/**
 * Sprint 8: approvals queue (Superadmin), pipeline status, dashboards, sharing re-sync.
 */

function apiListApprovals() {
  requireUser_([CONFIG.ROLES.SUPERADMIN]);
  var users = getMaster_().Users;
  var deals = {};
  readRecords_('Deals').forEach(function (r) { deals[r.deal_id] = r; });
  return readRecords_('Approvals').filter(function (a) { return !a.decision; }).map(function (a) {
    var rec = deals[a.deal_id];
    if (!rec) return null;
    var d = JSON.parse(rec.input_json), q = rec.quote_json ? JSON.parse(rec.quote_json) : null;
    var owner = (users || []).filter(function (u) { return String(u.email).toLowerCase() === String(rec.created_by).toLowerCase(); })[0] || {};
    return {
      approvalId: a.approval_id, dealId: a.deal_id, version: Number(a.version), requestedAt: a.requested_at instanceof Date ? a.requested_at.toISOString() : String(a.requested_at),
      requestedBy: owner.name || rec.created_by, reasons: String(a.reasons || '').split(' | '), note: d.approvalNote || '',
      items: approvalItemsFor_(d), what: d.dealType === 'TOPUP' ? 'Top-up Order Form (of ' + ((d.topupOf || {}).dealId || '') + ')' :
        (d.stage === 'MSA' ? 'Master Services Agreement (§7 exceptions)' : d.stage === 'CONTRACT' ? 'Order Form' : 'Order Form'),
      client: d.client.legalName, country: d.client.country, currency: rec.currency, summary: dealSummary(rec),
      packages: q ? q.packages.map(function (p) { return { name: p.package, standard: p.standardPricePerSite, final: p.finalPricePerSite, list: p.listPricePerSite,
        specialDiscountPct: p.specialDiscountPct, effectiveDiscountPct: p.effectiveDiscountPct, firstYear: p.firstYearTotal }; }) : [],
      comms: q ? (q.comms || []).filter(function (c) { return c.specialPrice !== null; }) : [],
      changes: q ? changesSinceProposal(getMaster_(), d.proposalBaseline, d, q) : [],
      documents: apiDealDocuments(a.deal_id).filter(function (x) { return Number(x.version) === Number(a.version); })
    };
  }).filter(Boolean);
}

/** Fresh, structured list of what needs approval (from the deal's frozen prices). */
function approvalItemsFor_(deal) {
  try { return evaluateDeal(withSnapshot(getMaster_(), deal.pricingSnapshot), deal).approvalItems || []; } catch (e) { return []; }
}

/** Approve or reject. Approve → final documents are generated automatically. */
function apiDecideApproval(approvalId, decision, comment) {
  var user = requireUser_([CONFIG.ROLES.SUPERADMIN]);
  if (['Approved', 'Rejected'].indexOf(decision) === -1) throw new Error('Decision must be Approved or Rejected');
  if (decision === 'Rejected' && !String(comment || '').trim()) throw new Error('Please add a comment explaining the rejection.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var a, rec, deal;
  try {
    a = readRecords_('Approvals').filter(function (x) { return x.approval_id === approvalId; })[0];
    if (!a || a.decision) throw new Error('Approval not found or already decided.');
    a.decision = decision; a.decided_by = user.email; a.decided_at = new Date(); a.comment = comment || '';
    writeRecord_('Approvals', a, a._row);
    rec = findDeal_(a.deal_id);
    deal = JSON.parse(rec.input_json);
    rec.approval_status = decision;
    rec.status = decision === 'Approved' ? DEAL_STATUS.APPROVED : DEAL_STATUS.REJECTED;
    deal.status = rec.status;
    rec.input_json = JSON.stringify(deal);
    rec.updated_at = new Date().toISOString();
    writeRecord_('Deals', rec, rec._row);
    audit_('APPROVAL_' + decision.toUpperCase(), { approvalId: approvalId, comment: comment || '' }, a.deal_id);
  } finally {
    lock.releaseLock();
  }

  var gen = null;
  if (decision === 'Approved') {
    try { gen = generateForDeal_(a.deal_id, user); } catch (e) { gen = { error: String(e.message || e) }; }
  }
  try {
    var c = deal.client || {};
    MailApp.sendEmail({
      to: rec.created_by, name: CONFIG.APP_NAME,
      subject: (decision === 'Approved' ? 'Approved – ' : 'Rejected – ') + (c.shortName || c.legalName),
      body: 'Your pricing for ' + c.legalName + ' (deal ' + a.deal_id + ') was ' + decision.toLowerCase() + ' by ' + user.name + '.' +
        (comment ? '\n\nComment: ' + comment : '') +
        (decision === 'Approved' ? (gen && !gen.error ? '\n\nFinal documents have been generated and emailed to you separately.' : '\n\nPlease open the deal and click Generate to create the final documents.') :
          '\n\nPlease revise the deal and generate again to request a new approval.')
    });
  } catch (e) { console.warn('decision email failed: ' + e); }
  return { decision: decision, generation: gen };
}

function apiSetDealStatus(dealId, status) {
  var user = requireUser_();
  var rec = findDeal_(dealId);
  if (!rec || !canAccessDeal(user, rec.created_by, getMaster_().Users)) throw new Error('No access.');
  if (!canSetStatus(rec.status, status, user.role === CONFIG.ROLES.SUPERADMIN)) {
    throw new Error(status === 'Won' ? 'A deal becomes Won when the client accepts the MSA (or the Order Form, if they already have an MSA). Only the Superadmin can mark Won by hand.'
      : 'A deal can be marked ' + status + ' only after its documents are generated.');
  }
  var deal = JSON.parse(rec.input_json);
  deal.status = status; rec.status = status; rec.input_json = JSON.stringify(deal); rec.updated_at = new Date().toISOString();
  writeRecord_('Deals', rec, rec._row);
  if (status === 'Won') { try { recordClientMsa_(deal); } catch (e) { notifyFailure_('Recording client MSA for ' + dealId, e); } }
  audit_('STATUS_' + status.toUpperCase(), {}, dealId);
  return dealSummary(rec);
}

/** Dashboard for every role. Rep: own deals. Manager: own + team. Superadmin: everyone. */
function apiDashboard(opts) {
  var user = requireUser_();  // everyone: rep = own, manager = team, superadmin = all
  var users = getMaster_().Users;
  var rows = readRecords_('Deals').filter(function (r) { return canAccessDeal(user, r.created_by, users); }).map(dealSummary);
  return { stats: dashboardStats(rows, users, new Date(), { periodDays: (opts || {}).periodDays || 0, staleDays: staleDaysSetting_(),
    partners: user.role === CONFIG.ROLES.SUPERADMIN ? getMaster_().Partners || [] : null }), deals: rows };
}

/** Superadmin tool: re-apply file sharing (owner + current manager) on every final/draft document, e.g. after a team change. */
function apiResyncSharing() {
  requireUser_([CONFIG.ROLES.SUPERADMIN]);
  var users = getMaster_().Users, deals = {}, n = 0;
  readRecords_('Deals').forEach(function (r) { deals[r.deal_id] = r; });
  readRecords_('Documents').forEach(function (d) {
    var rec = deals[d.deal_id];
    if (!rec || d.status === 'Superseded') return;
    var owner = (users || []).filter(function (u) { return String(u.email).toLowerCase() === String(rec.created_by).toLowerCase(); })[0] || {};
    shareFiles_([d.pdf_file_id].filter(String), [rec.created_by, owner.manager_email].filter(Boolean));  // PDFs only
    n++;
  });
  audit_('SHARING_RESYNC', { documents: n });
  return n;
}

function staleDaysSetting_() {
  var r = (getMaster_().CommercialTerms || []).filter(function (x) { return x.key === 'stale_days'; })[0];
  return r && Number(r.value) > 0 ? Number(r.value) : 60;
}
