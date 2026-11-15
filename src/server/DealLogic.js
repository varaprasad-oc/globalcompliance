/**
 * Sprint 6: deal rules. Pure JS (Apps Script + Node tests).
 *
 * deal = {
 *   dealId, version, status,
 *   client: {...}, entityId,
 *   commercial: {...},                        // see Pricing.js / DocData.js
 *   docs: { PROPOSAL: true, ORDER_FORM: true, TOS: true, DPA: true },
 *   language: 'EN' | 'AR' | 'BI',
 *   proposal: { title, tagline, multiBrand, showConsulting },
 *   narrative: { notes, executiveSummary, journeys: [], multiBrandIntro },
 *   dpa: { hostingRegion, extraDataSubjects, extraDataTypes, sensitiveData }
 * }
 */

var DEAL_STATUS = { DRAFT: 'Draft', PENDING: 'Pending approval', APPROVED: 'Approved', REJECTED: 'Rejected', GENERATED: 'Generated',
  PROPOSAL_GENERATED: 'Proposal generated', CONTRACT_DRAFT: 'Contract draft', CONTRACT_GENERATED: 'Contract generated', SENT: 'Sent', WON: 'Won', LOST: 'Lost' };

/** Two-stage flow: PROPOSAL (proposal only) → CONTRACT (Order Form + ToS/MSA + DPA). */
var STAGE_DOCS = { PROPOSAL: ['PROPOSAL'], CONTRACT: ['ORDER_FORM', 'TOS', 'DPA'] };
var GENERATED_STATUSES = ['Generated', 'Proposal generated', 'Contract generated', 'Sent', 'Won', 'Lost'];

/** A proposal that has been generated (and possibly sent) can be converted to the contract stage. */
function canConvertToContract(deal, status) {
  return (deal.stage || 'PROPOSAL') === 'PROPOSAL' && ['Proposal generated', 'Sent'].indexOf(status) !== -1;
}

/** What the proposal said (kept at conversion so stage-2 changes can be shown). */
function proposalBaseline(deal, quote) {
  var com = JSON.parse(JSON.stringify(deal.commercial || {}));
  var prices = {}, comms = {};
  ((quote && quote.packages) || []).forEach(function (p) { prices[p.package] = p.finalPricePerSite; });
  ((quote && quote.comms) || []).forEach(function (c) { comms[c.id] = c.unitPrice; });
  return { takenAt: new Date().toISOString(), docNo: (deal.docNos || {}).PROPOSAL || '', commercial: com, prices: prices, comms: comms, currency: quote ? quote.currency : com.currency };
}

/** Human-readable differences between the proposal baseline and the current deal. */
function changesSinceProposal(master, base, deal, quote) {
  if (!base) return [];
  var out = [], b = base.commercial || {}, c = deal.commercial || {};
  var label = {};
  (master.PriceItems || []).forEach(function (i) { label[i.item_id] = i.label; });
  (master.CommsTiers || []).forEach(function (t) { label[t.tier_id] = 'Messaging up to ' + Number(t.messages).toLocaleString('en-US') + ' / month'; });
  var cur = (quote && quote.currency) || c.currency;
  function money(v) { return v === null || v === undefined || v === '' ? '—' : formatMoney(cur, v); }
  [['market', 'Market'], ['currency', 'Currency'], ['stores', 'Stores'], ['ecomSites', 'E-commerce sites']].forEach(function (f) {
    if (String(b[f[0]] == null ? '' : b[f[0]]) !== String(c[f[0]] == null ? '' : c[f[0]])) out.push(f[1] + ': ' + (b[f[0]] === '' || b[f[0]] == null ? '—' : b[f[0]]) + ' → ' + (c[f[0]] === '' || c[f[0]] == null ? '—' : c[f[0]]));
  });
  var bp = b.packages || [], cp = c.packages || [];
  cp.filter(function (p) { return bp.indexOf(p) === -1; }).forEach(function (p) { out.push('Package added: ' + p); });
  bp.filter(function (p) { return cp.indexOf(p) === -1; }).forEach(function (p) { out.push('Package removed: ' + p); });
  ((quote && quote.packages) || []).forEach(function (p) {
    var before = (base.prices || {})[p.package];
    if (before !== undefined && before !== p.finalPricePerSite) out.push(p.package + ' price / site / month: ' + money(before) + ' → ' + money(p.finalPricePerSite));
  });
  function addOnsOf(com, pkg) { return (com.addOnsByPackage && com.addOnsByPackage[pkg]) ? com.addOnsByPackage[pkg] : (com.addOns || []); }
  cp.filter(function (p) { return bp.indexOf(p) !== -1; }).forEach(function (p) {
    var was = addOnsOf(b, p), now = addOnsOf(c, p);
    now.filter(function (x) { return was.indexOf(x) === -1; }).forEach(function (x) { out.push((label[x] || x) + ' added to ' + p); });
    was.filter(function (x) { return now.indexOf(x) === -1; }).forEach(function (x) { out.push((label[x] || x) + ' removed from ' + p); });
  });
  var bo = {}, co = {};
  (b.oneTimeItems || []).forEach(function (i) { bo[i.id] = i.qty || 1; });
  (c.oneTimeItems || []).forEach(function (i) { co[i.id] = i.qty || 1; });
  Object.keys(co).forEach(function (id) { if (!(id in bo)) out.push('Optional service added: ' + (label[id] || id)); });
  Object.keys(bo).forEach(function (id) { if (!(id in co)) out.push('Optional service removed: ' + (label[id] || id)); });
  ((quote && quote.comms) || []).forEach(function (t) {
    var before = (base.comms || {})[t.id];
    if (before !== undefined && before !== t.unitPrice) out.push(label[t.id] + ': ' + money(before) + ' → ' + money(t.unitPrice));
  });
  return out;
}

