/**
 * CompanyBankDetailsContext.jsx — Context and state management for Company Bank Details.
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_COMPANY_BANK_DETAILS } from '../mocks/companyBankDetails';
import { useCompanyContext } from './CompanyContext';

const LOCAL_STORAGE_KEY = 'mf_company_bank_details_v2';

const CompanyBankDetailsContext = createContext(null);

export function CompanyBankDetailsProvider({ children }) {
  const [bankDetails, setBankDetails] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b) => ({
            ...b,
            companyId: 'COMP-001',
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored company bank details:', e);
    }
    return INITIAL_COMPANY_BANK_DETAILS;
  });

  const { companies = [], getCompanyById } = useCompanyContext();

  // Sync state changes with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bankDetails));
    } catch (e) {
      console.warn('Failed to save company bank details to localStorage:', e);
    }
  }, [bankDetails]);

  /**
   * Returns all bank accounts for a specific company.
   */
  const getBanksForCompany = useCallback(
    (companyId) => {
      if (!companyId) return [];
      return bankDetails.filter((b) => String(b.companyId) === String(companyId));
    },
    [bankDetails]
  );

  /**
   * Returns a specific bank account by bankDetailId or id.
   */
  const getBankById = useCallback(
    (bankId) => {
      if (!bankId) return null;
      return (
        bankDetails.find(
          (b) => String(b.bankDetailId) === String(bankId) || String(b.id) === String(bankId)
        ) || null
      );
    },
    [bankDetails]
  );

  /**
   * Returns all bank records joined with company details (companyName, city, state, country).
   */
  const getAllBanks = useCallback(() => {
    return bankDetails.map((bank) => {
      const comp =
        (getCompanyById && getCompanyById(bank.companyId)) ||
        companies.find((c) => String(c.id) === String(bank.companyId));

      return {
        ...bank,
        companyCode: comp?.id || bank.companyId || '—',
        companyName: comp?.companyName || 'Unknown Company',
        country: comp?.country || 'IN',
        state: comp?.state || '',
        city: comp?.city || '',
      };
    });
  }, [bankDetails, getCompanyById, companies]);

  /**
   * Replaces/saves a company's bank accounts from the Form Page.
   */
  const saveCompanyBanks = useCallback(
    (companyId, rows, authUser = null) => {
      const now = new Date().toISOString();
      const userName = authUser?.name || 'Ian Chesnut';

      const processedRows = rows.map((row, index) => {
        const isNew =
          !row.bankDetailId ||
          String(row.bankDetailId).startsWith('temp_') ||
          String(row.id).startsWith('temp_');

        return {
          ...row,
          bankDetailId: isNew ? `cbd_${Date.now()}_${index + 1}` : row.bankDetailId,
          companyId,
          createdAt: row.createdAt || now,
          createdBy: row.createdBy || userName,
          updatedAt: now,
          updatedBy: userName,
        };
      });

      setBankDetails((prev) => {
        const others = prev.filter((b) => String(b.companyId) !== String(companyId));
        return [...others, ...processedRows];
      });

      toast.success('Company bank details saved successfully');
      return processedRows;
    },
    []
  );

  /**
   * Updates a single bank detail record.
   */
  const updateBankDetail = useCallback(
    (bankDetailId, updatedData, authUser = null) => {
      const now = new Date().toISOString();
      const userName = authUser?.name || 'Ian Chesnut';

      setBankDetails((prev) =>
        prev.map((b) => {
          if (String(b.bankDetailId) === String(bankDetailId) || String(b.id) === String(bankDetailId)) {
            return {
              ...b,
              ...updatedData,
              updatedAt: now,
              updatedBy: userName,
            };
          }
          return b;
        })
      );
      toast.success('Bank detail updated successfully');
    },
    []
  );

  /**
   * Adds a new bank detail to a company.
   */
  const addBankDetail = useCallback(
    (companyId, bankData, authUser = null) => {
      const now = new Date().toISOString();
      const userName = authUser?.name || 'Ian Chesnut';
      const newRecord = {
        ...bankData,
        bankDetailId: `cbd_${Date.now()}`,
        companyId,
        createdAt: now,
        createdBy: userName,
        updatedAt: now,
        updatedBy: userName,
      };

      setBankDetails((prev) => [...prev, newRecord]);
      toast.success('Bank detail added successfully');
      return newRecord;
    },
    []
  );

  /**
   * Deletes a bank detail permanently after authorization.
   */
  const deleteBankDetail = useCallback(
    (bankDetailId, authUser = null) => {
      setBankDetails((prev) =>
        prev.filter(
          (b) => String(b.bankDetailId) !== String(bankDetailId) && String(b.id) !== String(bankDetailId)
        )
      );
      toast.success('Bank account removed successfully');
    },
    []
  );

  /**
   * Toggles the active status of a bank account.
   */
  const toggleBankActive = useCallback(
    (bankDetailId) => {
      setBankDetails((prev) =>
        prev.map((b) => {
          if (String(b.bankDetailId) === String(bankDetailId) || String(b.id) === String(bankDetailId)) {
            const nextStatus = !b.isActive;
            toast.success(`Account marked as ${nextStatus ? 'Active' : 'Inactive'}`);
            return {
              ...b,
              isActive: nextStatus,
              updatedAt: new Date().toISOString(),
              updatedBy: 'Admin',
            };
          }
          return b;
        })
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      bankDetails,
      getBanksForCompany,
      getBankById,
      getAllBanks,
      saveCompanyBanks,
      addBankDetail,
      updateBankDetail,
      deleteBankDetail,
      toggleBankActive,
    }),
    [
      bankDetails,
      getBanksForCompany,
      getBankById,
      getAllBanks,
      saveCompanyBanks,
      addBankDetail,
      updateBankDetail,
      deleteBankDetail,
      toggleBankActive,
    ]
  );

  return (
    <CompanyBankDetailsContext.Provider value={value}>
      {children}
    </CompanyBankDetailsContext.Provider>
  );
}

export function useCompanyBankDetails() {
  const ctx = useContext(CompanyBankDetailsContext);
  if (!ctx) {
    throw new Error('useCompanyBankDetails must be used within a CompanyBankDetailsProvider');
  }
  return ctx;
}
