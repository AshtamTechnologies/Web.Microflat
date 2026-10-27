/**
 * src/context/PaymentTermsContext.jsx — Payment Terms context wired to backend APIs.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { paymentTermService } from '../services';

const PaymentTermsContext = createContext(null);

export function PaymentTermsProvider({ children }) {
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});

  /**
   * Fetches payment terms from GET /api/payment-terms with optional query parameters.
   * Query supports: { search: string, isActive: boolean|string }
   */
  const fetchPaymentTerms = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await paymentTermService.listPaymentTerms(filters);
      setPaymentTerms(Array.isArray(data) ? data : []);
      setLastFilters(filters);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load payment terms.';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPaymentTerms();
  }, [fetchPaymentTerms]);

  /**
   * Synchronous helper to find a payment term in current local state.
   */
  const getPaymentTermById = useCallback(
    (id) => {
      return (
        paymentTerms.find(
          (pt) => String(pt.id) === String(id) || String(pt.paymentTermId) === String(id)
        ) || null
      );
    },
    [paymentTerms]
  );

  /**
   * Fetches fresh single payment term from GET /api/payment-terms/{id}.
   * Used for View modal and Edit modal initialization.
   */
  const fetchPaymentTermById = useCallback(async (id) => {
    try {
      const data = await paymentTermService.getPaymentTerm(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch payment term details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  /**
   * Creates a new payment term via POST /api/payment-terms.
   */
  const addPaymentTerm = useCallback(
    async (formData) => {
      try {
        const created = await paymentTermService.createPaymentTerm(formData);
        toast.success('Payment term added successfully');
        await fetchPaymentTerms(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create payment term.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchPaymentTerms, lastFilters]
  );

  /**
   * Updates an existing payment term via PUT /api/payment-terms/{id}.
   */
  const updatePaymentTerm = useCallback(
    async (id, formData) => {
      try {
        const updated = await paymentTermService.updatePaymentTerm(id, formData);
        toast.success('Payment term updated successfully');
        await fetchPaymentTerms(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update payment term.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchPaymentTerms, lastFilters]
  );

  /**
   * Updates payment term active status via PATCH /api/payment-terms/{id}/status.
   */
  const updatePaymentTermStatus = useCallback(
    async (id, isActive) => {
      const nextActive = Boolean(isActive);

      // Optimistic state update
      setPaymentTerms((prev) =>
        prev.map((pt) => {
          if (String(pt.id) === String(id) || String(pt.paymentTermId) === String(id)) {
            return { ...pt, isActive: nextActive };
          }
          return pt;
        })
      );

      try {
        await paymentTermService.updatePaymentTermStatus(id, nextActive);
        toast.success(nextActive ? 'Payment term activated' : 'Payment term deactivated');
      } catch (err) {
        // Rollback on failure
        setPaymentTerms((prev) =>
          prev.map((pt) => {
            if (String(pt.id) === String(id) || String(pt.paymentTermId) === String(id)) {
              return { ...pt, isActive: !nextActive };
            }
            return pt;
          })
        );
        const msg = err.message || 'Failed to update payment term status.';
        toast.error(msg);
        throw err;
      }
    },
    []
  );

  /**
   * Toggles payment term active status (backwards-compatibility helper).
   */
  const togglePaymentTermActive = useCallback(
    async (id) => {
      const term = getPaymentTermById(id);
      if (!term) return;
      return updatePaymentTermStatus(id, !term.isActive);
    },
    [getPaymentTermById, updatePaymentTermStatus]
  );

  /**
   * Local delete helper for backwards compatibility.
   */
  const deletePaymentTerm = useCallback((id) => {
    setPaymentTerms((prev) =>
      prev.filter((pt) => String(pt.id) !== String(id) && String(pt.paymentTermId) !== String(id))
    );
    toast.success('Payment term deleted');
  }, []);

  /**
   * Formats payment terms as selector options for forms / dropdowns across the system.
   */
  const getPaymentTermOptions = useCallback(
    ({ activeOnly = true, currentSelectedId = null } = {}) => {
      return paymentTerms
        .filter((pt) => {
          if (
            currentSelectedId &&
            (String(pt.id) === String(currentSelectedId) ||
              String(pt.paymentTermId) === String(currentSelectedId))
          ) {
            return true;
          }
          return activeOnly ? Boolean(pt.isActive) : true;
        })
        .map((pt) => ({
          value: pt.id,
          label: pt.termName ? `${pt.termCode} - ${pt.termName}` : pt.termCode,
          termCode: pt.termCode,
          termName: pt.termName,
          isActive: pt.isActive,
        }));
    },
    [paymentTerms]
  );

  return (
    <PaymentTermsContext.Provider
      value={{
        paymentTerms,
        isLoading,
        error,
        fetchPaymentTerms,
        fetchPaymentTermById,
        getPaymentTermById,
        addPaymentTerm,
        updatePaymentTerm,
        updatePaymentTermStatus,
        togglePaymentTermActive,
        deletePaymentTerm,
        getPaymentTermOptions,
      }}
    >
      {children}
    </PaymentTermsContext.Provider>
  );
}

export function usePaymentTermsContext() {
  const context = useContext(PaymentTermsContext);
  if (!context) {
    throw new Error('usePaymentTermsContext must be used within a PaymentTermsProvider');
  }
  return context;
}

export const usePaymentTerms = usePaymentTermsContext;
export default PaymentTermsContext;
