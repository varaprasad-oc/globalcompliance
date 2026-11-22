/**
 * Client acceptance (decision 2026-11-21) – pure rules, tested in Node.
 * A client receives one secure link per document (Order Form or MSA). On that page they enter a one-time code sent to the
 * client email on the deal, then either accept online (name, title, "I accept") or upload a signed PDF. The link opens only
 * that one document; the client never gets Drive access.
 */

var ACCEPT = { codeMinutes: 15, maxAttempts: 5, maxCodes: 5, maxUploadBytes: 10 * 1024 * 1024, msaValidDays: 30, orderFormValidDays: 30 };

/** State of an acceptance record: OK | EXPIRED | DONE | LOCKED | REVOKED. rec = Acceptances row. */
function acceptanceState(rec, now) {
  if (!rec) return 'REVOKED';
  var st = String(rec.status || '');
  if (st === 'Accepted' || st === 'Uploaded') return 'DONE';
  if (st === 'Revoked') return 'REVOKED';
  if (st === 'Locked' || Number(rec.otp_attempts || 0) >= ACCEPT.maxAttempts) return 'LOCKED';
  var exp = Date.parse(rec.expires_at instanceof Date ? rec.expires_at.toISOString() : String(rec.expires_at || ''));
  if (!isNaN(exp) && new Date(now).getTime() > exp) return 'EXPIRED';
  return 'OK';
}

/** May a new code be sent? */
function canSendCode(rec, now) {
  var s = acceptanceState(rec, now);
  if (s !== 'OK') return { ok: false, reason: s };
  if (Number(rec.otp_sends || 0) >= ACCEPT.maxCodes) return { ok: false, reason: 'TOO_MANY_CODES' };
  return { ok: true };
}

/**
 * Check a code. codeHash = hash of the code the client typed (same salt as stored). Returns { ok, reason, attemptsLeft }.
 * The caller increments otp_attempts on every failed check.
 */
function checkCode(rec, codeHash, now) {
  var s = acceptanceState(rec, now);
  if (s !== 'OK') return { ok: false, reason: s, attemptsLeft: 0 };
  var left = ACCEPT.maxAttempts - Number(rec.otp_attempts || 0);
  if (!rec.otp_hash) return { ok: false, reason: 'NO_CODE', attemptsLeft: left };
  var exp = Date.parse(rec.otp_expires instanceof Date ? rec.otp_expires.toISOString() : String(rec.otp_expires || ''));
  if (isNaN(exp) || new Date(now).getTime() > exp) return { ok: false, reason: 'CODE_EXPIRED', attemptsLeft: left };
  if (String(codeHash) !== String(rec.otp_hash)) return { ok: false, reason: 'WRONG_CODE', attemptsLeft: left - 1 };
  return { ok: true, attemptsLeft: left };
}

/** Upload checks: a PDF (by header and name), not empty, at most 10 MB. headerText = first bytes as text. */
function uploadErrors(fileName, sizeBytes, headerText) {
  var e = [];
  if (!/\.pdf$/i.test(String(fileName || ''))) e.push('Please upload a PDF file.');
  if (String(headerText || '').indexOf('%PDF') !== 0) e.push('The file is not a valid PDF.');
  if (!(sizeBytes > 0)) e.push('The file is empty.');
  if (sizeBytes > ACCEPT.maxUploadBytes) e.push('The file is larger than 10 MB.');
  return e;
}

/** Required signer details. */
function signerErrors(name, title) {
  var e = [];
  if (String(name || '').trim().length < 2) e.push('Please enter your full name.');
  if (String(title || '').trim().length < 2) e.push('Please enter your designation.');
  return e;
}

function maskEmail(email) {
  var m = String(email || '').match(/^([^@]{1,2})[^@]*(@.*)$/);
  return m ? m[1] + '***' + m[2] : '';
}

/** Rows of the "Electronic acceptance certificate" page added to the accepted PDF. */
function certificateRows(info) {
  return [
    ['Document', info.docLabel + ' No. ' + info.docNo + ' (version ' + info.version + ')'],
    ['Parties', info.entityName + ' and ' + info.clientName],
    ['Accepted by', info.name + ', ' + info.title],
    ['Verified email', info.email + ' (one-time code sent to this address and entered by the signer)'],
    ['Accepted on', info.atText],
    ['Method', 'Online acceptance on the OptCulture acceptance page: the signer reviewed the document and confirmed "I accept".'],
    ['Reference', info.ref]
  ];
}

/**
 * Client emails come from the EmailTemplates tab (Superadmin can edit them in Admin). Placeholders are written {Name}.
 * Allowed placeholders per template – anything else is rejected when the template is saved.
 */
