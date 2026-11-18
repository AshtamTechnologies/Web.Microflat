/**
 * src/models/quotations/quotationModel.js
 * Domain model transformations and DTO normalizers for Quotations & Task 61.
 * Aligned with Swagger OpenAPI & Frontend-API-Guide.md §5.4f & §5.4g.
 */

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
 * Normalizes a quotation line item from API DTO
 */
export function quotationLineItemFromApi(dto = {}) {
  if (!dto) return null;
  const quantity = Number(dto.quantity) || 0;
  const rate = Number(dto.rate) || 0;
  const amount = Number(dto.amount) || quantity * rate;
  const otherCharges = Number(dto.otherCharges ?? dto.lineCharges) || 0;
  const taxAmount = Number(dto.taxAmount) || 0;
  const lineTotal = Number(dto.lineTotal) || amount + otherCharges + taxAmount;

  return {
    id: dto.id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    quotationLineItemId: dto.id,
    productId: dto.productId || null,
    productCode: dto.productCode || dto.itemCode || '',
    productName: dto.productName || dto.itemName || '',
    description: dto.description || dto.specification || '',
    specification: dto.specification || dto.description || '',
    uom: dto.uom || dto.unit || 'Nos',
    quantity,
    rate,
    amount,
    otherCharges,
    lineCharges: otherCharges,
    taxConfigDetailId: dto.taxConfigDetailId || null,
    taxPercent: Number(dto.taxPercent) || 0,
    taxAmount,
    lineTotal,
    remarks: dto.remarks || '',
  };
}

/**
 * Normalizes a quotation tax entry from API DTO
 */
export function quotationTaxFromApi(dto = {}) {
  if (!dto) return null;
  return {
    id: dto.id || dto.taxConfigDetailId,
    taxConfigDetailId: dto.taxConfigDetailId,
    taxName: dto.taxName || dto.name || 'GST',
    taxPercent: Number(dto.taxPercent ?? dto.rate) || 0,
    taxAmount: Number(dto.taxAmount) || 0,
  };
}

/**
 * Normalizes a negotiation stage from API DTO
 */
export function quotationNegotiationFromApi(dto = {}) {
  if (!dto) return null;
  return {
    id: dto.id || `neg-${Date.now()}`,
    stageId: dto.id,
    revisionId: dto.revisionId,
    revisionNo: dto.revisionNo ?? 0,
    negotiationOn: dto.negotiationOn ? String(dto.negotiationOn).slice(0, 10) : '',
    date: dto.negotiationOn ? String(dto.negotiationOn).slice(0, 10) : '',
    handledByUserId: dto.handledByUserId,
    handledByName: dto.handledByName || dto.userName || 'Sales Exec',
    clientContactId: dto.clientContactId,
    contactName: dto.contactName || '',
    mode: dto.mode || 'Call',
    discussion: dto.discussion || dto.notes || '',
    notes: dto.discussion || dto.notes || '',
    ourOfferAmount: dto.ourOfferAmount !== undefined ? Number(dto.ourOfferAmount) : null,
    clientCounterAmount: dto.clientCounterAmount !== undefined ? Number(dto.clientCounterAmount) : null,
    createdOn: dto.createdOn || '',
  };
}

/**
 * Normalizes a quotation document attachment from API DTO
 */
export function quotationDocumentFromApi(dto = {}) {
  if (!dto) return null;
  return {
    id: dto.id,
    fileName: dto.fileName || 'Quotation_Doc.pdf',
    documentTypeId: dto.documentTypeId,
    documentTypeName: dto.documentTypeName || dto.typeName || 'Quotation',
    documentType: dto.documentTypeName || dto.typeName || 'Quotation',
    revisionNo: dto.revisionNo ?? 0,
    linkedStage: dto.linkedStage || 'Quotation',
    fileSize: dto.fileSize || '250 KB',
    downloadUrl: dto.downloadUrl || `/api/quotation-documents/${dto.id}/download`,
    uploadedAt: dto.createdOn ? String(dto.createdOn).slice(0, 10) : '',
    remarks: dto.remarks || '',
  };
}

