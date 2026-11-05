/**
 * meetingModel.js — Data models, normalizers, and serializers for Meeting module.
 *
 * Conforms to Section 5.4i of Frontend-API-Guide.md:
 * - meetingTitle, meetingType ("Internal"|"Client"|"Vendor"), inquiryId, meetingDate,
 *   startTime ("HH:mm"), endTime ("HH:mm"), location, agenda, status, remarks.
 * - attendeeCount: count returned by GET /api/meetings
 * - attendees: internal ({ userId }) or external ({ externalName, externalEmail? }).
 */

/**
 * Normalizes a single attendee record from the API.
 * @param {object} raw
 * @param {number} [index=0]
 * @returns {object}
 */
export function attendeeFromApi(raw = {}, index = 0) {
  if (!raw) return null;

  const isInternal = Boolean(raw.isInternal !== undefined ? raw.isInternal : raw.userId);
  const name =
    raw.name ||
    raw.userName ||
    (raw.user ? `${raw.user.firstName || ''} ${raw.user.lastName || ''}`.trim() : null) ||
    raw.externalName ||
    'Attendee';

  const email = raw.email || raw.userEmail || (raw.user && raw.user.email) || raw.externalEmail || '';
  const role = raw.role || raw.userRole || (isInternal ? 'Internal Staff' : 'External Attendee');

  return {
    id: raw.id || raw.attendeeId || `att-${index}`,
    userId: raw.userId ? String(raw.userId) : null,
    name,
    email,
    role,
    isInternal,
    externalName: isInternal ? null : raw.externalName || name,
    externalEmail: isInternal ? null : raw.externalEmail || email,
  };
}

/**
 * Serializes an attendee object into the API payload format.
 * @param {object} attendee
 * @returns {object}
 */
export function attendeeToApi(attendee = {}) {
  if (attendee.isInternal || attendee.userId) {
    return {
      userId: Number(attendee.userId) || attendee.userId,
    };
  }

  return {
    externalName: attendee.externalName || attendee.name || '',
    externalEmail: attendee.externalEmail || attendee.email || null,
  };
}

/**
 * Normalizes a single meeting record from the API response.
 * @param {object} raw
 * @returns {object|null}
 */
export function meetingFromApi(raw = {}) {
  if (!raw) return null;

  const rawAttendees = Array.isArray(raw.attendees) ? raw.attendees : [];
  const attendees = rawAttendees.map((att, idx) => attendeeFromApi(att, idx)).filter(Boolean);

  const status = raw.status || 'Scheduled';
  const attendeeCount =
    raw.attendeeCount !== undefined && raw.attendeeCount !== null
      ? Number(raw.attendeeCount)
      : attendees.length;

  return {
    id: raw.id ?? raw.meetingId,
    meetingTitle: raw.meetingTitle || raw.title || '',
    meetingType: raw.meetingType || 'Internal',
    inquiryId: raw.inquiryId ?? null,
    inquiryNumber: raw.inquiryNumber || raw.inquiryNo || (raw.inquiry && (raw.inquiry.inquiryNumber || raw.inquiry.inquiryNo)) || '',
    meetingDate: raw.meetingDate ? String(raw.meetingDate).slice(0, 10) : '',
    startTime: raw.startTime ? String(raw.startTime).slice(0, 5) : '',
    endTime: raw.endTime ? String(raw.endTime).slice(0, 5) : '',
    location: raw.location || '',
    agenda: raw.agenda || '',
    status: status,
    remarks: raw.remarks || null,
    attendeeCount,
    organizerId: raw.organizerUserId ? String(raw.organizerUserId) : raw.organizerId ? String(raw.organizerId) : (raw.organizer && String(raw.organizer.id)) || '',
    organizerName:
      raw.organizerName ||
      (raw.organizer ? `${raw.organizer.firstName || ''} ${raw.organizer.lastName || ''}`.trim() : '') ||
      'Organizer',
    organizerEmail: raw.organizerEmail || (raw.organizer && raw.organizer.email) || '',
    attendees,
    canEdit: status === 'Scheduled',
    canCancel: status === 'Scheduled',
    canComplete: status === 'Scheduled',
    createdAt: raw.createdAt || raw.createdOn || null,
    updatedAt: raw.updatedAt || raw.lastUpdatedOn || null,
  };
}

/**
 * Normalizes a list of meetings from the API response.
 * Handles both plain arrays and wrapped paginated responses { items: [...] }.
 * @param {unknown} data
 * @returns {Array<object>}
 */
export function meetingListFromApi(data) {
  if (!data) return [];
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.data)
    ? data.data
    : [];
  return items.map(meetingFromApi).filter(Boolean);
}

/**
 * Serializes meeting form data into POST /api/meetings payload.
 * Per Section 5.4i: includes attendees.
 * @param {object} form
 * @returns {object}
 */
export function meetingToCreatePayload(form = {}) {
  const payload = {
    meetingTitle: (form.meetingTitle || form.title || '').trim(),
    meetingType: form.meetingType || 'Internal',
    inquiryId: form.inquiryId ? Number(form.inquiryId) : null,
    meetingDate: form.meetingDate ? String(form.meetingDate).slice(0, 10) : '',
    startTime: form.startTime || '',
    endTime: form.endTime || null,
    location: (form.location || '').trim() || null,
    agenda: (form.agenda || '').trim() || null,
    attendees: Array.isArray(form.attendees) ? form.attendees.map(attendeeToApi) : [],
  };

  return payload;
}

/**
 * Serializes meeting form data into PUT /api/meetings/{id} payload.
 * Per Section 5.4i: same body without attendees.
 * @param {object} form
 * @returns {object}
 */
export function meetingToUpdatePayload(form = {}) {
  const payload = {
    meetingTitle: (form.meetingTitle || form.title || '').trim(),
    meetingType: form.meetingType || 'Internal',
    inquiryId: form.inquiryId ? Number(form.inquiryId) : null,
    meetingDate: form.meetingDate ? String(form.meetingDate).slice(0, 10) : '',
    startTime: form.startTime || '',
    endTime: form.endTime || null,
    location: (form.location || '').trim() || null,
    agenda: (form.agenda || '').trim() || null,
  };

  return payload;
}
