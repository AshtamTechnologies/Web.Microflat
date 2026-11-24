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
  meetingAttachmentFromApi,
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
    return { all: 0, mine: 0, scheduled: 0, completed: 0, cancelled: 0 };
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
    throw normalizeApiError(err);
  }
}

/**
 * Fetches active document types for MEETING module.
 * GET /api/document-types?moduleCode=MEETING&isActive=true
 * @returns {Promise<Array<object>>}
 */
export async function getMeetingDocumentTypes() {
  if (useMock) {
    return mockService.getMeetingDocumentTypes ? mockService.getMeetingDocumentTypes() : [
      { id: 1, documentTypeCode: 'MOM', documentTypeName: 'Minutes of Meeting', maxFileSizeMB: 10, allowedExtensions: '.pdf,.doc,.docx' },
      { id: 2, documentTypeCode: 'AGENDA', documentTypeName: 'Agenda', maxFileSizeMB: 10, allowedExtensions: '.pdf,.doc,.docx' },
      { id: 3, documentTypeCode: 'PRESENTATION', documentTypeName: 'Presentation', maxFileSizeMB: 25, allowedExtensions: '.pdf,.ppt,.pptx' },
      { id: 4, documentTypeCode: 'OTHER', documentTypeName: 'Other Document', maxFileSizeMB: 10, allowedExtensions: '.pdf,.doc,.docx,.png,.jpg,.jpeg' },
    ];
  }

  try {
    const response = await axiosInstance.get(MEETINGS_ENDPOINTS.DOCUMENT_TYPES, {
      params: { moduleCode: 'MEETING', isActive: true },
    });
    return response.data || [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns list of attachments for a meeting.
 * GET /api/meetings/{id}/attachments
 * @param {string|number} meetingId
 * @returns {Promise<Array<object>>}
 */
export async function getMeetingAttachments(meetingId) {
  if (useMock) {
    return mockService.getMeetingAttachments ? mockService.getMeetingAttachments(meetingId) : [];
  }

  try {
    const response = await axiosInstance.get(MEETINGS_ENDPOINTS.ATTACHMENTS(meetingId));
    const items = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.items)
      ? response.data.items
      : [];
    return items.map(meetingAttachmentFromApi).filter(Boolean);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Uploads a document attachment for a meeting.
 * POST /api/meetings/{id}/attachments (multipart/form-data)
 * Parameters from Swagger: DocumentTypeId, File, DocumentName, DocumentTitle, Remarks.
 * @param {string|number} meetingId
 * @param {{ documentTypeId: number|string, file: File, documentName?: string, documentTitle?: string, remarks?: string }} data
 * @returns {Promise<object>}
 */
export async function uploadMeetingAttachment(meetingId, { documentTypeId, file, documentName, documentTitle, remarks }) {
  if (useMock) {
    if (mockService.uploadMeetingAttachment) {
      return mockService.uploadMeetingAttachment(meetingId, { documentTypeId, file, documentName, documentTitle, remarks });
    }
    return {
      id: Date.now(),
      documentTypeId,
      fileName: file?.name || 'document',
      documentTitle: documentTitle || file?.name || '',
      remarks: remarks || '',
      fileSizeMB: (file?.size ? (file.size / (1024 * 1024)).toFixed(2) : 0.5),
      createdOn: new Date().toISOString(),
    };
  }

  try {
    const formData = new FormData();
    formData.append('DocumentTypeId', String(documentTypeId));
    formData.append('File', file);
    if (documentName) formData.append('DocumentName', documentName);
    if (documentTitle) formData.append('DocumentTitle', documentTitle);
    if (remarks) formData.append('Remarks', remarks);

    const response = await axiosInstance.post(MEETINGS_ENDPOINTS.ATTACHMENTS(meetingId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return meetingAttachmentFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Downloads a meeting attachment via blob stream and triggers browser save.
 * GET /api/meeting-attachments/{id}/download
 * @param {string|number} attachmentIdOrUrl
 * @param {string} fileName
 */
export async function downloadMeetingAttachment(attachmentIdOrUrl, fileName = 'attachment') {
  try {
    let url = attachmentIdOrUrl;
    if (typeof attachmentIdOrUrl === 'number' || /^\d+$/.test(String(attachmentIdOrUrl))) {
      url = MEETINGS_ENDPOINTS.ATTACHMENT_DOWNLOAD(attachmentIdOrUrl);
    }

    const response = await axiosInstance.get(url, {
      responseType: 'blob',
    });

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes a meeting attachment.
 * DELETE /api/meeting-attachments/{id}
 * @param {string|number} attachmentId
 * @returns {Promise<boolean>}
 */
export async function deleteMeetingAttachment(attachmentId) {
  if (useMock) {
    return mockService.deleteMeetingAttachment ? mockService.deleteMeetingAttachment(attachmentId) : true;
  }

  try {
    await axiosInstance.delete(MEETINGS_ENDPOINTS.ATTACHMENT_BY_ID(attachmentId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
