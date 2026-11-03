/**
 * src/services/productCategories/productCategoriesEndpoints.js — API endpoints for Product Categories.
 */

export const PRODUCT_CATEGORIES_ENDPOINTS = {
  CATEGORIES: '/api/product-categories',
  CATEGORY_BY_ID: (id) => `/api/product-categories/${id}`,
  CATEGORY_STATUS: (id) => `/api/product-categories/${id}/status`,
};

