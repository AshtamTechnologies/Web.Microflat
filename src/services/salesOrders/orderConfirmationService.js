/**
 * src/services/salesOrders/orderConfirmationService.js
 * Real API service for Order Confirmations (Sales Orders).
 * Connects directly to backend endpoints per Swagger OpenAPI & Guide §5.4g.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { ORDER_CONFIRMATION_ENDPOINTS } from './orderConfirmationEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  orderConfirmationListItemFromApi,
  orderConfirmationDetailFromApi,
  buildCreateOrderConfirmationPayload,
  buildUpdateOrderConfirmationPayload,
} from '../../models/salesOrders/orderConfirmationModel';

function cleanId(id) {
  // Already a valid number
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  
  // Purely numeric string like "15" or "7000001"
  if (typeof id === 'string' && /^\d+$/.test(id.trim())) {
    return Number(id.trim());
  }
  
  // Prefix format like "ord-42" — take trailing digits only
  if (typeof id === 'string') {
    const match = id.trim().match(/^[a-zA-Z_-]+(\d+)$/);
    if (match) return Number(match[1]);
  }
  
  // Document series like "OC-2026-000001" — return as-is
  // Let state lookup handle it via orderConfirmationNo matching
  return id;
}

/**
 * 1. Paged list of order confirmations.
 * GET /api/order-confirmations
 * @param {{ search?: string, status?: string, orderSource?: boolean|string, quotationId?: number, inquiryId?: number, clientId?: number, fromDate?: string, toDate?: string, pageNumber?: number, pageSize?: number }} [params]
 */
export async function listOrderConfirmations(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.quotationId) query.quotationId = cleanId(params.quotationId);
    if (params.inquiryId) query.inquiryId = cleanId(params.inquiryId);
    if (params.clientId) query.clientId = cleanId(params.clientId);
    if (params.fromDate) query.fromDate = params.fromDate;
    if (params.toDate) query.toDate = params.toDate;
    if (params.orderSource !== undefined && params.orderSource !== null && params.orderSource !== '' && params.orderSource !== 'ALL') {
      query.orderSource = params.orderSource;
    }
    if (params.pageNumber) query.pageNumber = Number(params.pageNumber);
    if (params.pageSize) query.pageSize = Number(params.pageSize);

    const response = await axiosInstance.get(ORDER_CONFIRMATION_ENDPOINTS.ORDER_CONFIRMATIONS, {
      params: query,
    });

    const data = response.data || {};
    const rawList = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    const items = rawList.map(orderConfirmationListItemFromApi).filter(Boolean);

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
 * 2. Get single order confirmation detail by ID.
 * GET /api/order-confirmations/{id}
 * @param {number|string} id
 */
