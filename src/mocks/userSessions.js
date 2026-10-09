/**
 * userSessions.js — Mock session records for User login history.
 *
 * Comment: Real logout times only exist when the backend tracks sessions
 * and records an explicit logout; IP comes from the server request
 * (req.ip / X-Forwarded-For); the browser can't supply it. This mock
 * stands in until an API exists.
 */

const NOW = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function getInitialUserSessions() {
  return [
    /* ── User u1 (Ian Chesnut - Super Admin) — Has ACTIVE session right now ── */
    {
      sessionId: 'sess_u1_01',
      userId: 'u1',
      loginAt: new Date(NOW - 35 * MIN).toISOString(),
      logoutAt: null,
      logoutType: null,
      ipAddress: '192.168.1.105',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },
    {
      sessionId: 'sess_u1_02',
      userId: 'u1',
      loginAt: new Date(NOW - (1 * DAY + 4 * HOUR)).toISOString(),
      logoutAt: new Date(NOW - (1 * DAY - 4 * HOUR + 45 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '192.168.1.105',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },
    {
      sessionId: 'sess_u1_03',
      userId: 'u1',
      loginAt: new Date(NOW - 2 * DAY).toISOString(),
      logoutAt: null,
      logoutType: 'timeout',
      ipAddress: '10.20.4.12',
      device: 'Mobile',
      browser: 'Mobile Safari 18',
      os: 'iOS 18',
    },
    {
      sessionId: 'sess_u1_04',
      userId: 'u1',
      loginAt: new Date(NOW - 3 * DAY).toISOString(),
      logoutAt: new Date(NOW - (3 * DAY - 9 * HOUR + 25 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '192.168.1.105',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },
    {
      sessionId: 'sess_u1_05',
      userId: 'u1',
      loginAt: new Date(NOW - 5 * DAY).toISOString(),
      logoutAt: new Date(NOW - (5 * DAY - 2 * HOUR + 15 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '172.16.2.88',
      device: 'Tablet',
      browser: 'Chrome 128',
      os: 'Android 14',
    },
    {
      sessionId: 'sess_u1_06',
      userId: 'u1',
      loginAt: new Date(NOW - 10 * DAY).toISOString(),
      logoutAt: new Date(NOW - (10 * DAY - 2 * HOUR + 45 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '192.168.1.105',
      device: 'Desktop',
      browser: 'Firefox 130',
      os: 'Windows 11',
    },

    /* ── User u2 (Zeki Mokharzada) ── */
    {
      sessionId: 'sess_u2_01',
      userId: 'u2',
      loginAt: new Date(NOW - (2 * DAY + 3 * HOUR)).toISOString(),
      logoutAt: new Date(NOW - (2 * DAY + 30 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '49.36.128.91',
      device: 'Desktop',
      browser: 'Edge 128',
      os: 'Windows 10',
    },
    {
      sessionId: 'sess_u2_02',
      userId: 'u2',
      loginAt: new Date(NOW - 4 * DAY).toISOString(),
      logoutAt: null,
      logoutType: 'timeout',
      ipAddress: '49.36.128.91',
      device: 'Desktop',
      browser: 'Edge 128',
      os: 'Windows 10',
    },
    {
      sessionId: 'sess_u2_03',
      userId: 'u2',
      loginAt: new Date(NOW - 8 * DAY).toISOString(),
      logoutAt: new Date(NOW - (8 * DAY - 45 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '103.21.144.60',
      device: 'Mobile',
      browser: 'Chrome Mobile',
      os: 'Android 14',
    },

    /* ── User u3 (Faith Robinson) ── */
    {
      sessionId: 'sess_u3_01',
      userId: 'u3',
      loginAt: new Date(NOW - (3 * HOUR + 30 * MIN)).toISOString(),
      logoutAt: new Date(NOW - (1 * HOUR + 15 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '115.112.98.14',
      device: 'Desktop',
      browser: 'Firefox 130',
      os: 'macOS 15',
    },
    {
      sessionId: 'sess_u3_02',
      userId: 'u3',
      loginAt: new Date(NOW - (1 * DAY + 5 * HOUR)).toISOString(),
      logoutAt: new Date(NOW - (1 * DAY - 3 * HOUR + 45 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '115.112.98.14',
      device: 'Desktop',
      browser: 'Firefox 130',
      os: 'macOS 15',
    },
    {
      sessionId: 'sess_u3_03',
      userId: 'u3',
      loginAt: new Date(NOW - 3 * DAY).toISOString(),
      logoutAt: null,
      logoutType: 'timeout',
      ipAddress: '115.112.98.14',
      device: 'Desktop',
      browser: 'Firefox 130',
      os: 'macOS 15',
    },

    /* ── User u4 (Scott Walter) ── */
    {
      sessionId: 'sess_u4_01',
      userId: 'u4',
      loginAt: new Date(NOW - (1 * DAY + 2 * HOUR)).toISOString(),
      logoutAt: new Date(NOW - (1 * DAY - 2 * HOUR + 10 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '182.73.120.45',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },
    {
      sessionId: 'sess_u4_02',
      userId: 'u4',
      loginAt: new Date(NOW - 4 * DAY).toISOString(),
      logoutAt: null,
      logoutType: 'timeout',
      ipAddress: '182.73.120.45',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },

    /* ── User u5 (Chris Bowen) -> NO SESSIONS (Exercises the "Never" state) ── */

    /* ── User u6 (Track Aksam) ── */
    {
      sessionId: 'sess_u6_01',
      userId: 'u6',
      loginAt: new Date(NOW - 11 * DAY).toISOString(),
      logoutAt: new Date(NOW - (11 * DAY - 3 * HOUR + 40 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '122.170.80.33',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 10',
    },
    {
      sessionId: 'sess_u6_02',
      userId: 'u6',
      loginAt: new Date(NOW - 19 * DAY).toISOString(),
      logoutAt: null,
      logoutType: 'timeout',
      ipAddress: '122.170.80.33',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 10',
    },

    /* ── User u7 (Natali Emanuel) ── */
    {
      sessionId: 'sess_u7_01',
      userId: 'u7',
      loginAt: new Date(NOW - 4 * HOUR).toISOString(),
      logoutAt: new Date(NOW - (1 * HOUR + 55 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '103.88.220.18',
      device: 'Desktop',
      browser: 'Safari 18',
      os: 'macOS 15',
    },
    {
      sessionId: 'sess_u7_02',
      userId: 'u7',
      loginAt: new Date(NOW - 2 * DAY).toISOString(),
      logoutAt: new Date(NOW - (2 * DAY - 7 * HOUR + 30 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '103.88.220.18',
      device: 'Desktop',
      browser: 'Safari 18',
      os: 'macOS 15',
    },

    /* ── User u8 (Dan Spanser) -> NO SESSIONS (Exercises the "Never" state) ── */

    /* ── User u9 (Tonye Gabril) ── */
    {
      sessionId: 'sess_u9_01',
      userId: 'u9',
      loginAt: new Date(NOW - (1 * DAY + 1 * HOUR)).toISOString(),
      logoutAt: new Date(NOW - (1 * DAY - 1 * HOUR + 40 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '117.240.15.62',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },
    {
      sessionId: 'sess_u9_02',
      userId: 'u9',
      loginAt: new Date(NOW - 3 * DAY).toISOString(),
      logoutAt: null,
      logoutType: 'timeout',
      ipAddress: '117.240.15.62',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },

    /* ── User u10 (Erin Holland) ── */
    {
      sessionId: 'sess_u10_01',
      userId: 'u10',
      loginAt: new Date(NOW - 2 * DAY).toISOString(),
      logoutAt: new Date(NOW - (2 * DAY - 3 * HOUR + 30 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '125.19.24.89',
      device: 'Tablet',
      browser: 'Chrome 128',
      os: 'iPadOS 18',
    },

    /* ── User u11 (Arjun Sharma) — Has ACTIVE session right now ── */
    {
      sessionId: 'sess_u11_01',
      userId: 'u11',
      loginAt: new Date(NOW - 20 * MIN).toISOString(),
      logoutAt: null,
      logoutType: null,
      ipAddress: '192.168.1.112',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },
    {
      sessionId: 'sess_u11_02',
      userId: 'u11',
      loginAt: new Date(NOW - 1 * DAY).toISOString(),
      logoutAt: new Date(NOW - (1 * DAY - 8 * HOUR + 30 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '192.168.1.112',
      device: 'Desktop',
      browser: 'Chrome 128',
      os: 'Windows 11',
    },

    /* ── User u12 (Priya Mehta) ── */
    {
      sessionId: 'sess_u12_01',
      userId: 'u12',
      loginAt: new Date(NOW - (2 * HOUR + 30 * MIN)).toISOString(),
      logoutAt: new Date(NOW - 40 * MIN).toISOString(),
      logoutType: 'manual',
      ipAddress: '103.220.14.77',
      device: 'Desktop',
      browser: 'Edge 128',
      os: 'Windows 11',
    },
    {
      sessionId: 'sess_u12_02',
      userId: 'u12',
      loginAt: new Date(NOW - 1 * DAY).toISOString(),
      logoutAt: new Date(NOW - (1 * DAY - 8 * HOUR + 45 * MIN)).toISOString(),
      logoutType: 'manual',
      ipAddress: '103.220.14.77',
      device: 'Desktop',
      browser: 'Edge 128',
      os: 'Windows 11',
    },
  ];
}

export const INITIAL_USER_SESSIONS = getInitialUserSessions();
