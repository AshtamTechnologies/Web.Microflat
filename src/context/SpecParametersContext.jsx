/**
 * src/context/SpecParametersContext.jsx — Spec Parameters context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { specParametersService } from '../services';

const SpecParametersContext = createContext(null);

export function SpecParametersProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/spec-parameters') ||
    location?.pathname?.startsWith('/inquiries')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureSpecParametersLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [specParametersList, setSpecParametersList] = useState([]);
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
   * Fetches paged spec parameters from GET /api/spec-parameters with search, isActive, pageNumber, pageSize.
   */
  const fetchSpecParameters = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const res = await specParametersService.listSpecParameters(filters);
      setSpecParametersList(res.items || []);
      setPagination({
        pageNumber: res.pageNumber || 1,
        pageSize: res.pageSize || 10,
        totalCount: res.totalCount || 0,
        totalPages: res.totalPages || 1,
      });
      setLastFilters(filters);
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to load specification parameters.';
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
      fetchSpecParameters({ pageNumber: 1, pageSize: 10 });
    }
  }, [shouldFetch, fetchSpecParameters]);

  /**
   * Synchronous helper to find a parameter by ID in current loaded state.
   */
  const getSpecParameterById = useCallback(
    (id) => {
      return specParametersList.find((p) => String(p.id) === String(id)) || null;
    },
    [specParametersList]
  );

  /**
   * Fetches fresh single Spec Parameter from GET /api/spec-parameters/{id}.
   */
  const fetchSpecParameterById = useCallback(async (id) => {
    try {
      const data = await specParametersService.getSpecParameter(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch specification parameter details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new Spec Parameter via POST /api/spec-parameters.
   */
  const addSpecParameter = useCallback(
    async (formData) => {
      try {
        const created = await specParametersService.createSpecParameter(formData);
        toast.success('Specification parameter added successfully');
        await fetchSpecParameters(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create specification parameter.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchSpecParameters, lastFilters]
  );

  /**
   * Updates an existing Spec Parameter via PUT /api/spec-parameters/{id}.
   */
  const updateSpecParameter = useCallback(
    async (id, formData) => {
      try {
        const updated = await specParametersService.updateSpecParameter(id, formData);
        toast.success('Specification parameter updated successfully');
        await fetchSpecParameters(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update specification parameter.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchSpecParameters, lastFilters]
  );

  /**
   * Updates Spec Parameter status via PATCH /api/spec-parameters/{id}/status.
   */
  const updateSpecParameterStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic update
      setSpecParametersList((prev) =>
        prev.map((p) => {
          if (String(p.id) === String(id)) {
            return { ...p, isActive: nextActive };
          }
          return p;
        })
      );

      try {
        await specParametersService.updateSpecParameterStatus(id, nextActive);
        toast.success(nextActive ? 'Parameter activated' : 'Parameter deactivated');
        await fetchSpecParameters(lastFilters);
      } catch (err) {
        // Rollback
        setSpecParametersList((prev) =>
          prev.map((p) => {
            if (String(p.id) === String(id)) {
              return { ...p, isActive: !nextActive };
            }
            return p;
          })
        );
        const msg = err.message || 'Failed to update parameter status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchSpecParameters, lastFilters]
  );

  const value = {
    specParametersList,
    pagination,
    isLoading,
    error,
    lastFilters,
    fetchSpecParameters,
    getSpecParameterById,
    fetchSpecParameterById,
    addSpecParameter,
    updateSpecParameter,
    updateSpecParameterStatus,
    ensureSpecParametersLoaded,
  };

  return <SpecParametersContext.Provider value={value}>{children}</SpecParametersContext.Provider>;
}

export function useSpecParametersContext() {
  const ctx = useContext(SpecParametersContext);
  if (!ctx) {
    throw new Error('useSpecParametersContext must be used within a SpecParametersProvider');
  }
  return ctx;
}

