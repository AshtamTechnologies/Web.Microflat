/**
 * src/services/inquiries/inquiryService.js
 * Real API service for the Customer Sales Inquiry module.
 * Communicates with backend endpoints per Inquiry Module – Frontend API Guide (Inquiry.md, Nov 23, 2026).
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { INQUIRY_ENDPOINTS } from './inquiryEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  inquiryListItemFromApi,
  inquiryDetailFromApi,
  inquiryToCreatePayload,
  inquiryToUpdatePayload,
  inquiryProductFromApi,
  inquiryProductToApi,
  inquiryAttachmentFromApi,
  inquiryActivityFromApi,
} from '../../models/inquiries/inquiryModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
  assign: true,
  catalog: true,
  productLines: true,
  attachments: true,
  activities: true,
};

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
 * 1. Paged list of inquiries with filters.
 * GET /api/inquiries
 * @param {{ search?: string, status?: string, regionId?: number, inquirySourceId?: number, priorityLevelId?: number, assignedToUserId?: number, mine?: boolean, isNewClient?: boolean, clientId?: number, productId?: number, fromDate?: string, toDate?: string, isActive?: boolean, pageNumber?: number, pageSize?: number }} [params]
 */
export async function listInquiries(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.regionId) query.regionId = cleanId(params.regionId);
    if (params.inquirySourceId) query.inquirySourceId = Number(params.inquirySourceId);
    if (params.priorityLevelId && params.priorityLevelId !== 'ALL') query.priorityLevelId = Number(params.priorityLevelId);
    if (params.assignedToUserId) query.assignedToUserId = cleanId(params.assignedToUserId);
    if (params.mine) query.mine = true;
    if (params.isNewClient !== undefined && params.isNewClient !== null) query.isNewClient = Boolean(params.isNewClient);
    if (params.clientId) query.clientId = cleanId(params.clientId);
    if (params.productId) query.productId = cleanId(params.productId);
    if (params.fromDate) query.fromDate = params.fromDate;
    if (params.toDate) query.toDate = params.toDate;
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== 'ALL') {
      query.isActive = typeof params.isActive === 'boolean' ? params.isActive : params.isActive === 'true';
    }
    if (params.pageNumber) query.pageNumber = Number(params.pageNumber);
    if (params.pageSize) query.pageSize = Number(params.pageSize);

    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.INQUIRIES, { params: query });
    const data = response.data || {};
    const items = Array.isArray(data.items)
      ? data.items.map(inquiryListItemFromApi).filter(Boolean)
      : Array.isArray(data)
        ? data.map(inquiryListItemFromApi).filter(Boolean)
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
 * 2. Inquiry Dashboard counts.
 * GET /api/inquiries/summary
 */
