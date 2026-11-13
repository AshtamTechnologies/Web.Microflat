/**
 * src/context/FinancialYearsContext.jsx — Financial Years context wired to backend APIs.
 *
 * Implements Section 5.3 ("Financial year setup") of Frontend-API-Guide 1.md:
 * - Reactive state for financial years list & active current operating year.
 * - Centralized CRUD and status operations with toast notifications.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { financialYearService } from '../services';

const FinancialYearsContext = createContext(null);

export function FinancialYearsProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/financial-years') ||
    location?.pathname?.startsWith('/configuration/series')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const [financialYears, setFinancialYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const initialFetchDone = useRef(false);

  /**
   * Fetches list of financial years with optional filters: { status, search }.
   */
  const fetchFinancialYears = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      initialFetchDone.current = true;
      const data = await financialYearService.listFinancialYears(filters);
      const list = Array.isArray(data) ? data : [];
      setFinancialYears(list);
      return list;
    } catch (err) {
      const msg = err.message || 'Failed to load financial years.';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetches the current active financial year for the header badge.
   */
  const fetchCurrentYear = useCallback(async () => {
    try {
      const current = await financialYearService.getCurrentFinancialYear();
      setCurrentYear(current);
      return current;
    } catch {
      return null;
    }
  }, []);

  /**
   * Fetches single financial year by ID.
   * GET /api/financial-years/{id}
   */
  const fetchFinancialYearById = useCallback(async (id) => {
    try {
      return await financialYearService.getFinancialYearById(id);
    } catch (err) {
      const msg = err.message || 'Failed to fetch financial year details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  // Fetch when entering relevant route
  useEffect(() => {
    if (!shouldFetch) return;
    if (!initialFetchDone.current) {
      fetchFinancialYears();
      fetchCurrentYear();
    }
  }, [shouldFetch, fetchFinancialYears, fetchCurrentYear]);

  /**
   * Adds a new financial year (UPCOMING).
   */
  const createYear = useCallback(async (formData) => {
    try {
      setIsLoading(true);
      const created = await financialYearService.createFinancialYear(formData);
      if (created) {
        setFinancialYears((prev) => [created, ...prev]);
        toast.success(`Financial Year ${created.fyCode} scheduled successfully.`);
      }
      return created;
    } catch (err) {
      const msg = err.message || 'Failed to create financial year.';
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Updates an existing financial year.
   */
  const updateYear = useCallback(async (id, formData) => {
    try {
      setIsLoading(true);
      const updated = await financialYearService.updateFinancialYear(id, formData);
      if (updated) {
        setFinancialYears((prev) =>
          prev.map((y) => (String(y.id) === String(id) ? updated : y))
        );
        toast.success(`Financial Year ${updated.fyCode} updated successfully.`);
      }
      return updated;
    } catch (err) {
      const msg = err.message || 'Failed to update financial year.';
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Marks a financial year as OPEN.
   */
  const openYear = useCallback(async (id) => {
    try {
      setIsLoading(true);
      const opened = await financialYearService.openFinancialYear(id);
      if (opened) {
        setFinancialYears((prev) =>
          prev.map((y) => {
            if (String(y.id) === String(id)) {
              return opened;
            }
            if (y.isCurrent) {
              return { ...y, isCurrent: false };
            }
            return y;
          })
        );
        setCurrentYear(opened);
        toast.success(`Financial Year ${opened.fyCode} is now OPEN and active.`);
      }
      return opened;
    } catch (err) {
      const msg = err.message || 'Failed to open financial year.';
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Closes an active financial year with remarks.
   */
  const closeYear = useCallback(async (id, remarks) => {
    try {
      setIsLoading(true);
      const closed = await financialYearService.closeFinancialYear(id, remarks);
      if (closed) {
        setFinancialYears((prev) =>
          prev.map((y) => (String(y.id) === String(id) ? closed : y))
        );
        if (currentYear && String(currentYear.id) === String(id)) {
          setCurrentYear(null);
        }
        toast.success(`Financial Year ${closed.fyCode} has been closed.`);
      }
      return closed;
    } catch (err) {
      const msg = err.message || 'Failed to close financial year.';
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentYear]);

  /**
   * Deletes an upcoming financial year.
   */
  const deleteYear = useCallback(async (id, fyCode = '') => {
    try {
      setIsLoading(true);
      await financialYearService.deleteFinancialYear(id);
      setFinancialYears((prev) => prev.filter((y) => String(y.id) !== String(id)));
      toast.success(`Financial Year ${fyCode || id} deleted.`);
      return true;
    } catch (err) {
      const msg = err.message || 'Failed to delete financial year.';
      toast.error(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    financialYears,
    currentYear,
    isLoading,
    error,
    fetchFinancialYears,
    fetchCurrentYear,
    fetchFinancialYearById,
    createYear,
    updateYear,
    openYear,
    closeYear,
    deleteYear,
    ensureFinancialYearsLoaded: () => setHasRequested(true),
  };

  return (
    <FinancialYearsContext.Provider value={value}>
      {children}
    </FinancialYearsContext.Provider>
  );
}

export function useFinancialYearsContext() {
  const context = useContext(FinancialYearsContext);
  if (!context) {
    throw new Error('useFinancialYearsContext must be used within a FinancialYearsProvider');
  }
  return context;
}

