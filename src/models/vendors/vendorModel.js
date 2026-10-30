/**
 * src/models/vendors/vendorModel.js — Bidirectional Data Model Transformers for Vendors & Bank Details.
 *
 * Normalizes backend responses to frontend UI representations and converts form state into backend DTOs.
 */

import { normalizeApprovalStatus, ApprovalStatusLabel } from '../../constants/approvalStatus';

// Country Code <-> ID bidirectional helper map
const COUNTRY_CODE_TO_ID = {
  IN: 1,
  US: 2,
  DE: 3,
  JP: 4,
  GB: 5,
  SG: 6,
  AE: 7,
};

const COUNTRY_ID_TO_CODE = {
  1: 'IN',
  2: 'US',
  3: 'DE',
  4: 'JP',
  5: 'GB',
  6: 'SG',
  7: 'AE',
};

// State Code <-> ID bidirectional helper map
const STATE_CODE_TO_ID = {
  GJ: 1,
  MH: 2,
  KA: 3,
  TN: 4,
  DL: 5,
  HR: 6,
  RJ: 7,
  UP: 8,
  TS: 9,
  WB: 10,
};

const STATE_ID_TO_CODE = {
  1: 'GJ',
  2: 'MH',
  3: 'KA',
  4: 'TN',
  5: 'DL',
  6: 'HR',
  7: 'RJ',
  8: 'UP',
  9: 'TS',
  10: 'WB',
};

