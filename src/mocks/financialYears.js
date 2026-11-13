/**
 * financialYears.js — Mock Data & In-Memory Operations for Financial Year Setup.
 *
 * Implements Section 5.3 ("Financial year setup") of Frontend-API-Guide 1.md:
 * - Status lifecycle: UPCOMING → OPEN → CLOSED
 * - Only OPEN years number documents of FINANCIAL_YEAR series
 * - isCurrent marks the active OPEN year covering today
 * - Years never overlap, only 1 starts per calendar year, max 18 months
 * - Daily rollover job settings & manual run simulation
 */

export const INITIAL_FINANCIAL_YEARS = [
  {
    id: 1,
    fyCode: '2024-25',
    startDate: '2024-04-01',
    endDate: '2025-03-31',
    dayCount: 365,
    status: 'CLOSED',
    isCurrent: false,
    closedByName: 'Super Admin',
    closedOn: '2025-03-31T23:59:59Z',
    remarks: 'Annual accounts audited and locked.',
    canEdit: false,
    canDelete: false,
  },
  {
    id: 2,
    fyCode: '2025-26',
    startDate: '2025-04-01',
    endDate: '2026-03-31',
    dayCount: 365,
    status: 'CLOSED',
    isCurrent: false,
    closedByName: 'Super Admin',
    closedOn: '2026-03-31T23:59:59Z',
    remarks: 'Tax assessment and statutory filing complete.',
    canEdit: false,
    canDelete: false,
  },
  {
    id: 3,
    fyCode: '2026-27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    dayCount: 365,
    status: 'OPEN',
    isCurrent: true,
    closedByName: null,
    closedOn: null,
    remarks: 'Active fiscal year for all live ERP operational series numbering.',
    canEdit: false,
    canDelete: false,
  },
  {
    id: 4,
    fyCode: '2027-28',
    startDate: '2027-04-01',
    endDate: '2028-03-31',
    dayCount: 366,
    status: 'UPCOMING',
    isCurrent: false,
    closedByName: null,
    closedOn: null,
    remarks: 'Advance budget and projected document series setup.',
    canEdit: true,
    canDelete: true,
  },
];

export const INITIAL_SETTINGS = {
  startMonth: 4, // 4 = April (India FY standard)
  autoRollover: true,
  autoCreateNextYear: true,
  lastJobRunOn: '2026-11-13T00:05:00Z',
  lastJobResult: 'Success - Current active year 2026-27 verified (0 closed, 0 created)',
  currentYear: '2026-27',
};

export const MONTH_OPTIONS = [
  { value: 1, label: 'January (Calendar Year: Jan - Dec)' },
  { value: 4, label: 'April (India Standard: Apr - Mar)' },
  { value: 7, label: 'July (Mid-Year: Jul - Jun)' },
  { value: 10, label: 'October (Q4-Start: Oct - Sep)' },
];

/**
 * Derives the standard FY Code string (e.g. "2027-28") from Start and End Dates.
 */
export function generateFyCode(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return '';
  const startYear = parseInt(String(startDateStr).slice(0, 4), 10);
  const endYear = parseInt(String(endDateStr).slice(0, 4), 10);
  if (isNaN(startYear) || isNaN(endYear)) return '';

  const endShort = String(endYear).slice(-2);
  if (startYear === endYear) {
    return `${startYear}`;
  }
  return `${startYear}-${endShort}`;
}

/**
 * Calculates calendar days between two ISO date strings (inclusive).
 */
export function calculateDayCount(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Validates dates against business rules:
 * - Start must be before End
 * - Duration at most 18 months (~550 days)
 * - Only 1 year starts per calendar year
 * - No overlaps with existing financial years
 */
export function validateFinancialYearDates(startDateStr, endDateStr, existingYears = [], excludeId = null) {
  if (!startDateStr) return 'Start date is required.';
  if (!endDateStr) return 'End date is required.';
  if (startDateStr >= endDateStr) {
    return 'End date must be strictly after the start date.';
  }

  const days = calculateDayCount(startDateStr, endDateStr);
  if (days > 550) {
    return 'A financial year cannot exceed 18 months (maximum ~550 days).';
  }

  const startYearNum = parseInt(startDateStr.slice(0, 4), 10);
  const filtered = existingYears.filter((y) => String(y.id) !== String(excludeId));

  // Check if a year already starts in this calendar year
  const duplicateStartYear = filtered.find((y) => {
    const yStartYear = parseInt(String(y.startDate).slice(0, 4), 10);
    return yStartYear === startYearNum;
  });
  if (duplicateStartYear) {
    return `Only one financial year may start per calendar year (${startYearNum} is already used by ${duplicateStartYear.fyCode}).`;
  }

  // Check overlap with any existing period
  const overlap = filtered.find((y) => {
    return startDateStr <= y.endDate && endDateStr >= y.startDate;
  });
  if (overlap) {
    return `The selected dates overlap with existing financial year ${overlap.fyCode} (${overlap.startDate} to ${overlap.endDate}).`;
  }

  return null;
}

