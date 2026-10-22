/**
 * VendorBankDetailsContext.jsx — Context and state management for Vendor Bank Details.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_VENDOR_BANK_DETAILS } from '../mocks/vendorBankDetails';
import { useVendorsContext } from './VendorsContext';
import { vendorService } from '../services';

const VendorBankDetailsContext = createContext(null);

export function VendorBankDetailsProvider({ children }) {
  const [bankDetails, setBankDetails] = useState(INITIAL_VENDOR_BANK_DETAILS);
  const { allVendors = [], getVendorById } = useVendorsContext();

  /**
   * Returns all bank accounts for a specific vendor, trying API first with fallback.
   */
  const getBanksForVendor = useCallback(
    async (vendorId) => {
      if (!vendorId) return [];
      try {
        const remoteBanks = await vendorService.getVendorBankDetails(vendorId);
        if (Array.isArray(remoteBanks) && remoteBanks.length > 0) {
          setBankDetails((prev) => {
            const others = prev.filter((b) => String(b.vendorId) !== String(vendorId));
            return [...others, ...remoteBanks];
          });
          return remoteBanks;
        }
      } catch (err) {
        console.warn('Could not fetch bank details from API, using cached state:', err);
      }
      return bankDetails.filter((b) => String(b.vendorId) === String(vendorId));
    },
    [bankDetails]
  );

  /**
   * Returns all bank records joined with vendor details (vendorCode, vendorName, countryId).
   */
  const getAllBanks = useCallback(() => {
    return bankDetails.map((bank) => {
      const vendor =
        (getVendorById && getVendorById(bank.vendorId)) ||
        allVendors.find((v) => String(v.id) === String(bank.vendorId) || String(v.vendorId) === String(bank.vendorId));

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
   * Replaces/saves a vendor's bank accounts.
   */
  const saveVendorBanks = useCallback(
    async (vendorId, rows) => {
      const now = new Date().toISOString();
      const adminName = 'Current User';

      const processedRows = [];

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const isNew =
          !row.bankDetailId ||
          String(row.bankDetailId).startsWith('temp_') ||
          String(row.id).startsWith('temp_');

        if (isNew) {
          try {
            // Call real POST /api/vendors/{id}/bank-details
            const created = await vendorService.createVendorBankDetail(vendorId, row);
            if (created) {
              // Upload any pending file attachments if present
              if (Array.isArray(row.attachments)) {
                for (const att of row.attachments) {
                  if (att.file instanceof File) {
                    try {
                      await vendorService.uploadBankDetailAttachment(created.id, {
                        documentTypeId: att.documentTypeId || 5,
                        documentName: att.documentName || att.name,
                        file: att.file,
                      });
                    } catch (attErr) {
                      console.warn('Attachment upload failed:', attErr);
                    }
                  }
                }
              }
              processedRows.push(created);
              continue;
            }
          } catch (err) {
            console.warn('API createVendorBankDetail failed, saving locally:', err);
          }

          const newId = `bd_${Date.now()}_${index}`;
          processedRows.push({
            bankDetailId: newId,
            id: newId,
            vendorId,
            accountHolderName: (row.accountHolderName || '').trim(),
            bankName: (row.bankName || '').trim(),
            branchName: (row.branchName || '').trim(),
            accountNumber: String(row.accountNumber || '').trim(),
            ifscCode: (row.ifscCode || '').trim().toUpperCase(),
            micrCode: (row.micrCode || '').trim(),
            iban: (row.iban || '').trim().toUpperCase(),
            swiftCode: (row.swiftCode || '').trim().toUpperCase(),
            accountType: row.accountType || 'Current',
            branchAddress: (row.branchAddress || '').trim(),
            remarks: (row.remarks || '').trim(),
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
            attachments: Array.isArray(row.attachments) ? [...row.attachments] : [],
            createdAt: now,
            createdBy: adminName,
            updatedAt: null,
            updatedBy: null,
          });
        } else {
          const bankId = row.bankDetailId || row.id;
          try {
            // Call real PUT /api/vendor-bank-details/{id}
            await vendorService.updateBankDetail(bankId, row);
          } catch (err) {
            console.warn('API updateBankDetail failed, updating locally:', err);
          }

          processedRows.push({
            ...row,
            bankDetailId: bankId,
            id: bankId,
            vendorId,
            accountHolderName: (row.accountHolderName || '').trim(),
            bankName: (row.bankName || '').trim(),
            branchName: (row.branchName || '').trim(),
            accountNumber: String(row.accountNumber || '').trim(),
            ifscCode: (row.ifscCode || '').trim().toUpperCase(),
            micrCode: (row.micrCode || '').trim(),
            iban: (row.iban || '').trim().toUpperCase(),
            swiftCode: (row.swiftCode || '').trim().toUpperCase(),
            accountType: row.accountType || 'Current',
            branchAddress: (row.branchAddress || '').trim(),
            remarks: (row.remarks || '').trim(),
            isActive: row.isActive !== undefined ? Boolean(row.isActive) : true,
            attachments: Array.isArray(row.attachments) ? [...row.attachments] : [],
            createdAt: row.createdAt || now,
            createdBy: row.createdBy || adminName,
            updatedAt: now,
            updatedBy: adminName,
          });
        }
      }

      setBankDetails((prev) => {
        const otherVendorsAccounts = prev.filter((b) => String(b.vendorId) !== String(vendorId));
        return [...otherVendorsAccounts, ...processedRows];
      });

      return { ok: true, count: processedRows.length };
    },
    []
  );

  /**
   * Deletes a single bank account directly by ID.
   */
  const deleteBankDetail = useCallback((bankDetailId) => {
    setBankDetails((prev) =>
      prev.filter(
        (b) => String(b.bankDetailId) !== String(bankDetailId) && String(b.id) !== String(bankDetailId)
      )
    );
    toast.success('Bank account deleted successfully.');
  }, []);

  /**
   * Toggles active status of a single bank account directly (from List page).
   */
  const toggleBankActive = useCallback(async (bankDetailId) => {
    let nextStatus = null;
    let bankNameStr = '';

    setBankDetails((prev) =>
      prev.map((item) => {
        const match = String(item.bankDetailId) === String(bankDetailId) || String(item.id) === String(bankDetailId);
        if (!match) return item;

        nextStatus = !item.isActive;
        bankNameStr = item.bankName || 'Bank account';
        return {
          ...item,
          isActive: nextStatus,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Current User',
        };
      })
    );

    if (nextStatus !== null) {
      try {
        await vendorService.updateBankDetailStatus(bankDetailId, nextStatus);
      } catch (err) {
        console.warn('API updateBankDetailStatus failed, local status changed:', err);
      }
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
      deleteBankDetail,
      toggleBankActive,
    }),
    [bankDetails, getBanksForVendor, getAllBanks, saveVendorBanks, deleteBankDetail, toggleBankActive]
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
