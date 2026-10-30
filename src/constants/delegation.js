/**
 * delegation.js — Delegation module constants, configuration, and status mappings.
 *
 * MicroFlat ERP: Work delegation for temporary handover during leave or travel.
 * Adding future modules (Quotations, Sales Orders, Tasks) is a config change here.
 */

/**
 * @typedef {Object} DelegationModuleConfig
 * @property {string} key
 * @property {string} label
 * @property {string} description
 * @property {boolean} supportsRecords
 * @property {string} recordLabel
 * @property {string} emptyText
 */

/** @type {DelegationModuleConfig[]} */
export const DELEGATION_MODULES = [
  {
    key: 'INQUIRY',
    label: 'Inquiries',
    description: 'Customer inquiries, items and requirements',
    supportsRecords: true,
    recordLabel: 'Inquiry',
    emptyText: 'No inquiries found',
  },
  {
    key: 'PURCHASE_REQUISITION',
    label: 'Purchase requisitions',
    description: 'Internal purchase requisitions and items',
    supportsRecords: true,
    recordLabel: 'Purchase Requisition',
    emptyText: 'No purchase requisitions found',
  },
  {
    key: 'VENDOR',
    label: 'Vendors',
    description: 'Vendor master data, effective versions and bank details',
    supportsRecords: true,
    recordLabel: 'Vendor',
    emptyText: 'No vendors found',
  },
  {
    key: 'CLIENT',
    label: 'Clients',
    description: 'Customer master data, addresses and contact persons',
    supportsRecords: true,
    recordLabel: 'Client',
    emptyText: 'No clients found',
  },
  {
    key: 'APPROVALS',
    label: 'My approvals',
    description: 'Vendor and purchase requisition approvals waiting for my approval',
    supportsRecords: false,
    recordLabel: 'Approval',
    emptyText: 'No approvals found',
  },
];

/**
 * Approval pages eligible for authority delegation.
 */
export const APPROVAL_PAGES = [
  {
    key: 'VENDOR_APPROVAL',
    label: 'Vendor Approvals',
    path: '/approvals/vendors',
    description: 'Vendor registration and profile approval queue',
  },
  {
    key: 'PR_APPROVAL',
    label: 'Purchase Requisition Approvals',
    path: '/approvals/purchase-requisitions',
    description: 'Purchase requisitions and material requirement approvals',
  },
];

export const APPROVAL_PAGE_OPTIONS = APPROVAL_PAGES.map((p) => ({
  value: p.key,
  label: p.label,
}));

export function getApprovalPage(key) {
  return APPROVAL_PAGES.find((p) => p.key === key) || null;
}

export function getApprovalPageLabel(key) {
  return getApprovalPage(key)?.label || key || 'Approval Access';
}

/** @type {string[]} */
export const DELEGATION_REASONS = [
  'Leave',
  'Sick leave',
  'Travel',
  'Training',
  'Other',
];

export const DELEGATION_REASON_OPTIONS = DELEGATION_REASONS.map((reason) => ({
  value: reason,
  label: reason,
}));

/**
 * Status definitions mapped to Badge variants:
 * Active -> success
 * Scheduled -> info
 * Ended -> neutral
 * Cancelled -> danger
 */
export const DELEGATION_STATUS = {
  Active: {
    label: 'Active',
    variant: 'success',
  },
  Scheduled: {
    label: 'Scheduled',
    variant: 'info',
  },
  Ended: {
    label: 'Ended',
    variant: 'neutral',
  },
  Cancelled: {
    label: 'Cancelled',
    variant: 'danger',
  },
};

