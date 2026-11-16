/**
 * notificationsEndpoints.js — Endpoint definitions for Notifications module.
 * Conforms to Section 5.4i of Frontend-API-Guide.md.
 */

export const NOTIFICATIONS_ENDPOINTS = {
  NOTIFICATIONS: '/api/notifications',
  UNREAD_COUNT: '/api/notifications/unread-count',
  MARK_READ: (id) => `/api/notifications/${id}/read`,
  MARK_ALL_READ: '/api/notifications/read-all',
};

