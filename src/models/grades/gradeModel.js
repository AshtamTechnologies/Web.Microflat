/**
 * gradeModel.js — Grade typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id
 *   - gradeCode
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiGradeDto
 * @property {number} id
 * @property {string} gradeCode
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} GradeModel
 * @property {number} id
 * @property {string} gradeCode
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty GradeModel.
 * @returns {GradeModel}
 */
export function createEmptyGrade() {
  return {
    id: 0,
    gradeCode: '',
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API Grade DTO to a frontend GradeModel.
 *
 * @param {ApiGradeDto|object} dto
 * @returns {GradeModel}
 */
export function gradeFromApi(dto) {
  if (!dto) return createEmptyGrade();

  const id = dto.id ?? 0;
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    gradeCode: dto.gradeCode || '',
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array or paginated response of API Grade DTOs to normalized Grade list + pagination info.
 *
 * @param {ApiGradeDto[]|{ items: ApiGradeDto[], totalCount?: number, pageNumber?: number, pageSize?: number, totalPages?: number }} response
 * @returns {{ items: GradeModel[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }}
 */
export function gradesFromApi(response) {
  if (!response) {
    return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
  }

  if (Array.isArray(response)) {
    const items = response.map(gradeFromApi);
    return {
      items,
      totalCount: items.length,
      pageNumber: 1,
      pageSize: items.length || 10,
      totalPages: 1,
    };
  }

  const rawList = Array.isArray(response.items) ? response.items : [];
  const items = rawList.map(gradeFromApi);
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
 * Serializes frontend form data to the payload expected by POST /api/grades.
 *
 * @param {{ gradeCode: string }} data
 * @returns {{ gradeCode: string }}
 */
export function gradeToApiCreate(data = {}) {
  return {
    gradeCode: String(data.gradeCode || '').trim(),
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/grades/{id}.
 *
 * @param {{ gradeCode: string }} data
 * @returns {{ gradeCode: string }}
 */
export function gradeToApiUpdate(data = {}) {
  return {
    gradeCode: String(data.gradeCode || '').trim(),
  };
}

/**
 * Serializes frontend status to the payload expected by PATCH /api/grades/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function gradeStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}

