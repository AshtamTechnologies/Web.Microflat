/**
 * src/services/documentTypes/documentTypesService.js — Real Document Types service calling backend APIs.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { DOCUMENT_TYPES_ENDPOINTS } from './documentTypesEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  documentTypeFromApi,
  documentTypesFromApi,
  documentTypeToApi,
  modulesFromApi,
} from '../../models/documentTypes/documentTypeModel';

// Re-export for backward compatibility
export const normalizeDocumentType = documentTypeFromApi;

/**
 * Returns all document types, optionally filtered by moduleId, moduleCode, or isActive.
 * @param {{ moduleId?: number|string, ModuleId?: number|string, moduleCode?: string, ModuleCode?: string, isActive?: boolean|string, IsActive?: boolean|string }} [params]
 * @returns {Promise<import('../../models/documentTypes/documentTypeModel').DocumentTypeModel[]>}
 */
export async function listDocumentTypes(params = {}) {
  try {
    const query = {};
    const modId = params.moduleId ?? params.ModuleId;
    if (modId !== undefined && modId !== null && modId !== '' && modId !== 'ALL') {
      query.ModuleId = Number(modId);
    }
    const modCode = params.moduleCode ?? params.ModuleCode;
    if (modCode && modCode !== 'ALL') {
      query.ModuleCode = modCode;
    }
    const act = params.isActive ?? params.IsActive;
    if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
      query.IsActive = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    }

    const response = await axiosInstance.get(DOCUMENT_TYPES_ENDPOINTS.DOCUMENT_TYPES, {
      params: query,
    });
    return documentTypesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single document type by ID.
 * @param {number|string} id
 * @returns {Promise<import('../../models/documentTypes/documentTypeModel').DocumentTypeModel>}
 */
export async function getDocumentType(id) {
  try {
    const response = await axiosInstance.get(DOCUMENT_TYPES_ENDPOINTS.DOCUMENT_TYPE_BY_ID(id));
    return documentTypeFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new document type.
 * @param {{ moduleId: number, documentTypeName: string, description?: string, maxFileSizeMB?: number, allowedExtensions: string|string[] }} data
 * @returns {Promise<import('../../models/documentTypes/documentTypeModel').DocumentTypeModel>}
 */
export async function createDocumentType(data) {
  try {
    const payload = documentTypeToApi(data);
    const response = await axiosInstance.post(DOCUMENT_TYPES_ENDPOINTS.DOCUMENT_TYPES, payload);
    return documentTypeFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing document type.
 * @param {number|string} id
 * @param {{ moduleId: number, documentTypeName: string, description?: string, maxFileSizeMB?: number, allowedExtensions: string|string[] }} data
 * @returns {Promise<import('../../models/documentTypes/documentTypeModel').DocumentTypeModel>}
 */
export async function updateDocumentType(id, data) {
  try {
    const payload = documentTypeToApi(data);
    const response = await axiosInstance.put(DOCUMENT_TYPES_ENDPOINTS.DOCUMENT_TYPE_BY_ID(id), payload);
    return documentTypeFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates the active status of a document type.
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
export async function updateDocumentTypeStatus(id, isActive) {
  try {
    const payload = {
      isActive: Boolean(isActive),
    };
    const response = await axiosInstance.patch(DOCUMENT_TYPES_ENDPOINTS.DOCUMENT_TYPE_STATUS(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves the list of active modules.
 * @param {{ isActive?: boolean }} [params]
 * @returns {Promise<import('../../models/documentTypes/documentTypeModel').ModuleModel[]>}
 */
export async function listModules(params = { isActive: true }) {
  try {
    const response = await axiosInstance.get(DOCUMENT_TYPES_ENDPOINTS.MODULES, { params });
    return modulesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}
