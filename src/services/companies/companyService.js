/**
 * src/services/companies/companyService.js — Full implementation of Company & Company Bank Details APIs.
 *
 * Implements all 18 endpoints specified in Company API Integration Guide:
 *   - Company: Paged list, active picker, lookups, details, register, edit, status toggle, delete.
 *   - Company Bank Details: List by company, add, get with docs, edit, status toggle, delete.
 *   - Banking Documents: List attachments, upload multipart file, authenticated stream download, delete.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { COMPANY_ENDPOINTS } from './companyEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  companyListItemFromApi,
  companyDetailFromApi,
  companyToApiPayload,
  bankDetailFromApi,
  bankDetailToApiPayload,
  bankAttachmentFromApi,
} from '../../models/companies/companyModel';

// ============================================================================
// 1. COMPANY SERVICES (Endpoints 1 - 8)
// ============================================================================

/**
 * 1. GET /api/companies — Paged list of companies sorted by name.
 * @param {object} params - { search, isActive, pageNumber, pageSize }
 */
export async function listCompanies(params = {}) {
  try {
    const query = {};

    const search = params.search ?? params.Search;
    if (search !== undefined && search !== null && String(search).trim() !== '') {
      query.search = String(search).trim();
    }

    const isActive = params.isActive ?? params.IsActive;
    if (isActive !== undefined && isActive !== null && isActive !== 'ALL') {
      if (typeof isActive === 'boolean') {
        query.isActive = isActive;
      } else {
        const s = String(isActive).trim().toUpperCase();
        if (s === 'ACTIVE' || s === 'TRUE') query.isActive = true;
        else if (s === 'INACTIVE' || s === 'FALSE') query.isActive = false;
      }
    }

    if (params.pageNumber || params.PageNumber) {
      query.pageNumber = Number(params.pageNumber || params.PageNumber);
    }
    if (params.pageSize || params.PageSize) {
      query.pageSize = Number(params.pageSize || params.PageSize);
    }

    const response = await axiosInstance.get(COMPANY_ENDPOINTS.COMPANIES, { params: query });
    const data = response.data || {};
    const items = Array.isArray(data.items) ? data.items.map(companyListItemFromApi) : [];

    return {
      items,
      pageNumber: data.pageNumber || 1,
      pageSize: data.pageSize || items.length,
      totalCount: data.totalCount ?? items.length,
      totalPages: data.totalPages || 1,
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 2. GET /api/companies/active — Returns lightweight active companies for pickers.
 */
export async function getActiveCompanies() {
  try {
    const response = await axiosInstance.get(COMPANY_ENDPOINTS.ACTIVE);
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 3. GET /api/companies/lookups — Dropdown values (bankAccountTypes, documentTypes, countries).
 */
export async function getCompanyLookups() {
  try {
    const response = await axiosInstance.get(COMPANY_ENDPOINTS.LOOKUPS);
    return response.data || { bankAccountTypes: [], documentTypes: [], countries: [] };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Master Dependency: GET /api/states?countryId={countryId}
 */
export async function getStatesByCountry(countryId) {
  try {
    const response = await axiosInstance.get(COMPANY_ENDPOINTS.STATES_BY_COUNTRY(countryId));
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 4. GET /api/companies/{id} — View single company with its bank accounts (no attachments).
 * Accepts numeric ID or extracts integer from string like 'COMP-001' or '1'.
 */
export async function getCompanyById(id) {
  try {
    const numericId = String(id).replace(/^\D+/g, '') || id;
    const response = await axiosInstance.get(COMPANY_ENDPOINTS.BY_ID(numericId));
    return companyDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 5. POST /api/companies — Register a company (Admin).
 * @param {object} formData
 */
export async function createCompany(formData) {
  try {
    const payload = companyToApiPayload(formData);
    const response = await axiosInstance.post(COMPANY_ENDPOINTS.COMPANIES, payload);
    return companyDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 6. PUT /api/companies/{id} — Edit a company (Admin).
 * @param {number|string} id
 * @param {object} formData
 */
export async function updateCompany(id, formData) {
  try {
    const numericId = String(id).replace(/^\D+/g, '') || id;
    const payload = companyToApiPayload(formData);
    const response = await axiosInstance.put(COMPANY_ENDPOINTS.BY_ID(numericId), payload);
    return companyDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 7. PATCH /api/companies/{id}/status — Activate / Deactivate company (Admin).
 * @param {number|string} id
 * @param {boolean} isActive
 */
export async function updateCompanyStatus(id, isActive) {
  try {
    const numericId = String(id).replace(/^\D+/g, '') || id;
    const response = await axiosInstance.patch(COMPANY_ENDPOINTS.STATUS(numericId), {
      isActive: Boolean(isActive),
    });
    return companyDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 8. DELETE /api/companies/{id} — Hard delete company and its bank accounts/documents (Admin).
 * @param {number|string} id
 */
export async function deleteCompany(id) {
  try {
    const numericId = String(id).replace(/^\D+/g, '') || id;
    await axiosInstance.delete(COMPANY_ENDPOINTS.BY_ID(numericId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

// ============================================================================
// 2. COMPANY BANK DETAILS SERVICES (Endpoints 9 - 14)
// ============================================================================

/**
 * 9. GET /api/companies/{id}/bank-details — List bank accounts of a company.
 * @param {number|string} companyId
 */
export async function getCompanyBankDetails(companyId) {
  try {
    const numericCompanyId = String(companyId).replace(/^\D+/g, '') || companyId;
    const response = await axiosInstance.get(COMPANY_ENDPOINTS.BANK_DETAILS_BY_COMPANY(numericCompanyId));
    return Array.isArray(response.data) ? response.data.map(bankDetailFromApi) : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 10. POST /api/companies/{id}/bank-details — Add a bank account for a company (Admin).
 * @param {number|string} companyId
 * @param {object} bankData
 */
export async function createCompanyBankDetail(companyId, bankData) {
  try {
    const numericCompanyId = String(companyId).replace(/^\D+/g, '') || companyId;
    const payload = bankDetailToApiPayload(bankData);
    const response = await axiosInstance.post(COMPANY_ENDPOINTS.BANK_DETAILS_BY_COMPANY(numericCompanyId), payload);
    return bankDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 11. GET /api/company-bank-details/{bankId} — One bank account with attachments populated.
 * @param {number|string} bankId
 */
export async function getCompanyBankDetailById(bankId) {
  try {
    const numericBankId = String(bankId).replace(/^\D+/g, '') || bankId;
    const response = await axiosInstance.get(COMPANY_ENDPOINTS.BANK_DETAIL_BY_ID(numericBankId));
    return bankDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 12. PUT /api/company-bank-details/{bankId} — Edit a bank account (Admin).
 * @param {number|string} bankId
 * @param {object} bankData
 */
export async function updateCompanyBankDetail(bankId, bankData) {
  try {
    const numericBankId = String(bankId).replace(/^\D+/g, '') || bankId;
    const payload = bankDetailToApiPayload(bankData);
    const response = await axiosInstance.put(COMPANY_ENDPOINTS.BANK_DETAIL_BY_ID(numericBankId), payload);
    return bankDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 13. PATCH /api/company-bank-details/{bankId}/status — Activate / Deactivate bank account (Admin).
 * @param {number|string} bankId
 * @param {boolean} isActive
 */
export async function updateCompanyBankStatus(bankId, isActive) {
  try {
    const numericBankId = String(bankId).replace(/^\D+/g, '') || bankId;
    const response = await axiosInstance.patch(COMPANY_ENDPOINTS.BANK_DETAIL_STATUS(numericBankId), {
      isActive: Boolean(isActive),
    });
    return bankDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 14. DELETE /api/company-bank-details/{bankId} — Hard delete a bank account and its documents (Admin).
 * @param {number|string} bankId
 */
export async function deleteCompanyBankDetail(bankId) {
  try {
    const numericBankId = String(bankId).replace(/^\D+/g, '') || bankId;
    await axiosInstance.delete(COMPANY_ENDPOINTS.BANK_DETAIL_BY_ID(numericBankId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

// ============================================================================
// 3. BANKING DOCUMENT SERVICES (Endpoints 15 - 18)
// ============================================================================

/**
 * 15. GET /api/company-bank-details/{bankId}/attachments — List documents of a bank account.
 * @param {number|string} bankId
 */
export async function getBankAttachments(bankId) {
  try {
    const numericBankId = String(bankId).replace(/^\D+/g, '') || bankId;
    const response = await axiosInstance.get(COMPANY_ENDPOINTS.ATTACHMENTS_BY_BANK(numericBankId));
    return Array.isArray(response.data) ? response.data.map(bankAttachmentFromApi) : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 16. POST /api/company-bank-details/{bankId}/attachments — Upload a document (Admin).
 * Matches Swagger parameters: DocumentTypeId, DocumentName, DocumentTitle, Remarks, File.
 *
 * @param {number|string} bankId
 * @param {number|object} docTypeOrData - documentTypeId OR object { documentTypeId, documentName, documentTitle, remarks, file }
 * @param {File|Blob} [fileArg] - File if second argument was documentTypeId
 */
export async function uploadBankAttachment(bankId, docTypeOrData, fileArg) {
  try {
    const numericBankId = String(bankId).replace(/^\D+/g, '') || bankId;
    const formData = new FormData();

    if (docTypeOrData && typeof docTypeOrData === 'object' && docTypeOrData.file) {
      formData.append('DocumentTypeId', String(docTypeOrData.documentTypeId || 1));
      if (docTypeOrData.documentName) formData.append('DocumentName', String(docTypeOrData.documentName));
      if (docTypeOrData.documentTitle) formData.append('DocumentTitle', String(docTypeOrData.documentTitle));
      if (docTypeOrData.remarks) formData.append('Remarks', String(docTypeOrData.remarks));
      formData.append('File', docTypeOrData.file);
    } else {
      formData.append('DocumentTypeId', String(docTypeOrData));
      formData.append('File', fileArg);
    }

    const response = await axiosInstance.post(
      COMPANY_ENDPOINTS.ATTACHMENTS_BY_BANK(numericBankId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return bankAttachmentFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 17. GET /api/company-bank-attachments/{attachmentId}/download — Download document stream.
 * Downloads with Bearer authentication and triggers browser download.
 * @param {string|number} downloadUrlOrAttachmentId - downloadUrl string or numeric ID
 * @param {string} fileName - File name to save as
 */
export async function downloadBankAttachment(downloadUrlOrAttachmentId, fileName = 'document') {
  try {
    let url = downloadUrlOrAttachmentId;
    if (typeof downloadUrlOrAttachmentId === 'number' || /^\d+$/.test(String(downloadUrlOrAttachmentId))) {
      url = COMPANY_ENDPOINTS.ATTACHMENT_DOWNLOAD(downloadUrlOrAttachmentId);
    }

    const response = await axiosInstance.get(url, {
      responseType: 'blob',
    });

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 18. DELETE /api/company-bank-attachments/{attachmentId} — Delete a document (Admin).
 * @param {number|string} attachmentId
 */
export async function deleteBankAttachment(attachmentId) {
  try {
    const numericId = String(attachmentId).replace(/^\D+/g, '') || attachmentId;
    await axiosInstance.delete(COMPANY_ENDPOINTS.ATTACHMENT_BY_ID(numericId));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

