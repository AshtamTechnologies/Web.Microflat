/**
 * src/models/projects/projectModel.js
 * Domain model transformers and serializers for Projects module.
 * Aligned with ProjectCreation.md §4, §5, §7, §9.
 */

/**
 * Normalizes a list item from GET /api/projects
 */
export function projectListItemFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id ?? 0,
    projectCode: dto.projectCode || '',
    projectName: dto.projectName || '',
    projectTypeId: dto.projectTypeId ?? null,
    projectTypeName: dto.projectTypeName || '—',
    projectBillingTypeId: dto.projectBillingTypeId ?? null,
    projectBillingTypeName: dto.projectBillingTypeName || '—',
    orderConfirmationId: dto.orderConfirmationId ?? null,
    orderConfirmationNo: dto.orderConfirmationNo || null,
    clientId: dto.clientId ?? null,
    clientName: dto.clientName || '—',
    startDate: dto.startDate ? String(dto.startDate).slice(0, 10) : null,
    endDate: dto.endDate ? String(dto.endDate).slice(0, 10) : null,
    status: dto.status || 'Created',
    phaseCount: dto.phaseCount ?? 0,
    createdBy: dto.createdBy ?? null,
    createdByName: dto.createdByName || '—',
    createdOn: dto.createdOn || '',
    lastUpdatedOn: dto.lastUpdatedOn || null,
  };
}

/**
 * Normalizes full project detail from GET /api/projects/{id}
 */
export function projectDetailFromApi(dto) {
  if (!dto) return null;
  const base = projectListItemFromApi(dto);
  return {
    ...base,
    remarks: dto.remarks || '',
    lastUpdatedBy: dto.lastUpdatedBy ?? null,
    lastUpdatedByName: dto.lastUpdatedByName || null,
    isEditable: dto.isEditable !== undefined ? Boolean(dto.isEditable) : true,
    nextStatuses: Array.isArray(dto.nextStatuses) ? dto.nextStatuses : [],
    phases: Array.isArray(dto.phases) ? dto.phases.map(phaseFromApi) : [],
    milestones: Array.isArray(dto.milestones) ? dto.milestones.map(milestoneFromApi) : [],
    costings: Array.isArray(dto.costings) ? dto.costings.map(costingFromApi) : [],
    costSummary: Array.isArray(dto.costSummary) ? dto.costSummary : [],
    documents: Array.isArray(dto.documents) ? dto.documents.map(documentFromApi) : [],
  };
}

export function phaseFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id ?? dto.projectPhaseId ?? 0,
    projectId: dto.projectId ?? 0,
    phaseName: dto.phaseName || '',
    sequenceNo: dto.sequenceNo ?? 0,
    plannedStartDate: dto.plannedStartDate ? String(dto.plannedStartDate).slice(0, 10) : null,
    plannedEndDate: dto.plannedEndDate ? String(dto.plannedEndDate).slice(0, 10) : null,
    actualEndDate: dto.actualEndDate ? String(dto.actualEndDate).slice(0, 10) : null,
    status: dto.status || 'Not Started',
    remarks: dto.remarks || '',
  };
}

export function milestoneFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id ?? dto.projectMilestoneId ?? 0,
    projectId: dto.projectId ?? 0,
    projectPhaseId: dto.projectPhaseId ?? null,
    phaseName: dto.phaseName || '',
    milestoneName: dto.milestoneName || '',
    dueDate: dto.dueDate ? String(dto.dueDate).slice(0, 10) : '',
    status: dto.status || 'Pending',
    completedOn: dto.completedOn ? String(dto.completedOn).slice(0, 10) : null,
    remarks: dto.remarks || '',
  };
}

export function costingFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id ?? dto.projectCostingId ?? 0,
    projectId: dto.projectId ?? 0,
    projectPhaseId: dto.projectPhaseId ?? null,
    phaseName: dto.phaseName || '',
    costType: dto.costType || 'Estimated',
    costCategory: dto.costCategory || 'Material',
    description: dto.description || '',
    costDate: dto.costDate ? String(dto.costDate).slice(0, 10) : '',
    amount: Number(dto.amount) || 0,
    currencyId: dto.currencyId ?? null,
    currencyCode: dto.currencyCode || 'INR',
  };
}

export function documentFromApi(dto) {
  if (!dto) return null;
  return {
    id: dto.id ?? dto.projectDocumentId ?? 0,
    projectId: dto.projectId ?? 0,
    documentTypeId: dto.documentTypeId ?? null,
    documentTypeName: dto.documentTypeName || '',
    documentName: dto.documentName || '',
    fileName: dto.fileName || '',
    fileSize: dto.fileSize ?? 0,
    uploadedBy: dto.uploadedBy ?? null,
    uploadedByName: dto.uploadedByName || '',
    uploadedOn: dto.uploadedOn || '',
    remarks: dto.remarks || '',
    downloadUrl: dto.downloadUrl || null,
  };
}

/**
 * Builds payload for POST /api/projects
 */
export function buildCreateProjectPayload(form, isSalesOrderMode = false) {
  const payload = {
    projectName: String(form.projectName || '').trim(),
    projectTypeId: Number(form.projectTypeId),
    projectBillingTypeId: form.projectBillingTypeId ? Number(form.projectBillingTypeId) : null,
    startDate: form.startDate ? String(form.startDate).slice(0, 10) : null,
    endDate: form.endDate ? String(form.endDate).slice(0, 10) : null,
    remarks: form.remarks ? String(form.remarks).trim() : null,
    orderConfirmationId: isSalesOrderMode && form.orderConfirmationId ? Number(form.orderConfirmationId) : null,
  };
  return payload;
}

/**
 * Builds payload for PUT /api/projects/{id}
 */
export function buildUpdateProjectPayload(form) {
  return {
    projectName: String(form.projectName || '').trim(),
    projectTypeId: Number(form.projectTypeId),
    projectBillingTypeId: form.projectBillingTypeId ? Number(form.projectBillingTypeId) : null,
    startDate: form.startDate ? String(form.startDate).slice(0, 10) : null,
    endDate: form.endDate ? String(form.endDate).slice(0, 10) : null,
    remarks: form.remarks ? String(form.remarks).trim() : null,
  };
}
