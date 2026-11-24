/**
 * src/services/products/productEndpoints.js — API endpoints for Products module.
 */

export const PRODUCT_ENDPOINTS = {
  PRODUCTS: '/api/products',
  SUMMARY: '/api/products/summary',
  LOOKUPS: '/api/products/lookups',
  PRODUCT_BY_ID: (id) => `/api/products/${id}`,
  PRODUCT_STATUS: (id) => `/api/products/${id}/status`,
  APPROVE: (id) => `/api/products/${id}/approve`,
  REJECT: (id) => `/api/products/${id}/reject`,
  RESUBMIT: (id) => `/api/products/${id}/resubmit`,
  VARIANTS: (id) => `/api/products/${id}/variants`,
  OPTIONS: (id) => `/api/products/${id}/options`,
  STANDARDS: (id) => `/api/products/${id}/standards`,
  ATTACHMENTS: (id) => `/api/products/${id}/attachments`,

  // Product Variants & Specs (from Product Tables Guide)
  PRODUCT_VARIANTS: '/api/product-variants',
  VARIANT_BY_ID: (id) => `/api/product-variants/${id}`,
  VARIANT_STATUS: (id) => `/api/product-variants/${id}/status`,
  VARIANT_SPECS: (id) => `/api/product-variants/${id}/specs`,
  VARIANT_SPECS_RESOLVE: (id) => `/api/product-variants/${id}/specs/resolve`,

  // Product Options (from Swagger /api/product-options)
  PRODUCT_OPTIONS: '/api/product-options',

  // Product Prices (from ProductPriceList.md)
  PRODUCT_PRICES: '/api/product-prices',
  PRODUCT_PRICES_LOOKUP: '/api/product-prices/lookup',
  PRODUCT_PRICE_BY_ID: (id) => `/api/product-prices/${id}`,
  PRODUCT_PRICES_BY_PRODUCT: (productId) => `/api/products/${productId}/prices`,
  PRODUCT_OPTION_PRICE: (optionId) => `/api/product-options/${optionId}/price`,
};
