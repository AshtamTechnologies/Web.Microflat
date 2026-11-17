/**
 * src/models/salesOrders/orderConfirmationModel.js
 * Domain model transformations and DTO normalizers for Order Confirmations.
 *
 * Confirmed Swagger Mappings:
 *   - Status field is orderStatus (mapped to status for UI components)
 *   - Total is totalAmount (mapped to grandTotal for UI components)
 *   - Subtotal is subTotal (mapped to subtotal for UI components)
 *   - Order number display field is orderConfirmationNo
 *   - documents array has downloadUrl — used directly for preview/download
 *   - isEditable and nextStatuses control edit/status actions directly
 *   - On create (POST), quotationId is integer and lineItems is null (backend auto-copies)
 */

/**
 * Normalizes a single list item from GET /api/order-confirmations
 * @param {object} dto
 * @returns {object}
 */
export function orderConfirmationListItemFromApi(dto) {
  if (!dto) return null;
  const status = dto.orderStatus || 'Draft';
  const grandTotal = Number(dto.totalAmount) || 0;

  return {
    id: dto.id,
    orderConfirmationNo: dto.orderConfirmationNo || '',
    orderConfirmationDate: dto.orderConfirmationDate ? String(dto.orderConfirmationDate).slice(0, 10) : '',
    status,
    orderStatus: status,
    quotationDetailId: dto.quotationDetailId,
    quotationId: dto.quotationId,
    quotationNo: dto.quotationNo || '',
    quotationRevisionNo: dto.quotationRevisionNo ?? 0,
    inquiryId: dto.inquiryId,
    inquiryNo: dto.inquiryNo || '',
    clientId: dto.clientId,
    clientCode: dto.clientCode || '',
    clientName: dto.clientName || '',
    clientPoNo: dto.clientPoNo || '',
    clientPoDate: dto.clientPoDate ? String(dto.clientPoDate).slice(0, 10) : '',
    expectedDeliveryDate: dto.expectedDeliveryDate ? String(dto.expectedDeliveryDate).slice(0, 10) : '',
    currency: dto.currencyCode || 'INR',
    currencyCode: dto.currencyCode || 'INR',
    grandTotal,
    totalAmount: grandTotal,
    createdBy: dto.createdBy,
    createdByName: dto.createdByName || '',
    createdOn: dto.createdOn || '',
    lastUpdatedOn: dto.lastUpdatedOn || '',
  };
}

/**
 * Normalizes full order confirmation detail from GET /api/order-confirmations/{id}
 * @param {object} dto
 * @returns {object}
 */
