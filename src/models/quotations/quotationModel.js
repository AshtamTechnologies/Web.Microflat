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
    ...dto,
    id: Number.isInteger(dto.id) ? dto.id : null,
    quotationLineItemId: Number.isInteger(dto.id) ? dto.id : null,
    productId: dto.productId || dto.ProductId || null,
    productCode: dto.productCode || dto.itemCode || dto.ProductCode || dto.ItemCode || '',
    productName: dto.productName || dto.itemName || dto.ProductName || dto.ItemName || '',
    categoryId: dto.categoryId || dto.CategoryId || null,
    categoryName: dto.categoryName || dto.CategoryName || '',
    variantId: dto.variantId || dto.productVariantId || dto.VariantId || null,
    variantName: dto.variantName || dto.VariantName || '',
    standardCode: dto.standardCode || dto.standards || dto.StandardCode || '',
    standards: dto.standards || dto.standardCode || dto.StandardCode || '',
    standardId: dto.standardId || dto.StandardId || null,
    gradeCode: dto.gradeCode || dto.grade || dto.GradeCode || '',
    grade: dto.grade || dto.gradeCode || dto.GradeCode || '',
    gradeId: dto.gradeId || dto.GradeId || null,
    flatness: dto.flatness || dto.Flatness || '',
    itemCode: dto.itemCode || dto.productCode || dto.ItemCode || '',
    description: dto.description || dto.specification || '',
    specification: dto.specification || dto.description || '',
    technicalDetails: dto.technicalDetails || dto.specification || '',
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
    options: Array.isArray(dto.options) ? dto.options : (dto.options ? [dto.options] : []),
    rateSource: dto.rateSource || 'Manual',
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
    id: Number.isInteger(dto.id) ? dto.id : null,
    stageId: Number.isInteger(dto.id) ? dto.id : (Number.isInteger(dto.stageId) ? dto.stageId : null),
    revisionId: dto.revisionId,
    revisionNo: dto.revisionNo ?? 0,
    negotiationOn: dto.negotiationOn ? String(dto.negotiationOn).slice(0, 10) : (dto.date ? String(dto.date).slice(0, 10) : ''),
    date: dto.negotiationOn ? String(dto.negotiationOn).slice(0, 10) : (dto.date ? String(dto.date).slice(0, 10) : ''),
    handledByUserId: dto.handledByUserId,
    handledByName: dto.handledByName || dto.userName || 'Sales Exec',
    clientContactId: dto.clientContactId,
    contactName: dto.contactName || '',
    mode: dto.mode || 'Call',
    discussion: dto.discussion || dto.notes || '',
    notes: dto.discussion || dto.notes || '',
    ourOfferAmount: dto.ourOfferAmount !== undefined && dto.ourOfferAmount !== null ? Number(dto.ourOfferAmount) : null,
    ourOffer: dto.ourOfferAmount !== undefined && dto.ourOfferAmount !== null ? Number(dto.ourOfferAmount) : (dto.ourOffer !== undefined && dto.ourOffer !== null ? Number(dto.ourOffer) : null),
    clientCounterAmount: dto.clientCounterAmount !== undefined && dto.clientCounterAmount !== null ? Number(dto.clientCounterAmount) : null,
    clientCounter: dto.clientCounterAmount !== undefined && dto.clientCounterAmount !== null ? Number(dto.clientCounterAmount) : (dto.clientCounter !== undefined && dto.clientCounter !== null ? Number(dto.clientCounter) : null),
    createdOn: dto.createdOn || '',
    stageNo: dto.stageNo ?? null,
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
  const grandTotal = Number(
    dto.totalAmount ??
    dto.grandTotal ??
    dto.latestRevision?.grandTotal ??
    dto.latestRevision?.totalAmount ??
    dto.netAmount ??
    dto.finalAmount ??
    dto.latestRevisionTotal ??
    dto.total ??
    dto.amount
  ) || 0;
  const subtotal = Number(dto.subTotal ?? dto.subtotal ?? dto.latestRevision?.subTotal) || 0;
  const clientName = dto.clientName || dto.client?.companyName || dto.client?.clientName || dto.customerName || '';

  const rawStatus = dto.quotationStatus || dto.status || '';
  const isPoStatus = String(rawStatus).toLowerCase().replace(/[\s_-]/g, '') === 'poreceived';
  const poReceived = Boolean(dto.poReceived || dto.isPoReceived || dto.hasPo || dto.poNumber || isPoStatus);
  const status = isPoStatus ? 'PO Received' : (rawStatus || 'Draft');

  return {
    id: dto.id,
    quotationNo: dto.quotationNo || '',
    quotationDate: dto.revisionDate || dto.quotationDate ? String(dto.revisionDate || dto.quotationDate).slice(0, 10) : '',
    currentRevision: dto.currentRevision ?? dto.revisionNo ?? 0,
    revisionNo: dto.currentRevision ?? dto.revisionNo ?? 0,
    status,
    inquiryId: dto.inquiryId,
    inquiryNo: dto.inquiryNo || '',
    clientId: dto.clientId || dto.client?.id || null,
    clientCode: dto.clientCode || '',
    clientName,
    contactPerson: dto.contactPerson || '',
    contactEmail: dto.contactEmail || '',
    currency: dto.currencyCode || dto.currency || 'INR',
    subtotal,
    grandTotal,
    totalAmount: grandTotal,
    poReceived,
    poNumber: dto.poNumber || '',
    poReceivedDate: dto.poReceivedDate ? String(dto.poReceivedDate).slice(0, 10) : '',
    orderConfirmationCount: Number(dto.orderConfirmationCount) || 0,
    isEditable: dto.isEditable ?? (status === 'Draft'),
    canRevise: dto.canRevise ?? !poReceived,
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
    createdOn: dto.createdOn || '',
    lastUpdatedAt: dto.lastUpdatedOn || dto.lastUpdatedAt || '',
  };
}

