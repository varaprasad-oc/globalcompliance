/**
 * Sprint 7: generation planning – pure (Apps Script + Node tests).
 * Decides FINAL vs DRAFT, which documents to make, and the resulting deal status.
 */

/**
 * @param {Object} deal        the saved deal
 * @param {Object} evaluation  evaluateDeal() result
 * @param {string} approvalStatus  Deals.approval_status ('Not required' | 'Required' | 'Pending' | 'Approved' | 'Rejected')
 * @return {{ok, reason, mode, docTypes, status}}
 */
function planGeneration(deal, evaluation, approvalStatus) {
  if (!evaluation.ok) return { ok: false, reason: 'Fix these first: ' + evaluation.errors.join('; ') };
  var missing = Object.keys(evaluation.missing || {});
  if (missing.length) {
    return { ok: false, reason: 'Missing information: ' + missing.map(function (t) { return t + ' (' + evaluation.missing[t].join(', ') + ')'; }).join('; ') };
  }
  var docTypes = selectedDocs(deal);
  if (!docTypes.length) return { ok: false, reason: 'No documents selected for this stage.' };
  var approved = approvalStatus === 'Approved';
  var draft = evaluation.needsApproval && !approved;
  return {
    ok: true,
    mode: draft ? 'DRAFT' : 'FINAL',
    docTypes: docTypes,
    status: draft ? DEAL_STATUS.PENDING : (deal.stage === 'CONTRACT' ? DEAL_STATUS.CONTRACT_GENERATED : deal.stage === 'PROPOSAL' ? DEAL_STATUS.PROPOSAL_GENERATED : DEAL_STATUS.GENERATED),
    reason: draft ? 'Special pricing needs Amith’s approval: DRAFT documents (no PDF) are created now; final PDFs are generated after approval.' : ''
  };
}

/** Keep document numbers stable across versions: reuse the deal's existing numbers, only allocate missing ones. */
function docNumbersNeeded(deal, docTypes) {
  var have = deal.docNos || {};
  return docTypes.filter(function (t) { return !have[t]; });
}


/**
 * Email to the rep after generation: ONE email with the PDFs attached and no Google Doc links – changes are made in the app
 * and generated again (decision 2026-11-16). Drafts get the watermarked PDFs with a "do not send" note.
 * Returns [{subject, body, pdfIds: []}].
 */
function generationEmails(deal, results, mode) {
  var c = deal.client || {}, name = c.shortName || c.legalName || deal.dealId;
  var ok = results.filter(function (r) { return !r.error; }), failed = results.filter(function (r) { return r.error; });
  var pdfs = ok.filter(function (r) { return r.pdfId; });
  var head = (c.legalName || deal.dealId) + ' – deal ' + deal.dealId + ', v' + (deal.version || 1);
  var list = ok.map(function (r) { return '• ' + r.label + ' ' + r.docNo; });
  var failLines = failed.map(function (r) { return '• ' + r.label + ' ' + r.docNo + ' – FAILED: ' + r.error; });
  var draft = mode === 'DRAFT';
  return [{
    subject: (draft ? '[DRAFT – pending approval] ' : '') + 'OptCulture documents – ' + name,
    body: (draft ? 'DRAFT PDFs attached for ' : 'PDFs attached for ') + head + ':\n\n' + list.join('\n') +
      (failLines.length ? '\n\nProblems:\n' + failLines.join('\n') : '') + '\n\n' +
      (draft ? 'These are DRAFTS waiting for Amith’s approval – do NOT send them to the client. You will receive the final PDFs by email after approval.'
        : 'Review before sending to the client. To change anything, open the deal in the app, edit it and generate again – the documents are not edited directly.') +
      '\n\n— OptCulture Sales Docs',
    pdfIds: pdfs.map(function (r) { return r.pdfId; })
  }];
}

/** Email to the approver: only what needs approval, item by item (structured), plus rep note and a link. */
function approvalEmailBody(deal, ev, user, url) {
  var c = deal.client || {}, cur = (deal.commercial || {}).currency || '';
  var what = deal.dealType === 'TOPUP' ? 'Top-up Order Form' : deal.stage === 'CONTRACT' ? (contractMode(deal) === 'NEW_MSA' ? 'Quotation & Order Form + MSA' : 'Quotation & Order Form') : 'Proposal';
  var lines = (ev.approvalItems || []).map(function (it) {
    if (it.text) return '• ' + it.area + ':\n    "' + it.text.replace(/\n/g, '\n     ') + '"';
    var ref = it.reference === null || it.reference === undefined ? '' : ' vs ' + it.referenceLabel.toLowerCase() + ' ' + formatMoney(cur, it.reference);
    var diff = it.diffPct === null || it.diffPct === undefined ? '' : ' (' + (it.diffPct * 100).toFixed(1) + '%)';
    return '• ' + it.area + ' – ' + it.item + ': ' + formatMoney(cur, it.proposed) + ' ' + it.unit + ref + diff + (it.note ? ' – ' + it.note : '');
  });
  return 'Approval requested by ' + user.name + ' (' + user.email + ')\n\n' +
    'Client: ' + c.legalName + ' (' + c.country + ')\nDeal: ' + deal.dealId + ' v' + deal.version + ' – ' + what + '\n\n' +
    'NEEDS YOUR APPROVAL (' + lines.length + '):\n' + lines.join('\n') +
    (deal.approvalNote ? '\n\nRep note: ' + deal.approvalNote : '') +
    '\n\nEverything else in the documents is standard. Review and approve in the app (Approvals): ' + url + '\n\n— OptCulture Sales Docs';
}

/** Tables up to this many rows are kept on one page; longer ones repeat their header row on the next page. */
var KEEP_TABLE_MAX_ROWS = 22;

/**
 * Docs API requests that stop tables breaking across pages (pure – tested in Node).
 * Short tables were wrapped by the engine in an invisible 1×1 "frame" table: its single row gets preventOverflow, so the
 * whole table moves to the next page instead of splitting. Long tables (> KEEP_TABLE_MAX_ROWS) can't fit a page: their header
 * row is pinned (repeats on the next page) and no row is split.
 * doc = documents.get JSON (body.content or tabs[0].documentTab.body.content).
 */
function tablePagingRequests(doc, maxRows) {
  maxRows = maxRows || KEEP_TABLE_MAX_ROWS;
  var content = (doc.body || ((doc.tabs || [])[0] || {}).documentTab && doc.tabs[0].documentTab.body || {}).content || [];
  var reqs = [];
  content.forEach(function (el) {
    if (!el.table) return;
    var t = el.table, loc = { index: el.startIndex };
    var rows = t.tableRows || [];
    var isFrame = rows.length === 1 && (rows[0].tableCells || []).length === 1 &&
      (rows[0].tableCells[0].content || []).some(function (c) { return !!c.table; });
    if (isFrame) {
      reqs.push({ updateTableRowStyle: { tableStartLocation: loc, rowIndices: [0], tableRowStyle: { preventOverflow: true }, fields: 'preventOverflow' } });
    } else if (rows.length > maxRows) {
      reqs.push({ pinTableHeaderRows: { tableStartLocation: loc, pinnedHeaderRowsCount: 1 } });
      reqs.push({ updateTableRowStyle: { tableStartLocation: loc, tableRowStyle: { preventOverflow: true }, fields: 'preventOverflow' } });
    }
  });
  return reqs;
}
