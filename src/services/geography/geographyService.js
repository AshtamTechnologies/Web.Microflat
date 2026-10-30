/**
 * src/services/geography/geographyService.js — Service for fetching live Countries and States.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { GEOGRAPHY_ENDPOINTS } from './geographyEndpoints';
import { normalizeApiError } from '../../utils/apiError';

/**
 * Returns active countries list.
 * GET /api/countries?IsActive=true
 * @param {{ isActive?: boolean }} [options]
 * @returns {Promise<Array<{ id: number, countryName: string, isActive: boolean, stateCount?: number }>>}
 */
export async function listCountries({ isActive = true } = {}) {
  try {
    const params = {};
    if (isActive !== undefined && isActive !== null) {
      params.IsActive = isActive;
    }
    const response = await axiosInstance.get(GEOGRAPHY_ENDPOINTS.COUNTRIES, { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns active states list for a given country.
 * GET /api/states?CountryId={countryId}&IsActive=true
 * @param {number|string} countryId
 * @param {{ isActive?: boolean }} [options]
 * @returns {Promise<Array<{ id: number, countryId: number, countryName: string, stateName: string, isActive: boolean }>>}
 */
export async function listStates(countryId, { isActive = true } = {}) {
  if (!countryId) return [];
  try {
    let numericCountryId = typeof countryId === 'number' ? countryId : parseInt(countryId, 10);
    if (isNaN(numericCountryId) || !numericCountryId) {
      const code = String(countryId).trim().toUpperCase();
      if (code === 'IN' || code === 'INDIA') numericCountryId = 2;
      else if (code === 'US' || code === 'USA') numericCountryId = 1;
      else return [];
    }

    const params = { CountryId: numericCountryId };
    if (isActive !== undefined && isActive !== null) {
      params.IsActive = isActive;
    }
    const response = await axiosInstance.get(GEOGRAPHY_ENDPOINTS.STATES, { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    throw normalizeApiError(err);
  }
}
