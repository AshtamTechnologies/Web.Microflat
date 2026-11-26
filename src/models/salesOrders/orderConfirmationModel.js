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

export function getNextOrderStatuses(status) {
  if (status === 'Draft') return ['Confirmed', 'Cancelled'];
  if (status === 'Confirmed') return ['Cancelled', 'Closed'];
  return [];
}

export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

export function getOrderStatusBadgeVariant(status) {
  if (status === 'Confirmed') return 'success';
  if (status === 'Cancelled') return 'danger';
  if (status === 'Closed') return 'neutral';
  return 'neutral';
}

export const TAX_TREATMENTS = [
  { value: 'INTRA_STATE', label: 'Intra-State (CGST + SGST)' },
  { value: 'INTER_STATE', label: 'Inter-State (IGST)' },
  { value: 'EXPORT_LUT', label: 'Export under LUT (0%)' },
  { value: 'EXEMPT', label: 'Exempt / Nil Rated' },
];

export function calculateSalesOrderTotals(
  items = [],
  taxTreatment = 'INTRA_STATE',
  headerOtherCharges = 0,
  selectedTaxes = []
) {
  let subtotal = 0;
  let lineTaxAmount = 0;

  const calculatedItems = (items || []).map((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const itemOtherCharges = Number(item.otherCharges) || 0;
    const lineAmount = qty * rate + itemOtherCharges;
    const taxRate = Number(item.taxPercent !== undefined && item.taxPercent !== null ? item.taxPercent : 0);
    const lineTax = (lineAmount * taxRate) / 100;

    subtotal += lineAmount;
    lineTaxAmount += lineTax;

    return {
      ...item,
      quantity: qty,
      rate,
      otherCharges: itemOtherCharges,
      taxPercent: taxRate,
      lineAmount,
      lineTax,
    };
  });

  const extraCharges = Number(headerOtherCharges) || 0;
  const isTaxZero = taxTreatment === 'EXPORT_LUT' || taxTreatment === 'EXEMPT';
  const extraTax = isTaxZero ? 0 : (extraCharges * 18) / 100;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (Array.isArray(selectedTaxes) && selectedTaxes.length > 0) {
    selectedTaxes.forEach((t) => {
      const pct = Number(t.taxPercent || t.percent || 0);
      const taxAmt = ((subtotal + extraCharges) * pct) / 100;
      const name = (t.taxName || t.name || '').toUpperCase();
      if (name.includes('CGST')) cgst += taxAmt;
      else if (name.includes('SGST')) sgst += taxAmt;
      else if (name.includes('IGST')) igst += taxAmt;
    });
  } else if (taxTreatment === 'INTRA_STATE') {
    cgst = (lineTaxAmount + extraTax) / 2;
    sgst = (lineTaxAmount + extraTax) / 2;
  } else if (taxTreatment === 'INTER_STATE') {
    igst = lineTaxAmount + extraTax;
  }

  const totalTax = cgst + sgst + igst || (lineTaxAmount + extraTax);
  const grandTotal = subtotal + extraCharges + totalTax;

  return {
    subtotal,
    lineItems: calculatedItems,
    headerOtherCharges: extraCharges,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
  };
}

/**
 * Normalizes a single list item from GET /api/order-confirmations
 * @param {object} dto
 * @returns {object}
 */
