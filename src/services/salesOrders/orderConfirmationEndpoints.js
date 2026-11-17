/**
 * src/services/salesOrders/orderConfirmationEndpoints.js
 * Centralized API endpoint constants for Order Confirmations (Sales Orders).
 * Aligned with Swagger OpenAPI & Frontend-API-Guide.md §5.4g.
 */

function cleanId(id) {
  if (typeof id === 'number') return id;
  const match = String(id).match(/\d+/);
  return match ? Number(match[0]) : id;
}

export const ORDER_CONFIRMATION_ENDPOINTS = {
  // Lookups & Number Series
  LOOKUPS: '/api/order-confirmations/lookups',
  NEXT_NUMBER: (date) =>
    `/api/order-confirmations/next-number${
      date ? `?orderConfirmationDate=${encodeURIComponent(date)}` : ''
    }`,

  // Order Confirmations CRUD
  ORDER_CONFIRMATIONS: '/api/order-confirmations',
  ORDER_CONFIRMATION_BY_ID: (id) => `/api/order-confirmations/${cleanId(id)}`,
  STATUS: (id) => `/api/order-confirmations/${cleanId(id)}/status`,

  // Documents
  DOCUMENTS: (id) => `/api/order-confirmations/${cleanId(id)}/documents`,
  DOCUMENT_BY_ID: (docId) => `/api/order-confirmation-documents/${cleanId(docId)}`,
  DOCUMENT_DOWNLOAD: (docId) => `/api/order-confirmation-documents/${cleanId(docId)}/download`,

  // Email
  EMAIL_LOGS: (id) => `/api/order-confirmations/${cleanId(id)}/email-logs`,
  SEND_EMAIL: (id) => `/api/order-confirmations/${cleanId(id)}/send-email`,
};
