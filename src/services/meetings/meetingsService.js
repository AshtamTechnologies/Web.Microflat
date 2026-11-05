/**
 * meetingsService.js — Meetings service calling backend endpoints.
 *
 * Implements Section 5.4i of Frontend-API-Guide.md:
 * - List / Search / Filter meetings (GET /api/meetings)
 * - Get meeting by ID with attendees (GET /api/meetings/{id})
 * - Schedule new meeting (POST /api/meetings)
 * - Edit meeting (PUT /api/meetings/{id})
 * - Complete / Cancel status (PATCH /api/meetings/{id}/status)
 * - Manage attendees (GET / POST / DELETE /api/meetings/{id}/attendees)
 *
 * Automatically falls back to mock service if VITE_USE_MOCK_API === 'true'
 * or if backend returns network error / 404.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { MEETINGS_ENDPOINTS } from './meetingsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  meetingFromApi,
  meetingListFromApi,
  meetingToCreatePayload,
  meetingToUpdatePayload,
  attendeeToApi,
  attendeeFromApi,
} from '../../models/meetings/meetingModel';
import * as mockService from './meetingsService.mock';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
  attendees: true,
};

/**
 * Returns list of meetings matching filter criteria.
 * GET /api/meetings
 *
 * @param {object} [params]
 * @returns {Promise<Array<object>>}
 */
export async function getMeetings(params = {}) {
  if (useMock) {
    return mockService.getMeetings(params);
  }

  try {
    const query = {};

    if (params.search && String(params.search).trim()) {
      query.search = String(params.search).trim();
    }
    if (params.status && params.status !== 'ALL') {
      query.status = params.status;
    }
    if (params.meetingType && params.meetingType !== 'ALL') {
      query.meetingType = params.meetingType;
    }
    if (params.inquiryId) {
      query.inquiryId = params.inquiryId;
    }
    if (params.fromDate) {
      query.fromDate = params.fromDate;
    }
    if (params.toDate) {
      query.toDate = params.toDate;
    }
    if (params.mine || params.tab === 'mine') {
      query.mine = true;
    }

    const response = await axiosInstance.get(MEETINGS_ENDPOINTS.MEETINGS, { params: query });
    return meetingListFromApi(response.data);
  } catch (err) {
    // If backend endpoint is unavailable or not deployed yet, fall back gracefully to mock
    if (err?.code === 'ERR_NETWORK' || err?.response?.status === 404) {
      console.warn('[meetingsService] API /api/meetings unavailable, falling back to mock data.', err);
      return mockService.getMeetings(params);
    }
    throw normalizeApiError(err);
  }
}

/**
 * Returns meeting count summary by status and filter.
 * @param {string|number} currentUserId
 * @param {string} currentUserEmail
 * @param {string} currentUserName
 * @returns {Promise<{ all: number, mine: number, scheduled: number, completed: number, cancelled: number }>}
 */
export async function getMeetingCounts(currentUserId, currentUserEmail, currentUserName) {
  if (useMock) {
    return mockService.getMeetingCounts(currentUserId, currentUserEmail, currentUserName);
  }

  try {
    const allMeetings = await getMeetings();
    const scheduled = allMeetings.filter((m) => m.status === 'Scheduled').length;
    const completed = allMeetings.filter((m) => m.status === 'Completed').length;
    const cancelled = allMeetings.filter((m) => m.status === 'Cancelled').length;

    const mineList = await getMeetings({ mine: true });

    return {
      all: allMeetings.length,
      mine: mineList.length,
      scheduled,
      completed,
      cancelled,
    };
  } catch (err) {
    return mockService.getMeetingCounts(currentUserId, currentUserEmail, currentUserName);
  }
}

/**
 * Returns a single meeting by ID, including attendee list.
 * GET /api/meetings/{id}
 *
 * @param {string|number} id
 * @returns {Promise<object>}
 */
export async function getMeetingById(id) {
  if (useMock) {
    return mockService.getMeetingById(id);
  }

  try {
    const response = await axiosInstance.get(MEETINGS_ENDPOINTS.MEETING_BY_ID(id));
    return meetingFromApi(response.data);
  } catch (err) {
    if (err?.code === 'ERR_NETWORK' || err?.response?.status === 404) {
      console.warn(`[meetingsService] API /api/meetings/${id} unavailable, falling back to mock.`, err);
      return mockService.getMeetingById(id);
    }
    throw normalizeApiError(err);
  }
}

