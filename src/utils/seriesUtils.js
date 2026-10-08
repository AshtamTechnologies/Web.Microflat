/**
 * seriesUtils.js — Utilities for document sequence numbering, versioning & status resolution.
 */

/**
 * Normalizes a date input to a YYYY-MM-DD string.
 * @param {Date|string} d
 * @returns {string}
 */
export function normalizeDateString(d = new Date()) {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (typeof d === 'string') {
    // If it's already YYYY-MM-DD, return first 10 chars
    return d.slice(0, 10);
  }
  if (d instanceof Date && !isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().slice(0, 10);
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
    // Secondary tie-breaker by createdOn or id
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return sorted[0] || null;
}

/**
 * Determines the lifecycle status of a specific series version.
 * - 'scheduled': effectiveDate > asOf (future date)
 * - 'current': latest effectiveDate <= asOf
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

  // Active version for this set
  const active = getActiveSeries(versions, asOf);
  if (active && (active.id === version.id || (active.effectiveDate === version.effectiveDate && active.docType === version.docType))) {
    return 'current';
  }

  return 'expired';
}

/**
 * Formats a sample or real document sequence number according to a series configuration.
 * Formula: Prefix + Separator + YearFormat + Separator + Zero-Padded-Sequence
 *
 * @param {object} version
 * @param {number|string} sequence
 * @param {Date|string} date
 * @returns {string}
 */
export function formatSeriesNumber(version, sequence, date = new Date()) {
  if (!version) return '—';

  const prefix = (version.prefix || 'DOC').trim().toUpperCase();
  const sep = version.separator === 'None' || version.separator === '' ? '' : (version.separator || '-');
  const yearFormat = (version.yearFormat || 'YYYY').trim();
  const numLength = Math.max(1, Math.min(10, Number(version.numberLength) || 1));
  const startNum = sequence !== undefined && sequence !== null ? Number(sequence) : (Number(version.startingNumber) || 1);

  // Extract year representation
  let yearStr = '';
  const d = typeof date === 'string' ? new Date(date) : (date instanceof Date ? date : new Date());
  const fullYear = !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();

  if (yearFormat === 'YYYY') {
    yearStr = String(fullYear);
  } else if (yearFormat === 'YY') {
    yearStr = String(fullYear).slice(-2);
  } else {
    yearStr = ''; // None
  }

  // Pad sequence number with leading zeros based on configured number length
  const paddedSeq = String(Math.max(1, startNum)).padStart(numLength, '0');

  // Build segments
  const segments = [prefix];
  if (yearStr) {
    segments.push(yearStr);
  }
  segments.push(paddedSeq);

  return segments.join(sep);
}

/**
 * Formats the readable pattern schema string (e.g. "PO-YYYY-000001" or "PO/YY/001").
 * @param {object} version
 * @returns {string}
 */
export function formatSeriesPattern(version) {
  if (!version) return '';
  const prefix = (version.prefix || 'DOC').trim().toUpperCase();
  const sep = version.separator === 'None' || version.separator === '' ? '' : (version.separator || '-');
  const yearFormat = (version.yearFormat || 'YYYY').trim();
  const numLength = Math.max(1, Math.min(10, Number(version.numberLength) || 1));
  const startNum = Number(version.startingNumber) || 1;
  const paddedSeq = String(startNum).padStart(numLength, '0');

  const segments = [prefix];
  if (yearFormat && yearFormat !== 'None') {
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
