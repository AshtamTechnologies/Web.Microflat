/**
 * src/services/taxConfigs/taxConfigsEndpoints.js — API endpoints for Tax Configurations.
 */

export const TAX_CONFIGS_ENDPOINTS = {
  TAX_CONFIGS: '/api/tax-configs',
  TAX_CONFIG_BY_ID: (id) => `/api/tax-configs/${id}`,
  TAX_CONFIG_STATUS: (id) => `/api/tax-configs/${id}/status`,
  APPLICABLE_TAXES: '/api/tax-configs/applicable',
  TAX_CONFIG_RATES: (id) => `/api/tax-configs/${id}/rates`,
  TAX_CONFIG_RATE_BY_ID: (rateId) => `/api/tax-config-rates/${rateId}`,
};

