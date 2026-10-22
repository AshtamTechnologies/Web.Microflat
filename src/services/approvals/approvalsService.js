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

function cleanId(val) {
  if (typeof val === 'number') return val;
  const match = String(val).match(/\d+/);
  return match ? Number(match[0]) : val;
}

/**
 * Returns a list of approval requests filtered by status, moduleCode, etc.
 * GET /api/approval-requests
 * @param {object} [params]
 */
export async function listApprovalRequests(params = {}) {
  try {
    const query = {
      status: params.status || 'Pending',
      moduleCode: params.moduleCode || 'VENDOR',
    };

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
      isDocumentVerified: data.isDocumentVerified !== false, // default true per integration guide
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
