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
 * Returns pending approvals waiting for decision (Approver's to-do list).
 * GET /api/approval-requests/pending
 * @param {object} [params]
 */
export async function getPendingApprovals(params = {}) {
  try {
    const query = {
      ModuleCode: params.moduleCode || params.ModuleCode || 'VENDOR',
    };
    if (params.approvalTypeId) query.ApprovalTypeId = params.approvalTypeId;
    if (params.referenceId) query.ReferenceId = params.referenceId;
    query.Mine = params.mine !== undefined ? Boolean(params.mine) : (params.Mine !== undefined ? Boolean(params.Mine) : true);
    if (params.pageNumber) query.PageNumber = params.pageNumber;
    if (params.pageSize) query.PageSize = params.pageSize;

    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.PENDING, {
      params: query,
    });
    return approvalRequestsFromApi(response.data);
  } catch (err) {
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
    const query = {
      ModuleCode: params.moduleCode || params.ModuleCode || 'VENDOR',
    };
    if (params.status !== undefined && params.status !== null && params.status !== 'ALL') {
      query.Status = typeof params.status === 'number' ? params.status : normalizeApprovalStatus(params.status);
    }
    if (params.approvalTypeId) query.ApprovalTypeId = params.approvalTypeId;
    if (params.referenceId) query.ReferenceId = params.referenceId;
    query.Mine = params.mine !== undefined ? Boolean(params.mine) : (params.Mine !== undefined ? Boolean(params.Mine) : true);
    if (params.pageNumber) query.PageNumber = params.pageNumber;
    if (params.pageSize) query.PageSize = params.pageSize;

    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.HISTORY, {
      params: query,
    });
    return approvalRequestsFromApi(response.data);
  } catch (err) {
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
    const query = {
      moduleCode: params.moduleCode || 'VENDOR',
    };

    if (params.status !== undefined && params.status !== null && params.status !== 'ALL') {
      query.status = typeof params.status === 'number' ? params.status : normalizeApprovalStatus(params.status);
    }
    if (params.approvalTypeId) query.approvalTypeId = params.approvalTypeId;
    if (params.referenceId) query.referenceId = params.referenceId;
    if (params.mine !== undefined) query.mine = Boolean(params.mine);
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.APPROVAL_REQUESTS, {
      params: query,
    });
    return approvalRequestsFromApi(response.data);
  } catch (err) {
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
    const response = await axiosInstance.get(APPROVAL_ENDPOINTS.SUMMARY, {
      params: { mine: Boolean(mine) },
    });
    return approvalSummaryFromApi(response.data);
  } catch (err) {
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

export const capabilities = {
  summary: true,
  verifyDocuments: true,
  approve: true,
  reject: true,
  cancel: true,
};
