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
  var row = headers.map(function (h) { return sheetSafe(obj[h] === undefined ? '' : obj[h]); });
  if (rowNumber) sh.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  else sh.appendRow(row);
}

function newId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

/** Short client id C-0001 (falls back to a timestamp id if Numbering has no CLIENT row). Caller holds the script lock. */
function newClientId_() {
  try { return nextDocNo('CLIENT', true); } catch (e) { return newId_('C'); }
}

/** Server-owned: the client's signed MSA (Clients tab) on the deal, so the contract stage knows Agreement vs Order Form only. */
function attachClientMsa_(deal) {
  delete deal.msa;
  var name = String(((deal.client || {}).legalName) || '').toLowerCase();
  var c = readRecords_('Clients').filter(function (r) {
    return (deal.clientId && r.client_id === deal.clientId) || (name && String(r.legal_name).toLowerCase() === name);
  })[0];
  if (c && c.msa_no) {
    deal.msa = { no: String(c.msa_no), dpaNo: String(c.dpa_no || ''), dealId: String(c.msa_deal_id || ''),
      date: c.msa_date instanceof Date ? c.msa_date.toISOString().slice(0, 10) : String(c.msa_date || '') };
  }
  return deal;
}

/** When a deal that produced an MSA is Won, that MSA becomes the client's: later deals get an Order Form only. */
function recordClientMsa_(deal) {
  if (contractMode(deal) !== 'NEW_MSA' || !(deal.docNos || {}).MSA) return;
  var name = String(((deal.client || {}).legalName) || '').toLowerCase();
  var c = readRecords_('Clients').filter(function (r) {
    return (deal.clientId && r.client_id === deal.clientId) || (name && String(r.legal_name).toLowerCase() === name);
  })[0];
  if (!c) return;
  c.msa_no = deal.docNos.MSA; c.dpa_no = ''; c.msa_deal_id = deal.dealId; c.msa_date = new Date().toISOString().slice(0, 10);
  writeRecord_('Clients', c, c._row);
  audit_('CLIENT_MSA_RECORDED', { client: c.client_id, msa: c.msa_no }, deal.dealId);
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
    client_id: existing ? existing.client_id : newClientId_(),
    legal_name: c.legalName, short_name: c.shortName || '', country: c.country || '', address: c.address || '',
    reg_type: c.regType || '', reg_no: c.regNo || '', website: c.website || '', brands: c.brands || '', pos: c.pos || '',
    ecom_platform: c.ecomPlatform || '', business_contact: JSON.stringify(c.businessContact || {}),
    billing_contact: JSON.stringify(c.billingContact || {}),
    owner_email: existing ? existing.owner_email : userEmail, created_at: existing ? existing.created_at : new Date(),
    msa_no: existing ? existing.msa_no || '' : '', dpa_no: existing ? existing.dpa_no || '' : '',
    msa_deal_id: existing ? existing.msa_deal_id || '' : '', msa_date: existing ? existing.msa_date || '' : ''
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
    languages: availableLanguages(m),
    aiEnabled: !!getProp_('GCP_PROJECT_ID'),
    staleDays: staleDaysSetting_(),
    partners: (m.Partners || []).filter(function (p) { return isTrue(p.active); }).map(function (p) { return { id: p.partner_id, name: p.name, type: p.type, country: p.country }; }),
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
  var user = requireUser_();
  var stored = deal.dealId ? findDeal_(deal.dealId) : null;
  var snap = stored && canAccessDeal(user, stored.created_by, getMaster().Users) && !deal.refreshPrices ? JSON.parse(stored.input_json).pricingSnapshot : null;
  var m = withSnapshot(getMaster(), snap);
  applyCountryDefaults(m, deal);
  attachClientMsa_(deal);
  return { deal: deal, evaluation: evaluateDeal(m, deal) };
}

/** Save (create or update) a draft. Returns the saved deal and its evaluation. */
function apiSaveDeal(deal) {
  var user = requireUser_();
  var m = getMaster();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var existing = deal.dealId ? findDeal_(deal.dealId) : null;
    if (deal.dealId && !existing) throw new Error('Deal not found: ' + deal.dealId);
    if (existing && !canAccessDeal(user, existing.created_by, m.Users)) throw new Error('You do not have access to this deal.');
    deal = protectDealFields(deal, existing ? JSON.parse(existing.input_json) : null, existing ? existing.status : null, pricingSnapshot(m));
    applyCountryDefaults(m, deal);
    if (!deal.dealId) { try { deal.dealId = nextDocNo('DEAL', true); } catch (e) { deal.dealId = newId_('D'); } }  // short id D-yyyymm-0001 (falls back if Numbering has no DEAL row)
    deal.clientId = upsertClient_(deal, user.email) || deal.clientId || '';
    attachClientMsa_(deal);
    var ev = evaluateDeal(withSnapshot(m, deal.pricingSnapshot), deal);
    var rec = dealRecord(deal, ev, user.email, new Date().toISOString(), existing);
    assertCellSizes(rec);
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
  var deal = attachClientMsa_(JSON.parse(rec.input_json));
  deal.status = rec.status;
  audit_('DEAL_VIEWED', {}, dealId);
  return { deal: deal, evaluation: evaluateDeal(withSnapshot(getMaster(), deal.pricingSnapshot), deal), summary: dealSummary(rec) };
}