/** Deal moved to stage 2: contract documents selected, Order Form package defaulted, proposal baseline kept. */
function convertToContract(deal, quote) {
  var d = JSON.parse(JSON.stringify(deal));
  d.proposalBaseline = proposalBaseline(deal, quote);
  d.stage = 'CONTRACT';
  d.status = DEAL_STATUS.CONTRACT_DRAFT;
  d.docs = { ORDER_FORM: true, TOS: true, DPA: true };
  d.commercial = d.commercial || {};
  if (!d.commercial.orderPackage || (d.commercial.packages || []).indexOf(d.commercial.orderPackage) === -1) d.commercial.orderPackage = (d.commercial.packages || [])[0];
  return d;
}

/** Market / contracting entity default from the Countries tab; currency is always the country's fixed currency. */
function applyCountryDefaults(master, deal) {
  deal.commercial = deal.commercial || {};
  var country = (master.Countries || []).filter(function (r) { return r.country === (deal.client || {}).country; })[0];
  if (!country) { if ((deal.client || {}).country) deal.commercial.currency = 'USD'; return deal; }
  if (!deal.commercial.market) deal.commercial.market = country.default_market;
  deal.commercial.currency = country.default_currency || 'USD';  // fixed per country (INR India, ZAR South Africa, USD others)
  if (!deal.entityId && country.entity_id) deal.entityId = country.entity_id;
  return deal;
}

/**
 * Hybrid contract pack (decision #22):
 *  - AGREEMENT: first contract for a client → one document: MSA/ToS (+SLA) with Annexure A Order Form and Annexure B DPA.
 *  - ORDER_ONLY: the client already has an MSA (recorded on the client when an Agreement deal was Won, or typed in
 *    "MSA reference") → standalone Order Form citing that MSA. deal.newMsa forces a fresh Agreement.
 * deal.msa = { no, dpaNo, dealId, date } is filled by the server from the Clients tab.
 */
function existingMsa(deal) {
  var msa = deal.msa || {}, ref = String((deal.commercial || {}).msaRef || '').trim();
  if (msa.no && msa.dealId !== deal.dealId) return { no: msa.no, dpaNo: msa.dpaNo || '', dealId: msa.dealId || '', date: msa.date || '', source: 'client' };
  if (ref && ref !== (deal.docNos || {}).TOS) return { no: ref, dpaNo: '', dealId: '', date: '', source: 'manual' };
  return null;
}

function contractMode(deal) {
  if (deal.stage !== 'CONTRACT') return null;
  return existingMsa(deal) && !deal.newMsa ? 'ORDER_ONLY' : 'AGREEMENT';
}

/** Numbers the documents should cite: the deal's own numbers, or the client's existing MSA/DPA for a standalone Order Form. */
function relatedNumbers(deal) {
  var rel = JSON.parse(JSON.stringify(deal.docNos || {}));
  if (contractMode(deal) === 'ORDER_ONLY') {
    var msa = existingMsa(deal);
    rel.TOS = msa.no; rel.DPA = msa.dpaNo || '';
  }
  return rel;
}

