/**
 * VendorsContext — provides shared vendor state across VendorsPage, VendorFormPage, and VendorViewPage.
 *
 * Wrap the /vendors route subtree with <VendorsProvider>.
 * Consume with useVendorsContext().
 */

import { createContext, useContext } from 'react';
import { useVendors } from '../pages/vendors/useVendors';

const VendorsContext = createContext(null);

export function VendorsProvider({ children }) {
  const value = useVendors();
  return <VendorsContext.Provider value={value}>{children}</VendorsContext.Provider>;
}

export function useVendorsContext() {
  const ctx = useContext(VendorsContext);
  if (!ctx) throw new Error('useVendorsContext must be used within <VendorsProvider>');
  return ctx;
}
