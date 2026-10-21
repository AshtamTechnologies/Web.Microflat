/**
 * processFlowModel.js — Process Flow typedefs, mappers, and serializers.
 *
 * Mappers handle field naming between API and Frontend:
 *   - createdOn -> createdAt
 *   - lastUpdatedOn -> updatedAt
 *   - processFlowId -> flowId
 *   - label null -> ''
 *
 * @typedef {Object} ProcessFlowSummaryModel
 * @property {number} id
 * @property {string} moduleCode
 * @property {string} name
 * @property {boolean} isActive
 * @property {number} stepCount
 * @property {number} transitionCount
 * @property {string} createdAt
 * @property {string|null} updatedAt
 *
 * @typedef {Object} ProcessFlowStepModel
 * @property {number} id
 * @property {number} flowId
 * @property {number} processFlowId
 * @property {boolean} isActive
 * @property {string} title
 * @property {string} description
 * @property {string} iconKey
 * @property {number} colNo
 * @property {number} rowNo
 * @property {string} outcomeType
 *
 * @typedef {Object} ProcessFlowTransitionModel
 * @property {number} id
 * @property {number} flowId
 * @property {number} processFlowId
 * @property {boolean} isActive
 * @property {number} fromStepId
 * @property {number} toStepId
 * @property {string} label
 * @property {string} outcomeType
 *
 * @typedef {Object} ProcessFlowDetailModel
 * @property {number} id
 * @property {string} moduleCode
 * @property {string} name
 * @property {boolean} isActive
 * @property {ProcessFlowStepModel[]} steps
 * @property {ProcessFlowTransitionModel[]} transitions
 * @property {string} [createdAt]
 * @property {string|null} [updatedAt]
 */

/**
 * Maps API summary DTO to frontend ProcessFlowSummaryModel.
 * @param {object} dto
 * @returns {ProcessFlowSummaryModel}
 */
export function flowSummaryFromApi(dto = {}) {
  return {
    id: dto.id,
    moduleCode: dto.moduleCode || '',
    name: dto.name || '',
    isActive: Boolean(dto.isActive),
    stepCount: Number(dto.stepCount || 0),
    transitionCount: Number(dto.transitionCount || 0),
    createdAt: dto.createdOn || '',
    updatedAt: dto.lastUpdatedOn || null,
    createdOn: dto.createdOn || '',
    lastUpdatedOn: dto.lastUpdatedOn || null,
  };
}

/**
 * Maps array of summary DTOs.
 * @param {object[]} [list]
 * @returns {ProcessFlowSummaryModel[]}
 */
export function flowSummariesFromApi(list = []) {
  if (!Array.isArray(list)) return [];
  return list.map(flowSummaryFromApi);
}

/**
 * Maps API Step DTO to frontend ProcessFlowStepModel.
 * @param {object} dto
 * @returns {ProcessFlowStepModel}
 */
export function flowStepFromApi(dto = {}) {
  return {
    id: dto.id,
    flowId: dto.processFlowId,
    processFlowId: dto.processFlowId,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    title: dto.title || '',
    description: dto.description || '',
    iconKey: dto.iconKey || '',
    colNo: Number(dto.colNo || 1),
    rowNo: Number(dto.rowNo || 1),
    outcomeType: dto.outcomeType || 'Normal',
  };
}

/**
 * Maps API Transition DTO to frontend ProcessFlowTransitionModel.
 * @param {object} dto
 * @returns {ProcessFlowTransitionModel}
 */
export function flowTransitionFromApi(dto = {}) {
  return {
    id: dto.id,
    flowId: dto.processFlowId,
    processFlowId: dto.processFlowId,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    fromStepId: Number(dto.fromStepId),
    toStepId: Number(dto.toStepId),
    label: dto.label || '',
    outcomeType: dto.outcomeType || 'Normal',
  };
}

/**
 * Maps API Flow Detail DTO (with steps and transitions) to frontend ProcessFlowDetailModel.
 * @param {object} dto
 * @returns {ProcessFlowDetailModel}
 */
export function flowDetailFromApi(dto = {}) {
  return {
    id: dto.id,
    moduleCode: dto.moduleCode || '',
    name: dto.name || '',
    isActive: Boolean(dto.isActive),
    steps: Array.isArray(dto.steps) ? dto.steps.map(flowStepFromApi) : [],
    transitions: Array.isArray(dto.transitions) ? dto.transitions.map(flowTransitionFromApi) : [],
    createdAt: dto.createdOn || '',
    updatedAt: dto.lastUpdatedOn || null,
  };
}

/**
 * Serializes flow creation payload for POST /api/process-flow-admin.
 * @param {{ moduleCode: string, name: string, isActive?: boolean }} model
 * @returns {{ moduleCode: string, name: string, isActive: boolean }}
 */
export function flowToCreateApi(model = {}) {
  return {
    moduleCode: String(model.moduleCode || '').trim().toUpperCase(),
    name: String(model.name || '').trim(),
    isActive: model.isActive !== false,
  };
}

/**
 * Serializes flow update payload for PUT /api/process-flow-admin/{flowId}.
 * @param {{ name: string, isActive?: boolean }} model
 * @returns {{ name: string, isActive: boolean }}
 */
export function flowToUpdateApi(model = {}) {
  return {
    name: String(model.name || '').trim(),
    isActive: model.isActive !== false,
  };
}

/**
 * Serializes step payload for POST /api/process-flow-admin/{flowId}/steps and PUT.
 * @param {Partial<ProcessFlowStepModel>} model
 * @returns {object}
 */
export function stepToApi(model = {}) {
  return {
    title: String(model.title || '').trim(),
    description: model.description && String(model.description).trim() ? String(model.description).trim() : null,
    iconKey: model.iconKey && String(model.iconKey).trim() ? String(model.iconKey).trim() : null,
    colNo: Math.max(1, parseInt(model.colNo, 10) || 1),
    rowNo: Math.max(1, parseInt(model.rowNo, 10) || 1),
    outcomeType: model.outcomeType || 'Normal',
    isActive: model.isActive !== false,
  };
}

/**
 * Serializes transition payload for POST /api/process-flow-admin/{flowId}/transitions and PUT.
 * @param {Partial<ProcessFlowTransitionModel>} model
 * @returns {object}
 */
export function transitionToApi(model = {}) {
  return {
    fromStepId: Number(model.fromStepId),
    toStepId: Number(model.toStepId),
    label: model.label && String(model.label).trim() ? String(model.label).trim() : null,
    outcomeType: model.outcomeType || 'Normal',
    isActive: model.isActive !== false,
  };
}
