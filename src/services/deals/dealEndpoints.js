/**
 * src/services/deals/dealEndpoints.js — Endpoint registry for the Deals Module.
 * Corresponds to Deal-API-Guide.md.
 */

export const DEAL_ENDPOINTS = {
  DEALS: '/api/deals',
  LOOKUPS: '/api/deals/lookups',
  NEXT_NUMBER: '/api/deals/next-number',
  PREFILL: '/api/deals/prefill',
  DEAL_BY_ID: (id) => `/api/deals/${id}`,
  STATUS: (id) => `/api/deals/${id}/status`,
  NEGOTIATIONS: (dealId) => `/api/deals/${dealId}/negotiations`,
  NEGOTIATION_BY_ID: (id) => `/api/deal-negotiations/${id}`,
};
