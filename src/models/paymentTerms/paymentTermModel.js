/**
 * paymentTermModel.js — Payment Term typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id / paymentTermId
 *   - termCode
 *   - termName
 *   - displayOrder
 *   - description
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiPaymentTermDto
 * @property {number|string} id
 * @property {string} termCode
 * @property {string} termName
 * @property {number} displayOrder
 * @property {string} description
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} PaymentTermModel
 * @property {number|string} id
 * @property {number|string} paymentTermId
 * @property {string} termCode
 * @property {string} termName
 * @property {number} displayOrder
 * @property {string} description
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty PaymentTermModel.
 * @returns {PaymentTermModel}
 */
export function createEmptyPaymentTerm() {
  return {
    id: 0,
    paymentTermId: 0,
    termCode: '',
    termName: '',
    displayOrder: 1,
    description: '',
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API PaymentTerm DTO to a frontend PaymentTermModel.
 *
 * @param {ApiPaymentTermDto|object} dto
 * @returns {PaymentTermModel}
 */
export function paymentTermFromApi(dto) {
  if (!dto) return createEmptyPaymentTerm();

  const id = dto.id !== undefined ? dto.id : dto.paymentTermId ?? 0;
  const termCode = dto.termCode ? String(dto.termCode).trim().toUpperCase() : '';
  const termName = dto.termName || termCode || '';
  const displayOrder = dto.displayOrder !== undefined ? (Number(dto.displayOrder) || 1) : 1;
  const description = dto.description || '';
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    paymentTermId: id,
    termCode,
    termName,
    displayOrder,
    description,
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array of API PaymentTerm DTOs to PaymentTermModels.
 * @param {ApiPaymentTermDto[]} [list]
 * @returns {PaymentTermModel[]}
 */
export function paymentTermsFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(paymentTermFromApi);
}

/**
 * Serializes frontend form data to the payload expected by POST /api/payment-terms.
 *
 * @param {{ termCode: string, termName?: string, displayOrder?: number, description?: string }} data
 * @returns {{ termCode: string, termName: string, displayOrder: number, description: string }}
 */
export function paymentTermToApiCreate(data = {}) {
  const code = String(data.termCode || '').trim().toUpperCase();
  const name = String(data.termName || data.termCode || '').trim();
  return {
    termCode: code,
    termName: name || code,
    displayOrder: Number(data.displayOrder) > 0 ? Number(data.displayOrder) : 1,
    description: typeof data.description === 'string' ? data.description.trim() : '',
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/payment-terms/{id}.
 *
 * @param {{ termCode: string, termName?: string, displayOrder?: number, description?: string }} data
 * @returns {{ termCode: string, termName: string, displayOrder: number, description: string }}
 */
export function paymentTermToApiUpdate(data = {}) {
  return paymentTermToApiCreate(data);
}

/**
 * Serializes active status payload for PATCH /api/payment-terms/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function paymentTermStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}
