/**
 * VendorBankDetailsContext.jsx — Context and state management for Vendor Bank Details.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_VENDOR_BANK_DETAILS } from '../mocks/vendorBankDetails';
import { useVendorsContext } from './VendorsContext';

const VendorBankDetailsContext = createContext(null);

export function VendorBankDetailsProvider({ children }) {
  const [bankDetails, setBankDetails] = useState(INITIAL_VENDOR_BANK_DETAILS);
  const { allVendors = [], getVendorById } = useVendorsContext();

  /**
   * Returns all bank accounts for a specific vendor.
   */
  const getBanksForVendor = useCallback(
    (vendorId) => {
      if (!vendorId) return [];
      return bankDetails.filter((b) => b.vendorId === vendorId);
    },
    [bankDetails]
  );

  /**
   * Returns all bank records joined with vendor details (vendorCode, vendorName, countryId).
   */
  const getAllBanks = useCallback(() => {
    return bankDetails.map((bank) => {
      const vendor = (getVendorById && getVendorById(bank.vendorId)) ||
        allVendors.find((v) => v.id === bank.vendorId);

      return {
        ...bank,
        vendorCode: vendor?.vendorCode || '—',
        vendorName: vendor?.vendorName || 'Unknown Vendor',
        countryId: vendor?.countryId || 'IN',
        approvalStatus: vendor?.approvalStatus || 'Pending',
      };
    });
  }, [bankDetails, getVendorById, allVendors]);

  /**
   * Replaces a vendor's bank accounts with the draft rows.
   * Assigns IDs and audit fields to newly created rows.
   * Marks updatedAt and updatedBy on changed rows.
   */
  const saveVendorBanks = useCallback(
    async (vendorId, rows) => {
      // Mock network delay of ~700ms
      await new Promise((resolve) => setTimeout(resolve, 700));

      const now = new Date().toISOString();
      const adminName = 'Ian Chesnut';

      // Process rows for this vendor
      const processedRows = rows.map((row, index) => {
        const isNew = !row.bankDetailId || String(row.bankDetailId).startsWith('temp_') || String(row.id).startsWith('temp_');

        if (isNew) {
          const newId = `bd_${Date.now()}_${index}`;
          return {
            bankDetailId: newId,
            id: newId,
            vendorId,
            accountHolderName: (row.accountHolderName || '').trim(),
            bankName: (row.bankName || '').trim(),
            branchName: (row.branchName || '').trim(),
            accountNumber: String(row.accountNumber || '').trim(),
            ifscCode: (row.ifscCode || '').trim().toUpperCase(),
            swiftCode: (row.swiftCode || '').trim().toUpperCase(),
            accountType: row.accountType || 'Current',
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
            attachments: Array.isArray(row.attachments) ? [...row.attachments] : [],
            createdAt: now,
            createdBy: adminName,
            updatedAt: null,
            updatedBy: null,
          };
        } else {
          return {
            ...row,
            bankDetailId: row.bankDetailId || row.id,
            id: row.bankDetailId || row.id,
            vendorId,
            accountHolderName: (row.accountHolderName || '').trim(),
            bankName: (row.bankName || '').trim(),
            branchName: (row.branchName || '').trim(),
            accountNumber: String(row.accountNumber || '').trim(),
            ifscCode: (row.ifscCode || '').trim().toUpperCase(),
            swiftCode: (row.swiftCode || '').trim().toUpperCase(),
            accountType: row.accountType || 'Current',
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
            attachments: Array.isArray(row.attachments) ? [...row.attachments] : [],
            createdAt: row.createdAt || now,
            createdBy: row.createdBy || adminName,
            updatedAt: now,
            updatedBy: adminName,
          };
        }
      });

      setBankDetails((prev) => {
        // Keep accounts of other vendors, replace accounts for this vendorId
        const otherVendorsAccounts = prev.filter((b) => b.vendorId !== vendorId);
        return [...otherVendorsAccounts, ...processedRows];
      });

      return { ok: true, count: processedRows.length };
    },
    []
  );

  /**
   * Toggles active status of a single bank account directly (from List page).
   */
  const toggleBankActive = useCallback((bankDetailId) => {
    let nextStatus = null;
    let bankNameStr = '';

    setBankDetails((prev) =>
      prev.map((item) => {
        const match = item.bankDetailId === bankDetailId || item.id === bankDetailId;
        if (!match) return item;

        nextStatus = !item.isActive;
        bankNameStr = item.bankName || 'Bank account';
        return {
          ...item,
          isActive: nextStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Ian Chesnut',
        };
      })
    );

    if (nextStatus !== null) {
      toast.success(
        `${bankNameStr} marked as ${nextStatus ? 'Active' : 'Inactive'}`
      );
    }
  }, []);

  const value = useMemo(
    () => ({
      bankDetails,
      getBanksForVendor,
      getAllBanks,
      saveVendorBanks,
      toggleBankActive,
    }),
    [bankDetails, getBanksForVendor, getAllBanks, saveVendorBanks, toggleBankActive]
  );

  return (
    <VendorBankDetailsContext.Provider value={value}>
      {children}
    </VendorBankDetailsContext.Provider>
  );
}

export function useVendorBankDetails() {
  const context = useContext(VendorBankDetailsContext);
  if (!context) {
    throw new Error('useVendorBankDetails must be used within <VendorBankDetailsProvider>');
  }
  return context;
}