/**
 * Normalizes a list item from GET /api/quotations
 */
export function quotationListItemFromApi(dto = {}) {
  if (!dto) return null;
  const grandTotal = Number(dto.totalAmount ?? dto.grandTotal) || 0;
  const subtotal = Number(dto.subTotal ?? dto.subtotal) || 0;

  return {
    id: dto.id,
    quotationNo: dto.quotationNo || '',
    quotationDate: dto.revisionDate || dto.quotationDate ? String(dto.revisionDate || dto.quotationDate).slice(0, 10) : '',
    currentRevision: dto.currentRevision ?? dto.revisionNo ?? 0,
    revisionNo: dto.currentRevision ?? dto.revisionNo ?? 0,
    status: dto.status || 'Draft',
    inquiryId: dto.inquiryId,
    inquiryNo: dto.inquiryNo || '',
    clientId: dto.clientId,
    clientCode: dto.clientCode || '',
    clientName: dto.clientName || '',
    contactPerson: dto.contactPerson || '',
    contactEmail: dto.contactEmail || '',
    currency: dto.currencyCode || dto.currency || 'INR',
    subtotal,
    grandTotal,
    totalAmount: grandTotal,
    poReceived: Boolean(dto.poReceived || dto.poNumber),
    poNumber: dto.poNumber || '',
    poReceivedDate: dto.poReceivedDate ? String(dto.poReceivedDate).slice(0, 10) : '',
    orderConfirmationCount: Number(dto.orderConfirmationCount) || 0,
    isEditable: dto.isEditable ?? (dto.status === 'Draft'),
    canRevise: dto.canRevise ?? (dto.status === 'Sent' || dto.status === 'In Negotiation'),
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
    createdOn: dto.createdOn || '',
    lastUpdatedAt: dto.lastUpdatedOn || dto.lastUpdatedAt || '',
  };
}

/**
 * Normalizes full quotation details from GET /api/quotations/{id}
 */
