/** Sprint 1.3: authentication and roles. Every API call must go through requireUser_(). */

function getCurrentUser() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) return { ok: false, reason: 'Could not read your Google account. Please sign in with your @' + CONFIG.ALLOWED_DOMAIN + ' account.' };
  if (email.split('@')[1] !== CONFIG.ALLOWED_DOMAIN) return { ok: false, email: email, reason: 'Only @' + CONFIG.ALLOWED_DOMAIN + ' accounts can use this app.' };
  var u = (getMaster_().Users || []).filter(function (r) { return String(r.email).toLowerCase() === email; })[0];
  if (!u || !isTrue(u.active)) return { ok: false, email: email, reason: 'Your account is not set up yet. Please ask Amith (superadmin) to add you.' };
  return { ok: true, email: email, name: u.name, role: u.role, managerEmail: u.manager_email, region: u.region, phone: u.phone };
}

/**
 * Owner/Superadmin-only tools (setup, triggers, backups, self-tests, health checks). Every top-level function can be called
 * from a web page via google.script.run, so these refuse anyone who is not the script owner (running from the editor) or a
 * Superadmin. Anonymous visitors of the public acceptance page have no active user and are always refused.
 */
function requireOperator_() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  var owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (email && email === owner) return;
  var u = getCurrentUser();
  if (u.ok && u.role === CONFIG.ROLES.SUPERADMIN) return;
  throw new Error('Not allowed.');
}

function requireUser_(allowedRoles) {
  var u = getCurrentUser();
  if (!u.ok) throw new Error(u.reason);
  if (allowedRoles && allowedRoles.indexOf(u.role) === -1) throw new Error('You do not have permission for this action.');
  return u;
}

/** Emails a user may see records for: own (Rep), own + team (Manager), all (Superadmin => null). */
function visibleOwners_(user) {
  if (user.role === CONFIG.ROLES.SUPERADMIN) return null;
  var emails = [user.email];
  if (user.role === CONFIG.ROLES.MANAGER) {
    (getMaster_().Users || []).forEach(function (r) {
      if (String(r.manager_email).toLowerCase() === user.email) emails.push(String(r.email).toLowerCase());
    });
  }
  return emails;
}
