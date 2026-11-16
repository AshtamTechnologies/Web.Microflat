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
    { id: 6, name: 'Not Required' },
  ];
}

export async function getAwaitingMeApprovals(params = {}) {
  let filtered = inMemoryApprovals.filter(
    (a) => a.status === ApprovalStatus.Pending || (String(a.status || '').toLowerCase() === 'pending')
  );
  if (params.moduleCode && params.moduleCode !== 'ALL') {
    filtered = filtered.filter((a) => (a.moduleCode || '').toLowerCase() === params.moduleCode.toLowerCase());
  }
  return approvalRequestsFromApi(filtered);
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

let inMemorySettings = [
  { approvalSettingId: 1, moduleId: 1, moduleCode: 'VENDOR', moduleName: 'Vendors', isApprovalRequired: true, approverRoleId: 2, approverRoleName: 'Admin', pendingRequestCount: 1, lastUpdatedByName: 'System', lastUpdatedOn: '2026-11-01' },
  { approvalSettingId: 2, moduleId: 2, moduleCode: 'PURCHASE_REQUISITION', moduleName: 'Purchase Requisitions', isApprovalRequired: true, approverRoleId: 2, approverRoleName: 'Admin', pendingRequestCount: 0, lastUpdatedByName: 'Admin', lastUpdatedOn: '2026-11-05' },
  { approvalSettingId: 3, moduleId: 3, moduleCode: 'QUOTATION', moduleName: 'Quotations', isApprovalRequired: false, approverRoleId: null, approverRoleName: null, pendingRequestCount: 0, lastUpdatedByName: 'Admin', lastUpdatedOn: '2026-11-10' },
  { approvalSettingId: 4, moduleId: 4, moduleCode: 'PRODUCT', moduleName: 'Products', isApprovalRequired: false, approverRoleId: null, approverRoleName: null, pendingRequestCount: 0, lastUpdatedByName: 'Admin', lastUpdatedOn: '2026-11-10' },
];

export async function getApprovalSettingsModules() {
  return inMemorySettings;
}

export async function getApprovalSettings() {
  return inMemorySettings;
}

export async function getApprovalSettingByModule(code) {
  return inMemorySettings.find((s) => s.moduleCode === code) || null;
}

export async function getApprovalSetting(id) {
  return inMemorySettings.find((s) => String(s.approvalSettingId) === String(id)) || null;
}

export async function createApprovalSetting(data) {
  const newSetting = {
    approvalSettingId: Date.now(),
    ...data,
    moduleName: data.moduleCode || 'Module',
    lastUpdatedOn: new Date().toISOString(),
  };
  inMemorySettings.push(newSetting);
  return newSetting;
}

export async function updateApprovalSetting(id, data) {
  inMemorySettings = inMemorySettings.map((s) =>
    String(s.approvalSettingId) === String(id) ? { ...s, ...data, lastUpdatedOn: new Date().toISOString() } : s
  );
  return inMemorySettings.find((s) => String(s.approvalSettingId) === String(id));
}

export async function deleteApprovalSetting(id) {
  inMemorySettings = inMemorySettings.filter((s) => String(s.approvalSettingId) !== String(id));
  return { ok: true };
}

export const capabilities = {
  summary: true,
  verifyDocuments: true,
  approve: true,
  reject: true,
  cancel: true,
};
