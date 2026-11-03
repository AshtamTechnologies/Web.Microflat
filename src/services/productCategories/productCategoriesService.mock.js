/**
 * src/services/productCategories/productCategoriesService.mock.js — Offline mock service for Product Categories.
 */

import { INITIAL_PRODUCT_CATEGORIES } from '../../mocks/productCategories';
import {
  categoryFromApi,
  categoriesFromApi,
  categoryToApiPayload,
} from '../../models/productCategories/productCategoryModel';

let mockCategories = [...INITIAL_PRODUCT_CATEGORIES];

export const capabilities = {
  search: true,
  filter: true,
  create: true,
  update: true,
  status: true,
};

export async function listProductCategories(params = {}) {
  await new Promise((r) => setTimeout(r, 200));

  let result = [...mockCategories];

  const search = params.Search ?? params.search;
  if (search && String(search).trim() !== '') {
    const q = String(search).toLowerCase().trim();
    result = result.filter(
      (c) =>
        (c.categoryCode && c.categoryCode.toLowerCase().includes(q)) ||
        (c.categoryName && c.categoryName.toLowerCase().includes(q))
    );
  }

  const act = params.IsActive ?? params.isActive;
  if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
    const activeBool = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    result = result.filter((c) => Boolean(c.isActive) === activeBool);
  }

  return categoriesFromApi(result);
}

export async function getProductCategory(id) {
  await new Promise((r) => setTimeout(r, 150));
  const found = mockCategories.find((c) => String(c.id) === String(id) || String(c.categoryId) === String(id));
  if (!found) {
    throw new Error('Category not found');
  }
  return categoryFromApi(found);
}

export async function createProductCategory(data) {
  await new Promise((r) => setTimeout(r, 250));
  const payload = categoryToApiPayload(data);
  const newCat = {
    id: Date.now(),
    categoryId: Date.now(),
    categoryCode: payload.categoryCode,
    categoryName: payload.categoryName,
    parentCategoryId: payload.parentCategoryId || null,
    parentCategoryName: null,
    isActive: true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };
  mockCategories.push(newCat);
  return categoryFromApi(newCat);
}

export async function updateProductCategory(id, data) {
  await new Promise((r) => setTimeout(r, 200));
  const payload = categoryToApiPayload(data);
  const idx = mockCategories.findIndex((c) => String(c.id) === String(id) || String(c.categoryId) === String(id));
  if (idx === -1) {
    throw new Error('Category not found');
  }
  mockCategories[idx] = {
    ...mockCategories[idx],
    categoryCode: payload.categoryCode,
    categoryName: payload.categoryName,
    parentCategoryId: payload.parentCategoryId || null,
    lastUpdatedOn: new Date().toISOString(),
  };
  return categoryFromApi(mockCategories[idx]);
}

export async function updateProductCategoryStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  const idx = mockCategories.findIndex((c) => String(c.id) === String(id) || String(c.categoryId) === String(id));
  if (idx === -1) {
    throw new Error('Category not found');
  }
  mockCategories[idx] = {
    ...mockCategories[idx],
    isActive: Boolean(isActive),
    lastUpdatedOn: new Date().toISOString(),
  };
}

