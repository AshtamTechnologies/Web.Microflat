/**
 * processFlowEndpoints.js — Endpoint path constants for Process Flow Admin API.
 */

export const PROCESS_FLOW_ENDPOINTS = {
  FLOWS: '/api/process-flow-admin',
  FLOW_BY_ID: (flowId) => `/api/process-flow-admin/${flowId}`,
  FLOW_STEPS: (flowId) => `/api/process-flow-admin/${flowId}/steps`,
  STEP_BY_ID: (stepId) => `/api/process-flow-admin/steps/${stepId}`,
  FLOW_TRANSITIONS: (flowId) => `/api/process-flow-admin/${flowId}/transitions`,
  TRANSITION_BY_ID: (id) => `/api/process-flow-admin/transitions/${id}`,
};