export function normalizeCountryId(value) {
  if (typeof value === 'number' && !isNaN(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    const upper = value.trim().toUpperCase();
    if (upper === 'IN') return 2;
    if (COUNTRY_CODE_TO_ID[upper]) return COUNTRY_CODE_TO_ID[upper];
  }
  return 2; // Default to India (2 in live API)
}

export function countryIdToCode(id) {
  if (!id) return '';
  return id;
}

export function normalizeStateId(value) {
  if (typeof value === 'number' && !isNaN(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    const upper = value.trim().toUpperCase();
    if (upper === 'GJ') return 3;
    if (STATE_CODE_TO_ID[upper]) return STATE_CODE_TO_ID[upper];
  }
  return value || '';
}

export function stateIdToCode(id) {
  if (!id) return '';
  return id;
}

/**
 * Transforms a Vendor list item from GET /api/vendors to the UI vendor row format.
 */
export function vendorItemFromApi(apiItem) {
  if (!apiItem) return null;

  const id = apiItem.vendorId ?? apiItem.id;
  const effDate = apiItem.currentEffectiveDate ? apiItem.currentEffectiveDate.slice(0, 10) : '';
  const numericStatus = normalizeApprovalStatus(apiItem.approvalStatus);

  return {
    id,
    vendorId: id,
    vendorCode: apiItem.vendorCode || '',
    vendorName: apiItem.vendorName || '',
    approvalStatus: numericStatus,
    statusLabel: ApprovalStatusLabel[numericStatus] || 'Pending',
    hasPendingChange: Boolean(apiItem.hasPendingChange),
    isActive: Boolean(apiItem.isActive),
    effectiveDate: effDate,
    currentEffectiveDate: effDate,
    contactPersonName: apiItem.contactPersonName || '',
    phoneNo: apiItem.phoneNo || '',
    email: apiItem.email || '',
    gstNo: apiItem.gstNo || '',
    city: apiItem.city || '',
    approvedBy: apiItem.approvedBy || null,
    approvedByName: apiItem.approvedByName || null,
    approvedOn: apiItem.approvedOn || null,
    createdOn: apiItem.createdOn || '',
  };
}

/**
 * Transforms a full Vendor detail from GET /api/vendors/{id} to the UI model.
 */
export function vendorDetailFromApi(apiVendor) {
  if (!apiVendor) return null;

  const id = apiVendor.vendorId ?? apiVendor.id;
  const versions = Array.isArray(apiVendor.versions) ? apiVendor.versions : [];
  const openVersion = apiVendor.openVersion || null;
  const currentDetail = apiVendor.currentDetail || openVersion || (versions.length > 0 ? versions[0] : {}) || {};

  const rawCountry = currentDetail.countryId;
  const rawState = currentDetail.stateId;
  const numericStatus = normalizeApprovalStatus(apiVendor.approvalStatus ?? currentDetail.approvalStatus);

  return {
    id,
    vendorId: id,
    vendorCode: apiVendor.vendorCode || currentDetail.vendorCode || '',
    vendorName: apiVendor.vendorName || currentDetail.vendorName || '',
    approvalStatus: numericStatus,
    statusLabel: ApprovalStatusLabel[numericStatus] || 'Draft',
    hasPendingChange: Boolean(apiVendor.hasPendingChange),
    isActive: apiVendor.isActive !== false,
    createdOn: apiVendor.createdOn || currentDetail.createdOn || '',
    lastUpdatedOn: apiVendor.lastUpdatedOn || currentDetail.lastUpdatedOn || '',
    bankDetailCount: apiVendor.bankDetailCount || 0,

    // Approval info (per Guide: approvedBy, approvedByName, approvedOn)
    approvedBy: apiVendor.approvedBy ?? currentDetail.approvedBy ?? null,
    approvedByName: apiVendor.approvedByName ?? currentDetail.approvedByName ?? null,
    approvedOn: apiVendor.approvedOn ?? currentDetail.approvedOn ?? null,

    // Detail fields
    vendorDetailId: currentDetail.vendorDetailId,
    effectiveDate: currentDetail.effectiveDate ? currentDetail.effectiveDate.slice(0, 10) : '',
    contactPersonName: currentDetail.contactPersonName || '',
    phoneNo: currentDetail.phoneNo || '',
    alternatePhoneNo: currentDetail.alternatePhoneNo || '',
    email: currentDetail.email || '',
    website: currentDetail.website || '',
    gstNo: currentDetail.gstNo || '',
    address1: currentDetail.address1 || '',
    address2: currentDetail.address2 || '',
    countryId: countryIdToCode(rawCountry),
    rawCountryId: rawCountry,
    stateId: stateIdToCode(rawState),
    rawStateId: rawState,
    city: currentDetail.city || '',
    zipCode: currentDetail.zipCode || '',
    notes: currentDetail.notes || '',
    inactiveDate: currentDetail.inactiveDate || null,
    inactiveComment: currentDetail.inactiveComment || '',
    versionState: currentDetail.versionState || 'Current',
    attachments: Array.isArray(currentDetail.attachments) ? currentDetail.attachments : [],
    latestApprovalRequest: currentDetail.latestApprovalRequest || null,

    // Versions array
    openVersion,
    versions,
    currentDetail,
    effectiveVersions: versions.length > 0
      ? [...versions]
          .sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''))
          .map((v) => {
            const isCurrent = currentDetail && String(v.vendorDetailId) === String(currentDetail.vendorDetailId);
            const vStatus = normalizeApprovalStatus(v.approvalStatus || (isCurrent ? currentDetail.approvalStatus : 3));
            return {
              id: v.vendorDetailId,
              vendorDetailId: v.vendorDetailId,
              effectiveDate: v.effectiveDate ? v.effectiveDate.slice(0, 10) : '',
              approvalStatus: vStatus,
              statusLabel: ApprovalStatusLabel[vStatus] || 'Approved',
              versionState: v.versionState || (isCurrent ? currentDetail.versionState || 'Current' : 'History'),
              isActive: v.isActive !== false,
              attachmentCount: v.attachmentCount ?? (isCurrent ? (currentDetail.attachments?.length || 0) : 0),
              approvedBy: v.approvedBy ?? (isCurrent ? currentDetail.approvedBy : null),
              approvedByName: v.approvedByName ?? (isCurrent ? currentDetail.approvedByName : null),
              approvedOn: v.approvedOn ?? (isCurrent ? currentDetail.approvedOn : null),
              createdOn: v.createdOn || (isCurrent ? currentDetail.createdOn : ''),
              lastUpdatedOn: v.lastUpdatedOn || (isCurrent ? currentDetail.lastUpdatedOn : ''),
              ...(isCurrent
                ? {
                    contactPersonName: currentDetail.contactPersonName || '',
                    phoneNo: currentDetail.phoneNo || '',
                    alternatePhoneNo: currentDetail.alternatePhoneNo || '',
                    email: currentDetail.email || '',
                    website: currentDetail.website || '',
                    gstNo: currentDetail.gstNo || '',
                    address1: currentDetail.address1 || '',
                    address2: currentDetail.address2 || '',
                    countryId: countryIdToCode(rawCountry),
                    rawCountryId: rawCountry,
                    stateId: stateIdToCode(rawState),
                    rawStateId: rawState,
                    city: currentDetail.city || '',
                    zipCode: currentDetail.zipCode || '',
                    notes: currentDetail.notes || '',
                    attachments: Array.isArray(currentDetail.attachments) ? currentDetail.attachments : [],
                    latestApprovalRequest: currentDetail.latestApprovalRequest || null,
                  }
                : {}),
            };
          })
      : [
          {
            id: currentDetail.vendorDetailId || id,
            vendorDetailId: currentDetail.vendorDetailId || id,
            effectiveDate: currentDetail.effectiveDate ? currentDetail.effectiveDate.slice(0, 10) : '',
            approvalStatus: numericStatus,
            statusLabel: ApprovalStatusLabel[numericStatus] || 'Approved',
            versionState: currentDetail.versionState || 'Current',
            isActive: currentDetail.isActive !== false,
            attachmentCount: currentDetail.attachments?.length || 0,
            approvedBy: currentDetail.approvedBy || null,
            approvedByName: currentDetail.approvedByName || null,
            approvedOn: currentDetail.approvedOn || null,
            contactPersonName: currentDetail.contactPersonName || '',
            phoneNo: currentDetail.phoneNo || '',
            alternatePhoneNo: currentDetail.alternatePhoneNo || '',
            email: currentDetail.email || '',
            website: currentDetail.website || '',
            gstNo: currentDetail.gstNo || '',
            address1: currentDetail.address1 || '',
            address2: currentDetail.address2 || '',
            countryId: countryIdToCode(rawCountry),
            rawCountryId: rawCountry,
            stateId: stateIdToCode(rawState),
            rawStateId: rawState,
            city: currentDetail.city || '',
            zipCode: currentDetail.zipCode || '',
            notes: currentDetail.notes || '',
            attachments: Array.isArray(currentDetail.attachments) ? currentDetail.attachments : [],
            latestApprovalRequest: currentDetail.latestApprovalRequest || null,
            createdOn: currentDetail.createdOn || '',
          },
        ],
  };
}

