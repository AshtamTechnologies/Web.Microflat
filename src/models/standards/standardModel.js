/**
 * standardModel.js — Standards typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id
 *   - standardCode
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiStandardDto
 * @property {number} id
 * @property {string} standardCode
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} StandardModel
 * @property {number} id
 * @property {string} standardCode
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty StandardModel.
 * @returns {StandardModel}
 */
export function createEmptyStandard() {
  return {
    id: 0,
    standardCode: '',
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API Standard DTO to a frontend StandardModel.
 *
 * @param {ApiStandardDto|object} dto
 * @returns {StandardModel}
 */
export function standardFromApi(dto) {
  if (!dto) return createEmptyStandard();

  const id = dto.id ?? 0;
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    standardCode: dto.standardCode || '',
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array or paginated response of API Standard DTOs to normalized list + pagination info.
 *
 * @param {ApiStandardDto[]|{ items: ApiStandardDto[], totalCount?: number, pageNumber?: number, pageSize?: number, totalPages?: number }} response
 * @returns {{ items: StandardModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }}
 */
export function standardsFromApi(response) {
  if (!response) {
    return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
  }

  if (Array.isArray(response)) {
    const items = response.map(standardFromApi);
    return {
      items,
      totalCount: items.length,
      pageNumber: 1,
      pageSize: items.length || 10,
      totalPages: 1,
    };
  }

  const rawList = Array.isArray(response.items) ? response.items : [];
  const items = rawList.map(standardFromApi);
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
 * Serializes frontend form data to the payload expected by POST /api/standards.
 *
 * @param {{ standardCode: string }} data
 * @returns {{ standardCode: string }}
 */
export function standardToApiCreate(data = {}) {
  return {
    standardCode: String(data.standardCode || '').trim(),
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/standards/{id}.
 *
 * @param {{ standardCode: string }} data
 * @returns {{ standardCode: string }}
 */
export function standardToApiUpdate(data = {}) {
  return {
    standardCode: String(data.standardCode || '').trim(),
  };
}

/**
 * Serializes frontend status to the payload expected by PATCH /api/standards/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function standardStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}

