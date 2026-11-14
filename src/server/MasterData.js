/** Reads the Master Sheet into { TabName: [objects] } with a short cache. */

function getMasterSpreadsheet_() {
  var id = getProp_('MASTER_SHEET_ID');
  if (!id) throw new Error('Master Sheet not set up yet. Run setupMasterSheet() first.');
  return SpreadsheetApp.openById(id);
}

function readTable_(ss, tab) {
  var sh = ss.getSheetByName(tab);
  if (!sh || sh.getLastRow() < 1) return [];
  var values = sh.getDataRange().getValues();
  var headers = values.shift();
  return values
    .filter(function (r) { return r.join('') !== ''; })
    .map(function (r) { var o = {}; headers.forEach(function (h, i) { o[h] = r[i]; }); return o; });
}

/** All master tabs (cached). Pass true to bypass the cache, e.g. after an admin edit. */
function getMaster(noCache) {
  var cache = CacheService.getScriptCache();
  if (!noCache) {
    var hit = cache.get('MASTER');
    if (hit) return JSON.parse(hit);
  }
  var ss = getMasterSpreadsheet_();
  var m = {};
  Object.keys(SEED).forEach(function (tab) {
    if (SEED[tab].kind === 'master') m[tab] = readTable_(ss, tab);
  });
  try { cache.put('MASTER', JSON.stringify(m), CONFIG.CACHE_SECONDS); } catch (e) { /* >100KB: skip caching */ }
  return m;
}

function clearMasterCache() {
  CacheService.getScriptCache().remove('MASTER');
}

/** Append a record row by header names. */
function appendRecord_(tab, obj) {
  var sh = getMasterSpreadsheet_().getSheetByName(tab);
  var headers = SEED[tab].headers;
  sh.appendRow(headers.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
}

function audit_(action, details, dealId, docNo) {
  try {
    appendRecord_('AuditLog', {
      timestamp: new Date(), user_email: Session.getActiveUser().getEmail(),
      action: action, deal_id: dealId || '', doc_no: docNo || '',
      details: typeof details === 'string' ? details : JSON.stringify(details || {})
    });
  } catch (e) { console.error('audit failed', e); }
}
