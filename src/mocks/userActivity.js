/**
 * userActivity.js — Mock activity and audit trail generator for Users.
 *
 * Synchronized with userSessions: 'login' events are generated directly
 * from the user's session history so timelines and session logs never disagree.
 */

import { formatDateTime } from '../utils/dateTime';

export const USER_ACTION_TEMPLATES = [
  {
    type: 'assignment',
    title: 'Assigned to Inquiry',
    remarks: 'Assigned as Lead Metrologist for INQ-2026-0042 (Surface Plate Inspection)',
    offsetDays: 1,
  },
  {
    type: 'created',
    title: 'Created Purchase Requisition',
    remarks: 'Generated PR-2026-0108 for Granite Calibration Standards',
    offsetDays: 3,
  },
  {
    type: 'status',
    title: 'Approved Vendor Profile',
    remarks: 'Verified ISO 17025 certification documents for Apex Precision Tools',
    offsetDays: 6,
  },
  {
    type: 'note',
    title: 'Added Audit Note',
    remarks: 'Updated quarterly metrology compliance checklist and lab calibration logs',
    offsetDays: 10,
  },
  {
    type: 'status',
    title: 'Updated System Configuration',
    remarks: 'Modified Series Prefix and Sequence numbering format for Sales Orders',
    offsetDays: 15,
  },
];

/**
 * Returns combined activities for a user, dynamically converting sessions into login events
 * and merging with user action events.
 *
 * @param {string} userId
 * @param {Array} sessions
 * @returns {Array} Array of activity events sorted newest first
 */
export function getUserActivities(userId, sessions = []) {
  if (!userId) return [];

  // Filter sessions for this specific user
  const userSessions = sessions.filter((s) => s.userId === userId);

  // 1. Convert sessions to activity events
  const sessionActivities = userSessions.map((sess) => {
    const isTimeout = sess.logoutType === 'timeout';
    const isActive = !sess.logoutAt && !sess.logoutType;

    let title = 'Signed In to System';
    let remarks = `Session started from ${sess.ipAddress} (${sess.device} • ${sess.browser} on ${sess.os})`;
    if (isActive) {
      remarks += ' — Currently Active';
    } else if (isTimeout) {
      remarks += ' — Session expired via inactivity timeout';
    } else if (sess.logoutAt) {
      remarks += ` — Signed out at ${formatDateTime(sess.logoutAt)}`;
    }

    return {
      id: `act_sess_${sess.sessionId}`,
      type: 'login',
      title,
      timestamp: formatDateTime(sess.loginAt),
      rawTimestamp: sess.loginAt,
      remarks,
      ipAddress: sess.ipAddress,
      device: sess.device,
    };
  });

  // 2. Add realistic action events for this user if they have sessions
  const actionActivities = [];
  if (userSessions.length > 0) {
    USER_ACTION_TEMPLATES.forEach((tmpl, idx) => {
      // Calculate a relative date based on template offset
      const d = new Date('2026-10-09T10:00:00.000Z');
      d.setDate(d.getDate() - tmpl.offsetDays - (idx * 2));
      const iso = d.toISOString();

      actionActivities.push({
        id: `act_user_${userId}_${idx}`,
        type: tmpl.type,
        title: tmpl.title,
        timestamp: formatDateTime(iso),
        rawTimestamp: iso,
        remarks: tmpl.remarks,
      });
    });
  }

  // Combine and sort newest first
  return [...sessionActivities, ...actionActivities].sort((a, b) => {
    return new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime();
  });
}
