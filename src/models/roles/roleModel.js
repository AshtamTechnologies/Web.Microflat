/**
 * roleModel.js — Role typedefs, mappers, and factories.
 *
 * All field renaming between the API and app for Roles lives here:
 *   - roleId -> id
 *   - createdOn -> createdAt
 *   - lastUpdatedOn -> updatedAt
 *
 * @typedef {Object} ApiRoleDto
 * @property {number} roleId
 * @property {string} roleName
 * @property {boolean} isActive
 * @property {number} userCount
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} RoleModel
 * @property {number} id
 * @property {number} roleId
 * @property {string} name
 * @property {string} roleName
 * @property {boolean} isActive
 * @property {number} userCount
 * @property {string} createdAt
 * @property {string|null} updatedAt
 * @property {string} createdOn
 * @property {string|null} lastUpdatedOn
 */

/**
 * Creates an empty role model.
 * @returns {RoleModel}
 */
export function createEmptyRole() {
  return {
    id: 0,
    roleId: 0,
    name: '',
    roleName: '',
    isActive: true,
    userCount: 0,
    createdAt: '',
    updatedAt: null,
    createdOn: '',
    lastUpdatedOn: null,
  };
}

/**
 * Maps a raw API RoleDto to a normalized RoleModel.
 * @param {ApiRoleDto} api
 * @returns {RoleModel}
 */
export function roleFromApi(api) {
  if (!api) return createEmptyRole();

  return {
    id: api.roleId,
    roleId: api.roleId,
    name: api.roleName || '',
    roleName: api.roleName || '',
    isActive: Boolean(api.isActive),
    userCount: api.userCount ?? 0,
    createdAt: api.createdOn || '',
    updatedAt: api.lastUpdatedOn || null,
    createdOn: api.createdOn || '',
    lastUpdatedOn: api.lastUpdatedOn || null,
  };
}

/**
 * Maps a list of raw API RoleDtos.
 * @param {ApiRoleDto[]} [list]
 * @returns {RoleModel[]}
 */
export function rolesFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(roleFromApi);
}
