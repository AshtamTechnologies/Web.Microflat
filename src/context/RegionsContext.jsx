/**
 * src/context/RegionsContext.jsx — Regions context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { regionService } from '../services';

const RegionsContext = createContext(null);

export function RegionsProvider({ children }) {
  const [regions, setRegions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});

  /**
   * Fetches regions from GET /api/regions with optional query parameters.
   */
  const fetchRegions = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await regionService.listRegions(filters);
      setRegions(Array.isArray(data) ? data : []);
      setLastFilters(filters);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load regions.';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  /**
   * Synchronous helper to find a region by ID in current local state.
   */
  const getRegionById = useCallback(
    (id) => {
      return (
        regions.find(
          (r) => String(r.id) === String(id) || String(r.regionId) === String(id)
        ) || null
      );
    },
    [regions]
  );

  /**
   * Returns region name for a given region ID.
   */
  const getRegionName = useCallback(
    (id) => {
      if (!id) return '—';
      const found = regions.find(
        (r) => String(r.id) === String(id) || String(r.regionId) === String(id)
      );
      return found ? found.regionName : String(id);
    },
    [regions]
  );

  /**
   * Formats regions as dropdown options for selectors.
   */
  const getRegionOptions = useCallback(
    ({ activeOnly = true, currentSelectedId = null, excludeIds = [] } = {}) => {
      const excludeSet = new Set(excludeIds.map(String));
      return regions
        .filter((r) => {
          if (excludeSet.has(String(r.id)) || excludeSet.has(String(r.regionId))) {
            return false;
          }
          if (
            currentSelectedId &&
            (String(r.id) === String(currentSelectedId) ||
              String(r.regionId) === String(currentSelectedId))
          ) {
            return true;
          }
          return activeOnly ? Boolean(r.isActive) : true;
        })
        .map((r) => ({
          value: r.id,
          label: r.regionName,
          isActive: r.isActive,
        }));
    },
    [regions]
  );

  /**
   * Fetches fresh single region from GET /api/regions/{id}.
   */
  const fetchRegionById = useCallback(async (id) => {
    try {
      const data = await regionService.getRegion(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch region details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new region via POST /api/regions.
   */
  const addRegion = useCallback(
    async (formData) => {
      try {
        const created = await regionService.createRegion(formData);
        toast.success('Region added successfully');
        await fetchRegions(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create region.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchRegions, lastFilters]
  );

  /**
   * Updates an existing region via PUT /api/regions/{id}.
   */
  const updateRegion = useCallback(
    async (id, formData) => {
      try {
        const updated = await regionService.updateRegion(id, formData);
        toast.success('Region updated successfully');
        await fetchRegions(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update region.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchRegions, lastFilters]
  );

  /**
   * Updates region active status via PATCH /api/regions/{id}/status.
   */
  const updateRegionStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic state update
      setRegions((prev) =>
        prev.map((r) => {
          if (String(r.id) === String(id) || String(r.regionId) === String(id)) {
            return { ...r, isActive: nextActive };
          }
          return r;
        })
      );

      try {
        await regionService.updateRegionStatus(id, nextActive);
        toast.success(nextActive ? 'Region activated' : 'Region deactivated');
        await fetchRegions(lastFilters);
      } catch (err) {
        // Rollback on failure
        setRegions((prev) =>
          prev.map((r) => {
            if (String(r.id) === String(id) || String(r.regionId) === String(id)) {
              return { ...r, isActive: !nextActive };
            }
            return r;
          })
        );
        const msg = err.message || 'Failed to update region status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchRegions, lastFilters]
  );

  /**
   * Toggles region active status.
   */
  const toggleRegionActive = useCallback(
    async (id) => {
      const current = regions.find(
        (r) => String(r.id) === String(id) || String(r.regionId) === String(id)
      );
      if (!current) return;
      await updateRegionStatus(id, !current.isActive);
    },
    [regions, updateRegionStatus]
  );

  /**
   * Legacy delete helper (local removal fallback)
   */
  const deleteRegion = useCallback((id) => {
    setRegions((prev) =>
      prev.filter(
        (r) => String(r.id) !== String(id) && String(r.regionId) !== String(id)
      )
    );
    toast.success('Region removed');
  }, []);

  return (
    <RegionsContext.Provider
      value={{
        regions,
        isLoading,
        error,
        fetchRegions,
        fetchRegionById,
        getRegionById,
        getRegionName,
        getRegionOptions,
        addRegion,
        updateRegion,
        updateRegionStatus,
        toggleRegionActive,
        deleteRegion,
      }}
    >
      {children}
    </RegionsContext.Provider>
  );
}

export function useRegionsContext() {
  const context = useContext(RegionsContext);
  if (!context) {
    throw new Error('useRegionsContext must be used within a RegionsProvider');
  }
  return context;
}

export const useRegions = useRegionsContext;
export default RegionsContext;
