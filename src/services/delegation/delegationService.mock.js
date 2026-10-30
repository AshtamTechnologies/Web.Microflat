/**
 * delegationService.mock.js — In-memory mock service for Delegation operations.
 *
 * Implements real validation rules, seeded test data, and ApiError contract.
 */

import { ApiError } from '../../utils/apiError';
import { getTodayISO, formatDate } from '../../utils/dateUtils';
import {
  getDelegationStatus,
  rangesOverlap,
  scopesOverlap,
} from '../../utils/delegationUtils';
import { delegationFromApi } from '../../models/delegation/delegationModel';
import { mockUsers } from '../../mocks/users';

/**
 * Calculates a local YYYY-MM-DD date string offset by N days from today.
 * Guarantees that seed data always showcases every lifecycle status dynamically.
 *
 * @param {number} offsetDays
 * @returns {string}
 */
function getDateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initial seed data: realistic records covering all 4 lifecycle states
let mockDelegations = [
  // 1. Given by Ian Chesnut (u1) — Active
  {
    id: 'del-101',
    delegatorId: 'u1',
    delegateId: 'u11', // Arjun Sharma
    fromDate: getDateOffset(-2),
    toDate: getDateOffset(6),
    reason: 'Leave',
    note: 'Please follow up on urgent customer queries and RFQs while I am away.',
    approvalPageKey: 'PR_APPROVAL',
    approvalPageLabel: 'Purchase Requisition Approvals',
    modules: ['APPROVALS'],
    records: [],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdBy: 'u1',
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
  },
  // 2. Given by Ian Chesnut (u1) — Scheduled
  {
    id: 'del-102',
    delegatorId: 'u1',
    delegateId: 'u12', // Priya Mehta
    fromDate: getDateOffset(7),
    toDate: getDateOffset(14),
    reason: 'Travel',
    note: 'Managing fastener requisitions during the supplier evaluation conference.',
    approvalPageKey: 'VENDOR_APPROVAL',
    approvalPageLabel: 'Vendor Approvals',
    modules: ['APPROVALS'],
    records: [],
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    createdBy: 'u1',
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
  },
  // 3. Given by Ian Chesnut (u1) — Ended
  {
    id: 'del-103',
    delegatorId: 'u1',
    delegateId: 'u4', // Scott Walter
    fromDate: getDateOffset(-20),
    toDate: getDateOffset(-5),
    reason: 'Sick leave',
    note: 'Handed over pending vendor approvals while recovering.',
    approvalPageKey: 'VENDOR_APPROVAL',
    approvalPageLabel: 'Vendor Approvals',
    modules: ['APPROVALS'],
    records: [],
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
    createdBy: 'u1',
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
  },
  // 4. Given by Ian Chesnut (u1) — Cancelled
  {
    id: 'del-104',
    delegatorId: 'u1',
    delegateId: 'u7', // Natali Emanuel
    fromDate: getDateOffset(3),
    toDate: getDateOffset(10),
    reason: 'Training',
    note: 'Client visits cancelled due to rescheduled plant audit.',
    approvalPageKey: 'PR_APPROVAL',
    approvalPageLabel: 'Purchase Requisition Approvals',
    modules: ['APPROVALS'],
    records: [],
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdBy: 'u1',
    cancelledAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    cancelledBy: 'u1',
    cancelReason: 'Plant audit rescheduled, delegation no longer required.',
  },
  // 5. Given TO Ian Chesnut (u1) — Active (from Priya Mehta u12)
  {
    id: 'del-201',
    delegatorId: 'u12',
    delegateId: 'u1',
    fromDate: getDateOffset(-1),
    toDate: getDateOffset(8),
    reason: 'Leave',
    note: 'Vendor evaluations and granite plate inquiry for tier-1 account.',
    approvalPageKey: 'VENDOR_APPROVAL',
    approvalPageLabel: 'Vendor Approvals',
    modules: ['APPROVALS'],
    records: [],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdBy: 'u12',
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
  },
  // 6. Given TO Ian Chesnut (u1) — Active (from Arjun Sharma u11)
  {
    id: 'del-202',
    delegatorId: 'u11',
    delegateId: 'u1',
    fromDate: getDateOffset(-3),
    toDate: getDateOffset(5),
    reason: 'Training',
    note: 'Overseeing emergency approvals during the metrology ISO standard workshop.',
    approvalPageKey: 'PR_APPROVAL',
    approvalPageLabel: 'Purchase Requisition Approvals',
    modules: ['APPROVALS'],
    records: [],
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdBy: 'u11',
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
  },
];

