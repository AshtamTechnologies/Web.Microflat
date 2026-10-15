/**
 * purchaseRequisitions.js — Mock dataset and constants for Purchase Requisition module.
 * No API dependencies. Purely local mock data for frontend demonstration.
 */

export const MOCK_MATERIALS = [
  {
    itemId: 205,
    itemCode: 'MAT-FST-M6-125',
    itemName: 'M6 Fastener',
    specification: 'M6 × 125 MM High Tensile Zinc Plated',
    uom: 'Nos',
  },
  {
    itemId: 206,
    itemCode: 'MAT-BLT-M8-050',
    itemName: 'M8 Bolt',
    specification: 'M8 × 50 MM Hex Head Grade 8.8',
    uom: 'Nos',
  },
  {
    itemId: 207,
    itemCode: 'MAT-PVC-025',
    itemName: 'PVC Pipe',
    specification: '25 MM Dia Class 4 Heavy Duty 3M',
    uom: 'Meter',
  },
  {
    itemId: 208,
    itemCode: 'MAT-ELC-010',
    itemName: 'Electrical Cable',
    specification: '3-Core 2.5 Sq MM Copper Armoured',
    uom: 'Meter',
  },
  {
    itemId: 209,
    itemCode: 'MAT-STL-100',
    itemName: 'Steel Plate',
    specification: '10 MM Thick IS 2062 Grade E250 Mild Steel',
    uom: 'Kg',
  },
  {
    itemId: 210,
    itemCode: 'MAT-BSH-015',
    itemName: 'Brass Bushing',
    specification: 'ID 15 MM × OD 22 MM × L 30 MM Phosphor Bronze',
    uom: 'Nos',
  },
  {
    itemId: 211,
    itemCode: 'MAT-OIL-068',
    itemName: 'Hydraulic Oil ISO 68',
    specification: 'Anti-Wear High Viscosity Index Drum Pack',
    uom: 'Litre',
  },
];

export const DEPARTMENT_OPTIONS = [
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Quality Assurance', label: 'Quality Assurance' },
  { value: 'Production', label: 'Production' },
  { value: 'Tooling & R&D', label: 'Tooling & R&D' },
];

export const PRIORITY_OPTIONS = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Urgent', label: 'Urgent' },
];

export const STATUS_OPTIONS = [
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const REQUESTED_BY_OPTIONS = [
  { value: 'John Patel', label: 'John Patel' },
  { value: 'Meet Shah', label: 'Meet Shah' },
  { value: 'Rahul Patel', label: 'Rahul Patel' },
  { value: 'Ian Chesnut', label: 'Ian Chesnut' },
  { value: 'Arjun Sharma', label: 'Arjun Sharma' },
  { value: 'Priya Mehta', label: 'Priya Mehta' },
];

export const UOM_OPTIONS = [
  { value: 'Nos', label: 'Nos' },
  { value: 'Meter', label: 'Meter' },
  { value: 'Kg', label: 'Kg' },
  { value: 'Litre', label: 'Litre' },
  { value: 'Box', label: 'Box' },
  { value: 'Set', label: 'Set' },
  { value: 'Roll', label: 'Roll' },
];

export const ITEM_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
];

export const PROJECT_OPTIONS = [
  { value: 'PRJ-2026-001', label: 'PRJ-2026-001 - CNC Guideway Overhaul', projectName: 'CNC Guideway Overhaul' },
  { value: 'PRJ-2026-002', label: 'PRJ-2026-002 - Granite Surface Plate Line Expansion', projectName: 'Granite Surface Plate Line Expansion' },
  { value: 'PRJ-2026-003', label: 'PRJ-2026-003 - Shop Floor Automation & Spares', projectName: 'Shop Floor Automation & Spares' },
  { value: 'PRJ-2026-004', label: 'PRJ-2026-004 - Tooling & R&D Prototyping', projectName: 'Tooling & R&D Prototyping' },
  { value: 'PRJ-2026-005', label: 'PRJ-2026-005 - Facility Electrical Infrastructure Upgrade', projectName: 'Facility Electrical Infrastructure Upgrade' },
  { value: 'PRJ-2026-006', label: 'PRJ-2026-006 - Assembly Line Pneumatic System Upgrade', projectName: 'Assembly Line Pneumatic System Upgrade' },
];

export function getProjectName(projectId) {
  if (!projectId) return '—';
  const prj = PROJECT_OPTIONS.find((p) => p.value === projectId);
  return prj ? prj.projectName : projectId;
}

