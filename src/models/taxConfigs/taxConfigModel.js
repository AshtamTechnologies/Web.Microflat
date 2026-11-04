/**
 * src/models/taxConfigs/taxConfigModel.js — Tax Configuration typedefs, mappers, and serializers.
 *
 * Maps between backend DTO and frontend model:
 *   - Tax Configuration Header
 *   - Tax Rates Timeline
 *   - Applicable Taxes
 */

/**
 * Creates an empty TaxConfig model.
 */
export function createEmptyTaxConfig() {
  return {
    id: 0,
    taxName: '',
    isActive: true,
    currentTaxConfigDetailId: 0,
    currentTaxPercent: 0,
    currentEffectiveDate: new Date().toISOString().split('T')[0],
    rateCount: 0,
    createdBy: 0,
    createdOn: '',
    lastUpdatedBy: 0,
    lastUpdatedOn: null,
    rates: [],
  };
}

/**
 * Creates an empty TaxRate model.
 */
export function createEmptyTaxRate(taxConfigId = 0) {
  return {
    id: 0,
    taxConfigId,
    taxName: '',
    taxPercent: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    state: 'Current',
    isInUse: false,
    createdBy: 0,
    createdOn: '',
    lastUpdatedBy: 0,
    lastUpdatedOn: null,
  };
}

/**
 * Normalizes an API Rate DTO to a frontend TaxRateModel.
 */
export function taxRateFromApi(dto) {
  if (!dto) return createEmptyTaxRate();

  const id = dto.id !== undefined ? dto.id : dto.taxConfigDetailId ?? 0;
  const taxPercent = dto.taxPercent !== undefined ? Number(dto.taxPercent) : 0;
  const effectiveDate = dto.effectiveDate
    ? String(dto.effectiveDate).split('T')[0]
    : '';

  return {
    id,
    taxConfigId: dto.taxConfigId ?? 0,
    taxName: dto.taxName || '',
    taxPercent,
    effectiveDate,
    state: dto.state || 'Current',
    isInUse: Boolean(dto.isInUse),
    createdBy: dto.createdBy ?? 0,
    createdOn: dto.createdOn || dto.createdAt || '',
    lastUpdatedBy: dto.lastUpdatedBy ?? 0,
    lastUpdatedOn: dto.lastUpdatedOn || dto.updatedAt || null,
  };
}

/**
 * Maps an array of Rate DTOs.
 */
export function taxRatesFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(taxRateFromApi);
}

/**
 * Normalizes an API TaxConfig DTO to a frontend TaxConfigModel.
 */
export function taxConfigFromApi(dto) {
  if (!dto) return createEmptyTaxConfig();

  const id = dto.id !== undefined ? dto.id : 0;
  const currentTaxPercent =
    dto.currentTaxPercent !== undefined
      ? Number(dto.currentTaxPercent)
      : dto.taxPercent !== undefined
      ? Number(dto.taxPercent)
      : 0;
  const currentEffectiveDate = dto.currentEffectiveDate
    ? String(dto.currentEffectiveDate).split('T')[0]
    : dto.effectiveDate
    ? String(dto.effectiveDate).split('T')[0]
    : '';

  const rates = Array.isArray(dto.rates) ? taxRatesFromApi(dto.rates) : [];

  return {
    id,
    taxName: dto.taxName ? String(dto.taxName).trim() : '',
    isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    currentTaxConfigDetailId: dto.currentTaxConfigDetailId ?? dto.taxConfigDetailId ?? 0,
    currentTaxPercent,
    currentEffectiveDate,
    rateCount: dto.rateCount !== undefined ? Number(dto.rateCount) : rates.length,
    createdBy: dto.createdBy ?? 0,
    createdOn: dto.createdOn || dto.createdAt || '',
    lastUpdatedBy: dto.lastUpdatedBy ?? 0,
    lastUpdatedOn: dto.lastUpdatedOn || dto.updatedAt || null,
    rates,
  };
}

/**
 * Maps an array of API TaxConfig DTOs.
 */
export function taxConfigsFromApi(list) {
  if (!Array.isArray(list)) return [];
  return list.map(taxConfigFromApi);
}

/**
 * Normalizes an Applicable Tax item.
 */
export function applicableTaxFromApi(dto) {
  if (!dto) return null;
  return {
    taxConfigId: dto.taxConfigId ?? dto.id ?? 0,
    taxName: dto.taxName || '',
    taxConfigDetailId: dto.taxConfigDetailId ?? dto.currentTaxConfigDetailId ?? 0,
    taxPercent: dto.taxPercent !== undefined ? Number(dto.taxPercent) : 0,
    effectiveDate: dto.effectiveDate ? String(dto.effectiveDate).split('T')[0] : '',
  };
}

/**
 * Serializes payload for POST /api/tax-configs.
 */
export function taxConfigToCreatePayload(data = {}) {
  const taxName = String(data.taxName || '').trim();
  const taxPercent = Number(data.taxPercent) || 0;
  const effectiveDate = data.effectiveDate
    ? String(data.effectiveDate).split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    taxName,
    taxPercent,
    effectiveDate,
  };
}

/**
 * Serializes payload for PUT /api/tax-configs/{id}.
 */
export function taxConfigToUpdatePayload(data = {}) {
  return {
    taxName: String(data.taxName || '').trim(),
  };
}

/**
 * Serializes active status payload for PATCH /api/tax-configs/{id}/status.
 */
export function taxConfigStatusPayload(isActive) {
  return {
    isActive: Boolean(isActive),
  };
}

/**
 * Serializes payload for POST /api/tax-configs/{id}/rates and PUT /api/tax-config-rates/{id}.
 */
export function taxRatePayload(data = {}) {
  const taxPercent = Number(data.taxPercent) || 0;
  const effectiveDate = data.effectiveDate
    ? String(data.effectiveDate).split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    taxPercent,
    effectiveDate,
  };
}

