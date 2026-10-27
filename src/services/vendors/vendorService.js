/**
 * src/services/vendors/vendorService.js — Real Vendor API service communicating with backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { VENDOR_ENDPOINTS } from './vendorEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  vendorItemFromApi,
  vendorDetailFromApi,
  vendorVersionDetailFromApi,
  vendorToApiCreate,
  vendorVersionToApi,
  bankDetailFromApi,
  bankDetailToApi,
} from '../../models/vendors/vendorModel';

/**
 * Lists vendors with server-side pagination, search, and status filters.
 * @param {{ search?: string, approvalStatus?: string, isActive?: boolean|string, hasPendingChange?: boolean, pageNumber?: number, pageSize?: number }} [params]
 */
export async function listVendors(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.Search = params.search.trim();
    if (params.approvalStatus && params.approvalStatus !== 'ALL') {
      query.ApprovalStatus = params.approvalStatus;
    }
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== 'ALL') {
      query.IsActive = typeof params.isActive === 'boolean'
        ? params.isActive
        : params.isActive === 'true' || params.isActive === 'ACTIVE';
    }
    if (params.hasPendingChange !== undefined && params.hasPendingChange !== null) {
      query.HasPendingChange = Boolean(params.hasPendingChange);
    }
    if (params.pageNumber) query.PageNumber = Number(params.pageNumber);
    if (params.pageSize) query.PageSize = Number(params.pageSize);

    const response = await axiosInstance.get(VENDOR_ENDPOINTS.VENDORS, { params: query });
    const data = response.data || {};
    const items = Array.isArray(data.items) ? data.items.map(vendorItemFromApi) : [];

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

function cleanId(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  const match = str.match(/\d+/);
  return match ? Number(match[0]) : str;
}

/**
 * Returns complete single vendor master detail by ID.
 * @param {string|number} id
 */
export async function getVendor(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.VENDOR_BY_ID(validId));
    const vendor = vendorDetailFromApi(response.data);

    // If currentDetail was null (e.g. Pending vendor), fetch the open version details
    const targetVersionId = response.data?.openVersion?.vendorDetailId || response.data?.versions?.[0]?.vendorDetailId;
    if (response.data && !response.data.currentDetail && targetVersionId) {
      try {
        const verDetail = await getVendorVersion(targetVersionId);
        if (verDetail) {
          return {
            ...vendor,
            ...verDetail,
            id: vendor.id,
            vendorId: vendor.id,
            vendorName: vendor.vendorName || verDetail.vendorName,
            vendorCode: vendor.vendorCode || verDetail.vendorCode,
            approvalStatus: vendor.approvalStatus || verDetail.approvalStatus,
            effectiveVersions: vendor.effectiveVersions,
          };
        }
      } catch (verErr) {
        console.warn('Could not fetch open version details:', verErr);
      }
    }

    return vendor;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Registers a new Vendor as a Draft first version.
 * @param {object} formData
 * @param {boolean} [submitForApproval=true]
 */
