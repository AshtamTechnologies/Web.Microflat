/**
 * src/context/MaterialsContext.jsx — Materials context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { materialsService } from '../services';

const MaterialsContext = createContext(null);

export function MaterialsProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/materials') ||
    location?.pathname?.startsWith('/inquiries')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureMaterialsLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [materialsList, setMaterialsList] = useState([]);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});
  const initialFetchDone = useRef(false);

  /**
   * Fetches paged materials from GET /api/materials with search, isActive, pageNumber, pageSize.
   */
  const fetchMaterials = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const res = await materialsService.listMaterials(filters);
      setMaterialsList(res.items || []);
      setPagination({
        pageNumber: res.pageNumber || 1,
        pageSize: res.pageSize || 10,
        totalCount: res.totalCount || 0,
        totalPages: res.totalPages || 1,
      });
      setLastFilters(filters);
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to load materials.';
      setError(msg);
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load when relevant route is visited or requested
  useEffect(() => {
    if (!shouldFetch) return;
    if (!initialFetchDone.current) {
      fetchMaterials({ pageNumber: 1, pageSize: 10 });
    }
  }, [shouldFetch, fetchMaterials]);

  /**
   * Synchronous helper to find a material by ID in current loaded state.
   */
  const getMaterialById = useCallback(
    (id) => {
      return materialsList.find((m) => String(m.id) === String(id)) || null;
    },
    [materialsList]
  );

  /**
   * Fetches fresh single Material from GET /api/materials/{id}.
   */
  const fetchMaterialById = useCallback(async (id) => {
    try {
      const data = await materialsService.getMaterial(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch material details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new Material via POST /api/materials.
   */
  const addMaterial = useCallback(
    async (formData) => {
      try {
        const created = await materialsService.createMaterial(formData);
        toast.success('Material added successfully');
        await fetchMaterials(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create material.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchMaterials, lastFilters]
  );

  /**
   * Updates an existing Material via PUT /api/materials/{id}.
   */
  const updateMaterial = useCallback(
    async (id, formData) => {
      try {
        const updated = await materialsService.updateMaterial(id, formData);
        toast.success('Material updated successfully');
        await fetchMaterials(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update material.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchMaterials, lastFilters]
  );

  /**
   * Updates Material status via PATCH /api/materials/{id}/status.
   */
  const updateMaterialStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic update
      setMaterialsList((prev) =>
        prev.map((m) => {
          if (String(m.id) === String(id)) {
            return { ...m, isActive: nextActive };
          }
          return m;
        })
      );

      try {
        await materialsService.updateMaterialStatus(id, nextActive);
        toast.success(nextActive ? 'Material activated' : 'Material deactivated');
        await fetchMaterials(lastFilters);
      } catch (err) {
        // Rollback
        setMaterialsList((prev) =>
          prev.map((m) => {
            if (String(m.id) === String(id)) {
              return { ...m, isActive: !nextActive };
            }
            return m;
          })
        );
        const msg = err.message || 'Failed to update material status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchMaterials, lastFilters]
  );

  const value = {
    materialsList,
    pagination,
    isLoading,
    error,
    lastFilters,
    fetchMaterials,
    getMaterialById,
    fetchMaterialById,
    addMaterial,
    updateMaterial,
    updateMaterialStatus,
    ensureMaterialsLoaded,
  };

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}

export function useMaterialsContext() {
  const ctx = useContext(MaterialsContext);
  if (!ctx) {
    throw new Error('useMaterialsContext must be used within a MaterialsProvider');
  }
  return ctx;
}