let nextIdCounter = 301;

/**
 * Checks whether user has Admin role permissions.
 * @param {Array<string|object>} roles
 * @returns {boolean}
 */
function isUserAdmin(roles = []) {
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => {
    const name = typeof r === 'string' ? r : r?.roleName || r?.name || '';
    const norm = name.trim().toLowerCase();
    return norm === 'admin' || norm === 'super admin';
  });
}

/**
 * Lists delegations filtered by direction ('given' | 'received') and active/ended filter.
 *
 * @param {{ direction?: 'given'|'received', currentUserId?: string|number, includeEnded?: boolean }} params
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel[]>}
 */
export async function listDelegations({ direction = 'given', currentUserId = 'u1', includeEnded = false } = {}) {
  await new Promise((r) => setTimeout(r, 120));

  const userIdStr = String(currentUserId || 'u1').trim();
  const today = getTodayISO();

  // 1. Filter by direction
  let filtered = mockDelegations.filter((d) => {
    if (direction === 'received') {
      return String(d.delegateId).trim() === userIdStr;
    }
    // Default: 'given'
    return String(d.delegatorId).trim() === userIdStr;
  });

  // 2. Filter by status (unless includeEnded is true)
  if (!includeEnded) {
    filtered = filtered.filter((d) => {
      const status = getDelegationStatus(d, today);
      return status === 'Active' || status === 'Scheduled';
    });
  }

  return filtered.map(delegationFromApi);
}

/**
 * Lists all delegations across the entire system (for Admin / Super Admin view).
 *
 * @param {{ includeEnded?: boolean, search?: string, delegatorId?: string, delegateId?: string, status?: string }} [params={}]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel[]>}
 */
export async function listAllDelegations({
  includeEnded = true,
  search = '',
  delegatorId = 'ALL',
  delegateId = 'ALL',
  status = 'ALL',
} = {}) {
  await new Promise((r) => setTimeout(r, 120));

  const today = getTodayISO();
  let list = [...mockDelegations];

  // Filter by status if specified
  if (status && status !== 'ALL') {
    list = list.filter((d) => getDelegationStatus(d, today).toLowerCase() === status.toLowerCase());
  } else if (!includeEnded) {
    list = list.filter((d) => {
      const s = getDelegationStatus(d, today);
      return s === 'Active' || s === 'Scheduled';
    });
  }

  // Filter by delegator (From)
  if (delegatorId && delegatorId !== 'ALL') {
    list = list.filter((d) => String(d.delegatorId).trim() === String(delegatorId).trim());
  }

  // Filter by delegate (To)
  if (delegateId && delegateId !== 'ALL') {
    list = list.filter((d) => String(d.delegateId).trim() === String(delegateId).trim());
  }

  // Filter by search query if provided
  if (search) {
    const q = search.trim().toLowerCase();
    list = list.filter((d) => {
      const delegator = (mockUsers.find((u) => String(u.id) === String(d.delegatorId))?.name || '').toLowerCase();
      const delegate = (mockUsers.find((u) => String(u.id) === String(d.delegateId))?.name || '').toLowerCase();
      const page = (d.approvalPageLabel || '').toLowerCase();
      const reason = (d.reason || '').toLowerCase();
      const note = (d.note || '').toLowerCase();
      return (
        delegator.includes(q) ||
        delegate.includes(q) ||
        page.includes(q) ||
        reason.includes(q) ||
        note.includes(q)
      );
    });
  }

  return list.map(delegationFromApi);
}

