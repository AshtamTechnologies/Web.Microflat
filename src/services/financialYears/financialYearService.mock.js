/**
 * financialYearService.mock.js — In-memory mock service for Financial Year Setup.
 *
 * Simulates backend operations:
 * - listFinancialYears(params)
 * - getCurrentFinancialYear()
 * - createFinancialYear(data)
 * - updateFinancialYear(id, data)
 * - openFinancialYear(id)
 * - closeFinancialYear(id, remarks)
 * - deleteFinancialYear(id)
 */

import {
  INITIAL_FINANCIAL_YEARS,
  INITIAL_SETTINGS,
  generateFyCode,
  calculateDayCount,
} from '../../mocks/financialYears';

let inMemoryYears = [...INITIAL_FINANCIAL_YEARS];
let inMemorySettings = { ...INITIAL_SETTINGS };

export async function listFinancialYears(params = {}) {
  await new Promise((r) => setTimeout(r, 80));

  let results = [...inMemoryYears];

  if (params.status && params.status !== 'ALL') {
    results = results.filter((y) => (y.status || '').toUpperCase() === params.status.toUpperCase());
  }

  const search = params.search || params.Search;
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    results = results.filter(
      (y) =>
        (y.fyCode || '').toLowerCase().includes(q) ||
        (y.remarks || '').toLowerCase().includes(q) ||
        (y.closedByName || '').toLowerCase().includes(q)
    );
  }

  // Sort newest start date first
  results.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

  return results;
}

export async function getCurrentFinancialYear() {
  await new Promise((r) => setTimeout(r, 50));
  const current = inMemoryYears.find((y) => y.isCurrent) || null;
  return current;
}

export async function getFinancialYearById(id) {
  await new Promise((r) => setTimeout(r, 60));
  const year = inMemoryYears.find((y) => String(y.id) === String(id));
  if (!year) {
    throw new Error(`Financial year with id ${id} not found`);
  }
  return {
    ...year,
    createdOn: year.createdOn || '2026-01-01T00:00:00Z',
    lastUpdatedOn: year.lastUpdatedOn || null,
  };
}

export async function createFinancialYear(data = {}) {
  await new Promise((r) => setTimeout(r, 100));

  const startDate = data.startDate;
  const endDate = data.endDate;
  const fyCode = generateFyCode(startDate, endDate);
  const dayCount = calculateDayCount(startDate, endDate);

  const newYear = {
    id: Date.now(),
    financialYearId: Date.now(),
    fyCode,
    startDate,
    endDate,
    dayCount,
    status: 'UPCOMING',
    isCurrent: false,
    closedByName: null,
    closedOn: null,
    remarks: data.remarks || null,
    canEdit: true,
    canDelete: true,
  };

  inMemoryYears = [newYear, ...inMemoryYears];
  return newYear;
}

export async function updateFinancialYear(id, data = {}) {
  await new Promise((r) => setTimeout(r, 100));

  let updated = null;
  inMemoryYears = inMemoryYears.map((y) => {
    if (String(y.id) === String(id)) {
      const isUpcoming = y.status === 'UPCOMING';
      const startDate = isUpcoming && data.startDate ? data.startDate : y.startDate;
      const endDate = isUpcoming && data.endDate ? data.endDate : y.endDate;
      const fyCode = isUpcoming ? generateFyCode(startDate, endDate) : y.fyCode;
      const dayCount = isUpcoming ? calculateDayCount(startDate, endDate) : y.dayCount;

      updated = {
        ...y,
        startDate,
        endDate,
        fyCode,
        dayCount,
        remarks: data.remarks !== undefined ? data.remarks : y.remarks,
      };
      return updated;
    }
    return y;
  });

  return updated;
}

export async function openFinancialYear(id) {
  await new Promise((r) => setTimeout(r, 100));

  let opened = null;
  inMemoryYears = inMemoryYears.map((y) => {
    if (String(y.id) === String(id)) {
      opened = {
        ...y,
        status: 'OPEN',
        isCurrent: true,
        closedByName: null,
        closedOn: null,
        canEdit: false,
        canDelete: false,
      };
      return opened;
    }
    if (y.isCurrent) {
      return { ...y, isCurrent: false };
    }
    return y;
  });

  return opened;
}

export async function closeFinancialYear(id, remarks = '') {
  await new Promise((r) => setTimeout(r, 100));

  let closed = null;
  inMemoryYears = inMemoryYears.map((y) => {
    if (String(y.id) === String(id)) {
      closed = {
        ...y,
        status: 'CLOSED',
        isCurrent: false,
        closedByName: 'Admin',
        closedOn: new Date().toISOString(),
        remarks: remarks || 'Year-end closing',
        canEdit: false,
        canDelete: false,
      };
      return closed;
    }
    return y;
  });

  return closed;
}

export async function deleteFinancialYear(id) {
  await new Promise((r) => setTimeout(r, 80));
  inMemoryYears = inMemoryYears.filter((y) => String(y.id) !== String(id));
  return true;
}

