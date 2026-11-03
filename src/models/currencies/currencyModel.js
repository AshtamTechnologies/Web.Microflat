/**
 * currencyModel.js — Currencies typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - id
 *   - currencyCode (up to 10 chars, uppercase, unique)
 *   - currencyName
 *   - currencySymbol
 *   - isActive
 *   - createdOn / createdAt
 *   - lastUpdatedOn / updatedAt
 *
 * @typedef {Object} ApiCurrencyDto
 * @property {number} id
 * @property {string} currencyCode
 * @property {string} currencyName
 * @property {string} currencySymbol
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string|null} [lastUpdatedOn]
 *
 * @typedef {Object} CurrencyModel
 * @property {number} id
 * @property {string} currencyCode
 * @property {string} currencyName
 * @property {string} currencySymbol
 * @property {boolean} isActive
 * @property {string} createdOn
 * @property {string} createdAt
 * @property {string|null} lastUpdatedOn
 * @property {string|null} updatedAt
 */

/**
 * Creates an empty CurrencyModel.
 * @returns {CurrencyModel}
 */
export function createEmptyCurrency() {
  return {
    id: 0,
    currencyCode: '',
    currencyName: '',
    currencySymbol: '',
    isActive: true,
    createdOn: '',
    createdAt: '',
    lastUpdatedOn: null,
    updatedAt: null,
  };
}

/**
 * Normalizes an API Currency DTO to a frontend CurrencyModel.
 *
 * @param {ApiCurrencyDto|object} dto
 * @returns {CurrencyModel}
 */
export function currencyFromApi(dto) {
  if (!dto) return createEmptyCurrency();

  const id = dto.id ?? 0;
  const created = dto.createdOn || dto.createdAt || '';
  const updated = dto.lastUpdatedOn || dto.updatedAt || null;

  return {
    id,
    currencyCode: dto.currencyCode || '',
    currencyName: dto.currencyName || '',
    currencySymbol: dto.currencySymbol || '',
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    createdOn: created,
    createdAt: created,
    lastUpdatedOn: updated,
    updatedAt: updated,
  };
}

/**
 * Maps an array or paginated response of API Currency DTOs to CurrencyModels array.
 *
 * @param {ApiCurrencyDto[]|{ items: ApiCurrencyDto[] }} response
 * @returns {CurrencyModel[]}
 */
export function currenciesFromApi(response) {
  if (!response) return [];
  if (Array.isArray(response)) {
    return response.map(currencyFromApi);
  }
  if (Array.isArray(response?.items)) {
    return response.items.map(currencyFromApi);
  }
  return [];
}

/**
 * Serializes frontend form data to the payload expected by POST /api/currencies.
 *
 * @param {{ currencyCode: string, currencyName: string, currencySymbol: string }} data
 * @returns {{ currencyCode: string, currencyName: string, currencySymbol: string }}
 */
export function currencyToApiCreate(data = {}) {
  return {
    currencyCode: String(data.currencyCode || '').trim().toUpperCase(),
    currencyName: String(data.currencyName || '').trim(),
    currencySymbol: String(data.currencySymbol || '').trim(),
  };
}

/**
 * Serializes frontend form data to the payload expected by PUT /api/currencies/{id}.
 *
 * @param {{ currencyCode: string, currencyName: string, currencySymbol: string }} data
 * @returns {{ currencyCode: string, currencyName: string, currencySymbol: string }}
 */
export function currencyToApiUpdate(data = {}) {
  return {
    currencyCode: String(data.currencyCode || '').trim().toUpperCase(),
    currencyName: String(data.currencyName || '').trim(),
    currencySymbol: String(data.currencySymbol || '').trim(),
  };
}

/**
 * Serializes status payload for PATCH /api/currencies/{id}/status.
 *
 * @param {boolean} isActive
 * @returns {{ isActive: boolean }}
 */
export function currencyStatusToApi(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}

