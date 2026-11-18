/**
 * src/context/DealsContext.jsx — Context provider for the Deals Module.
 */

import { createContext, useContext } from 'react';
import { useDeals } from '../pages/deals/useDeals';

const DealsContext = createContext(null);

export function DealsProvider({ children }) {
  const value = useDeals();
  return <DealsContext.Provider value={value}>{children}</DealsContext.Provider>;
}

export function useDealsContext() {
  const ctx = useContext(DealsContext);
  if (!ctx) {
    throw new Error('useDealsContext must be used within <DealsProvider>');
  }
  return ctx;
}