/**
 * Transforms a Vendor Version detail from GET /api/vendor-versions/{id} to the UI model.
 */
export function vendorVersionDetailFromApi(apiVersion) {
  if (!apiVersion) return null;

  const rawCountry = apiVersion.countryId;
  const rawState = apiVersion.stateId;
  const numericStatus = normalizeApprovalStatus(apiVersion.approvalStatus);

  return {
    id: apiVersion.vendorDetailId,
    vendorDetailId: apiVersion.vendorDetailId,
    vendorId: apiVersion.vendorId,
    vendorCode: apiVersion.vendorCode || '',
    vendorName: apiVersion.vendorName || '',
    effectiveDate: apiVersion.effectiveDate ? apiVersion.effectiveDate.slice(0, 10) : '',
    contactPersonName: apiVersion.contactPersonName || '',
    phoneNo: apiVersion.phoneNo || '',
    alternatePhoneNo: apiVersion.alternatePhoneNo || '',
    email: apiVersion.email || '',
    website: apiVersion.website || '',
    gstNo: apiVersion.gstNo || '',
    address1: apiVersion.address1 || '',
    address2: apiVersion.address2 || '',
    countryId: countryIdToCode(rawCountry),
    rawCountryId: rawCountry,
    stateId: stateIdToCode(rawState),
    rawStateId: rawState,
    city: apiVersion.city || '',
    zipCode: apiVersion.zipCode || '',
    notes: apiVersion.notes || '',
    isActive: apiVersion.isActive !== false,
    inactiveDate: apiVersion.inactiveDate || null,
    inactiveComment: apiVersion.inactiveComment || '',
    approvalStatus: numericStatus,
    statusLabel: ApprovalStatusLabel[numericStatus] || 'Draft',
    versionState: apiVersion.versionState || 'Current',
    approvedBy: apiVersion.approvedBy || null,
    approvedByName: apiVersion.approvedByName || null,
    approvedOn: apiVersion.approvedOn || null,
    attachments: Array.isArray(apiVersion.attachments) ? apiVersion.attachments : [],
    latestApprovalRequest: apiVersion.latestApprovalRequest || null,
    createdOn: apiVersion.createdOn || '',
    lastUpdatedOn: apiVersion.lastUpdatedOn || '',
  };
}

/**
 * Transforms UI Form state to POST /api/vendors request body.
 */