/**
 * Gets a single delegation by ID.
 *
 * @param {string} id
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function getDelegation(id) {
  await new Promise((r) => setTimeout(r, 80));

  const found = mockDelegations.find((d) => String(d.id) === String(id));
  if (!found) {
    throw new ApiError(`Delegation record "${id}" was not found.`, 404);
  }
  return delegationFromApi(found);
}

/**
 * Creates a new delegation after validating all server rules.
 * Throws normalized ApiError on validation failures.
 *
 * @param {object} data
 * @param {string|number} [currentUserId='u1']
 * @param {Array<string|object>} [currentUserRoles=[]]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function createDelegation(data, currentUserId = 'u1', currentUserRoles = ['Super Admin']) {
  await new Promise((r) => setTimeout(r, 200));

  const today = getTodayISO();
  const fieldErrors = {};

  const delegatorId = data.delegatorId ? String(data.delegatorId).trim() : String(currentUserId);
  const fromDate = data.fromDate ? String(data.fromDate).trim() : '';
  const toDate = data.toDate ? String(data.toDate).trim() : '';
  const reason = data.reason ? String(data.reason).trim() : '';
  const note = data.note ? String(data.note).trim() : '';

  // Rule 1: Delegator permissions
  if (delegatorId !== String(currentUserId) && !isUserAdmin(currentUserRoles)) {
    throw new ApiError(
      'Only administrators can create delegations on behalf of another user.',
      403,
      { delegatorId: 'Only administrators can delegate work for other colleagues.' }
    );
  }

  // Rule: Dates required, from >= today, to >= from
  if (!fromDate) {
    fieldErrors.fromDate = 'Start date is required.';
  } else if (fromDate < today) {
    fieldErrors.fromDate = 'Start date cannot be in the past.';
  }

  if (!toDate) {
    fieldErrors.toDate = 'End date is required.';
  } else if (fromDate && toDate < fromDate) {
    fieldErrors.toDate = 'End date cannot be earlier than start date.';
  }

  // Rule: Reason required, note max 250
  if (!reason) {
    fieldErrors.reason = 'Please select a reason for delegation.';
  }
  if (note && note.length > 250) {
    fieldErrors.note = 'Note for the delegate cannot exceed 250 characters.';
  }

  // Handle batch assignments (Multiple Approval Pages handed over to colleagues)
  if (Array.isArray(data.assignments) && data.assignments.length > 0) {
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError('Please correct the validation errors below.', 400, fieldErrors);
    }

    const createdList = [];
    for (const item of data.assignments) {
      const delId = String(item.delegateId || '').trim();
      if (!delId) {
        throw new ApiError('Each assignment must have an assigned colleague.', 400);
      }
      if (delId === delegatorId) {
        throw new ApiError('You cannot delegate work to yourself.', 400);
      }

      const itemFrom = item.fromDate || fromDate;
      const itemTo = item.toDate || toDate;
      const appKey = item.approvalPageKey || 'PR_APPROVAL';
      const appLabel = item.approvalPageLabel || (appKey === 'VENDOR_APPROVAL' ? 'Vendor Approvals' : 'Purchase Requisition Approvals');

      const itemNote = item.note !== undefined && item.note !== null ? String(item.note).trim() : (note || '');

      const newDelegation = {
        id: `del-${nextIdCounter++}`,
        delegatorId,
        delegateId: delId,
        fromDate: itemFrom,
        toDate: itemTo,
        reason,
        note: itemNote,
        approvalPageKey: appKey,
        approvalPageLabel: appLabel,
        modules: ['APPROVALS'],
        records: [],
        createdAt: new Date().toISOString(),
        createdBy: currentUserId,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
      };

      mockDelegations.unshift(newDelegation);
      createdList.push(delegationFromApi(newDelegation));
    }

    return createdList[0];
  }

  // Standard single delegation flow
  const delegateId = data.delegateId ? String(data.delegateId).trim() : '';
  const approvalPageKey = data.approvalPageKey || '';
  const approvalPageLabel = data.approvalPageLabel || (approvalPageKey === 'VENDOR_APPROVAL' ? 'Vendor Approvals' : 'Purchase Requisition Approvals');
  const modules = Array.isArray(data.modules) && data.modules.length > 0 ? data.modules.filter(Boolean) : (approvalPageKey ? ['APPROVALS'] : []);
  const records = Array.isArray(data.records) ? data.records : [];

  if (!delegateId) {
    fieldErrors.delegateId = 'Please select a colleague to delegate work to.';
  } else if (delegateId === delegatorId) {
    fieldErrors.delegateId = 'You cannot delegate your work to yourself.';
  } else {
    const delegateUser = mockUsers.find(
      (u) => String(u.id) === delegateId || String(u.id) === `u${delegateId}`
    );
    if (delegateUser && delegateUser.isActive === false) {
      fieldErrors.delegateId = 'Selected colleague is inactive. Please choose an active user.';
    }
  }

  // Scope requirement
  if (!approvalPageKey && modules.length === 0 && records.length === 0) {
    fieldErrors.scope = 'Please select at least one approval page to hand over.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError(
      fieldErrors.overlap || 'Please correct the validation errors below.',
      400,
      fieldErrors
    );
  }

  // Create new delegation record
  const newDelegation = {
    id: `del-${nextIdCounter++}`,
    delegatorId,
    delegateId,
    fromDate,
    toDate,
    reason,
    note,
    approvalPageKey,
    approvalPageLabel,
    modules: modules.length > 0 ? modules : ['APPROVALS'],
    records,
    createdAt: new Date().toISOString(),
    createdBy: currentUserId,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
  };

  mockDelegations.unshift(newDelegation);
  return delegationFromApi(newDelegation);
}

/**
 * Updates an active or scheduled delegation.
 *
 * @param {string} id
 * @param {object} data
 * @param {string|number} [currentUserId='u1']
 * @param {Array<string|object>} [currentUserRoles=[]]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function updateDelegation(id, data, currentUserId = 'u1', currentUserRoles = ['Super Admin']) {
  await new Promise((r) => setTimeout(r, 200));

  const found = mockDelegations.find((d) => String(d.id) === String(id));
  if (!found) {
    throw new ApiError(`Delegation "${id}" was not found.`, 404);
  }

  const today = getTodayISO();
  const currentStatus = getDelegationStatus(found, today);
  if (currentStatus === 'Cancelled' || currentStatus === 'Ended') {
    throw new ApiError(`Cannot edit an ${currentStatus.toLowerCase()} delegation.`, 400);
  }

  const delegatorIdStr = String(found.delegatorId).trim();
  const currentUserIdStr = String(currentUserId).trim();

  // Only delegator or admin can edit
  if (delegatorIdStr !== currentUserIdStr && !isUserAdmin(currentUserRoles)) {
    throw new ApiError('You do not have permission to edit this delegation.', 403);
  }

  const fieldErrors = {};

  const delegateId = data.delegateId ? String(data.delegateId).trim() : String(found.delegateId);
  const fromDate = data.fromDate ? String(data.fromDate).trim() : found.fromDate;
  const toDate = data.toDate ? String(data.toDate).trim() : found.toDate;
  const reason = data.reason ? String(data.reason).trim() : found.reason;
  const note = data.note !== undefined ? String(data.note).trim() : found.note;
  const modules = Array.isArray(data.modules) ? data.modules.filter(Boolean) : found.modules;
  const records = Array.isArray(data.records) ? data.records : found.records;

  if (!delegateId) {
    fieldErrors.delegateId = 'Please select a colleague to delegate work to.';
  } else if (delegateId === delegatorIdStr) {
    fieldErrors.delegateId = 'You cannot delegate your work to yourself.';
  }

  if (!fromDate) {
    fieldErrors.fromDate = 'Start date is required.';
  } else if (currentStatus === 'Scheduled' && fromDate < today) {
    fieldErrors.fromDate = 'Start date cannot be in the past.';
  }

  if (!toDate) {
    fieldErrors.toDate = 'End date is required.';
  } else if (fromDate && toDate < fromDate) {
    fieldErrors.toDate = 'End date cannot be earlier than start date.';
  } else if (toDate < today) {
    fieldErrors.toDate = 'End date cannot be in the past.';
  }

  if (!reason) {
    fieldErrors.reason = 'Please select a reason for delegation.';
  }
  if (note && note.length > 250) {
    fieldErrors.note = 'Note for the delegate cannot exceed 250 characters.';
  }

  if (modules.length === 0 && records.length === 0) {
    fieldErrors.scope = 'Please select at least one whole module or individual record to hand over.';
  }

  const invalidRecords = records.filter((r) => modules.includes(r.moduleKey));
  if (invalidRecords.length > 0) {
    fieldErrors.scope = 'Individual records cannot be added for modules that are already handed over entirely.';
  }

  // Duplicate check
  const recordKeySet = new Set();
  let hasDuplicateRecord = false;
  for (const r of records) {
    const key = `${r.moduleKey}::${r.recordId}`;
    if (recordKeySet.has(key)) {
      hasDuplicateRecord = true;
      break;
    }
    recordKeySet.add(key);
  }
  if (hasDuplicateRecord) {
    fieldErrors.scope = 'Duplicate individual records are not allowed.';
  }

  // Overlap check against OTHER delegations (excluding this delegation)
  if (delegatorIdStr && delegateId && fromDate && toDate && !fieldErrors.fromDate && !fieldErrors.toDate) {
    const conflicting = mockDelegations.find((ex) => {
      if (String(ex.id) === String(id)) return false;
      if (ex.cancelledAt) return false;
      if (String(ex.delegatorId).trim() !== delegatorIdStr || String(ex.delegateId).trim() !== delegateId) {
        return false;
      }
      if (!rangesOverlap(fromDate, toDate, ex.fromDate, ex.toDate)) {
        return false;
      }
      return scopesOverlap({ modules, records }, ex);
    });

    if (conflicting) {
      const msg = `An overlapping delegation already exists with this colleague for ${formatDate(conflicting.fromDate)} to ${formatDate(conflicting.toDate)} with shared scope.`;
      fieldErrors.overlap = msg;
      fieldErrors.fromDate = msg;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError(
      fieldErrors.overlap || 'Please correct the validation errors below.',
      400,
      fieldErrors
    );
  }

  const approvalPageKey = data.approvalPageKey || found.approvalPageKey || '';
  const approvalPageLabel =
    data.approvalPageLabel ||
    (approvalPageKey === 'VENDOR_APPROVAL'
      ? 'Vendor Approvals'
      : approvalPageKey === 'PR_APPROVAL'
      ? 'Purchase Requisition Approvals'
      : found.approvalPageLabel || '');

  found.delegateId = delegateId;
  found.fromDate = fromDate;
  found.toDate = toDate;
  found.reason = reason;
  found.note = note;
  found.approvalPageKey = approvalPageKey;
  found.approvalPageLabel = approvalPageLabel;
  found.modules = modules.length > 0 ? modules : ['APPROVALS'];
  found.records = records;

  return delegationFromApi(found);
}

/**
 * Cancels an active or scheduled delegation.
 *
 * @param {string} id
 * @param {string} [reason='']
 * @param {string|number} [currentUserId='u1']
 * @param {Array<string|object>} [currentUserRoles=[]]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function cancelDelegation(id, reason = '', currentUserId = 'u1', currentUserRoles = ['Super Admin']) {
  await new Promise((r) => setTimeout(r, 150));

  const found = mockDelegations.find((d) => String(d.id) === String(id));
  if (!found) {
    throw new ApiError(`Delegation "${id}" was not found.`, 404);
  }

  const delegatorIdStr = String(found.delegatorId).trim();
  const currentUserIdStr = String(currentUserId).trim();

  // Only delegator or admin can cancel
  if (delegatorIdStr !== currentUserIdStr && !isUserAdmin(currentUserRoles)) {
    throw new ApiError('You do not have permission to cancel this delegation.', 403);
  }

  found.cancelledAt = new Date().toISOString();
  found.cancelledBy = currentUserId;
  found.cancelReason = reason ? String(reason).trim() : 'Cancelled by user';

  return delegationFromApi(found);
}

