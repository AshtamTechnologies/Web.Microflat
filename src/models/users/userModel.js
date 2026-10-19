/**
 * userModel.js — User typedefs, mappers, and factories.
 *
 * ALL field renaming between the API and app for Users lives here:
 *   - userId -> id
 *   - createdOn -> createdAt
 *   - lastUpdatedOn -> updatedAt
 *
 * @typedef {Object} NormalizedRole
 * @property {number|null} roleId
 * @property {string} roleName
 * @property {boolean} isPrimary
 * @property {boolean} isActive
 *
 * @typedef {Object} UserModel
 * @property {string|number} id
 * @property {number} [userId]
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} mobile
 * @property {string} secondaryPhone
 * @property {string} address
 * @property {boolean} isActive
 * @property {boolean} isLockedOut
 * @property {boolean} mustChangePassword
 * @property {string|null} temporaryPasswordExpiresOn
 * @property {string} primaryRole
 * @property {NormalizedRole[]} roles
 * @property {string} role
 * @property {string} createdAt
 * @property {string|null} updatedAt
 * @property {string} createdOn
 * @property {string|null} lastUpdatedOn
 */

/**
 * Normalizes roles from either string[] (as returned by /api/auth/login)
 * or UserRoleDto[] (as returned by /api/users and /api/users/me).
 * Always returns [{ roleId, roleName, isPrimary, isActive }].
 *
 * For strings:
 *   roleId: null,
 *   isPrimary: (roleName equals primaryRole case-insensitively),
 *   isActive: true
 *
 * @param {Array<string|object>} [roles]
 * @param {string} [primaryRole]
 * @returns {NormalizedRole[]}
 */
export function normalizeRoles(roles, primaryRole = '') {
  if (!Array.isArray(roles) || roles.length === 0) {
    if (primaryRole) {
      return [{ roleId: null, roleName: primaryRole, isPrimary: true, isActive: true }];
    }
    return [];
  }

  const primaryLower = (primaryRole || '').trim().toLowerCase();

  return roles.map((r, index) => {
    // If element is a plain string
    if (typeof r === 'string') {
      const name = r.trim();
      const isPrimary = primaryLower ? name.toLowerCase() === primaryLower : index === 0;
      return {
        roleId: null,
        roleName: name,
        isPrimary,
        isActive: true,
      };
    }

    // If element is an object
    if (r && typeof r === 'object') {
      const name = r.roleName || r.name || '';
      const isPrimary =
        typeof r.isPrimary === 'boolean'
          ? r.isPrimary
          : primaryLower
          ? name.toLowerCase() === primaryLower
          : index === 0;

      return {
        roleId: r.roleId ?? r.id ?? null,
        roleName: name,
        isPrimary,
        isActive: r.isActive !== false,
      };
    }

    return {
      roleId: null,
      roleName: String(r || ''),
      isPrimary: false,
      isActive: true,
    };
  });
}

/**
 * Creates an empty user model.
 * @returns {UserModel}
 */
export function createEmptyUser() {
  return {
    id: '',
    userId: 0,
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    secondaryPhone: '',
    address: '',
    isActive: true,
    isLockedOut: false,
    mustChangePassword: false,
    temporaryPasswordExpiresOn: null,
    primaryRole: '',
    roles: [],
    role: '',
    createdAt: '',
    updatedAt: null,
    createdOn: '',
    lastUpdatedOn: null,
  };
}

/**
 * Maps a raw UserDto from the API to our internal UserModel.
 * @param {object} api
 * @returns {UserModel}
 */
export function userFromApi(api) {
  if (!api) return createEmptyUser();

  const primaryRole = api.primaryRole || '';
  const normalizedRoles = normalizeRoles(api.roles, primaryRole);
  const primaryObj = normalizedRoles.find((r) => r.isPrimary);
  const effectiveRole = primaryObj?.roleName || primaryRole || normalizedRoles[0]?.roleName || 'User';

  const rawId = api.userId !== undefined ? api.userId : api.id;
  const id = rawId !== undefined ? String(rawId) : '';

  return {
    id,
    userId: typeof rawId === 'number' ? rawId : Number(rawId) || 0,
    firstName: api.firstName || '',
    lastName: api.lastName || '',
    email: api.email || '',
    mobile: api.mobile || '',
    secondaryPhone: api.secondaryPhone || '',
    address: api.address || '',
    isActive: api.isActive !== undefined ? Boolean(api.isActive) : true,
    isLockedOut: Boolean(api.isLockedOut),
    mustChangePassword: Boolean(api.mustChangePassword),
    temporaryPasswordExpiresOn: api.temporaryPasswordExpiresOn || null,
    primaryRole: effectiveRole,
    roles: normalizedRoles,
    role: effectiveRole,
    createdAt: api.createdOn || api.createdAt || '',
    updatedAt: api.lastUpdatedOn || api.updatedAt || null,
    createdOn: api.createdOn || '',
    lastUpdatedOn: api.lastUpdatedOn || null,
  };
}

/**
 * Maps a list of raw UserDtos to UserModels.
 * @param {object[]} [list]
 * @returns {UserModel[]}
 */
export function usersFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(userFromApi);
}

/**
 * Converts a form object to the payload expected by POST /api/auth/register (RegisterUserRequestDto).
 * @param {object} form
 * @returns {object}
 */
export function userToRegisterApi(form) {
  const roleIds = Array.isArray(form.roleIds)
    ? form.roleIds.map(Number).filter((n) => !Number.isNaN(n) && n > 0)
    : [];

  const primaryRoleId =
    form.primaryRoleId !== undefined && form.primaryRoleId !== null && form.primaryRoleId !== ''
      ? Number(form.primaryRoleId)
      : (roleIds.length > 0 ? roleIds[0] : 0);

  return {
    firstName: (form.firstName || '').trim(),
    lastName: (form.lastName || '').trim(),
    email: (form.email || '').trim().toLowerCase(),
    mobile: (form.mobile || '').trim(),
    secondaryPhone: form.secondaryPhone ? form.secondaryPhone.trim() : null,
    address: form.address ? form.address.trim() : null,
    roleIds: roleIds.length > 0 ? roleIds : null,
    primaryRoleId: primaryRoleId || 0,
  };
}

/**
 * Converts a form object to the payload expected by PUT /api/users/{id} (UpdateUserRequestDto).
 * @param {object} form
 * @returns {object}
 */
export function userToUpdateApi(form) {
  return {
    firstName: (form.firstName || '').trim(),
    lastName: (form.lastName || '').trim(),
    mobile: (form.mobile || '').trim(),
    secondaryPhone: form.secondaryPhone ? form.secondaryPhone.trim() : null,
    address: form.address ? form.address.trim() : null,
    email: (form.email || '').trim().toLowerCase(),
  };
}

/**
 * Converts a form object to the payload expected by PUT /api/users/me (UpdateProfileRequestDto).
 * @param {object} form
 * @returns {object}
 */
export function userToProfileApi(form) {
  return {
    firstName: (form.firstName || '').trim(),
    lastName: (form.lastName || '').trim(),
    mobile: (form.mobile || '').trim(),
    secondaryPhone: form.secondaryPhone ? form.secondaryPhone.trim() : null,
    address: form.address ? form.address.trim() : null,
  };
}
