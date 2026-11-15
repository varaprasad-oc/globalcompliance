/**
 * Sprint 7: one click → all selected documents for a saved deal.
 * FINAL (Doc + PDF) when no approval is needed or it has been granted; otherwise DRAFT (watermarked Doc, no PDF)
 * plus an approval request in the Approvals tab (approval screen: Sprint 8).
 */

function apiGenerateDocs(dealId) {
  var user = requireUser_();
  var rec = findDeal_(dealId);
  if (!rec || !canAccessDeal(user, rec.created_by, getMaster().Users)) throw new Error('Deal not found or no access.');
  return generateForDeal_(dealId, user);
}

/** Internal: generate for a deal (caller has already checked access). Used by Generate and by Approve. */
function generateForDeal_(dealId, user) {
  var m = getMaster(true);
  var rec = findDeal_(dealId);
  var deal = JSON.parse(rec.input_json);
  var pm = withSnapshot(m, deal.pricingSnapshot);
  applyCountryDefaults(pm, deal);
  var ev = evaluateDeal(pm, deal);
  var plan = planGeneration(deal, ev, rec.approval_status);
  if (!plan.ok) throw new Error(plan.reason);

  // stable document numbers per deal
  deal.docNos = deal.docNos || {};
  docNumbersNeeded(deal, plan.docTypes).forEach(function (t) { deal.docNos[t] = nextDocNo(t); });

  var owner = rec.created_by;
  var ownerUser = (m.Users || []).filter(function (u) { return String(u.email).toLowerCase() === String(owner).toLowerCase(); })[0] || {};
  var shareWith = [owner, ownerUser.manager_email].filter(Boolean);
  var ownerProfile = { name: ownerUser.name || user.name, email: owner, phone: ownerUser.phone || '' };

  archivePreviousVersions_(dealId, deal.version, plan.docTypes);

  var results = [];
  var related = relatedNumbers(deal);
  var clientName = deal.client.shortName || deal.client.legalName;
  plan.docTypes.forEach(function (t) {
    var lang = docLanguage_(deal, t, pm);
    var data = buildDocData(t, pm, deal, ev.quote, { docNo: deal.docNos[t], docDate: new Date(), user: ownerProfile, related: related, language: lang });
    try {
      var r = generateDocument(t, data, { clientName: clientName, version: deal.version, draft: plan.mode === 'DRAFT',
        language: lang, shareWith: shareWith });
      var tpl = getActiveTemplate_(t, lang);
      appendRecord_('Documents', { doc_no: deal.docNos[t], deal_id: dealId, doc_type: t, language: lang, version: deal.version,
        template_version: tpl.version, doc_file_id: r.docId, pdf_file_id: r.pdfId, created_by: user.email, created_at: new Date(),
        status: plan.mode === 'DRAFT' ? 'Draft' : 'Final' });
      results.push({ type: t, label: DOC_LABEL[t], docNo: deal.docNos[t], docUrl: r.docUrl, pdfUrl: r.pdfUrl, pdfId: r.pdfId, warnings: r.warnings });
    } catch (e) {
      results.push({ type: t, label: DOC_LABEL[t], docNo: deal.docNos[t], error: String(e.message || e) });
      notifyFailure_('Generating ' + DOC_LABEL[t] + ' for deal ' + dealId, e);
    }
  });

  // save deal: numbers, status, approval request
  deal.status = plan.status;
  deal.lastGeneratedAt = new Date().toISOString();
  var approval = rec.approval_status;
  if (plan.mode === 'DRAFT' && approval !== 'Pending') {
    appendRecord_('Approvals', { approval_id: newId_('A'), deal_id: dealId, version: deal.version, requested_by: user.email, requested_at: new Date(),
      reasons: ev.approvalReasons.join(' | '), decision: '', decided_by: '', decided_at: '', comment: '' });
    approval = 'Pending';
    notifyApprovers_(deal, ev, user);
  }
  var newRec = dealRecord(deal, ev, user.email, new Date().toISOString(), rec);
  newRec.approval_status = ev.needsApproval ? approval : 'Not required';
  writeRecord_('Deals', newRec, rec._row);
  audit_('DOCS_GENERATED', { mode: plan.mode, docs: results.map(function (r) { return r.docNo + (r.error ? ' ERROR' : ''); }) }, dealId);

  generationEmails(deal, results, plan.mode).forEach(function (mail) {
    try {
      var opts = { to: owner, subject: mail.subject, body: mail.body, name: CONFIG.APP_NAME };
      if (mail.pdfIds.length) opts.attachments = mail.pdfIds.map(function (id) { return DriveApp.getFileById(id).getBlob(); });
      MailApp.sendEmail(opts);
    } catch (e) { console.warn('email failed: ' + e); notifyFailure_('Sending documents email for ' + dealId, e); }
  });

  return { mode: plan.mode, message: plan.reason, results: results, deal: deal, summary: dealSummary(newRec) };
}

/** Move files of earlier versions of this deal to _Archive and mark them Superseded. */
function archivePreviousVersions_(dealId, currentVersion, docTypes) {
  var archiveId = getProp_('FOLDER_ARCHIVE');
  if (!archiveId) return;
  var archive = DriveApp.getFolderById(archiveId);
  readRecords_('Documents').forEach(function (d) {
    if (d.deal_id !== dealId || Number(d.version) >= Number(currentVersion) || d.status === 'Superseded') return;
    if (docTypes && docTypes.indexOf(d.doc_type) === -1) return;  // e.g. keep the proposal when contract v2 is generated
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

/** Email every Superadmin that a deal is waiting for approval. */
function notifyApprovers_(deal, ev, user) {
  var to = (getMaster().Users || []).filter(function (u) { return u.role === CONFIG.ROLES.SUPERADMIN && isTrue(u.active); }).map(function (u) { return u.email; });
  if (!to.length) return;
  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) { /* not deployed */ }
  var body = 'Approval requested by ' + user.name + ' (' + user.email + ')\n\n' +
    'Client: ' + (deal.client || {}).legalName + ' (' + (deal.client || {}).country + ')\nDeal: ' + deal.dealId + ' v' + deal.version + '\n\nReasons:\n- ' +
    ev.approvalReasons.join('\n- ') + ((deal.approvalNote) ? '\n\nRep note: ' + deal.approvalNote : '') + '\n\nReview in the app (Approvals): ' + url;
  try { MailApp.sendEmail({ to: to.join(','), subject: 'Approval needed – ' + ((deal.client || {}).shortName || (deal.client || {}).legalName), body: body, name: CONFIG.APP_NAME }); }
  catch (e) { console.warn('approval email failed: ' + e); }
}

/** Language for one document: the deal's language if an active template exists for it, otherwise English. */
function docLanguage_(deal, docType, master) {
  var want = deal.language || 'EN';
  return (availableLanguages(master)[docType] || []).indexOf(want) !== -1 ? want : 'EN';
}
