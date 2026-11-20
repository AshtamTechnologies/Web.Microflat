/**
 * src/services/approvals/approvalEndpoints.js
 * Centralized endpoint URLs for Approvals (MicroFlat API Guide Section 5.6)
 */

export const APPROVAL_ENDPOINTS = {
  APPROVAL_REQUESTS: '/api/approval-requests',
  STATUSES: '/api/approval-requests/statuses',
  AWAITING_ME: '/api/approval-requests/awaiting-me',
  PENDING: '/api/approval-requests/pending',
  HISTORY: '/api/approval-requests/history',
  TIMELINE: (id) => `/api/approval-requests/${id}/history`,
  SUMMARY: '/api/approval-requests/summary',
  REQUEST_BY_ID: (id) => `/api/approval-requests/${id}`,
  VERIFY_DOCUMENTS: (id) => `/api/approval-requests/${id}/verify-documents`,
  APPROVE: (id) => `/api/approval-requests/${id}/approve`,
  REJECT: (id) => `/api/approval-requests/${id}/reject`,
  CANCEL: (id) => `/api/approval-requests/${id}/cancel`,
  // Settings & Types
  SETTINGS: '/api/approval-settings',
  SETTINGS_LOOKUPS: '/api/approval-settings/lookups',
  SETTINGS_MODULES: '/api/approval-settings/modules',
  SETTINGS_BY_MODULE: (moduleCode) => `/api/approval-settings/by-module/${moduleCode}`,
  SETTINGS_BY_ID: (id) => `/api/approval-settings/${id}`,
  TYPES: '/api/approval-types',
  TYPE_BY_ID: (id) => `/api/approval-types/${id}`,
  TYPE_STATUS: (id) => `/api/approval-types/${id}/status`,
};
