/**
 * src/context/CompanyContext.jsx — Client-side Mock State & CRUD for Company Registration.
 * Persists to localStorage to ensure interactive state persists without requiring a live backend.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_COMPANIES } from '../mocks/companies';

const STORAGE_KEY = 'mf_company_registrations_v2';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 1);
        }
      }
    } catch (e) {
      console.warn('Failed to parse companies from localStorage:', e);
    }
    return INITIAL_COMPANIES;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    } catch (e) {
      console.warn('Failed to save companies to localStorage:', e);
    }
  }, [companies]);

  const getCompanyById = (id) => {
    if (!id) return null;
    return companies.find((c) => String(c.id).toLowerCase() === String(id).toLowerCase()) || null;
  };

  const addCompany = (newCompanyData) => {
    const nextNum = companies.length + 1;
    const generatedId = `COMP-${String(nextNum).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const created = {
      ...newCompanyData,
      id: newCompanyData.id || generatedId,
      createdAt: now,
      updatedAt: now,
    };

    setCompanies((prev) => [created, ...prev]);
    return created;
  };

  const updateCompany = (id, updatedFields) => {
    const now = new Date().toISOString();
    let updatedRecord = null;

    setCompanies((prev) =>
      prev.map((item) => {
        if (String(item.id).toLowerCase() === String(id).toLowerCase()) {
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
  };

  const deleteCompany = (id) => {
    setCompanies((prev) => prev.filter((c) => String(c.id).toLowerCase() !== String(id).toLowerCase()));
  };

  const resetToDefault = () => {
    setCompanies(INITIAL_COMPANIES);
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        getCompanyById,
        addCompany,
        updateCompany,
        deleteCompany,
        resetToDefault,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}
