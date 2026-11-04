/**
 * QuotationsContext.jsx — State management and actions for Quotation module.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_QUOTATIONS, calculateQuotationTotals } from '../mocks/quotations';

const QuotationsContext = createContext(null);
const STORAGE_KEY = 'microflat_quotations_data';

export function QuotationsProvider({ children }) {
  const [quotations, setQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load quotations from localStorage:', e);
    }
    return INITIAL_QUOTATIONS;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
    } catch (e) {
      console.error('Failed to save quotations to localStorage:', e);
    }
  }, [quotations]);

  const getQuotationById = useCallback(
    (id) => {
      if (!id) return null;
      return (
        quotations.find(
          (q) =>
            String(q.id).toLowerCase() === String(id).toLowerCase() ||
            String(q.quotationNo).toLowerCase() === String(id).toLowerCase()
        ) || null
      );
    },
    [quotations]
  );

  const getNextQuotationNo = useCallback(() => {
    const year = new Date().getFullYear();
    const count = quotations.length + 1;
    return `QT-${year}-${String(count).padStart(4, '0')}`;
  }, [quotations]);

  // Create new Quotation (Revision 0)
  const createQuotation = useCallback(
    (payload) => {
      const quotationNo = payload.quotationNo || getNextQuotationNo();
      const totals = calculateQuotationTotals(payload.items || [], payload.taxTreatment || 'INTRA_STATE');

      const rev0 = {
        revisionNo: 0,
        revisionDate: payload.revisionDate || new Date().toISOString().split('T')[0],
        revisionReason: payload.revisionReason || 'Initial quotation',
        status: payload.status || 'Draft',
        currency: payload.currency || 'INR',
        taxTreatment: payload.taxTreatment || 'INTRA_STATE',
        items: totals.calculatedItems,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
      };

      const newQuotation = {
        id: quotationNo,
        quotationNo,
        inquiryNo: payload.inquiryNo || '',
        inquiryId: payload.inquiryId || '',
        clientName: payload.clientName || '',
        clientId: payload.clientId || '',
        clientAddress: payload.clientAddress || '',
        contactPerson: payload.contactPerson || '',
        contactEmail: payload.contactEmail || '',
        contactPhone: payload.contactPhone || '',
        status: payload.status || 'Draft',
        poReceived: false,
        poDetails: null,
        confirmedOn: null,
        currentRevision: 0,
        currency: payload.currency || 'INR',
        validUntil: payload.validUntil || '',
        paymentTerms: payload.paymentTerms || 'Net 30',
        deliveryTerms: payload.deliveryTerms || '',
        taxTreatment: payload.taxTreatment || 'INTRA_STATE',
        termsAndConditions: payload.termsAndConditions || '',
        lastUpdatedBy: payload.lastUpdatedBy || 'Current User',
        lastUpdatedAt: new Date().toISOString(),
        revisions: [rev0],
        negotiations: [],
        documents: [],
        mailLogs: [],
      };

      setQuotations((prev) => [newQuotation, ...prev]);
      toast.success(payload.status === 'Sent' ? 'Quotation saved & marked as Sent' : 'Quotation created as Draft');
      return newQuotation;
    },
    [getNextQuotationNo]
  );

  // Create a new revision (Revision N+1)
  const createRevision = useCallback((quotationId, payload) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== quotationId && q.quotationNo !== quotationId) return q;

        const nextRevNo = q.revisions.length;
        const totals = calculateQuotationTotals(payload.items || [], payload.taxTreatment || q.taxTreatment);

        const newRevision = {
          revisionNo: nextRevNo,
          revisionDate: payload.revisionDate || new Date().toISOString().split('T')[0],
          revisionReason: payload.revisionReason || `Revision ${nextRevNo}`,
          status: payload.status || 'Draft',
          currency: payload.currency || q.currency,
          taxTreatment: payload.taxTreatment || q.taxTreatment,
          items: totals.calculatedItems,
          subtotal: totals.subtotal,
          totalTax: totals.totalTax,
          grandTotal: totals.grandTotal,
        };

        return {
          ...q,
          currentRevision: nextRevNo,
          status: payload.status || q.status,
          currency: payload.currency || q.currency,
          taxTreatment: payload.taxTreatment || q.taxTreatment,
          validUntil: payload.validUntil !== undefined ? payload.validUntil : q.validUntil,
          paymentTerms: payload.paymentTerms !== undefined ? payload.paymentTerms : q.paymentTerms,
          deliveryTerms: payload.deliveryTerms !== undefined ? payload.deliveryTerms : q.deliveryTerms,
          termsAndConditions: payload.termsAndConditions !== undefined ? payload.termsAndConditions : q.termsAndConditions,
          clientAddress: payload.clientAddress !== undefined ? payload.clientAddress : q.clientAddress,
          contactPerson: payload.contactPerson !== undefined ? payload.contactPerson : q.contactPerson,
          lastUpdatedBy: payload.lastUpdatedBy || 'Current User',
          lastUpdatedAt: new Date().toISOString(),
          revisions: [...q.revisions, newRevision],
        };
      })
    );
    toast.success('New revision created successfully');
  }, []);

  // Update Quotation Status
  const updateQuotationStatus = useCallback((quotationId, newStatus, confirmedOn = null) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== quotationId && q.quotationNo !== quotationId) return q;
        return {
          ...q,
          status: newStatus,
          confirmedOn: newStatus === 'Confirmed' ? (confirmedOn || new Date().toISOString().split('T')[0]) : q.confirmedOn,
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success(`Quotation status updated to ${newStatus}`);
  }, []);

  // Record Client PO
  const recordClientPO = useCallback((quotationId, poData) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== quotationId && q.quotationNo !== quotationId) return q;
        const newDoc = poData.fileName
          ? {
              id: `doc-po-${Date.now()}`,
              fileName: poData.fileName,
              documentType: 'Client PO',
              revisionNo: q.currentRevision,
              linkedStage: '—',
              uploadedAt: poData.receivedOn || new Date().toISOString().split('T')[0],
              fileSize: poData.fileSize || '350 KB',
            }
          : null;

        return {
          ...q,
          poReceived: true,
          poDetails: {
            poNumber: poData.poNumber || 'Client PO',
            receivedOn: poData.receivedOn || new Date().toISOString().split('T')[0],
            fileName: poData.fileName || 'Client-PO.pdf',
          },
          documents: newDoc ? [...q.documents, newDoc] : q.documents,
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Client Purchase Order recorded');
  }, []);

  // Add Negotiation Stage
  const addNegotiationStage = useCallback((quotationId, stageData) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== quotationId && q.quotationNo !== quotationId) return q;
        const nextStageNo = (q.negotiations || []).length + 1;
        const newStage = {
          stageNo: nextStageNo,
          dateTime: stageData.dateTime || new Date().toISOString().slice(0, 16),
          mode: stageData.mode || 'Call',
          handledBy: stageData.handledBy || 'Current User',
          clientContact: stageData.clientContact || q.contactPerson,
          ourOffer: Number(stageData.ourOffer) || 0,
          clientCounter: Number(stageData.clientCounter) || 0,
          revisionNo: stageData.revisionNo !== undefined ? Number(stageData.revisionNo) : q.currentRevision,
          discussion: stageData.discussion || '',
        };

        return {
          ...q,
          status: 'In Negotiation',
          negotiations: [...(q.negotiations || []), newStage],
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Negotiation stage recorded');
  }, []);

  // Upload Document
  const uploadDocument = useCallback((quotationId, docData) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== quotationId && q.quotationNo !== quotationId) return q;
        const newDoc = {
          id: `doc-${Date.now()}`,
          fileName: docData.fileName || 'Quotation_Attachment.pdf',
          documentType: docData.documentType || 'Quotation',
          revisionNo: docData.revisionNo !== undefined ? Number(docData.revisionNo) : q.currentRevision,
          linkedStage: docData.linkedStage || '—',
          uploadedAt: new Date().toISOString().split('T')[0],
          fileSize: docData.fileSize || '250 KB',
        };

        return {
          ...q,
          documents: [...(q.documents || []), newDoc],
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Document uploaded');
  }, []);

  // Send Mail Log
  const sendMailLog = useCallback((quotationId, mailData) => {
    setQuotations((prev) =>
      prev.map((q) => {
        if (q.id !== quotationId && q.quotationNo !== quotationId) return q;
        const now = new Date();
        const dateStr = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newLog = {
          id: `mail-${Date.now()}`,
          sentAt: dateStr,
          to: mailData.to || q.contactEmail,
          cc: mailData.cc || '',
          subject: mailData.subject || `Quotation ${q.quotationNo}`,
          revisionNo: mailData.revisionNo !== undefined ? Number(mailData.revisionNo) : q.currentRevision,
          result: 'Success',
          error: '',
        };

        return {
          ...q,
          mailLogs: [newLog, ...(q.mailLogs || [])],
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success(`Quotation email sent to ${mailData.to || 'client'}`);
  }, []);

  return (
    <QuotationsContext.Provider
      value={{
        quotations,
        getQuotationById,
        getNextQuotationNo,
        createQuotation,
        createRevision,
        updateQuotationStatus,
        recordClientPO,
        addNegotiationStage,
        uploadDocument,
        sendMailLog,
      }}
    >
      {children}
    </QuotationsContext.Provider>
  );
}

export function useQuotationsContext() {
  const ctx = useContext(QuotationsContext);
  if (!ctx) throw new Error('useQuotationsContext must be used within <QuotationsProvider>');
  return ctx;
}

