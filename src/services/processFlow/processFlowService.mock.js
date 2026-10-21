/**
 * processFlowService.mock.js — In-memory mock service for offline and demo development.
 *
 * Implements the exact server contract and validations:
 *   - Unique upper-case moduleCode
 *   - Cell-free check (colNo, rowNo) among active steps
 *   - No self-loop on transitions
 *   - No duplicate active transitions
 *   - Deleting a step soft-deletes its connected transitions
 *   - Restoring a step checks cell collision
 *
 * Seeds:
 *   - SALES flow (id: 1): 8 steps on single row, linear progression, 2 Success outcomes
 *   - VENDOR flow (id: 2): 7 steps on 2 rows, branch, loopback, labeled, 1 inactive step, 1 inactive transition
 */

import { ApiError } from '../../utils/apiError';
import {
  flowSummariesFromApi,
  flowDetailFromApi,
  flowStepFromApi,
  flowTransitionFromApi,
  stepToApi,
  transitionToApi,
} from '../../models/processFlow/processFlowModel';

export const capabilities = {
  deleteFlow: false,
};

let nextFlowId = 3;
let nextStepId = 20;
let nextTransitionId = 30;

// Initial Mock Seed
let mockFlows = [
  {
    id: 1,
    moduleCode: 'SALES',
    name: 'Sales Order Process',
    isActive: true,
    createdOn: '2026-01-15T09:00:00Z',
    lastUpdatedOn: '2026-02-10T14:30:00Z',
    steps: [
      {
        id: 1,
        processFlowId: 1,
        title: 'Inquiry',
        description: 'Customer inquiry received and recorded',
        iconKey: 'message-square',
        colNo: 1,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 2,
        processFlowId: 1,
        title: 'Qualified',
        description: 'Lead evaluated for credit and technical feasibility',
        iconKey: 'user-check',
        colNo: 2,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 3,
        processFlowId: 1,
        title: 'Quotation',
        description: 'Commercial quotation prepared and delivered',
        iconKey: 'file-text',
        colNo: 3,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 4,
        processFlowId: 1,
        title: 'Follow-up',
        description: 'Sales representative contacts client for feedback',
        iconKey: 'phone-call',
        colNo: 4,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 5,
        processFlowId: 1,
        title: 'Negotiation',
        description: 'Finalizing delivery terms and pricing clauses',
        iconKey: 'handshake',
        colNo: 5,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 6,
        processFlowId: 1,
        title: 'Accepted',
        description: 'Quotation agreed and approved by customer',
        iconKey: 'thumbs-up',
        colNo: 6,
        rowNo: 1,
        outcomeType: 'Success',
        isActive: true,
      },
      {
        id: 7,
        processFlowId: 1,
        title: 'PO Received',
        description: 'Purchase Order officially received from client',
        iconKey: 'shopping-cart',
        colNo: 7,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 8,
        processFlowId: 1,
        title: 'Order Confirmed',
        description: 'Sales Order booked and dispatched to production',
        iconKey: 'check-circle',
        colNo: 8,
        rowNo: 1,
        outcomeType: 'Success',
        isActive: true,
      },
    ],
    transitions: [
      { id: 1, processFlowId: 1, fromStepId: 1, toStepId: 2, label: '', outcomeType: 'Normal', isActive: true },
      { id: 2, processFlowId: 1, fromStepId: 2, toStepId: 3, label: '', outcomeType: 'Normal', isActive: true },
      { id: 3, processFlowId: 1, fromStepId: 3, toStepId: 4, label: '', outcomeType: 'Normal', isActive: true },
      { id: 4, processFlowId: 1, fromStepId: 4, toStepId: 5, label: '', outcomeType: 'Normal', isActive: true },
      { id: 5, processFlowId: 1, fromStepId: 5, toStepId: 6, label: '', outcomeType: 'Normal', isActive: true },
      { id: 6, processFlowId: 1, fromStepId: 6, toStepId: 7, label: '', outcomeType: 'Normal', isActive: true },
      { id: 7, processFlowId: 1, fromStepId: 7, toStepId: 8, label: '', outcomeType: 'Normal', isActive: true },
    ],
  },
  {
    id: 2,
    moduleCode: 'VENDOR',
    name: 'Vendor Onboarding & Approval',
    isActive: true,
    createdOn: '2026-01-20T11:00:00Z',
    lastUpdatedOn: '2026-02-14T16:15:00Z',
    steps: [
      {
        id: 9,
        processFlowId: 2,
        title: 'Registration',
        description: 'Vendor profile and tax registration submitted',
        iconKey: 'building-2',
        colNo: 1,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 10,
        processFlowId: 2,
        title: 'Documentation',
        description: 'GST, MSME, and bank documents verification',
        iconKey: 'file-check',
        colNo: 2,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 11,
        processFlowId: 2,
        title: 'Technical Audit',
        description: 'On-site factory quality and capacity assessment',
        iconKey: 'factory',
        colNo: 3,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 12,
        processFlowId: 2,
        title: 'Clarification Needed',
        description: 'Discrepancy found, requesting revised audit documents',
        iconKey: 'wrench',
        colNo: 2,
        rowNo: 2,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 13,
        processFlowId: 2,
        title: 'Commercial Review',
        description: 'Credit period and discount terms finalized',
        iconKey: 'wallet',
        colNo: 4,
        rowNo: 1,
        outcomeType: 'Normal',
        isActive: true,
      },
      {
        id: 14,
        processFlowId: 2,
        title: 'Approved Partner',
        description: 'Authorized for purchase order issuance',
        iconKey: 'badge-check',
        colNo: 5,
        rowNo: 1,
        outcomeType: 'Success',
        isActive: true,
      },
      {
        id: 15,
        processFlowId: 2,
        title: 'Legacy Review Step',
        description: 'Archived review step from legacy onboarding system',
        iconKey: 'archive',
        colNo: 3,
        rowNo: 2,
        outcomeType: 'Normal',
        isActive: false, // Inactive step for testing
      },
    ],
    transitions: [
      { id: 8, processFlowId: 2, fromStepId: 9, toStepId: 10, label: 'Docs Submitted', outcomeType: 'Normal', isActive: true },
      { id: 9, processFlowId: 2, fromStepId: 10, toStepId: 11, label: 'Verified', outcomeType: 'Normal', isActive: true },
      // Branch down to row 2
      { id: 10, processFlowId: 2, fromStepId: 11, toStepId: 12, label: 'Audit Issue', outcomeType: 'Normal', isActive: true },
      // Loopback from row 2 back to row 1 step 10
      { id: 11, processFlowId: 2, fromStepId: 12, toStepId: 10, label: 'Re-submit', outcomeType: 'Normal', isActive: true },
      // Main path continuation
      { id: 12, processFlowId: 2, fromStepId: 11, toStepId: 13, label: 'Passed Audit', outcomeType: 'Normal', isActive: true },
      { id: 13, processFlowId: 2, fromStepId: 13, toStepId: 14, label: 'Signed', outcomeType: 'Success', isActive: true },
      // Inactive transition
      { id: 14, processFlowId: 2, fromStepId: 10, toStepId: 15, label: 'Legacy Path', outcomeType: 'Normal', isActive: false },
    ],
  },
];

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

