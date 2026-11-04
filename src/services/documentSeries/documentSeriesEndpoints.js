/**
 * documentSeriesEndpoints.js — Endpoint URI builders for Document Series API.
 */

export const DOCUMENT_SERIES_ENDPOINTS = {
  SERIES: '/api/document-series',
  SERIES_BY_ID: (id) => `/api/document-series/${id}`,
  NEXT_NUMBER: '/api/document-series/next-number',
  MODULES: '/api/modules',
};
