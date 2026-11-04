/**
 * documentSeriesModel.js — Document Series typedefs, mappers, and serializers.
 *
 * Implements Module-based Series schema per 4 Nov 2026 API update:
 * - moduleId, moduleCode, moduleName
 * - prefix, separator, yearFormat, numberLength, startNumber, resetCounter, effectiveDate
 */

/**
 * Normalizes a single document series record from the API.
 * @param {object} raw
 * @returns {object}
 */
export function seriesFromApi(raw = {}) {
  if (!raw) return null;

  const separator = raw.separator !== undefined && raw.separator !== null ? raw.separator : '-';
  const yearFormat = (raw.yearFormat || 'YYYY').toUpperCase();
  const resetCounter = (raw.resetCounter || 'YEARLY').toUpperCase();
  const startNumber = Number(raw.startNumber ?? raw.startingNumber ?? 1);
  const numberLength = Number(raw.numberLength ?? 6);

  return {
    id: raw.id,
    seriesId: raw.id,
    moduleId: raw.moduleId,
    moduleCode: raw.moduleCode || '',
    moduleName: raw.moduleName || '',
    // Backwards compatibility aliases if needed
    documentTypeId: raw.moduleId,
    documentTypeName: raw.moduleName || '',
    documentTypeCode: raw.moduleCode || '',
    prefix: (raw.prefix || '').toUpperCase(),
    separator: separator,
    yearFormat: yearFormat === 'NONE' || yearFormat === 'NONE (NO YEAR)' ? 'NONE' : yearFormat,
    numberLength: numberLength,
    startNumber: startNumber,
    startingNumber: startNumber,
    resetCounter: resetCounter,
    effectiveDate: raw.effectiveDate ? String(raw.effectiveDate).slice(0, 10) : '',
    isCurrent: Boolean(raw.isCurrent),
    isUsed: Boolean(raw.isUsed),
    sampleNumber: raw.sampleNumber || '',
    createdOn: raw.createdOn || null,
    createdAt: raw.createdOn || null,
    lastUpdatedOn: raw.lastUpdatedOn || null,
    updatedAt: raw.lastUpdatedOn || null,
    createdBy: raw.createdBy || '',
  };
}

/**
 * Normalizes an array of document series records from the API.
 * @param {Array<object>} list
 * @returns {Array<object>}
 */
export function seriesListFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(seriesFromApi).filter(Boolean);
}

/**
 * Prepares payload for POST or PUT requests to /api/document-series.
 * @param {object} form
 * @returns {object}
 */
export function seriesToApi(form = {}) {
  // Normalize separator: 'None' -> ''
  let separator = form.separator;
  if (separator === 'None' || separator === undefined || separator === null) {
    separator = '';
  }

  // Normalize yearFormat: 'None' -> 'NONE'
  let yearFormat = (form.yearFormat || 'YYYY').toUpperCase();
  if (yearFormat === 'NONE' || yearFormat === 'NO YEAR') {
    yearFormat = 'NONE';
  }

  // Normalize resetCounter
  let resetCounter = (form.resetCounter || 'YEARLY').toUpperCase();

  const startNumber = Math.max(1, Number(form.startNumber ?? form.startingNumber ?? 1));
  const numberLength = Math.max(1, Math.min(10, Number(form.numberLength ?? 6)));

  const payload = {
    moduleId: Number(form.moduleId ?? form.documentTypeId),
    prefix: (form.prefix || '').trim().toUpperCase(),
    separator,
    yearFormat,
    numberLength,
    startNumber,
    resetCounter,
    effectiveDate: form.effectiveDate ? String(form.effectiveDate).slice(0, 10) : '',
  };

  return payload;
}