function getSummary(flow) {
  return {
    id: flow.id,
    moduleCode: flow.moduleCode,
    name: flow.name,
    isActive: flow.isActive,
    stepCount: (flow.steps || []).filter((s) => s.isActive).length,
    transitionCount: (flow.transitions || []).filter((t) => t.isActive).length,
    createdOn: flow.createdOn,
    lastUpdatedOn: flow.lastUpdatedOn,
  };
}

export async function listFlows() {
  await delay();
  return flowSummariesFromApi(mockFlows.map(getSummary));
}

export async function getFlow(flowId) {
  await delay();
  const idNum = Number(flowId);
  const flow = mockFlows.find((f) => f.id === idNum);
  if (!flow) {
    throw new ApiError(`Process flow with ID ${flowId} not found`, 404);
  }
  return flowDetailFromApi(JSON.parse(JSON.stringify(flow)));
}

export async function createFlow(data) {
  await delay();
  const moduleCode = String(data.moduleCode || '').trim().toUpperCase();
  const name = String(data.name || '').trim();

  if (!moduleCode) {
    throw new ApiError('Module code is required', 400, { moduleCode: 'Module code is required' });
  }
  if (!name) {
    throw new ApiError('Flow name is required', 400, { name: 'Flow name is required' });
  }

  // Check unique moduleCode
  if (mockFlows.some((f) => f.moduleCode === moduleCode)) {
    throw new ApiError(`A process flow for module code "${moduleCode}" already exists.`, 409, {
      moduleCode: `Module code "${moduleCode}" is already in use`,
    });
  }

  const now = new Date().toISOString();
  const newFlow = {
    id: nextFlowId++,
    moduleCode,
    name,
    isActive: data.isActive !== false,
    createdOn: now,
    lastUpdatedOn: now,
    steps: [],
    transitions: [],
  };

  mockFlows.push(newFlow);
  return flowDetailFromApi(newFlow);
}

