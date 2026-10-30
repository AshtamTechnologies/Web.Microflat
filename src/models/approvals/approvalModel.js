/**
 * src/models/approvals/approvalModel.js
 * Domain model and DTO transformations for Approvals.
 */

import { normalizeApprovalStatus, ApprovalStatusLabel } from '../../constants/approvalStatus';

/**
 * Normalizes an approval request item from GET /api/approval-requests.
 * @param {object} apiItem
 * @returns {object}
 */
export function approvalRequestFromApi(apiItem) {
  if (!apiItem) return null;

  const reqId = apiItem.approvalRequestId ?? apiItem.id;
  const refId = apiItem.referenceId ?? apiItem.vendorId;
  const rawStatus = apiItem.status ?? apiItem.approvalStatus;
  const numericStatus = normalizeApprovalStatus(rawStatus);
  const statusLabel = ApprovalStatusLabel[numericStatus] || 'Pending';

  return {
    id: reqId,
    approvalRequestId: reqId,
    referenceId: refId,
    vendorId: refId,
    referenceTitle: apiItem.referenceTitle || apiItem.vendorName || '',
    vendorName: apiItem.referenceTitle || apiItem.vendorName || '',
    vendorCode: apiItem.vendorCode || '',
    moduleCode: apiItem.moduleCode || 'VENDOR',
    typeCode: apiItem.typeCode || 'VENDOR_REGISTRATION',
    typeName: apiItem.typeName || 'Vendor Registration',
    status: numericStatus,
    approvalStatus: numericStatus,
    statusLabel,
    initiatedByName: apiItem.initiatedByName || apiItem.createdByName || apiItem.createdBy || 'System',
    initiatedBy: apiItem.initiatedBy,
    initiatedOn: apiItem.initiatedOn || apiItem.createdOn || '',
    createdOn: apiItem.initiatedOn || apiItem.createdOn || '',
    effectiveDate: apiItem.effectiveDate || (apiItem.initiatedOn ? String(apiItem.initiatedOn).slice(0, 10) : ''),
    isDocumentVerified: Boolean(apiItem.isDocumentVerified),
    actionedByName: apiItem.actionedByName || null,
    actionedOn: apiItem.actionedOn || null,
    contactPersonName: apiItem.contactPersonName || '',
    city: apiItem.city || '',
    phoneNo: apiItem.phoneNo || '',
    comments: apiItem.comments || '',
  };
}

/**
 * Normalizes an array or paged list of approval requests.
 * @param {object|Array} data
 * @returns {{ items: object[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }}
 */
export function approvalRequestsFromApi(data) {
  if (!data) return { items: [], totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 1 };

  if (Array.isArray(data)) {
    const items = data.map(approvalRequestFromApi).filter(Boolean);
    return {
      items,
      totalCount: items.length,
      pageNumber: 1,
      pageSize: items.length || 20,
      totalPages: 1,
    };
  }

  const rawItems = Array.isArray(data.items) ? data.items : [];
  return {
    items: rawItems.map(approvalRequestFromApi).filter(Boolean),
    totalCount: data.totalCount ?? rawItems.length,
    pageNumber: data.pageNumber ?? 1,
    pageSize: data.pageSize ?? 20,
    totalPages: data.totalPages ?? 1,
  };
}

/**
 * Normalizes counters summary from GET /api/approval-requests/summary.
 * @param {object} apiSummary
 */
export function approvalSummaryFromApi(apiSummary) {
  return {
    pending: apiSummary?.pending || 0,
    approved: apiSummary?.approved || 0,
    rejected: apiSummary?.rejected || 0,
    cancelled: apiSummary?.cancelled || 0,
  };
}
