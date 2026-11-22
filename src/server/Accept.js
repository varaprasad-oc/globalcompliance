/**
 * Client acceptance (decision 2026-11-21): the rep sends the final Order Form (then the MSA) to the client; the client opens a
 * secure one-document link, verifies with a one-time code, and accepts online or uploads a signed PDF.
 *
 * Security
 *  - Link = 64-hex random token; only its SHA-256 hash is stored (Acceptances tab). One link = one document + version.
 *  - The client never gets Drive access: the PDF is streamed into the page, uploads are saved by the app.
 *  - Public functions (apiAccept*) accept only a token; everything else in the app requires an @optculture.com user,
 *    and operator tools require the owner/Superadmin (requireOperator_).
 *  - Links expire, are single-use, are revoked when the document is regenerated or resent, and lock after 5 wrong codes.
 */

var ACCEPT_TAB = 'Acceptances';

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function newToken_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }

/** Public link base: Script property ACCEPT_BASE_URL (e.g. https://salestools.optculturecx.com/accept/) or PUBLIC_EXEC_URL + "?a=". */
function acceptBaseUrl_() {
  var b = getProp_('ACCEPT_BASE_URL');
  if (b) return b;
  var x = getProp_('PUBLIC_EXEC_URL');
  if (x) return x + '?a=';
  throw new Error('The client acceptance page is not set up yet (Script property ACCEPT_BASE_URL). Ask the app owner.');
}

/** The final (not draft) generated document of this type and version. */
function finalDocFor_(dealId, docType, version) {
  return readRecords_('Documents').filter(function (d) {
    return d.deal_id === dealId && d.doc_type === docType && Number(d.version) === Number(version) && d.status === 'Final' && d.pdf_file_id;
  })[0] || null;
}

/** Revoke every open link for this deal (and document type, if given) – after a resend or a regeneration. */
function revokeOpenAcceptances_(dealId, docType) {
  readRecords_(ACCEPT_TAB).forEach(function (a) {
    if (a.deal_id !== dealId || (docType && a.doc_type !== docType)) return;
    if (['Sent', 'Locked'].indexOf(String(a.status)) === -1) return;
    a.status = 'Revoked';
    writeRecord_(ACCEPT_TAB, a, a._row);
  });
}

function dubaiTime_(d) { return Utilities.formatDate(d, 'Asia/Dubai', 'd MMM yyyy, HH:mm') + ' (Dubai time)'; }

function ownerProfile_(createdBy) {
  var u = (getMaster_().Users || []).filter(function (x) { return String(x.email).toLowerCase() === String(createdBy).toLowerCase(); })[0] || {};
  return { email: createdBy, name: u.name || createdBy, phone: u.phone || '', manager: u.manager_email || '', title: u.title || '' };
}

/** Email template (EmailTemplates tab, editable by the Superadmin) – falls back to the seeded wording. */
function emailTemplate_(key) {
  var rows = (getMaster_().EmailTemplates || []).filter(function (r) { return r.template_key === key && String(r.subject || '').trim() && String(r.body || '').trim(); });
  if (rows.length) return rows[0];
  var seed = (SEED.EmailTemplates.rows || []).filter(function (r) { return r[0] === key; })[0];
  return { template_key: key, subject: seed[1], body: seed[2] };
}

/** Placeholders shared by every client email of a deal. */
function emailVars_(deal, docType, docNo, rep) {
  var m = getMaster_(), c = deal.client || {};
  var entity = (m.Entities || []).filter(function (e) { return e.entity_id === deal.entityId; })[0] || {};
  var title = docType === 'MSA' ? 'Master Services Agreement' : (deal.dealType === 'TOPUP' ? 'Top-up Quotation & Order Form' : 'Quotation & Order Form');
  var msaNo = (deal.docNos || {}).MSA || ((existingMsa(deal) || {}).no) || '';
  return { DocTitle: title, DocNo: docNo, Client: c.legalName || '', ClientContact: c.signatoryName || (c.businessContact || {}).name || c.legalName || '',
    Entity: entity.legal_name || 'OptCulture', RepName: rep.name, RepTitle: rep.title || '', RepEmail: rep.email, RepPhone: rep.phone || '',
    RepSignature: repSignature(rep, entity.legal_name || 'OptCulture'), OrderFormNo: (deal.docNos || {}).ORDER_FORM || '', MsaNo: msaNo };
}