export function orderConfirmationDetailFromApi(dto) {
  if (!dto) return null;

  const status = dto.orderStatus || 'Draft';
  const grandTotal = Number(dto.totalAmount) || 0;
  const subtotal = Number(dto.subTotal) || 0;
  const otherCharges = Number(dto.otherCharges) || 0;
  const totalTax = Number(dto.taxAmount) || 0;

  // Format nested client address into a display string if object is provided
  let addressDisplay = '';
  if (dto.clientAddress) {
    if (typeof dto.clientAddress === 'string') {
      addressDisplay = dto.clientAddress;
    } else {
      const a = dto.clientAddress;
      addressDisplay = [a.addressLabel, a.address1, a.address2, a.city, a.stateName, a.zipCode]
        .filter(Boolean)
        .join(', ');
    }
  }

  // Normalize line items
  const lineItems = (dto.lineItems || []).map((item, idx) => ({
    id: item.id || `line-${idx}`,
    productId: item.productId,
    itemCode: item.productCode || '',
    productCode: item.productCode || '',
    productName: item.productName || 'Granite Product',
    variantName: item.uomName || '',
    uomName: item.uomName || '',
    quantity: Number(item.quantity) || 0,
    rate: Number(item.rate) || 0,
    amount: Number(item.amount) || 0,
    lineAmount: Number(item.amount) || 0,
    taxConfigDetailId: item.taxConfigDetailId,
    taxConfigId: item.taxConfigId,
    taxName: item.taxName || '',
    taxPercent: Number(item.taxPercent) || 0,
    taxAmount: Number(item.taxAmount) || 0,
    otherCharges: Number(item.otherCharges) || 0,
    remarks: item.remarks || '',
    quotationLineItemId: item.quotationLineItemId,
  }));

  // Normalize documents (downloadUrl is provided directly by backend Swagger)
  const documents = (dto.documents || []).map((doc, idx) => ({
    id: doc.id || `doc-${idx}`,
    documentTypeId: doc.documentTypeId,
    documentTypeName: doc.documentTypeName || 'Client PO',
    documentType: doc.documentTypeName || 'Client PO',
    fileName: doc.fileName || 'Attachment.pdf',
    downloadUrl: doc.downloadUrl || '',
    remarks: doc.remarks || '',
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByName || '',
    uploadedAt: doc.uploadedOn ? String(doc.uploadedOn).slice(0, 10) : '',
    uploadedOn: doc.uploadedOn || '',
  }));

  // Normalize taxes breakdown
  const taxes = (dto.taxes || []).map((tax, idx) => ({
    id: tax.id || `tax-${idx}`,
    taxConfigDetailId: tax.taxConfigDetailId,
    taxConfigId: tax.taxConfigId,
    taxName: tax.taxName || 'GST',
    taxPercent: Number(tax.taxPercent) || 0,
    taxAmount: Number(tax.taxAmount) || 0,
  }));

  // Normalize email logs
  const emailLogs = (dto.emailLogs || []).map((log, idx) => ({
    id: log.id || `mail-${idx}`,
    sentByUserId: log.sentByUserId,
    sentByName: log.sentByName || '',
    sentOn: log.sentOn || '',
    fromAddress: log.fromAddress || '',
    toAddress: log.toAddress || '',
    ccAddress: log.ccAddress || '',
    subject: log.subject || '',
    body: log.body || '',
    isSuccess: Boolean(log.isSuccess),
    errorMessage: log.errorMessage || '',
  }));

  return {
    id: dto.id,
    orderConfirmationNo: dto.orderConfirmationNo || '',
    orderConfirmationDate: dto.orderConfirmationDate ? String(dto.orderConfirmationDate).slice(0, 10) : '',
    status,
    orderStatus: status,
    isEditable: Boolean(dto.isEditable),
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
    quotationDetailId: dto.quotationDetailId,
    quotationId: dto.quotationId,
    quotationNo: dto.quotationNo || '',
    quotationRevisionNo: dto.quotationRevisionNo ?? 0,
    inquiryId: dto.inquiryId,
    inquiryNo: dto.inquiryNo || '',
    clientId: dto.clientId,
    clientCode: dto.clientCode || '',
    clientName: dto.clientName || '',
    gstNo: dto.gstNo || '',
    clientAddressId: dto.clientAddressId,
    clientAddress: addressDisplay,
    clientContactId: dto.clientContactId,
    contactPerson: dto.clientContactName || '',
    contactEmail: dto.clientContactEmail || '',
    contactPhone: dto.clientContactPhone || '',
    clientPoNo: dto.clientPoNo || '',
    clientPoDate: dto.clientPoDate ? String(dto.clientPoDate).slice(0, 10) : '',
    expectedDeliveryDate: dto.expectedDeliveryDate ? String(dto.expectedDeliveryDate).slice(0, 10) : '',
    paymentTermId: dto.paymentTermId,
    paymentTerms: dto.paymentTermName || '',
    paymentTermName: dto.paymentTermName || '',
    currency: dto.currencyCode || 'INR',
    currencyCode: dto.currencyCode || 'INR',
    currencyId: dto.currencyId,
    deliveryTerms: dto.deliveryTerms || dto.deliveryTermName || '',
    deliveryTermId: dto.deliveryTermId,
    deliveryTermName: dto.deliveryTermName || '',
    termsAndConditions: dto.termsAndConditions || '',
    subtotal,
    subTotal: subtotal,
    otherCharges,
    otherChargesDescription: dto.otherChargesDescription || '',
    totalTax,
    taxAmount: totalTax,
    grandTotal,
    totalAmount: grandTotal,
    remarks: dto.remarks || '',
    createdBy: dto.createdBy,
    createdByName: dto.createdByName || '',
    createdOn: dto.createdOn || '',
    lastUpdatedBy: dto.lastUpdatedBy,
    lastUpdatedByName: dto.lastUpdatedByName || '',
    lastUpdatedOn: dto.lastUpdatedOn || '',
    lineItems,
    taxes,
    documents,
    emailLogs,
  };
}

