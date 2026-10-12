/**
 * dateUtils.js — System-wide Date & DateTime Formatting Utility for Micro-Flat ERP.
 *
 * Global Configuration:
 * To change the date format across the ENTIRE system in the future, simply update
 * `SYSTEM_DATE_CONFIG.dateFormat` below (e.g., to 'DD/MM/YYYY', 'YYYY-MM-DD', etc.).
 */

export const SYSTEM_DATE_CONFIG = {
  /**
   * System-wide date format.
   * Supported tokens: 'DD-MM-YYYY' | 'DD/MM/YYYY' | 'DD.MM.YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY' | 'MM/DD/YYYY'
   */
  dateFormat: 'DD-MM-YYYY',

  /**
   * Whether to format time in 12-hour AM/PM format (e.g., "10:30 AM") or 24-hour format ("10:30").
   */
  showTime12Hour: true,

  /**
   * Default fallback placeholder when date is null, undefined, or empty.
   */
  emptyPlaceholder: '—',
};

/**
 * Parses any date value (ISO string, YYYY-MM-DD, timestamp number, Date object) into a Date instance.
 * @param {string|number|Date} val
 * @returns {Date|null}
 */
export function parseDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  // Numeric timestamp
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(val).trim();
  if (!str || str === '—' || str === '--') return null;

  // Pure YYYY-MM-DD without time (avoid UTC midnight off-by-one)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  // DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY (with optional time and AM/PM)
  const ddmmyyyyMatch = str.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})(?:\s*[, ]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (ddmmyyyyMatch) {
    const d = parseInt(ddmmyyyyMatch[1], 10);
    const m = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const y = parseInt(ddmmyyyyMatch[3], 10);
    let hh = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const mm = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const ss = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const ampm = ddmmyyyyMatch[7] ? ddmmyyyyMatch[7].toUpperCase() : null;

    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;

    const dObj = new Date(y, m, d, hh, mm, ss);
    return isNaN(dObj.getTime()) ? null : dObj;
  }

  // YYYY-MM-DD or YYYY/MM/DD (with optional time and AM/PM)
  const yyyymmddMatch = str.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})(?:\s*[, ]\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (yyyymmddMatch) {
    const y = parseInt(yyyymmddMatch[1], 10);
    const m = parseInt(yyyymmddMatch[2], 10) - 1;
    const d = parseInt(yyyymmddMatch[3], 10);
    let hh = yyyymmddMatch[4] ? parseInt(yyyymmddMatch[4], 10) : 0;
    const mm = yyyymmddMatch[5] ? parseInt(yyyymmddMatch[5], 10) : 0;
    const ss = yyyymmddMatch[6] ? parseInt(yyyymmddMatch[6], 10) : 0;
    const ampm = yyyymmddMatch[7] ? yyyymmddMatch[7].toUpperCase() : null;

    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;

    const dObj = new Date(y, m, d, hh, mm, ss);
    return isNaN(dObj.getTime()) ? null : dObj;
  }

  // Fallback to native Date parser
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date into the system-wide format (Default: DD-MM-YYYY).
 * @param {string|number|Date} dateValue
 * @param {string} [formatOverride]
 * @returns {string}
 */
export function formatDate(dateValue, formatOverride = SYSTEM_DATE_CONFIG.dateFormat) {
  if (dateValue === null || dateValue === undefined || dateValue === '') {
    return SYSTEM_DATE_CONFIG.emptyPlaceholder;
  }

  const d = parseDate(dateValue);
  if (!d) return String(dateValue) || SYSTEM_DATE_CONFIG.emptyPlaceholder;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());

  switch (formatOverride) {
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'DD.MM.YYYY':
      return `${day}.${month}.${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM-DD-YYYY':
      return `${month}-${day}-${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    default:
      return `${day}-${month}-${year}`;
  }
}

/**
 * Formats a date with time into the system-wide format (e.g. "11-09-2026, 10:30 AM").
 * @param {string|number|Date} dateValue
 * @param {string} [formatOverride]
 * @returns {string}
 */
export function formatDateTime(dateValue, formatOverride = SYSTEM_DATE_CONFIG.dateFormat) {
  if (dateValue === null || dateValue === undefined || dateValue === '') {
    return SYSTEM_DATE_CONFIG.emptyPlaceholder;
  }

  const d = parseDate(dateValue);
  if (!d) return String(dateValue) || SYSTEM_DATE_CONFIG.emptyPlaceholder;

  const datePart = formatDate(d, formatOverride);

  let timePart;
  if (SYSTEM_DATE_CONFIG.showTime12Hour) {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    timePart = `${formattedHours}:${minutes} ${ampm}`;
  } else {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    timePart = `${hours}:${minutes}`;
  }

  return `${datePart}, ${timePart}`;
}

// Aliases for system compatibility and drop-in replacements
export const formatDateDisplay = formatDate;
export const formatPRDate = formatDate;
export const formatPRDateTime = formatDateTime;
