/**
 * delegationService.js — Real API service for Delegations (/api/delegations).
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { normalizeApiError } from '../../utils/apiError';
import { DELEGATION_ENDPOINTS } from './delegationEndpoints';
import {
  delegationFromApi,
  delegationsFromApi,
  delegationToApi,
} from '../../models/delegation/delegationModel';

function buildListQuery(params = {}) {
  const query = {};

  if (params.search !== undefined && params.search !== null && String(params.search).trim() !== '') {
    query.search = String(params.search).trim();
  }

  if (
    params.status !== undefined &&
    params.status !== null &&
    params.status !== '' &&
    String(params.status).toUpperCase() !== 'ALL'
  ) {
    query.status = String(params.status).trim();
  }

  if (
    params.moduleId !== undefined &&
    params.moduleId !== null &&
    params.moduleId !== '' &&
    String(params.moduleId).toUpperCase() !== 'ALL' &&
    !isNaN(Number(params.moduleId))
  ) {
    query.moduleId = Number(params.moduleId);
  }

  if (params.fromDate) {
    query.fromDate = String(params.fromDate).slice(0, 10);
  }

  if (params.toDate) {
    query.toDate = String(params.toDate).slice(0, 10);
  }

  if (
    params.delegatorUserId !== undefined &&
    params.delegatorUserId !== null &&
    params.delegatorUserId !== '' &&
    String(params.delegatorUserId).toUpperCase() !== 'ALL' &&
    !isNaN(Number(params.delegatorUserId))
  ) {
    query.delegatorUserId = Number(params.delegatorUserId);
  }

  if (
    params.delegateUserId !== undefined &&
    params.delegateUserId !== null &&
    params.delegateUserId !== '' &&
    String(params.delegateUserId).toUpperCase() !== 'ALL' &&
    !isNaN(Number(params.delegateUserId))
  ) {
    query.delegateUserId = Number(params.delegateUserId);
  }

  if (params.mine === true) {
    query.mine = true;
  }

  const pageNumber = Number(params.pageNumber);
  query.pageNumber = !isNaN(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  const pageSize = Number(params.pageSize);
  query.pageSize = !isNaN(pageSize) && pageSize > 0 ? pageSize : 10;

  return query;
}

function mapPagedResponse(data, query) {
  const safeData = data || {};
  const rawItems = Array.isArray(safeData.items)
    ? safeData.items
    : Array.isArray(safeData)
      ? safeData
      : [];
  const totalCount = safeData.totalCount ?? rawItems.length;
  const pageSize = safeData.pageSize ?? query.pageSize;

  return {
    items: delegationsFromApi(rawItems),
    totalCount,
    pageNumber: safeData.pageNumber ?? query.pageNumber,
    pageSize,
    totalPages: safeData.totalPages ?? Math.max(1, Math.ceil(totalCount / (pageSize || 10))),
  };
}

/**
 * Fetches delegation form & filter lookups: statuses, suggestedReasons, approvalPages.
 * GET /api/delegations/lookups
 */
export async function getDelegationLookups() {
  try {
    const res = await axiosInstance.get(DELEGATION_ENDPOINTS.LOOKUPS);
    const data = res?.data || {};
    return {
      statuses: Array.isArray(data.statuses) ? data.statuses : [],
      suggestedReasons: Array.isArray(data.suggestedReasons) ? data.suggestedReasons : [],
      approvalPages: Array.isArray(data.approvalPages) ? data.approvalPages : [],
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Fetches users eligible to be selected as delegator.
 * GET /api/delegations/delegator-candidates
 */
export async function getDelegatorCandidates(search = '') {
  try {
    const params = {};
    if (search && String(search).trim() !== '') {
      params.search = String(search).trim();
    }
    const res = await axiosInstance.get(DELEGATION_ENDPOINTS.DELEGATOR_CANDIDATES, { params });
    return Array.isArray(res?.data) ? res.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Fetches active users eligible to be selected as delegate for a given delegator.
 * GET /api/delegations/delegate-candidates
 */
export async function getDelegateCandidates({ delegatorUserId, search = '' } = {}) {
  try {
    const params = {};
    if (
      delegatorUserId !== undefined &&
      delegatorUserId !== null &&
      delegatorUserId !== '' &&
      !isNaN(Number(delegatorUserId))
    ) {
      params.delegatorUserId = Number(delegatorUserId);
    }
    if (search && String(search).trim() !== '') {
      params.search = String(search).trim();
    }
    const res = await axiosInstance.get(DELEGATION_ENDPOINTS.DELEGATE_CANDIDATES, { params });
    return Array.isArray(res?.data) ? res.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Lists delegations (supports mine=true for current user's given delegations, or Admin filters).
 * GET /api/delegations
 */
export async function listDelegations(params = {}) {
  try {
    const query = buildListQuery(params);
    const res = await axiosInstance.get(DELEGATION_ENDPOINTS.LIST, { params: query });
    return mapPagedResponse(res?.data, query);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Lists delegations where the current user is assigned as a delegate.
 * GET /api/delegations/delegated-to-me
 */
export async function listDelegatedToMe(params = {}) {
  try {
    const query = buildListQuery(params);
    const res = await axiosInstance.get(DELEGATION_ENDPOINTS.DELEGATED_TO_ME, { params: query });
    return mapPagedResponse(res?.data, query);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Fetches the current user's active/upcoming delegation summary, or null if none (204).
 * GET /api/delegations/mine/current
 */
export async function getMyCurrentDelegation() {
  try {
    const res = await axiosInstance.get(DELEGATION_ENDPOINTS.MY_CURRENT);
    if (res?.status === 204 || !res?.data) {
      return null;
    }
    return delegationFromApi(res.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Fetches a single delegation by ID.
 * GET /api/delegations/{id}
 */
export async function getDelegation(id) {
  try {
    const res = await axiosInstance.get(DELEGATION_ENDPOINTS.DETAIL(id));
    return delegationFromApi(res?.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new delegation handover.
 * POST /api/delegations
 */
export async function createDelegation(data) {
  try {
    const payload = delegationToApi(data);
    const res = await axiosInstance.post(DELEGATION_ENDPOINTS.CREATE, payload);
    return delegationFromApi(res?.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an Upcoming or InForce delegation.
 * PUT /api/delegations/{id}
 */
export async function updateDelegation(id, data) {
  try {
    const payload = delegationToApi(data);
    const res = await axiosInstance.put(DELEGATION_ENDPOINTS.UPDATE(id), payload);
    return delegationFromApi(res?.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Cancels (isActive: false) or reinstates (isActive: true) a delegation.
 * PATCH /api/delegations/{id}/status
 */
export async function updateDelegationStatus(id, isActive) {
  try {
    const res = await axiosInstance.patch(DELEGATION_ENDPOINTS.UPDATE_STATUS(id), {
      isActive: Boolean(isActive),
    });
    return res?.data ? delegationFromApi(res.data) : null;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Permanently deletes an Upcoming delegation (before start date).
 * DELETE /api/delegations/{id}
 */
export async function deleteDelegation(id) {
  try {
    const res = await axiosInstance.delete(DELEGATION_ENDPOINTS.DELETE(id));
    return res?.data ?? true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
