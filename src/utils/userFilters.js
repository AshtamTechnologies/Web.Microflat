/**
 * userFilters.js — Local helpers for narrowing user lists in pickers.
 * These never mutate shared context data; callers filter their own copy.
 */

/** True when the user is active and does not hold the Client role. */
export function isAssignableUser(user) {
  if (!user) return false;
  if (user.isActive === false || user.isActive === 0) return false;
  const roleNames = [
    user.role,
    user.userType,
    ...(Array.isArray(user.roles) ? user.roles.map((r) => r?.roleName || r) : []),
  ]
    .filter(Boolean)
    .map((r) => String(r).trim().toUpperCase());
  return !roleNames.includes('CLIENT');
}
