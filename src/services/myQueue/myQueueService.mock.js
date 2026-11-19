/**
 * myQueueService.mock.js — In-memory mock service for My Queue.
 * Conforms to Section 5.4i of Frontend-API-Guide.md.
 */

let mockQueueItems = [
  {
    id: 1,
    itemType: 'Meeting',
    title: 'Vendor Technical Review - Acme Granites',
    description: 'Internal alignment on granite surface plate tolerance standards and calibration reports.',
    referenceType: 'Meeting',
    referenceId: 101,
    actionUrl: '/meetings/101',
    status: 'Pending',
    priority: 'High',
    dueDate: new Date(Date.now() + 3600 * 1000 * 4).toISOString(), // Today + 4 hours
    createdOn: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    completedOn: null,
    assignedToUserId: 2,
    assignedToUserName: 'Janvi Motwani',
    completionSource: null,
    metadata: {
      meetingTime: '10:30 AM - 11:30 AM',
      location: 'Conference Room 1 (Main Hall)',
      organizerName: 'Priya Sharma',
    },
  },
  {
    id: 2,
    itemType: 'Approval',
    title: 'Vendor Onboarding: Precision Engineering Works',
    description: 'Vendor registration version 1 submitted for initial compliance & GST approval.',
    referenceType: 'ApprovalRequest',
    referenceId: 204,
    actionUrl: '/approvals/vendors',
    status: 'Pending',
    priority: 'Urgent',
    dueDate: new Date(Date.now() + 3600 * 1000 * 12).toISOString(),
    createdOn: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    completedOn: null,
    assignedToUserId: 2,
    assignedToUserName: 'Janvi Motwani',
    completionSource: null,
    metadata: {
      documentCode: 'VEN-0042',
      requesterName: 'Rahul Verma',
      module: 'VENDOR',
    },
  },
  {
    id: 3,
    itemType: 'Meeting',
    title: 'Calibration Lab Audit & NABL Prep',
    description: 'Quarterly review of gauge blocks, level comparators, and audit checklist.',
    referenceType: 'Meeting',
    referenceId: 102,
    actionUrl: '/meetings/102',
    status: 'Pending',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
    createdOn: new Date(Date.now() - 3600 * 1000 * 10).toISOString(),
    completedOn: null,
    assignedToUserId: 2,
    assignedToUserName: 'Janvi Motwani',
    completionSource: null,
    metadata: {
      meetingTime: '02:00 PM - 03:30 PM',
      location: 'Quality Lab Meeting Room',
      organizerName: 'Amit Patel',
    },
  },
  {
    id: 4,
    itemType: 'Approval',
    title: 'Purchase Requisition #PR-2026-0034 Authorization',
    description: 'Special grade granite blocks purchase for defense project datum plate.',
    referenceType: 'ApprovalRequest',
    referenceId: 205,
    actionUrl: '/approvals',
    status: 'Pending',
    priority: 'High',
    dueDate: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    createdOn: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    completedOn: null,
    assignedToUserId: 2,
    assignedToUserName: 'Janvi Motwani',
    completionSource: null,
    metadata: {
      documentCode: 'PR-2026-0034',
      requesterName: 'Vikram Joshi',
      module: 'PR',
      amount: '₹ 1,85,000',
    },
  },
  {
    id: 5,
    itemType: 'Meeting',
    title: 'Quarterly Project Milestone Sync',
    description: 'Review progress on high precision master plates manufacturing.',
    referenceType: 'Meeting',
    referenceId: 98,
    actionUrl: '/meetings/98',
    status: 'Completed',
    priority: 'Low',
    dueDate: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    createdOn: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    completedOn: new Date(Date.now() - 3600 * 1000 * 46).toISOString(),
    assignedToUserId: 2,
    assignedToUserName: 'Janvi Motwani',
    completionSource: 'User',
    metadata: {
      meetingTime: '11:00 AM - 12:00 PM',
      location: 'Virtual Google Meet',
      organizerName: 'Janvi Motwani',
    },
  },
  {
    id: 6,
    itemType: 'Approval',
    title: 'Payment Term Net-60 Approval: Zenith Metrology',
    description: 'Special credit term exception approval request.',
    referenceType: 'ApprovalRequest',
    referenceId: 198,
    actionUrl: '/approvals',
    status: 'Completed',
    priority: 'Medium',
    dueDate: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    createdOn: new Date(Date.now() - 3600 * 1000 * 120).toISOString(),
    completedOn: new Date(Date.now() - 3600 * 1000 * 70).toISOString(),
    assignedToUserId: 2,
    assignedToUserName: 'Janvi Motwani',
    completionSource: 'System',
    metadata: {
      documentCode: 'PT-EXC-01',
      requesterName: 'Priya Sharma',
      module: 'PAYMENT_TERM',
    },
  },
];

