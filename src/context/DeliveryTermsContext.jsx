/**
 * src/context/DeliveryTermsContext.jsx — Delivery Terms context wired to backend APIs.
 * Conforms to Section 5.3 of Frontend-API-Guide.md.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { deliveryTermService } from '../services';

const DeliveryTermsContext = createContext(null);

export function DeliveryTermsProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/delivery-terms') ||
    location?.pathname?.startsWith('/quotations') ||
    location?.pathname?.startsWith('/sales-orders') ||
    location?.pathname?.startsWith('/clients')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureDeliveryTermsLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});
  const initialFetchDone = useRef(false);

  /**
   * Fetches delivery terms from GET /api/delivery-terms with optional query parameters.
   */
  const fetchDeliveryTerms = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const data = await deliveryTermService.listDeliveryTerms(filters);
      setDeliveryTerms(Array.isArray(data) ? data : []);
      setLastFilters(filters);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load delivery terms.';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Lazy load only on relevant routes or when requested
  useEffect(() => {
    if (!shouldFetch) return;
    if (!initialFetchDone.current) {
      fetchDeliveryTerms();
    }
  }, [shouldFetch, fetchDeliveryTerms]);

  /**
   * Synchronous helper to find a delivery term in current local state.
   */
  const getDeliveryTermById = useCallback(
    (id) => {
      return (
        deliveryTerms.find(
          (dt) => String(dt.id) === String(id) || String(dt.deliveryTermId) === String(id)
        ) || null
      );
    },
    [deliveryTerms]
  );

  /**
   * Fetches fresh single delivery term from GET /api/delivery-terms/{id}.
   */
  const fetchDeliveryTermById = useCallback(async (id) => {
    try {
      const data = await deliveryTermService.getDeliveryTerm(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch delivery term details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new delivery term via POST /api/delivery-terms.
   */
  const addDeliveryTerm = useCallback(
    async (formData) => {
      try {
        const created = await deliveryTermService.createDeliveryTerm(formData);
        toast.success('Delivery term added successfully');
        await fetchDeliveryTerms(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create delivery term.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchDeliveryTerms, lastFilters]
  );

  /**
   * Updates an existing delivery term via PUT /api/delivery-terms/{id}.
   */
  const updateDeliveryTerm = useCallback(
    async (id, formData) => {
      try {
        const updated = await deliveryTermService.updateDeliveryTerm(id, formData);
        toast.success('Delivery term updated successfully');
        await fetchDeliveryTerms(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update delivery term.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchDeliveryTerms, lastFilters]
  );

  /**
   * Updates delivery term active status via PATCH /api/delivery-terms/{id}/status.
   */
  const updateDeliveryTermStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic state update
      setDeliveryTerms((prev) =>
        prev.map((dt) => {
          if (String(dt.id) === String(id) || String(dt.deliveryTermId) === String(id)) {
            return {
              ...dt,
              isActive: nextActive,
              // If deactivating, it can no longer be default
              isDefault: nextActive ? dt.isDefault : false,
            };
          }
          return dt;
        })
      );

      try {
        await deliveryTermService.updateDeliveryTermStatus(id, nextActive);
        toast.success(nextActive ? 'Delivery term activated' : 'Delivery term deactivated');
      } catch (err) {
        // Rollback on failure
        setDeliveryTerms((prev) =>
          prev.map((dt) => {
            if (String(dt.id) === String(id) || String(dt.deliveryTermId) === String(id)) {
              return { ...dt, isActive: !nextActive };
            }
            return dt;
          })
        );
        const msg = err.message || 'Failed to update delivery term status.';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  const defaultDeliveryTerm = useMemo(() => {
    return deliveryTerms.find((dt) => dt.isDefault && dt.isActive) || null;
  }, [deliveryTerms]);

  const value = {
    deliveryTerms,
    isLoading,
    error,
    defaultDeliveryTerm,
    ensureDeliveryTermsLoaded,
    fetchDeliveryTerms,
    getDeliveryTermById,
    fetchDeliveryTermById,
    addDeliveryTerm,
    updateDeliveryTerm,
    updateDeliveryTermStatus,
  };

  return <DeliveryTermsContext.Provider value={value}>{children}</DeliveryTermsContext.Provider>;
}

export function useDeliveryTermsContext() {
  const context = useContext(DeliveryTermsContext);
  if (!context) {
    throw new Error('useDeliveryTermsContext must be used within a DeliveryTermsProvider');
  }
  return context;
}

