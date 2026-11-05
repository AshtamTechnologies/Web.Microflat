/**
 * meetingsService.js — Public Meeting service interface for MicroFlat ERP.
 *
 * Current implementation: mock service conforming to Section 5.4i of Frontend-API-Guide.md.
 * Once real backend endpoints are ready, API calls can be wired directly here
 * without modifying UI components.
 */

import * as mockService from './meetingsService.mock';

export async function getMeetings(params) {
  return mockService.getMeetings(params);
}

export async function getMeetingCounts(currentUserId, currentUserEmail, currentUserName) {
  return mockService.getMeetingCounts(currentUserId, currentUserEmail, currentUserName);
}

export async function getMeetingById(id) {
  return mockService.getMeetingById(id);
}

export async function scheduleMeeting(payload, currentUser) {
  return mockService.scheduleMeeting(payload, currentUser);
}

export async function updateMeeting(id, payload) {
  return mockService.updateMeeting(id, payload);
}

export async function changeMeetingStatus(id, { status, remarks }) {
  return mockService.changeMeetingStatus(id, { status, remarks });
}

export async function addAttendee(meetingId, attendeeData) {
  return mockService.addAttendee(meetingId, attendeeData);
}

export async function removeAttendee(meetingId, attendeeId) {
  return mockService.removeAttendee(meetingId, attendeeId);
}

