/**
 * src/services/currencies/currencyService.js — Real Currency service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { CURRENCIES_ENDPOINTS } from './currenciesEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  currencyFromApi,
  currenciesFromApi,
  currencyToApiCreate,
  currencyToApiUpdate,
  currencyStatusToApi,
} from '../../models/currencies/currencyModel';

export const capabilities = {
  search: true,
  filter: true,
  pagination: false,
  create: true,
  update: true,
  status: true,
};

/**
 * Returns all currencies, optionally filtered by Search and IsActive.
 * GET /api/currencies
 *
 * @param {{ search?: string, Search?: string, isActive?: boolean|string, IsActive?: boolean|string }} [params]
 * @returns {Promise<import('../../models/currencies/currencyModel').CurrencyModel[]>}
 */
export async function listCurrencies(params = {}) {
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

    const response = await axiosInstance.get(CURRENCIES_ENDPOINTS.CURRENCIES, {
      params: query,
    });
    return currenciesFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single currency by ID.
 * GET /api/currencies/{id}
 *
 * @param {number|string} id
 * @returns {Promise<import('../../models/currencies/currencyModel').CurrencyModel>}
 */
export async function getCurrency(id) {
  try {
    const response = await axiosInstance.get(CURRENCIES_ENDPOINTS.CURRENCY_BY_ID(id));
    return currencyFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new currency.
 * POST /api/currencies
 *
 * @param {{ currencyCode: string, currencyName: string, currencySymbol: string }} data
 * @returns {Promise<import('../../models/currencies/currencyModel').CurrencyModel>}
 */
export async function createCurrency(data) {
  try {
    const payload = currencyToApiCreate(data);
    const response = await axiosInstance.post(CURRENCIES_ENDPOINTS.CURRENCIES, payload);
    return currencyFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing currency.
 * PUT /api/currencies/{id}
 *
 * @param {number|string} id
 * @param {{ currencyCode: string, currencyName: string, currencySymbol: string }} data
 * @returns {Promise<import('../../models/currencies/currencyModel').CurrencyModel>}
 */
export async function updateCurrency(id, data) {
  try {
    const payload = currencyToApiUpdate(data);
    const response = await axiosInstance.put(CURRENCIES_ENDPOINTS.CURRENCY_BY_ID(id), payload);
    return currencyFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates currency active status.
 * PATCH /api/currencies/{id}/status
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<void>}
 */
export async function updateCurrencyStatus(id, isActive) {
  try {
    const payload = currencyStatusToApi(isActive);
    await axiosInstance.patch(CURRENCIES_ENDPOINTS.CURRENCY_STATUS(id), payload);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