function selectedDocs(deal) {
  if (deal.stage === 'CONTRACT') return contractMode(deal) === 'ORDER_ONLY' ? ['ORDER_FORM'] : ['TOS', 'ORDER_FORM', 'DPA'];
  var d = deal.docs || {};
  var allowed = deal.stage ? STAGE_DOCS[deal.stage] : DOC_TYPES;
  return DOC_TYPES.filter(function (t) { return d[t] && allowed.indexOf(t) !== -1; });
}

/** Full check of a deal: quote, blocking errors, missing fields per selected document, approval need. */
function evaluateDeal(master, deal) {
  var errors = [];
  var c = deal.client || {}, com = deal.commercial || {};
  if (!c.legalName) errors.push('Client legal name is required');
  if (!c.country) errors.push('Country is required');
  var docs = selectedDocs(deal);
  if (!docs.length) errors.push('Select at least one document');
  if (deal.entityId && !(master.Entities || []).some(function (e) { return e.entity_id === deal.entityId; })) errors.push('Unknown contracting entity');
  if (docs.indexOf('ORDER_FORM') !== -1 && com.orderPackage && (com.packages || []).indexOf(com.orderPackage) === -1) {
    errors.push('Order Form package must be one of the quoted packages');
  }
  var c1 = c.businessContact || {}, c2 = c.billingContact || {};
  [c1.email, c2.email].forEach(function (e) { if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) errors.push('Invalid email: ' + e); });

  var quote = buildQuote(master, com);
  if (!quote.ok) errors = errors.concat(quote.errors);

  var missing = {};
  docs.forEach(function (t) { var mm = missingForDoc(t, deal); if (mm.length) missing[t] = mm; });

  return {
    ok: errors.length === 0,
    errors: errors,
    quote: quote.ok ? quote : null,
    missing: missing,
    readyToGenerate: errors.length === 0 && Object.keys(missing).length === 0,
    needsApproval: quote.ok ? quote.needsApproval : false,
    approvalReasons: quote.ok ? quote.approvalReasons : [],
    changesSinceProposal: quote.ok ? changesSinceProposal(master, deal.proposalBaseline, deal, quote) : [],
    contract: deal.stage === 'CONTRACT' ? { mode: contractMode(deal), msa: existingMsa(deal) } : null
  };
}

/** May this user see / edit a deal owned by ownerEmail? Superadmin: all. Owner: yes. Manager: own team. */
function canAccessDeal(user, ownerEmail, users) {
  if (!user || !user.ok) return false;
  var owner = String(ownerEmail || '').toLowerCase();
  if (user.role === 'Superadmin') return true;
  if (owner === user.email) return true;
  if (user.role === 'Manager') {
    return (users || []).some(function (u) {
      return String(u.email).toLowerCase() === owner && String(u.manager_email).toLowerCase() === user.email;
    });
  }
  return false;
}

/** Build the Deals-tab record for a deal. */
function dealRecord(deal, evaluation, userEmail, nowIso, existing) {
  var com = deal.commercial || {};
  return {
    deal_id: deal.dealId,
    created_at: existing ? existing.created_at : nowIso,
    created_by: existing ? existing.created_by : userEmail,
    updated_at: nowIso,
    status: deal.status || DEAL_STATUS.DRAFT,
    client_id: deal.clientId || '',
    client_name: (deal.client || {}).legalName || '',
    country: (deal.client || {}).country || '',
    market: com.market || '',
    currency: com.currency || '',
    entity_id: deal.entityId || '',
    stores: Number(com.stores || 0),
    ecom_sites: Number(com.ecomSites || 0),
    packages: (com.packages || []).join(', '),
    input_json: JSON.stringify(deal),
    quote_json: evaluation.quote ? JSON.stringify(evaluation.quote) : '',
    needs_approval: !!evaluation.needsApproval,
    approval_status: !evaluation.needsApproval ? 'Not required'
      : (existing && (existing.approval_status === 'Approved' || existing.approval_status === 'Pending') && existing.quote_json === JSON.stringify(evaluation.quote))
        ? existing.approval_status : 'Required',
    ai_draft_json: existing ? existing.ai_draft_json : '',
    final_text_json: JSON.stringify(deal.narrative || {}),
    version: Number(deal.version || 1)
  };
}

