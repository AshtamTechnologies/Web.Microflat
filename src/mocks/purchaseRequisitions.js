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

/**
 * Initial mock Purchase Requisition records
 */
export const mockPurchaseRequisitions = [
  {
    prId: 1001,
    prNumber: 'PR-2026-0001',
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
  },
  {
    prId: 1002,
    prNumber: 'PR-2026-0002',
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
];

/**
 * Formats ISO date or string to readable display (e.g., "11 Sep 2026")
 */
export function formatPRDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '—';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats datetime with time (e.g., "11 Sep 2026, 10:30 AM")
 */
export function formatPRDateTime(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return dateStr;
  }
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
