/**
 * src/context/CurrenciesContext.jsx — Currencies context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { currencyService } from '../services';

const CurrenciesContext = createContext(null);

export function CurrenciesProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/currencies') ||
    location?.pathname?.startsWith('/inquiries') ||
    location?.pathname?.startsWith('/orders')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureCurrenciesLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});
  const initialFetchDone = useRef(false);

  /**
   * Fetches currencies from GET /api/currencies with optional search & isActive query params.
   */
  const fetchCurrencies = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const data = await currencyService.listCurrencies(filters);
      setCurrencies(Array.isArray(data) ? data : []);
      setLastFilters(filters);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load currencies.';
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
      fetchCurrencies();
    }
  }, [shouldFetch, fetchCurrencies]);

  /**
   * Synchronous helper to find a currency by ID in current loaded state.
   */
  const getCurrencyById = useCallback(
    (id) => {
      return currencies.find((c) => String(c.id) === String(id)) || null;
    },
    [currencies]
  );

  /**
   * Formats currencies as dropdown options for selectors.
   */
  const getCurrencyOptions = useCallback(
    ({ activeOnly = true, currentSelectedId = null, excludeIds = [] } = {}) => {
      const excludeSet = new Set(excludeIds.map(String));
      return currencies
        .filter((c) => {
          if (excludeSet.has(String(c.id))) return false;
          if (currentSelectedId && String(c.id) === String(currentSelectedId)) {
            return true;
          }
          return activeOnly ? Boolean(c.isActive) : true;
        })
        .map((c) => ({
          value: c.id,
          label: `${c.currencyCode} (${c.currencySymbol}) - ${c.currencyName}`,
          code: c.currencyCode,
          symbol: c.currencySymbol,
          isActive: c.isActive,
        }));
    },
    [currencies]
  );

  /**
   * Fetches fresh single currency from GET /api/currencies/{id}.
   */
  const fetchCurrencyById = useCallback(async (id) => {
    try {
      const data = await currencyService.getCurrency(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch currency details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new currency via POST /api/currencies.
   */
  const addCurrency = useCallback(
    async (formData) => {
      try {
        const created = await currencyService.createCurrency(formData);
        toast.success('Currency added successfully');
        await fetchCurrencies(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create currency.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchCurrencies, lastFilters]
  );

  /**
   * Updates an existing currency via PUT /api/currencies/{id}.
   */
  const updateCurrency = useCallback(
    async (id, formData) => {
      try {
        const updated = await currencyService.updateCurrency(id, formData);
        toast.success('Currency updated successfully');
        await fetchCurrencies(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update currency.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchCurrencies, lastFilters]
  );

  /**
   * Updates currency active status via PATCH /api/currencies/{id}/status.
   */
  const updateCurrencyStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic update
      setCurrencies((prev) =>
        prev.map((c) => (String(c.id) === String(id) ? { ...c, isActive: nextActive } : c))
      );

      try {
        await currencyService.updateCurrencyStatus(id, nextActive);
        toast.success(nextActive ? 'Currency activated' : 'Currency deactivated');
        await fetchCurrencies(lastFilters);
      } catch (err) {
        // Rollback on failure
        setCurrencies((prev) =>
          prev.map((c) => (String(c.id) === String(id) ? { ...c, isActive: !nextActive } : c))
        );
        const msg = err.message || 'Failed to update currency status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchCurrencies, lastFilters]
  );

  return (
    <CurrenciesContext.Provider
      value={{
        currencies,
        currenciesList: currencies,
        isLoading,
        error,
        fetchCurrencies,
        fetchCurrencyById,
        getCurrencyById,
        getCurrencyOptions,
        addCurrency,
        updateCurrency,
        updateCurrencyStatus,
        ensureCurrenciesLoaded,
      }}
    >
      {children}
    </CurrenciesContext.Provider>
  );
}

export function useCurrenciesContext() {
  const context = useContext(CurrenciesContext);
  if (!context) {
    throw new Error('useCurrenciesContext must be used within a CurrenciesProvider');
  }
  return context;
}

export const useCurrencies = useCurrenciesContext;
export default CurrenciesContext;

