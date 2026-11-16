/**
 * emailTemplatesEndpoints.js — API endpoint mapping for Email Templates.
 * Conforms to Section 5.4i of Frontend-API-Guide 1.md.
 */

export const EMAIL_TEMPLATES_ENDPOINTS = {
  TEMPLATES: '/api/email-templates',
  TEMPLATE_BY_ID: (id) => `/api/email-templates/${id}`,
  TEMPLATE_BY_CODE: (code) => `/api/email-templates/by-code/${code}`,
  STATUS: (id) => `/api/email-templates/${id}/status`,
  PREVIEW: (id) => `/api/email-templates/${id}/preview`,
  SEND: '/api/email-templates/send',
  EMAIL_LOGS: '/api/email-logs',
  MODULES: '/api/modules',
};

