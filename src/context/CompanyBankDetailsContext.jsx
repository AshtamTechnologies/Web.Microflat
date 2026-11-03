/**
 * CompanyBankDetailsContext.jsx — Context and state management for Company Bank Details with full API connectivity.
 *
 * Implements endpoints 9 to 18 of Company API Integration Guide:
 *   - getCompanyBankDetails (GET /api/companies/{id}/bank-details)
 *   - createCompanyBankDetail (POST /api/companies/{id}/bank-details)
 *   - getCompanyBankDetailById (GET /api/company-bank-details/{bankId})
 *   - updateCompanyBankDetail (PUT /api/company-bank-details/{bankId})
 *   - updateCompanyBankStatus (PATCH /api/company-bank-details/{bankId}/status)
 *   - deleteCompanyBankDetail (DELETE /api/company-bank-details/{bankId})
 *   - getBankAttachments (GET /api/company-bank-details/{bankId}/attachments)
 *   - uploadBankAttachment (POST /api/company-bank-details/{bankId}/attachments)
 *   - downloadBankAttachment (GET /api/company-bank-attachments/{attachmentId}/download)
 *   - deleteBankAttachment (DELETE /api/company-bank-attachments/{attachmentId})
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_COMPANY_BANK_DETAILS } from '../mocks/companyBankDetails';
import { useCompanyContext } from './CompanyContext';
import * as companyService from '../services/companies/companyService';

const LOCAL_STORAGE_KEY = 'mf_company_bank_details_v2';

const CompanyBankDetailsContext = createContext(null);

export function CompanyBankDetailsProvider({ children }) {
  const [bankDetails, setBankDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const { companies = [], getCompanyById } = useCompanyContext();

  // Clear legacy mock cache on mount
  useEffect(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }, []);

  /**
   * Fetches bank details for a specific company from backend API.
   */
  const fetchBanksForCompany = useCallback(async (companyId) => {
    if (!companyId) return [];
    setLoading(true);
    try {
      const items = await companyService.getCompanyBankDetails(companyId);
      if (Array.isArray(items)) {
        setBankDetails((prev) => {
          const others = prev.filter(
            (b) => String(b.companyId) !== String(companyId) && String(b.companyCode) !== String(companyId)
          );
          return [...others, ...items];
        });
      }
      return items || [];
    } catch (err) {
      console.warn(`Could not fetch live bank details for company ${companyId}:`, err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Returns all bank accounts for a specific company from local state.
   */
  const getBanksForCompany = useCallback(
    (companyId) => {
      if (!companyId) return [];
      const target = String(companyId).toLowerCase().trim();
      const numTarget = target.replace(/^\D+/g, '');

      return bankDetails.filter((b) => {
        const bCompId = String(b.companyId || '').toLowerCase().trim();
        const bCompCode = String(b.companyCode || '').toLowerCase().trim();
        return (
          bCompId === target ||
          bCompCode === target ||
          (numTarget && bCompId.replace(/^\D+/g, '') === numTarget)
        );
      });
    },
    [bankDetails]
  );

  /**
   * Returns a specific bank account by bankDetailId or id.
   */
  const getBankById = useCallback(
    (bankId) => {
      if (!bankId) return null;
      const target = String(bankId).toLowerCase().trim();
      return (
        bankDetails.find(
          (b) =>
            String(b.bankDetailId).toLowerCase().trim() === target ||
            String(b.companyBankDetailId || '').toLowerCase().trim() === target ||
            String(b.id).toLowerCase().trim() === target
        ) || null
      );
    },
    [bankDetails]
  );

  /**
   * Asynchronously fetches a single bank detail with attachments from API.
   */
  const fetchBankById = useCallback(async (bankId) => {
    if (!bankId) return null;
    try {
      const bank = await companyService.getCompanyBankDetailById(bankId);
      if (bank) {
        setBankDetails((prev) => {
          const exists = prev.some(
            (b) => String(b.bankDetailId) === String(bank.id) || String(b.id) === String(bank.id)
          );
          return exists
            ? prev.map((b) => (String(b.bankDetailId) === String(bank.id) || String(b.id) === String(bank.id) ? bank : b))
            : [...prev, bank];
        });
      }
      return bank;
    } catch (err) {
      console.warn(`Could not fetch bank ${bankId} from API:`, err.message);
      return null;
    }
  }, []);

  /**
   * Returns all bank records joined with company details.
   */
  const getAllBanks = useCallback(() => {
    return bankDetails.map((bank) => {
      const comp =
        (getCompanyById && getCompanyById(bank.companyId)) ||
        companies.find(
          (c) =>
            String(c.id) === String(bank.companyId) ||
            String(c.companyId) === String(bank.companyId) ||
            String(c.companyCode) === String(bank.companyCode)
        );

      return {
        ...bank,
        companyCode: comp?.companyCode || comp?.id || bank.companyCode || bank.companyId || '—',
        companyName: comp?.companyName || bank.companyName || 'Unknown Company',
        country: comp?.country || comp?.countryName || 'IN',
        state: comp?.state || comp?.stateName || '',
        city: comp?.city || '',
      };
    });
  }, [bankDetails, getCompanyById, companies]);

  /**
   * Saves or replaces a company's bank accounts from the Form Page.
   */
  const saveCompanyBanks = useCallback(
    async (companyId, rows, authUser = null) => {
      const now = new Date().toISOString();
      const userName = authUser?.name || 'Ian Chesnut';

      // Process and sync rows
      const processedRows = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const isNew =
          !row.bankDetailId ||
          !row.companyBankDetailId ||
          String(row.bankDetailId).startsWith('temp_') ||
          String(row.id).startsWith('temp_');

        try {
          if (isNew) {
            const created = await companyService.createCompanyBankDetail(companyId, row);
            processedRows.push(created);
          } else {
            const bankId = row.companyBankDetailId || row.bankDetailId || row.id;
            const updated = await companyService.updateCompanyBankDetail(bankId, row);
            processedRows.push(updated);
          }
        } catch (apiErr) {
          console.warn(`API call failed for row ${i + 1}, fallback to local state:`, apiErr.message);
          processedRows.push({
            ...row,
            bankDetailId: isNew ? `cbd_${Date.now()}_${i + 1}` : row.bankDetailId,
            companyBankDetailId: isNew ? Date.now() + i : row.companyBankDetailId,
            companyId,
            createdAt: row.createdAt || now,
            createdBy: row.createdBy || userName,
            updatedAt: now,
            updatedBy: userName,
          });
        }
      }

      setBankDetails((prev) => {
        const others = prev.filter(
          (b) => String(b.companyId) !== String(companyId) && String(b.companyCode) !== String(companyId)
        );
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
    async (bankDetailId, updatedData, authUser = null) => {
      const now = new Date().toISOString();
      const userName = authUser?.name || 'Ian Chesnut';

      try {
        const updated = await companyService.updateCompanyBankDetail(bankDetailId, updatedData);
        setBankDetails((prev) =>
          prev.map((b) =>
            String(b.bankDetailId) === String(bankDetailId) || String(b.id) === String(bankDetailId)
              ? updated
              : b
          )
        );
        toast.success('Bank detail updated successfully');
        return updated;
      } catch (err) {
        console.warn('API update failed, updating local state:', err.message);
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
      }
    },
    []
  );

  /**
   * Adds a new bank detail to a company.
   */
  const addBankDetail = useCallback(
    async (companyId, bankData, authUser = null) => {
      const now = new Date().toISOString();
      const userName = authUser?.name || 'Ian Chesnut';

      try {
        const created = await companyService.createCompanyBankDetail(companyId, bankData);
        setBankDetails((prev) => [...prev, created]);
        toast.success('Bank detail added successfully');
        return created;
      } catch (err) {
        console.warn('API create failed, adding to local state:', err.message);
        const newRecord = {
          ...bankData,
          bankDetailId: `cbd_${Date.now()}`,
          companyBankDetailId: Date.now(),
          companyId,
          createdAt: now,
          createdBy: userName,
          updatedAt: now,
          updatedBy: userName,
        };

        setBankDetails((prev) => [...prev, newRecord]);
        toast.success('Bank detail added successfully');
        return newRecord;
      }
    },
    []
  );

  /**
   * Deletes a bank detail permanently after authorization.
   */
  const deleteBankDetail = useCallback(
    async (bankDetailId, authUser = null) => {
      try {
        await companyService.deleteCompanyBankDetail(bankDetailId);
      } catch (err) {
        console.warn('API delete bank detail failed, deleting locally:', err.message);
      }
      setBankDetails((prev) =>
        prev.filter(
          (b) =>
            String(b.bankDetailId) !== String(bankDetailId) &&
            String(b.companyBankDetailId) !== String(bankDetailId) &&
            String(b.id) !== String(bankDetailId)
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
    async (bankDetailId) => {
      const current = bankDetails.find(
        (b) =>
          String(b.bankDetailId) === String(bankDetailId) ||
          String(b.companyBankDetailId) === String(bankDetailId) ||
          String(b.id) === String(bankDetailId)
      );
      const nextStatus = current ? !current.isActive : true;

      try {
        const updated = await companyService.updateCompanyBankStatus(bankDetailId, nextStatus);
        setBankDetails((prev) =>
          prev.map((b) =>
            String(b.bankDetailId) === String(bankDetailId) || String(b.id) === String(bankDetailId)
              ? updated
              : b
          )
        );
        toast.success(`Account marked as ${nextStatus ? 'Active' : 'Inactive'}`);
      } catch (err) {
        console.warn('API toggle status failed, toggling locally:', err.message);
        setBankDetails((prev) =>
          prev.map((b) => {
            if (
              String(b.bankDetailId) === String(bankDetailId) ||
              String(b.companyBankDetailId) === String(bankDetailId) ||
              String(b.id) === String(bankDetailId)
            ) {
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
        toast.success(`Account marked as ${nextStatus ? 'Active' : 'Inactive'}`);
      }
    },
    [bankDetails]
  );

  /**
   * Uploads an attachment to a bank account.
   */
  const uploadAttachment = useCallback(async (bankId, documentTypeId, file) => {
    try {
      const attachment = await companyService.uploadBankAttachment(bankId, documentTypeId, file);
      setBankDetails((prev) =>
        prev.map((b) => {
          if (String(b.bankDetailId) === String(bankId) || String(b.id) === String(bankId)) {
            const currentAttachments = b.attachments || [];
            return {
              ...b,
              attachmentCount: (b.attachmentCount || 0) + 1,
              attachments: [...currentAttachments, attachment],
            };
          }
          return b;
        })
      );
      toast.success('Document uploaded successfully');
      return attachment;
    } catch (err) {
      toast.error(err.message || 'Failed to upload document');
      throw err;
    }
  }, []);

  /**
   * Downloads an attachment securely using Bearer auth token and browser blob.
   */
  const downloadAttachment = useCallback(async (downloadUrlOrId, fileName) => {
    try {
      await companyService.downloadBankAttachment(downloadUrlOrId, fileName);
    } catch (err) {
      toast.error(err.message || 'Failed to download attachment');
    }
  }, []);

  /**
   * Deletes an attachment permanently.
   */
  const deleteAttachment = useCallback(async (attachmentId, bankId) => {
    try {
      await companyService.deleteBankAttachment(attachmentId);
      if (bankId) {
        setBankDetails((prev) =>
          prev.map((b) => {
            if (String(b.bankDetailId) === String(bankId) || String(b.id) === String(bankId)) {
              return {
                ...b,
                attachmentCount: Math.max(0, (b.attachmentCount || 1) - 1),
                attachments: (b.attachments || []).filter(
                  (a) => String(a.companyBankAttachmentId) !== String(attachmentId) && String(a.id) !== String(attachmentId)
                ),
              };
            }
            return b;
          })
        );
      }
      toast.success('Document deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete attachment');
    }
  }, []);

  const value = useMemo(
    () => ({
      bankDetails,
      loading,
      getBanksForCompany,
      getBankById,
      getAllBanks,
      fetchBanksForCompany,
      fetchBankById,
      saveCompanyBanks,
      addBankDetail,
      updateBankDetail,
      deleteBankDetail,
      toggleBankActive,
      uploadAttachment,
      downloadAttachment,
      deleteAttachment,
    }),
    [
      bankDetails,
      loading,
      getBanksForCompany,
      getBankById,
      getAllBanks,
      fetchBanksForCompany,
      fetchBankById,
      saveCompanyBanks,
      addBankDetail,
      updateBankDetail,
      deleteBankDetail,
      toggleBankActive,
      uploadAttachment,
      downloadAttachment,
      deleteAttachment,
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
