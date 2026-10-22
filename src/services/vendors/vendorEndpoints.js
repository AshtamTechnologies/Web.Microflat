/**
 * src/services/vendors/vendorEndpoints.js — Centralized API endpoints for Vendors & Vendor Bank Details.
 */

export const VENDOR_ENDPOINTS = {
  // Vendor Master & Lifecycle
  VENDORS: '/api/vendors',
  VENDOR_BY_ID: (id) => `/api/vendors/${id}`,
  SUMMARY: '/api/vendors/summary',
  LOOKUPS: '/api/vendors/lookups',
  STATUS: (id) => `/api/vendors/${id}/status`,
  APPROVAL_HISTORY: (id) => `/api/vendors/${id}/approval-history`,
  VERSIONS: (id) => `/api/vendors/${id}/versions`,

  // Vendor Version Lifecycle (Section 5.4)
  VENDOR_VERSION_BY_ID: (versionId) => `/api/vendor-versions/${versionId}`,
  SUBMIT_VERSION: (versionId) => `/api/vendor-versions/${versionId}/submit`,
  VERSION_ATTACHMENTS: (versionId) => `/api/vendor-versions/${versionId}/attachments`,
  DOWNLOAD_ATTACHMENT: (attachmentId) => `/api/vendor-attachments/${attachmentId}/download`,
  DELETE_ATTACHMENT: (attachmentId) => `/api/vendor-attachments/${attachmentId}`,

  // Vendor Bank Details (Section 5.5)
  VENDOR_BANK_DETAILS: (vendorId) => `/api/vendors/${vendorId}/bank-details`,
  BANK_DETAIL_BY_ID: (id) => `/api/vendor-bank-details/${id}`,
  BANK_DETAIL_STATUS: (id) => `/api/vendor-bank-details/${id}/status`,
  BANK_DETAIL_ATTACHMENTS: (id) => `/api/vendor-bank-details/${id}/attachments`,
  BANK_DOWNLOAD_ATTACHMENT: (attachmentId) => `/api/vendor-bank-attachments/${attachmentId}/download`,
  BANK_DELETE_ATTACHMENT: (attachmentId) => `/api/vendor-bank-attachments/${attachmentId}`,
};
