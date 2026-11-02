/**
 * src/pages/products/useProducts.js — Custom hook managing product state, lookups, and filters.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { productService } from '../../services';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Summary counts
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Lookups (categories, materials, uoms, standards, grades, specParameters, documentTypes, approvalStatuses)
  const [lookups, setLookups] = useState({
    categories: [],
    materials: [],
    uoms: [],
    standards: [],
    grades: [],
    specParameters: [],
    documentTypes: [],
    approvalStatuses: [],
  });
  const [isLoadingLookups, setIsLoadingLookups] = useState(false);

  // Filters (matching Image 1)
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [materialId, setMaterialId] = useState('ALL');
  const [uomId, setUomId] = useState('ALL');
  const [approvalStatus, setApprovalStatus] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Load Lookups
  const loadLookups = useCallback(async () => {
    setIsLoadingLookups(true);
    try {
      const data = await productService.getProductLookups();
      if (data) {
        setLookups({
          categories: Array.isArray(data.categories) ? data.categories : [],
          materials: Array.isArray(data.materials) ? data.materials : [],
          uoms: Array.isArray(data.uoms) ? data.uoms : [],
          standards: Array.isArray(data.standards) ? data.standards : [],
          grades: Array.isArray(data.grades) ? data.grades : [],
          specParameters: Array.isArray(data.specParameters) ? data.specParameters : [],
          documentTypes: Array.isArray(data.documentTypes) ? data.documentTypes : [],
          approvalStatuses: Array.isArray(data.approvalStatuses) ? data.approvalStatuses : [],
        });
      }
    } catch (err) {
      console.warn('Could not load product lookups:', err);
    } finally {
      setIsLoadingLookups(false);
    }
  }, []);

  // Load Summary
  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const data = await productService.getProductSummary();
      if (data) {
        setSummary(data);
      }
    } catch (err) {
      console.warn('Could not load product summary:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Load Products
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productService.listProducts({
        search,
        categoryId,
        materialId,
        uomId,
        approvalStatus,
        isActive: statusFilter,
        pageNumber,
        pageSize,
      });

      if (res && Array.isArray(res.items)) {
        setProducts(res.items);
        setTotalCount(res.totalCount ?? res.items.length);
        setTotalPages(res.totalPages ?? 1);
      }
    } catch (err) {
      console.warn('Could not fetch products:', err);
      toast.error(err?.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryId, materialId, uomId, approvalStatus, statusFilter, pageNumber, pageSize]);

  // Initial fetch for Lookups & Summary
  useEffect(() => {
    loadLookups();
    loadSummary();
  }, [loadLookups, loadSummary]);

  // Reset pagination to page 1 whenever any filter changes
  useEffect(() => {
    setPageNumber(1);
  }, [search, categoryId, materialId, uomId, approvalStatus, statusFilter]);

  // Refetch products when filters/page change
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    setSearch('');
    setCategoryId('ALL');
    setMaterialId('ALL');
    setUomId('ALL');
    setApprovalStatus('ALL');
    setStatusFilter('ALL');
    setPageNumber(1);
  }, []);

  const hasActiveFilters = Boolean(
    search.trim() ||
      categoryId !== 'ALL' ||
      materialId !== 'ALL' ||
      uomId !== 'ALL' ||
      approvalStatus !== 'ALL' ||
      statusFilter !== 'ALL'
  );

  // Status toggle handler
  const toggleProductStatus = useCallback(
    async (id, currentIsActive) => {
      const nextActive = !currentIsActive;
      try {
        await productService.updateProductStatus(id, nextActive);
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: nextActive } : p))
        );
        toast.success(`Product ${nextActive ? 'activated' : 'deactivated'} successfully`);
        loadSummary();
      } catch (err) {
        toast.error(err?.message || 'Failed to update product status');
        throw err;
      }
    },
    [loadSummary]
  );

  // Delete product handler
  const deleteProduct = useCallback(
    async (id) => {
      try {
        await productService.deleteProduct(id);
        toast.success('Product deleted successfully');
        loadProducts();
        loadSummary();
      } catch (err) {
        toast.error(err?.message || 'Failed to delete product');
        throw err;
      }
    },
    [loadProducts, loadSummary]
  );

  // Approve product handler
  const approveProduct = useCallback(
    async (id, data = {}) => {
      try {
        await productService.approveProduct(id, data);
        toast.success('Product approved successfully');
        loadProducts();
        loadSummary();
      } catch (err) {
        toast.error(err?.message || 'Failed to approve product');
        throw err;
      }
    },
    [loadProducts, loadSummary]
  );

  // Reject product handler
  const rejectProduct = useCallback(
    async (id, data = {}) => {
      try {
        await productService.rejectProduct(id, data);
        toast.success('Product rejected');
        loadProducts();
        loadSummary();
      } catch (err) {
        toast.error(err?.message || 'Failed to reject product');
        throw err;
      }
    },
    [loadProducts, loadSummary]
  );

  // Resubmit product handler
  const resubmitProduct = useCallback(
    async (id) => {
      try {
        await productService.resubmitProduct(id);
        toast.success('Product resubmitted for approval');
        loadProducts();
        loadSummary();
      } catch (err) {
        toast.error(err?.message || 'Failed to resubmit product');
        throw err;
      }
    },
    [loadProducts, loadSummary]
  );

  return {
    products,
    isLoading,
    totalCount,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalPages,

    // Summary
    summary,
    isLoadingSummary,
    loadSummary,

    // Lookups
    lookups,
    isLoadingLookups,
    loadLookups,

    // Filters
    search,
    setSearch,
    categoryId,
    setCategoryId,
    materialId,
    setMaterialId,
    uomId,
    setUomId,
    approvalStatus,
    setApprovalStatus,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    resetFilters,

    // Operations
    refreshProducts: loadProducts,
    toggleProductStatus,
    deleteProduct,
    approveProduct,
    rejectProduct,
    resubmitProduct,
  };
}