export function quotationDetailFromApi(dto = {}) {
  if (!dto) return null;

  const latestRev = dto.latestRevision || {};
  const status = dto.status || latestRev.status || 'Draft';
  const grandTotal = Number(latestRev.totalAmount ?? dto.totalAmount ?? dto.grandTotal) || 0;
  const subtotal = Number(latestRev.subTotal ?? dto.subTotal ?? dto.subtotal) || 0;
  const otherCharges = Number(latestRev.otherCharges ?? dto.otherCharges) || 0;
  const totalTax = Number(latestRev.taxAmount ?? dto.taxAmount) || 0;

  // Normalize line items
  const rawItems = latestRev.lineItems || dto.lineItems || [];
  const items = rawItems.map(quotationLineItemFromApi).filter(Boolean);

  // Normalize taxes
  const rawTaxes = latestRev.taxes || dto.taxes || [];
  const taxes = rawTaxes.map(quotationTaxFromApi).filter(Boolean);

  // Normalize negotiations
  const rawNegs = latestRev.negotiations || dto.negotiations || [];
  const negotiations = rawNegs.map(quotationNegotiationFromApi).filter(Boolean);

  // Normalize documents
  const rawDocs = latestRev.documents || dto.documents || [];
  const documents = rawDocs.map(quotationDocumentFromApi).filter(Boolean);

  // Normalize historical revisions list
  const revisions = Array.isArray(dto.revisions)
    ? dto.revisions.map((rev) => ({
        revisionNo: rev.revisionNo ?? 0,
        revisionDate: rev.revisionDate ? String(rev.revisionDate).slice(0, 10) : '',
        revisionReason: rev.revisionReason || 'Revision',
        status: rev.status || 'Draft',
        subtotal: Number(rev.subTotal ?? rev.subtotal) || 0,
        totalTax: Number(rev.taxAmount) || 0,
        grandTotal: Number(rev.totalAmount ?? rev.grandTotal) || 0,
        currency: rev.currencyCode || rev.currency || 'INR',
        items: Array.isArray(rev.lineItems) ? rev.lineItems.map(quotationLineItemFromApi).filter(Boolean) : [],
      }))
    : [];

  // Client PO Information (Task 61)
  const poDetails = dto.poDetails || (dto.poNumber ? {
    poNumber: dto.poNumber,
    receivedOn: dto.poReceivedDate ? String(dto.poReceivedDate).slice(0, 10) : '',
    expectedDeliveryDate: dto.expectedDeliveryDate ? String(dto.expectedDeliveryDate).slice(0, 10) : '',
    remarks: dto.poRemarks || '',
    fileName: dto.poFileName || (dto.poAttachments?.[0]?.fileName) || '',
    downloadUrl: dto.poAttachments?.[0]?.id
      ? `/api/quotation-attachments/${dto.poAttachments[0].id}/download`
      : null,
  } : null);

  return {
    id: dto.id,
    quotationNo: dto.quotationNo || '',
    inquiryId: dto.inquiryId,
    inquiryNo: dto.inquiryNo || '',
    clientId: dto.clientId,
    clientCode: dto.clientCode || '',
    clientName: dto.clientName || '',
    clientAddressId: dto.clientAddressId || latestRev.clientAddressId,
    clientAddress: dto.clientAddress || latestRev.clientAddress || '',
    clientContactId: dto.clientContactId || latestRev.clientContactId,
    contactPerson: dto.contactPerson || latestRev.contactPerson || '',
    contactEmail: dto.contactEmail || latestRev.contactEmail || '',
    contactPhone: dto.contactPhone || latestRev.contactPhone || '',
    paymentTermId: dto.paymentTermId || latestRev.paymentTermId,
    paymentTerms: dto.paymentTerms || latestRev.paymentTerms || '',
    deliveryTerms: dto.deliveryTerms || latestRev.deliveryTerms || '',
    currency: dto.currencyCode || latestRev.currencyCode || 'INR',
    currencyId: dto.currencyId || latestRev.currencyId,
    validUntil: dto.validUntil ? String(dto.validUntil).slice(0, 10) : (latestRev.validUntil ? String(latestRev.validUntil).slice(0, 10) : ''),
    termsAndConditions: dto.termsAndConditions || latestRev.termsAndConditions || '',
    otherCharges,
    otherChargesDescription: dto.otherChargesDescription || latestRev.otherChargesDescription || '',
    status,
    currentRevision: dto.currentRevision ?? latestRev.revisionNo ?? 0,
    items,
    taxes,
    subtotal,
    totalTax,
    grandTotal,
    negotiations,
    documents,
    revisions,
    mailLogs: Array.isArray(dto.emailLogs) ? dto.emailLogs : [],
    // Task 61 PO Fields
    poReceived: Boolean(dto.poReceived || dto.poNumber || poDetails),
    poDetails,
    orderConfirmationCount: Number(dto.orderConfirmationCount) || 0,
    isEditable: dto.isEditable ?? (status === 'Draft'),
    canRevise: dto.canRevise ?? (status === 'Sent' || status === 'In Negotiation'),
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
    createdOn: dto.createdOn || '',
    lastUpdatedAt: dto.lastUpdatedOn || dto.lastUpdatedAt || '',
  };
}

/**
 * Builds payload for POST /api/quotations (Create Rev 0)
 * Per Guide §5.4f.1
 */
