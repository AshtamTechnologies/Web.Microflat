/**
 * src/models/inquiries/inquiryModel.js
 * Data models, transformation adapters and payload builders for the Inquiry module.
 * Aligned with Inquiry Module – Frontend API Guide (Inquiry.md, Nov 23, 2026).
 */

/**
 * Normalizes an inquiry line item from backend DTO to frontend model.
 * @param {object} dto
 * @returns {object}
 */
export function inquiryProductFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    lineId: dto.id,
    inquiryId: dto.inquiryId,
    productId: dto.productId || null,
    productCode: dto.productCode || '',
    productName: dto.productName || dto.displayName || '',
    categoryName: dto.categoryName || '',
    uomName: dto.uomName || 'Nos',
    isCustomSizeAllowed: Boolean(dto.isCustomSizeAllowed),
    productVariantId: dto.productVariantId || null,
    variantCode: dto.variantCode || '',
    itemCode: dto.itemCode || dto.variantCode || dto.productCode || '',
    isCustomSize: Boolean(dto.isCustomSize),
    customSize: dto.customSize || '',
    itemName: dto.itemName || '',
    displayName: dto.displayName || dto.productName || dto.itemName || 'Product',
    isCustomItem: Boolean(dto.isCustomItem ?? !dto.productId),
    quantity: Number(dto.quantity) || 1,
    specification: dto.specification || '',
    remarks: dto.remarks || '',
    isActive: dto.isActive !== false,
    options: Array.isArray(dto.options)
      ? dto.options.map((opt) => ({
          id: opt.id,
          productOptionId: opt.productOptionId,
          optionName: opt.optionName,
          isStandard: Boolean(opt.isStandard),
        }))
      : [],
    createdOn: dto.createdOn || null,
    lastUpdatedOn: dto.lastUpdatedOn || null,

    // Legacy fallback keys for existing UI components
    prItemId: dto.id,
    variantName: dto.isCustomSize && dto.customSize ? `${dto.customSize} (Custom)` : dto.variantCode || '',
    notes: dto.remarks || '',
    uom: dto.uomName || 'Nos',
  };
}

/**
 * Maps a single product line item to backend request payload (InquiryProductRequestDto).
 * @param {object} item
 * @returns {object}
 */
export function inquiryProductToApi(item) {
  if (!item) return null;
  const isCustom = !item.productId;

  // Extract integer option IDs
  let productOptionIds = null;
  if (Array.isArray(item.productOptionIds)) {
    productOptionIds = item.productOptionIds.map(Number).filter((id) => !isNaN(id) && id > 0);
  } else if (Array.isArray(item.options)) {
    productOptionIds = item.options
      .map((opt) => (typeof opt === 'object' && opt !== null ? opt.productOptionId || opt.id : opt))
      .map(Number)
      .filter((id) => !isNaN(id) && id > 0);
  }

  const payload = {
    productId: isCustom ? null : Number(item.productId),
    productVariantId: isCustom || !item.productVariantId ? null : Number(item.productVariantId),
    isCustomSize: !isCustom && Boolean(item.isCustomSize),
    customSize: !isCustom && item.isCustomSize ? String(item.customSize || '').trim() || null : null,
    itemName: isCustom ? String(item.itemName || item.displayName || item.productName || '').trim() : null,
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    specification: item.specification ? String(item.specification).trim() : '',
    remarks: item.remarks || item.notes ? String(item.remarks || item.notes).trim() : null,
    productOptionIds: isCustom ? null : productOptionIds,
    isActive: item.isActive !== false,
  };

  if (item.id && typeof item.id === 'number') {
    payload.id = item.id;
  }

  return payload;
}

/**
 * Normalizes an attachment object from backend DTO.
 * @param {object} dto
 * @returns {object}
 */
