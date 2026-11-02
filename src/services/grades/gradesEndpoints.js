/**
 * src/services/grades/gradesEndpoints.js — API endpoints for Product Grades.
 */

export const GRADES_ENDPOINTS = {
  GRADES: '/api/grades',
  GRADE_BY_ID: (id) => `/api/grades/${id}`,
  GRADE_STATUS: (id) => `/api/grades/${id}/status`,
};