function uniqEmails_(list, exclude) {
  var ex = (exclude || []).map(function (e) { return String(e).toLowerCase(); }), out = [];
  list.forEach(function (e) { e = String(e || '').trim().toLowerCase(); if (e && ex.indexOf(e) === -1 && out.indexOf(e) === -1) out.push(e); });
  return out;
}

function superadminEmails_() {
  return (getMaster_().Users || []).filter(function (u) { return u.role === CONFIG.ROLES.SUPERADMIN && isTrue(u.active); }).map(function (u) { return u.email; });
}

// ---------------- internal (rep) API ----------------

/** Send the final Order Form / MSA to the client for acceptance. toEmail defaults to the signatory or business contact. */
function apiSendForAcceptance(dealId, docType, toEmail) {
  var user = requireUser_();
  var m = getMaster_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rec = findDeal_(dealId);
    if (!rec || !canAccessDeal(user, rec.created_by, m.Users)) throw new Error('Deal not found or no access.');
    var deal = attachClientMsa_(JSON.parse(rec.input_json));
    if (!canSendForAcceptance(deal, rec.status, docType)) throw new Error('Generate the final ' + DOC_LABEL[docType] + ' first. Drafts waiting for approval cannot be sent.');
    var doc = finalDocFor_(dealId, docType, deal.version);
    if (!doc) throw new Error('No final ' + DOC_LABEL[docType] + ' PDF found for version ' + deal.version + '. Generate it again.');
    var c = deal.client || {};
    toEmail = String(toEmail || c.signatoryEmail || (c.businessContact || {}).email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) throw new Error('Enter a valid client email address.');
    revokeOpenAcceptances_(dealId, docType);
    var terms = {};
    (m.CommercialTerms || []).forEach(function (r) { terms[r.key] = r.value; });
    var days = docType === 'MSA' ? ACCEPT.msaValidDays : Number(terms.quote_valid_days || ACCEPT.orderFormValidDays);
    var expires = new Date(Date.now() + days * 86400000);
    var token = newToken_();
    appendRecord_(ACCEPT_TAB, { token_hash: sha256Hex_(token), deal_id: dealId, doc_type: docType, doc_no: doc.doc_no, version: deal.version,
      client_email: toEmail, created_at: new Date(), expires_at: expires.toISOString(), status: 'Sent', otp_hash: '', otp_expires: '',
      otp_attempts: 0, otp_sends: 0, sent_by: user.email, accepted_name: '', accepted_title: '', accepted_email: '', accepted_at: '', method: '', signed_file_id: '' });
    var rep = ownerProfile_(user.email);
    var vars = emailVars_(deal, docType, doc.doc_no, rep);
    vars.Link = acceptBaseUrl_() + token; vars.ValidUntil = formatLongDate(expires);
    vars.SpecialTermsSentence = msaExceptions(deal) ? 'Section 7 records the special terms we agreed.' : 'It contains our standard terms, with no special terms.';
    var mail = renderEmailTemplate(emailTemplate_(docType === 'MSA' ? 'MSA_SENT' : 'OF_SENT'), vars);
    var cc = uniqEmails_([user.email, rec.created_by].concat(deal.clientCc || []), [toEmail]);
    MailApp.sendEmail({ to: toEmail, cc: cc.join(','), replyTo: user.email, name: 'OptCulture – ' + rep.name, subject: mail.subject, body: mail.body,
      attachments: [DriveApp.getFileById(doc.pdf_file_id).getBlob()] });
    deal.acceptance = deal.acceptance || {};
    deal.acceptance[docType] = { sentAt: new Date().toISOString(), to: toEmail, docNo: doc.doc_no, version: deal.version, sentBy: user.email, validUntil: expires.toISOString() };
    deal.status = docType === 'MSA' ? DEAL_STATUS.MSA_SENT : DEAL_STATUS.ORDER_FORM_SENT;
    rec.input_json = JSON.stringify(deal); rec.status = deal.status; rec.updated_at = new Date().toISOString();
    writeRecord_('Deals', rec, rec._row);
    audit_('SENT_FOR_ACCEPTANCE', { docType: docType, docNo: doc.doc_no, to: toEmail }, dealId, doc.doc_no);
    return { sentTo: toEmail, validUntil: expires.toISOString(), summary: dealSummary(rec), deal: deal };
  } finally {
    lock.releaseLock();
  }
}

