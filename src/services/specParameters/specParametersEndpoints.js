/**
 * src/services/specParameters/specParametersEndpoints.js — API endpoints for Spec Parameters.
 */

export const SPEC_PARAMETERS_ENDPOINTS = {
  SPEC_PARAMETERS: '/api/spec-parameters',
  SPEC_PARAMETER_BY_ID: (id) => `/api/spec-parameters/${id}`,
  SPEC_PARAMETER_STATUS: (id) => `/api/spec-parameters/${id}/status`,
};