/**
 * Builds CreateOrderConfirmationRequestDto for POST /api/order-confirmations
 * Rules:
 *   - quotationId is mandatory integer
 *   - lineItems and taxes must be null (backend auto-copies from quotation latest revision)
 * @param {object} form
 * @returns {object}
 */
export function buildCreateOrderConfirmationPayload(form) {
  const payload = {
    quotationId: Number(form.quotationId),
    orderConfirmationDate: form.orderConfirmationDate || null,
    clientAddressId: form.clientAddressId ? Number(form.clientAddressId) : null,
    clientContactId: form.clientContactId ? Number(form.clientContactId) : null,
    clientPoNo: form.clientPoNo ? String(form.clientPoNo).trim() : null,
    clientPoDate: form.clientPoDate || null,
    paymentTermId: form.paymentTermId ? Number(form.paymentTermId) : null,
    deliveryTerms: form.deliveryTerms ? String(form.deliveryTerms).trim() : null,
    deliveryTermId: form.deliveryTermId ? Number(form.deliveryTermId) : null,
    expectedDeliveryDate: form.expectedDeliveryDate || null,
    termsAndConditions: form.termsAndConditions ? String(form.termsAndConditions).trim() : null,
    otherCharges: form.otherCharges !== undefined && form.otherCharges !== null ? Number(form.otherCharges) : 0,
    otherChargesDescription: form.otherChargesDescription ? String(form.otherChargesDescription).trim() : null,
    remarks: form.remarks ? String(form.remarks).trim() : null,
    lineItems: null, // Required null per Swagger & Guide §5.4g
    taxes: null,     // Required null per Swagger & Guide §5.4g
  };

  return payload;
}

/**
 * Builds OrderConfirmationRequestDto for PUT /api/order-confirmations/{id}
 * Used to modify a Draft order confirmation.
 * @param {object} form
 * @returns {object}
 */
export function buildUpdateOrderConfirmationPayload(form) {
  const payload = {
    orderConfirmationDate: form.orderConfirmationDate || null,
    clientAddressId: form.clientAddressId ? Number(form.clientAddressId) : null,
    clientContactId: form.clientContactId ? Number(form.clientContactId) : null,
    clientPoNo: form.clientPoNo ? String(form.clientPoNo).trim() : null,
    clientPoDate: form.clientPoDate || null,
    paymentTermId: form.paymentTermId ? Number(form.paymentTermId) : null,
    deliveryTerms: form.deliveryTerms ? String(form.deliveryTerms).trim() : null,
    deliveryTermId: form.deliveryTermId ? Number(form.deliveryTermId) : null,
    expectedDeliveryDate: form.expectedDeliveryDate || null,
    termsAndConditions: form.termsAndConditions ? String(form.termsAndConditions).trim() : null,
    otherCharges: form.otherCharges !== undefined && form.otherCharges !== null ? Number(form.otherCharges) : 0,
    otherChargesDescription: form.otherChargesDescription ? String(form.otherChargesDescription).trim() : null,
    remarks: form.remarks ? String(form.remarks).trim() : null,
  };

  // On PUT: if lineItems is passed as an array, send SalesLineRequestDto[]
  if (Array.isArray(form.lineItems) && form.lineItems.length > 0) {
    payload.lineItems = form.lineItems.map((item) => ({
      id: typeof item.id === 'number' ? item.id : null,
      productId: Number(item.productId || 1),
      description: item.description || item.technicalDetails || null,
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      taxConfigDetailId: item.taxConfigDetailId ? Number(item.taxConfigDetailId) : null,
      otherCharges: item.otherCharges !== undefined ? Number(item.otherCharges) : 0,
      remarks: item.remarks || null,
    }));
  } else {
    payload.lineItems = null;
  }

  // On PUT: taxes can be null or array
  if (Array.isArray(form.taxes) && form.taxes.length > 0) {
    payload.taxes = form.taxes
      .filter((t) => t.taxConfigDetailId)
      .map((t) => ({
        taxConfigDetailId: Number(t.taxConfigDetailId),
      }));
  } else {
    payload.taxes = null;
  }

  return payload;
}