/** The rep received a signed copy by email: upload it here (same effect as the client uploading it). */
function apiRecordSignedCopy(dealId, docType, fileName, base64, signerName, signerTitle) {
  var user = requireUser_();
  var m = getMaster_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rec = findDeal_(dealId);
    if (!rec || !canAccessDeal(user, rec.created_by, m.Users)) throw new Error('Deal not found or no access.');
    var deal = attachClientMsa_(JSON.parse(rec.input_json));
    if (!canSendForAcceptance(deal, rec.status, docType)) throw new Error('The final ' + DOC_LABEL[docType] + ' must be generated before a signed copy can be recorded.');
    var doc = finalDocFor_(dealId, docType, deal.version);
    if (!doc) throw new Error('No final ' + DOC_LABEL[docType] + ' found for version ' + deal.version + '.');
    var fileId = saveSignedPdf_(doc, fileName, base64);
    revokeOpenAcceptances_(dealId, docType);
    var info = { method: 'upload', name: String(signerName || '').trim(), title: String(signerTitle || '').trim(), email: '', at: new Date().toISOString(),
      signedFileId: fileId, recordedBy: user.email, ref: 'recorded by ' + user.email };
    var res = finalizeAcceptance_(dealId, docType, doc, info, user.email, []);
    return res;
  } finally {
    lock.releaseLock();
  }
}

/** Saves a signed PDF next to the generated document (app-owned; nobody gets new access except the deal owner/manager). */
function saveSignedPdf_(doc, fileName, base64) {
  var bytes = Utilities.base64Decode(String(base64 || ''));
  var header = bytes.slice(0, 5).map(function (b) { return String.fromCharCode(b & 255); }).join('');
  var errs = uploadErrors(fileName, bytes.length, header);
  if (errs.length) throw new Error(errs.join(' '));
  var folder = DriveApp.getFileById(doc.pdf_file_id).getParents().next();
  var name = doc.doc_no + '_SIGNED_' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyyMMdd-HHmm') + '.pdf';
  return folder.createFile(Utilities.newBlob(bytes, 'application/pdf', name)).getId();
}

/** Online acceptance: copy the final Google Doc, add the certificate page, export it as the accepted PDF. */
function makeCertificatePdf_(doc, info) {
  var src = DriveApp.getFileById(doc.doc_file_id);
  var folder = DriveApp.getFileById(doc.pdf_file_id).getParents().next();
  var copy = src.makeCopy(doc.doc_no + '_ACCEPTED_tmp', folder);
  try {
    var d = DocumentApp.openById(copy.getId()), body = d.getBody();
    body.appendPageBreak();
    body.appendParagraph('Electronic Acceptance Certificate').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph('This page was added by the OptCulture acceptance system and forms part of the accepted document.');
    var t = body.appendTable(certificateRows(info));
    t.setBorderColor(TABLE_STYLE.border);
    for (var r = 0; r < t.getNumRows(); r++) {
      t.getRow(r).getCell(0).setBackgroundColor(TABLE_STYLE.firstColBg).editAsText().setBold(true);
      for (var c = 0; c < 2; c++) t.getRow(r).getCell(c).setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8).setPaddingRight(8).editAsText().setFontSize(10);
    }
    d.saveAndClose();
    var pdf = folder.createFile(copy.getAs(MimeType.PDF)).setName(doc.doc_no + '_ACCEPTED.pdf');
    return pdf.getId();
  } finally {
    try { copy.setTrashed(true); } catch (e) { /* ignore */ }
  }
}