export async function getInquirySummary() {
  try {
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.SUMMARY);
    return response.data || {};
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 3. Dropdowns for inquiry screens.
 * GET /api/inquiries/lookups
 */
export async function getInquiryLookups() {
  try {
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.LOOKUPS);
    return response.data || {};
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Convenience helper to get inquiry sources
 */
export async function getSources() {
  const lookups = await getInquiryLookups();
  return Array.isArray(lookups.sources)
    ? lookups.sources
    : Array.isArray(lookups.inquirySources)
      ? lookups.inquirySources
      : [];
}

/**
 * Convenience helper to get inquiry priority levels
 */
export async function getPriorityLevels() {
  const lookups = await getInquiryLookups();
  return Array.isArray(lookups.priorityLevels)
    ? lookups.priorityLevels
    : Array.isArray(lookups.priorities)
      ? lookups.priorities
      : [];
}

/**
 * 4. Next inquiry number preview.
 * GET /api/inquiries/next-number?inquiryDate=
 * @param {string} [inquiryDate]
 */
export async function getNextInquiryNumber(inquiryDate) {
  try {
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.NEXT_NUMBER(inquiryDate));
    return response.data || {};
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 5. Get full inquiry detail by ID.
 * GET /api/inquiries/{id}
 * @param {number|string} id
 */
export async function getInquiryById(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.INQUIRY_BY_ID(validId));
    return inquiryDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 6. Create new inquiry.
 * POST /api/inquiries
 * @param {object} formData
 */
export async function createInquiry(formData) {
  try {
    const payload = inquiryToCreatePayload(formData);
    const response = await axiosInstance.post(INQUIRY_ENDPOINTS.INQUIRIES, payload);
    return inquiryDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 7. Update inquiry.
 * PUT /api/inquiries/{id}
 * @param {number|string} id
 * @param {object} formData
 */
export async function updateInquiry(id, formData) {
  try {
    const validId = cleanId(id);
    const payload = inquiryToUpdatePayload(formData);
    const response = await axiosInstance.put(INQUIRY_ENDPOINTS.INQUIRY_BY_ID(validId), payload);
    return inquiryDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 8. Change inquiry status.
 * PATCH /api/inquiries/{id}/status
 * @param {number|string} id
 * @param {{ status: string, comment?: string }} data
 */
export async function changeInquiryStatus(id, { status, comment }) {
  try {
    const validId = cleanId(id);
    const payload = {
      status,
      comment: comment?.trim() || null,
    };
    const response = await axiosInstance.patch(INQUIRY_ENDPOINTS.STATUS(validId), payload);
    return response.data || { success: true };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 9. Reassign inquiry to another user.
 * POST /api/inquiries/{id}/assign
 * @param {number|string} id
 * @param {{ assignedToUserId: number, comment?: string }} data
 */
export async function assignInquiry(id, { assignedToUserId, comment }) {
  try {
    const validId = cleanId(id);
    const payload = {
      assignedToUserId: cleanId(assignedToUserId),
      comment: comment?.trim() || null,
    };
    const response = await axiosInstance.post(INQUIRY_ENDPOINTS.ASSIGN(validId), payload);
    return inquiryDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 10. Activate / Deactivate inquiry (Admin only).
 * PATCH /api/inquiries/{id}/active
 * @param {number|string} id
 * @param {boolean} isActive
 */
export async function toggleInquiryActive(id, isActive) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.patch(INQUIRY_ENDPOINTS.ACTIVE(validId), { isActive: Boolean(isActive) });
    return response.data || { success: true };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 11. Get inquiry activity trail.
 * GET /api/inquiries/{id}/activities
 * @param {number|string} id
 */
export async function getInquiryActivities(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.ACTIVITIES(validId));
    const items = Array.isArray(response.data)
      ? response.data.map(inquiryActivityFromApi).filter(Boolean)
      : [];
    return items;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 12. Add a comment note to an inquiry.
 * POST /api/inquiries/{id}/comments
 * @param {number|string} id
 * @param {string} comment
 */
export async function addInquiryComment(id, comment) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.post(INQUIRY_ENDPOINTS.COMMENTS(validId), {
      comment: String(comment).trim(),
    });
    const items = Array.isArray(response.data)
      ? response.data.map(inquiryActivityFromApi).filter(Boolean)
      : [];
    return items;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 13. Catalog Product Picker.
 * GET /api/inquiries/catalog
 * @param {{ search?: string, categoryId?: number, pageNumber?: number, pageSize?: number }} [params]
 */
export async function getCatalog(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.categoryId) query.categoryId = cleanId(params.categoryId);
    if (params.pageNumber) query.pageNumber = Number(params.pageNumber);
    if (params.pageSize) query.pageSize = Number(params.pageSize);

    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.CATALOG, { params: query });
    return response.data || [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 14. Catalog Product Detail with variants & options.
 * GET /api/inquiries/catalog/{productId}
 * @param {number|string} productId
 */
export async function getCatalogProduct(productId) {
  try {
    const validId = cleanId(productId);
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.CATALOG_PRODUCT(validId));
    return response.data || null;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 15. Product lines of an inquiry.
 * GET /api/inquiries/{id}/products
 * @param {number|string} inquiryId
 */
export async function getInquiryProducts(inquiryId) {
  try {
    const validId = cleanId(inquiryId);
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.PRODUCTS(validId));
    const items = Array.isArray(response.data)
      ? response.data.map(inquiryProductFromApi).filter(Boolean)
      : [];
    return items;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 16. Add single line item.
 * POST /api/inquiries/{id}/products
 * @param {number|string} inquiryId
 * @param {object} item
 */
export async function addInquiryProduct(inquiryId, item) {
  try {
    const validId = cleanId(inquiryId);
    const payload = inquiryProductToApi(item);
    const response = await axiosInstance.post(INQUIRY_ENDPOINTS.PRODUCTS(validId), payload);
    return inquiryProductFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 17. Get single line item.
 * GET /api/inquiry-products/{lineId}
 * @param {number|string} lineId
 */
export async function getInquiryProduct(lineId) {
  try {
    const validId = cleanId(lineId);
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.PRODUCT_BY_LINE_ID(validId));
    return inquiryProductFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 18. Update single line item.
 * PUT /api/inquiry-products/{lineId}
 * @param {number|string} lineId
 * @param {object} item
 */
export async function updateInquiryProduct(lineId, item) {
  try {
    const validId = cleanId(lineId);
    const payload = inquiryProductToApi(item);
    const response = await axiosInstance.put(INQUIRY_ENDPOINTS.PRODUCT_BY_LINE_ID(validId), payload);
    return inquiryProductFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 19. Delete single line item.
 * DELETE /api/inquiry-products/{lineId}
 * @param {number|string} lineId
 */
export async function deleteInquiryProduct(lineId) {
  try {
    const validId = cleanId(lineId);
    await axiosInstance.delete(INQUIRY_ENDPOINTS.PRODUCT_BY_LINE_ID(validId));
    return { success: true };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 20. Attachments of an inquiry.
 * GET /api/inquiries/{id}/attachments
 * @param {number|string} inquiryId
 */
export async function getInquiryAttachments(inquiryId) {
  try {
    const validId = cleanId(inquiryId);
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.ATTACHMENTS(validId));
    const items = Array.isArray(response.data)
      ? response.data.map(inquiryAttachmentFromApi).filter(Boolean)
      : [];
    return items;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 21. Upload attachment file (multipart/form-data).
 * POST /api/inquiries/{id}/attachments
 * @param {number|string} inquiryId
 * @param {{ documentTypeId: number, file: File, documentTitle?: string, remarks?: string }} data
 */
export async function uploadInquiryAttachment(inquiryId, { documentTypeId, file, documentTitle, remarks }) {
  try {
    const validId = cleanId(inquiryId);
    const fd = new FormData();
    fd.append('documentTypeId', cleanId(documentTypeId));
    if (file) {
      fd.append('file', file);
    }
    if (documentTitle?.trim()) {
      fd.append('documentTitle', documentTitle.trim());
    }
    if (remarks?.trim()) {
      fd.append('remarks', remarks.trim());
    }

    const response = await axiosInstance.post(INQUIRY_ENDPOINTS.ATTACHMENTS(validId), fd, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return inquiryAttachmentFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 22. Download attachment file as authenticated blob stream.
 * GET /api/inquiry-attachments/{id}/download
 * @param {number|string} attachmentId
 * @param {string} [fileName]
 */
export async function downloadInquiryAttachment(attachmentId, fileName = '') {
  try {
    const validId = cleanId(attachmentId);
    const response = await axiosInstance.get(INQUIRY_ENDPOINTS.ATTACHMENT_DOWNLOAD(validId), {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: fileName,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { success: true };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 23. Delete attachment.
 * DELETE /api/inquiry-attachments/{id}
 * @param {number|string} attachmentId
 */
export async function deleteInquiryAttachment(attachmentId) {
  try {
    const validId = cleanId(attachmentId);
    await axiosInstance.delete(INQUIRY_ENDPOINTS.ATTACHMENT_BY_ID(validId));
    return { success: true };
  } catch (err) {
    throw normalizeApiError(err);
  }
}