/**
 * Schedules a new meeting.
 * POST /api/meetings
 *
 * @param {object} payload
 * @param {object} [currentUser]
 * @returns {Promise<object>}
 */
export async function scheduleMeeting(payload, currentUser) {
  if (useMock) {
    return mockService.scheduleMeeting(payload, currentUser);
  }

  try {
    const body = meetingToCreatePayload(payload);
    const response = await axiosInstance.post(MEETINGS_ENDPOINTS.MEETINGS, body);
    return meetingFromApi(response.data);
  } catch (err) {
    if (err?.code === 'ERR_NETWORK' || err?.response?.status === 404) {
      console.warn('[meetingsService] API POST /api/meetings unavailable, falling back to mock.', err);
      return mockService.scheduleMeeting(payload, currentUser);
    }
    throw normalizeApiError(err);
  }
}

/**
 * Edits an existing meeting.
 * PUT /api/meetings/{id}
 *
 * @param {string|number} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateMeeting(id, payload) {
  if (useMock) {
    return mockService.updateMeeting(id, payload);
  }

  try {
    const body = meetingToUpdatePayload(payload);
    const response = await axiosInstance.put(MEETINGS_ENDPOINTS.MEETING_BY_ID(id), body);
    return meetingFromApi(response.data);
  } catch (err) {
    if (err?.code === 'ERR_NETWORK' || err?.response?.status === 404) {
      console.warn(`[meetingsService] API PUT /api/meetings/${id} unavailable, falling back to mock.`, err);
      return mockService.updateMeeting(id, payload);
    }
    throw normalizeApiError(err);
  }
}

/**
 * Changes meeting status to Completed or Cancelled with outcome/cancellation remarks.
 * PATCH /api/meetings/{id}/status
 *
 * @param {string|number} id
 * @param {{ status: 'Completed'|'Cancelled', remarks: string }} data
 * @returns {Promise<object>}
 */
export async function changeMeetingStatus(id, { status, remarks }) {
  if (useMock) {
    return mockService.changeMeetingStatus(id, { status, remarks });
  }

  try {
    const response = await axiosInstance.patch(MEETINGS_ENDPOINTS.MEETING_STATUS(id), {
      status,
      remarks,
    });
    return meetingFromApi(response.data);
  } catch (err) {
    if (err?.code === 'ERR_NETWORK' || err?.response?.status === 404) {
      console.warn(`[meetingsService] API PATCH /api/meetings/${id}/status unavailable, falling back to mock.`, err);
      return mockService.changeMeetingStatus(id, { status, remarks });
    }
    throw normalizeApiError(err);
  }
}

/**
 * Adds an attendee to an existing meeting.
 * POST /api/meetings/{id}/attendees
 *
 * @param {string|number} meetingId
 * @param {object} attendeeData
 * @returns {Promise<object>}
 */
export async function addAttendee(meetingId, attendeeData) {
  if (useMock) {
    return mockService.addAttendee(meetingId, attendeeData);
  }

  try {
    const body = attendeeToApi(attendeeData);
    const response = await axiosInstance.post(MEETINGS_ENDPOINTS.ATTENDEES(meetingId), body);
    return attendeeFromApi(response.data);
  } catch (err) {
    if (err?.code === 'ERR_NETWORK' || err?.response?.status === 404) {
      console.warn(`[meetingsService] API POST /api/meetings/${meetingId}/attendees unavailable, falling back to mock.`, err);
      return mockService.addAttendee(meetingId, attendeeData);
    }
    throw normalizeApiError(err);
  }
}

/**
 * Removes an attendee from an existing meeting.
 * DELETE /api/meetings/{id}/attendees/{attendeeId}
 *
 * @param {string|number} meetingId
 * @param {string|number} attendeeId
 * @returns {Promise<boolean>}
 */
export async function removeAttendee(meetingId, attendeeId) {
  if (useMock) {
    return mockService.removeAttendee(meetingId, attendeeId);
  }

  try {
    await axiosInstance.delete(MEETINGS_ENDPOINTS.ATTENDEE_BY_ID(meetingId, attendeeId));
    return true;
  } catch (err) {
    if (err?.code === 'ERR_NETWORK' || err?.response?.status === 404) {
      console.warn(`[meetingsService] API DELETE /api/meetings/${meetingId}/attendees/${attendeeId} unavailable, falling back to mock.`, err);
      return mockService.removeAttendee(meetingId, attendeeId);
    }
    throw normalizeApiError(err);
  }
}