export function inquiryAttachmentFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    attachmentId: dto.id,
    inquiryId: dto.inquiryId,
    inquiryNo: dto.inquiryNo || '',
    documentTypeId: dto.documentTypeId,
    documentTypeName: dto.documentTypeName || 'Document',
    documentTitle: dto.documentTitle || dto.fileName || '',
    fileName: dto.fileName || 'attachment.pdf',
    displayName: dto.displayName || dto.documentTitle || dto.fileName || 'Attachment',
    remarks: dto.remarks || '',
    downloadUrl: dto.downloadUrl || `/api/inquiry-attachments/${dto.id}/download`,
    uploadedBy: dto.uploadedBy,
    uploadedByName: dto.uploadedByName || '',
    uploadedOn: dto.uploadedOn || null,

    // File metadata fallbacks for existing UI previewers
    fileExtension: dto.fileName ? dto.fileName.slice(dto.fileName.lastIndexOf('.')).toLowerCase() : '.pdf',
    fileSizeKB: dto.fileSizeKB || 500,
    currentVersionNo: dto.versionNo || 1,
    versions: Array.isArray(dto.versions) && dto.versions.length > 0 ? dto.versions : [
      {
        versionId: `ver_${dto.id}_1`,
        versionNo: 1,
        fileName: dto.fileName || 'attachment.pdf',
        fileExtension: dto.fileName ? dto.fileName.slice(dto.fileName.lastIndexOf('.')).toLowerCase() : '.pdf',
        fileSizeKB: dto.fileSizeKB || 500,
        changeRemarks: dto.remarks || 'Initial upload',
        isCurrent: true,
        uploadedBy: dto.uploadedByName || '',
        uploadedOn: dto.uploadedOn || null,
      }
    ],
  };
}

/**
 * Normalizes an activity entry from backend DTO.
 * @param {object} dto
 * @returns {object}
 */
export function inquiryActivityFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    inquiryId: dto.inquiryId,
    activityType: dto.activityType || 'Comment',
    type: (dto.activityType || 'comment').toLowerCase(),
    status: dto.status || null,
    comment: dto.comment || '',
    remarks: dto.comment || '',
    userId: dto.userId,
    userName: dto.userName || 'System',
    changedBy: dto.userName || 'System',
    on: dto.on || null,
    timestamp: dto.on || null,
  };
}

/**
 * Normalizes a list item from `GET /api/inquiries`.
 * @param {object} dto
 * @returns {object}
 */
export function inquiryListItemFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    InquiryId: dto.id,
    inquiryNo: dto.inquiryNo || '',
    InquiryNo: dto.inquiryNo || '',
    inquiryDate: dto.inquiryDate || '',
    InquiryDate: dto.inquiryDate || '',
    estimateDate: dto.estimateDate || null,
    RequiredByDate: dto.estimateDate || '',
    regionId: dto.regionId,
    RegionId: dto.regionId,
    regionName: dto.regionName || '',
    inquirySourceId: dto.inquirySourceId,
    sourceName: dto.sourceName || '',
    Source: dto.sourceName || 'Website',
    priorityLevelId: dto.priorityLevelId,
    priorityName: dto.priorityName || 'Medium',
    Priority: dto.priorityName || 'Medium',
    status: dto.status || 'New',
    StatusId: dto.status || 'New',
    isNewClient: Boolean(dto.isNewClient),
    clientId: dto.clientId || null,
    clientCode: dto.clientCode || '',
    companyName: dto.companyName || '',
    CustomerName: dto.companyName || '',
    contactPersonName: dto.contactPersonName || '',
    ContactPerson: dto.contactPersonName || '',
    email: dto.email || '',
    Email: dto.email || '',
    mobileNo: dto.mobileNo || '',
    Phone: dto.mobileNo || '',
    city: dto.city || '',
    assignedToUserId: dto.assignedToUserId || null,
    assignedToName: dto.assignedToName || 'Unassigned',
    AssignedTo: dto.assignedToUserId ? String(dto.assignedToUserId) : null,
    productCount: dto.productCount ?? 0,
    Quantity: dto.productCount ?? 1,
    UOM: 'NOS',
    Subject: dto.companyName ? `${dto.companyName} (${dto.productCount ?? 0} item${dto.productCount === 1 ? '' : 's'})` : 'Customer Inquiry',
    isActive: dto.isActive !== false,
    createdBy: dto.createdBy,
    createdByName: dto.createdByName || '',
    createdOn: dto.createdOn || '',
    CreatedOn: dto.createdOn || '',
    lastUpdatedOn: dto.lastUpdatedOn || null,
  };
}

/**
 * Normalizes a full detail object from `GET /api/inquiries/{id}`.
 * @param {object} dto
 * @returns {object}
 */
