/**
 * src/services/notificationSetup/notificationSetupService.mock.js
 * Offline mock service for Notification Events and Notification Rules.
 * Conforms to Section 5 of Notification-WorkQueue-API.md and live API payload contracts.
 */

export const MOCK_NOTIFICATION_LOOKUPS = {
  eventTypes: ['Create', 'Update', 'StatusChanged', 'Approved', 'MeetingDue', 'POReceived'],
  recipientTypes: ['Role', 'User', 'AssignedTo', 'Creator'],
  workQueueDueDateRules: ['Today', 'EventDate', 'None'],
  placeholders: {
    INQUIRY: ['InquiryNo', 'CompanyName', 'Status', 'InquiryDate', 'ContactPersonName', 'AssignedToName', 'DocumentNo'],
    QUOTATION: ['QuotationNo', 'InquiryNo', 'CompanyName', 'Status', 'ApprovalStatus', 'DocumentNo'],
    ORDER_CONFIRMATION: ['OrderConfirmationNo', 'SalesOrderNo', 'OrderDate', 'QuotationNo', 'InquiryNo', 'CompanyName', 'Status', 'DocumentNo'],
    PRODUCT: ['ProductCode', 'ProductName', 'Status', 'DocumentNo'],
    VENDOR: ['VendorCode', 'VendorName', 'DocumentNo'],
    MEETING: ['MeetingTitle', 'MeetingDate', 'StartTime', 'Location', 'Status', 'OrganizerName', 'InquiryNo', 'CompanyName', 'OldDate', 'DocumentNo'],
    PO: ['PONo', 'VendorName'],
  },
};

// Friendly module name mapping
export const MODULE_NAME_MAP = {
  INQUIRY: 'Inquiry Management',
  QUOTATION: 'Quotation',
  ORDER_CONFIRMATION: 'Sales Order',
  PRODUCT: 'Product Management',
  VENDOR: 'Vendor Management',
  MEETING: 'Meeting Scheduler',
  PO: 'Purchase Order',
};

