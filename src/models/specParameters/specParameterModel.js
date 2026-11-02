/**
 * specParameterModel.js — Spec Parameters typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id
 *   - parameterName
 *   - unitSymbol
 *   - toleranceUnitSymbol
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiSpecParameterDto
 * @property {number} id
 * @property {string} parameterName
 * @property {string|null} [unitSymbol]
 * @property {string|null} [toleranceUnitSymbol]
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} SpecParameterModel
 * @property {number} id
 * @property {string} parameterName
 * @property {string|null} unitSymbol
 * @property {string|null} toleranceUnitSymbol
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty SpecParameterModel.
 * @returns {SpecParameterModel}
 */
export function createEmptySpecParameter() {
  return {
    id: 0,
    parameterName: '',
    unitSymbol: null,
    toleranceUnitSymbol: null,
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API SpecParameter DTO to a frontend SpecParameterModel.
 *
 * @param {ApiSpecParameterDto|object} dto
 * @returns {SpecParameterModel}
 */
export function specParameterFromApi(dto) {
  if (!dto) return createEmptySpecParameter();

  const id = dto.id ?? 0;
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    parameterName: dto.parameterName || '',
    unitSymbol: dto.unitSymbol || null,
    toleranceUnitSymbol: dto.toleranceUnitSymbol || null,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array or paginated response of API SpecParameter DTOs to normalized list + pagination info.
 *
 * @param {ApiSpecParameterDto[]|{ items: ApiSpecParameterDto[], totalCount?: number, pageNumber?: number, pageSize?: number, totalPages?: number }} response
 * @returns {{ items: SpecParameterModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }}
 */
export function specParametersFromApi(response) {
  if (!response) {
    return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
  }

  if (Array.isArray(response)) {
    const items = response.map(specParameterFromApi);
    return {
      items,
      totalCount: items.length,
      pageNumber: 1,
      pageSize: items.length || 10,
      totalPages: 1,
    };
  }

  const rawList = Array.isArray(response.items) ? response.items : [];
  const items = rawList.map(specParameterFromApi);
  const totalCount = response.totalCount !== undefined ? Number(response.totalCount) : items.length;
  const pageNumber = response.pageNumber !== undefined ? Number(response.pageNumber) : 1;
  const pageSize = response.pageSize !== undefined ? Number(response.pageSize) : 10;
  const totalPages =
    response.totalPages !== undefined
      ? Number(response.totalPages)
      : Math.max(1, Math.ceil(totalCount / (pageSize || 10)));

  return {
    items,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

/**
 * Serializes frontend form data to the payload expected by POST /api/spec-parameters.
 *
 * @param {{ parameterName: string, unitSymbol?: string|null, toleranceUnitSymbol?: string|null }} data
 * @returns {{ parameterName: string, unitSymbol: string|null, toleranceUnitSymbol: string|null }}
 */
export function specParameterToApiCreate(data = {}) {
  const unit = data.unitSymbol !== undefined && data.unitSymbol !== null && String(data.unitSymbol).trim() !== ''
    ? String(data.unitSymbol).trim()
    : null;
  const tol = data.toleranceUnitSymbol !== undefined && data.toleranceUnitSymbol !== null && String(data.toleranceUnitSymbol).trim() !== ''
    ? String(data.toleranceUnitSymbol).trim()
    : null;

  return {
    parameterName: String(data.parameterName || '').trim(),
    unitSymbol: unit,
    toleranceUnitSymbol: tol,
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/spec-parameters/{id}.
 *
 * @param {{ parameterName: string, unitSymbol?: string|null, toleranceUnitSymbol?: string|null }} data
 * @returns {{ parameterName: string, unitSymbol: string|null, toleranceUnitSymbol: string|null }}
 */
export function specParameterToApiUpdate(data = {}) {
  return specParameterToApiCreate(data);
}

/**
 * Serializes frontend status to the payload expected by PATCH /api/spec-parameters/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function specParameterStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}

