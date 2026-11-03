/**
 * src/services/currencies/currenciesEndpoints.js — API endpoints for Currencies.
 */

export const CURRENCIES_ENDPOINTS = {
  CURRENCIES: '/api/currencies',
  CURRENCY_BY_ID: (id) => `/api/currencies/${id}`,
  CURRENCY_STATUS: (id) => `/api/currencies/${id}/status`,
};

