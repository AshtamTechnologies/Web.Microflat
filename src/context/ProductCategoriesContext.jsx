/**
 * src/context/ProductCategoriesContext.jsx — Product Categories state management wired to real API service.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productCategoriesService } from '../services';

const ProductCategoriesContext = createContext(null);

export function ProductCategoriesProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/product-categories') ||
    location?.pathname?.startsWith('/inquiries') ||
    location?.pathname?.startsWith('/products')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureProductCategoriesLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});
  const initialFetchDone = useRef(false);

  /**
   * Fetches product categories list with optional search and isActive filters.
   */
  const fetchCategories = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const data = await productCategoriesService.listProductCategories(filters);
      setCategories(Array.isArray(data) ? data : []);
      setLastFilters(filters);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load product categories.';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load only when relevant route is visited or explicitly requested
  useEffect(() => {
    if (!shouldFetch) return;
    if (!initialFetchDone.current) {
      fetchCategories();
    }
  }, [shouldFetch, fetchCategories]);

  /**
   * Synchronous helper to find a category by ID in loaded state.
   */
  const getCategoryById = useCallback(
    (id) => {
      return (
        categories.find(
          (c) => String(c.id) === String(id) || String(c.categoryId) === String(id)
        ) || null
      );
    },
    [categories]
  );

  /**
   * Fetches fresh single Product Category from GET /api/product-categories/{id}.
   */
  const fetchCategoryById = useCallback(async (id) => {
    try {
      const data = await productCategoriesService.getProductCategory(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch category details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new Product Category via POST /api/product-categories.
   */
  const addCategory = useCallback(async (formData) => {
    try {
      const created = await productCategoriesService.createProductCategory(formData);
      toast.success('Category created successfully.');
      return created;
    } catch (err) {
      const msg = err.message || 'Failed to create category.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Updates an existing Product Category via PUT /api/product-categories/{id}.
   */
  const updateCategory = useCallback(async (id, formData) => {
    try {
      const updated = await productCategoriesService.updateProductCategory(id, formData);
      toast.success('Category updated successfully.');
      return updated;
    } catch (err) {
      const msg = err.message || 'Failed to update category.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Updates Product Category status via PATCH /api/product-categories/{id}/status.
   */
  const updateCategoryStatus = useCallback(async (id, isActive) => {
    try {
      await productCategoriesService.updateProductCategoryStatus(id, isActive);
      toast.success(`Category ${isActive ? 'activated' : 'deactivated'} successfully.`);
    } catch (err) {
      const msg = err.message || 'Failed to update category status.';
      toast.error(msg);
      throw err;
    }
  }, []);

  return (
    <ProductCategoriesContext.Provider
      value={{
        categories,
        isLoading,
        error,
        lastFilters,
        fetchCategories,
        fetchCategoryById,
        getCategoryById,
        addCategory,
        updateCategory,
        updateCategoryStatus,
        ensureProductCategoriesLoaded,
      }}
    >
      {children}
    </ProductCategoriesContext.Provider>
  );
}

export function useProductCategoriesContext() {
  const context = useContext(ProductCategoriesContext);
  if (!context) {
    throw new Error('useProductCategoriesContext must be used within a ProductCategoriesProvider');
  }
  return context;
}

export const useProductCategories = useProductCategoriesContext;
export default ProductCategoriesContext;
