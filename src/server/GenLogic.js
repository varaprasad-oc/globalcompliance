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
  var approved = approvalStatus === 'Approved';
  var draft = evaluation.needsApproval && !approved;
  return {
    ok: true,
    mode: draft ? 'DRAFT' : 'FINAL',
    docTypes: docTypes,
    status: draft ? DEAL_STATUS.PENDING : DEAL_STATUS.GENERATED,
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
