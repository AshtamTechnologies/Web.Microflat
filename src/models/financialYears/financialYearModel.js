/**
 * financialYearModel.js — Data models, normalizers, and serializers for Financial Year Setup.
 *
 * Conforms to Section 5.3 ("Financial year setup") of Frontend-API-Guide 1.md:
 * - id, fyCode ("2026-27"), startDate ("YYYY-MM-DD"), endDate ("YYYY-MM-DD"), dayCount,
 *   status ("UPCOMING" | "OPEN" | "CLOSED"), isCurrent, closedByName, closedOn, remarks,
 *   canEdit, canDelete.
 */

/**
 * Normalizes a single financial year record from the API response.
 * Handles both camelCase and PascalCase backend responses.
 *
 * @param {object} raw
 * @returns {object|null}
 */
export function financialYearFromApi(raw = {}) {
  if (!raw) return null;

  const id = raw.id ?? raw.financialYearId ?? raw.Id ?? 0;
  const fyCode = raw.fyCode || raw.FyCode || raw.code || '';
  const startDate = raw.startDate ? String(raw.startDate).slice(0, 10) : raw.StartDate ? String(raw.StartDate).slice(0, 10) : '';
  const endDate = raw.endDate ? String(raw.endDate).slice(0, 10) : raw.EndDate ? String(raw.EndDate).slice(0, 10) : '';
  const dayCount = raw.dayCount !== undefined ? Number(raw.dayCount) : raw.DayCount !== undefined ? Number(raw.DayCount) : 0;
  const status = (raw.status || raw.Status || 'UPCOMING').toUpperCase();
  const isCurrent = Boolean(raw.isCurrent ?? raw.IsCurrent);
  const closedBy = raw.closedBy || raw.ClosedBy || null;
  const closedByName = raw.closedByName || raw.ClosedByName || null;
  const closedOn = raw.closedOn || raw.ClosedOn || null;
  const remarks = raw.remarks || raw.Remarks || null;
  const canEdit = raw.canEdit !== undefined ? Boolean(raw.canEdit) : raw.CanEdit !== undefined ? Boolean(raw.CanEdit) : status === 'UPCOMING';
  const canDelete = raw.canDelete !== undefined ? Boolean(raw.canDelete) : raw.CanDelete !== undefined ? Boolean(raw.CanDelete) : status === 'UPCOMING';
  const createdOn = raw.createdOn || raw.CreatedOn || raw.createdAt || raw.CreatedAt || null;
  const lastUpdatedOn = raw.lastUpdatedOn || raw.LastUpdatedOn || raw.updatedAt || raw.UpdatedAt || null;

  return {
    id,
    financialYearId: id,
    fyCode,
    startDate,
    endDate,
    dayCount,
    status,
    isCurrent,
    closedBy,
    closedByName,
    closedOn,
    remarks,
    canEdit,
    canDelete,
    createdOn,
    lastUpdatedOn,
  };
}

/**
 * Normalizes an array of financial years from the API.
 * Handles both plain arrays and wrapped responses { items: [...] }.
 *
 * @param {unknown} data
 * @returns {Array<object>}
 */
export function financialYearsFromApi(data) {
  if (!data) return [];
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.data)
    ? data.data
    : [];
  return items.map(financialYearFromApi).filter(Boolean);
}

/**
 * Normalizes settings from GET /api/financial-years/settings.
 */
export function financialYearSettingsFromApi(raw = {}) {
  if (!raw) return null;
  return {
    startMonth: Number(raw.startMonth ?? raw.StartMonth ?? 4),
    autoRollover: Boolean(raw.autoRollover ?? raw.AutoRollover ?? true),
    autoCreateNextYear: Boolean(raw.autoCreateNextYear ?? raw.AutoCreateNextYear ?? true),
    lastJobRunOn: raw.lastJobRunOn || raw.LastJobRunOn || null,
    lastJobResult: raw.lastJobResult || raw.LastJobResult || 'Normal operation',
    currentYear: raw.currentYear || raw.CurrentYear || '',
  };
}

/**
 * Serializes form data into POST /api/financial-years payload.
 *
 * @param {object} form
 * @returns {object}
 */
export function financialYearToApiCreate(form = {}) {
  return {
    startDate: String(form.startDate || '').slice(0, 10),
    endDate: String(form.endDate || '').slice(0, 10),
    remarks: (form.remarks || '').trim() || null,
  };
}

/**
 * Serializes form data into PUT /api/financial-years/{id} payload.
 *
 * @param {object} form
 * @returns {object}
 */
export function financialYearToApiUpdate(form = {}) {
  return {
    startDate: String(form.startDate || '').slice(0, 10),
    endDate: String(form.endDate || '').slice(0, 10),
    remarks: (form.remarks || '').trim() || null,
  };
}

/**
 * Serializes remarks for PATCH /api/financial-years/{id}/close payload.
 *
 * @param {string} remarks
 * @returns {object}
 */
export function financialYearToApiClose(remarks = '') {
  return {
    remarks: String(remarks || '').trim() || 'Year-end closing',
  };
}