export async function createVendor(formData, submitForApproval = true) {
  try {
    const rawFiles = (formData.attachments || []).filter(
      (a) => a.file || a.rawFile
    );
    const hasAttachments = rawFiles.length > 0;

    // As per Integration Guide (p. 13):
    // If uploading attachments, register with submitForApproval = false
    // so the initial version remains in Draft state to accept uploads.
    const initialSubmit = hasAttachments ? false : submitForApproval;

    const payload = vendorToApiCreate(formData, initialSubmit);
    const response = await axiosInstance.post(VENDOR_ENDPOINTS.VENDORS, payload);
    const createdVendor = vendorDetailFromApi(response.data) || response.data;

    if (hasAttachments) {
      const openVersionId =
        response.data?.openVersion?.vendorDetailId ||
        response.data?.versions?.[0]?.vendorDetailId ||
        createdVendor?.openVersion?.vendorDetailId ||
        createdVendor?.openVersion?.id ||
        createdVendor?.vendorDetailId;

      if (openVersionId) {
        for (const att of rawFiles) {
          try {
            await uploadVersionAttachment(openVersionId, {
              documentTypeId: att.documentTypeId || 1,
              documentName: att.documentName || att.fileName,
              file: att.file || att.rawFile,
            });
          } catch (uploadErr) {
            console.warn('Failed to upload version attachment:', att.fileName, uploadErr);
          }
        }

        if (submitForApproval) {
          try {
            await submitVendorVersion(openVersionId);
            createdVendor.approvalStatus = 'Pending';
          } catch (subErr) {
            console.warn('Failed to submit vendor version for approval:', subErr);
          }
        }
      }
    }

    return createdVendor;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Renames a vendor header (Admin only).
 * @param {string|number} id
 * @param {string} vendorName
 */
export async function updateVendorName(id, vendorName) {
  try {
    const payload = { vendorName: String(vendorName).trim() };
    const response = await axiosInstance.put(VENDOR_ENDPOINTS.VENDOR_BY_ID(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Activates or deactivates an approved vendor.
 * @param {string|number} id
 * @param {{ isActive: boolean, inactiveDate?: string, inactiveComment?: string }} statusData
 */
export async function updateVendorStatus(id, { isActive, inactiveDate, inactiveComment }) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dateOnly = inactiveDate ? String(inactiveDate).slice(0, 10) : today;
    const payload = {
      isActive: Boolean(isActive),
      inactiveDate: !isActive ? dateOnly : null,
      inactiveComment: !isActive ? String(inactiveComment || '').trim() : '',
    };
    const response = await axiosInstance.patch(VENDOR_ENDPOINTS.STATUS(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes a vendor that was never approved.
 * @param {string|number} id
 */
export async function deleteVendor(id) {
  try {
    const response = await axiosInstance.delete(VENDOR_ENDPOINTS.VENDOR_BY_ID(id));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves dashboard summary counts.
 */
export async function getVendorSummary() {
  try {
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.SUMMARY);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves dropdown lookups (approvalStatuses, bankAccountTypes, documentTypes).
 */
export async function getVendorLookups() {
  try {
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.LOOKUPS);
    return response.data || {
      approvalStatuses: ['Draft', 'Pending', 'Approved', 'Rejected'],
      bankAccountTypes: ['Current', 'Savings', 'Cash Credit', 'Overdraft'],
      documentTypes: [],
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves all approval history requests for the vendor.
 * @param {string|number} id
 */
export async function getVendorApprovalHistory(id) {
  try {
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.APPROVAL_HISTORY(id));
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves version timeline list for a vendor.
 * @param {string|number} id
 */
export async function getVendorVersions(id) {
  try {
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.VERSIONS(id));
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves full single vendor version details by version ID.
 * GET /api/vendor-versions/{id}
 * @param {string|number} versionId
 */
export async function getVendorVersion(versionId) {
  try {
    const validId = cleanId(versionId);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.VENDOR_VERSION_BY_ID(validId));
    return vendorVersionDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an editable Draft or Rejected vendor version.
 * PUT /api/vendor-versions/{versionId}
 * @param {string|number} versionId
 * @param {object} formData
 */
export async function editVendorVersion(versionId, formData) {
  try {
    const validId = cleanId(versionId);
    const payload = vendorVersionToApi(formData, false, false);
    // PUT requires detail fields: effectiveDate, contactPersonName, etc.
    const response = await axiosInstance.put(VENDOR_ENDPOINTS.VENDOR_VERSION_BY_ID(validId), {
      effectiveDate: payload.effectiveDate,
      contactPersonName: payload.contactPersonName,
      phoneNo: payload.phoneNo,
      alternatePhoneNo: payload.alternatePhoneNo,
      email: payload.email,
      website: payload.website,
      gstNo: payload.gstNo,
      address1: payload.address1,
      address2: payload.address2,
      countryId: payload.countryId,
      stateId: payload.stateId,
      city: payload.city,
      zipCode: payload.zipCode,
      notes: payload.notes,
    });
    return vendorVersionDetailFromApi(response.data) || response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes a Draft or Rejected vendor version (not the vendor's only version).
 * DELETE /api/vendor-versions/{versionId}
 * @param {string|number} versionId
 */
export async function deleteVendorVersion(versionId) {
  try {
    const validId = cleanId(versionId);
    const response = await axiosInstance.delete(VENDOR_ENDPOINTS.VENDOR_VERSION_BY_ID(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Submits a Draft or Rejected vendor version for approval.
 * POST /api/vendor-versions/{versionId}/submit
 * @param {string|number} versionId
 * @param {{ comments?: string, autoApprove?: boolean }} [options]
 */
export async function submitVendorVersion(versionId, { comments, autoApprove } = {}) {
  try {
    const validId = cleanId(versionId);
    const payload = {};
    if (comments?.trim()) payload.comments = comments.trim();
    if (autoApprove) payload.autoApprove = true;

    const response = await axiosInstance.post(VENDOR_ENDPOINTS.SUBMIT_VERSION(validId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves the documents attached to a specific vendor version.
 * GET /api/vendor-versions/{versionId}/attachments
 * @param {string|number} versionId
 */
export async function getVersionAttachments(versionId) {
  try {
    const validId = cleanId(versionId);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.VERSION_ATTACHMENTS(validId));
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Uploads a document to a vendor version (multipart/form-data: DocumentTypeId, DocumentName, File).
 * POST /api/vendor-versions/{versionId}/attachments
 * @param {string|number} versionId
 * @param {{ documentTypeId: number|string, documentName?: string, file: File }} data
 */
export async function uploadVersionAttachment(versionId, { documentTypeId, documentName, file }) {
  try {
    const validId = cleanId(versionId);
    const formData = new FormData();
    formData.append('DocumentTypeId', String(documentTypeId));
    if (documentName) formData.append('DocumentName', documentName);
    formData.append('File', file);

    const response = await axiosInstance.post(
      VENDOR_ENDPOINTS.VERSION_ATTACHMENTS(validId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Downloads a vendor attachment by attachment ID as a blob and triggers browser download.
 * GET /api/vendor-attachments/{attachmentId}/download
 * @param {string|number} attachmentId
 * @param {string} [fileName]
 */
export async function downloadVendorAttachment(attachmentId, fileName = 'attachment') {
  try {
    const validId = cleanId(attachmentId);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.DOWNLOAD_ATTACHMENT(validId), {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes an attachment from a Draft or Rejected vendor version.
 * DELETE /api/vendor-attachments/{attachmentId}
 * @param {string|number} attachmentId
 */
export async function deleteVendorAttachment(attachmentId) {
  try {
    const validId = cleanId(attachmentId);
    const response = await axiosInstance.delete(VENDOR_ENDPOINTS.DELETE_ATTACHMENT(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Starts a new revision version for an approved vendor.
 * POST /api/vendors/{id}/versions
 * @param {string|number} id
 * @param {object} formData
 * @param {boolean} [copyAttachments=true]
 * @param {boolean} [submitForApproval=true]
 */
export async function createVendorVersion(id, formData, copyAttachments = true, submitForApproval = true) {
  try {
    const validId = cleanId(id);
    const payload = vendorVersionToApi(formData, copyAttachments, submitForApproval);
    const response = await axiosInstance.post(VENDOR_ENDPOINTS.VERSIONS(validId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   VENDOR BANK DETAILS METHODS
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * Lists all vendor bank details for grid with server-side search, filtering, and paging.
 * GET /api/vendor-bank-details
 * @param {{ search?: string, vendorId?: number|string, accountType?: string, isActive?: boolean|string, pageNumber?: number, pageSize?: number }} [params]
 */
export async function listVendorBankDetails(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.Search = params.search.trim();
    if (params.vendorId && params.vendorId !== 'ALL') {
      query.VendorId = cleanId(params.vendorId);
    }
    if (params.accountType && params.accountType !== 'ALL') {
      query.AccountType = String(params.accountType).trim();
    }
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== 'ALL') {
      query.IsActive = typeof params.isActive === 'boolean'
        ? params.isActive
        : params.isActive === 'true' || params.isActive === 'ACTIVE';
    }
    if (params.pageNumber) query.PageNumber = Number(params.pageNumber);
    if (params.pageSize) query.PageSize = Number(params.pageSize);

    const response = await axiosInstance.get(VENDOR_ENDPOINTS.ALL_VENDOR_BANK_DETAILS, {
      params: query,
    });
    const data = response.data || {};
    const rawItems = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : [];
    const items = rawItems.map(bankDetailFromApi);

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
 * Lists bank accounts of a specific vendor.
 * @param {string|number} vendorId
 */
export async function getVendorBankDetails(vendorId) {
  try {
    const validId = cleanId(vendorId);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.VENDOR_BANK_DETAILS(validId));
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(bankDetailFromApi);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Adds a new bank account for a vendor.
 * @param {string|number} vendorId
 * @param {object} form
 */
export async function createVendorBankDetail(vendorId, form) {
  try {
    const validId = cleanId(vendorId);
    const payload = bankDetailToApi(form);
    const response = await axiosInstance.post(VENDOR_ENDPOINTS.VENDOR_BANK_DETAILS(validId), payload);
    return bankDetailFromApi(response.data) || response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Gets a single bank account with full account number and documents.
 * @param {string|number} id
 */
export async function getBankDetail(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.BANK_DETAIL_BY_ID(validId));
    return bankDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing bank account.
 * @param {string|number} id
 * @param {object} form
 */
export async function updateBankDetail(id, form) {
  try {
    const validId = cleanId(id);
    const payload = bankDetailToApi(form);
    const response = await axiosInstance.put(VENDOR_ENDPOINTS.BANK_DETAIL_BY_ID(validId), payload);
    return bankDetailFromApi(response.data) || response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Activates or deactivates a bank account.
 * @param {string|number} id
 * @param {boolean} isActive
 */
export async function updateBankDetailStatus(id, isActive) {
  try {
    const validId = cleanId(id);
    const payload = { isActive: Boolean(isActive) };
    const response = await axiosInstance.patch(VENDOR_ENDPOINTS.BANK_DETAIL_STATUS(validId), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Retrieves banking-proof documents for a bank account.
 * @param {string|number} id
 */
export async function getBankDetailAttachments(id) {
  try {
    const validId = cleanId(id);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.BANK_DETAIL_ATTACHMENTS(validId));
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}


/**
 * Uploads a banking document (multipart/form-data: DocumentTypeId, DocumentName?, File).
 * @param {string|number} id
 * @param {{ documentTypeId: number|string, documentName?: string, file: File }} attachmentData
 */
export async function uploadBankDetailAttachment(id, { documentTypeId, documentName, file }) {
  try {
    const validId = cleanId(id);
    const formData = new FormData();
    formData.append('DocumentTypeId', String(documentTypeId));
    if (documentName) formData.append('DocumentName', documentName);
    formData.append('File', file);

    const response = await axiosInstance.post(
      VENDOR_ENDPOINTS.BANK_DETAIL_ATTACHMENTS(validId),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}


/**
 * Downloads a bank document attachment as a blob and triggers browser download.
 * GET /api/vendor-bank-attachments/{attachmentId}/download
 * @param {string|number} attachmentId
 * @param {string} [fileName]
 */
export async function downloadBankAttachment(attachmentId, fileName = 'bank_attachment') {
  try {
    const validId = cleanId(attachmentId);
    const response = await axiosInstance.get(VENDOR_ENDPOINTS.BANK_DOWNLOAD_ATTACHMENT(validId), {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes a bank document attachment.
 * DELETE /api/vendor-bank-attachments/{attachmentId}
 * @param {string|number} attachmentId
 */
export async function deleteBankAttachment(attachmentId) {
  try {
    const validId = cleanId(attachmentId);
    const response = await axiosInstance.delete(VENDOR_ENDPOINTS.BANK_DELETE_ATTACHMENT(validId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Confirms the signed-in user's password for vendor bank operations.
 * POST /api/vendors/{vendorId}/bank-authentication
 * @param {string|number} vendorId
 * @param {string} password
 */
export async function authenticateVendorBank(vendorId, password) {
  try {
    const validId = cleanId(vendorId);
    const response = await axiosInstance.post(
      VENDOR_ENDPOINTS.BANK_AUTHENTICATION(validId),
      { password: String(password) }
    );
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

