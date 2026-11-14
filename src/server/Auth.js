/** Sprint 1.3: authentication and roles. Every API call must go through requireUser_(). */

function getCurrentUser() {
  var email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) return { ok: false, reason: 'Could not read your Google account. Please sign in with your @' + CONFIG.ALLOWED_DOMAIN + ' account.' };
  if (email.split('@')[1] !== CONFIG.ALLOWED_DOMAIN) return { ok: false, email: email, reason: 'Only @' + CONFIG.ALLOWED_DOMAIN + ' accounts can use this app.' };
  var u = (getMaster().Users || []).filter(function (r) { return String(r.email).toLowerCase() === email; })[0];
  if (!u || !isTrue(u.active)) return { ok: false, email: email, reason: 'Your account is not set up yet. Please ask Amith (superadmin) to add you.' };
  return { ok: true, email: email, name: u.name, role: u.role, managerEmail: u.manager_email, region: u.region, phone: u.phone };
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
    (getMaster().Users || []).forEach(function (r) {
      if (String(r.manager_email).toLowerCase() === user.email) emails.push(String(r.email).toLowerCase());
    });
  }
  return emails;
}
