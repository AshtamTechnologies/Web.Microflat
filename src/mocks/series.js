/**
 * series.js — Mock seed data for document series numbering rules.
 *
 * Version shape:
 * {
 *   id: string,
 *   docType: 'po' | 'pr' | 'inquiry' | 'quotation' | 'order' | 'invoice',
 *   prefix: string,
 *   separator: '-' | '/' | '',
 *   yearFormat: 'YYYY' | 'YY' | 'None',
 *   numberLength: number,
 *   startingNumber: number,
 *   resetCounter: 'Yearly' | 'Never',
 *   effectiveDate: 'YYYY-MM-DD',
 *   createdBy: string,
 *   createdOn: string
 * }
 */

export const mockSeries = [
  /* ── 1. Purchase Order (PO) ── (Has Expired v1 + Current v2) */
  {
    id: 'ser_po_2',
    docType: 'po',
    prefix: 'PO',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '2026-04-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2026-03-28T10:15:00',
  },
  {
    id: 'ser_po_1',
    docType: 'po',
    prefix: 'PO',
    separator: '-',
    yearFormat: 'YY',
    numberLength: 5,
    startingNumber: 100,
    resetCounter: 'Yearly',
    effectiveDate: '2025-01-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2024-12-20T14:30:00',
  },

  /* ── 2. Purchase Requisition (PR) ── (Has Current v1 + Scheduled v2) */
  {
    id: 'ser_pr_2',
    docType: 'pr',
    prefix: 'PR',
    separator: '/',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '2026-12-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2026-09-15T16:45:00',
  },
  {
    id: 'ser_pr_1',
    docType: 'pr',
    prefix: 'PR',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Never',
    effectiveDate: '2026-01-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2025-12-28T11:20:00',
  },

  /* ── 3. Inquiry ── (Has Current v1) */
  {
    id: 'ser_inq_1',
    docType: 'inquiry',
    prefix: 'INQ',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 101,
    resetCounter: 'Yearly',
    effectiveDate: '2026-01-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2025-12-30T09:00:00',
  },

  /* ── 4. Quotation ── (Has Expired v1 + Current v2 + Scheduled v3) */
  {
    id: 'ser_qtn_3',
    docType: 'quotation',
    prefix: 'QTN',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '2027-01-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2026-10-01T11:30:00',
  },
  {
    id: 'ser_qtn_2',
    docType: 'quotation',
    prefix: 'QTN',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '2026-01-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2025-12-29T15:15:00',
  },
  {
    id: 'ser_qtn_1',
    docType: 'quotation',
    prefix: 'QTN',
    separator: '/',
    yearFormat: 'YY',
    numberLength: 5,
    startingNumber: 50,
    resetCounter: 'Never',
    effectiveDate: '2025-01-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2024-12-15T10:00:00',
  },

  /* ── 5. Order ── (Has Current v1) */
  {
    id: 'ser_ord_1',
    docType: 'order',
    prefix: 'ORD',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '2026-01-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2025-12-31T13:00:00',
  },

  /* ── 6. Invoice ── (Has Expired v1 + Current v2) */
  {
    id: 'ser_inv_2',
    docType: 'invoice',
    prefix: 'INV',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '2026-04-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2026-03-25T09:40:00',
  },
  {
    id: 'ser_inv_1',
    docType: 'invoice',
    prefix: 'INV',
    separator: '/',
    yearFormat: 'YY',
    numberLength: 5,
    startingNumber: 1,
    resetCounter: 'Yearly',
    effectiveDate: '2025-04-01',
    createdBy: 'Ian Chesnut',
    createdOn: '2025-03-20T14:15:00',
  },
];

export default mockSeries;
