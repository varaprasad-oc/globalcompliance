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

var DEAL_STATUS = { DRAFT: 'Draft', PENDING: 'Pending approval', APPROVED: 'Approved', REJECTED: 'Rejected', GENERATED: 'Generated', WON: 'Won', LOST: 'Lost' };

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
  return DOC_TYPES.filter(function (t) { return d[t]; });
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
    approval_status: evaluation.needsApproval ? (existing && existing.approval_status === 'Approved' && existing.quote_json === JSON.stringify(evaluation.quote) ? 'Approved' : 'Required') : 'Not required',
    ai_draft_json: existing ? existing.ai_draft_json : '',
    final_text_json: JSON.stringify(deal.narrative || {}),
    version: Number(deal.version || 1)
  };
}

/** Summary row for deal lists (no heavy JSON). */
function dealSummary(rec) {
  return {
    dealId: rec.deal_id, clientName: rec.client_name, country: rec.country, packages: rec.packages,
    currency: rec.currency, status: rec.status, needsApproval: isTrue(rec.needs_approval), approvalStatus: rec.approval_status,
    createdBy: rec.created_by, updatedAt: rec.updated_at instanceof Date ? rec.updated_at.toISOString() : String(rec.updated_at || ''),
    version: Number(rec.version || 1)
  };
}

/** Copy of a deal as a new draft (new id, version 1, status Draft). */
function cloneDeal(deal, newId) {
  var c = JSON.parse(JSON.stringify(deal));
  c.dealId = newId;
  c.version = 1;
  c.status = DEAL_STATUS.DRAFT;
  c.client = c.client || {};
  return c;
}
