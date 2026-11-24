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

  const rawProdId = item.productId ?? item.itemId;
  const numProdId = Number(rawProdId);
  const hasValidNumericProductId = !isNaN(numProdId) && numProdId > 0;

  const rawVarId = item.productVariantId ?? item.variantId;
  const numVarId = Number(rawVarId);
  const hasValidNumericVariantId = !isNaN(numVarId) && numVarId > 0;

  const isCustom = !hasValidNumericProductId;

  const resolvedItemName = String(
    item.itemName ||
    item.productName ||
    item.displayName ||
    item.itemCode ||
    'Custom Product'
  ).trim();

  const resolvedSpec = String(
    item.specification ||
    item.notes ||
    item.technicalDetails ||
    item.variantName ||
    (isCustom ? resolvedItemName : '')
  ).trim();

  // Extract integer option IDs
  let productOptionIds = null;
  if (Array.isArray(item.productOptionIds)) {
    const validIds = item.productOptionIds.map(Number).filter((id) => !isNaN(id) && id > 0);
    productOptionIds = validIds.length > 0 ? validIds : null;
  } else if (Array.isArray(item.options)) {
    const validIds = item.options
      .map((opt) => (typeof opt === 'object' && opt !== null ? opt.productOptionId || opt.id : opt))
      .map(Number)
      .filter((id) => !isNaN(id) && id > 0);
    productOptionIds = validIds.length > 0 ? validIds : null;
  }

  const payload = {
    productId: hasValidNumericProductId ? numProdId : null,
    productVariantId: hasValidNumericVariantId ? numVarId : null,
    isCustomSize: hasValidNumericProductId && Boolean(item.isCustomSize),
    customSize: hasValidNumericProductId && item.isCustomSize ? String(item.customSize || '').trim() || null : null,
    itemName: isCustom ? (resolvedItemName || 'Custom Product') : null,
    quantity: Math.max(0.01, Number(item.quantity) || 1),
    specification: resolvedSpec || (isCustom ? 'Standard custom specification' : ''),
    remarks: item.remarks || item.notes ? String(item.remarks || item.notes).trim() : null,
    productOptionIds: isCustom || !productOptionIds || productOptionIds.length === 0 ? null : productOptionIds,
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

function resolveCleanNumber(val, defaultVal = null) {
  if (val === null || val === undefined || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const str = String(val).trim();
  const direct = Number(str);
  if (!isNaN(direct) && direct > 0) return direct;
  const digits = parseInt(str.replace(/^[^0-9]+/, ''), 10);
  return !isNaN(digits) && digits > 0 ? digits : defaultVal;
}

const COMMON_COUNTRIES = {
  india: 1,
  'united states': 2,
  usa: 2,
  us: 2,
  germany: 3,
  'united kingdom': 4,
  uk: 4,
  'united arab emirates': 5,
  uae: 5,
  qatar: 6,
  'saudi arabia': 7,
  australia: 8,
  canada: 9,
  japan: 10,
  singapore: 11,
};

const COMMON_INDIAN_STATES = {
  gujarat: 1,
  maharashtra: 2,
  karnataka: 3,
  'tamil nadu': 4,
  delhi: 5,
  rajasthan: 6,
  'uttar pradesh': 7,
  haryana: 8,
  'madhya pradesh': 9,
  telangana: 10,
  'andhra pradesh': 11,
  'west bengal': 12,
  punjab: 13,
  kerala: 14,
  odisha: 15,
};

/**
 * Builds the request body for `POST /api/inquiries`.
 * @param {object} form
 * @returns {object}
 */
export function inquiryToCreatePayload(form) {
  const isNew = form.isNewClient ?? (form.clientType === 'New' || !form.clientId);
  const clientId = isNew ? null : (resolveCleanNumber(form.clientId) || null);

  const products = Array.isArray(form.products || form.items)
    ? (form.products || form.items).map(inquiryProductToApi).filter(Boolean)
    : [];

  const rawCountry = String(form.Country || form.country || '').trim().toLowerCase();
  let resolvedCountryId = resolveCleanNumber(form.countryId) || COMMON_COUNTRIES[rawCountry] || (rawCountry === 'india' ? 1 : null);

  const rawState = String(form.State || form.state || '').trim().toLowerCase();
  let resolvedStateId = resolveCleanNumber(form.stateId);
  if (!resolvedStateId && rawState) {
    resolvedStateId = COMMON_INDIAN_STATES[rawState] || null;
  }
  // stateId requires countryId
  if (resolvedStateId && !resolvedCountryId) {
    resolvedCountryId = 1;
  }

  const payload = {
    inquiryDate: form.inquiryDate || form.InquiryDate || new Date().toISOString().slice(0, 10),
    estimateDate: form.estimateDate || form.RequiredByDate || null,
    regionId: resolveCleanNumber(form.regionId || form.RegionId, 1),
    inquirySourceId: resolveCleanNumber(form.inquirySourceId, 1),
    priorityLevelId: resolveCleanNumber(form.priorityLevelId || form.defaultPriorityLevelId, 2),
    detailedSpecification: form.detailedSpecification || form.Description || null,
    isNewClient: isNew,
    clientId,
    companyName: isNew ? String(form.companyName || form.CustomerName || '').trim() : null,
    contactPersonName: form.contactPersonName || form.ContactPerson || null,
    email: form.email || form.Email ? String(form.email || form.Email).trim().toLowerCase() : null,
    mobileNo: form.mobileNo || form.Phone ? String(form.mobileNo || form.Phone).trim() : null,
    alternatePhoneNo: form.alternatePhoneNo || form.AlternativePhone ? String(form.alternatePhoneNo || form.AlternativePhone).trim() : null,
    city: form.city || form.City || null,
    countryId: resolvedCountryId,
    stateId: resolvedStateId,
    address1: form.address1 || form.AddressLine1 || null,
    address2: form.address2 || form.AddressLine2 || null,
    assignedToUserId: resolveCleanNumber(form.assignedToUserId || form.AssignedTo, 1),
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
