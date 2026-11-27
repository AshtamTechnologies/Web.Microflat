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
import { quotationService } from '../services';

const QuotationsContext = createContext(null);

function sanitizeQuotation(q) {
  if (!q) return q;
  let qNo = q.quotationNo;
  if (qNo && typeof qNo === 'object') {
    qNo = qNo.documentNumber || qNo.nextNumber || qNo.seriesNumber || null;
  }
  let id = q.id;
  if (id && typeof id === 'object') {
    id = id.id ?? null;
  }
  if (typeof id === 'string' && /^\d+$/.test(id.trim())) id = Number(id.trim());
  if (!Number.isInteger(id)) id = null;

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
    id,
    quotationNo: String(qNo || id || ''),
    clientAddress: clientAddress !== undefined ? clientAddress : (q.clientAddress || ''),
    contactPerson: contactPerson !== undefined ? contactPerson : (q.contactPerson || ''),
  };
}

export function QuotationsProvider({ children }) {
  const [quotations, setQuotations] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [lookups, setLookups] = useState({
    statuses: [],
    negotiationModes: [],
    defaultCurrencyId: 1,
  });

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
   * Initial load of quotations from backend
   */
  useEffect(() => {
    refreshQuotations();
  }, [refreshQuotations]);

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
        if (!data.poReceived) {
          try {
            const poData = await quotationService.getQuotationPo(id);
            if (poData && (poData.poNumber || poData.id || poData.receivedOn || poData.poReceivedDate)) {
              data.poReceived = true;
              data.poDetails = {
                poNumber: poData.poNumber || 'Client PO',
                receivedOn: poData.receivedOn || poData.poReceivedDate || '',
                expectedDeliveryDate: poData.expectedDeliveryDate || '',
                remarks: poData.remarks || poData.poRemarks || '',
                fileName: poData.fileName || poData.poFileName || '',
                documentTypeName: poData.documentTypeName || 'Customer PO',
                ...poData,
              };
              data.status = 'PO Received';
              data.canRevise = false;
              data.isEditable = false;
            }
          } catch {
            // Silently ignore 404 when no PO has been recorded yet
          }
        }

        setQuotations((prev) => {
          const exists = prev.some((q) => String(q.id) === String(id) || String(q.quotationNo) === String(id));
          if (exists) {
            return prev.map((q) => (String(q.id) === String(id) || String(q.quotationNo) === String(id) ? { ...q, ...data } : q));
          }
          return [...prev, data];
        });
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
        toast.error(e?.detail || e?.message || 'Could not preview the quotation number.');
      }
      return '';
    },
    []
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
      const created = await quotationService.createQuotation(payload);
      let sanitized = sanitizeQuotation(created);
      if (sanitized.id) {
        try {
          const fullDetail = await quotationService.getQuotationById(sanitized.id);
          if (fullDetail) sanitized = sanitizeQuotation(fullDetail);
        } catch (e) {
          toast.error(e?.detail || e?.message || 'Quotation was created, but its details could not be loaded.');
        }
      }
      setQuotations((prev) => [sanitized, ...prev]);
      toast.success(payload.status === 'Sent' ? 'Quotation saved and sent' : 'Quotation created');
      return sanitized;
    },
    []
  );

  /**
   * Update Quotation latest revision (Draft only)
   */
  const updateQuotation = useCallback(
    async (id, payload) => {
      const updated = await quotationService.updateQuotation(id, payload);
      const sanitized = sanitizeQuotation(updated);
      setQuotations((prev) =>
        prev.map((q) => (String(q.id) === String(id) || String(q.quotationNo) === String(id) ? { ...q, ...sanitized } : q))
      );
      toast.success('Quotation updated successfully');
      return sanitized;
    },
    []
  );

  /**
   * Create a new revision (Revision N+1)
   */
  const createRevision = useCallback(async (quotationId, payload) => {
    const apiUpdated = await quotationService.createRevision(quotationId, payload);
    const sanitized = sanitizeQuotation(apiUpdated);
    setQuotations((prev) =>
      prev.map((q) => (String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId) ? { ...q, ...sanitized } : q))
    );
    toast.success('New revision created successfully');
    return sanitized;
  }, []);

  /**
   * Update Quotation Status
   */
  const updateQuotationStatus = useCallback(async (quotationId, newStatus, confirmedOn = null) => {
    const apiUpdated = await quotationService.updateQuotationStatus(quotationId, newStatus);
    let sanitized = sanitizeQuotation(apiUpdated);
    try {
      const refreshed = await fetchQuotationDetail(quotationId);
      if (refreshed) sanitized = sanitizeQuotation(refreshed);
    } catch {
      // ignore refresh errors
    }
    setQuotations((prev) =>
      prev.map((q) => (String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId) ? { ...q, ...sanitized } : q))
    );
    toast.success(`Quotation status updated to ${newStatus}`);
    return sanitized;
  }, [fetchQuotationDetail]);

  /**
   * Task 61: Record Customer Purchase Order (PO)
   * Sends multipart form-data to POST /api/quotations/{id}/po-received
   */
  const recordClientPO = useCallback(async (quotationId, poData) => {
    const apiUpdated = await quotationService.recordQuotationPo(quotationId, poData);
    let sanitized = sanitizeQuotation(apiUpdated);
    try {
      const refreshed = await quotationService.getQuotationById(quotationId);
      if (refreshed) sanitized = sanitizeQuotation(refreshed);
    } catch (e) {
      toast.error(e?.detail || e?.message || 'PO was recorded, but the quotation details could not be refreshed.');
    }
    setQuotations((prev) =>
      prev.map((q) => (String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId) ? { ...q, ...sanitized, poReceived: true } : q))
    );
    toast.success('Customer Purchase Order recorded successfully');
    return sanitized;
  }, []);

  /**
   * Add Negotiation Stage
   */
  const addNegotiationStage = useCallback(async (quotationId, stageData, revisionId) => {
    const qObj = quotations.find((q) => String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId));
    const resolvedRevId = revisionId || stageData?.revisionId || qObj?.latestRevisionId || (qObj?.revisions?.length ? qObj.revisions[qObj.revisions.length - 1]?.id : null);
    const numericRevisionId = Number(resolvedRevId);
    if (!Number.isInteger(numericRevisionId) || numericRevisionId <= 0) {
      throw new Error('Cannot add negotiation stage: A valid revision ID was not returned by the API.');
    }
    const apiStage = await quotationService.addNegotiationStage(numericRevisionId, {
      ...stageData,
      ourOfferAmount: stageData.ourOfferAmount ?? stageData.ourOffer ?? null,
      clientCounterAmount: stageData.clientCounterAmount ?? stageData.clientCounter ?? null,
    });
    await fetchQuotationDetail(quotationId);
    toast.success('Negotiation stage logged successfully');
    return apiStage;
  }, [quotations, fetchQuotationDetail]);

  /**
   * Update Negotiation Stage
   */
  const updateNegotiationStage = useCallback(async (quotationId, stageId, stageData) => {
    if (!Number.isInteger(Number(stageId))) throw new Error('A valid negotiation stage ID is required.');
    await quotationService.updateNegotiationStage(stageId, stageData);
    await fetchQuotationDetail(quotationId);
    toast.success('Negotiation stage updated successfully');
  }, [fetchQuotationDetail]);

  /**
   * Delete Negotiation Stage
   */
  const deleteNegotiationStage = useCallback(async (quotationId, stageId) => {
    if (!Number.isInteger(Number(stageId))) throw new Error('A valid negotiation stage ID is required.');
    await quotationService.deleteNegotiationStage(stageId);
    await fetchQuotationDetail(quotationId);
    toast.success('Negotiation stage removed successfully');
  }, [fetchQuotationDetail]);

  /**
   * Upload Document Attachment
   * POST /api/quotation-revisions/{revisionId}/documents
   */
  const uploadDocument = useCallback(async (quotationId, docData, revisionNo) => {
    if (!docData?.file) throw new Error('A file is required.');
    let qObj = quotations.find((q) => String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId));
    let resolvedRevId = qObj?.revisions?.find((r) => String(r.revisionNo) === String(revisionNo))?.id
      || qObj?.latestRevisionId
      || null;
    if (!Number.isInteger(resolvedRevId)) {
      const detail = await fetchQuotationDetail(quotationId);
      resolvedRevId = detail?.latestRevisionId
        || detail?.revisions?.find((r) => String(r.revisionNo) === String(revisionNo))?.id
        || null;
    }
    if (!Number.isInteger(resolvedRevId)) {
      throw new Error('Cannot upload document: the API did not return a valid revision ID.');
    }
    const formData = new FormData();
    if (docData.documentTypeId) formData.append('documentTypeId', String(Number(docData.documentTypeId)));
    formData.append('file', docData.file);
    if (docData.remarks) formData.append('remarks', docData.remarks);
    await quotationService.uploadQuotationDocument(resolvedRevId, formData);
    await fetchQuotationDetail(quotationId);
    toast.success('Document uploaded');
  }, [quotations, fetchQuotationDetail]);

  /**
   * Send Mail Log
   */
  const sendMailLog = useCallback(async (quotationId, mailData) => {
    let qObj = quotations.find((q) => String(q.id) === String(quotationId) || String(q.quotationNo) === String(quotationId));
    let revisionId = qObj?.latestRevisionId || (qObj?.revisions?.length ? qObj.revisions[qObj.revisions.length - 1]?.id : null);
    if (!Number.isInteger(revisionId)) {
      const detail = await fetchQuotationDetail(quotationId);
      revisionId = detail?.latestRevisionId
        || detail?.revisions?.find((r) => String(r.revisionNo) === String(mailData.revisionNo))?.id
        || null;
    }
    if (!Number.isInteger(revisionId)) {
      throw new Error('Cannot send email: the API did not return a valid revision ID.');
    }
    const result = await quotationService.sendQuotationEmail(revisionId, mailData);
    if (result?.isSuccess === false) {
      throw new Error(result.errorMessage || 'The mail provider rejected the quotation email.');
    }
    await fetchQuotationDetail(quotationId);
    toast.success(`Quotation email sent`);
    return result;
  }, [quotations, fetchQuotationDetail]);

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
