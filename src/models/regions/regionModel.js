/**
 * regionModel.js — Region typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id / regionId
 *   - regionName / name
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiRegionDto
 * @property {number|string} id
 * @property {string} regionName
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} RegionModel
 * @property {number|string} id
 * @property {number|string} regionId
 * @property {string} regionName
 * @property {string} name
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty RegionModel.
 * @returns {RegionModel}
 */
export function createEmptyRegion() {
  return {
    id: 0,
    regionId: 0,
    regionName: '',
    name: '',
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API Region DTO to a frontend RegionModel.
 *
 * @param {ApiRegionDto|object} dto
 * @returns {RegionModel}
 */
export function regionFromApi(dto) {
  if (!dto) return createEmptyRegion();

  const id = dto.id !== undefined ? dto.id : dto.regionId ?? 0;
  const name = dto.regionName || dto.name || '';
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    regionId: id,
    regionName: name,
    name,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array of API Region DTOs to RegionModels.
 * @param {ApiRegionDto[]} [list]
 * @returns {RegionModel[]}
 */
export function regionsFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(regionFromApi);
}

/**
 * Serializes frontend form data to the payload expected by POST /api/regions.
 *
 * @param {{ regionName: string }} data
 * @returns {{ regionName: string }}
 */
export function regionToApiCreate(data = {}) {
  return {
    regionName: String(data.regionName || data.name || '').trim(),
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/regions/{id}.
 *
 * @param {{ regionName: string }} data
 * @returns {{ regionName: string }}
 */
export function regionToApiUpdate(data = {}) {
  return {
    regionName: String(data.regionName || data.name || '').trim(),
  };
}

/**
 * Serializes status payload for PATCH /api/regions/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function regionStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}