function apiCloneDeal(dealId) {
  var src = apiGetDeal(dealId).deal;
  var copy = cloneDeal(src, null);
  copy.dealId = null;
  var res = apiSaveDeal(copy);
  audit_('DEAL_CLONED', { from: dealId }, res.deal.dealId);
  return res;
}

/** Stage 1 → 2: proposal accepted, prepare Quotation & Order Form + MSA (no new version, same document numbers). */
function apiConvertToContract(dealId) {
  var user = requireUser_();
  var m = getMaster();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rec = findDeal_(dealId);
    if (!rec || !canAccessDeal(user, rec.created_by, m.Users)) throw new Error('Deal not found or no access.');
    var stored = JSON.parse(rec.input_json);
    if (!canConvertToContract(stored, rec.status)) throw new Error('Generate the proposal first (status must be "Proposal generated" or "Sent").');
    var deal = attachClientMsa_(convertToContract(stored, evaluateDeal(withSnapshot(m, stored.pricingSnapshot), stored).quote));
    var ev = evaluateDeal(withSnapshot(m, deal.pricingSnapshot), deal);
    var newRec = dealRecord(deal, ev, user.email, new Date().toISOString(), rec);
    newRec.status = deal.status;
    writeRecord_('Deals', newRec, rec._row);
    audit_('CONVERTED_TO_CONTRACT', {}, dealId);
    return { deal: deal, evaluation: ev, summary: dealSummary(newRec) };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Superadmin only: permanently remove deals (test clean-up) – deal rows, their documents (Google Docs + PDFs moved to
 * Drive trash, recoverable for 30 days), approvals, the client record if no other deal uses it, and client folders
 * left empty. Document numbers are not reused. Audit log entries are kept.
 */
function apiDeleteDeals(dealIds, confirmText) {
  var user = requireUser_([CONFIG.ROLES.SUPERADMIN]);
  if (confirmText !== 'DELETE') throw new Error('Type DELETE to confirm.');
  if (!dealIds || !dealIds.length) throw new Error('Select at least one deal.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var records = {};
    ['Deals', 'Documents', 'Approvals', 'Clients'].forEach(function (t) { records[t] = readRecords_(t); });
    var plan = planDealDeletion(dealIds, records);
    var protectedIds = {};
    ['ROOT_FOLDER_ID', 'FOLDER_PROPOSALS', 'FOLDER_ORDER_FORMS', 'FOLDER_LEGAL', 'FOLDER_TEMPLATES', 'FOLDER_ARCHIVE'].forEach(function (k) { var v = getProp_(k); if (v) protectedIds[v] = true; });
    var folders = {}, trashed = 0, failed = [];
    plan.fileIds.forEach(function (id) {
      try {
        var f = DriveApp.getFileById(id);
        var ps = f.getParents();
        while (ps.hasNext()) { var p = ps.next(); if (!protectedIds[p.getId()]) folders[p.getId()] = p; }
        f.setTrashed(true); trashed++;
      } catch (e) { failed.push(id); }
    });
    var foldersRemoved = 0;
    Object.keys(folders).forEach(function (id) {
      try {
        var p = folders[id];
        if (!p.searchFiles('trashed = false').hasNext() && !p.searchFolders('trashed = false').hasNext()) { p.setTrashed(true); foldersRemoved++; }
      } catch (e) { console.warn('folder clean-up ' + id + ': ' + e); }
    });
    var ss = getMasterSpreadsheet_();
    Object.keys(plan.rows).forEach(function (tab) {
      var sh = ss.getSheetByName(tab);
      plan.rows[tab].forEach(function (r) {  // bottom-up, so row numbers stay valid
        if (sh.getMaxRows() - sh.getFrozenRows() <= 1) sh.getRange(r, 1, 1, sh.getLastColumn()).clearContent();  // Sheets can't delete the last unfrozen row
        else sh.deleteRow(r);
      });
    });
    audit_('DEALS_DELETED', { deals: plan.dealIds, clients: plan.clientIds, files: trashed, folders: foldersRemoved, failedFiles: failed, by: user.email }, plan.dealIds.join(','));
    return { deals: plan.dealIds.length, clients: plan.clientIds.length, files: trashed, folders: foldersRemoved, failedFiles: failed.length };
  } finally {
    lock.releaseLock();
  }
}

/** Won deal → new top-up deal (Order Form only, contracted prices, own term). Owner, manager or Superadmin. */
function apiCreateTopUp(parentDealId) {
  var user = requireUser_();
  var m = getMaster();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rec = findDeal_(parentDealId);
    if (!rec || !canAccessDeal(user, rec.created_by, m.Users)) throw new Error('Deal not found or no access.');
    var parent = attachClientMsa_(JSON.parse(rec.input_json));
    if (!canTopUp(parent, rec.status)) throw new Error('A top-up can be created only from a Won deal (not from another top-up).');
    var deal = makeTopUp(parent, evaluateDeal(withSnapshot(m, parent.pricingSnapshot), parent).quote);
    try { deal.dealId = nextDocNo('DEAL', true); } catch (e) { deal.dealId = newId_('D'); }
    attachClientMsa_(deal);
    var ev = evaluateDeal(withSnapshot(m, deal.pricingSnapshot), deal);
    var newRec = dealRecord(deal, ev, user.email, new Date().toISOString(), null);
    newRec.status = deal.status;
    writeRecord_('Deals', newRec, null);
    audit_('TOPUP_CREATED', { parent: parentDealId }, deal.dealId);
    return { deal: deal, evaluation: ev, summary: dealSummary(newRec) };
  } finally {
    lock.releaseLock();
  }
}
