/**
 * ClientsContext.jsx — Provides shared client state across ClientsPage, ClientFormPage, and ClientViewPage.
 *
 * Wrap the client routes with <ClientsProvider>.
 * Consume with useClientsContext().
 */

import { createContext, useContext } from 'react';
import { useClients } from '../pages/clients/useClients';

const ClientsContext = createContext(null);

export function ClientsProvider({ children }) {
  const value = useClients();
  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClientsContext() {
  const ctx = useContext(ClientsContext);
  if (!ctx) {
    throw new Error('useClientsContext must be used within <ClientsProvider>');
  }
  return ctx;
}
