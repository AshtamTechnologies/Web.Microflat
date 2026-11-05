/**
 * meetingsService.mock.js — In-memory mock service for Meeting operations.
 *
 * Conforms to Section 5.4i of Frontend-API-Guide.md:
 * - List / Search / Filter meetings
 * - Get meeting by ID (with attendees)
 * - Schedule new meeting (Internal / Client / Vendor)
 * - Edit meeting
 * - Complete meeting (with outcome remarks)
 * - Cancel meeting (with cancellation reason)
 * - Add / Remove attendees
 */

import { mockUsers } from '../../mocks/users';

function getDateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let mockMeetings = [
  {
    id: 1,
    meetingTitle: 'Design Review & Custom Plate Specs Discussion',
    meetingType: 'Client',
    inquiryId: 101,
    inquiryNumber: 'INQ-2026-0042',
    meetingDate: getDateOffset(1),
    startTime: '10:30',
    endTime: '11:30',
    location: 'Conference Room Alpha & Google Meet',
    agenda: 'Review engineering drawings for high-precision cast iron surface plates and finalize tolerances for client approval.',
    status: 'Scheduled',
    remarks: null,
    organizerId: 'u1',
    organizerName: 'Krupal Bhoi',
    organizerEmail: 'krupal.bhoi@microflat.com',
    attendees: [
      {
        id: 101,
        userId: 'u1',
        name: 'Krupal Bhoi',
        email: 'krupal.bhoi@microflat.com',
        role: 'Super Admin',
        isInternal: true,
      },
      {
        id: 102,
        userId: 'u11',
        name: 'Arjun Sharma',
        email: 'arjun.sharma@ashtamtechnologies.com',
        role: 'Supervisor',
        isInternal: true,
      },
      {
        id: 103,
        externalName: 'Dharmesh Patel',
        externalEmail: 'dharmesh@apexindustries.com',
        isInternal: false,
      },
    ],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 2,
    meetingTitle: 'Supplier Cost Negotiation - Raw Granite Blocks',
    meetingType: 'Vendor',
    inquiryId: null,
    inquiryNumber: null,
    meetingDate: getDateOffset(3),
    startTime: '14:00',
    endTime: '15:00',
    location: 'Procurement Meeting Room (Ground Floor)',
    agenda: 'Quarterly price lock negotiation for Grade-00 Black Granite raw blocks and delivery schedules.',
    status: 'Scheduled',
    remarks: null,
    organizerId: 'u1',
    organizerName: 'Krupal Bhoi',
    organizerEmail: 'krupal.bhoi@microflat.com',
    attendees: [
      {
        id: 201,
        userId: 'u1',
        name: 'Krupal Bhoi',
        email: 'krupal.bhoi@microflat.com',
        role: 'Super Admin',
        isInternal: true,
      },
      {
        id: 202,
        userId: 'u12',
        name: 'Priya Mehta',
        email: 'priya.mehta@ashtamtechnologies.com',
        role: 'Regional Manager',
        isInternal: true,
      },
      {
        id: 203,
        externalName: 'Vikram Singhal',
        externalEmail: 'v.singhal@deccanminerals.com',
        isInternal: false,
      },
    ],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 3,
    meetingTitle: 'Internal Sprint Planning & Workload Sync',
    meetingType: 'Internal',
    inquiryId: null,
    inquiryNumber: null,
    meetingDate: getDateOffset(-2),
    startTime: '09:30',
    endTime: '10:30',
    location: 'Virtual (Microsoft Teams)',
    agenda: 'Review open production orders, assign quality inspection schedules, and balance machine shop capacity.',
    status: 'Completed',
    remarks: 'Sprint backlog finalized. Calibration lab prioritized for pending export batches.',
    organizerId: 'u1',
    organizerName: 'Ian Chesnut',
    organizerEmail: 'ian.chesnut@gmail.com',
    attendees: [
      {
        id: 301,
        userId: 'u1',
        name: 'Ian Chesnut',
        email: 'ian.chesnut@gmail.com',
        role: 'Super Admin',
        isInternal: true,
      },
      {
        id: 302,
        userId: 'u4',
        name: 'Scott Walter',
        email: 'scott@gmail.com',
        role: 'Inspector',
        isInternal: true,
      },
    ],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 4,
    meetingTitle: 'Client Kickoff - Heavy Duty Stand Requirements',
    meetingType: 'Client',
    inquiryId: 102,
    inquiryNumber: 'INQ-2026-0048',
    meetingDate: getDateOffset(-5),
    startTime: '11:00',
    endTime: '12:00',
    location: 'Boardroom B',
    agenda: 'Initial technical inquiry walkthrough for anti-vibration heavy duty support stands.',
    status: 'Cancelled',
    remarks: 'Client postponed due to overseas plant audit. To be rescheduled next month.',
    organizerId: 'u2',
    organizerName: 'Zeki Mokharzada',
    organizerEmail: 'zeki@gmail.com',
    attendees: [
      {
        id: 401,
        userId: 'u2',
        name: 'Zeki Mokharzada',
        email: 'zeki@gmail.com',
        role: 'Admin',
        isInternal: true,
      },
      {
        id: 402,
        externalName: 'Anil Desai',
        externalEmail: 'anil.desai@precisioneng.com',
        isInternal: false,
      },
    ],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 5,
    meetingTitle: 'Annual Calibration Standards Compliance Review',
    meetingType: 'Internal',
    inquiryId: null,
    inquiryNumber: null,
    meetingDate: getDateOffset(4),
    startTime: '15:30',
    endTime: '16:30',
    location: 'QA Testing Room',
    agenda: 'Prepare documentation for upcoming NABL audit and verify thermal expansion calibration certificates.',
    status: 'Scheduled',
    remarks: null,
    organizerId: 'u11',
    organizerName: 'Arjun Sharma',
    organizerEmail: 'arjun.sharma@ashtamtechnologies.com',
    attendees: [
      {
        id: 501,
        userId: 'u11',
        name: 'Arjun Sharma',
        email: 'arjun.sharma@ashtamtechnologies.com',
        role: 'Supervisor',
        isInternal: true,
      },
      {
        id: 502,
        userId: 'u1',
        name: 'Ian Chesnut',
        email: 'ian.chesnut@gmail.com',
        role: 'Super Admin',
        isInternal: true,
      },
    ],
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

let nextMeetingId = 6;
let nextAttendeeId = 601;

function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUserMeeting(m, currentUserId, currentUserEmail, currentUserName) {
  const uid = currentUserId ? String(currentUserId).trim().toLowerCase() : '';
  const email = currentUserEmail ? String(currentUserEmail).trim().toLowerCase() : '';
  const name = currentUserName ? String(currentUserName).trim().toLowerCase() : '';

  if (uid && String(m.organizerId).toLowerCase() === uid) return true;
  if (email && m.organizerEmail?.toLowerCase() === email) return true;
  if (name && m.organizerName?.toLowerCase().includes(name)) return true;

  if (uid === 'u1' || uid === '1' || uid === '2' || email.includes('krupal') || name.includes('krupal')) {
    if (String(m.organizerId).toLowerCase() === 'u1') return true;
  }

  return (m.attendees || []).some((a) => {
    if (uid && String(a.userId).toLowerCase() === uid) return true;
    if (email && a.email?.toLowerCase() === email) return true;
    if (name && a.name?.toLowerCase().includes(name)) return true;
    if (uid === 'u1' || email.includes('krupal') || name.includes('krupal')) {
      if (String(a.userId).toLowerCase() === 'u1') return true;
    }
    return false;
  });
}

/**
 * Filter and search meetings
 */
export async function getMeetings(params = {}) {
  await delay();
  const {
    search = '',
    status = '',
    meetingType = '',
    inquiryId = '',
    fromDate = '',
    toDate = '',
    mine = false,
    currentUserId = 'u1',
    currentUserEmail = '',
    currentUserName = '',
  } = params;

  let results = [...mockMeetings];

  // Mine filter
  if (mine || params.tab === 'mine') {
    results = results.filter((m) => isUserMeeting(m, currentUserId, currentUserEmail, currentUserName));
  }

  // Status filter
  if (status && status !== 'ALL') {
    results = results.filter((m) => m.status.toLowerCase() === status.toLowerCase());
  }

  // Meeting Type filter
  if (meetingType && meetingType !== 'ALL') {
    results = results.filter((m) => m.meetingType.toLowerCase() === meetingType.toLowerCase());
  }

  // Inquiry filter
  if (inquiryId) {
    results = results.filter((m) => String(m.inquiryId) === String(inquiryId));
  }

  // Date range
  if (fromDate) {
    results = results.filter((m) => m.meetingDate >= fromDate);
  }
  if (toDate) {
    results = results.filter((m) => m.meetingDate <= toDate);
  }

  // Search query
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter((m) => {
      const matchTitle = m.meetingTitle?.toLowerCase().includes(q);
      const matchLoc = m.location?.toLowerCase().includes(q);
      const matchInquiry = m.inquiryNumber?.toLowerCase().includes(q);
      const matchAgenda = m.agenda?.toLowerCase().includes(q);
      const matchAttendee = m.attendees.some(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.externalName?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.externalEmail?.toLowerCase().includes(q)
      );
      return matchTitle || matchLoc || matchInquiry || matchAgenda || matchAttendee;
    });
  }

  // Sort: upcoming first, then recent
  results.sort((a, b) => {
    if (a.meetingDate === b.meetingDate) {
      return (a.startTime || '').localeCompare(b.startTime || '');
    }
    return b.meetingDate.localeCompare(a.meetingDate);
  });

  return results;
}

/**
 * Counts for badge counters and tabs
 */
export async function getMeetingCounts(currentUserId = 'u1', currentUserEmail = '', currentUserName = '') {
  await delay(60);
  const mine = mockMeetings.filter((m) => isUserMeeting(m, currentUserId, currentUserEmail, currentUserName));
  return {
    all: mockMeetings.length,
    mine: mine.length,
    scheduled: mockMeetings.filter((m) => m.status === 'Scheduled').length,
    completed: mockMeetings.filter((m) => m.status === 'Completed').length,
    cancelled: mockMeetings.filter((m) => m.status === 'Cancelled').length,
  };
}

/**
 * Get meeting by ID
 */
export async function getMeetingById(id) {
  await delay();
  const numId = Number(id);
  const meeting = mockMeetings.find((m) => m.id === numId || String(m.id) === String(id));
  if (!meeting) {
    throw new Error(`Meeting #${id} not found.`);
  }
  return JSON.parse(JSON.stringify(meeting));
}

/**
 * Schedule a new meeting
 */
export async function scheduleMeeting(payload, currentUser = {}) {
  await delay();

  const organizerId = currentUser.userId || currentUser.id || 'u1';
  const organizerName =
    currentUser.name ||
    (currentUser.firstName && currentUser.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : 'Ian Chesnut');
  const organizerEmail = currentUser.email || 'ian.chesnut@gmail.com';

  const processedAttendees = (payload.attendees || []).map((att) => {
    if (att.userId) {
      const u = mockUsers.find((x) => String(x.id) === String(att.userId));
      return {
        id: nextAttendeeId++,
        userId: att.userId,
        name: u ? `${u.firstName} ${u.lastName}` : att.name || 'User',
        email: u?.email || att.email || '',
        role: u?.role || u?.roles?.[0] || 'Member',
        isInternal: true,
      };
    }
    return {
      id: nextAttendeeId++,
      externalName: att.externalName || 'Guest',
      externalEmail: att.externalEmail || '',
      isInternal: false,
    };
  });

  // Ensure organizer is in attendees list
  const hasOrganizer = processedAttendees.some((a) => a.userId === organizerId);
  if (!hasOrganizer) {
    processedAttendees.unshift({
      id: nextAttendeeId++,
      userId: organizerId,
      name: organizerName,
      email: organizerEmail,
      role: currentUser.role || 'Organizer',
      isInternal: true,
    });
  }

  const newMeeting = {
    id: nextMeetingId++,
    meetingTitle: payload.meetingTitle,
    meetingType: payload.meetingType || 'Internal',
    inquiryId: payload.inquiryId ? Number(payload.inquiryId) : null,
    inquiryNumber: payload.inquiryNumber || (payload.inquiryId ? `INQ-2026-${payload.inquiryId}` : null),
    meetingDate: payload.meetingDate,
    startTime: payload.startTime,
    endTime: payload.endTime || '',
    location: payload.location || '',
    agenda: payload.agenda || '',
    status: 'Scheduled',
    remarks: null,
    organizerId,
    organizerName,
    organizerEmail,
    attendees: processedAttendees,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockMeetings.unshift(newMeeting);
  return JSON.parse(JSON.stringify(newMeeting));
}

/**
 * Edit meeting details (only when Scheduled)
 */
export async function updateMeeting(id, payload) {
  await delay();
  const numId = Number(id);
  const idx = mockMeetings.findIndex((m) => m.id === numId || String(m.id) === String(id));
  if (idx === -1) throw new Error(`Meeting #${id} not found.`);

  const current = mockMeetings[idx];
  if (current.status !== 'Scheduled') {
    throw new Error(`Only Scheduled meetings can be edited.`);
  }

  mockMeetings[idx] = {
    ...current,
    meetingTitle: payload.meetingTitle ?? current.meetingTitle,
    meetingType: payload.meetingType ?? current.meetingType,
    inquiryId: payload.inquiryId ? Number(payload.inquiryId) : null,
    inquiryNumber: payload.inquiryNumber ?? current.inquiryNumber,
    meetingDate: payload.meetingDate ?? current.meetingDate,
    startTime: payload.startTime ?? current.startTime,
    endTime: payload.endTime ?? current.endTime,
    location: payload.location ?? current.location,
    agenda: payload.agenda ?? current.agenda,
    updatedAt: new Date().toISOString(),
  };

  // If attendees were also passed during form edit
  if (Array.isArray(payload.attendees)) {
    mockMeetings[idx].attendees = payload.attendees.map((att) => {
      if (att.id) return att;
      if (att.userId) {
        const u = mockUsers.find((x) => String(x.id) === String(att.userId));
        return {
          id: nextAttendeeId++,
          userId: att.userId,
          name: u ? `${u.firstName} ${u.lastName}` : att.name || 'User',
          email: u?.email || att.email || '',
          role: u?.role || u?.roles?.[0] || 'Member',
          isInternal: true,
        };
      }
      return {
        id: nextAttendeeId++,
        externalName: att.externalName,
        externalEmail: att.externalEmail || '',
        isInternal: false,
      };
    });
  }

  return JSON.parse(JSON.stringify(mockMeetings[idx]));
}

/**
 * Change status (Complete or Cancel with remarks)
 */
export async function changeMeetingStatus(id, { status, remarks }) {
  await delay();
  const numId = Number(id);
  const idx = mockMeetings.findIndex((m) => m.id === numId || String(m.id) === String(id));
  if (idx === -1) throw new Error(`Meeting #${id} not found.`);

  mockMeetings[idx].status = status;
  mockMeetings[idx].remarks = remarks || '';
  mockMeetings[idx].updatedAt = new Date().toISOString();

  return JSON.parse(JSON.stringify(mockMeetings[idx]));
}

/**
 * Add an attendee to a meeting
 */
export async function addAttendee(meetingId, attendeeData) {
  await delay();
  const numId = Number(meetingId);
  const m = mockMeetings.find((x) => x.id === numId || String(x.id) === String(meetingId));
  if (!m) throw new Error(`Meeting #${meetingId} not found.`);

  let newAtt;
  if (attendeeData.userId) {
    const u = mockUsers.find((x) => String(x.id) === String(attendeeData.userId));
    newAtt = {
      id: nextAttendeeId++,
      userId: attendeeData.userId,
      name: u ? `${u.firstName} ${u.lastName}` : attendeeData.name || 'User',
      email: u?.email || attendeeData.email || '',
      role: u?.role || u?.roles?.[0] || 'Member',
      isInternal: true,
    };
  } else {
    newAtt = {
      id: nextAttendeeId++,
      externalName: attendeeData.externalName || 'Guest',
      externalEmail: attendeeData.externalEmail || '',
      isInternal: false,
    };
  }

  m.attendees.push(newAtt);
  m.updatedAt = new Date().toISOString();
  return newAtt;
}

/**
 * Remove an attendee
 */
export async function removeAttendee(meetingId, attendeeId) {
  await delay();
  const numId = Number(meetingId);
  const m = mockMeetings.find((x) => x.id === numId || String(x.id) === String(meetingId));
  if (!m) throw new Error(`Meeting #${meetingId} not found.`);

  m.attendees = m.attendees.filter((a) => a.id !== Number(attendeeId) && String(a.id) !== String(attendeeId));
  m.updatedAt = new Date().toISOString();
  return { success: true };
}

