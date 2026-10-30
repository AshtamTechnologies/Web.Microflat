/**
 * delegationModel.js — Delegation entity typedefs, mappers, and factory functions.
 *
 * All field mapping between future backend API DTOs and the frontend application lives here.
 */

import { getTodayISO } from '../../utils/dateUtils';

/**
 * @typedef {Object} DelegationRecordRef
 * @property {string} moduleKey - e.g. 'INQUIRY' | 'PURCHASE_REQUISITION' | 'VENDOR' | 'CLIENT'
 * @property {string|number} recordId - Identifier of the individual record
 * @property {string} label - Human-readable descriptor, e.g. "INQ-2026-000101 – Granite Surface Plate"
 */

/**
 * @typedef {Object} DelegationModel
 * @property {string} id
 * @property {string|number} delegatorId
 * @property {string|number} delegateId
 * @property {string} fromDate - Inclusive start date in local YYYY-MM-DD format
 * @property {string} toDate - Inclusive end date in local YYYY-MM-DD format
 * @property {string} reason - One of DELEGATION_REASONS
 * @property {string} [note] - Optional instruction / note for delegate (max 250 chars)
 * @property {string[]} modules - Array of module keys handed over entirely (e.g. ['INQUIRY'])
 * @property {DelegationRecordRef[]} records - Array of single record references
 * @property {string} createdAt - ISO timestamp string
 * @property {string|number} createdBy - User ID who created the record
 * @property {string|null} [cancelledAt] - ISO timestamp string if cancelled
 * @property {string|number|null} [cancelledBy] - User ID who cancelled
 * @property {string|null} [cancelReason] - Cancellation explanation
 */

/**
 * Maps raw backend/storage delegation object into a clean, normalized DelegationModel.
 *
 * @param {object|null|undefined} raw
 * @returns {DelegationModel}
 */
export function delegationFromApi(raw) {
  if (!raw || typeof raw !== 'object') {
    return createEmptyDelegation();
  }

  const modules = Array.isArray(raw.modules)
    ? raw.modules.map(String).filter(Boolean)
    : [];

  const records = Array.isArray(raw.records)
    ? raw.records.map((rec) => ({
        moduleKey: String(rec.moduleKey || ''),
        recordId: rec.recordId !== undefined && rec.recordId !== null ? String(rec.recordId) : '',
        label: String(rec.label || ''),
      }))
    : [];

  return {
    id: String(raw.id || raw.delegationId || ''),
    delegatorId: raw.delegatorId !== undefined && raw.delegatorId !== null ? raw.delegatorId : '',
    delegateId: raw.delegateId !== undefined && raw.delegateId !== null ? raw.delegateId : '',
    fromDate: String(raw.fromDate || ''),
    toDate: String(raw.toDate || ''),
    reason: String(raw.reason || 'Leave'),
    note: raw.note ? String(raw.note).trim() : '',
    approvalPageKey: raw.approvalPageKey || (raw.modules?.includes('APPROVALS') ? 'PR_APPROVAL' : '') || '',
    approvalPageLabel: raw.approvalPageLabel || '',
    modules,
    records,
    createdAt: raw.createdAt || raw.createdOn || new Date().toISOString(),
    createdBy: raw.createdBy !== undefined && raw.createdBy !== null ? raw.createdBy : '',
    cancelledAt: raw.cancelledAt || null,
    cancelledBy: raw.cancelledBy !== undefined && raw.cancelledBy !== null ? raw.cancelledBy : null,
    cancelReason: raw.cancelReason ? String(raw.cancelReason).trim() : null,
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
 * Maps form/UI model to API payload shape for create/update.
 *
 * @param {Partial<DelegationModel>} model
 * @returns {object}
 */
export function delegationToApi(model) {
  return {
    delegatorId: model.delegatorId,
    delegateId: model.delegateId,
    fromDate: model.fromDate,
    toDate: model.toDate,
    reason: model.reason,
    note: model.note ? model.note.trim() : '',
    modules: Array.isArray(model.modules) ? model.modules : [],
    records: Array.isArray(model.records)
      ? model.records.map((r) => ({
          moduleKey: r.moduleKey,
          recordId: r.recordId,
          label: r.label,
        }))
      : [],
  };
}

/**
 * Factory creating a fresh empty delegation object for form defaults.
 *
 * @param {Partial<DelegationModel>} [defaults={}]
 * @returns {DelegationModel}
 */
export function createEmptyDelegation(defaults = {}) {
  const today = getTodayISO();
  return {
    id: '',
    delegatorId: defaults.delegatorId || '',
    delegateId: defaults.delegateId || '',
    fromDate: defaults.fromDate || today,
    toDate: defaults.toDate || today,
    reason: defaults.reason || 'Leave',
    note: defaults.note || '',
    approvalPageKey: defaults.approvalPageKey || '',
    approvalPageLabel: defaults.approvalPageLabel || '',
    modules: Array.isArray(defaults.modules) ? defaults.modules : ['APPROVALS'],
    records: Array.isArray(defaults.records) ? defaults.records : [],
    createdAt: new Date().toISOString(),
    createdBy: defaults.createdBy || '',
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
  };
}

