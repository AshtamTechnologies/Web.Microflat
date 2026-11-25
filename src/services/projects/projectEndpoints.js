/**
 * src/services/projects/projectEndpoints.js
 * Centralized API endpoints for Projects module.
 * Aligned with ProjectCreation.md §2.
 */

function cleanId(id) {
  if (typeof id === 'number') return id;
  const match = String(id).match(/\d+/);
  return match ? Number(match[0]) : id;
}

export const PROJECT_ENDPOINTS = {
  // Lookups & Code Series
  LOOKUPS: '/api/projects/lookups',
  NEXT_CODE: '/api/projects/next-code',

  // Project CRUD & Status
  PROJECTS: '/api/projects',
  PROJECT_BY_ID: (id) => `/api/projects/${cleanId(id)}`,
  STATUS: (id) => `/api/projects/${cleanId(id)}/status`,

  // Phases
  PHASES: (projectId) => `/api/projects/${cleanId(projectId)}/phases`,
  PHASE_BY_ID: (phaseId) => `/api/project-phases/${cleanId(phaseId)}`,

  // Milestones
  MILESTONES: (projectId) => `/api/projects/${cleanId(projectId)}/milestones`,
  MILESTONE_BY_ID: (milestoneId) => `/api/project-milestones/${cleanId(milestoneId)}`,

  // Costings
  COSTINGS: (projectId) => `/api/projects/${cleanId(projectId)}/costings`,
  COSTING_BY_ID: (costingId) => `/api/project-costings/${cleanId(costingId)}`,

  // Documents
  DOCUMENTS: (projectId) => `/api/projects/${cleanId(projectId)}/documents`,
  DOCUMENT_DOWNLOAD: (docId) => `/api/project-documents/${cleanId(docId)}/download`,
  DOCUMENT_BY_ID: (docId) => `/api/project-documents/${cleanId(docId)}`,

  // Sales Orders picker (Confirmed orders only)
  CONFIRMED_SALES_ORDERS: '/api/order-confirmations',
  ORDER_CONFIRMATION_BY_ID: (id) => `/api/order-confirmations/${cleanId(id)}`,
};
