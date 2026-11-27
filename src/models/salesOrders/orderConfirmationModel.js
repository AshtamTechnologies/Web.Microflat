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
  if (status === 'Confirmed') return ['Cancelled'];
  return [];
}

function optionalNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatCurrency(amount, currency) {
  const num = optionalNumber(amount);
  if (num == null) return '—';
  if (!currency) {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(num);
}

export function getOrderStatusBadgeVariant(status) {
  if (status === 'Confirmed') return 'success';
  if (status === 'Cancelled') return 'danger';
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
  taxTreatment = '',
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
  const extraTax = 0;

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
  const status = dto.orderStatus || dto.status || '';
  const grandTotal = optionalNumber(dto.totalAmount);
  const orderSource = dto.orderSource ?? null;
  const orderSourceName = dto.orderSourceName || (orderSource == null ? '' : (orderSource ? 'Direct' : 'Quotation'));

  return {
    id: dto.id,
    orderConfirmationNo: dto.orderConfirmationNo || '',
    orderConfirmationDate: dto.orderConfirmationDate ? String(dto.orderConfirmationDate).slice(0, 10) : '',
    status,
    orderStatus: status,
    orderSource,
    orderSourceName,
    isDirectOrder: orderSource == null ? null : Boolean(orderSource),
    isEditable: Boolean(dto.isEditable),
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
    currency: dto.currencyCode || '',
    currencyCode: dto.currencyCode || '',
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

  const status = dto.orderStatus || dto.status || '';
  const grandTotal = optionalNumber(dto.totalAmount);
  const subtotal = optionalNumber(dto.subTotal);
  const otherCharges = optionalNumber(dto.otherCharges);
  const totalTax = optionalNumber(dto.taxAmount);

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
  const lineItems = (dto.lineItems || []).map((item) => ({
    id: item.id ?? null,
    productId: item.productId,
    itemCode: item.productCode || '',
    productCode: item.productCode || '',
    productName: item.productName || '',
    variantName: item.variantName || item.productVariantName || item.specification || item.uomName || '',
    uomName: item.uomName || '',
    quantity: optionalNumber(item.quantity),
    rate: optionalNumber(item.rate),
    amount: optionalNumber(item.amount),
    lineAmount: optionalNumber(item.amount),
    taxConfigDetailId: item.taxConfigDetailId,
    taxConfigId: item.taxConfigId,
    taxName: item.taxName || '',
    taxPercent: optionalNumber(item.taxPercent),
    taxAmount: optionalNumber(item.taxAmount),
    otherCharges: optionalNumber(item.otherCharges),
    remarks: item.remarks || '',
    quotationLineItemId: item.quotationLineItemId,
  }));

  // Normalize documents (downloadUrl is provided directly by backend Swagger)
  const documents = (dto.documents || []).map((doc) => ({
    id: doc.id ?? null,
    documentTypeId: doc.documentTypeId,
    documentTypeName: doc.documentTypeName || '',
    documentType: doc.documentTypeName || '',
    fileName: doc.fileName || '',
    downloadUrl: doc.downloadUrl || '',
    remarks: doc.remarks || '',
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploadedByName || '',
    uploadedAt: doc.uploadedOn ? String(doc.uploadedOn).slice(0, 10) : '',
    uploadedOn: doc.uploadedOn || '',
  }));

  // Normalize taxes breakdown
  const taxes = (dto.taxes || []).map((tax) => ({
    id: tax.id ?? null,
    taxConfigDetailId: tax.taxConfigDetailId,
    taxConfigId: tax.taxConfigId,
    taxName: tax.taxName || '',
    taxPercent: optionalNumber(tax.taxPercent),
    taxAmount: optionalNumber(tax.taxAmount),
  }));

  let cgst = optionalNumber(dto.cgst);
  let sgst = optionalNumber(dto.sgst);
  let igst = optionalNumber(dto.igst);

  taxes.forEach((t) => {
    const name = (t.taxName || '').toUpperCase();
    if (name.includes('CGST') && t.taxAmount != null) cgst = t.taxAmount;
    else if (name.includes('SGST') && t.taxAmount != null) sgst = t.taxAmount;
    else if (name.includes('IGST') && t.taxAmount != null) igst = t.taxAmount;
  });

  const taxTreatment = dto.taxTreatment || (igst > 0 ? 'INTER_STATE' : (cgst > 0 || sgst > 0 ? 'INTRA_STATE' : null));

  // Normalize email logs
  const emailLogs = (dto.emailLogs || []).map((log) => {
    const isSuccess = log.isSuccess !== undefined ? Boolean(log.isSuccess) : (log.result === 'Success');
    const sentAt = log.sentAt || log.sentOn || '';
    const to = log.to || log.toAddress || '';
    const cc = log.cc || log.ccAddress || '';
    const result = log.result || (isSuccess ? 'Success' : 'Failed');
    return {
      id: log.id ?? null,
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

  const orderSource = dto.orderSource ?? null;
  const orderSourceName = dto.orderSourceName || (orderSource == null ? '' : (orderSource ? 'Direct' : 'Quotation'));

  return {
    id: dto.id,
    orderConfirmationNo: dto.orderConfirmationNo || '',
    orderConfirmationDate: dto.orderConfirmationDate ? String(dto.orderConfirmationDate).slice(0, 10) : '',
    status,
    orderStatus: status,
    orderSource,
    orderSourceName,
    isDirectOrder: orderSource == null ? null : Boolean(orderSource),
    isEditable: Boolean(dto.isEditable),
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
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
    contactPhone:
      dto.clientContactPhone ||
      dto.contactPhone ||
      dto.clientContact?.phoneNo ||
      dto.clientContact?.mobile1 ||
      dto.clientContact?.phone ||
      dto.clientContact?.mobile ||
      '',
    clientPoNo: dto.clientPoNo || '',
    clientPoDate: dto.clientPoDate ? String(dto.clientPoDate).slice(0, 10) : '',
    expectedDeliveryDate: dto.expectedDeliveryDate ? String(dto.expectedDeliveryDate).slice(0, 10) : '',
    paymentTermId: dto.paymentTermId,
    paymentTerms: dto.paymentTermName || '',
    paymentTermName: dto.paymentTermName || '',
    currency: dto.currencyCode || '',
    currencyCode: dto.currencyCode || '',
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
 *       currencyId comes from the selected API currency lookup
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
    } else if (typeof form.quotationId === 'string' && /^\d+$/.test(form.quotationId.trim())) {
      cleanQuotationId = Number(form.quotationId.trim());
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
          productId: item.productId ? Number(item.productId) : null,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
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
      productId: item.productId ? Number(item.productId) : null,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
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