/** Common end of an acceptance (client online/upload or rep upload): deal status, Documents row, sharing, emails, audit. */
function finalizeAcceptance_(dealId, docType, doc, info, actor, ccEmails) {
  var rec = findDeal_(dealId);
  var deal = attachClientMsa_(JSON.parse(rec.input_json));
  var nd = applyAcceptance(deal, docType, info);
  nd.clientCc = uniqEmails_((deal.clientCc || []).concat(ccEmails || []), []);  // saved for the MSA emails
  rec.input_json = JSON.stringify(nd); rec.status = nd.status; rec.updated_at = new Date().toISOString();
  writeRecord_('Deals', rec, rec._row);
  appendRecord_('Documents', { doc_no: doc.doc_no, deal_id: dealId, doc_type: docType, language: doc.language || '', version: doc.version,
    template_version: '', doc_file_id: '', pdf_file_id: info.signedFileId, created_by: actor, created_at: new Date(),
    status: info.method === 'upload' ? 'Signed copy' : 'Accepted online' });
  var owner = ownerProfile_(rec.created_by);
  shareFiles_([info.signedFileId], [owner.email, owner.manager].filter(Boolean));
  if (nd.status === DEAL_STATUS.WON) { try { recordClientMsa_(nd); } catch (e) { notifyFailure_('Recording client MSA for ' + dealId, e); } }
  // ONE confirmation email: client (To), added client addresses + rep + sender + Superadmin (CC), signed PDF attached.
  try {
    var c = nd.client || {};
    var to = info.email || ((nd.acceptance || {})[docType] || {}).to || c.signatoryEmail || (c.businessContact || {}).email;
    var sentBy = ((deal.acceptance || {})[docType] || {}).sentBy || '';
    var vars = emailVars_(nd, docType, doc.doc_no, owner);
    vars.AcceptedHow = (info.method === 'upload' ? 'signed and uploaded by ' : 'accepted online by ') + [info.name, info.title].filter(String).join(', ');
    vars.AcceptedAt = dubaiTime_(new Date(info.at || Date.now()));
    vars.NextStep = orderFormNextStep(nd.stage === 'MSA' && nd.status !== DEAL_STATUS.WON, vars.MsaNo);
    var mail = renderEmailTemplate(emailTemplate_(docType === 'MSA' ? 'MSA_CONFIRMED' : 'OF_CONFIRMED'), vars);
    var cc = uniqEmails_(nd.clientCc.concat([owner.email, sentBy]).concat(superadminEmails_()), [to]);
    MailApp.sendEmail({ to: to, cc: cc.join(','), replyTo: owner.email, name: 'OptCulture – ' + owner.name, subject: mail.subject, body: mail.body,
      attachments: [DriveApp.getFileById(info.signedFileId).getBlob()] });
  } catch (e) { console.warn('confirmation email failed: ' + e); notifyFailure_('Acceptance confirmation email for ' + dealId, e); }
  audit_('CLIENT_ACCEPTED', { docType: docType, docNo: doc.doc_no, method: info.method, by: info.name || actor, status: nd.status, cc: nd.clientCc }, dealId, doc.doc_no);
  return { status: nd.status, stage: nd.stage, summary: dealSummary(rec), deal: nd };
}

// ---------------- public (client) API – token only ----------------

/**
 * JSON endpoint for the client page hosted on salestools.optculturecx.com (fetch without cookies). Routes ONLY to the four
 * token-based functions below; anything else is refused.
 */
