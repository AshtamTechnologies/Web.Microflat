/**
 * src/services/regions/regionService.js — Real Region service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { REGIONS_ENDPOINTS } from './regionsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  regionFromApi,
  regionsFromApi,
  regionToApiCreate,
  regionToApiUpdate,
  regionStatusToApi,
} from '../../models/regions/regionModel';

/**
 * Returns all regions, optionally filtered by isActive.
 * GET /api/regions
 * @param {{ isActive?: boolean|string, IsActive?: boolean|string }} [params]
 * @returns {Promise<import('../../models/regions/regionModel').RegionModel[]>}
 */
export async function listRegions(params = {}) {
  try {
    const query = {};
    const act = params.isActive ?? params.IsActive;
    if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
      query.IsActive = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    }

    const response = await axiosInstance.get(REGIONS_ENDPOINTS.REGIONS, {
      params: query,
    });
    return regionsFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single region by ID.
 * GET /api/regions/{id}
 * @param {number|string} id
 * @returns {Promise<import('../../models/regions/regionModel').RegionModel>}
 */
export async function getRegion(id) {
  try {
    const response = await axiosInstance.get(REGIONS_ENDPOINTS.REGION_BY_ID(id));
    return regionFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new region.
 * POST /api/regions
 * @param {{ regionName: string }} data
 * @returns {Promise<import('../../models/regions/regionModel').RegionModel>}
 */
export async function createRegion(data) {
  try {
    const payload = regionToApiCreate(data);
    const response = await axiosInstance.post(REGIONS_ENDPOINTS.REGIONS, payload);
    return regionFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing region by ID.
 * PUT /api/regions/{id}
 * @param {number|string} id
 * @param {{ regionName: string }} data
 * @returns {Promise<import('../../models/regions/regionModel').RegionModel>}
 */
export async function updateRegion(id, data) {
  try {
    const payload = regionToApiUpdate(data);
    const response = await axiosInstance.put(REGIONS_ENDPOINTS.REGION_BY_ID(id), payload);
    return regionFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates the active status of a region.
 * PATCH /api/regions/{id}/status
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
export async function updateRegionStatus(id, isActive) {
  try {
    const payload = regionStatusToApi(isActive);
    const response = await axiosInstance.patch(REGIONS_ENDPOINTS.REGION_STATUS(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