export async function updateFlow(flowId, data) {
  await delay();
  const idNum = Number(flowId);
  const flow = mockFlows.find((f) => f.id === idNum);
  if (!flow) {
    throw new ApiError(`Process flow with ID ${flowId} not found`, 404);
  }

  const name = String(data.name || '').trim();
  if (!name) {
    throw new ApiError('Flow name is required', 400, { name: 'Flow name is required' });
  }

  flow.name = name;
  if (typeof data.isActive === 'boolean') {
    flow.isActive = data.isActive;
  }
  flow.lastUpdatedOn = new Date().toISOString();

  return flowDetailFromApi(JSON.parse(JSON.stringify(flow)));
}

export async function createStep(flowId, data) {
  await delay();
  const idNum = Number(flowId);
  const flow = mockFlows.find((f) => f.id === idNum);
  if (!flow) {
    throw new ApiError(`Process flow with ID ${flowId} not found`, 404);
  }

  const payload = stepToApi(data);
  if (!payload.title) {
    throw new ApiError('Title is required', 400, { title: 'Title is required' });
  }

  // Check cell free among ACTIVE steps of the flow
  const conflictingStep = flow.steps.find(
    (s) => s.isActive && s.colNo === payload.colNo && s.rowNo === payload.rowNo
  );
  if (conflictingStep) {
    throw new ApiError(
      `Cell (${payload.colNo}, ${payload.rowNo}) is already occupied by step "${conflictingStep.title}".`,
      409,
      { colNo: `Occupied by "${conflictingStep.title}"` }
    );
  }

  const newStep = {
    id: nextStepId++,
    processFlowId: idNum,
    ...payload,
  };

  flow.steps.push(newStep);
  flow.lastUpdatedOn = new Date().toISOString();
  return flowStepFromApi(newStep);
}

export async function updateStep(stepId, data) {
  await delay();
  const idNum = Number(stepId);
  let targetFlow = null;
  let targetStep = null;

  for (const f of mockFlows) {
    const s = f.steps.find((step) => step.id === idNum);
    if (s) {
      targetFlow = f;
      targetStep = s;
      break;
    }
  }

  if (!targetStep) {
    throw new ApiError(`Step with ID ${stepId} not found`, 404);
  }

  const payload = stepToApi(data);
  if (!payload.title) {
    throw new ApiError('Title is required', 400, { title: 'Title is required' });
  }

  // If active, check cell collision with other active steps
  if (payload.isActive !== false) {
    const conflict = targetFlow.steps.find(
      (s) => s.id !== idNum && s.isActive && s.colNo === payload.colNo && s.rowNo === payload.rowNo
    );
    if (conflict) {
      throw new ApiError(
        `Cell (${payload.colNo}, ${payload.rowNo}) is already occupied by step "${conflict.title}".`,
        409,
        { colNo: `Occupied by "${conflict.title}"` }
      );
    }
  }

  Object.assign(targetStep, payload);
  targetFlow.lastUpdatedOn = new Date().toISOString();

  // If soft-deleted, also deactivate connected transitions
  if (targetStep.isActive === false) {
    targetFlow.transitions.forEach((t) => {
      if (t.fromStepId === idNum || t.toStepId === idNum) {
        t.isActive = false;
      }
    });
  }

  return flowStepFromApi(targetStep);
}

