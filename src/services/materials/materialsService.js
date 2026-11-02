/**
 * src/services/materials/materialsService.js — Real Materials service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { MATERIALS_ENDPOINTS } from './materialsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  materialFromApi,
  materialsFromApi,
  materialToApiCreate,
  materialToApiUpdate,
  materialStatusToApi,
} from '../../models/materials/materialModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
};

/**
 * Returns paged materials, filtered by search and status.
 * GET /api/materials
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
 * @returns {Promise<{ items: import('../../models/materials/materialModel').MaterialModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }>}
 */
export async function listMaterials(params = {}) {
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

    const response = await axiosInstance.get(MATERIALS_ENDPOINTS.MATERIALS, {
      params: query,
    });
    return materialsFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single Material by ID.
 * GET /api/materials/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('../../models/materials/materialModel').MaterialModel>}
 */
export async function getMaterial(id) {
  try {
    const response = await axiosInstance.get(MATERIALS_ENDPOINTS.MATERIAL_BY_ID(id));
    return materialFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new Material.
 * POST /api/materials
 *
 * @param {{ materialName: string }} data
 * @returns {Promise<import('../../models/materials/materialModel').MaterialModel>}
 */
export async function createMaterial(data) {
  try {
    const payload = materialToApiCreate(data);
    const response = await axiosInstance.post(MATERIALS_ENDPOINTS.MATERIALS, payload);
    return materialFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing Material by ID.
 * PUT /api/materials/{id}
 *
 * @param {number|string} id
 * @param {{ materialName: string }} data
 * @returns {Promise<import('../../models/materials/materialModel').MaterialModel>}
 */
export async function updateMaterial(id, data) {
  try {
    const payload = materialToApiUpdate(data);
    const response = await axiosInstance.put(MATERIALS_ENDPOINTS.MATERIAL_BY_ID(id), payload);
    return materialFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates Material status.
 * PATCH /api/materials/{id}/status
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<void>}
 */
export async function updateMaterialStatus(id, isActive) {
  try {
    const payload = materialStatusToApi(isActive);
    await axiosInstance.patch(MATERIALS_ENDPOINTS.MATERIAL_STATUS(id), payload);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

