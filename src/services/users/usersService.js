/**
 * usersService.js — Real users service calling backend API endpoints.
 * Returns mapped model objects and throws normalized ApiError.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { USERS_ENDPOINTS } from './usersEndpoints';
import { AUTH_ENDPOINTS } from '../auth/authEndpoints';
import {
  userFromApi,
  usersFromApi,
  userToRegisterApi,
  userToUpdateApi,
  userToProfileApi,
} from '../../models/users/userModel';
import { normalizeApiError } from '../../utils/apiError';

/**
 * Paged user list with optional search, status, and role filters.
 *
 * Query params supported by backend:
 *   - Search (string, max 100)
 *   - IsActive (boolean)
 *   - RoleId (integer)
 *   - PageNumber (integer >= 1)
 *   - PageSize (integer 1-100)
 *
 * @param {{ search?: string, isActive?: boolean, roleId?: number|string, pageNumber?: number, pageSize?: number }} [params]
 * @returns {Promise<{ items: import('../../models/users/userModel').UserModel[], pageNumber: number, pageSize: number, totalCount: number, totalPages: number }>}
 */
export async function getUsers(params = {}) {
  try {
    const query = {};

    if (params.search && params.search.trim()) {
      query.Search = params.search.trim();
    }
    if (typeof params.isActive === 'boolean') {
      query.IsActive = params.isActive;
    }
    if (params.roleId && params.roleId !== 'ALL') {
      query.RoleId = Number(params.roleId);
    }
    query.PageNumber = params.pageNumber && params.pageNumber > 0 ? Number(params.pageNumber) : 1;
    query.PageSize = params.pageSize && params.pageSize > 0 ? Number(params.pageSize) : 10;

    const response = await axiosInstance.get(USERS_ENDPOINTS.USERS, { params: query });
    const data = response.data || {};

    const items = usersFromApi(data.items || []);
    const pageNumber = data.pageNumber || query.PageNumber;
    const pageSize = data.pageSize || query.PageSize;
    const totalCount = data.totalCount !== undefined ? data.totalCount : items.length;
    const totalPages = data.totalPages !== undefined ? data.totalPages : Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items,
      pageNumber,
      pageSize,
      totalCount,
      totalPages,
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves a single user by ID.
 * @param {string|number} id
 * @returns {Promise<import('../../models/users/userModel').UserModel>}
 */
export async function getUserById(id) {
  try {
    const response = await axiosInstance.get(USERS_ENDPOINTS.USER_BY_ID(id));
    return userFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Registers a new user via POST /api/auth/register.
 * The API generates a temporary password and emails it to the user.
 * @param {object} formData
 * @returns {Promise<{ user: import('../../models/users/userModel').UserModel, temporaryPasswordEmailSent: boolean, temporaryPasswordExpiresOn: string|null, message: string }>}
 */
export async function createUser(formData) {
  try {
    const payload = userToRegisterApi(formData);
    const response = await axiosInstance.post(AUTH_ENDPOINTS.REGISTER, payload);
    const data = response.data || {};

    return {
      user: userFromApi(data.user),
      temporaryPasswordEmailSent: Boolean(data.temporaryPasswordEmailSent),
      temporaryPasswordExpiresOn: data.temporaryPasswordExpiresOn || null,
      message: data.message || 'User registered successfully. Temporary password has been sent by email.',
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates a user's assigned roles via PUT /api/users/{id}/roles.
 * Per specification: sends roleIds array and primaryRoleId = 0.
 * @param {string|number} id
 * @param {object} payload
 * @param {number[]} payload.roleIds
 * @param {number} [payload.primaryRoleId]
 * @returns {Promise<any>}
 */
export async function updateUserRoles(id, { roleIds }) {
  try {
    const payload = {
      roleIds: (roleIds || []).map((r) => Number(r) || 0),
      primaryRoleId: 0,
    };
    const response = await axiosInstance.put(USERS_ENDPOINTS.USER_ROLES(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates a user's details via PUT /api/users/{id} and roles via PUT /api/users/{id}/roles.
 * @param {string|number} id
 * @param {object} formData
 * @returns {Promise<import('../../models/users/userModel').UserModel>}
 */
export async function updateUser(id, formData) {
  try {
    const payload = userToUpdateApi(formData);
    await axiosInstance.put(USERS_ENDPOINTS.USER_BY_ID(id), payload);

    // If roleIds were modified/passed, update roles via PUT /api/users/{id}/roles
    if (Array.isArray(formData.roleIds) && formData.roleIds.length > 0) {
      await updateUserRoles(id, {
        roleIds: formData.roleIds,
        primaryRoleId: 0,
      });
    }

    return getUserById(id);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Activates or deactivates a user via PATCH /api/users/{id}/status.
 * @param {string|number} id
 * @param {boolean} isActive
 * @returns {Promise<import('../../models/users/userModel').UserModel>}
 */
export async function updateStatus(id, isActive) {
  try {
    const response = await axiosInstance.patch(USERS_ENDPOINTS.USER_STATUS(id), {
      isActive: Boolean(isActive),
    });
    return userFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates signed-in user's own profile via PUT /api/users/me.
 * @param {object} formData
 * @returns {Promise<import('../../models/users/userModel').UserModel>}
 */
export async function updateProfile(formData) {
  try {
    const payload = userToProfileApi(formData);
    const response = await axiosInstance.put(USERS_ENDPOINTS.USER_ME, payload);
    return userFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Declares supported and unsupported operations for the real API.
 * The UI consumes this to hide or disable unsupported actions instead of failing.
 */
export const capabilities = {
  delete: false, // Backend has no DELETE /api/users/{id}
  changeRoles: true, // Supported via PUT /api/users/{id}/roles
  sort: false, // GET /api/users has no sort query parameters
};
