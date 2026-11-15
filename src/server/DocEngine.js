/**
 * Sprint 4: Google Docs template engine.
 * generateDocument(docType, data, opts) copies the active template, fills it with data from buildDocData(),
 * saves it to the right folder, exports a PDF (unless draft), shares it, and records it in the Documents tab.
 *
 * Template syntax: see docs/PLACEHOLDERS.md.
 */

var DOC_FOLDER_KEY = { PROPOSAL: 'PROPOSALS', ORDER_FORM: 'ORDER_FORMS', TOS: 'LEGAL', DPA: 'LEGAL' };
var DOC_LABEL = { PROPOSAL: 'Proposal', ORDER_FORM: 'Order Form', TOS: 'Terms of Service', DPA: 'DPA' };
var TABLE_STYLE = { headerBg: '#7B3FE4', headerFg: '#ffffff', border: '#c9d2dc', font: 'Arial', size: 10 };

/**
 * @param {string} docType PROPOSAL | ORDER_FORM | TOS | DPA
 * @param {Object} data output of buildDocData()
 * @param {Object} opts { language, clientName, version, draft (bool), shareWith: [emails], templateFileId (override, for tests) }
 * @return {Object} { docId, docUrl, pdfId, pdfUrl, name, warnings }
 */
function generateDocument(docType, data, opts) {
  opts = opts || {};
  var tpl = opts.templateFileId ? { file_id: opts.templateFileId } : getActiveTemplate_(docType, opts.language || 'EN');
  var folder = getOutputFolder_(docType, opts.clientName);
  var name = [data.fields.DocNo, safeName_(opts.clientName), DOC_LABEL[docType], 'v' + (opts.version || 1)].join('_');
  if (opts.draft) name += '_DRAFT';

  var copy = DriveApp.getFileById(tpl.file_id).makeCopy(name, folder);
  var doc = DocumentApp.openById(copy.getId());
  var warnings = [];

  var sections = [doc.getBody()];
  if (doc.getHeader()) sections.push(doc.getHeader());
  if (doc.getFooter()) sections.push(doc.getFooter());

  sections.forEach(function (sec) {
    applyInlineIfs_(sec, data.flags);
    applyBlockIfs_(sec, data.flags);
  });
  var body = doc.getBody();
  applyEachRows_(body, data.lists, warnings);
  applyListParagraphs_(body, data.lists, warnings);
  applyTexts_(body, data.texts);
  applyTables_(body, data.tables, warnings);
  applyPageBreaks_(body);
  sections.forEach(function (sec) { applyImages_(sec, data.images); });
  sections.forEach(function (sec) {
    Object.keys(data.fields).forEach(function (k) { replaceLiteral_(sec, '{{' + k + '}}', data.fields[k]); });
  });
  styleAllTableHeaders_(body, (data.style && data.style.tableHeaderBg) || TABLE_STYLE.headerBg);
  sections.forEach(function (sec) { warnings = warnings.concat(highlightLeftovers_(sec)); });
  if ((opts.language || data.language) === 'AR') applyRtl_(body);
  if (opts.draft) addDraftBanner_(doc);
  doc.saveAndClose();

  var result = { docId: copy.getId(), docUrl: copy.getUrl(), pdfId: '', pdfUrl: '', name: name, warnings: warnings };
  if (!opts.draft) {
    var pdf = folder.createFile(copy.getAs(MimeType.PDF)).setName(name + '.pdf');
    result.pdfId = pdf.getId();
    result.pdfUrl = pdf.getUrl();
  }
  shareFiles_([result.docId, result.pdfId].filter(String), opts.shareWith || []);
  return result;
}

// ---------------- templates & folders ----------------

function getActiveTemplate_(docType, lang) {
  var t = (getMaster().Templates || []).filter(function (r) {
    return r.doc_type === docType && String(r.language || 'EN') === lang && isTrue(r.active) && r.file_id;
  })[0];
  if (!t) throw new Error('No active ' + lang + ' template for ' + docType + '. Add one in the Templates tab.');
  return t;
}

function getOutputFolder_(docType, clientName) {
  var baseId = getProp_('FOLDER_' + DOC_FOLDER_KEY[docType]);
  if (!baseId) throw new Error('Folders not set up. Run setupFolders().');
  var year = getOrCreateFolder_(DriveApp.getFolderById(baseId), String(new Date().getFullYear()));
  return getOrCreateFolder_(year, safeName_(clientName) || 'Unnamed client');
}

