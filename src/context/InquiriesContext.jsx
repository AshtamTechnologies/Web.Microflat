/**
 * InquiriesContext.jsx — Provides shared inquiry state across InquiriesPage, InquiryFormPage, and InquiryViewPage.
 *
 * Wrap the authenticated route subtree with <InquiriesProvider>.
 * Consume with useInquiriesContext().
 */

import { createContext, useContext } from 'react';
import { useInquiries } from '../pages/inquiries/useInquiries';
import { useUsersContext } from './UsersContext';

const InquiriesContext = createContext(null);

export function InquiriesProvider({ children }) {
  // Access users from UsersContext for assignee lists and resolving user names
  let allUsers = [];
  try {
    const userCtx = useUsersContext();
    allUsers = userCtx.allUsers || userCtx.users || [];
  } catch {
    allUsers = [];
  }

  const value = useInquiries(allUsers);
  return <InquiriesContext.Provider value={value}>{children}</InquiriesContext.Provider>;
}

export function useInquiriesContext() {
  const ctx = useContext(InquiriesContext);
  if (!ctx) throw new Error('useInquiriesContext must be used within <InquiriesProvider>');
  return ctx;
}
