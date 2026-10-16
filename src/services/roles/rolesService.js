/**
 * rolesService.js — Real roles service calling GET /api/roles.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { ROLES_ENDPOINTS } from './rolesEndpoints';
import { rolesFromApi } from '../../models/roles/roleModel';
import { normalizeApiError } from '../../utils/apiError';

/**
 * Retrieves roles list optionally filtered by active status.
 * @param {{ isActive?: boolean }} [params]
 * @returns {Promise<import('../../models/roles/roleModel').RoleModel[]>}
 */
export async function getRoles(params = {}) {
  try {
    const queryParams = {};
    if (typeof params.isActive === 'boolean') {
      queryParams.isActive = params.isActive;
    }

    const response = await axiosInstance.get(ROLES_ENDPOINTS.ROLES, {
      params: queryParams,
    });

    return rolesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}
