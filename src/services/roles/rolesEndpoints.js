/**
 * rolesEndpoints.js — Endpoint path constants for roles.
 */

export const ROLES_ENDPOINTS = {
  ROLES: '/api/roles',
  ROLE_BY_ID: (id) => `/api/roles/${id}`,
  ROLE_STATUS: (id) => `/api/roles/${id}/status`,
};
