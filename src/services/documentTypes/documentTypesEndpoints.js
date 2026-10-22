/**
 * src/services/documentTypes/documentTypesEndpoints.js — API endpoints for Document Types.
 */

export const DOCUMENT_TYPES_ENDPOINTS = {
  DOCUMENT_TYPES: '/api/document-types',
  DOCUMENT_TYPE_BY_ID: (id) => `/api/document-types/${id}`,
  DOCUMENT_TYPE_STATUS: (id) => `/api/document-types/${id}/status`,
  MODULES: '/api/modules',
};