function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var routes = { apiAcceptInfo: apiAcceptInfo, apiAcceptSendCode: apiAcceptSendCode, apiAcceptVerify: apiAcceptVerify, apiAcceptOnline: apiAcceptOnline, apiAcceptUpload: apiAcceptUpload };
    var fn = routes[req.fn];
    if (!fn) throw new Error('Unknown request.');
    out = { ok: true, result: fn.apply(null, Array.isArray(req.args) ? req.args : []) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function findAcceptance_(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return null;
  var h = sha256Hex_(token);
  return readRecords_(ACCEPT_TAB).filter(function (r) { return r.token_hash === h; })[0] || null;
}

/** What the client page shows. The PDF is returned only while the link is open. */
function apiAcceptInfo(token) {
  var a = findAcceptance_(token);
  var state = acceptanceState(a, new Date());
  if (!a) return { state: 'REVOKED' };
  var rec = findDeal_(a.deal_id);
  var deal = rec ? JSON.parse(rec.input_json) : {};
  var m = getMaster_();
  var entity = (m.Entities || []).filter(function (e) { return e.entity_id === deal.entityId; })[0] || {};
  var rep = ownerProfile_(rec ? rec.created_by : '');
  var out = { state: state, docLabel: DOC_LABEL[a.doc_type], docNo: a.doc_no, clientName: (deal.client || {}).legalName || '', entityName: entity.legal_name || 'OptCulture',
    repName: rep.name, repEmail: rep.email, email: maskEmail(a.client_email), validUntil: formatLongDate(new Date(a.expires_at)),
    acceptedAt: a.accepted_at ? dubaiTime_(new Date(a.accepted_at)) : '', method: a.method };
  if (state === 'OK') {
    var doc = finalDocFor_(a.deal_id, a.doc_type, a.version);
    if (!doc) { out.state = 'REVOKED'; return out; }
    out.pdf = Utilities.base64Encode(DriveApp.getFileById(doc.pdf_file_id).getBlob().getBytes());
    out.fileName = doc.doc_no + '.pdf';
  }
  return out;
}

function apiAcceptSendCode(token) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var a = findAcceptance_(token);
    var can = canSendCode(a, new Date());
    if (!can.ok) throw new Error(acceptMessage_(can.reason));
    var code = String(100000 + Math.floor(Math.random() * 900000));
    a.otp_hash = sha256Hex_(a.token_hash + code);
    a.otp_expires = new Date(Date.now() + ACCEPT.codeMinutes * 60000).toISOString();
    a.otp_sends = Number(a.otp_sends || 0) + 1;
    writeRecord_(ACCEPT_TAB, a, a._row);
    var rec = findDeal_(a.deal_id), deal = rec ? attachClientMsa_(JSON.parse(rec.input_json)) : {};
    var vars = emailVars_(deal, a.doc_type, a.doc_no, ownerProfile_(rec ? rec.created_by : ''));
    vars.Code = code; vars.Minutes = ACCEPT.codeMinutes;
    var mail = renderEmailTemplate(emailTemplate_('CODE'), vars);
    MailApp.sendEmail({ to: a.client_email, name: 'OptCulture', subject: mail.subject, body: mail.body });
    return { sentTo: maskEmail(a.client_email), minutes: ACCEPT.codeMinutes };
  } finally {
    lock.releaseLock();
  }
}

/** Verifies the code; counts wrong attempts and locks the link after the limit. */
function verifyCode_(a, code) {
  var r = checkCode(a, sha256Hex_(a.token_hash + String(code || '').trim()), new Date());
  if (r.ok) return;
  if (r.reason === 'WRONG_CODE') {
    a.otp_attempts = Number(a.otp_attempts || 0) + 1;
    if (a.otp_attempts >= ACCEPT.maxAttempts) a.status = 'Locked';
    writeRecord_(ACCEPT_TAB, a, a._row);
    throw new Error(a.status === 'Locked' ? acceptMessage_('LOCKED') : 'The code is not correct. ' + r.attemptsLeft + ' attempt(s) left.');
  }
  throw new Error(acceptMessage_(r.reason));
}

/** Step 2: check the code now; on success the client gets a 30-minute verified session (ticket) for step 3. */
function apiAcceptVerify(token, code) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var a = findAcceptance_(token);
    if (!a) throw new Error(acceptMessage_('REVOKED'));
    verifyCode_(a, code);
    var ticket = newToken_();
    a.session_hash = sha256Hex_(ticket);
    a.session_expires = new Date(Date.now() + ACCEPT_SESSION_MINUTES * 60000).toISOString();
    a.otp_hash = '';  // the code is used up
    writeRecord_(ACCEPT_TAB, a, a._row);
    return { ticket: ticket, email: maskEmail(a.client_email), minutes: ACCEPT_SESSION_MINUTES };
  } finally {
    lock.releaseLock();
  }
}

function verifySession_(a, ticket) {
  if (/^\d{6}$/.test(String(ticket || '').trim())) { verifyCode_(a, ticket); return; }  // older page: code entered at Accept
  var r = checkSession(a, sha256Hex_(String(ticket || '')), new Date());
  if (!r.ok) throw new Error(acceptMessage_(r.reason));
}

function ccFrom_(input) {
  var p = parseCcEmails(input);
  if (p.errors.length) throw new Error(p.errors.join(' '));
  return p.emails;
}

