/**
 * src/services/standards/standardsEndpoints.js — API endpoints for Standards.
 */

export const STANDARDS_ENDPOINTS = {
  STANDARDS: '/api/standards',
  STANDARD_BY_ID: (id) => `/api/standards/${id}`,
  STANDARD_STATUS: (id) => `/api/standards/${id}/status`,
  STANDARD_GRADES: (id) => `/api/standards/${id}/grades`,
  GRADE_MAPPING: '/api/standards/grade-mapping',
};

