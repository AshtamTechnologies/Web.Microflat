/**
 * documentSeriesService.js — Real Document Series service calling backend APIs.
 *
 * Updated for Module-based series architecture per 4 Nov 2026 API spec:
 * - moduleId instead of documentTypeId
 * - listModules for left panel
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { DOCUMENT_SERIES_ENDPOINTS } from './documentSeriesEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  seriesFromApi,
  seriesListFromApi,
  seriesToApi,
} from '../../models/documentSeries/documentSeriesModel';

/**
 * Returns active modules for left panel.
 * @param {{ isActive?: boolean }} [params]
 * @returns {Promise<Array<{ id: number, moduleCode: string, moduleName: string, isActive: boolean }>>}
 */
export async function listModules(params = { isActive: true }) {
  try {
    const response = await axiosInstance.get(DOCUMENT_SERIES_ENDPOINTS.MODULES, { params });
    const data = response.data;
    const items = Array.isArray(data) ? data : data?.items || [];
    return items.map((m) => ({
      id: m.id,
      moduleId: m.id,
      moduleCode: m.moduleCode || '',
      moduleName: m.moduleName || '',
      isActive: Boolean(m.isActive),
      documentTypeCount: m.documentTypeCount || 0,
      approvalTypeCount: m.approvalTypeCount || 0,
    }));
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns all series versions for a given module (newest first).
 * @param {number|string} moduleId
 * @returns {Promise<Array<object>>}
 */
export async function listSeries(moduleId) {
  try {
    const response = await axiosInstance.get(DOCUMENT_SERIES_ENDPOINTS.SERIES, {
      params: { moduleId },
    });
    return seriesListFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns the currently active series version for a given module.
 * @param {number|string} moduleId
 * @returns {Promise<object|null>}
 */
export async function getCurrentSeries(moduleId) {
  try {
    const response = await axiosInstance.get(DOCUMENT_SERIES_ENDPOINTS.SERIES, {
      params: {
        moduleId,
        currentOnly: true,
      },
    });
    const list = seriesListFromApi(response.data);
    return list.length > 0 ? list[0] : null;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single series version by id.
 * @param {number|string} seriesId
 * @returns {Promise<object>}
 */
export async function getSeriesById(seriesId) {
  try {
    const response = await axiosInstance.get(DOCUMENT_SERIES_ENDPOINTS.SERIES_BY_ID(seriesId));
    return seriesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new series version for a module.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createSeries(data) {
  try {
    const payload = seriesToApi(data);
    const response = await axiosInstance.post(DOCUMENT_SERIES_ENDPOINTS.SERIES, payload);
    return seriesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an unused series version.
 * @param {number|string} seriesId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateSeries(seriesId, data) {
  try {
    const payload = seriesToApi(data);
    const response = await axiosInstance.put(DOCUMENT_SERIES_ENDPOINTS.SERIES_BY_ID(seriesId), payload);
    return seriesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes an unused series version.
 * @param {number|string} seriesId
 * @returns {Promise<void>}
 */
export async function deleteSeries(seriesId) {
  try {
    await axiosInstance.delete(DOCUMENT_SERIES_ENDPOINTS.SERIES_BY_ID(seriesId));
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Previews the next sequence number without reserving it.
 * @param {number|string} moduleId
 * @param {string} [documentDate] YYYY-MM-DD
 * @returns {Promise<{ documentNumber: string, seriesId: number, periodKey: string, runningNumber: number }>}
 */
export async function previewNextNumber(moduleId, documentDate) {
  try {
    const params = { moduleId };
    if (documentDate) params.documentDate = documentDate;
    const response = await axiosInstance.get(DOCUMENT_SERIES_ENDPOINTS.NEXT_NUMBER, { params });
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
