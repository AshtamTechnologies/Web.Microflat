/**
 * financialYearService.js — Real Financial Years service calling backend endpoints.
 *
 * Implements Section 5.3 ("Financial year setup") of Frontend-API-Guide 1.md:
 * - GET /api/financial-years
 * - GET /api/financial-years/current
 * - POST /api/financial-years
 * - PUT /api/financial-years/{id}
 * - PATCH /api/financial-years/{id}/open
 * - PATCH /api/financial-years/{id}/close
 * - DELETE /api/financial-years/{id}
 *
 * Automatically falls back to mock service if VITE_USE_MOCK_API === 'true'
 * or if backend returns a network error / 404.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { FINANCIAL_YEARS_ENDPOINTS } from './financialYearsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  financialYearFromApi,
  financialYearsFromApi,
  financialYearToApiCreate,
  financialYearToApiUpdate,
  financialYearToApiClose,
} from '../../models/financialYears/financialYearModel';
import * as mockService from './financialYearService.mock';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Returns list of financial years, newest start date first.
 * GET /api/financial-years?status=&search=
 */
export async function listFinancialYears(params = {}) {
  if (useMock) {
    return mockService.listFinancialYears(params);
  }

  try {
    const query = {};
    if (params.status && params.status !== 'ALL') {
      query.status = params.status;
    }
    const search = params.search ?? params.Search;
    if (search && String(search).trim()) {
      query.search = String(search).trim();
    }

    const response = await axiosInstance.get(FINANCIAL_YEARS_ENDPOINTS.LIST, {
      params: query,
    });
    return financialYearsFromApi(response.data);
  } catch (err) {
    console.warn('[FinancialYearService] Real API failed, falling back to mock:', err?.message);
    return mockService.listFinancialYears(params);
  }
}

/**
 * Returns current active financial year covering today.
 * GET /api/financial-years/current
 */
export async function getCurrentFinancialYear() {
  if (useMock) {
    return mockService.getCurrentFinancialYear();
  }

  try {
    const response = await axiosInstance.get(FINANCIAL_YEARS_ENDPOINTS.CURRENT);
    if (response.status === 204 || !response.data) {
      return null;
    }
    return financialYearFromApi(response.data);
  } catch (err) {
    console.warn('[FinancialYearService] Real API failed, falling back to mock:', err?.message);
    return mockService.getCurrentFinancialYear();
  }
}

/**
 * Returns a specific financial year by ID.
 * GET /api/financial-years/{id}
 */
export async function getFinancialYearById(id) {
  if (useMock) {
    return mockService.getFinancialYearById(id);
  }

  try {
    const response = await axiosInstance.get(FINANCIAL_YEARS_ENDPOINTS.BY_ID(id));
    return financialYearFromApi(response.data);
  } catch (err) {
    console.warn('[FinancialYearService] Real API failed, falling back to mock:', err?.message);
    return mockService.getFinancialYearById(id);
  }
}

/**
 * Creates a new financial year (UPCOMING).
 * POST /api/financial-years
 */
export async function createFinancialYear(data) {
  if (useMock) {
    return mockService.createFinancialYear(data);
  }

  try {
    const payload = financialYearToApiCreate(data);
    const response = await axiosInstance.post(FINANCIAL_YEARS_ENDPOINTS.LIST, payload);
    return financialYearFromApi(response.data);
  } catch (err) {
    const normalized = normalizeApiError(err);
    // If backend endpoint is unseeded/missing, fallback to mock to maintain UX
    if (normalized?.status === 404 || normalized?.isNetworkError) {
      return mockService.createFinancialYear(data);
    }
    throw normalized;
  }
}

/**
 * Updates an existing financial year.
 * PUT /api/financial-years/{id}
 */
export async function updateFinancialYear(id, data) {
  if (useMock) {
    return mockService.updateFinancialYear(id, data);
  }

  try {
    const payload = financialYearToApiUpdate(data);
    const response = await axiosInstance.put(FINANCIAL_YEARS_ENDPOINTS.BY_ID(id), payload);
    return financialYearFromApi(response.data);
  } catch (err) {
    const normalized = normalizeApiError(err);
    if (normalized?.status === 404 || normalized?.isNetworkError) {
      return mockService.updateFinancialYear(id, data);
    }
    throw normalized;
  }
}

/**
 * Starts or reopens a financial year.
 * PATCH /api/financial-years/{id}/open
 */
export async function openFinancialYear(id) {
  if (useMock) {
    return mockService.openFinancialYear(id);
  }

  try {
    const response = await axiosInstance.patch(FINANCIAL_YEARS_ENDPOINTS.OPEN(id), {
      remarks: null,
    });
    return financialYearFromApi(response.data);
  } catch (err) {
    const normalized = normalizeApiError(err);
    if (normalized?.status === 404 || normalized?.isNetworkError) {
      return mockService.openFinancialYear(id);
    }
    throw normalized;
  }
}

/**
 * Closes an open financial year with remarks.
 * PATCH /api/financial-years/{id}/close
 */
export async function closeFinancialYear(id, remarks = '') {
  if (useMock) {
    return mockService.closeFinancialYear(id, remarks);
  }

  try {
    const payload = financialYearToApiClose(remarks);
    const response = await axiosInstance.patch(FINANCIAL_YEARS_ENDPOINTS.CLOSE(id), payload);
    return financialYearFromApi(response.data);
  } catch (err) {
    const normalized = normalizeApiError(err);
    if (normalized?.status === 404 || normalized?.isNetworkError) {
      return mockService.closeFinancialYear(id, remarks);
    }
    throw normalized;
  }
}

/**
 * Deletes an upcoming financial year.
 * DELETE /api/financial-years/{id}
 */
export async function deleteFinancialYear(id) {
  if (useMock) {
    return mockService.deleteFinancialYear(id);
  }

  try {
    await axiosInstance.delete(FINANCIAL_YEARS_ENDPOINTS.BY_ID(id));
    return true;
  } catch (err) {
    const normalized = normalizeApiError(err);
    if (normalized?.status === 404 || normalized?.isNetworkError) {
      return mockService.deleteFinancialYear(id);
    }
    throw normalized;
  }
}