export function vendorToApiCreate(form, submitForApproval = true) {
  const effectiveDate = form.effectiveDate
    ? String(form.effectiveDate).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const rawCode = String(form.vendorCode || '').trim();
  // Backend automatically assigns sequential codes like VEN-0001.
  // Leaving vendorCode empty tells the backend to generate it.
  const vendorCode = /^VEN-\d+$/i.test(rawCode) ? '' : rawCode;

  return {
    vendorName: String(form.vendorName || '').trim(),
    vendorCode,
    detail: {
      effectiveDate,
      contactPersonName: String(form.contactPersonName || '').trim(),
      phoneNo: String(form.phoneNo || '').trim(),
      alternatePhoneNo: String(form.alternatePhoneNo || '').trim(),
      email: String(form.email || '').trim(),
      website: String(form.website || '').trim(),
      gstNo: String(form.gstNo || '').trim().toUpperCase(),
      address1: String(form.address1 || '').trim(),
      address2: String(form.address2 || '').trim(),
      countryId: normalizeCountryId(form.countryId),
      stateId: normalizeStateId(form.stateId),
      city: String(form.city || '').trim(),
      zipCode: String(form.zipCode || '').trim(),
      notes: String(form.notes || '').trim(),
    },
    submitForApproval: Boolean(submitForApproval),
  };
}

/**
 * Transforms UI Form state to POST /api/vendors/{id}/versions request body.
 */
export function vendorVersionToApi(form, copyAttachments = true, submitForApproval = true) {
  const effectiveDate = form.effectiveDate
    ? String(form.effectiveDate).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return {
    effectiveDate,
    contactPersonName: String(form.contactPersonName || '').trim(),
    phoneNo: String(form.phoneNo || '').trim(),
    alternatePhoneNo: String(form.alternatePhoneNo || '').trim(),
    email: String(form.email || '').trim(),
    website: String(form.website || '').trim(),
    gstNo: String(form.gstNo || '').trim().toUpperCase(),
    address1: String(form.address1 || '').trim(),
    address2: String(form.address2 || '').trim(),
    countryId: normalizeCountryId(form.countryId),
    stateId: normalizeStateId(form.stateId),
    city: String(form.city || '').trim(),
    zipCode: String(form.zipCode || '').trim(),
    notes: String(form.notes || '').trim(),
    copyAttachments: Boolean(copyAttachments),
    submitForApproval: Boolean(submitForApproval),
  };
}

/**
 * Transforms Bank Detail DTO from API to UI representation.
 */
export function bankDetailFromApi(apiBank) {
  if (!apiBank) return null;
  const id = apiBank.id ?? apiBank.bankDetailId;

  return {
    id,
    bankDetailId: id,
    vendorId: apiBank.vendorId,
    vendorCode: apiBank.vendorCode || '',
    vendorName: apiBank.vendorName || '',
    accountName: apiBank.accountName || apiBank.accountHolderName || apiBank.bankName || '',
    accountHolderName: apiBank.accountHolderName || '',
    bankName: apiBank.bankName || '',
    branchName: apiBank.branchName || '',
    accountNumber: apiBank.accountNumber || '',
    accountType: apiBank.accountType || 'Current',
    ifscCode: apiBank.ifscCode || '',
    micrCode: apiBank.micrCode || '',
    iban: apiBank.iban || '',
    swiftCode: apiBank.swiftCode || '',
    branchAddress: apiBank.branchAddress || '',
    remarks: apiBank.remarks || '',
    isActive: apiBank.isActive !== false,
    attachmentCount: apiBank.attachmentCount ?? (Array.isArray(apiBank.attachments) ? apiBank.attachments.length : 0),
    attachments: Array.isArray(apiBank.attachments) ? apiBank.attachments : [],
    createdOn: apiBank.createdOn || '',
    createdAt: apiBank.createdOn || '',
    lastUpdatedOn: apiBank.lastUpdatedOn || '',
    updatedAt: apiBank.lastUpdatedOn || '',
  };
}

/**
 * Transforms UI Form to Bank Detail request body for POST or PUT.
 */
export function bankDetailToApi(form) {
  return {
    accountName: String(form.accountName || form.accountHolderName || form.bankName || '').trim(),
    accountHolderName: String(form.accountHolderName || '').trim(),
    bankName: String(form.bankName || '').trim(),
    branchName: String(form.branchName || '').trim(),
    accountNumber: String(form.accountNumber || '').trim(),
    accountType: String(form.accountType || 'Current').trim(),
    ifscCode: String(form.ifscCode || '').trim().toUpperCase(),
    micrCode: String(form.micrCode || '').trim(),
    iban: String(form.iban || '').trim().toUpperCase(),
    swiftCode: String(form.swiftCode || '').trim().toUpperCase(),
    branchAddress: String(form.branchAddress || '').trim(),
    remarks: String(form.remarks || '').trim(),
  };
}

