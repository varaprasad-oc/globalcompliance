/**
 * Sprint 9: admin rules, price snapshots and language availability. Pure JS (Apps Script + Node tests).
 */

/** Tabs the Superadmin may edit in the app, with column types and the key column. */
var ADMIN_TABS = {
  Users: { key: 'email', bool: ['active'], numeric: [] },
  Entities: { key: 'entity_id', bool: ['active'], numeric: [] },
  Countries: { key: 'country', bool: [], numeric: [] },
  Markets: { key: 'market', bool: [], numeric: ['discount'] },
  Currencies: { key: 'code', bool: [], numeric: ['fx_rate', 'rounding_step'] },
  Slabs: { key: 'label', bool: [], numeric: ['min_sites', 'max_sites', 'discount'] },
  Packages: { key: 'package', bool: ['active'], numeric: ['price_per_site_month', 'setup_fee', 'ecom_install_fee', 'overage_per_1000_receipts', 'receipts_included_per_site', 'display_order'] },
  PriceItems: { key: 'item_id', bool: ['active'], numeric: ['usd_price', 'display_order'] },
  CommsTiers: { key: 'tier_id', bool: ['active'], numeric: ['messages', 'list_usd', 'floor_usd', 'display_order'] },
  Features: { key: 'feature', bool: [], numeric: ['display_order'] },
  CommercialTerms: { key: 'key', bool: [], numeric: [] },
  SubProcessors: { key: 'name', bool: ['active'], numeric: ['display_order'] },
  Templates: { key: 'file_id', bool: ['active'], numeric: [] },
  AIPrompts: { key: 'key', bool: [], numeric: ['temperature'] }
};

/** Pricing tabs frozen into each deal so old deals keep their prices after a price-list change. */
var PRICING_TABS = ['Markets', 'Currencies', 'Slabs', 'Packages', 'PriceItems', 'CommsTiers', 'CommercialTerms'];

/** Validate and type a row before saving. Returns {ok, row, errors}. */
function coerceAdminRow(tab, headers, obj) {
  var cfg = ADMIN_TABS[tab];
  if (!cfg) return { ok: false, errors: ['This tab cannot be edited in the app: ' + tab] };
  var errors = [], row = {};
  headers.forEach(function (h) {
    var v = obj[h];
    if (cfg.bool.indexOf(h) !== -1) v = v === true || String(v).toUpperCase() === 'TRUE';
    else if (cfg.numeric.indexOf(h) !== -1) {
      if (v === '' || v === null || v === undefined) v = '';
      else if (isNaN(Number(v))) errors.push(h + ' must be a number');
      else v = Number(v);
    } else v = v === undefined || v === null ? '' : String(v).trim();
    row[h] = v;
  });
  if (!row[cfg.key] && row[cfg.key] !== 0) errors.push(cfg.key + ' is required');
  if (tab === 'Users') {
    if (!/^[^@\s]+@optculture\.com$/i.test(row.email)) errors.push('User email must end with @optculture.com');
    if (['Rep', 'Manager', 'Superadmin'].indexOf(row.role) === -1) errors.push('Role must be Rep, Manager or Superadmin');
    if (row.manager_email && !/@optculture\.com$/i.test(row.manager_email)) errors.push('Manager email must end with @optculture.com');
    row.email = String(row.email).toLowerCase();
  }
  ['discount'].forEach(function (k) { if (k in row && row[k] !== '' && (row[k] < 0 || row[k] >= 1)) errors.push('discount must be between 0 and 0.99 (e.g. 0.25 for 25%)'); });
  if (tab === 'Currencies' && !(row.fx_rate > 0)) errors.push('fx_rate must be greater than 0');
  if (tab === 'CommsTiers' && row.floor_usd !== '' && row.list_usd !== '' && row.floor_usd > row.list_usd) errors.push('floor_usd cannot be above list_usd');
  if (tab === 'Features') ['Engagement', 'Loyalty', 'Advanced'].forEach(function (p) { if (p in row && ['Included', 'Not included', 'Add-on'].indexOf(row[p]) === -1) errors.push(p + ' must be Included, Not included or Add-on'); });
  if (tab === 'Templates' && ['PROPOSAL', 'ORDER_FORM', 'TOS', 'DPA'].indexOf(row.doc_type) === -1) errors.push('doc_type must be PROPOSAL, ORDER_FORM, TOS or DPA');
  if (tab === 'Templates' && ['EN', 'AR', 'BI'].indexOf(row.language) === -1) errors.push('language must be EN, AR or BI');
  return { ok: errors.length === 0, row: row, errors: errors };
}

