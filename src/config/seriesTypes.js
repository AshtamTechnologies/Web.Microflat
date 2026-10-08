/**
 * seriesTypes.js — Document Series Types definition for MicroFlat ERP.
 * Single source of truth for configurable document sequence numbering.
 */

import {
  ShoppingCart,
  ClipboardList,
  Inbox,
  Receipt,
  FileText,
  PackageCheck,
} from 'lucide-react';

export const SERIES_TYPES = [
  {
    key: 'po',
    label: 'Purchase Order (PO)',
    shortLabel: 'PO',
    icon: ShoppingCart,
    path: '/configuration/series/po',
    description: 'Purchase order numbering and revision rules',
    defaultPrefix: 'PO',
  },
  {
    key: 'pr',
    label: 'Purchase Requisition (PR)',
    shortLabel: 'PR',
    icon: ClipboardList,
    path: '/configuration/series/pr',
    description: 'Internal purchase requisition numbering rules',
    defaultPrefix: 'PR',
  },
  {
    key: 'inquiry',
    label: 'Inquiry',
    shortLabel: 'INQ',
    icon: Inbox,
    path: '/configuration/series/inquiry',
    description: 'Customer inquiry and lead sequence numbering',
    defaultPrefix: 'INQ',
  },
  {
    key: 'quotation',
    label: 'Quotation',
    shortLabel: 'QTN',
    icon: FileText,
    path: '/configuration/series/quotation',
    description: 'Sales quotation and estimate numbering',
    defaultPrefix: 'QTN',
  },
  {
    key: 'order',
    label: 'Order',
    shortLabel: 'ORD',
    icon: PackageCheck,
    path: '/configuration/series/order',
    description: 'Sales order and production job numbering',
    defaultPrefix: 'ORD',
  },
  {
    key: 'invoice',
    label: 'Invoice',
    shortLabel: 'INV',
    icon: Receipt,
    path: '/configuration/series/invoice',
    description: 'Commercial invoice and billing sequence numbering',
    defaultPrefix: 'INV',
  },
];

export function getSeriesTypeByKey(key = '') {
  const normalized = (key || '').toLowerCase();
  return SERIES_TYPES.find((t) => t.key === normalized) || SERIES_TYPES[0];
}

export default SERIES_TYPES;
