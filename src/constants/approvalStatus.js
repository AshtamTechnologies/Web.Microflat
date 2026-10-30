/**
 * src/constants/approvalStatus.js
 * Centralized Approval Status Codes and Labels (Vendor Approval APIs Guide - Oct 29, 2026)
 *
 * Status Codes:
 *   1 = Draft (Vendor versions)
 *   2 = Pending (Vendor versions, products, approval requests)
 *   3 = Approved (Vendor versions, products, approval requests)
 *   4 = Rejected (Vendor versions, products, approval requests)
 *   5 = Cancelled (Approval requests only)
 */

export const ApprovalStatus = {
  Draft: 1,
  Pending: 2,
  Approved: 3,
  Rejected: 4,
  Cancelled: 5,
};

export const ApprovalStatusLabel = {
  1: 'Draft',
  2: 'Pending',
  3: 'Approved',
  4: 'Rejected',
  5: 'Cancelled',
};

export const ApprovalBadgeVariant = {
  1: 'neutral',
  2: 'pending',
  3: 'approved',
  4: 'rejected',
  5: 'neutral',
};

/**
 * Normalizes any approval status (numeric code or legacy string) to the standard numeric code 1..5.
 * @param {number|string} status
 * @returns {number} 1 | 2 | 3 | 4 | 5
 */
export function normalizeApprovalStatus(status) {
  if (typeof status === 'number') {
    if (status >= 1 && status <= 5) return status;
  }
  const str = String(status || '').trim().toLowerCase();
  switch (str) {
    case 'draft':
    case '1':
      return ApprovalStatus.Draft;
    case 'pending':
    case '2':
      return ApprovalStatus.Pending;
    case 'approved':
    case '3':
      return ApprovalStatus.Approved;
    case 'rejected':
    case '4':
      return ApprovalStatus.Rejected;
    case 'cancelled':
    case 'canceled':
    case '5':
      return ApprovalStatus.Cancelled;
    default:
      return ApprovalStatus.Pending;
  }
}

/**
 * Returns user-facing label for any approval status.
 * @param {number|string} status
 * @returns {string}
 */
export function getApprovalStatusLabel(status) {
  const code = normalizeApprovalStatus(status);
  return ApprovalStatusLabel[code] || 'Pending';
}

/**
 * Returns UI Badge variant for any approval status.
 * @param {number|string} status
 * @returns {'neutral' | 'pending' | 'approved' | 'rejected'}
 */
export function getApprovalBadgeVariant(status) {
  const code = normalizeApprovalStatus(status);
  return ApprovalBadgeVariant[code] || 'neutral';
}

