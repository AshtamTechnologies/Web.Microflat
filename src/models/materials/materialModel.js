/**
 * materialModel.js — Material typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id
 *   - materialName
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiMaterialDto
 * @property {number} id
 * @property {string} materialName
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} MaterialModel
 * @property {number} id
 * @property {string} materialName
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty MaterialModel.
 * @returns {MaterialModel}
 */
export function createEmptyMaterial() {
  return {
    id: 0,
    materialName: '',
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API Material DTO to a frontend MaterialModel.
 *
 * @param {ApiMaterialDto|object} dto
 * @returns {MaterialModel}
 */
export function materialFromApi(dto) {
  if (!dto) return createEmptyMaterial();

  const id = dto.id ?? 0;
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    materialName: dto.materialName || '',
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array or paginated response of API Material DTOs to normalized Material list + pagination info.
 *
 * @param {ApiMaterialDto[]|{ items: ApiMaterialDto[], totalCount?: number, pageNumber?: number, pageSize?: number, totalPages?: number }} response
 * @returns {{ items: MaterialModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }}
 */
export function materialsFromApi(response) {
  if (!response) {
    return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
  }

  if (Array.isArray(response)) {
    const items = response.map(materialFromApi);
    return {
      items,
      totalCount: items.length,
      pageNumber: 1,
      pageSize: items.length || 10,
      totalPages: 1,
    };
  }

  const rawList = Array.isArray(response.items) ? response.items : [];
  const items = rawList.map(materialFromApi);
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
 * Serializes frontend form data to the payload expected by POST /api/materials.
 *
 * @param {{ materialName: string }} data
 * @returns {{ materialName: string }}
 */
export function materialToApiCreate(data = {}) {
  return {
    materialName: String(data.materialName || '').trim(),
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/materials/{id}.
 *
 * @param {{ materialName: string }} data
 * @returns {{ materialName: string }}
 */
export function materialToApiUpdate(data = {}) {
  return {
    materialName: String(data.materialName || '').trim(),
  };
}

/**
 * Serializes frontend status to the payload expected by PATCH /api/materials/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function materialStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}

