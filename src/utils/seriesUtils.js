/**
 * seriesUtils.js — Utilities for document sequence numbering, versioning & status resolution.
 */

import { getTodayISO, toISODate } from './dateUtils';

/**
 * Normalizes a date input to a YYYY-MM-DD string.
 * @param {Date|string} d
 * @returns {string}
 */
export function normalizeDateString(d = new Date()) {
  if (!d) return getTodayISO();
  if (typeof d === 'string') {
    return d.slice(0, 10);
  }
  if (d instanceof Date && !isNaN(d.getTime())) {
    return toISODate(d);
  }
  return getTodayISO();
}

/**
 * Returns the currently active series version as of a given date.
 * Active version = the version with the latest effectiveDate <= asOf.
 *
 * @param {Array<object>} versions
 * @param {Date|string} asOf
 * @returns {object|null}
 */
export function getActiveSeries(versions = [], asOf = new Date()) {
  if (!Array.isArray(versions) || versions.length === 0) return null;

  const asOfStr = normalizeDateString(asOf);

  // Filter versions whose effective date is on or before asOf date
  const eligible = versions.filter((v) => {
    if (!v?.effectiveDate) return false;
    return v.effectiveDate <= asOfStr;
  });

  if (eligible.length === 0) return null;

  // Sort by effectiveDate descending (newest first)
  const sorted = [...eligible].sort((a, b) => {
    if (b.effectiveDate !== a.effectiveDate) {
      return b.effectiveDate.localeCompare(a.effectiveDate);
    }
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return sorted[0] || null;
}

/**
 * Determines the lifecycle status of a specific series version.
 * - 'current': if version.isCurrent flag is true or latest effectiveDate <= asOf
 * - 'scheduled': effectiveDate > asOf (future date)
 * - 'expired': older than the current active version
 *
 * @param {object} version
 * @param {Array<object>} versions
 * @param {Date|string} asOf
 * @returns {'current'|'scheduled'|'expired'}
 */
export function getSeriesStatus(version, versions = [], asOf = new Date()) {
  if (!version || !version.effectiveDate) return 'expired';

  const asOfStr = normalizeDateString(asOf);
  const versionDate = normalizeDateString(version.effectiveDate);

  // Future effective date
  if (versionDate > asOfStr) {
    return 'scheduled';
  }

  // Active / Current
  if (version.isCurrent) {
    return 'current';
  }

  const active = getActiveSeries(versions, asOf);
  if (active && (String(active.id) === String(version.id) || (active.effectiveDate === version.effectiveDate && (active.docType === version.docType || active.documentTypeId === version.documentTypeId)))) {
    return 'current';
  }

  return 'expired';
}

/**
 * Live preview calculation matching backend formula exactly.
 *
 * @param {object} f - { prefix, separator, yearFormat, numberLength, startNumber, resetCounter }
 * @param {Date|string} [date=new Date()]
 * @returns {string}
 */
export function buildSampleNumber(f = {}, date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : (date instanceof Date && !isNaN(date.getTime()) ? date : new Date());
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');

  const yFmt = (f.yearFormat || 'YYYY').toUpperCase();
  let year = yFmt === 'YYYY' ? yyyy : yFmt === 'YY' ? yyyy.slice(2) : '';

  const reset = (f.resetCounter || '').toUpperCase();
  if (year && reset === 'MONTHLY') {
    year += mm;
  }

  const start = f.startNumber ?? f.startingNumber ?? 1;
  const len = Number(f.numberLength) || 1;
  const running = String(start || 1).padStart(len, '0');

  const prefix = (f.prefix || '').toUpperCase();
  const sep = f.separator === 'None' || f.separator === undefined || f.separator === null ? '' : f.separator;

  return year ? `${prefix}${sep}${year}${sep}${running}` : `${prefix}${sep}${running}`;
}

/**
 * Formats a sample or real document sequence number according to a series configuration.
 *
 * @param {object} version
 * @param {number|string} [sequence]
 * @param {Date|string} [date]
 * @returns {string}
 */
export function formatSeriesNumber(version, sequence, date = new Date()) {
  if (!version) return '—';
  const v = {
    ...version,
    startNumber: sequence !== undefined && sequence !== null ? sequence : (version.startNumber ?? version.startingNumber ?? 1),
  };
  return buildSampleNumber(v, date);
}

/**
 * Formats the readable pattern schema string (e.g. "PO-YYYY-000001" or "PO/YY/001").
 * @param {object} version
 * @returns {string}
 */
export function formatSeriesPattern(version) {
  if (!version) return '';
  const prefix = (version.prefix || 'DOC').trim().toUpperCase();
  const sep = version.separator === 'None' || version.separator === '' || version.separator === null || version.separator === undefined ? '' : version.separator;
  const yFmt = (version.yearFormat || 'YYYY').toUpperCase();
  const yearFormat = yFmt === 'NONE' || yFmt === 'NO YEAR' ? '' : yFmt;
  const numLength = Math.max(1, Math.min(10, Number(version.numberLength) || 1));
  const startNum = Number(version.startNumber ?? version.startingNumber ?? 1);
  const paddedSeq = String(startNum).padStart(numLength, '0');

  const segments = [prefix];
  if (yearFormat) {
    segments.push(yearFormat);
  }
  segments.push(paddedSeq);

  return segments.join(sep);
}

/**
 * Formats standard audit timestamp string: YYYY-MM-DD hh:mm AM/PM
 * @param {Date} date
 * @returns {string}
 */
export function formatAuditTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formattedHours}:${minutes} ${ampm}`;
}
