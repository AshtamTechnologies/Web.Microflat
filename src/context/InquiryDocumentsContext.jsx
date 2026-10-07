/**
 * InquiryDocumentsContext.jsx — Provides shared inquiry documents state across Inquiry pages & modals.
 */

import { createContext, useContext } from 'react';
import { useInquiryDocuments } from '../pages/inquiries/useInquiryDocuments';

const InquiryDocumentsContext = createContext(null);

export function InquiryDocumentsProvider({ children }) {
  const value = useInquiryDocuments();
  return (
    <InquiryDocumentsContext.Provider value={value}>
      {children}
    </InquiryDocumentsContext.Provider>
  );
}

export function useInquiryDocumentsContext() {
  const ctx = useContext(InquiryDocumentsContext);
  if (!ctx) {
    throw new Error(
      'useInquiryDocumentsContext must be used within an <InquiryDocumentsProvider>'
    );
  }
  return ctx;
}
