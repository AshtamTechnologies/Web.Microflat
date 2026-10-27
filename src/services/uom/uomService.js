/**
 * src/services/uom/uomService.js — Real UOM service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { UOM_ENDPOINTS } from './uomEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  uomFromApi,
  uomsFromApi,
  uomToApiCreate,
  uomToApiUpdate,
  uomStatusToApi,
} from '../../models/uom/uomModel';

/**
 * Returns all UOMs, optionally filtered by isActive.
 * @param {{ isActive?: boolean|string, IsActive?: boolean|string, search?: string }} [params]
 * @returns {Promise<import('../../models/uom/uomModel').UomModel[]>}
 */
export async function listUoms(params = {}) {
  try {
    const query = {};
    const act = params.isActive ?? params.IsActive;
    if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
      query.IsActive = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    }

    const response = await axiosInstance.get(UOM_ENDPOINTS.UOMS, {
      params: query,
    });
    return uomsFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single UOM by ID.
 * @param {number|string} id
 * @returns {Promise<import('../../models/uom/uomModel').UomModel>}
 */
export async function getUom(id) {
  try {
    const response = await axiosInstance.get(UOM_ENDPOINTS.UOM_BY_ID(id));
    return uomFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new UOM.
 * POST /api/uoms
 * @param {{ uomName: string, description?: string }} data
 * @returns {Promise<import('../../models/uom/uomModel').UomModel>}
 */
export async function createUom(data) {
  try {
    const payload = uomToApiCreate(data);
    const response = await axiosInstance.post(UOM_ENDPOINTS.UOMS, payload);
    return uomFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing UOM by ID.
 * PUT /api/uoms/{id}
 * @param {number|string} id
 * @param {{ uomName: string, description?: string }} data
 * @returns {Promise<import('../../models/uom/uomModel').UomModel>}
 */
export async function updateUom(id, data) {
  try {
    const payload = uomToApiUpdate(data);
    const response = await axiosInstance.put(UOM_ENDPOINTS.UOM_BY_ID(id), payload);
    return uomFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates the active status of a UOM.
 * PATCH /api/uoms/{id}/status
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
export async function updateUomStatus(id, isActive) {
  try {
    const payload = uomStatusToApi(isActive);
    const response = await axiosInstance.patch(UOM_ENDPOINTS.UOM_STATUS(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
