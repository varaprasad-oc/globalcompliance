/**
 * Sprint 10: operations – daily backup, failure alerts, go-live check.
 */

/** Copy the Master Sheet to _Archive/Backups (keeps the last 30). Runs daily via installTriggers(). */
function backupMasterSheet() {
  try {
    var src = DriveApp.getFileById(getProp_('MASTER_SHEET_ID'));
    var folder = getOrCreateFolder_(DriveApp.getFolderById(getProp_('FOLDER_ARCHIVE')), 'Backups');
    src.makeCopy('Master DB backup ' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm'), folder);
    var files = [], it = folder.getFiles();
    while (it.hasNext()) files.push(it.next());
    files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
    files.slice(30).forEach(function (f) { f.setTrashed(true); });
    console.log('Backup done; kept ' + Math.min(files.length, 30));
  } catch (e) {
    notifyFailure_('Daily Master Sheet backup', e);
    throw e;
  }
}

/** Install the daily backup (02:00 Dubai). Safe to run more than once. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'backupMasterSheet') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('backupMasterSheet').timeBased().everyDays(1).atHour(2).inTimezone('Asia/Dubai').create();
  setProp_('BACKUP_TRIGGER', new Date().toISOString());
  console.log('Daily backup trigger installed');
}

/** Email superadmins (and alert_email, if set) when something important fails. Never throws. */
function notifyFailure_(context, err) {
  try {
    var m = getMaster();
    var to = (m.Users || []).filter(function (u) { return u.role === CONFIG.ROLES.SUPERADMIN && isTrue(u.active); }).map(function (u) { return u.email; });
    var extra = ((m.CommercialTerms || []).filter(function (r) { return r.key === 'alert_email'; })[0] || {}).value;
    if (extra) to.push(extra);
    if (!to.length) return;
    MailApp.sendEmail({ to: to.join(','), name: CONFIG.APP_NAME, subject: '[Alert] ' + CONFIG.APP_NAME + ': ' + context + ' failed',
      body: context + ' failed at ' + new Date().toISOString() + '\n\nError: ' + (err && err.message ? err.message : err) +
        '\n\nUser: ' + Session.getActiveUser().getEmail() + '\nRemaining email quota today: ' + MailApp.getRemainingDailyQuota() });
  } catch (e) { console.error('alert failed', e); }
}

/** Editor + Admin check before go-live. */
function goLiveCheck() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var findings = goLiveFindings(getMaster(true), props);
  // live checks: templates and logo can be opened
  (getMaster().Templates || []).filter(function (t) { return isTrue(t.active); }).forEach(function (t) {
    try { DriveApp.getFileById(t.file_id).getName(); } catch (e) { findings.push({ level: 'BLOCKER', item: 'Template ' + t.doc_type + ' ' + t.language, detail: 'file cannot be opened' }); }
  });
  findings.push({ level: MailApp.getRemainingDailyQuota() > 50 ? 'OK' : 'WARN', item: 'Email quota', detail: MailApp.getRemainingDailyQuota() + ' left today' });
  var summary = { blockers: findings.filter(function (f) { return f.level === 'BLOCKER'; }).length, warnings: findings.filter(function (f) { return f.level === 'WARN'; }).length };
  console.log(JSON.stringify({ summary: summary, findings: findings }, null, 2));
  return { summary: summary, findings: findings };
}

function apiGoLiveCheck() {
  requireUser_([CONFIG.ROLES.SUPERADMIN]);
  return goLiveCheck();
}
