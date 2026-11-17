/**
 * src/services/notificationSetup/notificationSetupEndpoints.js
 * Endpoint path constants for Configurable Notification Rules and Events.
 * Conforms to Section 5 of Notification-WorkQueue-API.md.
 */

export const NOTIFICATION_SETUP_ENDPOINTS = {
  LOOKUPS: '/api/notification-events/lookups',
  EVENTS: '/api/notification-events',
  EVENT_BY_ID: (id) => `/api/notification-events/${id}`,
  RULES: '/api/notification-rules',
  RULE_BY_ID: (id) => `/api/notification-rules/${id}`,
};
