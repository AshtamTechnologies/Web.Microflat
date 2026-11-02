/**
 * src/services/grades/gradesService.js — Real Grades service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { GRADES_ENDPOINTS } from './gradesEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  gradeFromApi,
  gradesFromApi,
  gradeToApiCreate,
  gradeToApiUpdate,
  gradeStatusToApi,
} from '../../models/grades/gradeModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
};

/**
 * Returns paged grades, filtered by search and status.
 * GET /api/grades
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
 * @returns {Promise<{ items: import('../../models/grades/gradeModel').GradeModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }>}
 */
export async function listGrades(params = {}) {
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

    const response = await axiosInstance.get(GRADES_ENDPOINTS.GRADES, {
      params: query,
    });
    return gradesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single Grade by ID.
 * GET /api/grades/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('../../models/grades/gradeModel').GradeModel>}
 */
export async function getGrade(id) {
  try {
    const response = await axiosInstance.get(GRADES_ENDPOINTS.GRADE_BY_ID(id));
    return gradeFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new Grade.
 * POST /api/grades
 *
 * @param {{ gradeCode: string }} data
 * @returns {Promise<import('../../models/grades/gradeModel').GradeModel>}
 */
export async function createGrade(data) {
  try {
    const payload = gradeToApiCreate(data);
    const response = await axiosInstance.post(GRADES_ENDPOINTS.GRADES, payload);
    return gradeFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing Grade by ID.
 * PUT /api/grades/{id}
 *
 * @param {number|string} id
 * @param {{ gradeCode: string }} data
 * @returns {Promise<import('../../models/grades/gradeModel').GradeModel>}
 */
export async function updateGrade(id, data) {
  try {
    const payload = gradeToApiUpdate(data);
    const response = await axiosInstance.put(GRADES_ENDPOINTS.GRADE_BY_ID(id), payload);
    return gradeFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates Grade status.
 * PATCH /api/grades/{id}/status
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<void>}
 */
export async function updateGradeStatus(id, isActive) {
  try {
    const payload = gradeStatusToApi(isActive);
    await axiosInstance.patch(GRADES_ENDPOINTS.GRADE_STATUS(id), payload);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

