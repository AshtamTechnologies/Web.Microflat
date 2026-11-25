/**
 * src/services/approvals/approvalsService.js
 * Real Approvals Service interacting with backend endpoints (Guide Section 5.6)
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { APPROVAL_ENDPOINTS } from './approvalEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  approvalRequestFromApi,
  approvalRequestsFromApi,
  approvalSummaryFromApi,
} from '../../models/approvals/approvalModel';
import { normalizeApprovalStatus } from '../../constants/approvalStatus';

function cleanId(val) {
  if (typeof val === 'number') return val;
  const match = String(val).match(/\d+/);
  return match ? Number(match[0]) : val;
}

/**
 * Returns all approval status codes and names ({ id, name }).
 * GET /api/approval-requests/statuses
 */
export async function getApprovalStatuses() {
  try {
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.STATUSES);
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns pending requests assigned to the current user's role (not raised by them), oldest first.
 * GET /api/approval-requests/awaiting-me
 * @param {{ moduleCode?: string, pageNumber?: number, pageSize?: number }} [params]
 */
export async function getAwaitingMeApprovals(params = {}) {
  try {
    const query = {};
    const mod = params.moduleCode || params.ModuleCode;
    if (mod && mod !== 'ALL') {
      query.ModuleCode = mod;
    }
    const approvalTypeId = params.approvalTypeId || params.ApprovalTypeId;
    if (approvalTypeId) {
      query.ApprovalTypeId = approvalTypeId;
    }

    const referenceId = params.referenceId || params.ReferenceId;
    if (referenceId) {
      query.ReferenceId = referenceId;
    }

    const pageNumber = params.pageNumber || params.PageNumber;
    if (pageNumber) {
      query.PageNumber = pageNumber;
    }

    const pageSize = params.pageSize || params.PageSize;
    if (pageSize) {
      query.PageSize = pageSize;
    }

    console.log('[APPROVALS_SERVICE] GET /api/approval-requests/awaiting-me params:', query);
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.AWAITING_ME, {
      params: query,
    });
    console.log('[APPROVALS_SERVICE] awaiting-me raw response:', response.data);
    return approvalRequestsFromApi(response.data);
  } catch (err) {
    console.error('[APPROVALS_SERVICE] awaiting-me error:', err);
    throw normalizeApiError(err);
  }
}

/**
 * Returns pending approvals waiting for decision (Approver's to-do list).
 * GET /api/approval-requests/pending
 * @param {object} [params]
 */
export async function getPendingApprovals(params = {}) {
  try {
    const query = {};
    const mod = params.moduleCode || params.ModuleCode;
    if (mod && mod !== 'ALL') {
      query.ModuleCode = mod;
    }
    if (params.approvalTypeId || params.ApprovalTypeId) {
      query.ApprovalTypeId = params.approvalTypeId || params.ApprovalTypeId;
    }
    if (params.referenceId || params.ReferenceId) {
      query.ReferenceId = params.referenceId || params.ReferenceId;
    }
    if (params.mine !== undefined || params.Mine !== undefined) {
      query.Mine = params.mine !== undefined ? Boolean(params.mine) : Boolean(params.Mine);
    }
    if (params.pageNumber || params.PageNumber) {
      query.PageNumber = params.pageNumber || params.PageNumber;
    }
    if (params.pageSize || params.PageSize) {
      query.PageSize = params.pageSize || params.PageSize;
    }

    console.log('[APPROVALS_SERVICE] GET /api/approval-requests/pending params:', query);
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.PENDING, {
      params: query,
    });
    console.log('[APPROVALS_SERVICE] pending raw response:', response.data);
    return approvalRequestsFromApi(response.data);
  } catch (err) {
    console.error('[APPROVALS_SERVICE] pending error:', err);
    throw normalizeApiError(err);
  }
}

/**
 * Returns approval history list (Approved: 3, Rejected: 4, Cancelled: 5).
 * GET /api/approval-requests/history
 * @param {object} [params]
 */
