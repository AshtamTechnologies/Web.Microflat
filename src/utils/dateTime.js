/**
 * dateTime.js — Shared date, time, relative time, and duration formatting utilities.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats an ISO date string to "12 Oct 2026, 09:42"
 * @param {string|Date} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Formats an ISO date string to a human-readable relative time (e.g. "2 hours ago", "yesterday", "3 days ago")
 * @param {string|Date} iso
 * @returns {string}
 */
export function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 30) {
    return `${diffDays} days ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Formats a duration in milliseconds to "2h 15m", "45m", or "< 1 min"
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (typeof ms !== 'number' || isNaN(ms)) return '—';
  const safeMs = Math.abs(ms);

  const totalMinutes = Math.floor(safeMs / (1000 * 60));
  if (totalMinutes < 1) {
    return '< 1 min';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Simple helper to parse User Agent into device, browser, and OS
 * @param {string} ua
 * @returns {{ device: 'Desktop'|'Mobile'|'Tablet', browser: string, os: string }}
 */
export function parseUserAgent(ua = '') {
  const str = ua || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  let device = 'Desktop';
  if (/Tablet|iPad/i.test(str)) {
    device = 'Tablet';
  } else if (/Mobi|Android|iPhone/i.test(str)) {
    device = 'Mobile';
  }

  let browser = 'Chrome';
  if (/Firefox/i.test(str)) browser = 'Firefox';
  else if (/Edg/i.test(str)) browser = 'Edge';
  else if (/Safari/i.test(str) && !/Chrome/i.test(str)) browser = 'Safari';

  let os = 'Windows';
  if (/Macintosh|Mac OS/i.test(str)) os = 'macOS';
  else if (/Linux/i.test(str)) os = 'Linux';
  else if (/Android/i.test(str)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(str)) os = 'iOS';

  return { device, browser, os };
}
