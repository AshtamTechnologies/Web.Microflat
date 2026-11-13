/**
 * meetingsEndpoints.js — Endpoint URI builders for Meetings module.
 *
 * Conforms to Section 5.4i of Frontend-API-Guide.md:
 * - /api/meetings
 * - /api/meetings/{id}
 * - /api/meetings/{id}/status
 * - /api/meetings/{id}/attendees
 * - /api/meetings/{id}/attendees/{attendeeId}
 * - /api/meetings/{id}/attachments
 * - /api/meeting-attachments/{id}
 * - /api/meeting-attachments/{id}/download
 * - /api/document-types
 */

export const MEETINGS_ENDPOINTS = {
  MEETINGS: '/api/meetings',
  MEETING_BY_ID: (id) => `/api/meetings/${id}`,
  MEETING_STATUS: (id) => `/api/meetings/${id}/status`,
  ATTENDEES: (id) => `/api/meetings/${id}/attendees`,
  ATTENDEE_BY_ID: (meetingId, attendeeId) => `/api/meetings/${meetingId}/attendees/${attendeeId}`,
  ATTACHMENTS: (id) => `/api/meetings/${id}/attachments`,
  ATTACHMENT_BY_ID: (attachmentId) => `/api/meeting-attachments/${attachmentId}`,
  ATTACHMENT_DOWNLOAD: (attachmentId) => `/api/meeting-attachments/${attachmentId}/download`,
  DOCUMENT_TYPES: '/api/document-types',
};