/** Copy of the pricing tabs (stored with a deal at first save). */
function pricingSnapshot(master) {
  var s = { takenAt: new Date().toISOString() };
  PRICING_TABS.forEach(function (t) { s[t] = JSON.parse(JSON.stringify(master[t] || [])); });
  return s;
}

/** Master with the deal's frozen pricing tabs (non-pricing tabs stay current). */
function withSnapshot(master, snap) {
  if (!snap) return master;
  var m = {};
  Object.keys(master).forEach(function (k) { m[k] = master[k]; });
  PRICING_TABS.forEach(function (t) { if (snap[t]) m[t] = snap[t]; });
  return m;
}

/** Which languages have an active template per document type: {PROPOSAL: ['EN'], ...} */
function availableLanguages(master) {
  var out = { PROPOSAL: [], ORDER_FORM: [], TOS: [], DPA: [] };
  (master.Templates || []).forEach(function (t) {
    if (isTrue(t.active) && t.file_id && out[t.doc_type] && out[t.doc_type].indexOf(t.language) === -1) out[t.doc_type].push(t.language);
  });
  return out;
}

/** Arabic long date, e.g. "1 نوفمبر 2026": Arabic month names, Western digits (common in GCC contracts). */
function formatLongDateAr(d) {
  d = new Date(d);
  var months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

/**
 * Go-live readiness from master data + script properties. Returns [{level: 'BLOCKER'|'WARN'|'OK', item, detail}].
 */
function goLiveFindings(master, props) {
  var out = [];
  function add(level, item, detail) { out.push({ level: level, item: item, detail: detail || '' }); }
  ['MASTER_SHEET_ID', 'FOLDER_PROPOSALS', 'FOLDER_ORDER_FORMS', 'FOLDER_LEGAL', 'FOLDER_TEMPLATES', 'FOLDER_ARCHIVE'].forEach(function (k) {
    add(props[k] ? 'OK' : 'BLOCKER', 'Script property ' + k, props[k] ? '' : 'missing – run setupScriptProperties()');
  });
  add(props.GCP_PROJECT_ID ? 'OK' : 'WARN', 'Gemini (Vertex AI)', props.GCP_PROJECT_ID ? 'project ' + props.GCP_PROJECT_ID : 'not connected – reps must type the narrative');
  var langs = availableLanguages(master);
  ['PROPOSAL', 'ORDER_FORM', 'TOS', 'DPA'].forEach(function (t) { add(langs[t].indexOf('EN') !== -1 ? 'OK' : 'BLOCKER', 'English template ' + t, langs[t].indexOf('EN') !== -1 ? '' : 'no active EN template'); });
  (master.Templates || []).forEach(function (t) {
    if (isTrue(t.active) && /draft/i.test(String(t.version) + ' ' + String(t.notes))) add('WARN', 'Template ' + t.doc_type + ' ' + t.language + ' v' + t.version, 'still marked draft / pending legal review');
  });
  var users = master.Users || [];
  add(users.some(function (u) { return u.role === 'Superadmin' && isTrue(u.active); }) ? 'OK' : 'BLOCKER', 'Superadmin user', '');
  var reps = users.filter(function (u) { return u.role === 'Rep' && isTrue(u.active); });
  add(reps.length ? 'OK' : 'WARN', 'Sales reps added', reps.length + ' active rep(s)');
  users.forEach(function (u) {
    if (u.role === 'Rep' && !u.manager_email) add('WARN', 'Rep without manager', u.email);
    if (!/@optculture\.com$/i.test(String(u.email))) add('BLOCKER', 'User outside domain', u.email);
  });
  (master.Entities || []).filter(function (e) { return isTrue(e.active); }).forEach(function (e) {
    var gaps = ['signatory_name', 'signatory_title', 'address'].filter(function (k) { return !e[k]; });
    if (e.type === 'Partner' && !e.reg_no) gaps.push('reg_no');
    if (gaps.length) add('WARN', 'Entity ' + e.entity_id + ' incomplete', 'missing ' + gaps.join(', '));
  });
  (master.SubProcessors || []).forEach(function (s) { if (/TBC/i.test(s.name + ' ' + s.location)) add('WARN', 'DPA sub-processor to confirm', s.name); });
  var terms = {};
  (master.CommercialTerms || []).forEach(function (r) { terms[r.key] = r.value; });
  if (!terms.default_hosting_region) add('WARN', 'DPA hosting region', 'CommercialTerms.default_hosting_region is empty');
  if (!terms.optculture_logo_file_id) add('WARN', 'Logo', 'CommercialTerms.optculture_logo_file_id is empty');
  add(props.BACKUP_TRIGGER ? 'OK' : 'WARN', 'Daily backup', props.BACKUP_TRIGGER ? '' : 'run installTriggers()');
  return out;
}