export async function removeStep(stepId) {
  await delay();
  const idNum = Number(stepId);
  let targetFlow = null;
  let targetStep = null;

  for (const f of mockFlows) {
    const s = f.steps.find((step) => step.id === idNum);
    if (s) {
      targetFlow = f;
      targetStep = s;
      break;
    }
  }

  if (!targetStep) {
    throw new ApiError(`Step with ID ${stepId} not found`, 404);
  }

  targetStep.isActive = false;
  // Soft-deactivates connected transitions in same transaction
  targetFlow.transitions.forEach((t) => {
    if (t.fromStepId === idNum || t.toStepId === idNum) {
      t.isActive = false;
    }
  });

  targetFlow.lastUpdatedOn = new Date().toISOString();
  return { success: true };
}

export async function restoreStep(stepId, stepData) {
  return updateStep(stepId, { ...stepData, isActive: true });
}

export async function createTransition(flowId, data) {
  await delay();
  const idNum = Number(flowId);
  const flow = mockFlows.find((f) => f.id === idNum);
  if (!flow) {
    throw new ApiError(`Process flow with ID ${flowId} not found`, 404);
  }

  const payload = transitionToApi(data);
  if (!payload.fromStepId || !payload.toStepId) {
    throw new ApiError('Both source and target steps must be selected', 400);
  }

  // Self-loop check
  if (payload.fromStepId === payload.toStepId) {
    throw new ApiError('A transition cannot connect a step to itself (self-loop).', 400, {
      toStepId: 'Self-loops are not allowed',
    });
  }

  // Both steps must be active
  const fromStep = flow.steps.find((s) => s.id === payload.fromStepId && s.isActive);
  const toStep = flow.steps.find((s) => s.id === payload.toStepId && s.isActive);
  if (!fromStep || !toStep) {
    throw new ApiError('Both steps must be active to create a transition.', 400);
  }

  // Check duplicate transition among active transitions
  const duplicate = flow.transitions.find(
    (t) => t.isActive && t.fromStepId === payload.fromStepId && t.toStepId === payload.toStepId
  );
  if (duplicate) {
    throw new ApiError('An active transition between these two steps already exists.', 409, {
      toStepId: 'Transition already exists between these steps',
    });
  }

  const newTransition = {
    id: nextTransitionId++,
    processFlowId: idNum,
    ...payload,
  };

  flow.transitions.push(newTransition);
  flow.lastUpdatedOn = new Date().toISOString();
  return flowTransitionFromApi(newTransition);
}

export async function updateTransition(transitionId, data) {
  await delay();
  const idNum = Number(transitionId);
  let targetFlow = null;
  let targetTransition = null;

  for (const f of mockFlows) {
    const t = f.transitions.find((trans) => trans.id === idNum);
    if (t) {
      targetFlow = f;
      targetTransition = t;
      break;
    }
  }

  if (!targetTransition) {
    throw new ApiError(`Transition with ID ${transitionId} not found`, 404);
  }

  const payload = transitionToApi(data);
  if (payload.fromStepId === payload.toStepId) {
    throw new ApiError('A transition cannot connect a step to itself (self-loop).', 400, {
      toStepId: 'Self-loops are not allowed',
    });
  }

  if (payload.isActive !== false) {
    const duplicate = targetFlow.transitions.find(
      (t) =>
        t.id !== idNum &&
        t.isActive &&
        t.fromStepId === payload.fromStepId &&
        t.toStepId === payload.toStepId
    );
    if (duplicate) {
      throw new ApiError('An active transition between these two steps already exists.', 409, {
        toStepId: 'Transition already exists between these steps',
      });
    }
  }

  Object.assign(targetTransition, payload);
  targetFlow.lastUpdatedOn = new Date().toISOString();
  return flowTransitionFromApi(targetTransition);
}

export async function removeTransition(transitionId) {
  await delay();
  const idNum = Number(transitionId);
  let targetFlow = null;
  let targetTransition = null;

  for (const f of mockFlows) {
    const t = f.transitions.find((trans) => trans.id === idNum);
    if (t) {
      targetFlow = f;
      targetTransition = t;
      break;
    }
  }

  if (!targetTransition) {
    throw new ApiError(`Transition with ID ${transitionId} not found`, 404);
  }

  targetTransition.isActive = false;
  targetFlow.lastUpdatedOn = new Date().toISOString();
  return { success: true };
}

export async function restoreTransition(transitionId, transitionData) {
  return updateTransition(transitionId, { ...transitionData, isActive: true });
}
