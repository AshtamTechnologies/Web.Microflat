/**
 * src/models/productCategories/productCategoryModel.js — Product Category model mappers and serializers.
 *
 * Maps between backend API DTO and frontend model:
 *   - id / categoryId
 *   - categoryCode
 *   - categoryName
 *   - parentCategoryId
 *   - parentCategoryName
 *   - isActive
 *   - createdOn
 *   - lastUpdatedOn
 */

/**
 * Creates an empty ProductCategoryModel.
 */
export function createEmptyCategory() {
  return {
    id: 0,
    categoryId: 0,
    categoryCode: '',
    categoryName: '',
    parentCategoryId: null,
    parentCategoryName: null,
    isActive: true,
    createdOn: '',
    lastUpdatedOn: null,
  };
}

/**
 * Normalizes an API Product Category DTO to a frontend category model.
 * Assigns categoryId = dto.id for compatibility with treeUtils and table components.
 */
export function categoryFromApi(dto) {
  if (!dto) return createEmptyCategory();

  const id = dto.id ?? 0;
  const rawParentId = dto.parentCategoryId;
  const parentId =
    rawParentId !== null && rawParentId !== undefined && Number(rawParentId) !== 0
      ? Number(rawParentId)
      : null;

  return {
    id,
    categoryId: id,
    categoryCode: dto.categoryCode || '',
    categoryName: dto.categoryName || '',
    parentCategoryId: parentId,
    parentCategoryName: dto.parentCategoryName || null,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: dto.createdOn || dto.createdAt || '',
    lastUpdatedOn: dto.lastUpdatedOn || dto.updatedAt || null,
  };
}

/**
 * Maps an array or paginated response of API Category DTOs.
 */
export function categoriesFromApi(response) {
  if (!response) return [];
  const rawList = Array.isArray(response)
    ? response
    : Array.isArray(response.items)
    ? response.items
    : [];
  return rawList.map(categoryFromApi);
}

/**
 * Serializes form data to the payload expected by POST / PUT /api/product-categories.
 */
export function categoryToApiPayload(data = {}) {
  const rawParentId = data.parentCategoryId;
  const parentId =
    rawParentId !== null &&
    rawParentId !== undefined &&
    rawParentId !== '' &&
    Number(rawParentId) !== 0
      ? Number(rawParentId)
      : 0;

  return {
    categoryCode: String(data.categoryCode || '').trim().toUpperCase(),
    categoryName: String(data.categoryName || '').trim(),
    parentCategoryId: isNaN(parentId) ? 0 : parentId,
  };
}

/**
 * Serializes status payload for PATCH /api/product-categories/{id}/status.
 */
export function categoryStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}

