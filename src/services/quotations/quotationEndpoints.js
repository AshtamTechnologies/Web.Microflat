/**
 * src/services/quotations/quotationEndpoints.js
 * Centralized API endpoint constants for Quotations & Task 61 (Customer PO).
 * Aligned with Swagger OpenAPI & Frontend-API-Guide.md §5.4f & §5.4g.
 */

function cleanId(id) {
  if (typeof id === 'number') return id;
  if (!id) return id;
  const str = String(id).trim();
  if (/^\d+$/.test(str)) return Number(str);
  const match = str.match(/^[a-zA-Z]+-(\d+)$/);
  if (match) return Number(match[1]);
  return str;
}

export const QUOTATION_ENDPOINTS = {
  // Lookups & Number Series
  LOOKUPS: '/api/quotations/lookups',
  NEXT_NUMBER: (date) =>
    `/api/quotations/next-number${date ? `?quotationDate=${encodeURIComponent(date)}` : ''}`,
  PREFILL: (inquiryId) =>
    `/api/quotations/prefill?inquiryId=${encodeURIComponent(cleanId(inquiryId))}`,

  // Quotations Core CRUD & Status
  QUOTATIONS: '/api/quotations',
  QUOTATION_BY_ID: (id) => `/api/quotations/${cleanId(id)}`,
  STATUS: (id) => `/api/quotations/${cleanId(id)}/status`,
  SUBMIT_FOR_APPROVAL: (id) => `/api/quotations/${cleanId(id)}/submit-for-approval`,

  // Revisions
  REVISIONS: (id) => `/api/quotations/${cleanId(id)}/revisions`,
  REVISION_BY_ID: (revId) => `/api/quotation-revisions/${cleanId(revId)}`,

  // Negotiations
  QUOTATION_NEGOTIATIONS: (id) => `/api/quotations/${cleanId(id)}/negotiations`,
  REVISION_NEGOTIATIONS: (revId) => `/api/quotation-revisions/${cleanId(revId)}/negotiations`,
  NEGOTIATION_STAGE_BY_ID: (stageId) => `/api/quotation-negotiations/${cleanId(stageId)}`,

  // Documents & Attachments
  QUOTATION_DOCUMENTS: (id) => `/api/quotations/${cleanId(id)}/documents`,
  REVISION_DOCUMENTS: (revId) => `/api/quotation-revisions/${cleanId(revId)}/documents`,
  DOCUMENT_DOWNLOAD: (docId) => `/api/quotation-documents/${cleanId(docId)}/download`,
  DOCUMENT_DELETE: (docId) => `/api/quotation-documents/${cleanId(docId)}`,

  // Email
  SEND_EMAIL: (revId) => `/api/quotation-revisions/${cleanId(revId)}/send-email`,
  QUOTATION_EMAIL_LOGS: (id) => `/api/quotations/${cleanId(id)}/email-logs`,
  REVISION_EMAIL_LOGS: (revId) => `/api/quotation-revisions/${cleanId(revId)}/email-logs`,

  // Task 61: Customer PO Recording & PO Inspection
  PO_DETAILS: (id) => `/api/quotations/${cleanId(id)}/po`,
  PO_RECEIVED: (id) => `/api/quotations/${cleanId(id)}/po-received`,
  PO_DOCUMENTS: (id) => `/api/quotations/${cleanId(id)}/po-documents`,
  PO_ATTACHMENT_DOWNLOAD: (attachmentId) => `/api/quotation-attachments/${cleanId(attachmentId)}/download`,
  PO_ATTACHMENT_DELETE: (attachmentId) => `/api/quotation-attachments/${cleanId(attachmentId)}`,
  ACTIVITIES: (id) => `/api/quotations/${cleanId(id)}/activities`,
  PO_PENDING_SALES_ORDER: (userId) =>
    `/api/quotations/po-pending-sales-order${userId ? `?assignedToUserId=${encodeURIComponent(userId)}` : ''}`,
};
