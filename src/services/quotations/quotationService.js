/**
 * src/services/quotations/quotationService.js
 * Real API service for Quotations and Task 61 (Customer PO Recording).
 * Connects directly to backend endpoints per Swagger OpenAPI & Guide §5.4f & §5.4g.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { QUOTATION_ENDPOINTS } from './quotationEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  quotationListItemFromApi,
  quotationDetailFromApi,
  quotationNegotiationFromApi,
  buildCreateQuotationPayload,
  buildUpdateQuotationPayload,
  buildPoReceivedFormData,
} from '../../models/quotations/quotationModel';

function cleanId(id) {
  if (typeof id === 'number') return id;
  if (!id) return id;
  const str = String(id).trim();
  if (/^\d+$/.test(str)) return Number(str);
  const match = str.match(/^[a-zA-Z]+-(\d+)$/);
  if (match) return Number(match[1]);
  return str;
}

/**
 * 1. Paged list of quotations.
 * GET /api/quotations
 * @param {{ search?: string, status?: string, inquiryId?: number, clientId?: number, fromDate?: string, toDate?: string, pageNumber?: number, pageSize?: number }} [params]
 */
export async function listQuotations(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.Search = params.search.trim();
    if (params.status && params.status !== 'ALL') query.Status = params.status;
    if (params.inquiryId) query.InquiryId = cleanId(params.inquiryId);
    if (params.clientId) query.ClientId = cleanId(params.clientId);
    if (params.fromDate) query.FromDate = params.fromDate;
    if (params.toDate) query.ToDate = params.toDate;
    if (params.pageNumber) query.PageNumber = Number(params.pageNumber);
    if (params.pageSize) query.PageSize = Number(params.pageSize);

    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.QUOTATIONS, {
      params: query,
    });

    const data = response.data || {};
    const items = Array.isArray(data.items)
      ? data.items.map(quotationListItemFromApi).filter(Boolean)
      : Array.isArray(data)
      ? data.map(quotationListItemFromApi).filter(Boolean)
      : [];

    return {
      items,
      totalCount: data.totalCount ?? items.length,
      pageNumber: data.pageNumber || 1,
      pageSize: data.pageSize || items.length,
      totalPages: data.totalPages || 1,
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 2. Get single quotation detail by ID.
 * GET /api/quotations/{id}
 * @param {number|string} id
 */
export async function getQuotationById(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.QUOTATION_BY_ID(validId));
    return quotationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 3. Lookups for dropdowns
 * GET /api/quotations/lookups
 */
export async function getQuotationLookups() {
  try {
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.LOOKUPS);
    return response.data || {};
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 4. Next number series preview
 * GET /api/quotations/next-number?quotationDate=
 * @param {string} [date]
 */
export async function getNextQuotationNumber(date) {
  try {
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.NEXT_NUMBER(date));
    const data = response.data;
    if (!data) return '';
    if (typeof data === 'string') return data.trim();
    return data.documentNumber || data.nextNumber || data.seriesNumber || '';
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 5. Prefill data from Inquiry
 * GET /api/quotations/prefill?inquiryId=
 * @param {number|string} inquiryId
 */
export async function getQuotationPrefill(inquiryId) {
  try {
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.PREFILL(inquiryId));
    return response.data || {};
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 6. Create initial Quotation (Revision 0)
 * POST /api/quotations
 * @param {object} payload
 */
export async function createQuotation(payload) {
  try {
    const body = buildCreateQuotationPayload(payload);
    // Explicitly enforce lineItems: null per Guide §5.4f & Swagger
    // Backend automatically copies line items from the inquiry
    body.lineItems = null;
    const response = await axiosInstance.post(QUOTATION_ENDPOINTS.QUOTATIONS, body);
    return quotationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 7. Update Quotation latest revision (Draft only)
 * PUT /api/quotations/{id}
 * @param {number|string} id
 * @param {object} payload
 */
export async function updateQuotation(id, payload) {
  try {
    const validId = cleanId(id);
    const body = buildUpdateQuotationPayload(payload);
    const response = await axiosInstance.put(QUOTATION_ENDPOINTS.QUOTATION_BY_ID(validId), body);
    return quotationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 8. Update Quotation Status
 * PATCH /api/quotations/{id}/status
 * @param {number|string} id
 * @param {string} status 'Sent' | 'In Negotiation' | 'Confirmed'
 */
export async function updateQuotationStatus(id, status) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.patch(QUOTATION_ENDPOINTS.STATUS(validId), { status });
    return quotationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 9. Create Revision (Rev N+1)
 * POST /api/quotations/{id}/revisions
 * @param {number|string} id
 * @param {{ revisionReason: string, revisionDate?: string, clientAddressId?: number, clientContactId?: number }} data
 */
export async function createRevision(id, data = {}) {
  try {
    const validId = cleanId(id);
    const body = {
      revisionReason: data.revisionReason || 'Quotation revision',
      revisionDate: data.revisionDate || new Date().toISOString().slice(0, 10),
      clientAddressId: data.clientAddressId ? cleanId(data.clientAddressId) : null,
      clientContactId: data.clientContactId ? cleanId(data.clientContactId) : null,
    };
    const response = await axiosInstance.post(QUOTATION_ENDPOINTS.REVISIONS(validId), body);
    return quotationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 10. List Revisions
 * GET /api/quotations/{id}/revisions
 * @param {number|string} id
 */
export async function listRevisions(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.REVISIONS(validId));
    return response.data || [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 11. Submit Quotation for Approval
 * POST /api/quotations/{id}/submit-for-approval
 * @param {number|string} id
 */
export async function submitQuotationForApproval(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.post(QUOTATION_ENDPOINTS.SUBMIT_FOR_APPROVAL(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 12. Add Negotiation Stage
 * POST /api/quotation-revisions/{revisionId}/negotiations
 * @param {number|string} revisionId
 * @param {object} stageData
 */
export async function addNegotiationStage(revisionId, stageData = {}) {
  try {
    const validRevId = cleanId(revisionId);
    const body = {
      negotiationOn: stageData.negotiationOn || stageData.date || new Date().toISOString().slice(0, 10),
      handledByUserId: stageData.handledByUserId ? cleanId(stageData.handledByUserId) : null,
      clientContactId: stageData.clientContactId ? cleanId(stageData.clientContactId) : null,
      mode: stageData.mode || 'Call',
      discussion: stageData.discussion || stageData.notes || '',
      ourOfferAmount: stageData.ourOfferAmount !== undefined && stageData.ourOfferAmount !== null ? Number(stageData.ourOfferAmount) : null,
      clientCounterAmount: stageData.clientCounterAmount !== undefined && stageData.clientCounterAmount !== null ? Number(stageData.clientCounterAmount) : null,
    };
    const response = await axiosInstance.post(QUOTATION_ENDPOINTS.REVISION_NEGOTIATIONS(validRevId), body);
    return quotationNegotiationFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 13. Send Quotation Email
 * POST /api/quotation-revisions/{revisionId}/send-email
 * @param {number|string} revisionId
 * @param {{ toAddress?: string, ccAddress?: string, subject?: string, body?: string }} mailData
 */
export async function sendQuotationEmail(revisionId, mailData = {}) {
  try {
    const validRevId = cleanId(revisionId);
    const body = {
      toAddress: mailData.toAddress || mailData.to || null,
      ccAddress: mailData.ccAddress || mailData.cc || null,
      subject: mailData.subject || null,
      body: mailData.body || null,
    };
    const response = await axiosInstance.post(QUOTATION_ENDPOINTS.SEND_EMAIL(validRevId), body);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 14. Upload Quotation Document (Revision)
 * POST /api/quotation-revisions/{revisionId}/documents
 * @param {number|string} revisionId
 * @param {FormData} formData
 */
export async function uploadQuotationDocument(revisionId, formData) {
  try {
    const validRevId = cleanId(revisionId);
    const response = await axiosInstance.post(
      QUOTATION_ENDPOINTS.REVISION_DOCUMENTS(validRevId),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 15. Delete Quotation Document
 * DELETE /api/quotation-documents/{id}
 * @param {number|string} docId
 */
export async function deleteQuotationDocument(docId) {
  try {
    const validId = cleanId(docId);
    await axiosInstance.delete(QUOTATION_ENDPOINTS.DOCUMENT_DELETE(validId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/* =====================================================================
 * Task 61: Customer PO Recording & PO Inspection
 * ===================================================================== */

/**
 * 16. Record Customer PO (Task 61)
 * POST /api/quotations/{id}/po-received (multipart form-data)
 * @param {number|string} id
 * @param {FormData|object} poData
 */
export async function recordQuotationPo(id, poData) {
  try {
    const validId = cleanId(id);
    const formData = poData instanceof FormData ? poData : buildPoReceivedFormData(poData);

    const response = await axiosInstance.post(QUOTATION_ENDPOINTS.PO_RECEIVED(validId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return quotationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 17. Inspect Recorded PO (Task 61)
 * GET /api/quotations/{id}/po
 * @param {number|string} id
 */
export async function getQuotationPo(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.PO_DETAILS(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 18. Upload Additional PO Documents
 * POST /api/quotations/{id}/po-documents
 * @param {number|string} id
 * @param {FormData} formData
 */
export async function uploadQuotationPoDocuments(id, formData) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.post(QUOTATION_ENDPOINTS.PO_DOCUMENTS(validId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 19. Delete PO Attachment (Soft Delete)
 * DELETE /api/quotation-attachments/{id}
 * @param {number|string} attachmentId
 */
export async function deleteQuotationPoAttachment(attachmentId) {
  try {
    const validId = cleanId(attachmentId);
    await axiosInstance.delete(QUOTATION_ENDPOINTS.PO_ATTACHMENT_DELETE(validId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 20. Get Quotation Activities
 * GET /api/quotations/{id}/activities
 * @param {number|string} id
 */
export async function getQuotationActivities(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.ACTIVITIES(validId));
    return response.data || [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 21. Get quotations with PO received pending sales order creation
 * GET /api/quotations/po-pending-sales-order?assignedToUserId=
 * @param {number|string} [assignedToUserId]
 */
export async function getPoPendingSalesOrderQuotations(assignedToUserId) {
  try {
    const response = await axiosInstance.get(QUOTATION_ENDPOINTS.PO_PENDING_SALES_ORDER(assignedToUserId));
    const items = Array.isArray(response.data)
      ? response.data.map(quotationListItemFromApi).filter(Boolean)
      : [];
    return items;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