export function orderConfirmationListItemFromApi(dto) {
  if (!dto) return null;
  const status = dto.orderStatus || dto.status || 'Draft';
  const grandTotal = Number(dto.totalAmount) || 0;
  const orderSource = dto.orderSource ?? false;
  const orderSourceName = dto.orderSourceName || (orderSource ? 'Direct' : 'Quotation');

  return {
    id: dto.id,
    orderConfirmationNo: dto.orderConfirmationNo || '',
    orderConfirmationDate: dto.orderConfirmationDate ? String(dto.orderConfirmationDate).slice(0, 10) : '',
    status,
    orderStatus: status,
    orderSource,
    orderSourceName,
    isDirectOrder: Boolean(orderSource),
    isEditable: dto.isEditable !== undefined ? Boolean(dto.isEditable) : (status === 'Draft'),
    quotationDetailId: dto.quotationDetailId ?? null,
    quotationId: dto.quotationId ?? null,
    quotationNo: dto.quotationNo || null,
    quotationRevisionNo: dto.quotationRevisionNo ?? null,
    inquiryId: dto.inquiryId ?? null,
    inquiryNo: dto.inquiryNo || null,
    clientId: dto.clientId,
    clientCode: dto.clientCode || dto.client?.clientCode || '',
    clientName: dto.clientName || dto.client?.clientName || dto.client?.companyName || dto.customerName || '',
    contactPerson: dto.clientContactName || dto.contactPerson || dto.clientContact?.fullName || dto.clientContact?.name || '',
    clientPoNo: dto.clientPoNo || '',
    clientPoDate: dto.clientPoDate ? String(dto.clientPoDate).slice(0, 10) : '',
    expectedDeliveryDate: dto.expectedDeliveryDate ? String(dto.expectedDeliveryDate).slice(0, 10) : '',
    currency: dto.currencyCode || 'INR',
    currencyCode: dto.currencyCode || 'INR',
    grandTotal,
    totalAmount: grandTotal,
    confirmedOn: dto.confirmedOn ? String(dto.confirmedOn).slice(0, 10) : (dto.confirmedDate ? String(dto.confirmedDate).slice(0, 10) : null),
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

  const status = dto.orderStatus || dto.status || 'Draft';
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
    variantName: item.variantName || item.productVariantName || item.specification || item.uomName || '',
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

  let cgst = Number(dto.cgst) || 0;
  let sgst = Number(dto.sgst) || 0;
  let igst = Number(dto.igst) || 0;

  taxes.forEach((t) => {
    const name = (t.taxName || '').toUpperCase();
    if (name.includes('CGST')) cgst = t.taxAmount;
    else if (name.includes('SGST')) sgst = t.taxAmount;
    else if (name.includes('IGST')) igst = t.taxAmount;
  });

  const taxTreatment = dto.taxTreatment || (igst > 0 ? 'INTER_STATE' : (cgst > 0 || sgst > 0 ? 'INTRA_STATE' : (totalTax > 0 ? 'INTER_STATE' : 'EXEMPT')));

  // Normalize email logs
  const emailLogs = (dto.emailLogs || []).map((log, idx) => {
    const isSuccess = log.isSuccess !== undefined ? Boolean(log.isSuccess) : (log.result === 'Success');
    const sentAt = log.sentAt || log.sentOn || '';
    const to = log.to || log.toAddress || '';
    const cc = log.cc || log.ccAddress || '';
    const result = log.result || (isSuccess ? 'Success' : 'Failed');
    return {
      id: log.id || `mail-${idx}`,
      sentByUserId: log.sentByUserId,
      sentByName: log.sentByName || '',
      sentOn: sentAt,
      sentAt,
      fromAddress: log.fromAddress || '',
      toAddress: to,
      to,
      ccAddress: cc,
      cc,
      subject: log.subject || '',
      body: log.body || '',
      isSuccess,
      result,
      errorMessage: log.errorMessage || '',
    };
  });

  const orderSource = dto.orderSource ?? false;
  const orderSourceName = dto.orderSourceName || (orderSource ? 'Direct' : 'Quotation');

  return {
    id: dto.id,
    orderConfirmationNo: dto.orderConfirmationNo || '',
    orderConfirmationDate: dto.orderConfirmationDate ? String(dto.orderConfirmationDate).slice(0, 10) : '',
    status,
    orderStatus: status,
    orderSource,
    orderSourceName,
    isDirectOrder: Boolean(orderSource),
    isEditable: dto.isEditable !== undefined ? Boolean(dto.isEditable) : (status === 'Draft'),
    nextStatuses: Array.isArray(dto.nextStatuses) && dto.nextStatuses.length > 0 ? dto.nextStatuses : getNextOrderStatuses(status),
    quotationDetailId: dto.quotationDetailId ?? null,
    quotationId: dto.quotationId ?? null,
    quotationNo: dto.quotationNo || null,
    quotationRevisionNo: dto.quotationRevisionNo ?? null,
    inquiryId: dto.inquiryId ?? null,
    inquiryNo: dto.inquiryNo || null,
    clientId: dto.clientId,
    clientDetailId: dto.clientDetailId ?? null,
    clientCode: dto.clientCode || dto.client?.clientCode || '',
    clientName: dto.clientName || dto.client?.clientName || dto.client?.companyName || dto.customerName || '',
    gstNo: dto.gstNo || '',
    clientAddressId: dto.clientAddressId,
    clientAddress: addressDisplay,
    clientContactId: dto.clientContactId || dto.clientContact?.id || null,
    contactPerson: dto.clientContactName || dto.contactPerson || dto.clientContact?.fullName || dto.clientContact?.name || '',
    contactEmail: dto.clientContactEmail || dto.contactEmail || dto.clientContact?.email || '',
    contactPhone: dto.clientContactPhone || dto.contactPhone || dto.clientContact?.phone || dto.clientContact?.mobile || '',
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
    taxTreatment,
    cgst,
    sgst,
    igst,
    grandTotal,
    totalAmount: grandTotal,
    remarks: dto.remarks || '',
    createdBy: dto.createdBy,
    createdByName: dto.createdByName || '',
    createdOn: dto.createdOn || '',
    confirmedOn: dto.confirmedOn ? String(dto.confirmedOn).slice(0, 10) : (dto.confirmedDate ? String(dto.confirmedDate).slice(0, 10) : null),
    confirmedBy: dto.confirmedBy || null,
    confirmedByName: dto.confirmedByName || '',
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
 *   - Direct order (orderSource: true):
 *       quotationId must be null
 *       clientId, clientAddressId are required
 *       currencyId defaults to selected/INR
 *       lineItems is an array (at least 1 line needed to Confirm)
 *   - Quotation order (orderSource: false):
 *       quotationId is mandatory integer
 *       lineItems and taxes must be null (backend auto-copies from quotation latest revision)
 *       currencyId and clientId should not be sent
 * @param {object} form
 * @returns {object}
 */
export function buildCreateOrderConfirmationPayload(form) {
  let cleanQuotationId = null;
  if (form.quotationId) {
    if (typeof form.quotationId === 'number' && Number.isFinite(form.quotationId)) {
      cleanQuotationId = form.quotationId;
    } else {
      const match = String(form.quotationId).match(/(\d+)$/);
      if (match) cleanQuotationId = Number(match[1]);
    }
  }

  const isDirect = Boolean(
    form.orderSource === true ||
    form.isDirectOrder ||
    (!cleanQuotationId && form.clientId)
  );

  const payload = {
    orderSource: isDirect,
    quotationId: isDirect ? null : cleanQuotationId,
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

  if (isDirect) {
    payload.clientId = Number(form.clientId);
    if (form.currencyId) {
      payload.currencyId = Number(form.currencyId);
    }
    payload.lineItems = Array.isArray(form.lineItems) && form.lineItems.length > 0
      ? form.lineItems.map((item) => ({
          productId: Number(item.productId) && !isNaN(Number(item.productId)) ? Number(item.productId) : 1,
          quantity: Number(item.quantity) || 1,
          rate: Number(item.rate) || 0,
          taxConfigDetailId: item.taxConfigDetailId ? Number(item.taxConfigDetailId) : null,
          otherCharges: item.otherCharges !== undefined && item.otherCharges !== null ? Number(item.otherCharges) : null,
          remarks: item.remarks ? String(item.remarks).trim() : null,
        }))
      : [];

    payload.taxes = Array.isArray(form.taxes) && form.taxes.length > 0
      ? form.taxes
          .filter((t) => t.taxConfigDetailId)
          .map((t) => ({
            taxConfigDetailId: Number(t.taxConfigDetailId),
          }))
      : null;
  } else {
    payload.lineItems = null;
    payload.taxes = null;
  }

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
  if (Array.isArray(form.lineItems)) {
    payload.lineItems = form.lineItems.map((item) => ({
      id: item.id && !isNaN(Number(item.id)) ? Number(item.id) : null,
      productId: Number(item.productId) && !isNaN(Number(item.productId)) ? Number(item.productId) : 1,
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      taxConfigDetailId: item.taxConfigDetailId ? Number(item.taxConfigDetailId) : null,
      otherCharges: item.otherCharges !== undefined && item.otherCharges !== null ? Number(item.otherCharges) : null,
      remarks: item.remarks ? String(item.remarks).trim() : null,
    }));
  } else {
    payload.lineItems = null;
  }

  // On PUT: taxes can be null or array
  if (Array.isArray(form.taxes)) {
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
