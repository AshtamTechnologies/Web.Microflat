/**
 * src/services/productCategories/productCategoriesService.js — Real Product Categories service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { PRODUCT_CATEGORIES_ENDPOINTS } from './productCategoriesEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  categoryFromApi,
  categoriesFromApi,
  categoryToApiPayload,
  categoryStatusToApi,
} from '../../models/productCategories/productCategoryModel';

export const capabilities = {
  search: true,
  filter: true,
  create: true,
  update: true,
  status: true,
};

/**
 * Returns product categories list, with optional search and status filter.
 * GET /api/product-categories
 *
 * @param {{
 *   search?: string,
 *   Search?: string,
 *   isActive?: boolean|string,
 *   IsActive?: boolean|string
 * }} [params]
 * @returns {Promise<Array>}
 */
export async function listProductCategories(params = {}) {
  try {
    const query = {};

    const search = params.Search ?? params.search;
    if (search !== undefined && search !== null && String(search).trim() !== '') {
      query.Search = String(search).trim();
    }

    const act = params.IsActive ?? params.isActive;
    if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
      query.IsActive = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    }

    const response = await axiosInstance.get(PRODUCT_CATEGORIES_ENDPOINTS.CATEGORIES, {
      params: query,
    });
    return categoriesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single Product Category by ID.
 * GET /api/product-categories/{id}
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function getProductCategory(id) {
  try {
    const response = await axiosInstance.get(PRODUCT_CATEGORIES_ENDPOINTS.CATEGORY_BY_ID(id));
    return categoryFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new Product Category.
 * POST /api/product-categories
 *
 * @param {{ categoryCode: string, categoryName: string, parentCategoryId?: number|string|null }} data
 * @returns {Promise<object>}
 */
export async function createProductCategory(data) {
  try {
    const payload = categoryToApiPayload(data);
    const response = await axiosInstance.post(PRODUCT_CATEGORIES_ENDPOINTS.CATEGORIES, payload);
    return categoryFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing Product Category by ID.
 * PUT /api/product-categories/{id}
 *
 * @param {number|string} id
 * @param {{ categoryCode: string, categoryName: string, parentCategoryId?: number|string|null }} data
 * @returns {Promise<object>}
 */
export async function updateProductCategory(id, data) {
  try {
    const payload = categoryToApiPayload(data);
    const response = await axiosInstance.put(PRODUCT_CATEGORIES_ENDPOINTS.CATEGORY_BY_ID(id), payload);
    return categoryFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates Product Category status.
 * PATCH /api/product-categories/{id}/status
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<void>}
 */
export async function updateProductCategoryStatus(id, isActive) {
  try {
    const payload = categoryStatusToApi(isActive);
    await axiosInstance.patch(PRODUCT_CATEGORIES_ENDPOINTS.CATEGORY_STATUS(id), payload);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

