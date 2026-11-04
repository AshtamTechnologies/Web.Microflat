/**
 * src/services/taxConfigs/taxConfigsService.js — Real Tax Configurations service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { TAX_CONFIGS_ENDPOINTS } from './taxConfigsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  taxConfigFromApi,
  taxConfigsFromApi,
  taxRateFromApi,
  taxRatesFromApi,
  applicableTaxFromApi,
  taxConfigToCreatePayload,
  taxConfigToUpdatePayload,
  taxConfigStatusPayload,
  taxRatePayload,
} from '../../models/taxConfigs/taxConfigModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: true,
  create: true,
  update: true,
  status: true,
  rates: true,
};

/**
 * Returns paged list of tax configs with rate effective today.
 * GET /api/tax-configs
 *
 * @param {{ Search?: string, search?: string, IsActive?: boolean|string, isActive?: boolean|string, PageNumber?: number, PageSize?: number }} [params]
 * @returns {Promise<{ items: import('../../models/taxConfigs/taxConfigModel').TaxConfigModel[], pageNumber: number, pageSize: number, totalCount: number, totalPages: number }>}
 */
export async function listTaxConfigs(params = {}) {
  try {
    const query = {};

    const search = params.Search ?? params.search;
    if (search !== undefined && search !== null && String(search).trim() !== '') {
      query.Search = String(search).trim();
    }

    const act = params.IsActive ?? params.isActive;
    if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
      query.IsActive = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    }

    if (params.PageNumber !== undefined) query.PageNumber = Number(params.PageNumber);
    if (params.pageNumber !== undefined) query.PageNumber = Number(params.pageNumber);
    if (params.PageSize !== undefined) query.PageSize = Number(params.PageSize);
    if (params.pageSize !== undefined) query.PageSize = Number(params.pageSize);

    const response = await axiosInstance.get(TAX_CONFIGS_ENDPOINTS.TAX_CONFIGS, {
      params: query,
    });

    const data = response.data || {};
    const rawItems = Array.isArray(data) ? data : data.items || [];

    return {
      items: taxConfigsFromApi(rawItems),
      pageNumber: data.pageNumber ?? params.PageNumber ?? 1,
      pageSize: data.pageSize ?? params.PageSize ?? 10,
      totalCount: data.totalCount ?? rawItems.length,
      totalPages: data.totalPages ?? (data.totalCount ? Math.ceil(data.totalCount / (data.pageSize || 10)) : 1),
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns applicable taxes for dropdowns as of a given date (defaults to today).
 * GET /api/tax-configs/applicable
 *
 * @param {string} [date]
 * @returns {Promise<Array<{ taxConfigId: number, taxName: string, taxConfigDetailId: number, taxPercent: number, effectiveDate: string }>>}
 */
export async function getApplicableTaxes(date) {
  try {
    const query = {};
    if (date) {
      query.date = date;
    }
    const response = await axiosInstance.get(TAX_CONFIGS_ENDPOINTS.APPLICABLE_TAXES, {
      params: query,
    });
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(applicableTaxFromApi).filter(Boolean);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns single tax config by ID with rate timeline.
 * GET /api/tax-configs/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('../../models/taxConfigs/taxConfigModel').TaxConfigModel>}
 */
export async function getTaxConfig(id) {
  try {
    const response = await axiosInstance.get(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_BY_ID(id));
    return taxConfigFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a tax config with its initial rate.
 * POST /api/tax-configs
 *
 * @param {{ taxName: string, taxPercent: number, effectiveDate: string }} data
 * @returns {Promise<any>}
 */
export async function createTaxConfig(data) {
  try {
    const payload = taxConfigToCreatePayload(data);
    const response = await axiosInstance.post(TAX_CONFIGS_ENDPOINTS.TAX_CONFIGS, payload);
    return taxConfigFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Renames a tax config.
 * PUT /api/tax-configs/{id}
 *
 * @param {number|string} id
 * @param {{ taxName: string }} data
 * @returns {Promise<any>}
 */
export async function updateTaxConfig(id, data) {
  try {
    const payload = taxConfigToUpdatePayload(data);
    const response = await axiosInstance.put(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_BY_ID(id), payload);
    return taxConfigFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Activates or deactivates a tax config.
 * PATCH /api/tax-configs/{id}/status
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<any>}
 */
export async function updateTaxConfigStatus(id, isActive) {
  try {
    const payload = taxConfigStatusPayload(isActive);
    const response = await axiosInstance.patch(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_STATUS(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes a tax and its rates when no document uses it.
 * DELETE /api/tax-configs/{id}
 *
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export async function deleteTaxConfig(id) {
  try {
    const response = await axiosInstance.delete(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_BY_ID(id));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns rate timeline of the tax, newest effective date first.
 * GET /api/tax-configs/{id}/rates
 *
 * @param {number|string} id
 * @returns {Promise<import('../../models/taxConfigs/taxConfigModel').TaxRateModel[]>}
 */
export async function getTaxConfigRates(id) {
  try {
    const response = await axiosInstance.get(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_RATES(id));
    return taxRatesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Adds a new rate from an effective date.
 * POST /api/tax-configs/{id}/rates
 *
 * @param {number|string} id
 * @param {{ taxPercent: number, effectiveDate: string }} data
 * @returns {Promise<any>}
 */
export async function createTaxConfigRate(id, data) {
  try {
    const payload = taxRatePayload(data);
    const response = await axiosInstance.post(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_RATES(id), payload);
    return taxRateFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns single rate details.
 * GET /api/tax-config-rates/{rateId}
 *
 * @param {number|string} rateId
 * @returns {Promise<import('../../models/taxConfigs/taxConfigModel').TaxRateModel>}
 */
export async function getTaxConfigRate(rateId) {
  try {
    const response = await axiosInstance.get(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_RATE_BY_ID(rateId));
    return taxRateFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates a rate that no document uses yet.
 * PUT /api/tax-config-rates/{rateId}
 *
 * @param {number|string} rateId
 * @param {{ taxPercent: number, effectiveDate: string }} data
 * @returns {Promise<any>}
 */
export async function updateTaxConfigRate(rateId, data) {
  try {
    const payload = taxRatePayload(data);
    const response = await axiosInstance.put(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_RATE_BY_ID(rateId), payload);
    return taxRateFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Deletes a rate that no document uses yet.
 * DELETE /api/tax-config-rates/{rateId}
 *
 * @param {number|string} rateId
 * @returns {Promise<any>}
 */
export async function deleteTaxConfigRate(rateId) {
  try {
    const response = await axiosInstance.delete(TAX_CONFIGS_ENDPOINTS.TAX_CONFIG_RATE_BY_ID(rateId));
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

