/**
 * src/services/clients/clientService.js — Real Client API service communicating with backend endpoints.
 * Implements 13 endpoints per Client API Integration Guide (Oct 30, 2026).
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { CLIENT_ENDPOINTS } from './clientEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  clientItemFromApi,
  clientDetailFromApi,
  clientHeaderFromApi,
  clientDetailToApi,
} from '../../models/clients/clientModel';

/**
 * 1. Paged client list.
 * GET /api/clients
 * @param {{ search?: string, contactType?: string, isActive?: boolean|string, hasScheduledChange?: boolean, countryId?: number, pageNumber?: number, pageSize?: number }} [params]
 */
export async function listClients(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.contactType && params.contactType !== 'ALL') {
      query.contactType = params.contactType;
    }
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== 'ALL') {
      query.isActive = typeof params.isActive === 'boolean'
        ? params.isActive
        : params.isActive === 'true' || params.isActive === 'ACTIVE';
    }
    if (params.hasScheduledChange !== undefined && params.hasScheduledChange !== null) {
      query.hasScheduledChange = Boolean(params.hasScheduledChange);
    }
    if (params.countryId) query.countryId = Number(params.countryId);
    if (params.pageNumber) query.pageNumber = Number(params.pageNumber);
    if (params.pageSize) query.pageSize = Number(params.pageSize);

    const response = await axiosInstance.get(CLIENT_ENDPOINTS.CLIENTS, { params: query });
    const data = response.data || {};
    const items = Array.isArray(data.items) ? data.items.map(clientItemFromApi) : [];

    return {
      items,
      pageNumber: data.pageNumber || 1,
      pageSize: data.pageSize || items.length,
      totalCount: data.totalCount ?? items.length,
      totalPages: data.totalPages || 1,
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 2. Dashboard counts.
 * GET /api/clients/summary
 */
export async function getClientSummary() {
  try {
    const response = await axiosInstance.get(CLIENT_ENDPOINTS.SUMMARY);
    return response.data || { total: 0, active: 0, inactive: 0, notYetEffective: 0, scheduledChanges: 0 };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 3. Dropdown values for the form.
 * GET /api/clients/lookups
 */
export async function getClientLookups() {
  try {
    const response = await axiosInstance.get(CLIENT_ENDPOINTS.LOOKUPS);
    return response.data || { contactTypes: [], addressTypes: [], paymentTerms: [], countries: [] };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 4. Active clients for client picker (e.g. inquiry).
 * GET /api/clients/active?search=
 * @param {string} [search]
 */
export async function getActiveClients(search = '') {
  try {
    const params = {};
    if (search?.trim()) params.search = search.trim();
    const response = await axiosInstance.get(CLIENT_ENDPOINTS.ACTIVE, { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 5. One client with its current version and timeline.
 * GET /api/clients/{id}
 * @param {number|string} id - clientId
 */
export async function getClientById(id) {
  try {
    const response = await axiosInstance.get(CLIENT_ENDPOINTS.CLIENT_BY_ID(id));
    return clientHeaderFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 6. Register a client with its first version.
 * POST /api/clients
 * @param {object} formData
 */
export async function createClient(formData) {
  try {
    const payload = clientDetailToApi(formData);
    const response = await axiosInstance.post(CLIENT_ENDPOINTS.CLIENTS, payload);
    return clientHeaderFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 7. Activate / deactivate client (Admin only).
 * PATCH /api/clients/{id}/status
 * @param {number|string} id - clientId
 * @param {boolean} isActive
 */
export async function updateClientStatus(id, isActive) {
  try {
    const response = await axiosInstance.patch(CLIENT_ENDPOINTS.STATUS(id), { isActive: Boolean(isActive) });
    return clientHeaderFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 8. Delete client and all versions (Admin only).
 * DELETE /api/clients/{id}
 * @param {number|string} id - clientId
 */
export async function deleteClient(id) {
  try {
    await axiosInstance.delete(CLIENT_ENDPOINTS.CLIENT_BY_ID(id));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 9. Version timeline.
 * GET /api/clients/{id}/versions
 * @param {number|string} id - clientId
 */
export async function getClientVersions(id) {
  try {
    const response = await axiosInstance.get(CLIENT_ENDPOINTS.VERSIONS(id));
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 10. Add a version (today or later).
 * POST /api/clients/{id}/versions
 * @param {number|string} id - clientId
 * @param {object} formData
 */
export async function addClientVersion(id, formData) {
  try {
    const payload = clientDetailToApi(formData);
    const response = await axiosInstance.post(CLIENT_ENDPOINTS.VERSIONS(id), payload);
    return clientDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 11. One version in full.
 * GET /api/client-versions/{versionId}
 * @param {number|string} versionId - clientDetailId
 */
export async function getClientVersionById(versionId) {
  try {
    const response = await axiosInstance.get(CLIENT_ENDPOINTS.VERSION_BY_ID(versionId));
    return clientDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 12. Edit a Current / Scheduled version.
 * PUT /api/client-versions/{versionId}
 * @param {number|string} versionId - clientDetailId
 * @param {object} formData
 */
export async function updateClientVersion(versionId, formData) {
  try {
    const payload = clientDetailToApi(formData);
    const response = await axiosInstance.put(CLIENT_ENDPOINTS.VERSION_BY_ID(versionId), payload);
    return clientDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 13. Delete a Scheduled version.
 * DELETE /api/client-versions/{versionId}
 * @param {number|string} versionId - clientDetailId
 */
export async function deleteClientVersion(versionId) {
  try {
    await axiosInstance.delete(CLIENT_ENDPOINTS.VERSION_BY_ID(versionId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

