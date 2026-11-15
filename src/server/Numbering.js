/**
 * Sprint 4: document numbers OC-P-2026-0001 etc. Uses a script lock so two reps never get the same number.
 * The counter resets each calendar year. Also used for short deal ids (doc_type DEAL → D-2026-0001).
 * A row whose year is "-" never resets and has no year in the number (doc_type CLIENT → C-0001).
 */
function nextDocNo(docType, callerHoldsLock) {
  var lock = LockService.getScriptLock();
  if (!callerHoldsLock) lock.waitLock(30000);
  try {
    var sh = getMasterSpreadsheet_().getSheetByName('Numbering');
    var values = sh.getDataRange().getValues();
    var h = values[0];
    var iType = h.indexOf('doc_type'), iPrefix = h.indexOf('prefix'), iYear = h.indexOf('year'), iLast = h.indexOf('last_no');
    var year = new Date().getFullYear();
    for (var r = 1; r < values.length; r++) {
      if (values[r][iType] !== docType) continue;
      var perpetual = String(values[r][iYear]).trim() === '-';
      var last = perpetual || Number(values[r][iYear]) === year ? Number(values[r][iLast]) : 0;
      var next = last + 1;
      if (!perpetual) sh.getRange(r + 1, iYear + 1).setValue(year);
      sh.getRange(r + 1, iLast + 1).setValue(next);
      SpreadsheetApp.flush();
      return formatDocNo(values[r][iPrefix], perpetual ? null : year, next);
    }
    throw new Error('No numbering row for ' + docType);
  } finally {
    if (!callerHoldsLock) lock.releaseLock();
  }
}

/** Pure formatter (tested in Node): prefix-year-0001, or prefix-0001 when year is null. */
function formatDocNo(prefix, year, n) {
  return prefix + '-' + (year ? year + '-' : '') + ('000' + n).slice(-4);
}
