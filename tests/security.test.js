const { sampleDeal } = require('./fixtures');
const C = () => global.__ctx;

test('Formula injection: risky text is stored as plain text', () => {
  eq(C().sheetSafe('=IMPORTXML("http://x","//a")'), '\'=IMPORTXML("http://x","//a")');
  eq(C().sheetSafe('+971 52 904 5457'), "'+971 52 904 5457");
  eq(C().sheetSafe('@sum'), "'@sum");
  eq(C().sheetSafe('-cmd'), "'-cmd");
  eq([C().sheetSafe('Normal Co'), C().sheetSafe(-5), C().sheetSafe(true), C().sheetSafe('{"a":1}')], ['Normal Co', -5, true, '{"a":1}']);
});

test('Browser cannot set prices snapshot, numbers, status or version', () => {
  const stored = JSON.parse(JSON.stringify(sampleDeal)); stored.dealId = 'D-1'; stored.version = 2; stored.docNos = { PROPOSAL: 'OC-P-2026-0007' }; stored.pricingSnapshot = { takenAt: 'old' }; stored.clientId = 'C-1';
  const evil = JSON.parse(JSON.stringify(stored)); evil.pricingSnapshot = { takenAt: 'hacked', Packages: [] }; evil.docNos = { PROPOSAL: 'X' }; evil.status = 'Approved'; evil.version = 99; evil.clientId = 'C-other';
  const d = C().protectDealFields(evil, stored, 'Pending approval', { takenAt: 'fresh' });
  eq([d.pricingSnapshot.takenAt, d.docNos.PROPOSAL, d.status, d.version, d.clientId], ['old', 'OC-P-2026-0007', 'Pending approval', 2, 'C-1']);
});

test('Protected fields: new deal, revision after generation, rejection, explicit refresh', () => {
  const nd = C().protectDealFields({ dealId: 'forged', status: 'Won', docNos: { DPA: 'x' } }, null, null, { takenAt: 'fresh' });
  eq([nd.dealId, nd.status, nd.version, nd.docNos, nd.pricingSnapshot.takenAt], [null, 'Draft', 1, undefined, 'fresh']);
  const stored = { dealId: 'D-1', version: 1, stage: 'CONTRACT', pricingSnapshot: { takenAt: 'old' } };
  eq([C().protectDealFields({}, stored, 'Order Form generated', {}).version, C().protectDealFields({}, stored, 'Order Form generated', {}).status], [2, 'Draft']);
  const legacy = { dealId: 'D-0', version: 1, stage: 'PROPOSAL', commercial: { packages: ['Loyalty'] }, pricingSnapshot: { takenAt: 'old' } };
  const mig = C().protectDealFields({}, legacy, 'Proposal generated', {});
  eq([mig.stage, mig.version, mig.status, mig.docs], ['CONTRACT', 1, 'Draft', { ORDER_FORM: true }], 'old proposal deals become Order Form drafts');
  eq(C().migrateProposalDeal(legacy).commercial.orderPackage, 'Loyalty', 'Order Form package defaults to the first quoted package');
  eq(C().protectDealFields({}, stored, 'Rejected', {}).status, 'Draft');
  eq(C().protectDealFields({ refreshPrices: true }, stored, 'Draft', { takenAt: 'fresh' }).pricingSnapshot.takenAt, 'fresh');
});

test('Cell size guard', () => {
  let threw = false;
  try { C().assertCellSizes({ input_json: 'x'.repeat(49001) }); } catch (e) { threw = /too large/.test(e.message); }
  eq(threw, true);
  C().assertCellSizes({ input_json: 'ok' });
});

test('Go-live findings flag blockers and data gaps', () => {
  const M = JSON.parse(JSON.stringify(global.M));
  const f = C().goLiveFindings(M, {});
  const lv = (item) => (f.find((x) => x.item.indexOf(item) === 0) || {}).level;
  eq(lv('Script property MASTER_SHEET_ID'), 'BLOCKER');
  eq(lv('English template PROPOSAL'), 'BLOCKER', 'seed has no templates');
  eq(lv('Gemini'), 'WARN');
  eq(f.some((x) => x.item === 'Entity P-EG-CONGINEER incomplete'), true);
  eq(lv('Online document link dpa_url'), 'OK', 'seed has the online DPA link');
  M.Templates = ['PROPOSAL', 'ORDER_FORM', 'MSA'].map((t) => ({ doc_type: t, language: 'EN', file_id: 'x', active: true, version: t === 'MSA' ? '1.0-draft' : '1.1', notes: '' }));
  const f2 = C().goLiveFindings(M, { MASTER_SHEET_ID: 1, FOLDER_PROPOSALS: 1, FOLDER_ORDER_FORMS: 1, FOLDER_LEGAL: 1, FOLDER_TEMPLATES: 1, FOLDER_ARCHIVE: 1, GCP_PROJECT_ID: 'p', BACKUP_TRIGGER: 'x' });
  eq(f2.filter((x) => x.level === 'BLOCKER').length, 0);
  eq(f2.some((x) => /Template MSA EN/.test(x.item) && x.level === 'WARN'), true, 'draft legal template flagged');
});

test('Manifest declares an OAuth scope for every Apps Script service the code uses', () => {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, '..', 'src', 'server');
  const code = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const scopes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'appsscript.json'), 'utf8')).oauthScopes;
  const need = [
    [/ScriptApp\.(newTrigger|getProjectTriggers|deleteTrigger)/, 'https://www.googleapis.com/auth/script.scriptapp'],
    [/MailApp\./, 'https://www.googleapis.com/auth/script.send_mail'],
    [/UrlFetchApp\./, 'https://www.googleapis.com/auth/script.external_request'],
    [/SpreadsheetApp\./, 'https://www.googleapis.com/auth/spreadsheets'],
    [/DocumentApp\./, 'https://www.googleapis.com/auth/documents'],
    [/DriveApp\.|Drive\.Permissions/, 'https://www.googleapis.com/auth/drive'],
    [/Session\.getActiveUser/, 'https://www.googleapis.com/auth/userinfo.email']
  ];
  const missing = need.filter(([re, scope]) => re.test(code) && scopes.indexOf(scope) === -1).map(([, s]) => s);
  eq(missing, [], 'scopes missing from appsscript.json');
});
