/**
 * roles.js — Role mapping and UI Permission evaluation.
 *
 * Maps backend API role names (e.g. 'Super Admin', 'Admin', 'Regional Manager')
 * case-insensitively to the role keys used in src/config/navigation.js:
 *   - 'ADMIN'
 *   - 'MANAGER'
 *   - 'PROCUREMENT'
 *   - 'USER'
 *
 * Unknown roles default to least privilege ('USER').
 * This is UI gating only; the backend enforces real permissions.
 */

export const NAV_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  PROCUREMENT: 'PROCUREMENT',
  USER: 'USER',
};

/**
 * Case-insensitive dictionary mapping API role names to navigation permission keys.
 * @type {Record<string, string>}
 */
const ROLE_TO_NAV_KEY_MAP = {
  'super admin': NAV_ROLES.ADMIN,
  admin: NAV_ROLES.ADMIN,
  manager: NAV_ROLES.MANAGER,
  'regional manager': NAV_ROLES.MANAGER,
  'country manager': NAV_ROLES.MANAGER,
  'continent manager': NAV_ROLES.MANAGER,
  'marketing manager': NAV_ROLES.MANAGER,
  procurement: NAV_ROLES.PROCUREMENT,
  'sales rep': NAV_ROLES.USER,
  supervisor: NAV_ROLES.USER,
  inspector: NAV_ROLES.USER,
  contributor: NAV_ROLES.USER,
  client: NAV_ROLES.USER,
  operator: NAV_ROLES.USER,
  viewer: NAV_ROLES.USER,
  user: NAV_ROLES.USER,
};

/**
 * Maps an API role string to a navigation permission role key.
 * Unknown roles default to 'USER' (least privilege).
 * @param {string} apiRoleName
 * @returns {string}
 */
export function mapRoleToNavKey(apiRoleName) {
  if (!apiRoleName || typeof apiRoleName !== 'string') {
    return NAV_ROLES.USER;
  }
  const normalized = apiRoleName.trim().toLowerCase();
  return ROLE_TO_NAV_KEY_MAP[normalized] || NAV_ROLES.USER;
}

/**
 * Evaluates whether a user has permission to view a UI item.
 * A user sees an item if ANY of their roles allows it.
 * If allowedRoles is not specified or empty, the item is public.
 *
 * @param {Array<string|{ roleName?: string, name?: string }>} userRoles
 * @param {string[]} [allowedRoles]
 * @returns {boolean}
 */
export function hasRolePermission(userRoles, allowedRoles) {
  if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return true;
  }

  if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
    return allowedRoles.includes(NAV_ROLES.USER);
  }

  // Extract raw role names from strings or role objects
  const rawNames = userRoles.map((r) => {
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object') return r.roleName || r.name || '';
    return '';
  });

  // Map to navigation role keys
  const mappedKeys = rawNames.map(mapRoleToNavKey);

  // User sees the item if ANY mapped key is in allowedRoles
  return mappedKeys.some((k) => allowedRoles.includes(k));
}