export async function listQueue(params = {}) {
  await new Promise((r) => setTimeout(r, 120));

  let items = [...mockQueueItems];

  const search = (params.search || params.Search || '').trim().toLowerCase();
  if (search) {
    items = items.filter(
      (item) =>
        item.title?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.itemType?.toLowerCase().includes(search) ||
        item.priority?.toLowerCase().includes(search)
    );
  }

  const status = params.status || params.Status;
  if (status && status !== 'ALL') {
    items = items.filter((item) => item.status.toLowerCase() === status.toLowerCase());
  }

  const itemType = params.itemType || params.ItemType;
  if (itemType && itemType !== 'ALL') {
    items = items.filter((item) => item.itemType.toLowerCase() === itemType.toLowerCase());
  }

  // Sort: Pending first, then by dueDate ascending
  items.sort((a, b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    return new Date(a.dueDate || a.createdOn) - new Date(b.dueDate || b.createdOn);
  });

  const pageNumber = Number(params.pageNumber || params.PageNumber || 1);
  const pageSize = Number(params.pageSize || params.PageSize || 10);
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const paginatedItems = items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  return {
    items: paginatedItems,
    totalCount,
    pageNumber,
    pageSize,
    totalPages,
  };
}

export async function getQueueSummary() {
  await new Promise((r) => setTimeout(r, 60));

  const total = mockQueueItems.length;
  const pending = mockQueueItems.filter((i) => i.status === 'Pending').length;
  const completed = mockQueueItems.filter((i) => i.status === 'Completed').length;
  const meetingsPending = mockQueueItems.filter((i) => i.status === 'Pending' && i.itemType === 'Meeting').length;
  const approvalsPending = mockQueueItems.filter((i) => i.status === 'Pending' && i.itemType === 'Approval').length;

  return {
    total,
    pending,
    completed,
    meetingsPending,
    approvalsPending,
  };
}

export async function getQueueItem(id) {
  await new Promise((r) => setTimeout(r, 80));
  const numericId = Number(id);
  const found = mockQueueItems.find((i) => i.id === numericId);
  if (!found) {
    const error = new Error(`Queue item #${id} not found.`);
    error.response = { status: 404, data: { detail: `Queue item #${id} not found.` } };
    throw error;
  }
  return { ...found };
}

export async function doneQueueItem(id) {
  return completeQueueItem(id, { remarks: 'Marked done' });
}

export async function completeQueueItem(id, payload = {}) {
  await new Promise((r) => setTimeout(r, 150));
  const numericId = Number(id);
  const itemIndex = mockQueueItems.findIndex((i) => i.id === numericId);

  if (itemIndex === -1) {
    const error = new Error(`Queue item #${id} not found.`);
    error.response = { status: 404, data: { detail: `Queue item #${id} not found.` } };
    throw error;
  }

  const existing = mockQueueItems[itemIndex];
  if (existing.itemType !== 'Meeting') {
    const error = new Error('Only Meeting tasks can be marked done manually.');
    error.response = {
      status: 400,
      data: { detail: 'Only Meeting tasks can be manually marked complete. Approval items complete automatically when acted upon.' },
    };
    throw error;
  }

  mockQueueItems[itemIndex] = {
    ...existing,
    status: 'Completed',
    completedOn: new Date().toISOString(),
    completionSource: 'User',
    remarks: payload.remarks || 'Completed by user',
  };

  return { ...mockQueueItems[itemIndex] };
}

