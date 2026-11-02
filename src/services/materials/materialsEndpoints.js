/**
 * src/services/materials/materialsEndpoints.js — API endpoints for Product Materials.
 */

export const MATERIALS_ENDPOINTS = {
  MATERIALS: '/api/materials',
  MATERIAL_BY_ID: (id) => `/api/materials/${id}`,
  MATERIAL_STATUS: (id) => `/api/materials/${id}/status`,
};

