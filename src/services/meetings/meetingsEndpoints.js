/**
 * meetingsEndpoints.js — Endpoint URI builders for Meetings module.
 *
 * Conforms to Section 5.4i of Frontend-API-Guide.md:
 * - /api/meetings
 * - /api/meetings/{id}
 * - /api/meetings/{id}/status
 * - /api/meetings/{id}/attendees
 * - /api/meetings/{id}/attendees/{attendeeId}
 */

export const MEETINGS_ENDPOINTS = {
  MEETINGS: '/api/meetings',
  MEETING_BY_ID: (id) => `/api/meetings/${id}`,
  MEETING_STATUS: (id) => `/api/meetings/${id}/status`,
  ATTENDEES: (id) => `/api/meetings/${id}/attendees`,
  ATTENDEE_BY_ID: (meetingId, attendeeId) => `/api/meetings/${meetingId}/attendees/${attendeeId}`,
};

