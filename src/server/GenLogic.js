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

/** Email body for the rep after generation. */
function generationEmail(deal, results, mode) {
  var c = deal.client || {};
  var lines = ['Documents for ' + (c.legalName || deal.dealId) + ' (deal ' + deal.dealId + ', v' + (deal.version || 1) + '):', ''];
  results.forEach(function (r) {
    lines.push('• ' + r.label + ' ' + r.docNo + (r.error ? ' – FAILED: ' + r.error : ''));
    if (!r.error) { lines.push('  Doc: ' + r.docUrl); if (r.pdfUrl) lines.push('  PDF: ' + r.pdfUrl); }
  });
  lines.push('');
  if (mode === 'DRAFT') lines.push('These are DRAFTS pending Amith’s approval of the special pricing. Do not send them to the client.');
  lines.push('— OptCulture Sales Docs');
  return { subject: (mode === 'DRAFT' ? '[DRAFT] ' : '') + 'OptCulture documents – ' + (c.shortName || c.legalName || deal.dealId), body: lines.join('\n') };
}

/**
 * Emails after generation: (1) one email with all Google Doc links, (2) one email with all PDFs attached (final only).
 * Returns [{subject, body, pdfIds: []}].
 */
function generationEmails(deal, results, mode) {
  var c = deal.client || {}, name = c.shortName || c.legalName || deal.dealId;
  var ok = results.filter(function (r) { return !r.error; }), failed = results.filter(function (r) { return r.error; });
  var head = (c.legalName || deal.dealId) + ' – deal ' + deal.dealId + ', v' + (deal.version || 1);
  var linkLines = ok.map(function (r) { return '• ' + r.label + ' ' + r.docNo + '\n  ' + r.docUrl; });
  var failLines = failed.map(function (r) { return '• ' + r.label + ' ' + r.docNo + ' – FAILED: ' + r.error; });
  var mails = [{
    subject: (mode === 'DRAFT' ? '[DRAFT] ' : '') + 'Documents ready – ' + name,
    body: 'Google Docs for ' + head + ':\n\n' + linkLines.join('\n') + (failLines.length ? '\n\nProblems:\n' + failLines.join('\n') : '') +
      '\n\n' + (mode === 'DRAFT' ? 'These are DRAFTS pending Amith’s approval of the special pricing. Do not send them to the client. Final PDFs follow after approval.' :
        'Edit only wording here if needed – change prices in the app and generate again. PDFs follow in a separate email.') + '\n\n— OptCulture Sales Docs',
    pdfIds: []
  }];
  var pdfs = ok.filter(function (r) { return r.pdfId; });
  if (mode !== 'DRAFT' && pdfs.length) {
    mails.push({
      subject: 'PDFs for review – ' + name,
      body: 'Attached: ' + pdfs.map(function (r) { return r.label + ' ' + r.docNo; }).join(', ') + '\n\nFor ' + head + '. Review before sending to the client.\n\n— OptCulture Sales Docs',
      pdfIds: pdfs.map(function (r) { return r.pdfId; })
    });
  }
  return mails;
}