export function formatAddressValue(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [
      addr.addressLabel || addr.addressType,
      addr.address1 || addr.addressLine1 || addr.address,
      addr.address2 || addr.addressLine2,
      addr.city,
      addr.stateName || addr.state,
      addr.zipCode || addr.pincode,
      addr.countryName || addr.country,
    ].filter(Boolean);
    return parts.join(', ');
  }
  return String(addr);
}

export function formatContactPersonValue(contact) {
  if (!contact) return '';
  if (typeof contact === 'string') return contact;
  if (typeof contact === 'object') {
    return contact.contactPerson || contact.contactName || contact.name || contact.fullName || '';
  }
  return String(contact);
}

/**
 * Normalizes full quotation details from GET /api/quotations/{id}
 */
export function quotationDetailFromApi(dto = {}) {
  if (!dto) return null;

  const latestRev = dto.latestRevision || {};
  const rawStatus = dto.quotationStatus || dto.status || latestRev.quotationStatus || latestRev.status || '';
  const isPoStatus = String(rawStatus).toLowerCase().replace(/[\s_-]/g, '') === 'poreceived';
  const initialStatus = isPoStatus ? 'PO Received' : (rawStatus || 'Draft');
  const grandTotal = Number(latestRev.totalAmount ?? dto.totalAmount ?? dto.grandTotal) || 0;
  const subtotal = Number(latestRev.subTotal ?? dto.subTotal ?? dto.subtotal) || 0;
  const otherCharges = Number(latestRev.otherCharges ?? dto.otherCharges) || 0;
  const totalTax = Number(latestRev.taxAmount ?? dto.taxAmount) || 0;

  // Client Name Resolution
  const clientName =
    dto.clientName ||
    dto.client?.companyName ||
    dto.client?.clientName ||
    dto.customerName ||
    latestRev.clientName ||
    latestRev.client?.companyName ||
    '';

  // Address & Contact Resolution (Handles object vs string responses from backend)
  const rawAddress =
    dto.clientAddress ||
    latestRev.clientAddress ||
    dto.address ||
    latestRev.address ||
    dto.client?.addresses?.[0] ||
    dto.inquiry?.clientAddress ||
    dto.inquiry?.address;
  const clientAddress = formatAddressValue(rawAddress);
  const clientAddressId =
    dto.clientAddressId ||
    latestRev.clientAddressId ||
    (typeof rawAddress === 'object' ? rawAddress?.clientAddressId || rawAddress?.id : null);

  const clientId =
    dto.clientId ||
    latestRev.clientId ||
    dto.client?.id ||
    dto.client?.clientId ||
    dto.inquiry?.clientId ||
    null;

  const clientContacts = dto.client?.contacts || latestRev.client?.contacts || [];

  const rawContact =
    dto.contactPerson ||
    latestRev.contactPerson ||
    dto.clientContact ||
    latestRev.clientContact ||
    dto.contact ||
    dto.client?.contacts?.[0] ||
    dto.inquiry?.contactPerson ||
    dto.inquiry?.clientContact ||
    null;
  const contactPerson = formatContactPersonValue(rawContact);
  const clientContactId =
    dto.clientContactId ||
    latestRev.clientContactId ||
    (typeof rawContact === 'object' ? rawContact?.clientContactId || rawContact?.id : null) ||
    clientContacts[0]?.clientContactId ||
    clientContacts[0]?.id ||
    null;
  const contactEmail =
    dto.contactEmail ||
    latestRev.contactEmail ||
    (typeof rawContact === 'object' ? rawContact?.email || rawContact?.contactEmail || rawContact?.officialEmail : '') ||
    clientContacts[0]?.email ||
    dto.client?.officialEmail ||
    dto.inquiry?.contactEmail ||
    '';
  const contactPhone =
    dto.contactPhone ||
    latestRev.contactPhone ||
    (typeof rawContact === 'object' ? rawContact?.phone || rawContact?.mobile || rawContact?.phoneNo || rawContact?.contactPhone : '') ||
    clientContacts[0]?.phoneNo ||
    clientContacts[0]?.mobile1 ||
    clientContacts[0]?.phone ||
    dto.client?.officialMobile ||
    dto.inquiry?.contactPhone ||
    '';

  // Normalize line items (supports latestRevision.lines, latestRevision.lineItems, dto.lines, dto.lineItems)
  const rawItems = latestRev.lines || latestRev.lineItems || dto.lines || dto.lineItems || latestRev.items || dto.items || [];
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

  // Normalize historical revisions list (ensure latest revision holds the line items)
  const revisions = Array.isArray(dto.revisions) && dto.revisions.length > 0
    ? dto.revisions.map((rev, revIdx) => {
        const revLines = rev.lines || rev.lineItems || rev.items || (revIdx === 0 ? rawItems : []);
        return {
          id: rev.id,
          revisionId: rev.id,
          revisionNo: rev.revisionNo ?? revIdx,
          revisionDate: rev.revisionDate ? String(rev.revisionDate).slice(0, 10) : '',
          revisionReason: rev.revisionReason || 'Revision',
          status: rev.quotationStatus || rev.status || 'Draft',
          subtotal: Number(rev.subTotal ?? rev.subtotal) || 0,
          totalTax: Number(rev.taxAmount) || 0,
          grandTotal: Number(rev.totalAmount ?? rev.grandTotal) || 0,
          currency: rev.currencyCode || rev.currency || 'INR',
          items: Array.isArray(revLines) ? revLines.map(quotationLineItemFromApi).filter(Boolean) : [],
        };
      })
    : [{
          id: Number.isInteger(latestRev.id) ? latestRev.id : null,
          revisionId: Number.isInteger(latestRev.id) ? latestRev.id : null,
        revisionNo: dto.currentRevision ?? latestRev.revisionNo ?? 0,
        revisionDate: (latestRev.revisionDate || dto.createdOn ? String(latestRev.revisionDate || dto.createdOn).slice(0, 10) : ''),
        revisionReason: latestRev.revisionReason || 'Initial quotation',
        status: initialStatus,
        subtotal,
        totalTax,
        grandTotal,
        currency: dto.currencyCode || latestRev.currencyCode || 'INR',
        items,
      }];

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

  const poReceived = Boolean(dto.poReceived || dto.isPoReceived || dto.hasPo || poDetails || isPoStatus);
  const resolvedStatus = isPoStatus || poReceived ? 'PO Received' : initialStatus;

  return {
    id: dto.id,
    quotationNo: dto.quotationNo || '',
    inquiryId: dto.inquiryId,
    inquiryNo: dto.inquiryNo || '',
    clientId: clientId || dto.clientId || dto.client?.id || null,
    clientCode: dto.clientCode || '',
    clientName,
    clientAddressId,
    clientAddress,
    clientContactId,
    contactPerson,
    contactEmail,
    contactPhone,
    paymentTermId: dto.paymentTermId || latestRev.paymentTermId || null,
    paymentTerms: dto.paymentTerms || latestRev.paymentTerms || '',
    deliveryTermId: dto.deliveryTermId || latestRev.deliveryTermId || null,
    deliveryTerms: dto.deliveryTerms || latestRev.deliveryTerms || '',
    currency: dto.currencyCode || latestRev.currencyCode || 'INR',
    currencyId: dto.currencyId || latestRev.currencyId,
    validUntil: dto.validUntil ? String(dto.validUntil).slice(0, 10) : (latestRev.validUntil ? String(latestRev.validUntil).slice(0, 10) : ''),
    termsAndConditions: dto.termsAndConditions || latestRev.termsAndConditions || '',
    otherCharges,
    otherChargesDescription: dto.otherChargesDescription || latestRev.otherChargesDescription || '',
    status: resolvedStatus,
    currentRevision: dto.currentRevision ?? latestRev.revisionNo ?? 0,
    latestRevisionId: latestRev.id ?? dto.latestRevision?.id ?? dto.revisions?.[0]?.id ?? null,
    approvalStatus: dto.approvalStatus ?? null,
    canSubmitForApproval: dto.canSubmitForApproval ?? false,
    pendingApprovalRequestId: dto.pendingApprovalRequestId ?? null,
    items,
    taxes,
    subtotal,
    totalTax,
    grandTotal,
    negotiations,
    documents,
    revisions,
    mailLogs: Array.isArray(dto.emailLogs)
      ? dto.emailLogs.map((log) => {
          const isSuccess = log.isSuccess !== undefined ? Boolean(log.isSuccess) : (log.result === 'Success');
          const sentAt = log.sentOn ? String(log.sentOn).replace('T', ' ').slice(0, 16) : (log.sentAt || '');
          return {
            id: Number.isInteger(log.id) ? log.id : null,
            sentAt,
            sentOn: log.sentOn || sentAt,
            to: log.toAddress || log.to || '',
            cc: log.ccAddress || log.cc || '',
            subject: log.subject || '',
            revisionNo: log.revisionNo ?? log.quotationRevisionNo ?? 0,
            result: log.result || (isSuccess ? 'Success' : 'Failed'),
            isSuccess,
            error: log.errorMessage || log.error || '',
          };
        })
      : [],
    // Task 61 PO Fields
    poReceived,
    poDetails,
    orderConfirmationCount: Number(dto.orderConfirmationCount) || 0,
    isEditable: dto.isEditable ?? (!poReceived && resolvedStatus === 'Draft'),
    canRevise: dto.canRevise ?? !poReceived,
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
    createdOn: dto.createdOn || '',
    lastUpdatedAt: dto.lastUpdatedOn || dto.lastUpdatedAt || '',
  };
}

/**
 * Sanitizes deliveryTerms to ensure it is always a string or null (never an array []).
 * Database column is max 500 characters.
 */
function formatDeliveryTerms(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const valid = value
      .filter(Boolean)
      .map(String)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return valid.length > 0 ? valid.join(', ').slice(0, 500) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
  }
  return null;
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
    deliveryTermId: formValues.deliveryTermId ? cleanId(formValues.deliveryTermId) : null,
    currencyId: formValues.currencyId ? cleanId(formValues.currencyId) : null,
    validUntil: formValues.validUntil || null,
    deliveryTerms: formatDeliveryTerms(formValues.deliveryTerms),
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
    deliveryTermId: formValues.deliveryTermId ? cleanId(formValues.deliveryTermId) : null,
    currencyId: formValues.currencyId ? cleanId(formValues.currencyId) : null,
    validUntil: formValues.validUntil || null,
    deliveryTerms: formatDeliveryTerms(formValues.deliveryTerms),
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