export function buildCreateQuotationPayload(formValues = {}) {
  const lineItems = Array.isArray(formValues.items) && formValues.items.length > 0
    ? formValues.items.map((item) => ({
        id: null,
        productId: item.productId ? cleanId(item.productId) : null,
        description: item.description || item.specification || item.productName || '',
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        otherCharges: Number(item.otherCharges || item.lineCharges) || 0,
        taxConfigDetailId: item.taxConfigDetailId ? cleanId(item.taxConfigDetailId) : null,
        remarks: item.remarks || null,
      }))
    : null; // null copies the inquiry lines automatically per §5.4f.1

  const taxes = Array.isArray(formValues.taxes)
    ? formValues.taxes
        .filter((t) => t.taxConfigDetailId)
        .map((t) => ({ taxConfigDetailId: cleanId(t.taxConfigDetailId) }))
    : [];

  return {
    inquiryId: cleanId(formValues.inquiryId),
    revisionDate: formValues.revisionDate || new Date().toISOString().slice(0, 10),
    clientAddressId: formValues.clientAddressId ? cleanId(formValues.clientAddressId) : null,
    clientContactId: formValues.clientContactId ? cleanId(formValues.clientContactId) : null,
    paymentTermId: formValues.paymentTermId ? cleanId(formValues.paymentTermId) : null,
    currencyId: formValues.currencyId ? cleanId(formValues.currencyId) : null,
    validUntil: formValues.validUntil || null,
    deliveryTerms: formValues.deliveryTerms || '',
    termsAndConditions: formValues.termsAndConditions || '',
    otherCharges: Number(formValues.otherCharges) || 0,
    otherChargesDescription: formValues.otherChargesDescription || '',
    lineItems,
    taxes,
  };
}

/**
 * Builds payload for PUT /api/quotations/{id} (Edit Latest Revision - Draft only)
 */
export function buildUpdateQuotationPayload(formValues = {}) {
  const lineItems = Array.isArray(formValues.items)
    ? formValues.items.map((item) => ({
        id: item.quotationLineItemId ? cleanId(item.quotationLineItemId) : null,
        productId: item.productId ? cleanId(item.productId) : null,
        description: item.description || item.specification || item.productName || '',
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        otherCharges: Number(item.otherCharges || item.lineCharges) || 0,
        taxConfigDetailId: item.taxConfigDetailId ? cleanId(item.taxConfigDetailId) : null,
        remarks: item.remarks || null,
      }))
    : null;

  const taxes = Array.isArray(formValues.taxes)
    ? formValues.taxes
        .filter((t) => t.taxConfigDetailId)
        .map((t) => ({ taxConfigDetailId: cleanId(t.taxConfigDetailId) }))
    : [];

  return {
    revisionDate: formValues.revisionDate || new Date().toISOString().slice(0, 10),
    clientAddressId: formValues.clientAddressId ? cleanId(formValues.clientAddressId) : null,
    clientContactId: formValues.clientContactId ? cleanId(formValues.clientContactId) : null,
    paymentTermId: formValues.paymentTermId ? cleanId(formValues.paymentTermId) : null,
    currencyId: formValues.currencyId ? cleanId(formValues.currencyId) : null,
    validUntil: formValues.validUntil || null,
    deliveryTerms: formValues.deliveryTerms || '',
    termsAndConditions: formValues.termsAndConditions || '',
    otherCharges: Number(formValues.otherCharges) || 0,
    otherChargesDescription: formValues.otherChargesDescription || '',
    lineItems,
    taxes,
  };
}

/**
 * Builds FormData for Task 61: POST /api/quotations/{id}/po-received
 * Per Guide §5.4g line 892:
 * Multipart: poReceivedDate, poNumber, poReceivedBy?, poRemarks?, files, documentTitles?, documentRemarks?
 */
export function buildPoReceivedFormData(poData = {}) {
  const formData = new FormData();
  formData.append('poNumber', (poData.poNumber || '').trim());
  formData.append('poReceivedDate', poData.receivedOn || poData.poReceivedDate || new Date().toISOString().slice(0, 10));

  if (poData.poReceivedBy) {
    formData.append('poReceivedBy', poData.poReceivedBy);
  }
  if (poData.remarks || poData.poRemarks) {
    formData.append('poRemarks', (poData.remarks || poData.poRemarks || '').trim());
  }

  // File binary (if passed)
  if (poData.file instanceof File || poData.file instanceof Blob) {
    formData.append('files', poData.file, poData.fileName || poData.file.name || 'Client-PO.pdf');
    if (poData.documentTypeName || poData.documentTitle) {
      formData.append('documentTitles', poData.documentTypeName || poData.documentTitle || 'Customer PO');
    }
    if (poData.remarks) {
      formData.append('documentRemarks', poData.remarks);
    }
  }

  return formData;
}
