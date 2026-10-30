/**
 * src/context/UomContext.jsx — Unit of Measurement (UOM) context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { uomService } from '../services';

const UomContext = createContext(null);

export function UomProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/uom') ||
    location?.pathname?.startsWith('/inquiries') ||
    location?.pathname?.startsWith('/purchase-requisition')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureUomsLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [uomList, setUomList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});

  /**
   * Fetches UOMs list from GET /api/uoms with optional filters (e.g. { isActive: true }).
   */
  const fetchUoms = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await uomService.listUoms(filters);
      setUomList(Array.isArray(data) ? data : []);
      setLastFilters(filters);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load units of measurement.';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Lazy load only on relevant routes or when requested
  useEffect(() => {
    if (!shouldFetch) return;
    if (uomList.length === 0) {
      fetchUoms();
    }
  }, [shouldFetch, uomList.length, fetchUoms]);

  /**
   * Synchronous helper to find a UOM by id in current local state.
   */
  const getUomById = useCallback(
    (id) => {
      return (
        uomList.find(
          (u) => String(u.id) === String(id) || String(u.uomId) === String(id)
        ) || null
      );
    },
    [uomList]
  );

  /**
   * Fetches fresh single UOM from GET /api/uoms/{id}.
   */
  const fetchUomById = useCallback(async (id) => {
    try {
      const data = await uomService.getUom(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch UOM details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new UOM via POST /api/uoms.
   */
  const addUom = useCallback(
    async (formData) => {
      try {
        const created = await uomService.createUom(formData);
        toast.success('UOM added successfully');
        await fetchUoms(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create UOM.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchUoms, lastFilters]
  );

  /**
   * Updates an existing UOM via PUT /api/uoms/{id}.
   */
  const updateUom = useCallback(
    async (id, formData) => {
      try {
        const updated = await uomService.updateUom(id, formData);
        toast.success('UOM updated successfully');
        await fetchUoms(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update UOM.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchUoms, lastFilters]
  );

  /**
   * Updates UOM active status via PATCH /api/uoms/{id}/status.
   */
  const updateUomStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic state update
      setUomList((prev) =>
        prev.map((u) => {
          if (String(u.id) === String(id) || String(u.uomId) === String(id)) {
            return { ...u, isActive: nextActive };
          }
          return u;
        })
      );

      try {
        await uomService.updateUomStatus(id, nextActive);
        toast.success(nextActive ? 'UOM activated' : 'UOM deactivated');
        await fetchUoms(lastFilters);
      } catch (err) {
        // Rollback on failure
        setUomList((prev) =>
          prev.map((u) => {
            if (String(u.id) === String(id) || String(u.uomId) === String(id)) {
              return { ...u, isActive: !nextActive };
            }
            return u;
          })
        );
        const msg = err.message || 'Failed to update UOM status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchUoms, lastFilters]
  );

  /**
   * Toggles UOM active status.
   */
  const toggleUomActive = useCallback(
    async (id) => {
      const current = uomList.find(
        (u) => String(u.id) === String(id) || String(u.uomId) === String(id)
      );
      if (!current) return;
      await updateUomStatus(id, !current.isActive);
    },
    [uomList, updateUomStatus]
  );

  /**
   * Legacy delete helper (local removal fallback)
   */
  const deleteUom = useCallback((id) => {
    setUomList((prev) =>
      prev.filter(
        (u) => String(u.id) !== String(id) && String(u.uomId) !== String(id)
      )
    );
    toast.success('UOM removed');
  }, []);

  return (
    <UomContext.Provider
      value={{
        uomList,
        isLoading,
        error,
        fetchUoms,
        fetchUomById,
        getUomById,
        addUom,
        updateUom,
        updateUomStatus,
        toggleUomActive,
        deleteUom,
        ensureUomsLoaded,
      }}
    >
      {children}
    </UomContext.Provider>
  );
}

export function useUomContext() {
  const context = useContext(UomContext);
  if (!context) {
    throw new Error('useUomContext must be used within a UomProvider');
  }
  return context;
}

export const useUom = useUomContext;
export default UomContext;
