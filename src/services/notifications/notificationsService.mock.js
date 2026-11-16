/**
 * notificationsService.mock.js — In-memory mock service for Notifications.
 * Conforms to Section 5.4i of Frontend-API-Guide.md.
 */

let mockNotifications = [
  {
    id: 1,
    title: 'New Meeting Scheduled: Vendor Technical Review',
    message: 'You have been added as an attendee for Vendor Technical Review with Acme Granites at 10:30 AM.',
    notificationType: 'Meeting',
    referenceType: 'Meeting',
    referenceId: 101,
    actionUrl: '/meetings/101',
    isRead: false,
    createdOn: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    readOn: null,
  },
  {
    id: 2,
    title: 'Approval Required: Vendor Onboarding',
    message: 'Precision Engineering Works submitted registration documents awaiting your review and approval.',
    notificationType: 'Approval',
    referenceType: 'ApprovalRequest',
    referenceId: 204,
    actionUrl: '/approvals/vendors',
    isRead: false,
    createdOn: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    readOn: null,
  },
  {
    id: 3,
    title: 'Approval Required: Purchase Requisition #PR-2026-0034',
    message: 'Vikram Joshi requested authorization for high precision granite surface blocks.',
    notificationType: 'Approval',
    referenceType: 'ApprovalRequest',
    referenceId: 205,
    actionUrl: '/approvals',
    isRead: false,
    createdOn: new Date(Date.now() - 1000 * 3600 * 4).toISOString(), // 4 hours ago
    readOn: null,
  },
  {
    id: 4,
    title: 'Meeting Completed: Quality Lab Audit',
    message: 'Minutes of Meeting and action items have been uploaded by organizer Amit Patel.',
    notificationType: 'Meeting',
    referenceType: 'Meeting',
    referenceId: 98,
    actionUrl: '/meetings/98',
    isRead: true,
    createdOn: new Date(Date.now() - 1000 * 3600 * 26).toISOString(), // Yesterday
    readOn: new Date(Date.now() - 1000 * 3600 * 20).toISOString(),
  },
  {
    id: 5,
    title: 'Purchase Order #PO-2026-0012 Approved',
    message: 'Purchase order for cast iron clamping accessories was approved by Finance Manager.',
    notificationType: 'System',
    referenceType: 'PurchaseOrder',
    referenceId: 12,
    actionUrl: '/dashboard',
    isRead: true,
    createdOn: new Date(Date.now() - 1000 * 3600 * 48).toISOString(), // 2 days ago
    readOn: new Date(Date.now() - 1000 * 3600 * 40).toISOString(),
  },
  {
    id: 6,
    title: 'Delegation Handover Active',
    message: 'Approval authority for Vendor Management module has been temporarily delegated to you.',
    notificationType: 'Approval',
    referenceType: 'Delegation',
    referenceId: 15,
    actionUrl: '/delegation',
    isRead: true,
    createdOn: new Date(Date.now() - 1000 * 3600 * 72).toISOString(),
    readOn: new Date(Date.now() - 1000 * 3600 * 68).toISOString(),
  },
];

export async function listNotifications(params = {}) {
  await new Promise((r) => setTimeout(r, 100));

  let items = [...mockNotifications];

  const search = (params.search || params.Search || '').trim().toLowerCase();
  if (search) {
    items = items.filter(
      (n) =>
        n.title?.toLowerCase().includes(search) ||
        n.message?.toLowerCase().includes(search) ||
        n.notificationType?.toLowerCase().includes(search)
    );
  }

  if (params.isRead !== undefined && params.isRead !== '' && params.isRead !== 'ALL') {
    const isReadBool = String(params.isRead).toLowerCase() === 'true';
    items = items.filter((n) => n.isRead === isReadBool);
  }

  const notificationType = params.notificationType || params.NotificationType;
  if (notificationType && notificationType !== 'ALL') {
    items = items.filter((n) => n.notificationType.toLowerCase() === notificationType.toLowerCase());
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

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

export async function getUnreadCount() {
  await new Promise((r) => setTimeout(r, 50));
  const count = mockNotifications.filter((n) => !n.isRead).length;
  return { unreadCount: count, count };
}

export async function markAsRead(id) {
  await new Promise((r) => setTimeout(r, 80));
  const numericId = Number(id);
  const index = mockNotifications.findIndex((n) => n.id === numericId);
  if (index !== -1) {
    mockNotifications[index] = {
      ...mockNotifications[index],
      isRead: true,
      readOn: new Date().toISOString(),
    };
    return { ...mockNotifications[index] };
  }
  return null;
}

export async function markAllAsRead() {
  await new Promise((r) => setTimeout(r, 120));
  const now = new Date().toISOString();
  mockNotifications = mockNotifications.map((n) => ({
    ...n,
    isRead: true,
    readOn: n.readOn || now,
  }));
  return { success: true, count: mockNotifications.length };
}

