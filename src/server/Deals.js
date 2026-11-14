/**
 * Sprint 6: deal storage in the Master Sheet (Deals + Clients tabs) and the client-callable deal API.
 * Every API re-checks the signed-in user's role and ownership on the server.
 */

function readRecords_(tab) {
  var sh = getMasterSpreadsheet_().getSheetByName(tab);
  var values = sh.getDataRange().getValues();
  var headers = values.shift();
  return values.map(function (r, i) {
    var o = { _row: i + 2 };
    headers.forEach(function (h, j) { o[h] = r[j]; });
    return o;
  }).filter(function (o) { return o[headers[0]] !== ''; });
}

function writeRecord_(tab, obj, rowNumber) {
  var sh = getMasterSpreadsheet_().getSheetByName(tab);
  var headers = SEED[tab].headers;
  var row = headers.map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
  if (rowNumber) sh.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  else sh.appendRow(row);
}

function newId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function findDeal_(dealId) {
  return readRecords_('Deals').filter(function (r) { return r.deal_id === dealId; })[0] || null;
}

function upsertClient_(deal, userEmail) {
  var c = deal.client || {};
  if (!c.legalName) return '';
  var existing = readRecords_('Clients').filter(function (r) {
    return r.client_id === deal.clientId || String(r.legal_name).toLowerCase() === String(c.legalName).toLowerCase();
  })[0];
  var rec = {
    client_id: existing ? existing.client_id : newId_('C'),
    legal_name: c.legalName, short_name: c.shortName || '', country: c.country || '', address: c.address || '',
    reg_type: c.regType || '', reg_no: c.regNo || '', website: c.website || '', brands: c.brands || '', pos: c.pos || '',
    ecom_platform: c.ecomPlatform || '', business_contact: JSON.stringify(c.businessContact || {}),
    billing_contact: JSON.stringify(c.billingContact || {}),
    owner_email: existing ? existing.owner_email : userEmail, created_at: existing ? existing.created_at : new Date()
  };
  writeRecord_('Clients', rec, existing ? existing._row : null);
  return rec.client_id;
}

// ---------------- API (google.script.run) ----------------

/** Lists for the deal form. */
function apiFormLists() {
  var user = requireUser_();
  var m = getMaster();
  return {
    countries: m.Countries,
    entities: m.Entities.filter(function (e) { return isTrue(e.active); }).map(function (e) { return { id: e.entity_id, name: e.legal_name, type: e.type, country: e.country }; }),
    commsTiers: (m.CommsTiers || []).filter(function (t) { return isTrue(t.active); }).map(function (t) { return { id: t.tier_id, messages: t.messages, label: t.label }; }),
    clients: readRecords_('Clients').filter(function (r) { return canAccessDeal(user, r.owner_email, m.Users); }).map(function (r) {
      return { clientId: r.client_id, legalName: r.legal_name, shortName: r.short_name, country: r.country, address: r.address,
        regType: r.reg_type, regNo: r.reg_no, website: r.website, brands: r.brands, pos: r.pos, ecomPlatform: r.ecom_platform,
        businessContact: safeJson_(r.business_contact), billingContact: safeJson_(r.billing_contact) };
    })
  };
}

function safeJson_(s) { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }

/** Live check while the rep fills the form (no saving). */
function apiEvaluateDeal(deal) {
  requireUser_();
  var m = getMaster();
  applyCountryDefaults(m, deal);
  return { deal: deal, evaluation: evaluateDeal(m, deal) };
}

/** Save (create or update) a draft. Returns the saved deal and its evaluation. */
function apiSaveDeal(deal) {
  var user = requireUser_();
  var m = getMaster();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    applyCountryDefaults(m, deal);
    var existing = deal.dealId ? findDeal_(deal.dealId) : null;
    if (deal.dealId && !existing) throw new Error('Deal not found: ' + deal.dealId);
    if (existing && !canAccessDeal(user, existing.created_by, m.Users)) throw new Error('You do not have access to this deal.');
    if (existing && [DEAL_STATUS.DRAFT, DEAL_STATUS.REJECTED, DEAL_STATUS.APPROVED, DEAL_STATUS.PENDING].indexOf(existing.status) === -1) {
      // Generated / Won / Lost deals are revised as a new version
      deal.version = Number(existing.version || 1) + 1;
      deal.status = DEAL_STATUS.DRAFT;
    }
    if (existing && existing.status === DEAL_STATUS.REJECTED) deal.status = DEAL_STATUS.DRAFT;
    if (!deal.dealId) { deal.dealId = newId_('D'); deal.version = 1; deal.status = DEAL_STATUS.DRAFT; }
    deal.clientId = upsertClient_(deal, user.email) || deal.clientId || '';
    var ev = evaluateDeal(m, deal);
    var rec = dealRecord(deal, ev, user.email, new Date().toISOString(), existing);
    writeRecord_('Deals', rec, existing ? existing._row : null);
    audit_(existing ? 'DEAL_UPDATED' : 'DEAL_CREATED', { version: deal.version, needsApproval: ev.needsApproval }, deal.dealId);
    return { deal: deal, evaluation: ev, summary: dealSummary(rec) };
  } finally {
    lock.releaseLock();
  }
}

function apiListDeals() {
  var user = requireUser_();
  var users = getMaster().Users;
  return readRecords_('Deals')
    .filter(function (r) { return canAccessDeal(user, r.created_by, users); })
    .map(dealSummary)
    .sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
}

function apiGetDeal(dealId) {
  var user = requireUser_();
  var rec = findDeal_(dealId);
  if (!rec || !canAccessDeal(user, rec.created_by, getMaster().Users)) throw new Error('Deal not found or no access.');
  var deal = JSON.parse(rec.input_json);
  deal.status = rec.status;
  audit_('DEAL_VIEWED', {}, dealId);
  return { deal: deal, evaluation: evaluateDeal(getMaster(), deal), summary: dealSummary(rec) };
}

function apiCloneDeal(dealId) {
  var src = apiGetDeal(dealId).deal;
  var copy = cloneDeal(src, null);
  copy.dealId = null;
  var res = apiSaveDeal(copy);
  audit_('DEAL_CLONED', { from: dealId }, res.deal.dealId);
  return res;
}
