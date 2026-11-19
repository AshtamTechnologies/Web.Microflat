/**
 * src/services/standards/standardsService.js — Real Standards service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { STANDARDS_ENDPOINTS } from './standardsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  standardFromApi,
  standardsFromApi,
  standardToApiCreate,
  standardToApiUpdate,
  standardStatusToApi,
  standardGradesToApi,
} from '../../models/standards/standardModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
  gradeMapping: true,
};

/**
 * Returns paged standards, filtered by search and status.
 * GET /api/standards
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
 * @returns {Promise<{ items: import('../../models/standards/standardModel').StandardModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }>}
 */
export async function listStandards(params = {}) {
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

    const response = await axiosInstance.get(STANDARDS_ENDPOINTS.STANDARDS, {
      params: query,
    });
    return standardsFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single Standard by ID.
 * GET /api/standards/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('../../models/standards/standardModel').StandardModel>}
 */
export async function getStandard(id) {
  try {
    const response = await axiosInstance.get(STANDARDS_ENDPOINTS.STANDARD_BY_ID(id));
    return standardFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new Standard.
 * POST /api/standards
 *
 * @param {{ standardCode: string }} data
 * @returns {Promise<import('../../models/standards/standardModel').StandardModel>}
 */
export async function createStandard(data) {
  try {
    const payload = standardToApiCreate(data);
    const response = await axiosInstance.post(STANDARDS_ENDPOINTS.STANDARDS, payload);
    return standardFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing Standard by ID.
 * PUT /api/standards/{id}
 *
 * @param {number|string} id
 * @param {{ standardCode: string }} data
 * @returns {Promise<import('../../models/standards/standardModel').StandardModel>}
 */
export async function updateStandard(id, data) {
  try {
    const payload = standardToApiUpdate(data);
    const response = await axiosInstance.put(STANDARDS_ENDPOINTS.STANDARD_BY_ID(id), payload);
    return standardFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates Standard status.
 * PATCH /api/standards/{id}/status
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<void>}
 */
export async function updateStandardStatus(id, isActive) {
  try {
    const payload = standardStatusToApi(isActive);
    await axiosInstance.patch(STANDARDS_ENDPOINTS.STANDARD_STATUS(id), payload);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns every standard with its allowed grades for dropdown filtering.
 * GET /api/standards/grade-mapping?activeOnly=true
 *
 * @param {boolean} [activeOnly=true]
 * @returns {Promise<Array<{ standardId: number, standardCode: string, isActive: boolean, grades: Array<{ id: number, standardId: number, standardCode: string, gradeId: number, gradeCode: string, isGradeActive: boolean, displayOrder: number }> }>>}
 */
export async function getGradeMapping(activeOnly = true) {
  try {
    const response = await axiosInstance.get(STANDARDS_ENDPOINTS.GRADE_MAPPING, {
      params: { activeOnly },
    });
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns allowed grades for a single standard in display order.
 * GET /api/standards/{id}/grades
 *
 * @param {number|string} standardId
 * @returns {Promise<Array<{ id: number, standardId: number, standardCode: string, gradeId: number, gradeCode: string, isGradeActive: boolean, displayOrder: number }>>}
 */
export async function getStandardGrades(standardId) {
  try {
    const response = await axiosInstance.get(STANDARDS_ENDPOINTS.STANDARD_GRADES(standardId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Replaces a standard's allowed grades.
 * PUT /api/standards/{id}/grades
 *
 * @param {number|string} standardId
 * @param {Array<{ gradeId: number, displayOrder?: number }>} gradesArray
 * @returns {Promise<Array<{ id: number, standardId: number, standardCode: string, gradeId: number, gradeCode: string, isGradeActive: boolean, displayOrder: number }>>}
 */
export async function updateStandardGrades(standardId, gradesArray = []) {
  try {
    const seen = new Set();
    for (let i = 0; i < gradesArray.length; i++) {
      const gId = Number(gradesArray[i]?.gradeId);
      if (seen.has(gId)) {
        throw new Error(`Grade ID ${gId} is listed more than once.`);
      }
      if (gId) seen.add(gId);
    }

    const payload = standardGradesToApi(gradesArray);
    const response = await axiosInstance.put(STANDARDS_ENDPOINTS.STANDARD_GRADES(standardId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

