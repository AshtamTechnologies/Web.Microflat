/**
 * src/services/quotations/quotationService.mock.js
 * Offline mock service for Quotations & Task 61 (Customer PO).
 * Follows identical contract as quotationService.js.
 */

import { INITIAL_QUOTATIONS, calculateQuotationTotals } from '../../mocks/quotations';

const STORAGE_KEY = 'microflat_quotations_data';

function getStoredQuotations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse mock quotations from localStorage:', e);
  }
  return INITIAL_QUOTATIONS;
}

function saveStoredQuotations(quotations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  } catch (e) {
    console.warn('Failed to save mock quotations to localStorage:', e);
  }
}

export async function listQuotations(params = {}) {
  const all = getStoredQuotations();
  let filtered = [...all];

  if (params.search?.trim()) {
    const s = params.search.toLowerCase().trim();
    filtered = filtered.filter(
      (q) =>
        q.quotationNo?.toLowerCase().includes(s) ||
        q.clientName?.toLowerCase().includes(s) ||
        q.inquiryNo?.toLowerCase().includes(s) ||
        q.poDetails?.poNumber?.toLowerCase().includes(s)
    );
  }

  if (params.status && params.status !== 'ALL') {
    filtered = filtered.filter((q) => q.status === params.status);
  }

  if (params.clientId) {
    filtered = filtered.filter((q) => String(q.clientId) === String(params.clientId));
  }

  if (params.inquiryId) {
    filtered = filtered.filter((q) => String(q.inquiryId) === String(params.inquiryId));
  }

  return {
    items: filtered,
    totalCount: filtered.length,
    pageNumber: params.pageNumber || 1,
    pageSize: params.pageSize || filtered.length,
    totalPages: 1,
  };
}

export async function getQuotationById(id) {
  const all = getStoredQuotations();
  const q = all.find(
    (item) =>
      String(item.id).toLowerCase() === String(id).toLowerCase() ||
      String(item.quotationNo).toLowerCase() === String(id).toLowerCase()
  );
  return q || null;
}

export async function getQuotationLookups() {
  return {
    statuses: ['Draft', 'Sent', 'In Negotiation', 'Confirmed'],
    negotiationModes: ['Call', 'Email', 'Meeting', 'WhatsApp', 'Other'],
    defaultCurrencyId: 1,
  };
}

export async function getNextQuotationNumber() {
  const all = getStoredQuotations();
  const year = new Date().getFullYear();
  const count = all.length + 1;
  return `QT-${year}-${String(count).padStart(4, '0')}`;
}

export async function getQuotationPrefill(inquiryId) {
  return {
    inquiryId,
    client: { addresses: [], contacts: [] },
    lineItems: [],
  };
}

