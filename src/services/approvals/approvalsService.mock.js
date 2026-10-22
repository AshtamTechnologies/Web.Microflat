/**
 * src/services/approvals/approvalsService.mock.js
 * In-memory fallback mock for Approvals.
 */

import { approvalRequestsFromApi } from '../../models/approvals/approvalModel';

let inMemoryApprovals = [];

export async function listApprovalRequests(params = {}) {
  let filtered = inMemoryApprovals.filter(
    (a) => (a.status || 'Pending').toLowerCase() === (params.status || 'Pending').toLowerCase()
  );
  return approvalRequestsFromApi(filtered);
}

export async function getApprovalSummary() {
  return {
    pending: inMemoryApprovals.filter((a) => (a.status || '').toLowerCase() === 'pending').length,
    approved: inMemoryApprovals.filter((a) => (a.status || '').toLowerCase() === 'approved').length,
    rejected: inMemoryApprovals.filter((a) => (a.status || '').toLowerCase() === 'rejected').length,
    cancelled: inMemoryApprovals.filter((a) => (a.status || '').toLowerCase() === 'cancelled').length,
  };
}

export async function getApprovalRequest(id) {
  return inMemoryApprovals.find((a) => String(a.id) === String(id)) || null;
}

export async function verifyDocuments(id, comments = '') {
  inMemoryApprovals = inMemoryApprovals.map((a) =>
    String(a.id) === String(id) ? { ...a, isDocumentVerified: true, verificationComments: comments } : a
  );
  return { ok: true };
}

export async function approveRequest(id, data = {}) {
  inMemoryApprovals = inMemoryApprovals.map((a) =>
    String(a.id) === String(id)
      ? { ...a, status: 'Approved', approvalComments: data.comments, isDocumentVerified: true }
      : a
  );
  return { ok: true, status: 'Approved' };
}

export async function rejectRequest(id, data = {}) {
  inMemoryApprovals = inMemoryApprovals.map((a) =>
    String(a.id) === String(id)
      ? { ...a, status: 'Rejected', rejectionComments: data.comments }
      : a
  );
  return { ok: true, status: 'Rejected' };
}

export async function cancelRequest(id, data = {}) {
  inMemoryApprovals = inMemoryApprovals.map((a) =>
    String(a.id) === String(id)
      ? { ...a, status: 'Cancelled', cancelComments: data.comments }
      : a
  );
  return { ok: true, status: 'Cancelled' };
}

export const capabilities = {
  summary: true,
  verifyDocuments: true,
  approve: true,
  reject: true,
  cancel: true,
};
