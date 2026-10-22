/**
 * src/services/vendors/vendorService.mock.js — In-memory Mock Vendor API service.
 */

import { mockVendors } from '../../mocks/vendors';
import { INITIAL_VENDOR_BANK_DETAILS } from '../../mocks/vendorBankDetails';
import {
  vendorItemFromApi,
  vendorDetailFromApi,
  vendorVersionDetailFromApi,
  bankDetailFromApi,
} from '../../models/vendors/vendorModel';

let inMemoryVendors = [...mockVendors];
let inMemoryBankDetails = [...INITIAL_VENDOR_BANK_DETAILS];
let nextVendorId = inMemoryVendors.length + 10;
let nextBankId = inMemoryBankDetails.length + 10;

export async function listVendors(params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  let filtered = [...inMemoryVendors];

  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.vendorName?.toLowerCase().includes(q) ||
        v.vendorCode?.toLowerCase().includes(q) ||
        v.contactPersonName?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q)
    );
  }

  if (params.approvalStatus && params.approvalStatus !== 'ALL') {
    filtered = filtered.filter((v) => v.approvalStatus === params.approvalStatus);
  }

  if (params.isActive !== undefined && params.isActive !== null && params.isActive !== 'ALL') {
    const expected = typeof params.isActive === 'boolean'
      ? params.isActive
      : params.isActive === 'true' || params.isActive === 'ACTIVE';
    filtered = filtered.filter((v) => v.isActive === expected);
  }

  const totalCount = filtered.length;
  const pageNumber = Number(params.pageNumber) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (pageNumber - 1) * pageSize;
  const pagedItems = filtered.slice(start, start + pageSize).map((v) => ({
    vendorId: v.id || v.vendorId,
    vendorCode: v.vendorCode,
    vendorName: v.vendorName,
    approvalStatus: v.approvalStatus || 'Draft',
    hasPendingChange: false,
    isActive: v.isActive !== false,
    currentEffectiveDate: v.effectiveDate || '2026-10-22',
    contactPersonName: v.contactPersonName || '',
    phoneNo: v.phoneNo || '',
    email: v.email || '',
    gstNo: v.gstNo || '',
    city: v.city || '',
    createdOn: v.createdOn || new Date().toISOString(),
  }));

  return {
    items: pagedItems.map(vendorItemFromApi),
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
  };
}

export async function getVendor(id) {
  await new Promise((r) => setTimeout(r, 150));
  const found = inMemoryVendors.find((v) => String(v.id) === String(id) || String(v.vendorId) === String(id));
  if (!found) throw new Error('Vendor not found');

  return vendorDetailFromApi({
    vendorId: found.id || found.vendorId,
    vendorCode: found.vendorCode,
    vendorName: found.vendorName,
    approvalStatus: found.approvalStatus || 'Approved',
    hasPendingChange: false,
    isActive: found.isActive !== false,
    currentDetail: {
      ...found,
      vendorDetailId: 101,
      vendorId: found.id || found.vendorId,
      vendorCode: found.vendorCode,
      vendorName: found.vendorName,
      effectiveDate: found.effectiveDate || '2026-10-22',
    },
    versions: found.effectiveVersions || [],
    bankDetailCount: inMemoryBankDetails.filter((b) => String(b.vendorId) === String(id)).length,
  });
}

