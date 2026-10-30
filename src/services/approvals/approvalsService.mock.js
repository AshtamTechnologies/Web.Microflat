/**
 * src/services/approvals/approvalsService.mock.js
 * In-memory fallback mock for Approvals.
 */

import { approvalRequestsFromApi } from '../../models/approvals/approvalModel';
import { ApprovalStatus } from '../../constants/approvalStatus';

let inMemoryApprovals = [];

export async function getApprovalStatuses() {
  return [
    { id: 1, name: 'Draft' },
    { id: 2, name: 'Pending' },
    { id: 3, name: 'Approved' },
    { id: 4, name: 'Rejected' },
    { id: 5, name: 'Cancelled' },
  ];
}

export async function getPendingApprovals(params = {}) {
  let filtered = inMemoryApprovals.filter(
    (a) => a.status === ApprovalStatus.Pending || (String(a.status || '').toLowerCase() === 'pending')
  );
  return approvalRequestsFromApi(filtered);
}

export async function getApprovalHistory(params = {}) {
  let filtered = inMemoryApprovals.filter(
    (a) => a.status === ApprovalStatus.Approved || a.status === ApprovalStatus.Rejected || a.status === ApprovalStatus.Cancelled
  );
  return approvalRequestsFromApi(filtered);
}

export async function getRequestTimeline(id) {
  const req = inMemoryApprovals.find((a) => String(a.id) === String(id));
  if (!req) return [];
  return [
    { action: 'Submitted', status: 2, userId: req.initiatedBy || 1, userName: req.initiatedByName || 'User', on: req.initiatedOn || new Date().toISOString(), comments: null },
    ...(req.isDocumentVerified ? [{ action: 'DocumentsVerified', status: 2, userId: 1, userName: 'Admin', on: new Date().toISOString(), comments: 'Documents checked' }] : []),
    ...(req.status === ApprovalStatus.Approved ? [{ action: 'Approved', status: 3, userId: 1, userName: 'Admin', on: new Date().toISOString(), comments: req.comments }] : []),
    ...(req.status === ApprovalStatus.Rejected ? [{ action: 'Rejected', status: 4, userId: 1, userName: 'Admin', on: new Date().toISOString(), comments: req.comments }] : []),
  ];
}

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
  const found = inMemoryApprovals.find((a) => String(a.id) === String(id));
  if (!found) return null;
  return {
    request: found,
    vendorDetail: found.vendorDetail || found,
  };
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
