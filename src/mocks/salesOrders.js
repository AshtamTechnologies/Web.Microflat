/**
 * salesOrders.js — Mock data, statuses, and helpers for Sales Order (Order Confirmation) module.
 *
 * Aligned with Frontend-API-Guide.md §5.4g (Order confirmations).
 */

import {
  calculateQuotationTotals,
  formatCurrency,
  TAX_SLABS,
  TAX_TREATMENTS,
  PAYMENT_TERMS_OPTIONS,
  DELIVERY_TERMS_OPTIONS,
} from './quotations';

export {
  calculateQuotationTotals,
  formatCurrency,
  TAX_SLABS,
  TAX_TREATMENTS,
  PAYMENT_TERMS_OPTIONS,
  DELIVERY_TERMS_OPTIONS,
};

export const ORDER_CONFIRMATION_STATUSES = [
  { id: 'Draft', name: 'Draft', variant: 'neutral' },
  { id: 'Confirmed', name: 'Confirmed', variant: 'success' },
  { id: 'Cancelled', name: 'Cancelled', variant: 'danger' },
];

export const ORDER_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const ORDER_DOCUMENT_TYPES = [
  { value: 'Client PO', label: 'Client PO' },
  { value: 'Order Confirmation', label: 'Order Confirmation' },
  { value: 'Technical Drawing', label: 'Technical Drawing' },
  { value: 'Delivery Schedule', label: 'Delivery Schedule' },
  { value: 'Other Document', label: 'Other Document' },
];

export function getOrderStatusBadgeVariant(status) {
  if (status === 'Confirmed') return 'success';
  if (status === 'Cancelled') return 'danger';
  return 'neutral';
}

export function getNextOrderStatuses(status) {
  if (status === 'Draft') return ['Confirmed', 'Cancelled'];
  if (status === 'Confirmed') return ['Cancelled'];
  return [];
}

/**
 * Computes order confirmation totals including optional document-level otherCharges
 * on top of line items (matching §5.4f / §5.4g totals behavior).
 */
export function calculateSalesOrderTotals(
  items = [],
  taxTreatment = 'INTRA_STATE',
  headerOtherCharges = 0
) {
  const base = calculateQuotationTotals(items, taxTreatment);
  const extraCharges = Number(headerOtherCharges) || 0;
  const isTaxZero = taxTreatment === 'EXPORT_LUT' || taxTreatment === 'EXEMPT';
  const extraTax = isTaxZero ? 0 : (extraCharges * 18) / 100;

  let cgst = base.cgst;
  let sgst = base.sgst;
  let igst = base.igst;

  if (taxTreatment === 'INTRA_STATE') {
    cgst += extraTax / 2;
    sgst += extraTax / 2;
  } else if (taxTreatment === 'INTER_STATE') {
    igst += extraTax;
  }

  const totalTax = base.totalTax + extraTax;
  const grandTotal = base.subtotal + extraCharges + totalTax;

  return {
    ...base,
    headerOtherCharges: extraCharges,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
  };
}

