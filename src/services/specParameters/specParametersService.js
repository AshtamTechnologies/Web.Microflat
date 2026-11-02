/**
 * src/services/specParameters/specParametersService.js — Real Spec Parameters service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { SPEC_PARAMETERS_ENDPOINTS } from './specParametersEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  specParameterFromApi,
  specParametersFromApi,
  specParameterToApiCreate,
  specParameterToApiUpdate,
  specParameterStatusToApi,
} from '../../models/specParameters/specParameterModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
};

/**
 * Returns paged spec parameters, filtered by search and status.
 * GET /api/spec-parameters
 *
 * @param {{
 *   search?: string,
 *   Search?: string,
 *   isActive?: boolean|string,
 *   IsActive?: boolean|string,
 *   pageNumber?: number,
 *   PageNumber?: number,
 *   pageSize?: number,
 *   PageSize?: number
 * }} [params]
 * @returns {Promise<{ items: import('../../models/specParameters/specParameterModel').SpecParameterModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }>}
 */
export async function listSpecParameters(params = {}) {
  try {
    const query = {};

    const search = params.Search ?? params.search;
    if (search !== undefined && search !== null && String(search).trim() !== '') {
      query.Search = String(search).trim();
    }

    const act = params.IsActive ?? params.isActive;
    if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
      query.IsActive = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    }

    const page = params.PageNumber ?? params.pageNumber;
    if (page !== undefined && page !== null && page > 0) {
      query.PageNumber = Number(page);
    }

    const size = params.PageSize ?? params.pageSize;
    if (size !== undefined && size !== null && size > 0) {
      query.PageSize = Number(size);
    }

    const response = await axiosInstance.get(SPEC_PARAMETERS_ENDPOINTS.SPEC_PARAMETERS, {
      params: query,
    });
    return specParametersFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single Spec Parameter by ID.
 * GET /api/spec-parameters/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('../../models/specParameters/specParameterModel').SpecParameterModel>}
 */
export async function getSpecParameter(id) {
  try {
    const response = await axiosInstance.get(SPEC_PARAMETERS_ENDPOINTS.SPEC_PARAMETER_BY_ID(id));
    return specParameterFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new Spec Parameter.
 * POST /api/spec-parameters
 *
 * @param {{ parameterName: string, unitSymbol?: string|null, toleranceUnitSymbol?: string|null }} data
 * @returns {Promise<import('../../models/specParameters/specParameterModel').SpecParameterModel>}
 */
export async function createSpecParameter(data) {
  try {
    const payload = specParameterToApiCreate(data);
    const response = await axiosInstance.post(SPEC_PARAMETERS_ENDPOINTS.SPEC_PARAMETERS, payload);
    return specParameterFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing Spec Parameter by ID.
 * PUT /api/spec-parameters/{id}
 *
 * @param {number|string} id
 * @param {{ parameterName: string, unitSymbol?: string|null, toleranceUnitSymbol?: string|null }} data
 * @returns {Promise<import('../../models/specParameters/specParameterModel').SpecParameterModel>}
 */
export async function updateSpecParameter(id, data) {
  try {
    const payload = specParameterToApiUpdate(data);
    const response = await axiosInstance.put(SPEC_PARAMETERS_ENDPOINTS.SPEC_PARAMETER_BY_ID(id), payload);
    return specParameterFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates Spec Parameter status.
 * PATCH /api/spec-parameters/{id}/status
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<void>}
 */
export async function updateSpecParameterStatus(id, isActive) {
  try {
    const payload = specParameterStatusToApi(isActive);
    await axiosInstance.patch(SPEC_PARAMETERS_ENDPOINTS.SPEC_PARAMETER_STATUS(id), payload);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