/**
 * Initial mock Purchase Requisition records
 */
export const mockPurchaseRequisitions = [
  {
    prId: 1001,
    prNumber: 'PR-2026-0001',
    projectId: 'PRJ-2026-001',
    prDate: '2026-09-11',
    requestedBy: 'John Patel',
    department: 'Purchase',
    requiredDate: '2026-09-25',
    priority: 'Normal',
    remarks: 'Required as per standard assembly shop specification.',
    status: 'Pending Approval',
    createdBy: 'John Patel',
    createdDate: '2026-09-11T10:30:00',
    modifiedBy: 'John Patel',
    modifiedDate: '2026-09-11T11:00:00',
    items: [
      {
        prItemId: 5001,
        itemId: 205,
        itemCode: 'MAT-FST-M6-125',
        itemName: 'M6 Fastener',
        specification: 'M6 × 125 MM High Tensile Zinc Plated',
        quantity: 100,
        uom: 'Nos',
        requiredDate: '2026-09-25',
        remarks: 'Length must be 125 MM strictly',
        status: 'Pending',
      },
      {
        prItemId: 5002,
        itemId: 206,
        itemCode: 'MAT-BLT-M8-050',
        itemName: 'M8 Bolt',
        specification: 'M8 × 50 MM Hex Head Grade 8.8',
        quantity: 50,
        uom: 'Nos',
        requiredDate: '2026-09-25',
        remarks: 'Check thread pitch 1.25mm',
        status: 'Pending',
      },
    ],
    attachments: [
      {
        id: 'att_pr_1',
        fileName: 'Fastener_Specs_Drawing_A12.pdf',
        fileSizeKB: 412,
        fileType: 'application/pdf',
        uploadedBy: 'John Patel',
        uploadedDate: '2026-09-11 10:30 AM',
      },
      {
        id: 'att_pr_2',
        fileName: 'Vendor_Quotation_BoltWorks.docx',
        fileSizeKB: 185,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy: 'John Patel',
        uploadedDate: '2026-09-11 10:32 AM',
      },
    ],
  },
  {
    prId: 1002,
    prNumber: 'PR-2026-0002',
    projectId: 'PRJ-2026-002',
    prDate: '2026-09-12',
    requestedBy: 'Meet Shah',
    department: 'Maintenance',
    requiredDate: '2026-09-28',
    priority: 'Urgent',
    remarks: 'Emergency maintenance requirement for CNC Guideway Hydraulic Line overhaul.',
    status: 'Approved',
    createdBy: 'Meet Shah',
    createdDate: '2026-09-12T09:15:00',
    modifiedBy: 'Ian Chesnut',
    modifiedDate: '2026-09-13T14:20:00',
    items: [
      {
        prItemId: 5003,
        itemId: 211,
        itemCode: 'MAT-OIL-068',
        itemName: 'Hydraulic Oil ISO 68',
        specification: 'Anti-Wear High Viscosity Index Drum Pack',
        quantity: 210,
        uom: 'Litre',
        requiredDate: '2026-09-28',
        remarks: 'Sealed 210L barrel with test certificate',
        status: 'Approved',
      },
      {
        prItemId: 5004,
        itemId: 207,
        itemCode: 'MAT-PVC-025',
        itemName: 'PVC Pipe',
        specification: '25 MM Dia Class 4 Heavy Duty 3M',
        quantity: 30,
        uom: 'Meter',
        requiredDate: '2026-09-28',
        remarks: 'For drain manifold routing',
        status: 'Approved',
      },
    ],
  },
  {
    prId: 1003,
    prNumber: 'PR-2026-0003',
    projectId: 'PRJ-2026-003',
    prDate: '2026-09-13',
    requestedBy: 'Rahul Patel',
    department: 'Operations',
    requiredDate: '2026-09-30',
    priority: 'Normal',
    remarks: 'Routine shop floor spares and electrical cabling stock replenishment.',
    status: 'Pending Approval',
    createdBy: 'Rahul Patel',
    createdDate: '2026-09-13T11:45:00',
    modifiedBy: 'Rahul Patel',
    modifiedDate: '2026-09-13T11:45:00',
    items: [
      {
        prItemId: 5005,
        itemId: 208,
        itemCode: 'MAT-ELC-010',
        itemName: 'Electrical Cable',
        specification: '3-Core 2.5 Sq MM Copper Armoured',
        quantity: 150,
        uom: 'Meter',
        requiredDate: '2026-09-30',
        remarks: 'Polycab or Havells preferred',
        status: 'Pending',
      },
    ],
  },
  {
    prId: 1004,
    prNumber: 'PR-2026-0004',
    projectId: 'PRJ-2026-004',
    prDate: '2026-09-15',
    requestedBy: 'Priya Mehta',
    department: 'Quality Assurance',
    requiredDate: '2026-10-05',
    priority: 'Urgent',
    remarks: 'Inspection granite surface plate mounting base plates.',
    status: 'Rejected',
    createdBy: 'Priya Mehta',
    createdDate: '2026-09-15T08:30:00',
    modifiedBy: 'Ian Chesnut',
    modifiedDate: '2026-09-16T10:00:00',
    items: [
      {
        prItemId: 5006,
        itemId: 209,
        itemCode: 'MAT-STL-100',
        itemName: 'Steel Plate',
        specification: '10 MM Thick IS 2062 Grade E250 Mild Steel',
        quantity: 350,
        uom: 'Kg',
        requiredDate: '2026-10-05',
        remarks: 'Mill test certificate required on dispatch',
        status: 'Rejected',
      },
      {
        prItemId: 5007,
        itemId: 210,
        itemCode: 'MAT-BSH-015',
        itemName: 'Brass Bushing',
        specification: 'ID 15 MM × OD 22 MM × L 30 MM Phosphor Bronze',
        quantity: 24,
        uom: 'Nos',
        requiredDate: '2026-10-05',
        remarks: 'Precision turned tolerance H7',
        status: 'Rejected',
      },
    ],
  },
  {
    prId: 1005,
    prNumber: 'PR-2026-0005',
    projectId: 'PRJ-2026-005',
    prDate: '2026-09-18',
    requestedBy: 'Arjun Sharma',
    department: 'Tooling & R&D',
    requiredDate: '2026-10-10',
    priority: 'Urgent',
    remarks: 'Custom fixtures and tooling fasteners for R&D prototyping cell.',
    status: 'Pending Approval',
    createdBy: 'Arjun Sharma',
    createdDate: '2026-09-18T14:10:00',
    modifiedBy: 'Arjun Sharma',
    modifiedDate: '2026-09-18T14:10:00',
    items: [
      {
        prItemId: 5008,
        itemId: 205,
        itemCode: 'MAT-FST-M6-125',
        itemName: 'M6 Fastener',
        specification: 'M6 × 125 MM High Tensile Zinc Plated',
        quantity: 80,
        uom: 'Nos',
        requiredDate: '2026-10-10',
        remarks: 'High tensile strictly',
        status: 'Pending',
      },
    ],
  },
  {
    prId: 1006,
    prNumber: 'PR-2026-0006',
    projectId: 'PRJ-2026-001',
    prDate: '2026-09-20',
    requestedBy: 'Meet Shah',
    department: 'Production',
    requiredDate: '2026-10-12',
    priority: 'Normal',
    remarks: 'Replacement hydraulic lubrication oil for heavy duty machine shop.',
    status: 'Approved',
    createdBy: 'Meet Shah',
    createdDate: '2026-09-20T10:00:00',
    modifiedBy: 'Ian Chesnut',
    modifiedDate: '2026-09-21T11:20:00',
    items: [
      {
        prItemId: 5009,
        itemId: 211,
        itemCode: 'MAT-OIL-068',
        itemName: 'Hydraulic Oil ISO 68',
        specification: 'Anti-Wear High Viscosity Index Drum Pack',
        quantity: 100,
        uom: 'Litre',
        requiredDate: '2026-10-12',
        remarks: 'Production shop replenishment',
        status: 'Approved',
      },
    ],
  },
];

import { formatDate, formatDateTime } from '../utils/dateUtils';

/**
 * Formats date using system-wide format (DD-MM-YYYY)
 */
export function formatPRDate(dateStr) {
  return formatDate(dateStr);
}

/**
 * Formats datetime using system-wide format (DD-MM-YYYY, hh:mm A)
 */
export function formatPRDateTime(dateStr) {
  return formatDateTime(dateStr);
}

/**
 * Returns the badge variant for a given PR status
 */
export function getPRStatusBadgeVariant(status) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'success';
    case 'pending approval':
      return 'warning';
    case 'rejected':
      return 'danger';
    case 'draft':
      return 'neutral';
    case 'cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Returns badge variant for priority
 */
export function getPRPriorityBadgeVariant(priority) {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'danger';
    case 'normal':
    default:
      return 'neutral';
  }
}
