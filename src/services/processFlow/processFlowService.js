/**
 * processFlowService.js — Real Process Flow Admin service calling backend API endpoints.
 *
 * Returns mapped model objects and throws normalized ApiError.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { PROCESS_FLOW_ENDPOINTS } from './processFlowEndpoints';
import {
  flowSummariesFromApi,
  flowDetailFromApi,
  flowStepFromApi,
  flowTransitionFromApi,
  flowToCreateApi,
  flowToUpdateApi,
  stepToApi,
  transitionToApi,
} from '../../models/processFlow/processFlowModel';
import { normalizeApiError } from '../../utils/apiError';

/**
 * Declares supported and unsupported operations for the real Process Flow API.
 */
export const capabilities = {
  deleteFlow: false, // Backend has no DELETE /api/process-flow-admin/{flowId}
};

/**
 * Returns all process flows (including inactive).
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowSummaryModel[]>}
 */
export async function listFlows() {
  try {
    const response = await axiosInstance.get(PROCESS_FLOW_ENDPOINTS.FLOWS);
    return flowSummariesFromApi(response.data || []);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single flow with all steps and transitions (including inactive ones).
 * @param {number|string} flowId
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowDetailModel>}
 */
export async function getFlow(flowId) {
  try {
    const response = await axiosInstance.get(PROCESS_FLOW_ENDPOINTS.FLOW_BY_ID(flowId));
    return flowDetailFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new process flow.
 * @param {{ moduleCode: string, name: string, isActive?: boolean }} data
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowDetailModel>}
 */
export async function createFlow(data) {
  try {
    const payload = flowToCreateApi(data);
    const response = await axiosInstance.post(PROCESS_FLOW_ENDPOINTS.FLOWS, payload);
    return flowDetailFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates a process flow (name, isActive).
 * @param {number|string} flowId
 * @param {{ name: string, isActive?: boolean }} data
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowDetailModel>}
 */
export async function updateFlow(flowId, data) {
  try {
    const payload = flowToUpdateApi(data);
    const response = await axiosInstance.put(PROCESS_FLOW_ENDPOINTS.FLOW_BY_ID(flowId), payload);
    return flowDetailFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Adds a new step to a flow.
 * @param {number|string} flowId
 * @param {Partial<import('../../models/processFlow/processFlowModel').ProcessFlowStepModel>} data
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowStepModel>}
 */
export async function createStep(flowId, data) {
  try {
    const payload = stepToApi(data);
    const response = await axiosInstance.post(PROCESS_FLOW_ENDPOINTS.FLOW_STEPS(flowId), payload);
    return flowStepFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing step.
 * @param {number|string} stepId
 * @param {Partial<import('../../models/processFlow/processFlowModel').ProcessFlowStepModel>} data
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowStepModel>}
 */
export async function updateStep(stepId, data) {
  try {
    const payload = stepToApi(data);
    const response = await axiosInstance.put(PROCESS_FLOW_ENDPOINTS.STEP_BY_ID(stepId), payload);
    return flowStepFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Soft-deletes a step (and deactivates its transitions in the same transaction).
 * @param {number|string} stepId
 * @returns {Promise<{ success: boolean }>}
 */
export async function removeStep(stepId) {
  try {
    await axiosInstance.delete(PROCESS_FLOW_ENDPOINTS.STEP_BY_ID(stepId));
    return { success: true };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Restores a soft-deleted step (sets isActive = true).
 * @param {number|string} stepId
 * @param {Partial<import('../../models/processFlow/processFlowModel').ProcessFlowStepModel>} stepData
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowStepModel>}
 */
export async function restoreStep(stepId, stepData) {
  try {
    const payload = stepToApi({ ...stepData, isActive: true });
    const response = await axiosInstance.put(PROCESS_FLOW_ENDPOINTS.STEP_BY_ID(stepId), payload);
    return flowStepFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Adds a transition between two steps.
 * @param {number|string} flowId
 * @param {Partial<import('../../models/processFlow/processFlowModel').ProcessFlowTransitionModel>} data
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowTransitionModel>}
 */
export async function createTransition(flowId, data) {
  try {
    const payload = transitionToApi(data);
    const response = await axiosInstance.post(
      PROCESS_FLOW_ENDPOINTS.FLOW_TRANSITIONS(flowId),
      payload
    );
    return flowTransitionFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing transition.
 * @param {number|string} transitionId
 * @param {Partial<import('../../models/processFlow/processFlowModel').ProcessFlowTransitionModel>} data
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowTransitionModel>}
 */
export async function updateTransition(transitionId, data) {
  try {
    const payload = transitionToApi(data);
    const response = await axiosInstance.put(
      PROCESS_FLOW_ENDPOINTS.TRANSITION_BY_ID(transitionId),
      payload
    );
    return flowTransitionFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Soft-deletes a transition.
 * @param {number|string} transitionId
 * @returns {Promise<{ success: boolean }>}
 */
export async function removeTransition(transitionId) {
  try {
    await axiosInstance.delete(PROCESS_FLOW_ENDPOINTS.TRANSITION_BY_ID(transitionId));
    return { success: true };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Restores a soft-deleted transition (sets isActive = true).
 * @param {number|string} transitionId
 * @param {Partial<import('../../models/processFlow/processFlowModel').ProcessFlowTransitionModel>} transitionData
 * @returns {Promise<import('../../models/processFlow/processFlowModel').ProcessFlowTransitionModel>}
 */
export async function restoreTransition(transitionId, transitionData) {
  try {
    const payload = transitionToApi({ ...transitionData, isActive: true });
    const response = await axiosInstance.put(
      PROCESS_FLOW_ENDPOINTS.TRANSITION_BY_ID(transitionId),
      payload
    );
    return flowTransitionFromApi(response.data || {});
  } catch (err) {
    throw normalizeApiError(err);
  }
}