export const INITIAL_SALES_ORDERS = [
  {
    id: 'OC-2026-000001',
    orderConfirmationNo: 'OC-2026-000001',
    orderConfirmationDate: '2026-10-29',
    quotationId: 'QT-2026-0002',
    quotationNo: 'QT-2026-0002',
    quotationRevisionNo: 1,
    inquiryId: 'inq-377',
    inquiryNo: 'INQ-2026-000377',
    clientId: 'client-4',
    clientName: 'Bluepoint Metrology',
    clientAddress: 'Whitefield Tech Park, Bangalore',
    contactPerson: 'Karthik Rao',
    contactEmail: 'karthik@bluepoint.example',
    contactPhone: '9900112233',
    clientPoNo: 'PO-BP-4471',
    clientPoDate: '2026-10-28',
    expectedDeliveryDate: '2026-11-20',
    paymentTerms: 'Net 30 Days',
    deliveryTerms: 'Ex-works Bangalore, 3 weeks',
    currency: 'INR',
    taxTreatment: 'INTER_STATE',
    otherCharges: 0,
    otherChargesDescription: '',
    termsAndConditions: '1. PO confirmed and validated.\n2. Delivery as per schedule.',
    remarks: 'Priority dispatch requested by client QA team.',
    status: 'Confirmed',
    isEditable: false,
    nextStatuses: ['Cancelled'],
    confirmedOn: '2026-10-29',
    lastUpdatedBy: 'Faizan Vahora',
    lastUpdatedAt: '2026-10-29T11:20:00',
    lineItems: [
      {
        id: 'oc-it-1',
        quotationLineItemId: 'it-41',
        productId: 'prod-gap',
        productName: 'Granite Angle Plate',
        variantId: 'var-gap-1',
        variantName: '300 × 300 × 300 mm · Gr-0',
        itemCode: 'AP-GR-300x300-GR0',
        technicalDetails: 'Trihedral square',
        quantity: 2,
        rate: 64407,
        otherCharges: 0,
        taxPercent: 18,
        lineAmount: 128814,
        lineTax: 23186.52,
        remarks: 'Standard calibration certificate included',
      },
    ],
    subtotal: 128814,
    totalTax: 23186.52,
    cgst: 0,
    sgst: 0,
    igst: 23186.52,
    grandTotal: 152000.52,
    documents: [
      {
        id: 'oc-doc-1',
        fileName: 'Client-PO-4471.pdf',
        documentType: 'Client PO',
        uploadedAt: '2026-10-29',
        fileSize: '620 KB',
        remarks: 'Signed PO from Bluepoint Metrology',
      },
      {
        id: 'oc-doc-2',
        fileName: 'OC-2026-000001_Signed.pdf',
        documentType: 'Order Confirmation',
        uploadedAt: '2026-10-29',
        fileSize: '384 KB',
        remarks: 'Issued order confirmation copy',
      },
    ],
    emailLogs: [
      {
        id: 'oc-mail-1',
        sentAt: '2026-10-29 11:30',
        to: 'karthik@bluepoint.example',
        cc: 'accounts@bluepoint.example',
        subject: 'Order Confirmation OC-2026-000001 · Against PO-BP-4471',
        result: 'Success',
        error: '',
      },
    ],
  },
  {
    id: 'OC-2026-000002',
    orderConfirmationNo: 'OC-2026-000002',
    orderConfirmationDate: '2026-11-05',
    quotationId: 'QT-2026-0002',
    quotationNo: 'QT-2026-0002',
    quotationRevisionNo: 1,
    inquiryId: 'inq-377',
    inquiryNo: 'INQ-2026-000377',
    clientId: 'client-4',
    clientName: 'Bluepoint Metrology',
    clientAddress: 'Whitefield Tech Park, Bangalore',
    contactPerson: 'Karthik Rao',
    contactEmail: 'karthik@bluepoint.example',
    contactPhone: '9900112233',
    clientPoNo: 'PO-BP-4510-ADD',
    clientPoDate: '2026-11-04',
    expectedDeliveryDate: '2026-12-05',
    paymentTerms: 'Net 30 Days',
    deliveryTerms: 'Door Delivery Included',
    currency: 'INR',
    taxTreatment: 'INTER_STATE',
    otherCharges: 2500,
    otherChargesDescription: 'Special crating & insured freight',
    termsAndConditions: '1. Additional batch against QT-2026-0002.\n2. Inspection before dispatch.',
    remarks: 'Awaiting final PO PDF upload before confirmation.',
    status: 'Draft',
    isEditable: true,
    nextStatuses: ['Confirmed', 'Cancelled'],
    confirmedOn: null,
    lastUpdatedBy: 'Janvi Motwani',
    lastUpdatedAt: '2026-11-05T15:10:00',
    lineItems: [
      {
        id: 'oc-it-2',
        quotationLineItemId: 'it-41',
        productId: 'prod-gap',
        productName: 'Granite Angle Plate',
        variantId: 'var-gap-1',
        variantName: '300 × 300 × 300 mm · Gr-0',
        itemCode: 'AP-GR-300x300-GR0',
        technicalDetails: 'Trihedral square',
        quantity: 1,
        rate: 64407,
        otherCharges: 0,
        taxPercent: 18,
        lineAmount: 64407,
        lineTax: 11593.26,
        remarks: 'Repeat batch requirement',
      },
    ],
    subtotal: 64407,
    totalTax: 12043.26,
    cgst: 0,
    sgst: 0,
    igst: 12043.26,
    grandTotal: 78950.26,
    documents: [],
    emailLogs: [],
  },
];

