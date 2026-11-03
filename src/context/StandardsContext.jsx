/**
 * src/context/StandardsContext.jsx — Standards context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { standardsService } from '../services';

const StandardsContext = createContext(null);

export function StandardsProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/standards') ||
    location?.pathname?.startsWith('/inquiries')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureStandardsLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [standardsList, setStandardsList] = useState([]);
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
   * Fetches paged standards from GET /api/standards with search, isActive, pageNumber, pageSize.
   */
  const fetchStandards = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const res = await standardsService.listStandards(filters);
      setStandardsList(res.items || []);
      setPagination({
        pageNumber: res.pageNumber || 1,
        pageSize: res.pageSize || 10,
        totalCount: res.totalCount || 0,
        totalPages: res.totalPages || 1,
      });
      setLastFilters(filters);
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to load standards.';
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
      fetchStandards({ pageNumber: 1, pageSize: 10 });
    }
  }, [shouldFetch, fetchStandards]);

  /**
   * Synchronous helper to find a standard by ID in current loaded state.
   */
  const getStandardById = useCallback(
    (id) => {
      return standardsList.find((s) => String(s.id) === String(id)) || null;
    },
    [standardsList]
  );

  /**
   * Fetches fresh single Standard from GET /api/standards/{id}.
   */
  const fetchStandardById = useCallback(async (id) => {
    try {
      const data = await standardsService.getStandard(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch standard details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new Standard via POST /api/standards.
   */
  const addStandard = useCallback(
    async (formData) => {
      try {
        const created = await standardsService.createStandard(formData);
        toast.success('Standard added successfully');
        await fetchStandards(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create standard.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchStandards, lastFilters]
  );

  /**
   * Updates an existing Standard via PUT /api/standards/{id}.
   */
  const updateStandard = useCallback(
    async (id, formData) => {
      try {
        const updated = await standardsService.updateStandard(id, formData);
        toast.success('Standard updated successfully');
        await fetchStandards(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update standard.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchStandards, lastFilters]
  );

  /**
   * Updates Standard status via PATCH /api/standards/{id}/status.
   */
  const updateStandardStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic update
      setStandardsList((prev) =>
        prev.map((s) => {
          if (String(s.id) === String(id)) {
            return { ...s, isActive: nextActive };
          }
          return s;
        })
      );

      try {
        await standardsService.updateStandardStatus(id, nextActive);
        toast.success(nextActive ? 'Standard activated' : 'Standard deactivated');
        await fetchStandards(lastFilters);
      } catch (err) {
        // Rollback
        setStandardsList((prev) =>
          prev.map((s) => {
            if (String(s.id) === String(id)) {
              return { ...s, isActive: !nextActive };
            }
            return s;
          })
        );
        const msg = err.message || 'Failed to update standard status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchStandards, lastFilters]
  );

  const value = {
    standardsList,
    pagination,
    isLoading,
    error,
    lastFilters,
    fetchStandards,
    getStandardById,
    fetchStandardById,
    addStandard,
    updateStandard,
    updateStandardStatus,
    ensureStandardsLoaded,
  };

  return <StandardsContext.Provider value={value}>{children}</StandardsContext.Provider>;
}

export function useStandardsContext() {
  const ctx = useContext(StandardsContext);
  if (!ctx) {
    throw new Error('useStandardsContext must be used within a StandardsProvider');
  }
  return ctx;
}

