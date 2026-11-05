/**
 * src/models/companies/companyModel.js — Normalization and DTO serializers for Companies & Company Bank Details.
 *
 * Designed to seamlessly bridge the backend API schema (Company API Integration Guide)
 * and the existing frontend UI property conventions without breaking any functionality.
 */

/**
 * Normalizes a company list item from the API into a consistent shape.
 */
export function companyListItemFromApi(apiItem) {
  if (!apiItem) return null;
  const companyId =
    apiItem.companyId !== undefined && apiItem.companyId !== null
      ? apiItem.companyId
      : apiItem.CompanyId !== undefined && apiItem.CompanyId !== null
        ? apiItem.CompanyId
        : apiItem.id !== undefined && apiItem.id !== null && !isNaN(Number(apiItem.id))
          ? Number(apiItem.id)
          : apiItem.Id !== undefined && apiItem.Id !== null && !isNaN(Number(apiItem.Id))
            ? Number(apiItem.Id)
            : null;

  const companyCode =
    apiItem.companyCode ||
    apiItem.CompanyCode ||
    (companyId ? `COMP-${String(companyId).padStart(3, '0')}` : '');

  const phones = Array.isArray(apiItem.phones) ? apiItem.phones : [];
  const primaryPhone =
    apiItem.primaryPhone ||
    phones.find((p) => p.isPrimary)?.phoneNumber ||
    phones[0]?.phoneNumber ||
    apiItem.phone1 ||
    null;

  return {
    // Both id & companyId supported for compatibility with DataTable and Links
    id: companyId ?? companyCode,
    companyId: companyId ?? (typeof apiItem.id === 'number' ? apiItem.id : null),
    companyCode,
    companyName: apiItem.companyName || apiItem.CompanyName || '',
    gstNo: apiItem.gstNo || apiItem.GstNo || '',
    cinNo: apiItem.cinNo || apiItem.CinNo || null,
    companyEmail: apiItem.companyEmail || apiItem.CompanyEmail || '',
    email: apiItem.companyEmail || apiItem.CompanyEmail || '', // UI compatibility alias
    primaryPhone,
    phones,
    phone1: primaryPhone || '', // Backward compatibility alias
    phone2: apiItem.phone2 || null,
    contactPersonName: apiItem.contactPersonName || apiItem.ContactPersonName || '',
    contactPersonMobile: apiItem.contactPersonMobile || apiItem.ContactPersonMobile || '',
    contactPersonEmail: apiItem.contactPersonEmail || apiItem.ContactPersonEmail || '',
    city: apiItem.city || apiItem.City || '',
    stateName: apiItem.stateName || apiItem.StateName || '',
    state: apiItem.stateName || apiItem.stateId || apiItem.StateId || '', // UI compatibility alias
    countryName: apiItem.countryName || apiItem.CountryName || '',
    country: apiItem.countryName || apiItem.countryId || apiItem.CountryId || '', // UI compatibility alias
    zipCode: apiItem.zipCode || apiItem.ZipCode || '',
    pinCode: apiItem.zipCode || apiItem.ZipCode || '', // UI compatibility alias
    address1: apiItem.address1 || apiItem.Address1 || '',
    address2: apiItem.address2 || apiItem.Address2 || '',
    isActive: Boolean(apiItem.isActive ?? apiItem.IsActive),
    bankDetailCount: apiItem.bankDetailCount ?? apiItem.BankDetailCount ?? 0,
    createdOn: apiItem.createdOn || apiItem.CreatedOn,
    createdAt: apiItem.createdOn || apiItem.CreatedOn, // UI compatibility alias
    lastUpdatedOn: apiItem.lastUpdatedOn || apiItem.LastUpdatedOn,
    updatedAt: apiItem.lastUpdatedOn || apiItem.LastUpdatedOn, // UI compatibility alias
    lastUpdatedByName: apiItem.lastUpdatedByName || apiItem.LastUpdatedByName || '',
    raw: apiItem,
  };
}

/**
 * Normalizes full Company view/detail payload from the API.
 */
export function companyDetailFromApi(apiItem) {
  if (!apiItem) return null;
  const base = companyListItemFromApi(apiItem);

  return {
    ...base,
    cinNo: apiItem.cinNo || apiItem.CinNo || null,
    website: apiItem.website || apiItem.Website || '',
    countryId: apiItem.countryId ?? apiItem.CountryId ?? null,
    stateId: apiItem.stateId ?? apiItem.StateId ?? null,
    phones: Array.isArray(apiItem.phones) ? apiItem.phones : base.phones || [],
    bankDetails: Array.isArray(apiItem.bankDetails)
      ? apiItem.bankDetails.map(bankDetailFromApi)
      : [],
    lastUpdatedBy: apiItem.lastUpdatedBy ?? apiItem.LastUpdatedBy ?? null,
    lastUpdatedByName: apiItem.lastUpdatedByName || apiItem.LastUpdatedByName || '',
    lastUpdatedOn: apiItem.lastUpdatedOn || apiItem.LastUpdatedOn || apiItem.createdOn || null,
  };
}

/**
 * Converts frontend company form state into the exact CompanyRequest DTO expected by backend.
 *
 * @param {object} form - Frontend form values
 * @returns {object} CompanyRequest
 */
