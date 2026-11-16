/**
 * emailTemplatesService.js — Real API service for Master Email Templates.
 * Conforms to Section 5.4i of Frontend-API-Guide 1.md.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { EMAIL_TEMPLATES_ENDPOINTS } from './emailTemplatesEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  emailTemplateFromApi,
  emailTemplatesFromApi,
  emailTemplateToCreateApi,
  emailTemplateToUpdateApi,
} from '../../models/emailTemplates/emailTemplateModel';

/**
 * Returns a paginated list of email templates with optional filters.
 *
 * @param {{ search?: string, moduleName?: string, status?: string, pageNumber?: number, pageSize?: number }} [params]
 * @returns {Promise<{ items: object[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }>}
 */
export async function listEmailTemplates(params = {}) {
  try {
    const query = {};

    const search = params.search ?? params.Search;
    if (search && String(search).trim()) {
      query.Search = String(search).trim();
    }

    const moduleName = params.moduleName ?? params.ModuleName;
    if (moduleName && moduleName !== 'ALL') {
      query.ModuleName = String(moduleName).trim().toUpperCase();
    }

    const status = params.status ?? params.Status;
    if (status && status !== 'ALL') {
      query.Status = String(status).trim();
    }

    const pageNumber = params.pageNumber ?? params.PageNumber;
    if (pageNumber) query.PageNumber = Number(pageNumber);

    const pageSize = params.pageSize ?? params.PageSize;
    if (pageSize) query.PageSize = Number(pageSize);

    const response = await axiosInstance.get(EMAIL_TEMPLATES_ENDPOINTS.TEMPLATES, {
      params: query,
    });

    return emailTemplatesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single email template by ID.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function getEmailTemplate(id) {
  try {
    const response = await axiosInstance.get(EMAIL_TEMPLATES_ENDPOINTS.TEMPLATE_BY_ID(id));
    return emailTemplateFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single email template by unique code (e.g. 'VENDOR_APPROVED').
 *
 * @param {string} code
 * @returns {Promise<object>}
 */
export async function getEmailTemplateByCode(code) {
  try {
    const response = await axiosInstance.get(EMAIL_TEMPLATES_ENDPOINTS.TEMPLATE_BY_CODE(code));
    return emailTemplateFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new email template (Admin only).
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createEmailTemplate(data) {
  try {
    const payload = emailTemplateToCreateApi(data);
    const response = await axiosInstance.post(EMAIL_TEMPLATES_ENDPOINTS.TEMPLATES, payload);
    return emailTemplateFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing email template by ID (Admin only).
 * Note: templateCode is immutable and omitted from the PUT payload.
 *
 * @param {number|string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateEmailTemplate(id, data) {
  try {
    const payload = emailTemplateToUpdateApi(data);
    const response = await axiosInstance.put(
      EMAIL_TEMPLATES_ENDPOINTS.TEMPLATE_BY_ID(id),
      payload
    );
    return emailTemplateFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Changes the active status of an email template (PATCH /api/email-templates/{id}/status).
 *
 * @param {number|string} id
 * @param {'Active'|'Inactive'} status
 * @returns {Promise<object>}
 */
export async function changeEmailTemplateStatus(id, status) {
  try {
    const payload = {
      status: String(status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
    };
    const response = await axiosInstance.patch(
      EMAIL_TEMPLATES_ENDPOINTS.STATUS(id),
      payload
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes an email template (Admin only).
 * Backend returns 409 Conflict if the template has ever been used in email logs.
 *
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
export async function deleteEmailTemplate(id) {
  try {
    await axiosInstance.delete(EMAIL_TEMPLATES_ENDPOINTS.TEMPLATE_BY_ID(id));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Generates a live preview with substituted placeholder values.
 *
 * @param {number|string} id
 * @param {Record<string, string>} values - E.g. { VendorName: 'ABC' }
 * @returns {Promise<{ subject: string, body: string, missingPlaceholders?: string[] }>}
 */
export async function previewEmailTemplate(id, values = {}) {
  try {
    const response = await axiosInstance.post(
      EMAIL_TEMPLATES_ENDPOINTS.PREVIEW(id),
      { values }
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Sends an email using a template (Admin only).
 *
 * @param {{ templateCode: string, toEmail: string, ccEmail?: string, values: Record<string, string>, moduleId?: number }} payload
 * @returns {Promise<object>}
 */
export async function sendEmailTemplate(payload) {
  try {
    const response = await axiosInstance.post(EMAIL_TEMPLATES_ENDPOINTS.SEND, payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Fetches active modules for the module dropdown (GET /api/modules?isActive=true).
 *
 * @param {{ isActive?: boolean }} [params]
 * @returns {Promise<Array<{ id: number, moduleCode: string, moduleName: string }>>}
 */
export async function listModules(params = { isActive: true }) {
  try {
    const response = await axiosInstance.get(EMAIL_TEMPLATES_ENDPOINTS.MODULES, {
      params,
    });
    const data = response.data;
    const list = Array.isArray(data) ? data : data.items || data.Items || [];
    return list.map((m) => ({
      id: m.id ?? m.moduleId ?? m.Id,
      moduleCode: (m.moduleCode || m.ModuleCode || '').toUpperCase(),
      moduleName: m.moduleName || m.ModuleName || m.moduleCode || '',
      isActive: Boolean(m.isActive ?? m.IsActive ?? true),
    }));
  } catch (err) {
    // Non-fatal fallback: if modules endpoint fails, return empty list
    console.warn('Failed to fetch modules for email templates:', err);
    return [];
  }
}

/**
 * Fetches email transmission logs.
 *
 * @param {{ search?: string, status?: string, emailTemplateId?: number, moduleId?: number, fromDate?: string, toDate?: string, pageNumber?: number, pageSize?: number }} [params]
 * @returns {Promise<object>}
 */
export async function listEmailLogs(params = {}) {
  try {
    const response = await axiosInstance.get(EMAIL_TEMPLATES_ENDPOINTS.EMAIL_LOGS, {
      params,
    });
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