export function inquiryDetailFromApi(dto) {
  if (!dto) return null;
  const base = inquiryListItemFromApi(dto);

  const products = Array.isArray(dto.products)
    ? dto.products.map(inquiryProductFromApi).filter(Boolean)
    : [];

  const attachments = Array.isArray(dto.attachments)
    ? dto.attachments.map(inquiryAttachmentFromApi).filter(Boolean)
    : [];

  const activities = Array.isArray(dto.activities)
    ? dto.activities.map(inquiryActivityFromApi).filter(Boolean)
    : [];

  return {
    ...base,
    detailedSpecification: dto.detailedSpecification || '',
    Description: dto.detailedSpecification || '',
    alternatePhoneNo: dto.alternatePhoneNo || '',
    AlternativePhone: dto.alternatePhoneNo || '',
    countryId: dto.countryId || null,
    countryName: dto.countryName || '',
    Country: dto.countryName || '',
    stateId: dto.stateId || null,
    stateName: dto.stateName || '',
    State: dto.stateName || '',
    address1: dto.address1 || '',
    AddressLine1: dto.address1 || '',
    address2: dto.address2 || '',
    AddressLine2: dto.address2 || '',
    City: dto.city || '',
    lastUpdatedBy: dto.lastUpdatedBy || null,
    lastUpdatedByName: dto.lastUpdatedByName || '',
    isEditable: Boolean(dto.isEditable),
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
    products,
    items: products,
    attachments,
    activities,
    activity: activities,
  };
}

/**
 * Builds the request body for `POST /api/inquiries`.
 * @param {object} form
 * @returns {object}
 */
export function inquiryToCreatePayload(form) {
  const isNew = form.isNewClient ?? (form.clientType === 'New' || !form.clientId);
  const clientId = isNew ? null : (Number(form.clientId) || null);

  const products = Array.isArray(form.products || form.items)
    ? (form.products || form.items).map(inquiryProductToApi).filter(Boolean)
    : [];

  const payload = {
    inquiryDate: form.inquiryDate || form.InquiryDate || new Date().toISOString().slice(0, 10),
    estimateDate: form.estimateDate || form.RequiredByDate || null,
    regionId: Number(form.regionId || form.RegionId),
    inquirySourceId: form.inquirySourceId ? Number(form.inquirySourceId) : null,
    priorityLevelId: form.priorityLevelId ? Number(form.priorityLevelId) : (form.defaultPriorityLevelId ? Number(form.defaultPriorityLevelId) : 2),
    detailedSpecification: form.detailedSpecification || form.Description || null,
    isNewClient: isNew,
    clientId,
    companyName: isNew ? String(form.companyName || form.CustomerName || '').trim() : (form.companyName || form.CustomerName || null),
    contactPersonName: form.contactPersonName || form.ContactPerson || null,
    email: form.email || form.Email ? String(form.email || form.Email).trim().toLowerCase() : null,
    mobileNo: form.mobileNo || form.Phone ? String(form.mobileNo || form.Phone).trim() : null,
    alternatePhoneNo: form.alternatePhoneNo || form.AlternativePhone ? String(form.alternatePhoneNo || form.AlternativePhone).trim() : null,
    city: form.city || form.City || null,
    countryId: form.countryId ? Number(form.countryId) : (form.Country ? 1 : null),
    stateId: form.stateId ? Number(form.stateId) : null,
    address1: form.address1 || form.AddressLine1 || null,
    address2: form.address2 || form.AddressLine2 || null,
    assignedToUserId: Number(form.assignedToUserId || form.AssignedTo),
    comment: form.comment || form.initialComment ? String(form.comment || form.initialComment).trim() : null,
    products,
  };

  return payload;
}

/**
 * Builds the request body for `PUT /api/inquiries/{id}`.
 * Same shape as create payload, but without `comment`.
 * @param {object} form
 * @returns {object}
 */
export function inquiryToUpdatePayload(form) {
  const createPayload = inquiryToCreatePayload(form);
  delete createPayload.comment;

  // If products are explicitly set to null, the backend preserves existing lines
  if (form.products === null) {
    createPayload.products = null;
  }

  return createPayload;
}
