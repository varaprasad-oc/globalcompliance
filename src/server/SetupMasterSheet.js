/**
 * Sprint 1.1 + 2: one-time setup. Run from the Apps Script editor (as docs-admin@ or Varaprasad) after
 * setting the Script Property ROOT_FOLDER_ID to the folder / Shared Drive Amith shares.
 *
 *   setupFolders()      – creates the folder structure inside ROOT_FOLDER_ID (idempotent)
 *   setupMasterSheet()  – creates the Master DB spreadsheet with all tabs, headers and seed data (idempotent:
 *                         existing tabs that already contain data are NOT overwritten)
 */

function setupAll() {
  setupFolders();
  setupMasterSheet();
}

function getRootFolder_() {
  var id = getProp_('ROOT_FOLDER_ID');
  if (!id) throw new Error('Set Script Property ROOT_FOLDER_ID first.');
  return DriveApp.getFolderById(id);
}

function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function setupFolders() {
  var root = getRootFolder_();
  var ids = {};
  Object.keys(CONFIG.FOLDERS).forEach(function (k) {
    ids[k] = getOrCreateFolder_(root, CONFIG.FOLDERS[k]).getId();
    setProp_('FOLDER_' + k, ids[k]);
  });
  console.log('Folders ready: ' + JSON.stringify(ids));
  return ids;
}

function setupMasterSheet() {
  var ss;
  var id = getProp_('MASTER_SHEET_ID');
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create(CONFIG.MASTER_SHEET_NAME);
    var folderId = getProp_('FOLDER_MASTER_DB');
    if (folderId) DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(folderId));
    setProp_('MASTER_SHEET_ID', ss.getId());
  }

  Object.keys(SEED).forEach(function (tab) {
    var def = SEED[tab];
    var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
    if (sh.getLastRow() > 1) { console.log(tab + ': has data, skipped'); return; }
    sh.clear();
    sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers])
      .setFontWeight('bold').setBackground(def.kind === 'master' ? '#1f3b57' : '#5b6b7a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    if (def.rows && def.rows.length) {
      sh.getRange(2, 1, def.rows.length, def.headers.length).setValues(def.rows.map(function (r) { return r.map(asSheetValue_); }));
    }
    sh.autoResizeColumns(1, def.headers.length);
    sh.setTabColor(def.kind === 'master' ? '#1f3b57' : '#9aa5b1');
  });

  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  writeSchemaReadme_(ss);
  protectMasterTabs_(ss);
  clearMasterCache();
  console.log('Master Sheet ready: ' + ss.getUrl());
  return ss.getUrl();
}

/** Keep phone numbers ("+91 …") and percentages ("99.9%") as text — Sheets would otherwise parse them as formulas/numbers. */
function asSheetValue_(v) {
  return (typeof v === 'string' && (/^[+=\-]/.test(v) || /%$/.test(v))) ? "'" + v : v;
}

function writeSchemaReadme_(ss) {
  var sh = ss.getSheetByName('README') || ss.insertSheet('README', 0);
  sh.clear();
  var rows = [['Tab', 'Type', 'Columns']];
  Object.keys(SEED).forEach(function (t) { rows.push([t, SEED[t].kind, SEED[t].headers.join(', ')]); });
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold');
  sh.setColumnWidth(3, 900);
}

/** Master tabs: editable only by the script owner and superadmins. Records: owner only (the app writes them). */
function protectMasterTabs_(ss) {
  var admins = SEED.Users.rows.filter(function (r) { return r[2] === CONFIG.ROLES.SUPERADMIN; }).map(function (r) { return r[0]; });
  Object.keys(SEED).forEach(function (tab) {
    var sh = ss.getSheetByName(tab);
    sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
    var p = sh.protect().setDescription('Managed by ' + CONFIG.APP_NAME);
    p.removeEditors(p.getEditors());
    if (SEED[tab].kind === 'master') { try { p.addEditors(admins); } catch (e) { console.warn(e); } }
  });
}
