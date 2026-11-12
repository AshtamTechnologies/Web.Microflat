/**
 * delegationModel.js — Delegation entity typedefs, mappers, and factory functions.
 *
 * All field mapping between backend API DTOs (/api/delegations) and the frontend application lives here.
 */

import { getTodayISO } from '../../utils/dateUtils';

/**
 * @typedef {Object} DelegationAssignment
 * @property {number|null} [delegationAssignmentId]
 * @property {number|string} moduleId
 * @property {string} [moduleCode]
 * @property {string} [moduleName]
 * @property {number|string} delegateUserId
 * @property {string} [delegateName]
 * @property {string} [delegateEmail]
 * @property {string} [note]
 */

/**
 * @typedef {Object} DelegationModel
 * @property {string|number} id
 * @property {number|string} delegatorUserId
 * @property {string} delegatorName
 * @property {string} delegatorEmail
 * @property {string} startDate - Inclusive start date in YYYY-MM-DD format
 * @property {string} endDate - Inclusive end date in YYYY-MM-DD format
 * @property {number} dayCount
 * @property {string} reason
 * @property {string} status - 'Upcoming' | 'InForce' | 'Expired' | 'Cancelled'
 * @property {boolean} isActive
 * @property {boolean} canEdit
 * @property {boolean} canDelete
 * @property {DelegationAssignment[]} assignments
 * @property {number} assignmentCount
 * @property {string} createdAt
 * @property {string|number} createdBy
 */

/**
 * Maps a raw assignment DTO into a normalized DelegationAssignment.
 *
 * @param {object} raw
 * @returns {DelegationAssignment}
 */
export function delegationAssignmentFromApi(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      delegationAssignmentId: null,
      moduleId: '',
      moduleCode: '',
      moduleName: '',
      delegateUserId: '',
      delegateName: '',
      delegateEmail: '',
      note: '',
    };
  }

  return {
    delegationAssignmentId: raw.delegationAssignmentId ?? raw.id ?? null,
    moduleId: raw.moduleId ?? '',
    moduleCode: String(raw.moduleCode || ''),
    moduleName: String(raw.moduleName || ''),
    delegateUserId: raw.delegateUserId ?? raw.delegateId ?? '',
    delegateName: String(raw.delegateName || ''),
    delegateEmail: String(raw.delegateEmail || ''),
    note: raw.note ? String(raw.note) : '',
  };
}

/**
 * Maps raw backend delegation DTO into a normalized DelegationModel.
 *
 * @param {object|null|undefined} raw
 * @returns {DelegationModel}
 */
export function delegationFromApi(raw) {
  if (!raw || typeof raw !== 'object') {
    return createEmptyDelegation();
  }

  const assignments = Array.isArray(raw.assignments)
    ? raw.assignments.map(delegationAssignmentFromApi)
    : [];

  return {
    id: raw.delegationId ?? raw.id ?? '',
    delegatorUserId: raw.delegatorUserId ?? raw.delegatorId ?? '',
    delegatorName: String(raw.delegatorName || ''),
    delegatorEmail: String(raw.delegatorEmail || ''),
    startDate: raw.startDate
      ? String(raw.startDate).slice(0, 10)
      : raw.fromDate
        ? String(raw.fromDate).slice(0, 10)
        : '',
    endDate: raw.endDate
      ? String(raw.endDate).slice(0, 10)
      : raw.toDate
        ? String(raw.toDate).slice(0, 10)
        : '',
    dayCount: typeof raw.dayCount === 'number' ? raw.dayCount : Number(raw.dayCount) || 0,
    reason: String(raw.reason || ''),
    status: String(raw.status || ''),
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : raw.status !== 'Cancelled',
    canEdit: Boolean(raw.canEdit),
    canDelete: Boolean(raw.canDelete),
    assignments,
    assignmentCount:
      typeof raw.assignmentCount === 'number' ? raw.assignmentCount : assignments.length,
    createdAt: raw.createdAt || raw.createdOn || '',
    createdBy: raw.createdBy ?? '',
  };
}

/**
 * Maps an array of raw delegation items.
 *
 * @param {Array<object>} [rawList=[]]
 * @returns {DelegationModel[]}
 */
export function delegationsFromApi(rawList = []) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(delegationFromApi);
}

/**
 * Maps form/UI model to API payload shape for POST/PUT /api/delegations.
 *
 * @param {Partial<DelegationModel>} model
 * @returns {object}
 */
export function delegationToApi(model) {
  const assignments = Array.isArray(model.assignments)
    ? model.assignments
        .filter((a) => a && a.moduleId && a.delegateUserId)
        .map((a) => {
          const item = {
            moduleId: Number(a.moduleId),
            delegateUserId: Number(a.delegateUserId),
          };
          const trimmedNote = a.note ? String(a.note).trim() : '';
          if (trimmedNote) {
            item.note = trimmedNote;
          }
          return item;
        })
    : [];

  const payload = {
    startDate: model.startDate,
    endDate: model.endDate,
    reason: model.reason ? String(model.reason).trim() : '',
    assignments,
  };

  if (
    model.delegatorUserId !== undefined &&
    model.delegatorUserId !== null &&
    model.delegatorUserId !== ''
  ) {
    payload.delegatorUserId = Number(model.delegatorUserId);
  }

  return payload;
}

/**
 * Creates a fresh empty DelegationModel for form state initialization.
 *
 * @param {Partial<DelegationModel>} [defaults={}]
 * @returns {DelegationModel}
 */
export function createEmptyDelegation(defaults = {}) {
  const today = getTodayISO();
  return {
    id: '',
    delegatorUserId: defaults.delegatorUserId ?? '',
    delegatorName: defaults.delegatorName || '',
    delegatorEmail: defaults.delegatorEmail || '',
    startDate: defaults.startDate || today,
    endDate: defaults.endDate || today,
    dayCount: defaults.dayCount || 1,
    reason: defaults.reason || 'Leave',
    status: defaults.status || 'Upcoming',
    isActive: defaults.isActive !== undefined ? defaults.isActive : true,
    canEdit: defaults.canEdit !== undefined ? defaults.canEdit : true,
    canDelete: defaults.canDelete !== undefined ? defaults.canDelete : true,
    assignments: Array.isArray(defaults.assignments) ? defaults.assignments : [],
    assignmentCount: Array.isArray(defaults.assignments) ? defaults.assignments.length : 0,
    createdAt: '',
    createdBy: defaults.createdBy ?? '',
  };
}
