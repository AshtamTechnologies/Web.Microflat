/**
 * PurchaseRequisitionContext — provides shared Purchase Requisition state across List, Create, View, and Edit routes.
 *
 * Wrap the routes with <PurchaseRequisitionProvider>.
 * Consume with usePurchaseRequisitionContext().
 */

import { createContext, useContext } from 'react';
import { usePurchaseRequisitions } from '../pages/PurchaseRequisition/usePurchaseRequisitions';

const PurchaseRequisitionContext = createContext(null);

export function PurchaseRequisitionProvider({ children }) {
  const value = usePurchaseRequisitions();
  return (
    <PurchaseRequisitionContext.Provider value={value}>
      {children}
    </PurchaseRequisitionContext.Provider>
  );
}

export function usePurchaseRequisitionContext() {
  const ctx = useContext(PurchaseRequisitionContext);
  if (!ctx) {
    throw new Error(
      'usePurchaseRequisitionContext must be used within <PurchaseRequisitionProvider>'
    );
  }
  return ctx;
}
