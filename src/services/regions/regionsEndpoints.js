/**
 * src/services/regions/regionsEndpoints.js — API endpoints for Regions.
 */

export const REGIONS_ENDPOINTS = {
  REGIONS: '/api/regions',
  REGION_BY_ID: (id) => `/api/regions/${id}`,
  REGION_STATUS: (id) => `/api/regions/${id}/status`,
};
