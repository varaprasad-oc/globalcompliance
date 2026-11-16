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
