/**
 * src/services/paymentTerms/paymentTermsEndpoints.js — API endpoints for Payment Terms.
 */

export const PAYMENT_TERMS_ENDPOINTS = {
  PAYMENT_TERMS: '/api/payment-terms',
  PAYMENT_TERM_BY_ID: (id) => `/api/payment-terms/${id}`,
  PAYMENT_TERM_STATUS: (id) => `/api/payment-terms/${id}/status`,
};