function apiAcceptOnline(token, ticket, name, title, agreed, ccInput) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var a = findAcceptance_(token);
    if (!a) throw new Error(acceptMessage_('REVOKED'));
    verifySession_(a, ticket);
    var cc = ccFrom_(ccInput);
    var errs = signerErrors(name, title);
    if (!agreed) errs.push('Please tick the box to confirm your acceptance.');
    if (errs.length) throw new Error(errs.join(' '));
    var doc = finalDocFor_(a.deal_id, a.doc_type, a.version);
    if (!doc) throw new Error(acceptMessage_('REVOKED'));
    var rec = findDeal_(a.deal_id), deal = JSON.parse(rec.input_json), m = getMaster_();
    var entity = (m.Entities || []).filter(function (e) { return e.entity_id === deal.entityId; })[0] || {};
    var now = new Date();
    var info = { method: 'online', name: String(name).trim(), title: String(title).trim(), email: a.client_email, at: now.toISOString(), ref: a.token_hash.slice(0, 16) };
    info.signedFileId = makeCertificatePdf_(doc, { docLabel: DOC_LABEL[a.doc_type], docNo: a.doc_no, version: a.version, entityName: entity.legal_name || 'OptCulture',
      clientName: (deal.client || {}).legalName, name: info.name, title: info.title, email: a.client_email,
      atText: dubaiTime_(now) + ' / ' + Utilities.formatDate(now, 'UTC', 'd MMM yyyy, HH:mm') + ' UTC', ref: info.ref });
    a.status = 'Accepted'; a.accepted_name = info.name; a.accepted_title = info.title; a.accepted_email = a.client_email; a.accepted_at = info.at;
    a.method = 'online'; a.signed_file_id = info.signedFileId; a.cc_emails = cc.join(','); a.session_hash = '';
    writeRecord_(ACCEPT_TAB, a, a._row);
    finalizeAcceptance_(a.deal_id, a.doc_type, doc, info, a.client_email, cc);
    return { ok: true, acceptedAt: dubaiTime_(now) };
  } finally {
    lock.releaseLock();
  }
}

function apiAcceptUpload(token, ticket, name, title, fileName, base64, ccInput) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var a = findAcceptance_(token);
    if (!a) throw new Error(acceptMessage_('REVOKED'));
    verifySession_(a, ticket);
    var cc = ccFrom_(ccInput);
    var errs = signerErrors(name, title);
    if (errs.length) throw new Error(errs.join(' '));
    var doc = finalDocFor_(a.deal_id, a.doc_type, a.version);
    if (!doc) throw new Error(acceptMessage_('REVOKED'));
    var fileId = saveSignedPdf_(doc, fileName, base64);
    var info = { method: 'upload', name: String(name).trim(), title: String(title).trim(), email: a.client_email, at: new Date().toISOString(), signedFileId: fileId, ref: a.token_hash.slice(0, 16) };
    a.status = 'Uploaded'; a.accepted_name = info.name; a.accepted_title = info.title; a.accepted_email = a.client_email; a.accepted_at = info.at;
    a.method = 'upload'; a.signed_file_id = fileId; a.cc_emails = cc.join(','); a.session_hash = '';
    writeRecord_(ACCEPT_TAB, a, a._row);
    finalizeAcceptance_(a.deal_id, a.doc_type, doc, info, a.client_email, cc);
    return { ok: true, acceptedAt: dubaiTime_(new Date()) };
  } finally {
    lock.releaseLock();
  }
}

function acceptMessage_(reason) {
  return {
    EXPIRED: 'This link has expired. Please ask your OptCulture contact for a new one.',
    DONE: 'This document has already been accepted. Thank you.',
    LOCKED: 'Too many wrong codes. This link is locked – please ask your OptCulture contact for a new one.',
    REVOKED: 'This link is no longer valid (the document may have been updated). Please ask your OptCulture contact for the latest link.',
    TOO_MANY_CODES: 'Too many codes were requested. Please ask your OptCulture contact for a new link.',
    NO_CODE: 'Please request a verification code first.',
    CODE_EXPIRED: 'The code has expired. Please request a new one.',
    NOT_VERIFIED: 'Please verify your email first (step 2).',
    SESSION_EXPIRED: 'Your verification has expired (30 minutes). Please request a new code and verify again.'
  }[reason] || 'This link cannot be used.';
}
