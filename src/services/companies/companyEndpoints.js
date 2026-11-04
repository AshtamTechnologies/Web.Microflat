/**
 * src/services/companies/companyEndpoints.js — API endpoints for Company & Company Bank Details.
 *
 * Covers all endpoints defined in Company API Integration Guide + 4 Nov 2026 Bank Authentication:
 *   - /api/companies/* (1 to 8)
 *   - /api/company-bank-details/* (9 to 14)
 *   - /api/company-bank-attachments/* (15 to 18)
 *   - /api/companies/{companyId}/bank-authentication (Password re-check)
 */

export const COMPANY_ENDPOINTS = {
  // ── Company Endpoints (1-8) ──
  COMPANIES: '/api/companies',
  ACTIVE: '/api/companies/active',
  LOOKUPS: '/api/companies/lookups',
  BY_ID: (id) => `/api/companies/${id}`,
  STATUS: (id) => `/api/companies/${id}/status`,

  // ── Master Dependency ──
  STATES_BY_COUNTRY: (countryId) => `/api/states?countryId=${countryId}`,

  // ── Company Bank Details Endpoints (9-14) ──
  BANK_DETAILS_BY_COMPANY: (companyId) => `/api/companies/${companyId}/bank-details`,
  BANK_DETAIL_BY_ID: (bankId) => `/api/company-bank-details/${bankId}`,
  BANK_DETAIL_STATUS: (bankId) => `/api/company-bank-details/${bankId}/status`,

  // ── Company Bank Authentication (Password Re-check) ──
  BANK_AUTHENTICATION: (companyId) => `/api/companies/${companyId}/bank-authentication`,
  BANK_AUTHENTICATION_HISTORY: (companyId, take = 50) => `/api/companies/${companyId}/bank-authentication?take=${take}`,

  // ── Banking Documents & Attachments (15-18) ──
  ATTACHMENTS_BY_BANK: (bankId) => `/api/company-bank-details/${bankId}/attachments`,
  ATTACHMENT_BY_ID: (attachmentId) => `/api/company-bank-attachments/${attachmentId}`,
  ATTACHMENT_DOWNLOAD: (attachmentId) => `/api/company-bank-attachments/${attachmentId}/download`,
};