export async function getApprovalHistory(params = {}) {
  try {
    const query = {};
    const mod = params.moduleCode || params.ModuleCode;
    if (mod && mod !== 'ALL') {
      query.ModuleCode = mod;
    }
    if (params.status !== undefined && params.status !== null && params.status !== 'ALL') {
      query.Status = typeof params.status === 'number' ? params.status : normalizeApprovalStatus(params.status);
    }
    if (params.approvalTypeId || params.ApprovalTypeId) {
      query.ApprovalTypeId = params.approvalTypeId || params.ApprovalTypeId;
    }
    if (params.referenceId || params.ReferenceId) {
      query.ReferenceId = params.referenceId || params.ReferenceId;
    }
    if (params.mine !== undefined || params.Mine !== undefined) {
      query.Mine = params.mine !== undefined ? Boolean(params.mine) : Boolean(params.Mine);
    }
    if (params.pageNumber || params.PageNumber) query.PageNumber = params.pageNumber || params.PageNumber;
    if (params.pageSize || params.PageSize) query.PageSize = params.pageSize || params.PageSize;

    console.log('[APPROVALS_SERVICE] GET /api/approval-requests/history params:', query);
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.HISTORY, {
      params: query,
    });
    console.log('[APPROVALS_SERVICE] history raw response:', response.data);
    return approvalRequestsFromApi(response.data);
  } catch (err) {
    console.error('[APPROVALS_SERVICE] history error:', err);
    throw normalizeApiError(err);
  }
}

/**
 * Returns step-by-step audit timeline for one request.
 * GET /api/approval-requests/{id}/history
 * @param {number|string} id
 */
export async function getRequestTimeline(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.TIMELINE(validId));
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a list of approval requests filtered by status, moduleCode, etc.
 * GET /api/approval-requests
 * @param {object} [params]
 */
export async function listApprovalRequests(params = {}) {
  try {
    const query = {};
    const mod = params.moduleCode || params.ModuleCode;
    if (mod && mod !== 'ALL') {
      query.ModuleCode = mod;
    }

    if (params.status !== undefined && params.status !== null && params.status !== 'ALL') {
      query.Status = typeof params.status === 'number' ? params.status : normalizeApprovalStatus(params.status);
    }
    if (params.approvalTypeId || params.ApprovalTypeId) query.ApprovalTypeId = params.approvalTypeId || params.ApprovalTypeId;
    if (params.referenceId || params.ReferenceId) query.ReferenceId = params.referenceId || params.ReferenceId;
    if (params.mine !== undefined || params.Mine !== undefined) {
      query.Mine = params.mine !== undefined ? Boolean(params.mine) : Boolean(params.Mine);
    }
    if (params.pageNumber || params.PageNumber) query.PageNumber = params.pageNumber || params.PageNumber;
    if (params.pageSize || params.PageSize) query.PageSize = params.pageSize || params.PageSize;

    console.log('[APPROVALS_SERVICE] GET /api/approval-requests params:', query);
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.APPROVAL_REQUESTS, {
      params: query,
    });
    console.log('[APPROVALS_SERVICE] listApprovalRequests raw response:', response.data);
    return approvalRequestsFromApi(response.data);
  } catch (err) {
    console.error('[APPROVALS_SERVICE] listApprovalRequests error:', err);
    throw normalizeApiError(err);
  }
}

/**
 * Returns counters for approval requests.
 * GET /api/approval-requests/summary?mine=false
 * @param {{ mine?: boolean }} [options]
 */
export async function getApprovalSummary({ mine = false } = {}) {
  try {
    console.log('[APPROVALS_SERVICE] GET /api/approval-requests/summary?mine=' + Boolean(mine));
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.SUMMARY, {
      params: { mine: Boolean(mine) },
    });
    console.log('[APPROVALS_SERVICE] summary raw response:', response.data);
    return approvalSummaryFromApi(response.data);
  } catch (err) {
    console.error('[APPROVALS_SERVICE] summary error:', err);
    throw normalizeApiError(err);
  }
}

/**
 * Returns request detail including submitted data and documents.
 * GET /api/approval-requests/{id}
 * @param {number|string} id
 */
