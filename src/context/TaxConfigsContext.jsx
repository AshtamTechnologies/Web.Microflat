/**
 * src/context/TaxConfigsContext.jsx — Tax Configurations context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { taxConfigService } from '../services';

const TaxConfigsContext = createContext(null);

export function TaxConfigsProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/tax-configs') ||
    location?.pathname?.startsWith('/quotations') ||
    location?.pathname?.startsWith('/orders')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureTaxConfigsLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [taxConfigs, setTaxConfigs] = useState([]);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  });
  const [applicableTaxes, setApplicableTaxes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});
  const initialFetchDone = useRef(false);

  /**
   * Fetches paged tax configs with Search, IsActive, PageNumber, PageSize
   */
  const fetchTaxConfigs = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const res = await taxConfigService.listTaxConfigs(filters);
      setTaxConfigs(Array.isArray(res.items) ? res.items : []);
      setPagination({
        pageNumber: res.pageNumber || filters.PageNumber || 1,
        pageSize: res.pageSize || filters.PageSize || 10,
        totalCount: res.totalCount || 0,
        totalPages: res.totalPages || 1,
      });
      setLastFilters(filters);
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to load tax configurations.';
      setError(msg);
      return { items: [], totalCount: 0 };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load when relevant route is visited
  useEffect(() => {
    if (!shouldFetch) return;
    if (!initialFetchDone.current) {
      fetchTaxConfigs();
    }
  }, [shouldFetch, fetchTaxConfigs]);

  /**
   * Fetches applicable taxes as of a given date (defaults to today)
   */
  const fetchApplicableTaxes = useCallback(async (date) => {
    try {
      const list = await taxConfigService.getApplicableTaxes(date);
      setApplicableTaxes(list);
      return list;
    } catch (err) {
      const msg = err.message || 'Failed to load applicable taxes.';
      toast.error(msg);
      return [];
    }
  }, []);

  /**
   * Fetches fresh single tax config by ID with rate history
   */
  const fetchTaxConfigById = useCallback(async (id) => {
    try {
      return await taxConfigService.getTaxConfig(id);
    } catch (err) {
      const msg = err.message || 'Failed to fetch tax configuration details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new tax config with initial rate: POST /api/tax-configs
   */
  const addTaxConfig = useCallback(
    async (formData) => {
      try {
        const created = await taxConfigService.createTaxConfig(formData);
        toast.success('Tax configuration created successfully');
        await fetchTaxConfigs(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create tax configuration.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchTaxConfigs, lastFilters]
  );

  /**
   * Renames a tax config: PUT /api/tax-configs/{id}
   */
  const updateTaxConfig = useCallback(
    async (id, formData) => {
      try {
        const updated = await taxConfigService.updateTaxConfig(id, formData);
        toast.success('Tax configuration updated successfully');
        await fetchTaxConfigs(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update tax configuration.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchTaxConfigs, lastFilters]
  );

  /**
   * Changes status inside the form: PATCH /api/tax-configs/{id}/status
   */
  const updateTaxConfigStatus = useCallback(
    async (id, isActive) => {
      try {
        const res = await taxConfigService.updateTaxConfigStatus(id, isActive);
        toast.success(isActive ? 'Tax configuration activated' : 'Tax configuration deactivated');
        await fetchTaxConfigs(lastFilters);
        return res;
      } catch (err) {
        const msg = err.message || 'Failed to update tax status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchTaxConfigs, lastFilters]
  );

  /**
   * Deletes a tax config: DELETE /api/tax-configs/{id}
   */
  const deleteTaxConfig = useCallback(
    async (id) => {
      try {
        const res = await taxConfigService.deleteTaxConfig(id);
        toast.success('Tax configuration deleted successfully');
        await fetchTaxConfigs(lastFilters);
        return res;
      } catch (err) {
        const msg = err.message || 'Failed to delete tax configuration.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchTaxConfigs, lastFilters]
  );

  /**
   * Fetches rate timeline: GET /api/tax-configs/{id}/rates
   */
  const fetchRates = useCallback(async (taxConfigId) => {
    try {
      return await taxConfigService.getTaxConfigRates(taxConfigId);
    } catch (err) {
      const msg = err.message || 'Failed to load rates history.';
      toast.error(msg);
      return [];
    }
  }, []);

  /**
   * Adds new rate version: POST /api/tax-configs/{id}/rates
   */
  const addRate = useCallback(
    async (taxConfigId, rateData) => {
      try {
        const created = await taxConfigService.createTaxConfigRate(taxConfigId, rateData);
        toast.success('New tax rate added successfully');
        await fetchTaxConfigs(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to add tax rate.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchTaxConfigs, lastFilters]
  );

  /**
   * Updates an existing rate: PUT /api/tax-config-rates/{rateId}
   */
  const updateRate = useCallback(
    async (rateId, rateData) => {
      try {
        const updated = await taxConfigService.updateTaxConfigRate(rateId, rateData);
        toast.success('Tax rate updated successfully');
        await fetchTaxConfigs(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update tax rate.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchTaxConfigs, lastFilters]
  );

  /**
   * Deletes an existing rate: DELETE /api/tax-config-rates/{rateId}
   */
  const deleteRate = useCallback(
    async (rateId) => {
      try {
        const res = await taxConfigService.deleteTaxConfigRate(rateId);
        toast.success('Tax rate deleted successfully');
        await fetchTaxConfigs(lastFilters);
        return res;
      } catch (err) {
        const msg = err.message || 'Failed to delete tax rate.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchTaxConfigs, lastFilters]
  );

  return (
    <TaxConfigsContext.Provider
      value={{
        taxConfigs,
        pagination,
        applicableTaxes,
        isLoading,
        error,
        fetchTaxConfigs,
        fetchTaxConfigById,
        fetchApplicableTaxes,
        addTaxConfig,
        updateTaxConfig,
        updateTaxConfigStatus,
        deleteTaxConfig,
        fetchRates,
        addRate,
        updateRate,
        deleteRate,
        ensureTaxConfigsLoaded,
      }}
    >
      {children}
    </TaxConfigsContext.Provider>
  );
}

export function useTaxConfigsContext() {
  const context = useContext(TaxConfigsContext);
  if (!context) {
    throw new Error('useTaxConfigsContext must be used within a TaxConfigsProvider');
  }
  return context;
}

export const useTaxConfigs = useTaxConfigsContext;
export default TaxConfigsContext;

