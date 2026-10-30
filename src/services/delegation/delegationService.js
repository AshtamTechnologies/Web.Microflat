/**
 * delegationService.js — Public delegation service interface for MicroFlat ERP.
 *
 * Current implementation: offline mock service.
 * Once backend endpoints (/api/delegation) are developed, real HTTP client functions
 * will plug in here (similar to usersService.js).
 */

import * as mockService from './delegationService.mock';

/**
 * Lists delegations for the given user and direction ('given' | 'received').
 *
 * @param {{ direction?: 'given'|'received', currentUserId?: string|number, includeEnded?: boolean }} params
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel[]>}
 */
export async function listDelegations(params) {
  // Real service integration point:
  // return axiosInstance.get('/api/delegation', { params }).then(res => delegationsFromApi(res.data));
  return mockService.listDelegations(params);
}

/**
 * Lists all delegations across the system (for Admin / Super Admin view).
 *
 * @param {{ includeEnded?: boolean, search?: string }} [params]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel[]>}
 */
export async function listAllDelegations(params) {
  // Real service integration point:
  // return axiosInstance.get('/api/delegation/all', { params }).then(res => delegationsFromApi(res.data));
  return mockService.listAllDelegations(params);
}

/**
 * Fetches a single delegation by ID.
 *
 * @param {string} id
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function getDelegation(id) {
  // Real service integration point:
  // return axiosInstance.get(`/api/delegation/${id}`).then(res => delegationFromApi(res.data));
  return mockService.getDelegation(id);
}

/**
 * Creates a new delegation handover.
 *
 * @param {object} data
 * @param {string|number} [currentUserId]
 * @param {Array<string|object>} [currentUserRoles]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function createDelegation(data, currentUserId, currentUserRoles) {
  // Real service integration point:
  // return axiosInstance.post('/api/delegation', delegationToApi(data)).then(res => delegationFromApi(res.data));
  return mockService.createDelegation(data, currentUserId, currentUserRoles);
}

/**
 * Updates an active or scheduled delegation.
 *
 * @param {string} id
 * @param {object} data
 * @param {string|number} [currentUserId]
 * @param {Array<string|object>} [currentUserRoles]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function updateDelegation(id, data, currentUserId, currentUserRoles) {
  // Real service integration point:
  // return axiosInstance.put(`/api/delegation/${id}`, delegationToApi(data)).then(res => delegationFromApi(res.data));
  return mockService.updateDelegation(id, data, currentUserId, currentUserRoles);
}

/**
 * Cancels an existing active or scheduled delegation.
 *
 * @param {string} id
 * @param {string} [reason]
 * @param {string|number} [currentUserId]
 * @param {Array<string|object>} [currentUserRoles]
 * @returns {Promise<import('../../models/delegation/delegationModel').DelegationModel>}
 */
export async function cancelDelegation(id, reason, currentUserId, currentUserRoles) {
  // Real service integration point:
  // return axiosInstance.post(`/api/delegation/${id}/cancel`, { reason }).then(res => delegationFromApi(res.data));
  return mockService.cancelDelegation(id, reason, currentUserId, currentUserRoles);
}

