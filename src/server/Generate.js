/**
 * Sprint 7: one click → all selected documents for a saved deal.
 * FINAL (Doc + PDF) when no approval is needed or it has been granted; otherwise DRAFT (watermarked Doc, no PDF)
 * plus an approval request in the Approvals tab (approval screen: Sprint 8).
 */

function apiGenerateDocs(dealId) {
  var user = requireUser_();
  var m = getMaster(true);
  var rec = findDeal_(dealId);
  if (!rec || !canAccessDeal(user, rec.created_by, m.Users)) throw new Error('Deal not found or no access.');
  var deal = JSON.parse(rec.input_json);
  applyCountryDefaults(m, deal);
  var ev = evaluateDeal(m, deal);
  var plan = planGeneration(deal, ev, rec.approval_status);
  if (!plan.ok) throw new Error(plan.reason);

  // stable document numbers per deal
  deal.docNos = deal.docNos || {};
  docNumbersNeeded(deal, plan.docTypes).forEach(function (t) { deal.docNos[t] = nextDocNo(t); });

  var owner = rec.created_by;
  var ownerUser = (m.Users || []).filter(function (u) { return String(u.email).toLowerCase() === String(owner).toLowerCase(); })[0] || {};
  var shareWith = [owner, ownerUser.manager_email].filter(Boolean);
  var ownerProfile = { name: ownerUser.name || user.name, email: owner, phone: ownerUser.phone || '' };

  archivePreviousVersions_(dealId, deal.version);

  var results = [];
  plan.docTypes.forEach(function (t) {
    var data = buildDocData(t, m, deal, ev.quote, { docNo: deal.docNos[t], docDate: new Date(), user: ownerProfile, related: deal.docNos });
    try {
      var r = generateDocument(t, data, { clientName: deal.client.shortName || deal.client.legalName, version: deal.version, draft: plan.mode === 'DRAFT',
        language: deal.language || 'EN', shareWith: shareWith });
      var tpl = getActiveTemplate_(t, deal.language || 'EN');
      appendRecord_('Documents', { doc_no: deal.docNos[t], deal_id: dealId, doc_type: t, language: deal.language || 'EN', version: deal.version,
        template_version: tpl.version, doc_file_id: r.docId, pdf_file_id: r.pdfId, created_by: user.email, created_at: new Date(),
        status: plan.mode === 'DRAFT' ? 'Draft' : 'Final' });
      results.push({ type: t, label: DOC_LABEL[t], docNo: deal.docNos[t], docUrl: r.docUrl, pdfUrl: r.pdfUrl, warnings: r.warnings });
    } catch (e) {
      results.push({ type: t, label: DOC_LABEL[t], docNo: deal.docNos[t], error: String(e.message || e) });
    }
  });

  // save deal: numbers, status, approval request
  deal.status = plan.status;
  var approval = rec.approval_status;
  if (plan.mode === 'DRAFT' && approval !== 'Pending') {
    appendRecord_('Approvals', { approval_id: newId_('A'), deal_id: dealId, version: deal.version, requested_by: user.email, requested_at: new Date(),
      reasons: ev.approvalReasons.join(' | '), decision: '', decided_by: '', decided_at: '', comment: '' });
    approval = 'Pending';
  }
  var newRec = dealRecord(deal, ev, user.email, new Date().toISOString(), rec);
  newRec.approval_status = ev.needsApproval ? approval : 'Not required';
  writeRecord_('Deals', newRec, rec._row);
  audit_('DOCS_GENERATED', { mode: plan.mode, docs: results.map(function (r) { return r.docNo + (r.error ? ' ERROR' : ''); }) }, dealId);

  try {
    var mail = generationEmail(deal, results, plan.mode);
    MailApp.sendEmail({ to: owner, subject: mail.subject, body: mail.body, name: CONFIG.APP_NAME });
  } catch (e) { console.warn('email failed: ' + e); }

  return { mode: plan.mode, message: plan.reason, results: results, deal: deal, summary: dealSummary(newRec) };
}

/** Move files of earlier versions of this deal to _Archive and mark them Superseded. */
function archivePreviousVersions_(dealId, currentVersion) {
  var archiveId = getProp_('FOLDER_ARCHIVE');
  if (!archiveId) return;
  var archive = DriveApp.getFolderById(archiveId);
  readRecords_('Documents').forEach(function (d) {
    if (d.deal_id !== dealId || Number(d.version) >= Number(currentVersion) || d.status === 'Superseded') return;
    [d.doc_file_id, d.pdf_file_id].filter(String).forEach(function (id) { try { DriveApp.getFileById(id).moveTo(archive); } catch (e) { console.warn(e); } });
    d.status = 'Superseded';
    writeRecord_('Documents', d, d._row);
  });
}

/** Documents of a deal (latest first) for the UI. */
function apiDealDocuments(dealId) {
  var user = requireUser_();
  var rec = findDeal_(dealId);
  if (!rec || !canAccessDeal(user, rec.created_by, getMaster().Users)) throw new Error('No access.');
  return readRecords_('Documents').filter(function (d) { return d.deal_id === dealId; }).map(function (d) {
    return { docNo: d.doc_no, type: d.doc_type, label: DOC_LABEL[d.doc_type], version: Number(d.version), status: d.status,
      docUrl: d.doc_file_id ? 'https://docs.google.com/document/d/' + d.doc_file_id + '/edit' : '',
      pdfUrl: d.pdf_file_id ? 'https://drive.google.com/file/d/' + d.pdf_file_id + '/view' : '',
      createdAt: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at) };
  }).sort(function (a, b) { return b.version - a.version; });
}
