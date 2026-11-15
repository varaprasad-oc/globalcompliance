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

/** Deal moved to stage 2: contract documents selected, Order Form package defaulted. */
function convertToContract(deal) {
  var d = JSON.parse(JSON.stringify(deal));
  d.stage = 'CONTRACT';
  d.status = DEAL_STATUS.CONTRACT_DRAFT;
  d.docs = { ORDER_FORM: true, TOS: true, DPA: true };
  d.commercial = d.commercial || {};
  if (!d.commercial.orderPackage || (d.commercial.packages || []).indexOf(d.commercial.orderPackage) === -1) d.commercial.orderPackage = (d.commercial.packages || [])[0];
  return d;
}

/** Fill market / currency / contracting entity from the Countries tab when the rep has not chosen them. */
function applyCountryDefaults(master, deal) {
  deal.commercial = deal.commercial || {};
  var country = (master.Countries || []).filter(function (r) { return r.country === (deal.client || {}).country; })[0];
  if (!country) return deal;
  if (!deal.commercial.market) deal.commercial.market = country.default_market;
  if (!deal.commercial.currency) deal.commercial.currency = country.default_currency;
  if (!deal.entityId && country.entity_id) deal.entityId = country.entity_id;
  return deal;
}

function selectedDocs(deal) {
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
    approvalReasons: quote.ok ? quote.approvalReasons : []
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
  var value = op ? op.firstYearTotal + (q.optionalOneTimeTotal || 0) : 0;
  return {
    dealId: rec.deal_id, clientName: rec.client_name, country: rec.country, packages: rec.packages,
    currency: rec.currency, status: rec.status, needsApproval: isTrue(rec.needs_approval), approvalStatus: rec.approval_status,
    createdBy: rec.created_by, updatedAt: rec.updated_at instanceof Date ? rec.updated_at.toISOString() : String(rec.updated_at || ''),
    version: Number(rec.version || 1),
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

/** Dashboard numbers from deal summaries (amounts in USD for comparability). */
function dashboardStats(summaries, users) {
  var nameOf = {};
  (users || []).forEach(function (u) { nameOf[String(u.email).toLowerCase()] = u.name; });
  var s = { deals: summaries.length, pipelineUsd: 0, wonUsd: 0, pendingApprovals: 0, avgDiscountPct: 0, byStatus: {}, byRep: {}, byCountry: {}, byPackage: {} };
  var discSum = 0, discN = 0;
  function add(map, key, sm) {
    key = key || '—';
    map[key] = map[key] || { count: 0, valueUsd: 0 };
    map[key].count++; map[key].valueUsd += sm.valueUsd || 0;
  }
  summaries.forEach(function (sm) {
    var open = ['Lost'].indexOf(sm.status) === -1;
    if (open && sm.status !== 'Won') s.pipelineUsd += sm.valueUsd || 0;
    if (sm.status === 'Won') s.wonUsd += sm.valueUsd || 0;
    if (sm.approvalStatus === 'Pending') s.pendingApprovals++;
    if (sm.orderPackage) { discSum += sm.discountPct || 0; discN++; }
    add(s.byStatus, sm.status, sm);
    add(s.byRep, nameOf[String(sm.createdBy).toLowerCase()] || sm.createdBy, sm);
    add(s.byCountry, sm.country, sm);
    add(s.byPackage, sm.orderPackage, sm);
  });
  s.avgDiscountPct = discN ? Math.round(discSum / discN * 1000) / 1000 : 0;
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
  c.stage = 'PROPOSAL'; c.docs = { PROPOSAL: true };
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
    delete d.docNos; d.pricingSnapshot = freshSnapshot; delete d.clientId;
    d.stage = 'PROPOSAL'; d.docs = { PROPOSAL: true };
    return d;
  }
  d.dealId = stored.dealId;
  d.docNos = stored.docNos;
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