/** Summary row for deal lists and dashboards (value = first-year total of the Order Form package). */
function dealSummary(rec) {
  var q = null, d = {};
  try { q = rec.quote_json ? JSON.parse(rec.quote_json) : null; } catch (e) { q = null; }
  try { d = rec.input_json ? JSON.parse(rec.input_json) : {}; } catch (e) { d = {}; }
  var op = null;
  if (q && q.packages) {
    var name = (d.commercial || {}).orderPackage || (q.packages[0] || {}).package;
    op = q.packages.filter(function (p) { return p.package === name; })[0] || q.packages[0];
  }
  var value = op ? op.firstYearTotal + (d.stage === 'PROPOSAL' ? 0 : (q.optionalOneTimeTotal || 0)) : 0;
  return {
    dealId: rec.deal_id, clientName: rec.client_name, country: rec.country, packages: rec.packages,
    currency: rec.currency, status: rec.status, needsApproval: isTrue(rec.needs_approval), approvalStatus: rec.approval_status,
    createdBy: rec.created_by, createdAt: rec.created_at instanceof Date ? rec.created_at.toISOString() : String(rec.created_at || ''), updatedAt: rec.updated_at instanceof Date ? rec.updated_at.toISOString() : String(rec.updated_at || ''),
    version: Number(rec.version || 1),
    lastGeneratedAt: d.lastGeneratedAt || '',
    referralPartnerId: d.referralPartnerId || '',
    stage: d.stage || '',
    orderPackage: op ? op.package : '',
    value: value,
    valueUsd: q && q.fxRate ? Math.round(value / q.fxRate) : 0,
    discountPct: op ? op.effectiveDiscountPct : 0,
    specialDiscountPct: op ? op.specialDiscountPct : 0
  };
}

/** Owner may move a generated deal along the sales pipeline. */
var PIPELINE_STATUSES = ['Sent', 'Won', 'Lost'];
function canSetStatus(currentStatus, newStatus) {
  return PIPELINE_STATUSES.indexOf(newStatus) !== -1 && GENERATED_STATUSES.indexOf(currentStatus) !== -1;
}