export async function getApprovalRequest(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.REQUEST_BY_ID(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Verifies documents for an approval request (Admin).
 * POST /api/approval-requests/{id}/verify-documents
 * @param {number|string} id
 * @param {string} [comments]
 */
export async function verifyDocuments(id, comments = '') {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.post(
      APPROVAL_ENDPOINTS.VERIFY_DOCUMENTS(validId),
      { comments: comments ? String(comments).trim() : '' }
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Approves an approval request (Admin).
 * POST /api/approval-requests/{id}/approve
 * @param {number|string} id
 * @param {{ comments?: string, isDocumentVerified?: boolean, documentVerificationComments?: string }} [data]
 */
export async function approveRequest(id, data = {}) {
  try {
    const validId = cleanId(id);
    const payload = {
      isDocumentVerified: Boolean(data.isDocumentVerified),
    };
    if (data.comments?.trim()) payload.comments = data.comments.trim();
    if (data.documentVerificationComments?.trim()) {
      payload.documentVerificationComments = data.documentVerificationComments.trim();
    }

    const response = await axiosInstance.post(APPROVAL_ENDPOINTS.APPROVE(validId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Rejects an approval request (Admin). Reason comments are required.
 * POST /api/approval-requests/{id}/reject
 * @param {number|string} id
 * @param {{ comments: string }} data
 */
export async function rejectRequest(id, data = {}) {
  try {
    const validId = cleanId(id);
    const comments = String(data.comments || '').trim();
    if (!comments) {
      throw new Error('Rejection reason comments are required.');
    }

    const payload = { comments };
    const response = await axiosInstance.post(APPROVAL_ENDPOINTS.REJECT(validId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Cancels / withdraws a pending request (Requester or Admin).
 * POST /api/approval-requests/{id}/cancel
 * @param {number|string} id
 * @param {{ comments?: string }} [data]
 */
export async function cancelRequest(id, data = {}) {
  try {
    const validId = cleanId(id);
    const payload = {};
    if (data.comments?.trim()) payload.comments = data.comments.trim();

    const response = await axiosInstance.post(APPROVAL_ENDPOINTS.CANCEL(validId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   APPROVAL SETTINGS (Admin Setup)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Returns lookups for approval settings: approverTypes, roles, users.
 * GET /api/approval-settings/lookups
 */
export async function getApprovalSettingsLookups() {
  try {
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.SETTINGS_LOOKUPS);
    return response.data || { approverTypes: [], roles: [], users: [] };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns all system modules with their current approval requirement configuration.
 * GET /api/approval-settings/modules?isModuleActive=true
 * @param {{ isModuleActive?: boolean }} [params]
 */
export async function getApprovalSettingsModules(params = { isModuleActive: true }) {
  try {
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.SETTINGS_MODULES, {
      params,
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Lists approval settings filtered by moduleCode and/or isApprovalRequired.
 * GET /api/approval-settings
 * @param {{ moduleCode?: string, isApprovalRequired?: boolean }} [params]
 */
export async function getApprovalSettings(params = {}) {
  try {
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.SETTINGS, {
      params,
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Fetches approval setting for a specific module (e.g. VENDOR, QUOTATION).
 * GET /api/approval-settings/by-module/{moduleCode}
 * @param {string} moduleCode
 */
export async function getApprovalSettingByModule(moduleCode) {
  try {
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.SETTINGS_BY_MODULE(moduleCode));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Fetches single approval setting by ID.
 * GET /api/approval-settings/{id}
 * @param {number|string} id
 */
export async function getApprovalSetting(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.SETTINGS_BY_ID(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates approval setting for a module (Admin only).
 * POST /api/approval-settings
 * @param {{ moduleId: number, isApprovalRequired: boolean, approverType?: number, approverRoleId?: number, approverUserId?: number }} data
 */
export async function createApprovalSetting(data) {
  try {
    const isApprovalRequired = Boolean(data.isApprovalRequired);
    const approverType = data.approverType ? Number(data.approverType) : 1;
    const payload = {
      moduleId: Number(data.moduleId),
      isApprovalRequired,
      approverType,
      approverRoleId: isApprovalRequired && approverType === 1 && data.approverRoleId ? Number(data.approverRoleId) : null,
      approverUserId: isApprovalRequired && approverType === 2 && data.approverUserId ? Number(data.approverUserId) : null,
    };
    const response = await axiosInstance.post(APPROVAL_ENDPOINTS.SETTINGS, payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates approval setting for a module (Admin only).
 * PUT /api/approval-settings/{id}
 * @param {number|string} id
 * @param {{ isApprovalRequired: boolean, approverType?: number, approverRoleId?: number, approverUserId?: number }} data
 */
export async function updateApprovalSetting(id, data) {
  try {
    const validId = cleanId(id);
    const isApprovalRequired = Boolean(data.isApprovalRequired);
    const approverType = data.approverType ? Number(data.approverType) : 1;
    const payload = {
      isApprovalRequired,
      approverType,
      approverRoleId: isApprovalRequired && approverType === 1 && data.approverRoleId ? Number(data.approverRoleId) : null,
      approverUserId: isApprovalRequired && approverType === 2 && data.approverUserId ? Number(data.approverUserId) : null,
    };
    const response = await axiosInstance.put(APPROVAL_ENDPOINTS.SETTINGS_BY_ID(validId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes approval setting for a module (Admin only).
 * DELETE /api/approval-settings/{id}
 * @param {number|string} id
 */
export async function deleteApprovalSetting(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.delete(APPROVAL_ENDPOINTS.SETTINGS_BY_ID(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export const capabilities = {
  summary: true,
  verifyDocuments: true,
  approve: true,
  reject: true,
  cancel: true,
  settings: true,
};
