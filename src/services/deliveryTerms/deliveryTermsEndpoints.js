/**
 * deliveryTermsEndpoints.js — API endpoints for Delivery Terms module.
 * Conforms to Section 5.3 of Frontend-API-Guide.md.
 */

export const DELIVERY_TERMS_ENDPOINTS = {
  DELIVERY_TERMS: '/api/delivery-terms',
  DELIVERY_TERM_BY_ID: (id) => `/api/delivery-terms/${id}`,
  DELIVERY_TERM_STATUS: (id) => `/api/delivery-terms/${id}/status`,
};

