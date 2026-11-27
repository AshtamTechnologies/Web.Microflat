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
    id: dto.id ?? null,
    lineId: dto.id ?? null,
    inquiryId: dto.inquiryId ?? null,
    productId: dto.productId ?? null,
    productCode: dto.productCode || '',
    productName: dto.productName || dto.displayName || '',
    categoryName: dto.categoryName || '',
    uomName: dto.uomName || '',
    isCustomSizeAllowed: Boolean(dto.isCustomSizeAllowed),
    productVariantId: dto.productVariantId ?? null,
    variantCode: dto.variantCode || '',
    itemCode: dto.itemCode || dto.variantCode || dto.productCode || '',
    isCustomSize: Boolean(dto.isCustomSize),
    customSize: dto.customSize || '',
    itemName: dto.itemName || '',
    displayName: dto.displayName || dto.productName || dto.itemName || '',
    isCustomItem: Boolean(dto.isCustomItem ?? !dto.productId),
    quantity: dto.quantity === null || dto.quantity === undefined ? null : Number(dto.quantity),
    specification: dto.specification || '',
    remarks: dto.remarks || '',
    isActive: dto.isActive,
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
    uom: dto.uomName || '',
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
    ''
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

  const quantity = Number(item.quantity);
  const payload = {
    productId: hasValidNumericProductId ? numProdId : null,
    productVariantId: hasValidNumericVariantId ? numVarId : null,
    isCustomSize: hasValidNumericProductId && Boolean(item.isCustomSize),
    customSize: hasValidNumericProductId && item.isCustomSize ? String(item.customSize || '').trim() || null : null,
    itemName: isCustom ? (resolvedItemName || null) : null,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    specification: resolvedSpec || null,
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
  const fileName = dto.fileName || '';
  return {
    id: dto.id ?? null,
    attachmentId: dto.id ?? null,
    inquiryId: dto.inquiryId ?? null,
    inquiryNo: dto.inquiryNo || '',
    documentTypeId: dto.documentTypeId ?? null,
    documentTypeName: dto.documentTypeName || '',
    documentTitle: dto.documentTitle || fileName,
    fileName,
    displayName: dto.displayName || dto.documentTitle || fileName,
    remarks: dto.remarks || '',
    downloadUrl: dto.downloadUrl || '',
    uploadedBy: dto.uploadedBy ?? null,
    uploadedByName: dto.uploadedByName || '',
    uploadedOn: dto.uploadedOn || null,
    fileExtension: fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '',
    fileSizeKB: dto.fileSizeKB ?? null,
    currentVersionNo: dto.versionNo ?? null,
    versions: Array.isArray(dto.versions) ? dto.versions : [],
  };
}

/**
 * Normalizes an activity entry from backend DTO.
 * @param {object} dto
 * @returns {object}
 */
export function inquiryActivityFromApi(dto) {
  if (!dto) return null;
  const timestamp = dto.on || dto.timestamp || dto.createdOn || dto.activityDate || dto.date || null;
  return {
    id: dto.id ?? null,
    inquiryId: dto.inquiryId ?? null,
    activityType: dto.activityType || '',
    type: String(dto.activityType || '').toLowerCase(),
    status: dto.status || null,
    comment: dto.comment || '',
    remarks: dto.comment || '',
    userId: dto.userId ?? null,
    userName: dto.userName || '',
    changedBy: dto.userName || '',
    on: timestamp,
    timestamp: timestamp,
  };
}

/**
 * Normalizes a list item from `GET /api/inquiries`.
 * @param {object} dto
 * @returns {object}
 */
export function inquiryListItemFromApi(dto) {
  if (!dto) return null;
  const id = resolveCleanNumber(dto.id);
  const assignedToUserId = resolveCleanNumber(dto.assignedToUserId);
  const productCount = dto.productCount ?? 0;
  return {
    id,
    InquiryId: id,
    inquiryNo: dto.inquiryNo || '',
    InquiryNo: dto.inquiryNo || '',
    inquiryDate: dto.inquiryDate || '',
    InquiryDate: dto.inquiryDate || '',
    estimateDate: dto.estimateDate || null,
    RequiredByDate: dto.estimateDate || '',
    regionId: resolveCleanNumber(dto.regionId),
    RegionId: resolveCleanNumber(dto.regionId),
    regionName: dto.regionName || '',
    inquirySourceId: resolveCleanNumber(dto.inquirySourceId),
    sourceName: dto.sourceName || '',
    Source: dto.sourceName || '',
    priorityLevelId: resolveCleanNumber(dto.priorityLevelId),
    priorityName: dto.priorityName || '',
    Priority: dto.priorityName || '',
    status: dto.status || '',
    StatusId: dto.status || '',
    isNewClient: Boolean(dto.isNewClient),
    clientId: resolveCleanNumber(dto.clientId),
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
    assignedToUserId,
    assignedToName: dto.assignedToName || '',
    AssignedTo: assignedToUserId,
    productCount,
    Quantity: productCount,
    UOM: '',
    Subject: dto.companyName ? `${dto.companyName} (${productCount} item${productCount === 1 ? '' : 's'})` : '',
    isActive: dto.isActive,
    createdBy: dto.createdBy ?? null,
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
  return defaultVal;
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

  const resolvedCountryId = resolveCleanNumber(form.countryId);
  const resolvedStateId = resolveCleanNumber(form.stateId);

  const payload = {
    inquiryDate: form.inquiryDate || form.InquiryDate || new Date().toISOString().slice(0, 10),
    estimateDate: form.estimateDate || form.RequiredByDate || null,
    regionId: resolveCleanNumber(form.regionId || form.RegionId),
    inquirySourceId: resolveCleanNumber(form.inquirySourceId),
    priorityLevelId: resolveCleanNumber(form.priorityLevelId || form.defaultPriorityLevelId),
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
    assignedToUserId: resolveCleanNumber(form.assignedToUserId || form.AssignedTo),
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