export async function getVendorVersion(versionId) {
  await new Promise((r) => setTimeout(r, 150));
  for (const v of inMemoryVendors) {
    const ver = (v.effectiveVersions || []).find((ev) => String(ev.id) === String(versionId) || String(ev.vendorDetailId) === String(versionId));
    if (ver) {
      return vendorVersionDetailFromApi({
        vendorDetailId: ver.id || versionId,
        vendorId: v.id || v.vendorId,
        vendorCode: v.vendorCode,
        vendorName: v.vendorName,
        effectiveDate: ver.effectiveDate || '2026-10-22',
        contactPersonName: ver.contactPersonName || v.contactPersonName,
        phoneNo: ver.phoneNo || v.phoneNo,
        alternatePhoneNo: ver.alternatePhoneNo || v.alternatePhoneNo,
        email: ver.email || v.email,
        website: ver.website || v.website,
        gstNo: ver.gstNo || v.gstNo,
        address1: ver.address1 || v.address1,
        address2: ver.address2 || v.address2,
        countryId: ver.countryId || v.countryId || 1,
        stateId: ver.stateId || v.stateId || 1,
        city: ver.city || v.city,
        zipCode: ver.zipCode || v.zipCode,
        notes: ver.notes || v.notes,
        isActive: ver.isActive !== false,
        approvalStatus: ver.approvalStatus || v.approvalStatus || 'Approved',
        versionState: ver.versionState || 'Current',
        attachments: ver.attachments || [],
      });
    }
  }

  // Fallback to first vendor version if not specifically found
  const first = inMemoryVendors[0] || {};
  return vendorVersionDetailFromApi({
    vendorDetailId: versionId,
    vendorId: first.id || 1,
    vendorCode: first.vendorCode || 'VEN-0001',
    vendorName: first.vendorName || 'Sample Vendor',
    effectiveDate: '2026-10-22',
    contactPersonName: first.contactPersonName || '',
    phoneNo: first.phoneNo || '',
    email: first.email || '',
    countryId: 1,
    stateId: 1,
    city: 'Pune',
    zipCode: '123456',
    isActive: true,
    approvalStatus: 'Pending',
    versionState: 'Pending',
    attachments: [],
  });
}

export async function createVendor(formData, submitForApproval = true) {
  await new Promise((r) => setTimeout(r, 300));
  const newId = nextVendorId++;
  const code = formData.vendorCode || `VEN-${String(newId).padStart(4, '0')}`;

  const newVendor = {
    id: newId,
    vendorId: newId,
    vendorCode: code,
    vendorName: formData.vendorName,
    approvalStatus: submitForApproval ? 'Pending' : 'Draft',
    isActive: true,
    effectiveDate: formData.effectiveDate || '2026-10-22',
    contactPersonName: formData.contactPersonName || '',
    phoneNo: formData.phoneNo || '',
    alternatePhoneNo: formData.alternatePhoneNo || '',
    email: formData.email || '',
    website: formData.website || '',
    gstNo: formData.gstNo || '',
    address1: formData.address1 || '',
    address2: formData.address2 || '',
    countryId: formData.countryId || 'IN',
    stateId: formData.stateId || 'GJ',
    city: formData.city || '',
    zipCode: formData.zipCode || '',
    notes: formData.notes || '',
    createdOn: new Date().toISOString(),
  };

  inMemoryVendors = [newVendor, ...inMemoryVendors];
  return getVendor(newId);
}

export async function updateVendorName(id, vendorName) {
  await new Promise((r) => setTimeout(r, 200));
  inMemoryVendors = inMemoryVendors.map((v) =>
    String(v.id) === String(id) ? { ...v, vendorName } : v
  );
  return { success: true };
}

export async function updateVendorStatus(id, { isActive, inactiveDate, inactiveComment }) {
  await new Promise((r) => setTimeout(r, 200));
  inMemoryVendors = inMemoryVendors.map((v) =>
    String(v.id) === String(id)
      ? { ...v, isActive, inactiveDate: !isActive ? inactiveDate : null, inactiveComment: !isActive ? inactiveComment : '' }
      : v
  );
  return { success: true };
}

export async function deleteVendor(id) {
  await new Promise((r) => setTimeout(r, 200));
  inMemoryVendors = inMemoryVendors.filter((v) => String(v.id) !== String(id));
  return { success: true };
}