export function companyToApiPayload(form) {
  // Normalize phones array: remove blank numbers, keep phoneLabel, phoneNumber, isPrimary
  const rawPhones = Array.isArray(form.phones) ? form.phones : [];
  const validPhones = rawPhones
    .filter((p) => p && p.phoneNumber && String(p.phoneNumber).trim() !== '')
    .map((p) => ({
      phoneLabel: p.phoneLabel ? String(p.phoneLabel).trim() : null,
      phoneNumber: String(p.phoneNumber).trim(),
      isPrimary: Boolean(p.isPrimary),
    }));

  // If none is marked primary but we have phones, mark the first one as primary
  if (validPhones.length > 0 && !validPhones.some((p) => p.isPrimary)) {
    validPhones[0].isPrimary = true;
  }

  const cin = form.cinNo ? String(form.cinNo).replace(/\s/g, '').toUpperCase() : null;

  return {
    companyName: String(form.companyName || '').trim(),
    gstNo: form.gstNo ? String(form.gstNo).trim().toUpperCase() : null,
    cinNo: cin || null,
    companyEmail: String(form.email || form.companyEmail || '').trim().toLowerCase(),
    website: form.website ? String(form.website).trim() : null,
    phones: validPhones,
    contactPersonName: String(form.contactPersonName || '').trim(),
    contactPersonMobile: String(form.contactPersonMobile || '').trim(),
    contactPersonEmail: String(form.contactPersonEmail || '').trim().toLowerCase(),
    address1: String(form.address1 || '').trim(),
    address2: form.address2 ? String(form.address2).trim() : null,
    countryId: Number(form.countryId || form.country || 1),
    stateId: Number(form.stateId || form.state || 1),
    city: String(form.city || '').trim(),
    zipCode: String(form.pinCode || form.zipCode || '').trim(),
    isActive: form.isActive !== undefined ? Boolean(form.isActive) : true,
  };
}

/**
 * Normalizes banking document/attachment item.
 */
export function bankAttachmentFromApi(apiItem) {
  if (!apiItem) return null;
  const id = apiItem.companyBankAttachmentId || apiItem.id;

  return {
    id,
    companyBankAttachmentId: id,
    companyBankDetailId: apiItem.companyBankDetailId,
    documentTypeId: apiItem.documentTypeId,
    documentTypeName: apiItem.documentTypeName || apiItem.documentName || 'Bank Document',
    documentName: apiItem.documentTypeName || apiItem.documentName || 'Bank Document',
    fileName: apiItem.fileName || '',
    downloadUrl: apiItem.downloadUrl || '',
    uploadedBy: apiItem.uploadedBy || null,
    uploadedByName: apiItem.uploadedByName || '',
    uploadedOn: apiItem.uploadedOn || null,
    createdAt: apiItem.uploadedOn || null,
  };
}

/**
 * Normalizes single Company Bank Detail account from backend.
 */
export function bankDetailFromApi(apiItem) {
  if (!apiItem) return null;
  const id = apiItem.companyBankDetailId || apiItem.bankDetailId || apiItem.id;

  return {
    // Both IDs supported for backward UI compatibility
    id,
    bankDetailId: id,
    companyBankDetailId: id,
    companyId: apiItem.companyId,
    companyCode: apiItem.companyCode || (apiItem.companyId ? `COMP-${String(apiItem.companyId).padStart(3, '0')}` : ''),
    companyName: apiItem.companyName || '',
    accountHolderName: apiItem.accountHolderName || '',
    bankName: apiItem.bankName || '',
    branchName: apiItem.branchName || '',
    accountType: apiItem.accountType || 'Current',
    accountNumber: apiItem.accountNumber || '',
    ifscCode: apiItem.ifscCode || '',
    swiftCode: apiItem.swiftCode || '',
    micrCode: apiItem.micrCode || '',
    iban: apiItem.iban || '',
    branchAddress: apiItem.branchAddress || '',
    remarks: apiItem.remarks || '',
    isActive: Boolean(apiItem.isActive),
    attachmentCount: apiItem.attachmentCount ?? (Array.isArray(apiItem.attachments) ? apiItem.attachments.length : 0),
    attachments: Array.isArray(apiItem.attachments)
      ? apiItem.attachments.map(bankAttachmentFromApi)
      : [],
    lastUpdatedBy: apiItem.lastUpdatedBy || null,
    lastUpdatedByName: apiItem.lastUpdatedByName || '',
    lastUpdatedOn: apiItem.lastUpdatedOn || null,
    updatedAt: apiItem.lastUpdatedOn || null,
    createdAt: apiItem.createdOn || apiItem.lastUpdatedOn || null,
    raw: apiItem,
  };
}

/**
 * Converts frontend bank form state into CompanyBankDetailRequest DTO.
 *
 * @param {object} form - Frontend bank form state
 * @returns {object} CompanyBankDetailRequest
 */
export function bankDetailToApiPayload(form) {
  // Strip out spaces and dashes from account number as required by API
  const cleanAccountNumber = String(form.accountNumber || '').replace(/[\s-]/g, '');

  return {
    accountHolderName: String(form.accountHolderName || '').trim(),
    bankName: String(form.bankName || '').trim(),
    branchName: String(form.branchName || '').trim(),
    accountType: form.accountType || 'Current',
    accountNumber: cleanAccountNumber,
    ifscCode: String(form.ifscCode || '').trim().toUpperCase(),
    swiftCode: form.swiftCode ? String(form.swiftCode).trim().toUpperCase() : null,
    micrCode: form.micrCode ? String(form.micrCode).trim() : null,
    iban: form.iban ? String(form.iban).replace(/\s/g, '').toUpperCase() : null,
    branchAddress: form.branchAddress ? String(form.branchAddress).trim() : null,
    remarks: form.remarks ? String(form.remarks).trim() : null,
    isActive: form.isActive !== undefined ? Boolean(form.isActive) : true,
  };
}

