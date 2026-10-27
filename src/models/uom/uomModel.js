/**
 * uomModel.js — Unit of Measurement (UOM) typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id / uomId
 *   - uomName
 *   - description
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiUomDto
 * @property {number|string} id
 * @property {string} uomName
 * @property {string} [description]
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} UomModel
 * @property {number|string} id
 * @property {number|string} uomId
 * @property {string} uomName
 * @property {string} description
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty UomModel.
 * @returns {UomModel}
 */
export function createEmptyUom() {
  return {
    id: 0,
    uomId: 0,
    uomName: '',
    description: '',
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API UOM DTO to a frontend UomModel.
 *
 * @param {ApiUomDto|object} dto
 * @returns {UomModel}
 */
export function uomFromApi(dto) {
  if (!dto) return createEmptyUom();

  const id = dto.id !== undefined ? dto.id : dto.uomId ?? 0;
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    uomId: id,
    uomName: dto.uomName || '',
    description: dto.description || '',
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array of API UOM DTOs to UomModels.
 * @param {ApiUomDto[]} [list]
 * @returns {UomModel[]}
 */
export function uomsFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(uomFromApi);
}

/**
 * Serializes frontend form data to the payload expected by POST /api/uoms.
 *
 * @param {{ uomName: string, description?: string }} data
 * @returns {{ uomName: string, description: string }}
 */
export function uomToApiCreate(data = {}) {
  return {
    uomName: String(data.uomName || '').trim(),
    description: String(data.description || '').trim(),
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/uoms/{id}.
 *
 * @param {{ uomName: string, description?: string }} data
 * @returns {{ uomName: string, description: string }}
 */
export function uomToApiUpdate(data = {}) {
  return {
    uomName: String(data.uomName || '').trim(),
    description: String(data.description || '').trim(),
  };
}

/**
 * Serializes status payload for PATCH /api/uoms/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function uomStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}