export async function getOrderConfirmationById(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(
      ORDER_CONFIRMATION_ENDPOINTS.ORDER_CONFIRMATION_BY_ID(validId)
    );
    return orderConfirmationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 3. Dropdown lookup options for Order Confirmations.
 * GET /api/order-confirmations/lookups
 */
export async function getOrderConfirmationLookups() {
  try {
    const response = await axiosInstance.get(ORDER_CONFIRMATION_ENDPOINTS.LOOKUPS);
    return response.data || {};
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 4. Preview next order confirmation document series number.
 * GET /api/order-confirmations/next-number?orderConfirmationDate=
 * @param {string} [orderConfirmationDate]
 */
export async function getNextOrderConfirmationNumber(orderConfirmationDate) {
  try {
    const dateStr = orderConfirmationDate || new Date().toISOString().split('T')[0];
    const response = await axiosInstance.get(
      ORDER_CONFIRMATION_ENDPOINTS.NEXT_NUMBER(dateStr)
    );
    return response.data?.documentNumber || '';
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 5. Create Draft order confirmation from a Confirmed quotation.
 * POST /api/order-confirmations
 * Note: quotationId must be integer; lineItems must be null on create.
 * @param {object} form
 */
export async function createOrderConfirmation(form) {
  try {
    const payload = buildCreateOrderConfirmationPayload(form);
    const response = await axiosInstance.post(
      ORDER_CONFIRMATION_ENDPOINTS.ORDER_CONFIRMATIONS,
      payload
    );
    return orderConfirmationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 6. Update Draft order confirmation.
 * PUT /api/order-confirmations/{id}
 * @param {number|string} id
 * @param {object} form
 */
export async function updateOrderConfirmation(id, form) {
  try {
    const validId = cleanId(id);
    const payload = buildUpdateOrderConfirmationPayload(form);
    const response = await axiosInstance.put(
      ORDER_CONFIRMATION_ENDPOINTS.ORDER_CONFIRMATION_BY_ID(validId),
      payload
    );
    return orderConfirmationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 7. Move order confirmation workflow status (e.g. Draft -> Confirmed).
 * PATCH /api/order-confirmations/{id}/status
 * @param {number|string} id
 * @param {string} status ('Confirmed' | 'Cancelled')
 */
export async function updateOrderConfirmationStatus(id, status) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.patch(
      ORDER_CONFIRMATION_ENDPOINTS.STATUS(validId),
      { status }
    );
    return orderConfirmationDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 8. List documents of an order confirmation.
 * GET /api/order-confirmations/{id}/documents
 * @param {number|string} id
 */
export async function getOrderConfirmationDocuments(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(
      ORDER_CONFIRMATION_ENDPOINTS.DOCUMENTS(validId)
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 9. Upload an order confirmation document (e.g. Client PO PDF).
 * POST /api/order-confirmations/{id}/documents (multipart/form-data)
 * @param {number|string} id
 * @param {File} file
 * @param {number} documentTypeId
 * @param {string} [remarks]
 */
export async function uploadOrderConfirmationDocument(id, file, documentTypeId, remarks = '') {
  try {
    const validId = cleanId(id);
    const formData = new FormData();
    formData.append('file', file);
    if (documentTypeId) {
      formData.append('documentTypeId', String(documentTypeId));
    }
    if (remarks) {
      formData.append('remarks', remarks);
    }

    const response = await axiosInstance.post(
      ORDER_CONFIRMATION_ENDPOINTS.DOCUMENTS(validId),
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
 * 10. Download document file stream.
 * GET /api/order-confirmation-documents/{id}/download
 * @param {number|string} docId
 * @param {string} [fileName]
 */
export async function downloadOrderConfirmationDocument(docId, fileName = 'order-document.pdf') {
  try {
    const validId = cleanId(docId);
    const response = await axiosInstance.get(
      ORDER_CONFIRMATION_ENDPOINTS.DOCUMENT_DOWNLOAD(validId),
      { responseType: 'blob' }
    );

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 11. Delete an order confirmation document.
 * DELETE /api/order-confirmation-documents/{id}
 * @param {number|string} docId
 */
export async function deleteOrderConfirmationDocument(docId) {
  try {
    const validId = cleanId(docId);
    await axiosInstance.delete(ORDER_CONFIRMATION_ENDPOINTS.DOCUMENT_BY_ID(validId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 12. Email logs for an order confirmation.
 * GET /api/order-confirmations/{id}/email-logs
 * @param {number|string} id
 */
export async function getOrderConfirmationEmailLogs(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(
      ORDER_CONFIRMATION_ENDPOINTS.EMAIL_LOGS(validId)
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 13. Send order confirmation email.
 * POST /api/order-confirmations/{id}/send-email
 * @param {number|string} id
 * @param {{ toEmail: string, ccEmail?: string, subject?: string, body?: string }} payload
 */
export async function sendOrderConfirmationEmail(id, payload) {
  try {
    const validId = cleanId(id);
    const to = payload.toAddress || payload.toEmail || payload.to || '';
    const cc = payload.ccAddress || payload.ccEmail || payload.cc || '';
    const body = {
      toAddress: to,
      toEmail: to,
      ccAddress: cc,
      ccEmail: cc,
      subject: payload.subject || '',
      body: payload.body || '',
    };
    const response = await axiosInstance.post(
      ORDER_CONFIRMATION_ENDPOINTS.SEND_EMAIL(validId),
      body
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
