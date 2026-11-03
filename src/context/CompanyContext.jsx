/**
 * src/context/CompanyContext.jsx — Real API State & CRUD for Company Registration with resilient fallback.
 *
 * Fully integrated with backend endpoints defined in Company API Integration Guide:
 *   - listCompanies (GET /api/companies)
 *   - getCompanyById (GET /api/companies/{id})
 *   - getCompanyLookups (GET /api/companies/lookups)
 *   - createCompany (POST /api/companies)
 *   - updateCompany (PUT /api/companies/{id})
 *   - updateCompanyStatus (PATCH /api/companies/{id}/status)
 *   - deleteCompany (DELETE /api/companies/{id})
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_COMPANIES } from '../mocks/companies';
import * as companyService from '../services/companies/companyService';

const STORAGE_KEY = 'mf_company_registrations_v2';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only return if it's not the initial mock dummy
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.companyCode !== 'COMP-001') {
          return parsed.slice(0, 1);
        }
      }
    } catch (e) {
      console.warn('Failed to parse companies from localStorage:', e);
    }
    return [];
  });

  const [lookups, setLookups] = useState({
    bankAccountTypes: ['Current', 'Savings', 'Cash Credit', 'Overdraft'],
    documentTypes: [],
    countries: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 1,
  });

  // Sync state to localStorage for offline persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    } catch (e) {
      console.warn('Failed to save companies to localStorage:', e);
    }
  }, [companies]);

  /**
   * Fetches the paged list of companies from the backend.
   */
  const fetchCompanies = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await companyService.listCompanies(params);
      if (result && Array.isArray(result.items)) {
        setCompanies(result.items);
        setPagination({
          pageNumber: result.pageNumber,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
        });
      }
      return result;
    } catch (err) {
      console.warn('Could not load live companies:', err.message);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches lookup dropdowns (bank account types, document types, countries).
   */
  const fetchLookups = useCallback(async () => {
    try {
      const data = await companyService.getCompanyLookups();
      if (data) {
        setLookups(data);
      }
      return data;
    } catch (err) {
      console.warn('Could not load company lookups from server:', err.message);
      return null;
    }
  }, []);

  // Lookups and companies are fetched on-demand by the corresponding pages

  const companiesRef = useRef(companies);
  companiesRef.current = companies;

  /**
   * Synchronous lookup from memory/state for UI components that rely on instant response.
   */
  const getCompanyById = useCallback(
    (id) => {
      if (!id) return null;
      const target = String(id).toLowerCase().trim();
      const numTarget = target.replace(/^\D+/g, '');

      return (
        companiesRef.current.find((c) => {
          const compIdStr = String(c.id || '').toLowerCase().trim();
          const compNumStr = String(c.companyId || '').toLowerCase().trim();
          const compCodeStr = String(c.companyCode || '').toLowerCase().trim();

          return (
            compIdStr === target ||
            compNumStr === target ||
            compCodeStr === target ||
            (numTarget && (compNumStr === numTarget || compIdStr.replace(/^\D+/g, '') === numTarget))
          );
        }) || null
      );
    },
    []
  );

  /**
   * Asynchronous detail fetch directly from backend GET /api/companies/{id}.
   */
  const fetchCompanyById = useCallback(async (id) => {
    if (!id) return null;
    try {
      const company = await companyService.getCompanyById(id);
      if (company) {
        setCompanies((prev) => {
          const exists = prev.some((c) => String(c.id) === String(company.id) || String(c.companyId) === String(company.companyId));
          return exists
            ? prev.map((c) => (String(c.id) === String(company.id) || String(c.companyId) === String(company.companyId) ? company : c))
            : [company, ...prev];
        });
      }
      return company;
    } catch (err) {
      console.warn(`Could not fetch company ${id} from API:`, err.message);
      return null;
    }
  }, []);

  /**
   * Registers a new company.
   * Calls POST /api/companies, falling back gracefully to local state if offline.
   */
  const addCompany = useCallback(async (newCompanyData) => {
    try {
      const created = await companyService.createCompany(newCompanyData);
      setCompanies((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      console.warn('Backend call failed, registering locally in state:', err.message);
      const nextNum = companies.length + 1;
      const generatedId = `COMP-${String(nextNum).padStart(3, '0')}`;
      const now = new Date().toISOString();

      const created = {
        ...newCompanyData,
        id: newCompanyData.id || generatedId,
        companyId: nextNum,
        companyCode: generatedId,
        createdAt: now,
        updatedAt: now,
      };

      setCompanies((prev) => [created, ...prev]);
      return created;
    }
  }, [companies]);

  /**
   * Updates an existing company.
   * Calls PUT /api/companies/{id}, falling back gracefully to local state if offline.
   */
  const updateCompany = useCallback(async (id, updatedFields) => {
    const now = new Date().toISOString();
    try {
      const updated = await companyService.updateCompany(id, updatedFields);
      setCompanies((prev) =>
        prev.map((c) => (String(c.id) === String(id) || String(c.companyId) === String(id) ? updated : c))
      );
      return updated;
    } catch (err) {
      console.warn('Backend call failed, updating locally in state:', err.message);
      let updatedRecord = null;
      setCompanies((prev) =>
        prev.map((item) => {
          if (String(item.id).toLowerCase() === String(id).toLowerCase() || String(item.companyId) === String(id)) {
            updatedRecord = {
              ...item,
              ...updatedFields,
              updatedAt: now,
            };
            return updatedRecord;
          }
          return item;
        })
      );
      return updatedRecord;
    }
  }, []);

  /**
   * Activates or deactivates a company via PATCH /api/companies/{id}/status.
   */
  const updateCompanyStatus = useCallback(async (id, isActive) => {
    try {
      const updated = await companyService.updateCompanyStatus(id, isActive);
      setCompanies((prev) =>
        prev.map((c) => (String(c.id) === String(id) || String(c.companyId) === String(id) ? updated : c))
      );
      return updated;
    } catch (err) {
      console.warn('Backend status toggle failed, toggling locally in state:', err.message);
      setCompanies((prev) =>
        prev.map((c) =>
          String(c.id) === String(id) || String(c.companyId) === String(id)
            ? { ...c, isActive: Boolean(isActive) }
            : c
        )
      );
      return null;
    }
  }, []);

  /**
   * Deletes a company permanently via DELETE /api/companies/{id}.
   */
  const deleteCompany = useCallback(async (id) => {
    try {
      await companyService.deleteCompany(id);
    } catch (err) {
      console.warn('Backend delete failed, removing locally from state:', err.message);
    }
    setCompanies((prev) =>
      prev.filter((c) => String(c.id).toLowerCase() !== String(id).toLowerCase() && String(c.companyId) !== String(id))
    );
  }, []);

  const resetToDefault = useCallback(() => {
    setCompanies([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      companies,
      lookups,
      loading,
      error,
      pagination,
      fetchCompanies,
      fetchCompanyById,
      fetchLookups,
      getCompanyById,
      addCompany,
      updateCompany,
      updateCompanyStatus,
      deleteCompany,
      resetToDefault,
    }),
    [
      companies,
      lookups,
      loading,
      error,
      pagination,
      fetchCompanies,
      fetchCompanyById,
      fetchLookups,
      getCompanyById,
      addCompany,
      updateCompany,
      updateCompanyStatus,
      deleteCompany,
      resetToDefault,
    ]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}
