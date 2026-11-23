/**
 * src/services/inquiries/inquiryEndpoints.js
 * Centralized API endpoints for the Customer Sales Inquiry module.
 * Conforms to Inquiry Module – Frontend API Guide (Inquiry.md, Nov 23, 2026).
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

export const INQUIRY_ENDPOINTS = {
  // Core Inquiries Directory & Overview
  INQUIRIES: '/api/inquiries',
  SUMMARY: '/api/inquiries/summary',
  LOOKUPS: '/api/inquiries/lookups',
  NEXT_NUMBER: (date) =>
    `/api/inquiries/next-number${date ? `?inquiryDate=${encodeURIComponent(date)}` : ''}`,

  // Single Inquiry Lifecycle
  INQUIRY_BY_ID: (id) => `/api/inquiries/${cleanId(id)}`,
  STATUS: (id) => `/api/inquiries/${cleanId(id)}/status`,
  ASSIGN: (id) => `/api/inquiries/${cleanId(id)}/assign`,
  ACTIVE: (id) => `/api/inquiries/${cleanId(id)}/active`,
  ACTIVITIES: (id) => `/api/inquiries/${cleanId(id)}/activities`,
  COMMENTS: (id) => `/api/inquiries/${cleanId(id)}/comments`,

  // Product Catalog Picker
  CATALOG: '/api/inquiries/catalog',
  CATALOG_PRODUCT: (productId) => `/api/inquiries/catalog/${cleanId(productId)}`,

  // Inquiry Product Lines
  PRODUCTS: (inquiryId) => `/api/inquiries/${cleanId(inquiryId)}/products`,
  PRODUCT_BY_LINE_ID: (lineId) => `/api/inquiry-products/${cleanId(lineId)}`,

  // Attachments
  ATTACHMENTS: (inquiryId) => `/api/inquiries/${cleanId(inquiryId)}/attachments`,
  ATTACHMENT_BY_ID: (id) => `/api/inquiry-attachments/${cleanId(id)}`,
  ATTACHMENT_DOWNLOAD: (id) => `/api/inquiry-attachments/${cleanId(id)}/download`,

  // Masters (Admin Setup)
  INQUIRY_SOURCES: '/api/inquiry-sources',
  INQUIRY_SOURCE_BY_ID: (id) => `/api/inquiry-sources/${cleanId(id)}`,
  INQUIRY_SOURCE_STATUS: (id) => `/api/inquiry-sources/${cleanId(id)}/status`,

  PRIORITY_LEVELS: '/api/priority-levels',
  PRIORITY_LEVEL_BY_ID: (id) => `/api/priority-levels/${cleanId(id)}`,
  PRIORITY_LEVEL_STATUS: (id) => `/api/priority-levels/${cleanId(id)}/status`,
};
