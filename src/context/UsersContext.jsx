/**
 * UsersContext — provides shared user state across UsersPage and UserFormPage.
 *
 * Wrap the /users route subtree with <UsersProvider>.
 * Consume with useUsersContext().
 */

import { createContext, useContext } from 'react';
import { useUsers } from '../pages/users/useUsers';

const UsersContext = createContext(null);

export function UsersProvider({ children }) {
  const value = useUsers();
  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsersContext() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsersContext must be used within <UsersProvider>');
  return ctx;
}
