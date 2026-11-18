/**
 * src/models/deals/dealModel.js — Data Transfer Object (DTO) mappers for Deals.
 * Adheres to Deal-API-Guide.md specification.
 */

/**
 * Normalizes a deal summary item from the GET /api/deals response.
 */
export function dealItemFromApi(apiItem) {
  if (!apiItem) return null;
  return {
    id: apiItem.id,
    dealNo: apiItem.dealNo || '',
    inquiryId: apiItem.inquiryId,
    inquiryNo: apiItem.inquiryNo || '',
    dealDate: apiItem.dealDate || '',
    clientId: apiItem.clientId,
    clientCode: apiItem.clientCode || '',
    clientName: apiItem.clientName || '',
    currencyCode: apiItem.currencyCode || 'INR',
    expectedValue: Number(apiItem.expectedValue ?? 0),
    negotiatedValue: apiItem.negotiatedValue !== null && apiItem.negotiatedValue !== undefined
      ? Number(apiItem.negotiatedValue)
      : null,
    dealStatusId: apiItem.dealStatusId,
    dealStatus: apiItem.dealStatus || 'Open',
    statusChangedOn: apiItem.statusChangedOn || null,
    createdBy: apiItem.createdBy,
    createdByName: apiItem.createdByName || '',
    createdOn: apiItem.createdOn || '',
    lastUpdatedOn: apiItem.lastUpdatedOn || null,
  };
}

/**
 * Normalizes a single negotiation entry from API.
 */
export function negotiationFromApi(apiItem) {
  if (!apiItem) return null;
  return {
    id: apiItem.id,
    dealId: apiItem.dealId,
    negotiationDate: apiItem.negotiationDate || '',
    discussedValue: apiItem.discussedValue !== null && apiItem.discussedValue !== undefined
      ? Number(apiItem.discussedValue)
      : null,
    notes: apiItem.notes || '',
    createdBy: apiItem.createdBy,
    createdByName: apiItem.createdByName || '',
    createdOn: apiItem.createdOn || '',
    lastUpdatedOn: apiItem.lastUpdatedOn || null,
  };
}

/**
 * Normalizes a full deal record from GET /api/deals/{id} or POST /api/deals.
 */
export function dealDetailFromApi(apiDetail) {
  if (!apiDetail) return null;
  return {
    id: apiDetail.id,
    dealNo: apiDetail.dealNo || '',
    inquiryId: apiDetail.inquiryId,
    inquiryNo: apiDetail.inquiryNo || '',
    dealDate: apiDetail.dealDate || '',
    clientId: apiDetail.clientId,
    clientDetailId: apiDetail.clientDetailId,
    clientCode: apiDetail.clientCode || '',
    clientName: apiDetail.clientName || '',
    clientContactId: apiDetail.clientContactId || null,
    clientContactName: apiDetail.clientContactName || '',
    clientContactEmail: apiDetail.clientContactEmail || '',
    currencyId: apiDetail.currencyId || 1,
    currencyCode: apiDetail.currencyCode || 'INR',
    currencySymbol: apiDetail.currencySymbol || '₹',
    expectedValue: Number(apiDetail.expectedValue ?? 0),
    negotiatedValue: apiDetail.negotiatedValue !== null && apiDetail.negotiatedValue !== undefined
      ? Number(apiDetail.negotiatedValue)
      : null,
    dealStatusId: apiDetail.dealStatusId,
    dealStatus: apiDetail.dealStatus || 'Open',
    statusChangedOn: apiDetail.statusChangedOn || null,
    statusRemarks: apiDetail.statusRemarks || '',
    remarks: apiDetail.remarks || '',
    createdBy: apiDetail.createdBy,
    createdByName: apiDetail.createdByName || '',
    createdOn: apiDetail.createdOn || '',
    lastUpdatedBy: apiDetail.lastUpdatedBy,
    lastUpdatedByName: apiDetail.lastUpdatedByName || '',
    lastUpdatedOn: apiDetail.lastUpdatedOn || null,

    // Permission and workflow flags from server
    isEditable: Boolean(apiDetail.isEditable),
    canQuote: Boolean(apiDetail.canQuote),
    nextStatuses: Array.isArray(apiDetail.nextStatuses) ? apiDetail.nextStatuses : [],

    // Negotiation timeline entries
    negotiations: Array.isArray(apiDetail.negotiations)
      ? apiDetail.negotiations.map(negotiationFromApi)
      : [],
  };
}

/**
 * Formats data for POST /api/deals (Create / Convert to Deal).
 */
export function dealToApiCreate(form) {
  return {
    inquiryId: Number(form.inquiryId),
    dealDate: form.dealDate || new Date().toISOString().slice(0, 10),
    currencyId: form.currencyId ? Number(form.currencyId) : 1,
    expectedValue: Number(form.expectedValue ?? 0),
    negotiatedValue: form.negotiatedValue !== '' && form.negotiatedValue !== null && form.negotiatedValue !== undefined
      ? Number(form.negotiatedValue)
      : null,
    clientContactId: form.clientContactId ? Number(form.clientContactId) : null,
    remarks: form.remarks ? String(form.remarks).trim() : null,
  };
}

/**
 * Formats data for PUT /api/deals/{id} (Edit deal header).
 * Note: Send all fields every time.
 */
export function dealToApiUpdate(form) {
  return {
    currencyId: form.currencyId ? Number(form.currencyId) : 1,
    expectedValue: Number(form.expectedValue ?? 0),
    negotiatedValue: form.negotiatedValue !== '' && form.negotiatedValue !== null && form.negotiatedValue !== undefined
      ? Number(form.negotiatedValue)
      : null,
    clientContactId: form.clientContactId ? Number(form.clientContactId) : null,
    remarks: form.remarks ? String(form.remarks).trim() : null,
  };
}

/**
 * Formats data for POST / PUT negotiation entries.
 */
export function negotiationToApi(form) {
  return {
    negotiationDate: form.negotiationDate || new Date().toISOString().slice(0, 10),
    discussedValue: form.discussedValue !== '' && form.discussedValue !== null && form.discussedValue !== undefined
      ? Number(form.discussedValue)
      : null,
    notes: form.notes ? String(form.notes).trim() : null,
  };
}