/** Dashboard numbers from deal summaries (amounts in USD for comparability). now = Date for the monthly window. */
function dashboardStats(summaries, users, now, opts) {
  opts = opts || {};
  now = now ? new Date(now) : new Date();
  var staleDays = Number(opts.staleDays || 60), periodDays = Number(opts.periodDays || 0);
  var daysSince = function (iso) { var t = Date.parse(iso || ''); return isNaN(t) ? 0 : Math.floor((now - t) / 86400000); };
  var allRows = summaries;
  if (periodDays) summaries = summaries.filter(function (sm) { return daysSince(sm.lastGeneratedAt || sm.updatedAt || sm.createdAt) <= periodDays; });
  var nameOf = {};
  (users || []).forEach(function (u) { nameOf[String(u.email).toLowerCase()] = u.name; });
  var s = { deals: summaries.length, pipelineUsd: 0, wonUsd: 0, pendingApprovals: 0, avgDiscountPct: 0, winRate: null, conversionRate: null,
    byStatus: {}, byRep: {}, byCountry: {}, byPackage: {}, funnel: [], byMonth: [], topOpen: [], stale: [], staleDays: staleDays, periodDays: periodDays, actions: { toConvert: [], pending: [], notSent: [], rejected: [] } };
  var discSum = 0, discN = 0;
  function add(map, key, sm) {
    key = key || '—';
    map[key] = map[key] || { count: 0, valueUsd: 0 };
    map[key].count++; map[key].valueUsd += sm.valueUsd || 0;
  }
  var f = { draft: 0, proposal: 0, contract: 0, won: 0, lost: 0 };
  var mini = function (sm) { return { dealId: sm.dealId, clientName: sm.clientName, valueUsd: sm.valueUsd, status: sm.status, owner: nameOf[String(sm.createdBy).toLowerCase()] || sm.createdBy }; };
  summaries.forEach(function (sm) {
    var open = sm.status !== 'Won' && sm.status !== 'Lost';
    if (open) s.pipelineUsd += sm.valueUsd || 0;
    if (sm.status === 'Won') s.wonUsd += sm.valueUsd || 0;
    if (sm.approvalStatus === 'Pending') s.pendingApprovals++;
    if (sm.orderPackage) { discSum += sm.discountPct || 0; discN++; }
    add(s.byStatus, sm.status, sm);
    add(s.byRep, nameOf[String(sm.createdBy).toLowerCase()] || sm.createdBy, sm);
    add(s.byCountry, sm.country, sm);
    add(s.byPackage, sm.orderPackage, sm);
    var stage = sm.stage || 'PROPOSAL';
    if (sm.status === 'Won') f.won++;
    else if (sm.status === 'Lost') f.lost++;
    else if (stage === 'CONTRACT') f.contract++;
    else if (['Proposal generated', 'Sent', 'Generated'].indexOf(sm.status) !== -1) f.proposal++;
    else f.draft++;
    if (stage === 'PROPOSAL' && ['Proposal generated', 'Sent'].indexOf(sm.status) !== -1) s.actions.toConvert.push(mini(sm));
    if (sm.approvalStatus === 'Pending') s.actions.pending.push(mini(sm));
    if (sm.status === 'Contract generated') s.actions.notSent.push(mini(sm));
    if (sm.status === 'Rejected') s.actions.rejected.push(mini(sm));
  });
  // partner performance (Superadmin only: opts.partners is passed for Superadmin)
  if (opts.partners) {
    var pName = {};
    opts.partners.forEach(function (p) { pName[p.partner_id] = p.name; });
    s.byPartner = {};
    summaries.forEach(function (sm) {
      if (!sm.referralPartnerId) return;
      var k = pName[sm.referralPartnerId] || sm.referralPartnerId;
      var r = s.byPartner[k] = s.byPartner[k] || { deals: 0, open: 0, won: 0, lost: 0, pipelineUsd: 0, wonUsd: 0, winRate: null };
      r.deals++;
      if (sm.status === 'Won') { r.won++; r.wonUsd += sm.valueUsd || 0; }
      else if (sm.status === 'Lost') r.lost++;
      else { r.open++; r.pipelineUsd += sm.valueUsd || 0; }
    });
    Object.keys(s.byPartner).forEach(function (k) { var r = s.byPartner[k]; r.winRate = (r.won + r.lost) ? Math.round(r.won / (r.won + r.lost) * 1000) / 1000 : null; });
  }
  s.avgDiscountPct = discN ? Math.round(discSum / discN * 1000) / 1000 : 0;
  s.winRate = (f.won + f.lost) ? Math.round(f.won / (f.won + f.lost) * 1000) / 1000 : null;
  var reachedProposal = f.proposal + f.contract + f.won + f.lost;
  s.conversionRate = reachedProposal ? Math.round((f.contract + f.won) / reachedProposal * 1000) / 1000 : null;
  s.funnel = [['Proposal draft', f.draft], ['Proposal sent', f.proposal], ['Order Form stage', f.contract], ['Won', f.won], ['Lost', f.lost]]
    .map(function (x) { return { label: x[0], count: x[1] }; });
  // monthly trend: 6 months, or 12 for long periods
  var months = !periodDays || periodDays > 180 ? 12 : 6;
  s.months = months;
  for (var i = months - 1; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    s.byMonth.push({ key: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2), label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()], count: 0, valueUsd: 0 });
  }
  summaries.forEach(function (sm) {
    var k = String(sm.createdAt || '').slice(0, 7);
    var m = s.byMonth.filter(function (x) { return x.key === k; })[0];
    if (m) { m.count++; m.valueUsd += sm.valueUsd || 0; }
  });
  s.topOpen = summaries.filter(function (sm) { return sm.status !== 'Won' && sm.status !== 'Lost' && sm.valueUsd; })
    .sort(function (a, b) { return b.valueUsd - a.valueUsd; }).slice(0, 5).map(mini);
  // follow-up: open deals with no update for staleDays+ (regardless of the period filter)
  s.stale = allRows.filter(function (sm) { return sm.status !== 'Won' && sm.status !== 'Lost' && daysSince(sm.updatedAt) >= staleDays; })
    .map(function (sm) { var x = mini(sm); x.days = daysSince(sm.updatedAt); x.stage = sm.stage || 'PROPOSAL'; return x; })
    .sort(function (a, b) { return b.days - a.days; });
  return s;
}