function safeName_(s) {
  return String(s || '').replace(/[\\\/:*?"<>|#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Share each file with the given users (rep, manager) WITHOUT Google's "shared with you" emails (Drive API, advanced service).
 * The app account itself is skipped (it already owns/manages the files). Superadmins see everything via the Shared Drive.
 */
function shareFiles_(fileIds, emails) {
  var me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  fileIds.forEach(function (id) {
    emails.filter(Boolean).forEach(function (e) {
      if (String(e).toLowerCase() === me) return;
      try {
        if (typeof Drive !== 'undefined' && Drive.Permissions) {
          Drive.Permissions.create({ role: 'writer', type: 'user', emailAddress: e }, id, { sendNotificationEmail: false, supportsAllDrives: true });
        } else {
          DriveApp.getFileById(id).addEditor(e);  // fallback (sends Google's notification)
        }
      } catch (err) { console.warn('share failed ' + e + ': ' + err); }
    });
  });
}

// ---------------- conditionals ----------------

function _flagValue(flags, expr) {
  var neg = expr.charAt(0) === '!';
  var v = !!flags[neg ? expr.slice(1) : expr];
  return neg ? !v : v;
}

/** {{#IF X}}…{{/IF X}} within a single paragraph. */
function applyInlineIfs_(sec, flags) {
  var re = /\{\{#IF (!?\w+)\}\}/;
  var guard = 0;
  var found;
  while ((found = sec.findText('\\{\\{#IF !?\\w+\\}\\}')) && guard++ < 500) {
    var textEl = found.getElement().asText();
    var str = textEl.getText();
    var start = found.getStartOffset();
    var expr = str.slice(start).match(re)[1];
    var closeTok = '{{/IF ' + expr.replace(/^!/, '') + '}}';
    var openTok = '{{#IF ' + expr + '}}';
    var closeIdx = str.indexOf(closeTok, start);
    if (closeIdx === -1) {
      // block-level IF (closing tag in another paragraph): handled by applyBlockIfs_. Mark to skip.
      textEl.deleteText(start, start + openTok.length - 1);
      textEl.insertText(start, '[[BLOCKIF ' + expr + ']]');
      continue;
    }
    if (_flagValue(flags, expr)) {
      textEl.deleteText(closeIdx, closeIdx + closeTok.length - 1);
      textEl.deleteText(start, start + openTok.length - 1);
    } else {
      textEl.deleteText(start, closeIdx + closeTok.length - 1);
    }
  }
  // restore block markers
  var b;
  while ((b = sec.findText('\\[\\[BLOCKIF !?\\w+\\]\\]'))) {
    var el = b.getElement().asText();
    var s = el.getText().slice(b.getStartOffset(), b.getEndOffsetInclusive() + 1);
    var ex = s.match(/BLOCKIF (!?\w+)/)[1];
    el.deleteText(b.getStartOffset(), b.getEndOffsetInclusive());
    el.insertText(b.getStartOffset(), '{{#IF ' + ex + '}}');
  }
}

/** Paragraph-level {{#IF X}} … {{/IF X}} spanning paragraphs/tables. Marker paragraphs are removed. */
function applyBlockIfs_(sec, flags) {
  var guard = 0;
  while (guard++ < 200) {
    var n = sec.getNumChildren();
    var openIdx = -1, expr = null;
    for (var i = 0; i < n; i++) {
      var m = _childText(sec.getChild(i)).match(/^\s*\{\{#IF (!?\w+)\}\}\s*$/);
      if (m) { openIdx = i; expr = m[1]; break; }
    }
    if (openIdx === -1) return;
    var closeRe = new RegExp('^\\s*\\{\\{/IF ' + expr.replace(/^!/, '') + '\\}\\}\\s*$');
    var closeIdx = -1;
    for (var j = openIdx + 1; j < sec.getNumChildren(); j++) {
      if (closeRe.test(_childText(sec.getChild(j)))) { closeIdx = j; break; }
    }
    if (closeIdx === -1) throw new Error('Template error: {{#IF ' + expr + '}} has no matching {{/IF}}');
    var keep = _flagValue(flags, expr);
    for (var k = closeIdx; k >= openIdx; k--) {
      if (keep && k !== openIdx && k !== closeIdx) continue;
      _removeChild(sec, k);
    }
  }
}

function _childText(el) {
  var t = el.getType();
  return (t === DocumentApp.ElementType.PARAGRAPH || t === DocumentApp.ElementType.LIST_ITEM) ? el.asText().getText() : '';
}

function _removeChild(sec, idx) {
  // Google Docs requires every section to keep a final paragraph and refuses empty text inserts,
  // so when removing the last child we first append a placeholder paragraph containing a space.
  if (idx >= sec.getNumChildren() - 1) sec.appendParagraph(' ');
  sec.getChild(idx).removeFromParent();
}

// ---------------- repeating content ----------------

/** Table rows whose text contains {{EACH:Name}} are repeated once per list item. */
function applyEachRows_(body, lists, warnings) {
  var tables = body.getTables();
  tables.forEach(function (table) {
    for (var r = table.getNumRows() - 1; r >= 0; r--) {
      var row = table.getRow(r);
      var m = row.getText().match(/\{\{EACH:(\w+)\}\}/);
      if (!m) continue;
      var items = lists[m[1]];
      if (!items) { warnings.push('No list data for EACH:' + m[1]); items = []; }
      for (var i = items.length - 1; i >= 0; i--) {
        var newRow = table.insertTableRow(r + 1, row.copy());
        replaceLiteral_(newRow, m[0], '');
        Object.keys(items[i]).forEach(function (k) { replaceLiteral_(newRow, '{{' + k + '}}', items[i][k]); });
      }
      table.removeRow(r);
    }
  });
}

/** Paragraphs / list items containing {{LIST:Name}} are repeated once per item. */
function applyListParagraphs_(body, lists, warnings) {
  var f;
  var guard = 0;
  while ((f = body.findText('\\{\\{LIST:\\w+\\}\\}')) && guard++ < 100) {
    var par = f.getElement().getParent();
    while (par.getType() !== DocumentApp.ElementType.PARAGRAPH && par.getType() !== DocumentApp.ElementType.LIST_ITEM) par = par.getParent();
    var tag = par.asText().getText().match(/\{\{LIST:(\w+)\}\}/);
    var items = lists[tag[1]];
    if (!items) { warnings.push('No list data for LIST:' + tag[1]); items = []; }
    var container = par.getParent();
    var idx = container.getChildIndex(par);
    for (var i = items.length - 1; i >= 0; i--) {
      var copy = par.copy();
      var inserted = par.getType() === DocumentApp.ElementType.LIST_ITEM
        ? container.insertListItem(idx + 1, copy) : container.insertParagraph(idx + 1, copy);
      replaceLiteral_(inserted, tag[0], '');
      Object.keys(items[i]).forEach(function (k) { replaceLiteral_(inserted, '{{' + k + '}}', items[i][k]); });
    }
    _removeChild(container, idx);
  }
}

/** A paragraph containing {{TEXT:Name}} becomes one paragraph per blank-line-separated block (same style). */
function applyTexts_(body, texts) {
  var f;
  var guard = 0;
  while ((f = body.findText('\\{\\{TEXT:\\w+\\}\\}')) && guard++ < 50) {
    var par = f.getElement().getParent();
    while (par.getType() !== DocumentApp.ElementType.PARAGRAPH && par.getType() !== DocumentApp.ElementType.LIST_ITEM) par = par.getParent();
    var key = par.asText().getText().match(/\{\{TEXT:(\w+)\}\}/)[1];
    var parts = String(texts[key] || '').split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(String);
    var container = par.getParent();
    var idx = container.getChildIndex(par);
    if (!parts.length) { _removeChild(container, idx); continue; }
    for (var i = parts.length - 1; i >= 1; i--) {
      var c = container.insertParagraph(idx + 1, par.copy());
      c.setText(parts[i]);
    }
    par.asParagraph().setText(parts[0]);
  }
}

/** A paragraph containing {{TABLE:Name}} is replaced by a generated, styled table. */
function applyTables_(body, tables, warnings) {
  var f;
  var guard = 0;
  while ((f = body.findText('\\{\\{TABLE:\\w+\\}\\}')) && guard++ < 50) {
    var par = f.getElement().getParent();
    while (par.getType() !== DocumentApp.ElementType.PARAGRAPH) par = par.getParent();
    var key = par.getText().match(/\{\{TABLE:(\w+)\}\}/)[1];
    var t = tables[key];
    var idx = body.getChildIndex(par);
    if (!t) { warnings.push('No table data for TABLE:' + key); _removeChild(body, idx); continue; }
    var cells = [t.headers].concat(t.rows).map(function (r) { return r.map(function (c) { return String(c == null ? '' : c); }); });
    var table = body.insertTable(idx + 1, cells);
    styleTable_(table, null);
    _removeChild(body, idx);
  }
}

/** Every table's first row: brand background, white bold text (colour from Master Sheet brand_table_header_bg). */
function styleAllTableHeaders_(body, bg) {
  body.getTables().forEach(function (t) {
    if (t.getNumRows() < 2) return;
    var row = t.getRow(0);
    for (var c = 0; c < row.getNumCells(); c++) {
      row.getCell(c).setBackgroundColor(bg).editAsText().setForegroundColor('#ffffff').setBold(true);
    }
  });
}

function styleTable_(table) {
  table.setBorderColor(TABLE_STYLE.border);
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(3).setPaddingBottom(3);
      var txt = cell.editAsText().setFontFamily(TABLE_STYLE.font).setFontSize(TABLE_STYLE.size);
      if (r === 0) { cell.setBackgroundColor(TABLE_STYLE.headerBg); txt.setForegroundColor(TABLE_STYLE.headerFg).setBold(true); }
      if (c > 0) cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
  }
}

function applyImages_(sec, images) {
  var f;
  var guard = 0;
  while ((f = sec.findText('\\{\\{IMAGE:\\w+\\}\\}')) && guard++ < 20) {
    var el = f.getElement().asText();
    var tok = el.getText().slice(f.getStartOffset(), f.getEndOffsetInclusive() + 1);
    var key = tok.match(/IMAGE:(\w+)/)[1];
    el.deleteText(f.getStartOffset(), f.getEndOffsetInclusive());
    if (!images[key]) continue;
    var par = el.getParent();
    while (par.getType() !== DocumentApp.ElementType.PARAGRAPH) par = par.getParent();
    var img = par.asParagraph().insertInlineImage(0, DriveApp.getFileById(images[key]).getBlob());
    var w = img.getWidth(), h = img.getHeight(), maxW = key === 'OptCultureLogo' ? 200 : 120;
    if (w > maxW) img.setWidth(maxW).setHeight(Math.round(h * maxW / w));
  }
}

// ---------------- text replacement ----------------

/** Replace every literal occurrence of token (no regex/`$` surprises in values). */
function replaceLiteral_(el, token, value) {
  var pattern = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var v = String(value == null ? '' : value);
  var f, guard = 0;
  while ((f = el.findText(pattern)) && guard++ < 1000) {
    var t = f.getElement().asText();
    var s = f.getStartOffset(), e = f.getEndOffsetInclusive();
    // Insert INSIDE the tag (after its first character) so the new text copies the tag's own style. Inserting at the
    // start of a cell/paragraph makes Google Docs copy the previous element's style (e.g. a white table header).
    if (v) { t.insertText(s + 1, v); t.deleteText(s, s); t.deleteText(s + v.length, e + v.length - 1); }
    else t.deleteText(s, e);
  }
}

/** Any {{…}} left after filling is highlighted yellow and reported. */
function highlightLeftovers_(sec) {
  var out = [];
  var f = sec.findText('\\{\\{[^}]+\\}\\}');
  while (f) {
    var t = f.getElement().asText();
    t.setBackgroundColor(f.getStartOffset(), f.getEndOffsetInclusive(), '#fff59d');
    out.push('Unfilled placeholder: ' + t.getText().slice(f.getStartOffset(), f.getEndOffsetInclusive() + 1));
    f = sec.findText('\\{\\{[^}]+\\}\\}', f);
  }
  return out;
}

function addDraftBanner_(doc) {
  var header = doc.getHeader() || doc.addHeader();
  var p = header.insertParagraph(0, 'DRAFT – PENDING APPROVAL – NOT FOR CLIENT USE');
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.editAsText().setBold(true).setForegroundColor('#c62828').setFontSize(10);
}

/** Arabic documents: right-to-left paragraphs (incl. table cells), right-aligned unless centred. */
function applyRtl_(container) {
  var n = container.getNumChildren();
  for (var i = 0; i < n; i++) {
    var el = container.getChild(i), t = el.getType();
    if (t === DocumentApp.ElementType.PARAGRAPH || t === DocumentApp.ElementType.LIST_ITEM) {
      var p = t === DocumentApp.ElementType.PARAGRAPH ? el.asParagraph() : el.asListItem();
      p.setLeftToRight(false);
      if (p.getAlignment() !== DocumentApp.HorizontalAlignment.CENTER) p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    } else if (t === DocumentApp.ElementType.TABLE) {
      var tb = el.asTable();
      for (var r = 0; r < tb.getNumRows(); r++) for (var c = 0; c < tb.getRow(r).getNumCells(); c++) applyRtl_(tb.getRow(r).getCell(c));
    }
  }
}

/** A paragraph containing only {{PAGEBREAK}} becomes a page break. */
function applyPageBreaks_(body) {
  var f, guard = 0;
  while ((f = body.findText('\\{\\{PAGEBREAK\\}\\}')) && guard++ < 50) {
    var par = f.getElement().getParent();
    while (par.getType() !== DocumentApp.ElementType.PARAGRAPH) par = par.getParent();
    if (par.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) { replaceLiteral_(par, '{{PAGEBREAK}}', ''); continue; }
    var idx = body.getChildIndex(par);
    body.insertPageBreak(idx);
    _removeChild(body, idx + 1);
  }
}
