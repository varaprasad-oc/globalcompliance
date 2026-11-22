const C = () => global.__ctx;
const now = new Date('2026-11-21T10:00:00Z');
const rec = (o) => Object.assign({ status: 'Sent', expires_at: '2026-12-21T10:00:00Z', otp_hash: 'h1', otp_expires: '2026-11-21T10:10:00Z', otp_attempts: 0, otp_sends: 1 }, o || {});

test('Acceptance link states: open, expired, done, locked, revoked', () => {
  eq([C().acceptanceState(rec(), now), C().acceptanceState(rec({ expires_at: '2026-11-20T00:00:00Z' }), now), C().acceptanceState(rec({ status: 'Accepted' }), now),
    C().acceptanceState(rec({ otp_attempts: 5 }), now), C().acceptanceState(rec({ status: 'Revoked' }), now), C().acceptanceState(null, now)],
    ['OK', 'EXPIRED', 'DONE', 'LOCKED', 'REVOKED', 'REVOKED']);
});

test('One-time code: right code passes; wrong or expired code fails; 5 codes max', () => {
  eq(C().checkCode(rec(), 'h1', now), { ok: true, attemptsLeft: 5 });
  eq(C().checkCode(rec({ otp_attempts: 2 }), 'zz', now), { ok: false, reason: 'WRONG_CODE', attemptsLeft: 2 });
  eq(C().checkCode(rec(), 'h1', new Date('2026-11-21T10:20:00Z')).reason, 'CODE_EXPIRED');
  eq(C().checkCode(rec({ otp_hash: '' }), 'h1', now).reason, 'NO_CODE');
  eq([C().canSendCode(rec(), now).ok, C().canSendCode(rec({ otp_sends: 5 }), now).reason], [true, 'TOO_MANY_CODES']);
});

test('Upload accepts only real PDFs up to 10 MB; signer must give name and designation', () => {
  eq(C().uploadErrors('signed.pdf', 2000, '%PDF-1.7'), []);
  eq(C().uploadErrors('signed.docx', 2000, 'PK'), ['Please upload a PDF file.', 'The file is not a valid PDF.']);
  eq(C().uploadErrors('big.pdf', 11 * 1024 * 1024, '%PDF'), ['The file is larger than 10 MB.']);
  eq(C().signerErrors('A', ''), ['Please enter your full name.', 'Please enter your designation.']);
  eq(C().maskEmail('ahmed@frg.example'), 'ah***@frg.example');
});

test('Certificate and client email carry the evidence and the link', () => {
  const rows = C().certificateRows({ docLabel: 'Quotation & Order Form', docNo: 'OC-Q-2026-0009', version: 2, entityName: 'RIS Services DMCC', clientName: 'FRG', name: 'A. Client', title: 'CEO', email: 'a@frg.example', atText: '21 Nov 2026 14:00 (Dubai)', ref: 'abc123' });
  eq(rows.map((r) => r[0]), ['Document', 'Parties', 'Accepted by', 'Verified email', 'Accepted on', 'Method', 'Reference']);
  eq(rows[0][1], 'Quotation & Order Form No. OC-Q-2026-0009 (version 2)');
  const m = C().acceptanceEmail({ docLabel: 'Quotation & Order Form', docNo: 'OC-Q-2026-0009', clientName: 'FRG', entityName: 'RIS Services DMCC', link: 'https://salestools.optculturecx.com/accept/T', validUntil: '21 December 2026', repName: 'Varaprasad SN', repEmail: 'v@optculture.com' });
  eq([/accept\/T/.test(m.body), /one-time code/.test(m.body), m.subject], [true, true, 'Quotation & Order Form OC-Q-2026-0009 for your review and acceptance – FRG']);
});

test('Verified session: required for accept/upload, expires after 30 minutes', () => {
  const r = rec({ session_hash: 's1', session_expires: '2026-11-21T10:30:00Z' });
  eq([C().checkSession(r, 's1', now).ok, C().checkSession(r, 'zz', now).reason, C().checkSession(rec(), 's1', now).reason,
    C().checkSession(r, 's1', new Date('2026-11-21T10:31:00Z')).reason], [true, 'NOT_VERIFIED', 'NOT_VERIFIED', 'SESSION_EXPIRED']);
});

test('"Also send the signed copy to": up to 5 valid, de-duplicated addresses', () => {
  eq(C().parseCcEmails('Finance@frg.example, legal@frg.example; finance@frg.example'), { emails: ['finance@frg.example', 'legal@frg.example'], errors: [] });
  eq(C().parseCcEmails('nope, a@b.co').errors, ['Not a valid email address: nope']);
  eq(C().parseCcEmails('a@x.co,b@x.co,c@x.co,d@x.co,e@x.co,f@x.co').errors, ['Please add at most 5 email addresses.']);
  eq(C().parseCcEmails('').emails, []);
});

test('Email templates: seeded A–E use only allowed placeholders, render with the system note; unknown placeholders are rejected on save', () => {
  const rows = C().SEED.EmailTemplates.rows;
  eq(rows.map((r) => r[0]), ['OF_SENT', 'CODE', 'OF_CONFIRMED', 'MSA_SENT', 'MSA_CONFIRMED']);
  rows.forEach((r) => eq(C().unknownEmailPlaceholders(r[0], r[1], r[2]), [], r[0]));
  const rep = { name: 'Varaprasad SN', title: '', email: 'varaprasad@optculture.com', phone: '+971 52 904 5457' };
  const m = C().renderEmailTemplate({ subject: rows[2][1], body: rows[2][2] }, { DocTitle: 'Quotation & Order Form', DocNo: 'OC-Q-2026-0009', Client: 'FRG', ClientContact: 'Ahmed Hassan',
    AcceptedHow: 'accepted online by Ahmed Hassan, CEO', AcceptedAt: '22 Nov 2026, 10:00 (Dubai time)', NextStep: C().orderFormNextStep(true), RepName: rep.name, RepEmail: rep.email, RepSignature: C().repSignature(rep, 'RIS Services DMCC') });
  eq(m.subject, 'Confirmed: Quotation & Order Form OC-Q-2026-0009 – FRG');
  eq([/Dear Ahmed Hassan,/.test(m.body), /accepted online by Ahmed Hassan, CEO on 22 Nov 2026/.test(m.body), /Master Services Agreement for your review/.test(m.body),
    /Varaprasad SN\nvaraprasad@optculture.com · \+971 52 904 5457\nRIS Services DMCC/.test(m.body), /system generated\. For any changes, please contact Varaprasad SN \(varaprasad@optculture.com\)/.test(m.body)], [true, true, true, true, true]);
  const H = ['template_key', 'subject', 'body', 'notes'];
  eq(C().coerceAdminRow('EmailTemplates', H, { template_key: 'CODE', subject: 'Code {Code}', body: 'Hi {Nmae}', notes: '' }).ok, false);
  eq(C().coerceAdminRow('EmailTemplates', H, { template_key: 'CODE', subject: 'Code {Code}', body: 'Your code {Code} – {RepName}', notes: '' }).ok, true);
});
