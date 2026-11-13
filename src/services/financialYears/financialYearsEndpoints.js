/**
 * src/services/financialYears/financialYearsEndpoints.js — API endpoints for Financial Year Setup.
 *
 * Implements Section 5.3 ("Financial year setup") of Frontend-API-Guide 1.md:
 * - GET /api/financial-years
 * - GET /api/financial-years/current
 * - POST /api/financial-years
 * - PUT /api/financial-years/{id}
 * - PATCH /api/financial-years/{id}/open
 * - PATCH /api/financial-years/{id}/close
 * - DELETE /api/financial-years/{id}
 * - GET /api/financial-years/settings
 * - PUT /api/financial-years/settings
 * - POST /api/financial-years/run-rollover
 */

export const FINANCIAL_YEARS_ENDPOINTS = {
  LIST: '/api/financial-years',
  CURRENT: '/api/financial-years/current',
  BY_ID: (id) => `/api/financial-years/${id}`,
  OPEN: (id) => `/api/financial-years/${id}/open`,
  CLOSE: (id) => `/api/financial-years/${id}/close`,
  SETTINGS: '/api/financial-years/settings',
  RUN_ROLLOVER: '/api/financial-years/run-rollover',
};

