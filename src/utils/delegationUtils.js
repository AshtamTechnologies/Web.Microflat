/**
 * delegationUtils.js — Pure utility helpers for delegation status, access checks, and overlap detection.
 *
 * Not wired into other modules yet; real access control must be enforced by the backend.
 */

import { getTodayISO } from './dateUtils';

/**
 * Derives the current lifecycle status for a delegation record.
 * Status is DERIVED dynamically based on dates and cancellation, NEVER stored.
 *
 * Status rules:
 *   - 'Cancelled': if cancelledAt has a timestamp
 *   - 'Scheduled': if fromDate > today (in the future)
 *   - 'Ended':     if toDate < today (in the past)
 *   - 'Active':    otherwise (today is within [fromDate, toDate] inclusive)
 *
 * @param {import('../models/delegation/delegationModel').DelegationModel|object} delegation
 * @param {string} [today=getTodayISO()]
 * @returns {'Cancelled'|'Scheduled'|'Ended'|'Active'}
 */
export function getDelegationStatus(delegation, today = getTodayISO()) {
  if (!delegation) return 'Ended';

  if (delegation.cancelledAt) {
    return 'Cancelled';
  }

  const from = delegation.fromDate || '';
  const to = delegation.toDate || '';

  if (from && from > today) {
    return 'Scheduled';
  }

  if (to && to < today) {
    return 'Ended';
  }

  return 'Active';
}

/**
 * Checks if a delegation is currently active for the given date.
 *
 * @param {import('../models/delegation/delegationModel').DelegationModel|object} delegation
 * @param {string} [today=getTodayISO()]
 * @returns {boolean}
 */
export function isDelegationActive(delegation, today = getTodayISO()) {
  return getDelegationStatus(delegation, today) === 'Active';
}

/**
 * Checks whether a delegation hands over an entire module.
 *
 * @param {import('../models/delegation/delegationModel').DelegationModel|object} delegation
 * @param {string} moduleKey
 * @returns {boolean}
 */
export function delegationCoversModule(delegation, moduleKey) {
  if (!delegation || !moduleKey) return false;
  const mods = Array.isArray(delegation.modules) ? delegation.modules : [];
  return mods.includes(moduleKey);
}

/**
 * Checks whether a delegation covers a specific record:
 * Returns true if the whole module is covered, or if the individual record is explicitly in the records array.
 *
 * @param {import('../models/delegation/delegationModel').DelegationModel|object} delegation
 * @param {string} moduleKey
 * @param {string|number} recordId
 * @returns {boolean}
 */
export function delegationCoversRecord(delegation, moduleKey, recordId) {
  if (!delegation || !moduleKey) return false;

  // 1. Whole module coverage
  if (delegationCoversModule(delegation, moduleKey)) {
    return true;
  }

  // 2. Individual record coverage
  if (recordId === undefined || recordId === null || recordId === '') {
    return false;
  }

  const records = Array.isArray(delegation.records) ? delegation.records : [];
  const targetIdStr = String(recordId).trim();

  return records.some(
    (rec) =>
      rec.moduleKey === moduleKey &&
      String(rec.recordId).trim() === targetIdStr
  );
}

/**
 * Resolves the IDs of all users whose work the current user may act on right now.
 *
 * @param {Array<import('../models/delegation/delegationModel').DelegationModel|object>} delegationsToMe - Active delegations assigned to current user
 * @param {string} moduleKey - e.g. 'INQUIRY' | 'PURCHASE_REQUISITION' | 'VENDOR' | 'CLIENT' | 'APPROVALS'
 * @param {string|number} [recordId] - Optional specific record ID
 * @param {string} [today=getTodayISO()]
 * @returns {Array<string|number>} Unique list of delegator user IDs
 */
export function getActingForUserIds(delegationsToMe, moduleKey, recordId, today = getTodayISO()) {
  if (!Array.isArray(delegationsToMe) || !moduleKey) {
    return [];
  }

  const activeDelegations = delegationsToMe.filter((d) => isDelegationActive(d, today));
  const ids = [];

  for (const d of activeDelegations) {
    const isCovered =
      recordId !== undefined && recordId !== null && recordId !== ''
        ? delegationCoversRecord(d, moduleKey, recordId)
        : delegationCoversModule(d, moduleKey);

    if (isCovered && d.delegatorId) {
      ids.push(d.delegatorId);
    }
  }

  return Array.from(new Set(ids));
}

/**
 * Checks whether two inclusive YYYY-MM-DD date ranges overlap.
 * Range A [aFrom, aTo] overlaps with Range B [bFrom, bTo] iff aFrom <= bTo && aTo >= bFrom.
 *
 * @param {string} aFrom
 * @param {string} aTo
 * @param {string} bFrom
 * @param {string} bTo
 * @returns {boolean}
 */
export function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  if (!aFrom || !aTo || !bFrom || !bTo) return false;
  return aFrom <= bTo && aTo >= bFrom;
}

/**
 * Checks whether two delegations overlap in scope (shared module or shared record).
 *
 * @param {{ modules?: string[], records?: Array<{ moduleKey: string, recordId: string|number }> }} a
 * @param {{ modules?: string[], records?: Array<{ moduleKey: string, recordId: string|number }> }} b
 * @returns {boolean}
 */
export function scopesOverlap(a, b) {
  if (!a || !b) return false;

  const aMods = Array.isArray(a.modules) ? a.modules : [];
  const bMods = Array.isArray(b.modules) ? b.modules : [];
  const aRecs = Array.isArray(a.records) ? a.records : [];
  const bRecs = Array.isArray(b.records) ? b.records : [];

  // 1. Common whole module
  const commonWholeModule = aMods.some((m) => bMods.includes(m));
  if (commonWholeModule) return true;

  // 2. A has whole module that covers a single record in B
  const aCoversBRecord = bRecs.some((br) => aMods.includes(br.moduleKey));
  if (aCoversBRecord) return true;

  // 3. B has whole module that covers a single record in A
  const bCoversARecord = aRecs.some((ar) => bMods.includes(ar.moduleKey));
  if (bCoversARecord) return true;

  // 4. Shared single record (same moduleKey and same recordId)
  const sharedRecord = aRecs.some((ar) =>
    bRecs.some(
      (br) =>
        br.moduleKey === ar.moduleKey &&
        String(br.recordId).trim() === String(ar.recordId).trim()
    )
  );

  return sharedRecord;
}

