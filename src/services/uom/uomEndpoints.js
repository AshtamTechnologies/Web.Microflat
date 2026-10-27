/**
 * src/services/uom/uomEndpoints.js — API endpoints for Unit of Measurement (UOM).
 */

export const UOM_ENDPOINTS = {
  UOMS: '/api/uoms',
  UOM_BY_ID: (id) => `/api/uoms/${id}`,
  UOM_STATUS: (id) => `/api/uoms/${id}/status`,
};
