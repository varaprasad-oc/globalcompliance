/**
 * Sprint 4: document numbers OC-P-2026-0001 etc. Uses a script lock so two reps never get the same number.
 * The counter resets each calendar year.
 */
function nextDocNo(docType) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sh = getMasterSpreadsheet_().getSheetByName('Numbering');
    var values = sh.getDataRange().getValues();
    var h = values[0];
    var iType = h.indexOf('doc_type'), iPrefix = h.indexOf('prefix'), iYear = h.indexOf('year'), iLast = h.indexOf('last_no');
    var year = new Date().getFullYear();
    for (var r = 1; r < values.length; r++) {
      if (values[r][iType] !== docType) continue;
      var last = Number(values[r][iYear]) === year ? Number(values[r][iLast]) : 0;
      var next = last + 1;
      sh.getRange(r + 1, iYear + 1).setValue(year);
      sh.getRange(r + 1, iLast + 1).setValue(next);
      SpreadsheetApp.flush();
      return values[r][iPrefix] + '-' + year + '-' + ('000' + next).slice(-4);
    }
    throw new Error('No numbering row for ' + docType);
  } finally {
    lock.releaseLock();
  }
}
