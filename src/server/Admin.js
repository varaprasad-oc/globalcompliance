/**
 * Sprint 9: Superadmin screens – edit master data in the app (with validation, cache refresh, audit + ChangeLog)
 * and register new template versions (checked for unknown placeholders before activation).
 */

function apiAdminTabs() {
  requireUser_([CONFIG.ROLES.SUPERADMIN]);
  return Object.keys(ADMIN_TABS);
}

function apiAdminGetTab(tab) {
  requireUser_([CONFIG.ROLES.SUPERADMIN]);
  if (!ADMIN_TABS[tab]) throw new Error('Not editable: ' + tab);
  var rows = readRecords_(tab).map(function (r) {
    var o = {};
    Object.keys(r).forEach(function (k) { o[k] = r[k] instanceof Date ? r[k].toISOString() : r[k]; });
    return o;
  });
  return { tab: tab, headers: SEED[tab].headers, key: ADMIN_TABS[tab].key, rows: rows };
}

/** Save one row (rowNumber = sheet row to overwrite, or null to add). */
function apiAdminSaveRow(tab, rowNumber, obj, reason) {
  var user = requireUser_([CONFIG.ROLES.SUPERADMIN]);
  var headers = SEED[tab] && SEED[tab].headers;
  var res = coerceAdminRow(tab, headers || [], obj || {});
  if (!res.ok) throw new Error(res.errors.join('; '));
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var existing = readRecords_(tab);
    var key = ADMIN_TABS[tab].key;
    var clash = existing.filter(function (r) { return String(r[key]) === String(res.row[key]) && r._row !== rowNumber; })[0];
    if (clash) throw new Error(key + ' "' + res.row[key] + '" already exists (row ' + clash._row + ').');
    var before = rowNumber ? existing.filter(function (r) { return r._row === rowNumber; })[0] : null;
    if (rowNumber && !before) throw new Error('Row not found – reload and try again.');
    writeRecord_(tab, res.row, rowNumber || null);
    clearMasterCache_();
    var changed = before ? headers.filter(function (h) { return String(before[h]) !== String(res.row[h]); }) : headers;
    appendRecord_('ChangeLog', { date: new Date(), raised_by: user.email, area: tab, change: (before ? 'Edited ' : 'Added ') + res.row[key] + ': ' +
      changed.map(function (h) { return h + (before ? ' ' + before[h] + ' → ' : ' = ') + res.row[h]; }).join('; ') + (reason ? ' — ' + reason : ''),
      gate_affected: PRICING_TABS.indexOf(tab) !== -1 ? 'G2 pricing' : '', status: 'Applied', sprint: '' });
    audit_('ADMIN_SAVE', { tab: tab, key: res.row[key], changed: changed });
    return { ok: true, changed: changed };
  } finally {
    lock.releaseLock();
  }
}

/** Check a Google Doc as a template for docType: unknown placeholders and unbalanced IF blocks. */
function apiAdminCheckTemplate(fileIdOrUrl, docType) {
  requireUser_([CONFIG.ROLES.SUPERADMIN]);
  var id = String(fileIdOrUrl).replace(/^.*\/d\/([a-zA-Z0-9_-]+).*$/, '$1');
  var doc = DocumentApp.openById(id);
  var text = [doc.getBody().getText(), doc.getHeader() ? doc.getHeader().getText() : '', doc.getFooter() ? doc.getFooter().getText() : ''].join('\n');
  var m = getMaster_();
  var sample = sampleDealForChecks_();
  var data = buildDocData(docType, m, sample, buildQuote(m, sample.commercial), { docNo: 'CHECK', related: { PROPOSAL: 'x', ORDER_FORM: 'x', MSA: 'x' } });
  var unknown = checkTemplateTokens(text, data).filter(function (t) { return ['label', 'amount', 'title', 'text'].indexOf(t) === -1; });
  var opens = (text.match(/\{\{#IF !?\w+\}\}/g) || []).length, closes = (text.match(/\{\{\/IF \w+\}\}/g) || []).length;
  return { fileId: id, title: doc.getName(), unknown: unknown, ifBalanced: opens === closes, ok: unknown.length === 0 && opens === closes };
}

/** Register a new template version: checks it, deactivates the previous active one for the same type + language. */
function apiAdminRegisterTemplate(fileIdOrUrl, docType, language, version, notes) {
  var user = requireUser_([CONFIG.ROLES.SUPERADMIN]);
  var chk = apiAdminCheckTemplate(fileIdOrUrl, docType);
  if (!chk.ok) throw new Error('Template has problems: ' + (chk.unknown.length ? 'unknown placeholders ' + chk.unknown.join(', ') : '') + (chk.ifBalanced ? '' : ' unbalanced {{#IF}} blocks'));
  readRecords_('Templates').forEach(function (t) {
    if (t.doc_type === docType && t.language === language && isTrue(t.active)) { t.active = false; writeRecord_('Templates', t, t._row); }
  });
  apiAdminSaveRow('Templates', null, { doc_type: docType, language: language, file_id: chk.fileId, version: "'" + String(version || ''), active: true, notes: notes || ('Registered by ' + user.email) },
    'New ' + language + ' template for ' + docType);
  try { DriveApp.getFileById(chk.fileId).moveTo(DriveApp.getFolderById(getProp_('FOLDER_TEMPLATES'))); } catch (e) { /* already there or no access */ }
  return chk;
}

function sampleDealForChecks_() {
  return {
    dealId: 'CHECK', version: 1,
    client: { legalName: 'Sample Client LLC', shortName: 'Sample', country: 'United Arab Emirates', address: 'Dubai', regNo: '1', brands: 'A, B', pos: 'POS', ecomPlatform: 'Shop',
      businessContact: { name: 'a', email: 'a@example.com' }, billingContact: { name: 'b', email: 'b@example.com' }, signatoryName: 'S', signatoryTitle: 'T' },
    entityId: 'OC-AE',
    commercial: { market: 'High Income', currency: 'AED', stores: 12, ecomSites: 1, packages: ['Loyalty', 'Advanced'], specialPrices: { Loyalty: 300 }, addOns: ['GIFT_CARDS'],
      oneTimeItems: [{ id: 'MIGRATION_100K', qty: 1 }], orderPackage: 'Loyalty', termMonths: 12, msaRef: 'MSA-1', poNumber: 'PO-1' },
    proposal: { multiBrand: true, showConsulting: true },
    narrative: { executiveSummary: 'x', journeys: ['A: b'], multiBrandIntro: 'y' },
    dpa: { hostingRegion: 'x' }
  };
}
