import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_PAYMENT_TERMS } from '../mocks/paymentTerms';

const PaymentTermsContext = createContext(null);

export function PaymentTermsProvider({ children }) {
  const [paymentTerms, setPaymentTerms] = useState(INITIAL_PAYMENT_TERMS);

  const getPaymentTermById = useCallback(
    (id) => {
      return (
        paymentTerms.find(
          (pt) => pt.paymentTermId === id || pt.id === id
        ) || null
      );
    },
    [paymentTerms]
  );

  const addPaymentTerm = useCallback(async (data) => {
    // Simulated network delay
    await new Promise((r) => setTimeout(r, 500));

    const newId = `pt_${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const newTerm = {
      paymentTermId: newId,
      termCode: data.termCode.trim().toUpperCase(),
      termName: data.termName.trim(),
      dueDays: Number(data.dueDays) || 0,
      description: data.description ? data.description.trim() : '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdOn: today,
    };

    setPaymentTerms((prev) => [...prev, newTerm]);
    toast.success('Payment term added');
    return newTerm;
  }, []);

  const updatePaymentTerm = useCallback(async (id, data) => {
    // Simulated network delay
    await new Promise((r) => setTimeout(r, 500));

    setPaymentTerms((prev) =>
      prev.map((pt) => {
        if (pt.paymentTermId === id || pt.id === id) {
          return {
            ...pt,
            termCode: data.termCode ? data.termCode.trim().toUpperCase() : pt.termCode,
            termName: data.termName ? data.termName.trim() : pt.termName,
            dueDays: data.dueDays !== undefined ? (Number(data.dueDays) || 0) : pt.dueDays,
            description: data.description !== undefined ? data.description.trim() : pt.description,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : pt.isActive,
          };
        }
        return pt;
      })
    );
    toast.success('Payment term updated');
    return { ok: true };
  }, []);

  const deletePaymentTerm = useCallback((id) => {
    setPaymentTerms((prev) =>
      prev.filter((pt) => pt.paymentTermId !== id && pt.id !== id)
    );
    toast.success('Payment term deleted');
  }, []);

  const togglePaymentTermActive = useCallback((id) => {
    setPaymentTerms((prev) =>
      prev.map((pt) => {
        if (pt.paymentTermId === id || pt.id === id) {
          const nextState = !pt.isActive;
          toast.success(
            nextState ? 'Payment term activated' : 'Payment term deactivated'
          );
          return {
            ...pt,
            isActive: nextState,
          };
        }
        return pt;
      })
    );
  }, []);

  return (
    <PaymentTermsContext.Provider
      value={{
        paymentTerms,
        getPaymentTermById,
        addPaymentTerm,
        updatePaymentTerm,
        deletePaymentTerm,
        togglePaymentTermActive,
      }}
    >
      {children}
    </PaymentTermsContext.Provider>
  );
}

export function usePaymentTermsContext() {
  const context = useContext(PaymentTermsContext);
  if (!context) {
    throw new Error(
      'usePaymentTermsContext must be used within a PaymentTermsProvider'
    );
  }
  return context;
}

export const usePaymentTerms = usePaymentTermsContext;
export default PaymentTermsContext;
