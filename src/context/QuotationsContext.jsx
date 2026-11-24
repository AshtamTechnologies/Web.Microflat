/**
 * QuotationsContext.jsx — Enterprise State Management & API Integration for Quotations & Task 61.
 *
 * Aligned with Frontend-API-Guide.md §5.4f & §5.4g and Swagger OpenAPI specifications:
 *   - Initial quotation (Rev 0) linked to Inquiry & Client
 *   - Revisions (Rev N+1) tracking
 *   - Status transitions: Draft -> Sent -> In Negotiation -> Confirmed / PO Received
 *   - Task 61: Customer Purchase Order recording via multipart form-data (POST /api/quotations/{id}/po-received)
 *   - Negotiation logs, documents, and email tracking
 *   - Seamless hybrid operation: live backend API when online + resilient offline mock fallback
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_QUOTATIONS, calculateQuotationTotals } from '../mocks/quotations';
import { quotationService, isMockApi } from '../services';
import { quotationDocumentFromApi } from '../models/quotations/quotationModel';

const QuotationsContext = createContext(null);
const STORAGE_KEY = 'microflat_quotations_data';

function sanitizeQuotation(q) {
  if (!q) return q;
  let qNo = q.quotationNo;
  if (qNo && typeof qNo === 'object') {
    qNo = qNo.documentNumber || qNo.nextNumber || qNo.seriesNumber || (typeof q.id === 'string' ? q.id : 'QT-Auto');
  }
  let id = q.id;
  if (id && typeof id === 'object') {
    id = id.documentNumber || id.id || String(qNo || Date.now());
  }

  let clientAddress = q.clientAddress;
  if (clientAddress && typeof clientAddress === 'object') {
    const parts = [
      clientAddress.addressLabel || clientAddress.addressType,
      clientAddress.address1 || clientAddress.addressLine1 || clientAddress.address,
      clientAddress.address2 || clientAddress.addressLine2,
      clientAddress.city,
      clientAddress.stateName || clientAddress.state,
      clientAddress.zipCode || clientAddress.pincode,
    ].filter(Boolean);
    clientAddress = parts.join(', ');
  }

  let contactPerson = q.contactPerson;
  if (contactPerson && typeof contactPerson === 'object') {
    contactPerson = contactPerson.contactPerson || contactPerson.contactName || contactPerson.name || '';
  }

  return {
    ...q,
    id: String(id || qNo || ''),
    quotationNo: String(qNo || id || ''),
    clientAddress: clientAddress !== undefined ? clientAddress : (q.clientAddress || ''),
    contactPerson: contactPerson !== undefined ? contactPerson : (q.contactPerson || ''),
  };
}

function mapStagedDocuments(docs = [], revisionNo = 0, defaultStage = '—') {
  const today = new Date().toISOString().split('T')[0];
  return (docs || []).map((doc, idx) => ({
    id: doc.id || `doc-${Date.now()}-${idx}`,
    fileName: doc.fileName || 'Quotation_Attachment.pdf',
    documentType: doc.documentType || 'Quotation',
    revisionNo: doc.revisionNo !== undefined ? Number(doc.revisionNo) : revisionNo,
    linkedStage: doc.linkedStage || defaultStage,
    uploadedAt: doc.uploadedAt || today,
    fileSize: doc.fileSize || '250 KB',
    remarks: doc.remarks || '',
    downloadUrl: doc.downloadUrl || null,
  }));
}

export function QuotationsProvider({ children }) {
  const [quotations, setQuotations] = useState(() => {
    if (isMockApi) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map(sanitizeQuotation);
          }
        }
      } catch (e) {
        console.error('Failed to load quotations from localStorage:', e);
      }
      return INITIAL_QUOTATIONS.map(sanitizeQuotation);
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lookups, setLookups] = useState({
    statuses: [],
    negotiationModes: [],
    defaultCurrencyId: 1,
  });

  // Persist to localStorage only when in mock API mode
  useEffect(() => {
    if (!isMockApi) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
    } catch (e) {
      console.error('Failed to save quotations to localStorage:', e);
    }
  }, [quotations]);

  /**
   * Preload lookups from API
   */
  useEffect(() => {
    let isMounted = true;
    async function loadLookups() {
      try {
        const data = await quotationService.getQuotationLookups();
        if (isMounted && data) {
          setLookups(data);
        }
      } catch (err) {
        // Silently use defaults if offline
      }
    }
    loadLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Fetch/Refresh lookups on demand
   */
  const fetchLookups = useCallback(async () => {
    try {
      const data = await quotationService.getQuotationLookups();
      if (data) {
        setLookups(data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch quotation lookups:', err);
    }
    return null;
  }, []);

  /**
   * Refresh quotations list from backend API (or mock)
   */
  const refreshQuotations = useCallback(async (params = {}) => {
    if (isMockApi) {
      return quotations;
    }

    try {
      setIsLoading(true);
      const res = await quotationService.listQuotations(params);
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setQuotations(items.map(sanitizeQuotation));
      return items;
    } catch (err) {
      console.warn('Could not fetch live quotations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Find quotation by ID or quotation number from state
   */
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

  /**
   * Fetch full quotation detail directly from API
   */
  const fetchQuotationDetail = useCallback(async (id) => {
    if (!id) return null;
    try {
      const data = await quotationService.getQuotationById(id);
      if (data) {
        setQuotations((prev) =>
          prev.map((q) => (String(q.id) === String(id) || String(q.quotationNo) === String(id) ? { ...q, ...data } : q))
        );
        return data;
      }
    } catch (err) {
      console.warn('fetchQuotationDetail error:', err);
    }
    return null;
  }, []);

  /**
   * Get Next Quotation Number preview
   */
  const getNextQuotationNo = useCallback(
    async (date) => {
      try {
        const num = await quotationService.getNextQuotationNumber(date);
        if (typeof num === 'string' && num.trim()) return num.trim();
        if (num && typeof num === 'object' && num.documentNumber) {
          return String(num.documentNumber).trim();
        }
      } catch (e) {
        // Fallback to local generator
      }
      const year = new Date().getFullYear();
      const count = quotations.length + 1;
      return `QT-${year}-${String(count).padStart(4, '0')}`;
    },
    [quotations.length]
  );

  /**
   * Fetch prefill from inquiry
   */
  const fetchQuotationPrefill = useCallback(async (inquiryId) => {
    try {
      return await quotationService.getQuotationPrefill(inquiryId);
    } catch (err) {
      console.warn('Failed to fetch quotation prefill:', err);
      throw err;
    }
  }, []);

  /**
   * Create new Quotation (Revision 0)
   */
  const createQuotation = useCallback(
    async (payload) => {
      // 1. Live API create when not in mock mode
      if (!isMockApi) {
        const created = await quotationService.createQuotation(payload);
        const sanitized = sanitizeQuotation(created);
        setQuotations((prev) => [sanitized, ...prev]);
        toast.success(payload.status === 'Sent' ? 'Quotation saved & marked as Sent' : 'Quotation created as Draft');
        return sanitized;
      }

      // 2. Local fallback if in mock mode
      const quotationNo = payload.quotationNo || `QT-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(4, '0')}`;
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

      const created = {
        id: quotationNo,
        quotationNo,
        inquiryNo: payload.inquiryNo || '',
        inquiryId: payload.inquiryId || '',
        clientName: payload.clientName || '',
        clientId: payload.clientId || '',
        clientAddress: payload.clientAddress || '',
        clientAddressId: payload.clientAddressId || null,
        clientContactId: payload.clientContactId || null,
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
        paymentTermId: payload.paymentTermId || null,
        deliveryTerms: payload.deliveryTerms || '',
        taxTreatment: payload.taxTreatment || 'INTRA_STATE',
        termsAndConditions: payload.termsAndConditions || '',
        lastUpdatedBy: payload.lastUpdatedBy || 'Current User',
        lastUpdatedAt: new Date().toISOString(),
        revisions: [rev0],
        items: totals.calculatedItems,
        subtotal: totals.subtotal,
        totalTax: totals.totalTax,
        grandTotal: totals.grandTotal,
        negotiations: [],
        documents: mapStagedDocuments(payload.documents, 0),
        mailLogs: [],
      };

      setQuotations((prev) => [created, ...prev]);
      toast.success(payload.status === 'Sent' ? 'Quotation saved & marked as Sent' : 'Quotation created as Draft');
      return created;
    },
    [quotations.length]
  );

  /**
   * Update Quotation latest revision (Draft only)
   */
  const updateQuotation = useCallback(
    async (id, payload) => {
      if (!isMockApi) {
        const updated = await quotationService.updateQuotation(id, payload);
        const sanitized = sanitizeQuotation(updated);
        setQuotations((prev) =>
          prev.map((q) => (String(q.id) === String(id) || String(q.quotationNo) === String(id) ? { ...q, ...sanitized } : q))
        );
        toast.success('Quotation updated successfully');
        return sanitized;
      }

      setQuotations((prev) =>
        prev.map((q) => {
          if (String(q.id) !== String(id) && String(q.quotationNo) !== String(id)) return q;
          return { ...q, ...payload, lastUpdatedAt: new Date().toISOString() };
        })
      );

      toast.success('Quotation updated successfully');
      return payload;
    },
    []
  );

  /**
   * Create a new revision (Revision N+1)
   */
  const createRevision = useCallback(async (quotationId, payload) => {
    if (!isMockApi) {
      const apiUpdated = await quotationService.createRevision(quotationId, payload);
      const sanitized = sanitizeQuotation(apiUpdated);
      setQuotations((prev) =>
        prev.map((q) => (String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId) ? { ...q, ...sanitized } : q))
      );
      toast.success('New revision created successfully');
      return sanitized;
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;

        const nextRevNo = (q.revisions || []).length;
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

        const existingNegotiations = q.negotiations || [];
        let nextNegotiations = existingNegotiations;
        let defaultDocStage = '—';

        if (payload.newNegotiation) {
          const nextStageNo = existingNegotiations.length + 1;
          defaultDocStage = `Stage ${nextStageNo}`;
          const newStage = {
            stageNo: nextStageNo,
            dateTime: payload.newNegotiation.dateTime || new Date().toISOString().slice(0, 16),
            mode: payload.newNegotiation.mode || 'Call',
            handledBy: payload.newNegotiation.handledBy || 'Current User',
            clientContact: payload.newNegotiation.clientContact || payload.contactPerson || q.contactPerson,
            ourOffer: Number(payload.newNegotiation.ourOffer) || 0,
            clientCounter: Number(payload.newNegotiation.clientCounter) || 0,
            revisionNo: nextRevNo,
            discussion: payload.newNegotiation.discussion || '',
          };
          nextNegotiations = [...existingNegotiations, newStage];
        }

        const stagedDocs = mapStagedDocuments(payload.newDocuments, nextRevNo, defaultDocStage);

        return {
          ...q,
          currentRevision: nextRevNo,
          status: payload.status || 'Draft',
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
          revisions: [...(q.revisions || []), newRevision],
          items: totals.calculatedItems,
          subtotal: totals.subtotal,
          totalTax: totals.totalTax,
          grandTotal: totals.grandTotal,
          negotiations: nextNegotiations,
          documents: [...(q.documents || []), ...stagedDocs],
        };
      })
    );
    toast.success('New revision created successfully');
  }, []);

  /**
   * Update Quotation Status
   */
  const updateQuotationStatus = useCallback(async (quotationId, newStatus, confirmedOn = null) => {
    if (!isMockApi) {
      const apiUpdated = await quotationService.updateQuotationStatus(quotationId, newStatus);
      const sanitized = sanitizeQuotation(apiUpdated);
      setQuotations((prev) =>
        prev.map((q) => (String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId) ? { ...q, ...sanitized, status: newStatus } : q))
      );
      toast.success(`Quotation status updated to ${newStatus}`);
      return sanitized;
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;
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

  /**
   * Task 61: Record Customer Purchase Order (PO)
   * Sends multipart form-data to POST /api/quotations/{id}/po-received
   */
  const recordClientPO = useCallback(async (quotationId, poData) => {
    if (!isMockApi) {
      const apiUpdated = await quotationService.recordQuotationPo(quotationId, poData);
      const sanitized = sanitizeQuotation(apiUpdated);
      setQuotations((prev) =>
        prev.map((q) => (String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId) ? { ...q, ...sanitized, poReceived: true } : q))
      );
      toast.success('Client Purchase Order recorded successfully');
      return sanitized;
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;

        if (apiUpdated) {
          return {
            ...q,
            ...apiUpdated,
            status: apiUpdated.status || 'Confirmed',
            poReceived: true,
          };
        }

        const newDoc = poData.fileName
          ? {
              id: `doc-po-${Date.now()}`,
              documentTypeId: poData.documentTypeId || null,
              documentTypeName: poData.documentTypeName || 'PO Document',
              fileName: poData.fileName,
              documentType: poData.documentTypeName || 'Client PO',
              revisionNo: q.currentRevision,
              linkedStage: 'Customer PO',
              uploadedAt: poData.receivedOn || new Date().toISOString().split('T')[0],
              fileSize: poData.fileSize || '350 KB',
              file: poData.file || null,
            }
          : null;

        return {
          ...q,
          status: 'Confirmed',
          confirmedOn: poData.receivedOn || new Date().toISOString().split('T')[0],
          poReceived: true,
          poDetails: {
            poNumber: poData.poNumber || 'Client PO',
            receivedOn: poData.receivedOn || new Date().toISOString().split('T')[0],
            expectedDeliveryDate: poData.expectedDeliveryDate || null,
            documentTypeId: poData.documentTypeId || null,
            documentTypeName: poData.documentTypeName || 'PO Document',
            fileName: poData.fileName || 'Client-PO.pdf',
            fileSize: poData.fileSize || '350 KB',
            file: poData.file || null,
            remarks: poData.remarks || '',
          },
          documents: newDoc ? [...(q.documents || []), newDoc] : q.documents,
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Customer Purchase Order recorded successfully!');
  }, []);

  /**
   * Add Negotiation Stage
   */
  const addNegotiationStage = useCallback(async (quotationId, stageData, revisionId) => {
    let apiStage = null;
    const qObj = quotations.find((q) => String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId));
    const resolvedRevId = revisionId || stageData?.revisionId || qObj?.latestRevisionId || qObj?.revisions?.[0]?.id || quotationId;

    if (!isMockApi) {
      try {
        const mappedStageData = {
          ...stageData,
          ourOfferAmount: stageData.ourOfferAmount ?? stageData.ourOffer ?? null,
          clientCounterAmount: stageData.clientCounterAmount ?? stageData.clientCounter ?? null,
        };
        apiStage = await quotationService.addNegotiationStage(resolvedRevId, mappedStageData);
      } catch (err) {
        console.warn('Backend addNegotiationStage failed, using local fallback:', err);
      }
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;

        const stageCount = (q.negotiations || []).length + 1;
        const newStage = apiStage || {
          id: `neg-${Date.now()}`,
          stageId: `neg-${Date.now()}`,
          stageNo: stageCount,
          dateTime: stageData.dateTime || (stageData.date ? `${stageData.date} 12:00` : new Date().toISOString().slice(0, 16)),
          negotiationOn: stageData.negotiationOn || stageData.date || new Date().toISOString().slice(0, 10),
          date: stageData.negotiationOn || stageData.date || new Date().toISOString().slice(0, 10),
          mode: stageData.mode || 'Call',
          handledBy: stageData.handledByName || stageData.handledBy || 'Current User',
          handledByName: stageData.handledByName || stageData.handledBy || 'Current User',
          clientContact: stageData.contactName || stageData.clientContact || q.contactPerson,
          contactName: stageData.contactName || stageData.clientContact || q.contactPerson,
          ourOffer: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : (stageData.ourOffer ? Number(stageData.ourOffer) : 0),
          ourOfferAmount: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : (stageData.ourOffer ? Number(stageData.ourOffer) : 0),
          clientCounter: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : (stageData.clientCounter ? Number(stageData.clientCounter) : 0),
          clientCounterAmount: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : (stageData.clientCounter ? Number(stageData.clientCounter) : 0),
          revisionNo: q.currentRevision ?? 0,
          discussion: stageData.discussion || stageData.notes || '',
          notes: stageData.discussion || stageData.notes || '',
        };

        return {
          ...q,
          status: q.status === 'Sent' ? 'In Negotiation' : q.status,
          negotiations: [...(q.negotiations || []), newStage],
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Negotiation stage logged successfully');
    return apiStage;
  }, [quotations]);

  /**
   * Update Negotiation Stage
   */
  const updateNegotiationStage = useCallback(async (quotationId, stageId, stageData) => {
    let apiUpdated = null;
    if (!isMockApi) {
      try {
        apiUpdated = await quotationService.updateNegotiationStage(stageId, stageData);
      } catch (err) {
        console.warn('Backend updateNegotiationStage failed, using local update:', err);
      }
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;
        const updatedNegotiations = (q.negotiations || []).map((stg) => {
          if (String(stg.id) === String(stageId) || String(stg.stageId) === String(stageId)) {
            if (apiUpdated) return { ...stg, ...apiUpdated };
            return {
              ...stg,
              mode: stageData.mode || stg.mode,
              discussion: stageData.discussion || stageData.notes || stg.discussion,
              notes: stageData.discussion || stageData.notes || stg.notes,
              ourOfferAmount: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : (stageData.ourOffer ? Number(stageData.ourOffer) : stg.ourOfferAmount),
              ourOffer: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : (stageData.ourOffer ? Number(stageData.ourOffer) : stg.ourOffer),
              clientCounterAmount: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : (stageData.clientCounter ? Number(stageData.clientCounter) : stg.clientCounterAmount),
              clientCounter: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : (stageData.clientCounter ? Number(stageData.clientCounter) : stg.clientCounter),
              negotiationOn: stageData.negotiationOn || stageData.date || stg.negotiationOn,
              date: stageData.negotiationOn || stageData.date || stg.date,
              handledBy: stageData.handledByName || stageData.handledBy || stg.handledBy,
              handledByName: stageData.handledByName || stageData.handledBy || stg.handledByName,
              clientContact: stageData.contactName || stageData.clientContact || stg.clientContact,
              contactName: stageData.contactName || stageData.clientContact || stg.contactName,
            };
          }
          return stg;
        });

        return {
          ...q,
          negotiations: updatedNegotiations,
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Negotiation stage updated successfully');
  }, []);

  /**
   * Delete Negotiation Stage
   */
  const deleteNegotiationStage = useCallback(async (quotationId, stageId) => {
    if (!isMockApi) {
      try {
        await quotationService.deleteNegotiationStage(stageId);
      } catch (err) {
        console.warn('Backend deleteNegotiationStage failed, removing from local state:', err);
      }
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;
        const filteredNegotiations = (q.negotiations || []).filter(
          (stg) => String(stg.id) !== String(stageId) && String(stg.stageId) !== String(stageId)
        );

        return {
          ...q,
          negotiations: filteredNegotiations,
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Negotiation stage removed successfully');
  }, []);

  /**
   * Upload Document Attachment
   * POST /api/quotation-revisions/{revisionId}/documents
   */
  const uploadDocument = useCallback(async (quotationId, docData, revisionNo) => {
    let apiDoc = null;
    const qObj = quotations.find((q) => String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId));
    const resolvedRevId = revisionNo || qObj?.latestRevisionId || qObj?.revisions?.[0]?.id || quotationId;

    if (!isMockApi && docData?.file) {
      try {
        const formData = new FormData();
        if (docData.documentTypeId) {
          formData.append('documentTypeId', docData.documentTypeId);
        }
        formData.append('file', docData.file);
        if (docData.remarks) {
          formData.append('remarks', docData.remarks);
        }
        apiDoc = await quotationService.uploadQuotationDocument(resolvedRevId, formData);
      } catch (err) {
        console.warn('Backend uploadQuotationDocument failed, fallback to local state:', err);
      }
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;
        const newDoc = apiDoc ? quotationDocumentFromApi(apiDoc) : {
          id: `doc-${Date.now()}`,
          fileName: docData.fileName || docData.file?.name || 'Quotation_Attachment.pdf',
          documentTypeId: docData.documentTypeId || null,
          documentType: docData.documentType || docData.documentTypeName || 'Quotation',
          documentTypeName: docData.documentTypeName || docData.documentType || 'Quotation',
          revisionNo: revisionNo !== undefined ? Number(revisionNo) : (q.currentRevision ?? 0),
          linkedStage: docData.linkedStage || 'General',
          uploadedAt: new Date().toISOString().split('T')[0],
          fileSize: docData.fileSize || '250 KB',
          remarks: docData.remarks || '',
        };

        return {
          ...q,
          documents: [...(q.documents || []), newDoc],
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success('Document uploaded');
  }, [quotations]);

  /**
   * Send Mail Log
   */
  const sendMailLog = useCallback(async (quotationId, mailData) => {
    const qObj = quotations.find((q) => String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId));
    const revisionId = qObj?.latestRevisionId || quotationId;

    if (!isMockApi) {
      try {
        await quotationService.sendQuotationEmail(revisionId, mailData);
      } catch (err) {
        console.warn('Backend sendQuotationEmail failed, using local log:', err);
      }
    }

    setQuotations((prev) =>
      prev.map((q) => {
        if (String(q.id) !== String(quotationId) && String(q.quotationNo) !== String(quotationId)) return q;
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
          status: q.status === 'Draft' ? 'Sent' : q.status,
          mailLogs: [newLog, ...(q.mailLogs || [])],
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );
    toast.success(`Quotation email sent to ${mailData.to || 'client'}`);
  }, [quotations]);

  const submitForApproval = useCallback(async (quotationId) => {
    try {
      console.log(`[QUOTATIONS_CONTEXT] Submitting quotation ${quotationId} for approval...`);
      const res = await quotationService.submitQuotationForApproval(quotationId);
      console.log(`[QUOTATIONS_CONTEXT] Submit response:`, res);
      const appStatus = res?.approvalStatus;
      const statusText = appStatus === 2 ? 'Pending Approval' : appStatus === 6 ? 'Approval Not Required (Backend Rule)' : (appStatus || 'Submitted');
      toast.success(`Quotation submitted: Status is now "${statusText}". Request ID: ${res?.pendingApprovalRequestId || 'None'}`, { duration: 6000 });
      await fetchQuotationDetail(quotationId);
    } catch (err) {
      console.error(`[QUOTATIONS_CONTEXT] Submit failed:`, err);
      toast.error(err?.detail || err?.message || 'Failed to submit for approval.');
    }
  }, [fetchQuotationDetail]);

  return (
    <QuotationsContext.Provider
      value={{
        quotations,
        isLoading,
        lookups,
        fetchLookups,
        refreshQuotations,
        getQuotationById,
        fetchQuotationDetail,
        getNextQuotationNo,
        fetchQuotationPrefill,
        createQuotation,
        updateQuotation,
        createRevision,
        updateQuotationStatus,
        recordClientPO,
        addNegotiationStage,
        updateNegotiationStage,
        deleteNegotiationStage,
        uploadDocument,
        sendMailLog,
        submitForApproval,
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
