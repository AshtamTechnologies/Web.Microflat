/**
 * usersEndpoints.js — Endpoint path constants for users.
 */

export const USERS_ENDPOINTS = {
  USERS: '/api/users',
  USER_BY_ID: (id) => `/api/users/${id}`,
  USER_STATUS: (id) => `/api/users/${id}/status`,
  USER_ME: '/api/users/me',
  USER_ROLES: (id) => `/api/users/${id}/roles`,
  USER_UNLOCK: (id) => `/api/users/${id}/unlock`,
  USER_TEMPORARY_PASSWORD: (id) => `/api/users/${id}/temporary-password`,
  USER_SESSIONS: (id) => `/api/users/${id}/sessions`,
};