export async function getVendorSummary() {
  await new Promise((r) => setTimeout(r, 150));
  return {
    total: inMemoryVendors.length,
    active: inMemoryVendors.filter((v) => v.isActive).length,
    inactive: inMemoryVendors.filter((v) => !v.isActive).length,
    draft: inMemoryVendors.filter((v) => v.approvalStatus === 'Draft').length,
    pendingApproval: inMemoryVendors.filter((v) => v.approvalStatus === 'Pending').length,
    rejected: inMemoryVendors.filter((v) => v.approvalStatus === 'Rejected').length,
    pendingChanges: 0,
  };
}

export async function getVendorLookups() {
  await new Promise((r) => setTimeout(r, 100));
  return {
    approvalStatuses: ['Draft', 'Pending', 'Approved', 'Rejected'],
    bankAccountTypes: ['Current', 'Savings', 'Cash Credit', 'Overdraft'],
    documentTypes: [
      { id: 1, documentTypeName: 'GST Certificate', allowedExtensions: '.pdf,.jpg,.jpeg,.png', maxFileSizeMB: 5 },
      { id: 2, documentTypeName: 'PAN Card', allowedExtensions: '.pdf,.jpg,.jpeg,.png', maxFileSizeMB: 5 },
      { id: 3, documentTypeName: 'MSME / Udyam Certificate', allowedExtensions: '.pdf,.jpg,.jpeg,.png', maxFileSizeMB: 5 },
      { id: 4, documentTypeName: 'ISO Certificate', allowedExtensions: '.pdf,.jpg,.jpeg,.png', maxFileSizeMB: 5 },
      { id: 5, documentTypeName: 'Bank Cancelled Cheque', allowedExtensions: '.pdf,.jpg,.jpeg,.png', maxFileSizeMB: 5 },
    ],
  };
}

export async function getVendorApprovalHistory(id) {
  await new Promise((r) => setTimeout(r, 100));
  return [];
}

export async function getVendorVersions(id) {
  await new Promise((r) => setTimeout(r, 100));
  const v = inMemoryVendors.find((v) => String(v.id) === String(id));
  return v?.effectiveVersions || [];
}

export async function createVendorVersion(id, formData) {
  await new Promise((r) => setTimeout(r, 200));
  return { success: true };
}

export async function getVendorBankDetails(vendorId) {
  await new Promise((r) => setTimeout(r, 150));
  return inMemoryBankDetails
    .filter((b) => String(b.vendorId) === String(vendorId))
    .map(bankDetailFromApi);
}

export async function createVendorBankDetail(vendorId, form) {
  await new Promise((r) => setTimeout(r, 200));
  const newBank = {
    id: nextBankId++,
    vendorId,
    ...form,
    isActive: true,
    createdOn: new Date().toISOString(),
  };
  inMemoryBankDetails.push(newBank);
  return bankDetailFromApi(newBank);
}

export async function getBankDetail(id) {
  await new Promise((r) => setTimeout(r, 100));
  const found = inMemoryBankDetails.find((b) => String(b.id) === String(id));
  return bankDetailFromApi(found);
}

export async function updateBankDetail(id, form) {
  await new Promise((r) => setTimeout(r, 200));
  inMemoryBankDetails = inMemoryBankDetails.map((b) =>
    String(b.id) === String(id) ? { ...b, ...form } : b
  );
  return getBankDetail(id);
}

export async function updateBankDetailStatus(id, isActive) {
  await new Promise((r) => setTimeout(r, 150));
  inMemoryBankDetails = inMemoryBankDetails.map((b) =>
    String(b.id) === String(id) ? { ...b, isActive } : b
  );
  return { success: true };
}

export async function getBankDetailAttachments(id) {
  await new Promise((r) => setTimeout(r, 100));
  const b = inMemoryBankDetails.find((b) => String(b.id) === String(id));
  return b?.attachments || [];
}

export async function uploadBankDetailAttachment(id, { documentTypeId, documentName, file }) {
  await new Promise((r) => setTimeout(r, 300));
  return {
    id: Date.now(),
    documentTypeId,
    documentName: documentName || file.name,
    fileName: file.name,
    fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
    downloadUrl: URL.createObjectURL(file),
    uploadedOn: new Date().toISOString(),
  };
}