export async function createQuotation(payload) {
  const all = getStoredQuotations();
  const count = all.length + 1;
  const quotationNo = payload.quotationNo || `QT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
  const totals = calculateQuotationTotals(payload.items || [], payload.taxTreatment || 'INTRA_STATE');

  const newQuotation = {
    id: quotationNo,
    quotationNo,
    inquiryId: payload.inquiryId || '',
    inquiryNo: payload.inquiryNo || '',
    clientId: payload.clientId || '',
    clientName: payload.clientName || '',
    clientAddress: payload.clientAddress || '',
    contactPerson: payload.contactPerson || '',
    contactEmail: payload.contactEmail || '',
    contactPhone: payload.contactPhone || '',
    status: 'Draft',
    currentRevision: 0,
    subtotal: totals.subtotal,
    totalTax: totals.totalTax,
    grandTotal: totals.grandTotal,
    items: totals.calculatedItems,
    taxes: payload.taxes || [],
    poReceived: false,
    poDetails: null,
    negotiations: [],
    documents: [],
    mailLogs: [],
    revisions: [],
    canRevise: false,
    isEditable: true,
    createdOn: new Date().toISOString(),
  };

  const updated = [newQuotation, ...all];
  saveStoredQuotations(updated);
  return newQuotation;
}

export async function updateQuotation(id, payload) {
  const all = getStoredQuotations();
  let found = null;
  const updated = all.map((q) => {
    if (String(q.id) === String(id) || String(q.quotationNo) === String(id)) {
      found = { ...q, ...payload, lastUpdatedAt: new Date().toISOString() };
      return found;
    }
    return q;
  });
  saveStoredQuotations(updated);
  return found;
}

export async function updateQuotationStatus(id, status) {
  const all = getStoredQuotations();
  let found = null;
  const updated = all.map((q) => {
    if (String(q.id) === String(id) || String(q.quotationNo) === String(id)) {
      found = {
        ...q,
        status,
        confirmedOn: status === 'Confirmed' ? new Date().toISOString().slice(0, 10) : q.confirmedOn,
        lastUpdatedAt: new Date().toISOString(),
      };
      return found;
    }
    return q;
  });
  saveStoredQuotations(updated);
  return found;
}

export async function createRevision(id, data = {}) {
  const all = getStoredQuotations();
  let found = null;
  const updated = all.map((q) => {
    if (String(q.id) === String(id) || String(q.quotationNo) === String(id)) {
      const nextRevNo = (q.currentRevision ?? 0) + 1;
      const historyEntry = {
        revisionNo: q.currentRevision ?? 0,
        revisionDate: q.revisionDate || new Date().toISOString().slice(0, 10),
        revisionReason: data.revisionReason || 'Revision',
        status: q.status,
        subtotal: q.subtotal,
        totalTax: q.totalTax,
        grandTotal: q.grandTotal,
        items: q.items,
      };

      found = {
        ...q,
        currentRevision: nextRevNo,
        status: 'Draft',
        revisions: [...(q.revisions || []), historyEntry],
        lastUpdatedAt: new Date().toISOString(),
      };
      return found;
    }
    return q;
  });
  saveStoredQuotations(updated);
  return found;
}

export async function addNegotiationStage(revisionId, stageData = {}) {
  return {
    id: `neg-${Date.now()}`,
    stageId: `neg-${Date.now()}`,
    revisionId,
    date: stageData.negotiationOn || stageData.date || new Date().toISOString().slice(0, 10),
    negotiationOn: stageData.negotiationOn || stageData.date || new Date().toISOString().slice(0, 10),
    handledByName: stageData.handledByName || 'Current User',
    mode: stageData.mode || 'Call',
    notes: stageData.discussion || stageData.notes || '',
    discussion: stageData.discussion || stageData.notes || '',
    ourOfferAmount: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : null,
    ourOffer: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : null,
    clientCounterAmount: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : null,
    clientCounter: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : null,
  };
}

export async function updateNegotiationStage(stageId, stageData = {}) {
  return {
    id: stageId,
    stageId,
    date: stageData.negotiationOn || stageData.date || new Date().toISOString().slice(0, 10),
    negotiationOn: stageData.negotiationOn || stageData.date || new Date().toISOString().slice(0, 10),
    handledByName: stageData.handledByName || 'Current User',
    mode: stageData.mode || 'Call',
    notes: stageData.discussion || stageData.notes || '',
    discussion: stageData.discussion || stageData.notes || '',
    ourOfferAmount: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : null,
    ourOffer: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : null,
    clientCounterAmount: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : null,
    clientCounter: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : null,
  };
}

export async function deleteNegotiationStage(stageId) {
  return { success: true, id: stageId };
}

export async function getNegotiationStage(stageId) {
  return { id: stageId };
}

export async function listQuotationNegotiations() {
  return [];
}

export async function listRevisionNegotiations() {
  return [];
}

export async function sendQuotationEmail(revisionId, mailData = {}) {
  return {
    isSuccess: true,
    sentAt: new Date().toISOString(),
    to: mailData.toAddress || mailData.to,
  };
}

export async function uploadQuotationDocument(revisionId, formData) {
  return {
    id: `doc-${Date.now()}`,
    fileName: 'Quotation_Attachment.pdf',
  };
}

export async function deleteQuotationDocument() {
  return true;
}

export async function submitQuotationForApproval() {
  return { isSuccess: true, message: 'Submitted for approval' };
}

/* =====================================================================
 * Task 61 Mock Implementation
 * ===================================================================== */

export async function recordQuotationPo(id, poData) {
  const all = getStoredQuotations();
  let found = null;

  // Handle FormData or Plain Object
  const poNumber = poData instanceof FormData ? poData.get('poNumber') : poData.poNumber;
  const receivedOn = poData instanceof FormData ? poData.get('poReceivedDate') : (poData.receivedOn || poData.poReceivedDate);
  const remarks = poData instanceof FormData ? poData.get('poRemarks') : (poData.remarks || poData.poRemarks);
  const fileName = poData instanceof FormData ? (poData.get('files')?.name || 'Client-PO.pdf') : (poData.fileName || 'Client-PO.pdf');

  const updated = all.map((q) => {
    if (String(q.id) === String(id) || String(q.quotationNo) === String(id)) {
      found = {
        ...q,
        status: 'Confirmed',
        confirmedOn: receivedOn || new Date().toISOString().slice(0, 10),
        poReceived: true,
        poDetails: {
          poNumber: poNumber || 'Client PO',
          receivedOn: receivedOn || new Date().toISOString().slice(0, 10),
          expectedDeliveryDate: poData.expectedDeliveryDate || null,
          fileName,
          remarks: remarks || '',
        },
        lastUpdatedAt: new Date().toISOString(),
      };
      return found;
    }
    return q;
  });

  saveStoredQuotations(updated);
  return found;
}

export async function getQuotationPo(id) {
  const q = await getQuotationById(id);
  return q?.poDetails || null;
}

export async function uploadQuotationPoDocuments() {
  return { success: true };
}

export async function deleteQuotationPoAttachment() {
  return true;
}

export async function getQuotationActivities() {
  return [];
}

export async function getPoPendingSalesOrderQuotations() {
  const all = getStoredQuotations();
  return all.filter((q) => q.poReceived && (!q.orderConfirmationCount || q.orderConfirmationCount === 0));
}