/** Copy of a deal as a new draft (new id, version 1, status Draft). */
function cloneDeal(deal, newId) {
  var c = JSON.parse(JSON.stringify(deal));
  c.dealId = newId;
  c.version = 1;
  c.status = DEAL_STATUS.DRAFT;
  c.client = c.client || {};
  delete c.docNos; delete c.pricingSnapshot; delete c.approvalNote; delete c.aiDraft;  // a clone gets new numbers and today's prices
  c.stage = 'PROPOSAL'; c.docs = { PROPOSAL: true }; delete c.proposalBaseline;
  return c;
}

/**
 * Security: fields the browser must not control. Price snapshot, document numbers, status, version and
 * client id always come from the stored deal (or are set fresh for a new deal).
 */
function protectDealFields(incoming, stored, existingStatus, freshSnapshot) {
  var d = JSON.parse(JSON.stringify(incoming || {}));
  var refresh = !!d.refreshPrices;
  delete d.refreshPrices;
  if (!stored) {
    d.dealId = null; d.version = 1; d.status = DEAL_STATUS.DRAFT;
    delete d.docNos; d.pricingSnapshot = freshSnapshot; delete d.clientId; delete d.proposalBaseline;
    d.stage = 'PROPOSAL'; d.docs = { PROPOSAL: true };
    return d;
  }
  d.dealId = stored.dealId;
  d.docNos = stored.docNos;
  d.proposalBaseline = stored.proposalBaseline;
  d.clientId = stored.clientId;
  d.pricingSnapshot = refresh || !stored.pricingSnapshot ? freshSnapshot : stored.pricingSnapshot;
  d.stage = stored.stage;
  if (d.stage) {
    var docs = {};
    STAGE_DOCS[d.stage].forEach(function (t) { docs[t] = d.stage === 'CONTRACT' && t === 'ORDER_FORM' ? true : !!(d.docs || {})[t]; });
    if (d.stage === 'PROPOSAL') docs.PROPOSAL = true;
    d.docs = docs;
  }
  var revised = GENERATED_STATUSES.indexOf(existingStatus) !== -1;
  d.version = Number(stored.version || 1) + (revised ? 1 : 0);
  var draftStatus = d.stage === 'CONTRACT' ? DEAL_STATUS.CONTRACT_DRAFT : DEAL_STATUS.DRAFT;
  d.status = revised || existingStatus === DEAL_STATUS.REJECTED ? draftStatus : (existingStatus || draftStatus);
  return d;
}

/** Google Sheets cells hold at most 50,000 characters. */
function assertCellSizes(rec) {
  ['input_json', 'quote_json', 'final_text_json'].forEach(function (k) {
    if (String(rec[k] || '').length > 49000) throw new Error('This deal is too large to save (' + k + '). Shorten the narrative or notes.');
  });
}

/**
 * Superadmin delete (test clean-up): what to remove for the given deals.
 * records = { Deals, Documents, Approvals, Clients } as read from the sheet (each row has _row).
 * Clients are removed only when no remaining deal uses them.
 * Returns { rows: { tab: [rowNumbers desc] }, fileIds: [...], dealIds: [...], clientIds: [...] }.
 */
function planDealDeletion(dealIds, records) {
  var ids = {}; (dealIds || []).forEach(function (d) { ids[d] = true; });
  var deals = (records.Deals || []).filter(function (r) { return ids[r.deal_id]; });
  var docs = (records.Documents || []).filter(function (r) { return ids[r.deal_id]; });
  var appr = (records.Approvals || []).filter(function (r) { return ids[r.deal_id]; });
  var gone = {}; deals.forEach(function (r) { if (r.client_id) gone[r.client_id] = true; });
  var stillUsed = {};
  (records.Deals || []).forEach(function (r) { if (!ids[r.deal_id] && r.client_id) stillUsed[r.client_id] = true; });
  var clients = (records.Clients || []).filter(function (c) { return gone[c.client_id] && !stillUsed[c.client_id]; });
  var desc = function (list) { return list.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; }); };
  var files = [];
  docs.forEach(function (d) { [d.doc_file_id, d.pdf_file_id].forEach(function (f) { if (f && files.indexOf(String(f)) === -1) files.push(String(f)); }); });
  return {
    dealIds: deals.map(function (r) { return r.deal_id; }),
    clientIds: clients.map(function (c) { return c.client_id; }),
    fileIds: files,
    rows: { Deals: desc(deals), Documents: desc(docs), Approvals: desc(appr), Clients: desc(clients) }
  };
}
