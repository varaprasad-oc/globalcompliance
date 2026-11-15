/** Pure helpers shared by server code and Node tests. */

/** Convert header + rows arrays into an array of objects. */
function rowsToObjects(headers, rows) {
  return (rows || []).map(function (r) {
    var o = {};
    headers.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

/** Build the in-memory master object { TabName: [objects] } from SEED (used in tests and as a fallback). */
function masterFromSeed(seed) {
  var m = {};
  Object.keys(seed).forEach(function (tab) {
    if (seed[tab].kind === 'master') m[tab] = rowsToObjects(seed[tab].headers, seed[tab].rows);
  });
  return m;
}

/** Parse truthy sheet values ("TRUE", true, 1). */
function isTrue(v) {
  return v === true || v === 1 || String(v).toUpperCase() === 'TRUE';
}

/** Format money as "USD 1,800" (no decimals unless needed). */
function formatMoney(currency, value) {
  if (value === null || value === undefined || value === '') return '';
  var n = Number(value);
  var hasDecimals = Math.round(n) !== n;
  var s = n.toLocaleString('en-US', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 });
  return currency + ' ' + s;
}

/** Format a fraction as a percentage: 0.175 -> "17.5%". */
function formatPct(f) {
  return (Math.round(Number(f) * 10000) / 100) + '%';
}

/** Format date as "1st November 2026". */
function formatLongDate(d) {
  d = new Date(d);
  var day = d.getDate();
  var sfx = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd' : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return day + sfx + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

/** Security: text starting with = + - @ would be run as a spreadsheet formula. Store it as plain text instead. */
function sheetSafe(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}