var EMAIL_VARS = {
  common: ['DocTitle', 'DocNo', 'Client', 'ClientContact', 'Entity', 'RepName', 'RepTitle', 'RepEmail', 'RepPhone', 'RepSignature', 'OrderFormNo', 'MsaNo'],
  OF_SENT: ['Link', 'ValidUntil'],
  MSA_SENT: ['Link', 'ValidUntil', 'SpecialTermsSentence'],
  CODE: ['Code', 'Minutes'],
  OF_CONFIRMED: ['AcceptedHow', 'AcceptedAt', 'NextStep'],
  MSA_CONFIRMED: ['AcceptedHow', 'AcceptedAt']
};
var EMAIL_TEMPLATE_KEYS = ['OF_SENT', 'CODE', 'OF_CONFIRMED', 'MSA_SENT', 'MSA_CONFIRMED'];

/** Placeholders used in a template that are not allowed for its key. */
function unknownEmailPlaceholders(key, subject, body) {
  var allowed = EMAIL_VARS.common.concat(EMAIL_VARS[key] || []);
  var used = (String(subject || '') + '\n' + String(body || '')).match(/\{([A-Za-z]+)\}/g) || [];
  return used.map(function (t) { return t.slice(1, -1); }).filter(function (n, i, a) { return allowed.indexOf(n) === -1 && a.indexOf(n) === i; });
}

/** Fill a template: {Name} → value. Lines that end up empty because of an empty value-only line are dropped. */
function renderEmailTemplate(tpl, vars) {
  var fill = function (t) { return String(t || '').replace(/\{([A-Za-z]+)\}/g, function (m, n) { return vars[n] === undefined || vars[n] === null ? '' : String(vars[n]); }); };
  var lines = String(tpl.body || '').split('\n').filter(function (line) {
    var only = line.trim().match(/^\{([A-Za-z]+)\}$/);
    return !(only && !String(vars[only[1]] || '').trim());
  });
  return { subject: fill(tpl.subject).trim(), body: fill(lines.join('\n')).replace(/\n{3,}/g, '\n\n').trim() };
}

/** Rep signature block (empty parts skipped). */
function repSignature(rep, entityName) {
  return [rep.name + (rep.title ? ' · ' + rep.title : ''), [rep.email, rep.phone].filter(String).join(' · '), entityName].filter(function (x) { return String(x || '').trim(); }).join('\n');
}

/** "Also send the signed copy to": up to 5 valid, de-duplicated addresses. */
function parseCcEmails(input) {
  var list = Array.isArray(input) ? input : String(input || '').split(/[,;\s]+/);
  var emails = [], errors = [];
  list.map(function (e) { return String(e || '').trim().toLowerCase(); }).filter(String).forEach(function (e) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) errors.push('Not a valid email address: ' + e);
    else if (emails.indexOf(e) === -1) emails.push(e);
  });
  if (emails.length > 5) errors.push('Please add at most 5 email addresses.');
  return { emails: emails.slice(0, 5), errors: errors };
}

/** After the code is verified the client has a 30-minute session (a separate random ticket) to accept or upload. */
var ACCEPT_SESSION_MINUTES = 30;
function checkSession(rec, ticketHash, now) {
  var s = acceptanceState(rec, now);
  if (s !== 'OK') return { ok: false, reason: s };
  if (!rec.session_hash || String(ticketHash) !== String(rec.session_hash)) return { ok: false, reason: 'NOT_VERIFIED' };
  var exp = Date.parse(rec.session_expires instanceof Date ? rec.session_expires.toISOString() : String(rec.session_expires || ''));
  if (isNaN(exp) || new Date(now).getTime() > exp) return { ok: false, reason: 'SESSION_EXPIRED' };
  return { ok: true };
}

/** Next-step sentence of the Order Form confirmation. */
function orderFormNextStep(needsMsa, msaNo) {
  return needsMsa ? 'Our team will shortly share the Master Services Agreement for your review.'
    : 'Your order is confirmed' + (msaNo ? ' under Master Services Agreement ' + msaNo : '') + '. Our team will be in touch about the next steps.';
}

/** Email to the client with the acceptance link (legacy helper kept for tests; the live emails use the templates). */
function acceptanceEmail(o) {
  var subject = o.docLabel + ' ' + o.docNo + ' for your review and acceptance – ' + o.clientName;
  var lines = [
    'Dear ' + (o.contactName || o.clientName) + ',', '',
    'Please find attached the ' + o.docLabel + ' ' + o.docNo + ' from ' + o.entityName + '.', '',
    'You can review it and either accept it online or upload a signed copy here:', o.link, '',
    'For security, the page sends a one-time code to this email address before you can accept.',
    'The link is valid until ' + o.validUntil + ' and opens only this document.', '',
    'If you have any questions, simply reply to this email.', '',
    'Kind regards,', o.repName, o.repEmail + (o.repPhone ? ' · ' + o.repPhone : ''), 'OptCulture'
  ];
  return { subject: subject, body: lines.join('\n') };
}
