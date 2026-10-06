/**
 * effectiveDateUtils.js — ERP Effective Date logic & helpers for MicroFlat ERP.
 *
 * Temporal validity rules:
 * - Current Active: Most recent effective date <= Today
 * - Scheduled (Future): effectiveDate > Today
 * - Gone (Past / Expired): Older effective dates superseded by a newer active date
 */

/**
 * Returns today's ISO date string (YYYY-MM-DD)
 */
export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calculates ERP Effective Status based on Effective Date and superseded state
 * @param {string} effectiveDate - ISO date string (YYYY-MM-DD)
 * @param {boolean} isSuperseded - True if superseded by a newer active date
 * @returns {{ key: string, label: string, badgeVariant: string, description: string, isCurrent: boolean, isPast: boolean, isScheduled: boolean }}
 */
export function getEffectiveDateStatus(effectiveDate, isSuperseded = false) {
  if (!effectiveDate) {
    return {
      key: 'UNSET',
      label: 'Date Unset',
      badgeVariant: 'neutral',
      description: 'Effective date has not been configured.',
      isCurrent: false,
      isPast: false,
      isScheduled: false,
    };
  }

  const today = getTodayIsoDate();

  if (effectiveDate > today) {
    return {
      key: 'SCHEDULED',
      label: 'Scheduled',
      badgeVariant: 'warning',
      description: `Scheduled to take effect on ${formatDateDisplay(effectiveDate)}.`,
      isCurrent: false,
      isPast: false,
      isScheduled: true,
    };
  }

  if (isSuperseded) {
    return {
      key: 'GONE',
      label: 'Gone (Past)',
      badgeVariant: 'neutral',
      description: `Previously effective on ${formatDateDisplay(effectiveDate)}, now superseded by a newer active revision.`,
      isCurrent: false,
      isPast: true,
      isScheduled: false,
    };
  }

  return {
    key: 'ACTIVE',
    label: 'Current Active',
    badgeVariant: 'success',
    description: `Currently active in ERP since ${formatDateDisplay(effectiveDate)}.`,
    isCurrent: true,
    isPast: false,
    isScheduled: false,
  };
}

/**
 * Computes temporal statuses for a list of revisions
 * - effectiveDate > today -> 'SCHEDULED'
 * - Latest effectiveDate <= today -> 'ACTIVE' (Current Active)
 * - Older effectiveDates <= today -> 'GONE' (Gone / Past)
 * @param {Array} revisions - Array of revision objects with effectiveDate
 * @returns {Array} Array of revisions augmented with status and liveStatusInfo
 */
export function computeRevisionStatuses(revisions = []) {
  if (!Array.isArray(revisions) || revisions.length === 0) return [];
  const today = getTodayIsoDate();

  // Find the newest effective date <= today
  let latestPastDate = null;
  revisions.forEach((r) => {
    if (r.effectiveDate && r.effectiveDate <= today) {
      if (!latestPastDate || r.effectiveDate > latestPastDate) {
        latestPastDate = r.effectiveDate;
      }
    }
  });

  return revisions.map((rev) => {
    let statusInfo;
    if (!rev.effectiveDate) {
      statusInfo = getEffectiveDateStatus('');
    } else if (rev.effectiveDate > today) {
      statusInfo = getEffectiveDateStatus(rev.effectiveDate, false);
    } else if (rev.effectiveDate === latestPastDate) {
      statusInfo = getEffectiveDateStatus(rev.effectiveDate, false);
    } else {
      statusInfo = getEffectiveDateStatus(rev.effectiveDate, true);
    }

    return {
      ...rev,
      status: statusInfo.key,
      liveStatusInfo: statusInfo,
    };
  });
}

/**
 * Formats ISO date string to human-friendly ERP date format (e.g., "15 Jan 2024")
 */
export function formatDateDisplay(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generates the next revision code given an existing history array
 */
export function generateNextRevisionNo(history = []) {
  if (!history || history.length === 0) return 'REV-001';
  const count = history.length + 1;
  return `REV-${String(count).padStart(3, '0')}`;
}