let mockEvents = [
  {
    id: 1,
    moduleId: 3,
    moduleCode: 'INQUIRY',
    moduleName: 'Inquiry Management',
    eventType: 'Create',
    eventName: 'Inquiry created',
    isActive: true,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 3,
    moduleId: 3,
    moduleCode: 'INQUIRY',
    moduleName: 'Inquiry Management',
    eventType: 'StatusChanged',
    eventName: 'Inquiry status changed',
    isActive: true,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 4,
    moduleId: 5,
    moduleCode: 'QUOTATION',
    moduleName: 'Quotation',
    eventType: 'Approved',
    eventName: 'Quotation Approved',
    isActive: true,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 5,
    moduleId: 6,
    moduleCode: 'ORDER_CONFIRMATION',
    moduleName: 'Sales Order',
    eventType: 'Create',
    eventName: 'Sales Order Created',
    isActive: true,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 6,
    moduleId: 1,
    moduleCode: 'VENDOR',
    moduleName: 'Vendor Management',
    eventType: 'Create',
    eventName: 'Vendor Registered',
    isActive: false,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 7,
    moduleId: 2,
    moduleCode: 'PRODUCT',
    moduleName: 'Product Management',
    eventType: 'Create',
    eventName: 'Product Created',
    isActive: false,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 8,
    moduleId: 7,
    moduleCode: 'MEETING',
    moduleName: 'Meeting Scheduler',
    eventType: 'Create',
    eventName: 'Meeting Scheduled',
    isActive: true,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 9,
    moduleId: 7,
    moduleCode: 'MEETING',
    moduleName: 'Meeting Scheduler',
    eventType: 'MeetingDue',
    eventName: 'Meeting Due Reminder',
    isActive: true,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 10,
    moduleId: 8,
    moduleCode: 'PO',
    moduleName: 'Purchase Order',
    eventType: 'POReceived',
    eventName: 'PO Received from Customer',
    isActive: true,
    ruleCount: 1,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
];

let mockRules = [
  {
    id: 1,
    notificationEventId: 1,
    eventType: 'Create',
    eventName: 'Inquiry created',
    moduleId: 3,
    moduleCode: 'INQUIRY',
    recipientType: 'AssignedTo',
    roleId: null,
    roleName: null,
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: true,
    addToWorkQueue: true,
    includeActor: false,
    titleTemplate: 'New inquiry {InquiryNo}',
    messageTemplate: 'Inquiry {InquiryNo} from {CompanyName} has been assigned to you by {ActorName}.',
    workQueueDueDateRule: 'Today',
    isActive: true,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 3,
    notificationEventId: 3,
    eventType: 'StatusChanged',
    eventName: 'Inquiry status changed',
    moduleId: 3,
    moduleCode: 'INQUIRY',
    recipientType: 'AssignedTo',
    roleId: null,
    roleName: null,
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: false,
    addToWorkQueue: false,
    includeActor: false,
    titleTemplate: 'Inquiry {InquiryNo} is {Status}',
    messageTemplate: 'Inquiry {InquiryNo} from {CompanyName} was moved to {Status} by {ActorName}.',
    workQueueDueDateRule: 'None',
    isActive: true,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 4,
    notificationEventId: 4,
    eventType: 'Approved',
    eventName: 'Quotation Approved',
    moduleId: 5,
    moduleCode: 'QUOTATION',
    recipientType: 'Creator',
    roleId: null,
    roleName: null,
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: true,
    addToWorkQueue: false,
    includeActor: false,
    titleTemplate: 'Quotation {QuotationNo} Approved',
    messageTemplate: 'Quotation {QuotationNo} for {CompanyName} was approved by {ActorName}.',
    workQueueDueDateRule: 'None',
    isActive: true,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 5,
    notificationEventId: 5,
    eventType: 'Create',
    eventName: 'Sales Order Created',
    moduleId: 6,
    moduleCode: 'ORDER_CONFIRMATION',
    recipientType: 'Role',
    roleId: 3,
    roleName: 'Production Manager',
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: true,
    addToWorkQueue: true,
    includeActor: false,
    titleTemplate: 'New Sales Order {OrderConfirmationNo}',
    messageTemplate: 'Sales Order {OrderConfirmationNo} created for {CompanyName}. Order Date: {OrderDate}.',
    workQueueDueDateRule: 'EventDate',
    isActive: true,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 6,
    notificationEventId: 6,
    eventType: 'Create',
    eventName: 'Vendor Registered',
    moduleId: 1,
    moduleCode: 'VENDOR',
    recipientType: 'Role',
    roleId: 1,
    roleName: 'Administrator',
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: false,
    addToWorkQueue: false,
    includeActor: true,
    titleTemplate: 'New Vendor Registered: {VendorName}',
    messageTemplate: 'Vendor {VendorName} ({VendorCode}) has been registered by {ActorName}.',
    workQueueDueDateRule: 'None',
    isActive: false,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 7,
    notificationEventId: 7,
    eventType: 'Create',
    eventName: 'Product Created',
    moduleId: 2,
    moduleCode: 'PRODUCT',
    recipientType: 'Role',
    roleId: 1,
    roleName: 'Administrator',
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: false,
    addToWorkQueue: false,
    includeActor: false,
    titleTemplate: 'New Product Added: {ProductCode}',
    messageTemplate: 'Product {ProductName} ({ProductCode}) created by {ActorName}.',
    workQueueDueDateRule: 'None',
    isActive: false,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 8,
    notificationEventId: 8,
    eventType: 'Create',
    eventName: 'Meeting Scheduled',
    moduleId: 7,
    moduleCode: 'MEETING',
    recipientType: 'AssignedTo',
    roleId: null,
    roleName: null,
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: true,
    addToWorkQueue: true,
    includeActor: false,
    titleTemplate: 'Meeting Invitation: {MeetingTitle}',
    messageTemplate: 'You are invited to {MeetingTitle} on {MeetingDate} at {StartTime}. Location: {Location}. Organizer: {OrganizerName}.',
    workQueueDueDateRule: 'EventDate',
    isActive: true,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 9,
    notificationEventId: 9,
    eventType: 'MeetingDue',
    eventName: 'Meeting Due Reminder',
    moduleId: 7,
    moduleCode: 'MEETING',
    recipientType: 'AssignedTo',
    roleId: null,
    roleName: null,
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: false,
    addToWorkQueue: true,
    includeActor: true,
    titleTemplate: 'Reminder: {MeetingTitle} is today',
    messageTemplate: 'Upcoming meeting {MeetingTitle} starts at {StartTime} today. Location: {Location}.',
    workQueueDueDateRule: 'Today',
    isActive: true,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
  {
    id: 10,
    notificationEventId: 10,
    eventType: 'POReceived',
    eventName: 'PO Received from Customer',
    moduleId: 8,
    moduleCode: 'PO',
    recipientType: 'Role',
    roleId: 2,
    roleName: 'Sales Manager',
    userId: null,
    userName: null,
    sendInApp: true,
    sendEmail: true,
    addToWorkQueue: true,
    includeActor: false,
    titleTemplate: 'PO Received: {PONo}',
    messageTemplate: 'PO {PONo} received from customer/vendor {VendorName}. Please verify details.',
    workQueueDueDateRule: 'Today',
    isActive: true,
    createdOn: '2026-11-17T15:39:44+05:30',
    lastUpdatedOn: null,
  },
];

function syncRuleCounts() {
  mockEvents.forEach((ev) => {
    ev.ruleCount = mockRules.filter((r) => r.notificationEventId === ev.id).length;
  });
}

/* ── Lookup Service ── */
export async function getLookups() {
  return JSON.parse(JSON.stringify(MOCK_NOTIFICATION_LOOKUPS));
}

/* ── Events API ── */
export async function listEvents(params = {}) {
  let result = [...mockEvents];
  if (params.moduleId) {
    result = result.filter((e) => e.moduleId === Number(params.moduleId) || e.moduleCode === String(params.moduleId));
  }
  if (params.moduleCode) {
    result = result.filter((e) => e.moduleCode === String(params.moduleCode));
  }
  if (params.isActive !== undefined && params.isActive !== '' && params.isActive !== 'ALL') {
    const isAct = params.isActive === true || params.isActive === 'true';
    result = result.filter((e) => e.isActive === isAct);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    result = result.filter((e) => e.eventName.toLowerCase().includes(s) || e.eventType.toLowerCase().includes(s));
  }
  return JSON.parse(JSON.stringify(result));
}

export async function getEvent(id) {
  const ev = mockEvents.find((e) => e.id === Number(id));
  if (!ev) {
    const err = new Error(`Notification event with ID ${id} not found.`);
    err.status = 404;
    throw err;
  }
  return JSON.parse(JSON.stringify(ev));
}

export async function createEvent(data) {
  const existing = mockEvents.find(
    (e) => (e.moduleId === Number(data.moduleId) || e.moduleCode === data.moduleCode) && e.eventType === data.eventType
  );
  if (existing) {
    const err = new Error(`An event for module '${data.moduleCode || data.moduleId}' and type '${data.eventType}' already exists.`);
    err.status = 409;
    throw err;
  }

  const moduleCode = (data.moduleCode || 'INQUIRY').toUpperCase();
  const moduleName = data.moduleName || MODULE_NAME_MAP[moduleCode] || moduleCode;

  const newEvent = {
    id: Date.now(),
    moduleId: Number(data.moduleId) || 3,
    moduleCode,
    moduleName,
    eventType: data.eventType,
    eventName: data.eventName,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    ruleCount: 0,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };

  mockEvents.push(newEvent);
  return JSON.parse(JSON.stringify(newEvent));
}

export async function updateEvent(id, data) {
  const index = mockEvents.findIndex((e) => e.id === Number(id));
  if (index === -1) {
    const err = new Error(`Notification event with ID ${id} not found.`);
    err.status = 404;
    throw err;
  }

  const current = mockEvents[index];
  const updated = {
    ...current,
    eventName: data.eventName !== undefined ? data.eventName : current.eventName,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : current.isActive,
    lastUpdatedOn: new Date().toISOString(),
  };

  if (updated.isActive === false && current.isActive === true) {
    mockRules.forEach((r) => {
      if (r.notificationEventId === updated.id) {
        r.isActive = false;
        r.lastUpdatedOn = new Date().toISOString();
      }
    });
  }

  mockEvents[index] = updated;
  return JSON.parse(JSON.stringify(updated));
}

export async function deleteEvent(id) {
  const index = mockEvents.findIndex((e) => e.id === Number(id));
  if (index === -1) {
    const err = new Error(`Notification event with ID ${id} not found.`);
    err.status = 404;
    throw err;
  }

  const hasRules = mockRules.some((r) => r.notificationEventId === Number(id));
  if (hasRules) {
    const err = new Error('Cannot delete event with existing rules. Please delete or deactivate the rules first.');
    err.status = 409;
    throw err;
  }

  mockEvents.splice(index, 1);
  return { success: true };
}

/* ── Rules API ── */
export async function listRules(params = {}) {
  let result = [...mockRules];
  if (params.notificationEventId) {
    result = result.filter((r) => r.notificationEventId === Number(params.notificationEventId));
  }
  if (params.moduleId) {
    result = result.filter((r) => r.moduleId === Number(params.moduleId) || r.moduleCode === String(params.moduleId));
  }
  if (params.moduleCode) {
    result = result.filter((r) => r.moduleCode === String(params.moduleCode));
  }
  if (params.isActive !== undefined && params.isActive !== '' && params.isActive !== 'ALL') {
    const isAct = params.isActive === true || params.isActive === 'true';
    result = result.filter((r) => r.isActive === isAct);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.titleTemplate.toLowerCase().includes(s) ||
        r.messageTemplate.toLowerCase().includes(s) ||
        r.eventName.toLowerCase().includes(s) ||
        (r.roleName && r.roleName.toLowerCase().includes(s)) ||
        (r.userName && r.userName.toLowerCase().includes(s)) ||
        r.recipientType.toLowerCase().includes(s)
    );
  }
  return JSON.parse(JSON.stringify(result));
}

export async function getRule(id) {
  const rule = mockRules.find((r) => r.id === Number(id));
  if (!rule) {
    const err = new Error(`Notification rule with ID ${id} not found.`);
    err.status = 404;
    throw err;
  }
  return JSON.parse(JSON.stringify(rule));
}

export async function createRule(data) {
  if (!data.sendInApp && !data.sendEmail && !data.addToWorkQueue) {
    const err = new Error('Choose at least one of SendInApp, SendEmail or AddToWorkQueue.');
    err.status = 400;
    throw err;
  }

  if (data.recipientType === 'Role' && !data.roleId) {
    const err = new Error('RoleId is required when RecipientType is Role.');
    err.status = 400;
    throw err;
  }
  if (data.recipientType === 'User' && !data.userId) {
    const err = new Error('UserId is required when RecipientType is User.');
    err.status = 400;
    throw err;
  }

  const ev = mockEvents.find((e) => e.id === Number(data.notificationEventId));

  const newRule = {
    id: Date.now(),
    notificationEventId: Number(data.notificationEventId),
    eventType: ev ? ev.eventType : data.eventType || 'Create',
    eventName: ev ? ev.eventName : data.eventName || '',
    moduleId: ev ? ev.moduleId : data.moduleId || 3,
    moduleCode: ev ? ev.moduleCode : data.moduleCode || 'INQUIRY',
    recipientType: data.recipientType,
    roleId: data.recipientType === 'Role' ? Number(data.roleId) : null,
    roleName: data.recipientType === 'Role' ? (data.roleName || `Role #${data.roleId}`) : null,
    userId: data.recipientType === 'User' ? Number(data.userId) : null,
    userName: data.recipientType === 'User' ? (data.userName || `User #${data.userId}`) : null,
    sendInApp: Boolean(data.sendInApp),
    sendEmail: Boolean(data.sendEmail),
    addToWorkQueue: Boolean(data.addToWorkQueue),
    includeActor: Boolean(data.includeActor),
    titleTemplate: data.titleTemplate || '',
    messageTemplate: data.messageTemplate || '',
    workQueueDueDateRule: data.addToWorkQueue ? (data.workQueueDueDateRule || 'Today') : 'None',
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    createdOn: new Date().toISOString(),
    lastUpdatedOn: null,
  };

  mockRules.push(newRule);
  syncRuleCounts();
  return JSON.parse(JSON.stringify(newRule));
}

export async function updateRule(id, data) {
  const index = mockRules.findIndex((r) => r.id === Number(id));
  if (index === -1) {
    const err = new Error(`Notification rule with ID ${id} not found.`);
    err.status = 404;
    throw err;
  }

  const current = mockRules[index];

  const updated = {
    ...current,
    recipientType: data.recipientType !== undefined ? data.recipientType : current.recipientType,
    roleId: data.recipientType === 'Role' ? (data.roleId ? Number(data.roleId) : current.roleId) : null,
    roleName: data.recipientType === 'Role' ? (data.roleName || current.roleName) : null,
    userId: data.recipientType === 'User' ? (data.userId ? Number(data.userId) : current.userId) : null,
    userName: data.recipientType === 'User' ? (data.userName || current.userName) : null,
    sendInApp: data.sendInApp !== undefined ? Boolean(data.sendInApp) : current.sendInApp,
    sendEmail: data.sendEmail !== undefined ? Boolean(data.sendEmail) : current.sendEmail,
    addToWorkQueue: data.addToWorkQueue !== undefined ? Boolean(data.addToWorkQueue) : current.addToWorkQueue,
    includeActor: data.includeActor !== undefined ? Boolean(data.includeActor) : current.includeActor,
    titleTemplate: data.titleTemplate !== undefined ? data.titleTemplate : current.titleTemplate,
    messageTemplate: data.messageTemplate !== undefined ? data.messageTemplate : current.messageTemplate,
    workQueueDueDateRule: data.workQueueDueDateRule !== undefined ? data.workQueueDueDateRule : current.workQueueDueDateRule,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : current.isActive,
    lastUpdatedOn: new Date().toISOString(),
  };

  if (!updated.sendInApp && !updated.sendEmail && !updated.addToWorkQueue) {
    const err = new Error('Choose at least one of SendInApp, SendEmail or AddToWorkQueue.');
    err.status = 400;
    throw err;
  }

  mockRules[index] = updated;
  return JSON.parse(JSON.stringify(updated));
}

export async function deleteRule(id) {
  const index = mockRules.findIndex((r) => r.id === Number(id));
  if (index === -1) {
    const err = new Error(`Notification rule with ID ${id} not found.`);
    err.status = 404;
    throw err;
  }

  mockRules.splice(index, 1);
  syncRuleCounts();
  return { success: true };
}

export async function toggleRuleStatus(id, isActive) {
  return updateRule(id, { isActive });
}

export async function toggleEventStatus(id, isActive) {
  return updateEvent(id, { isActive });
}
