/**
 * src/services/paymentTerms/paymentTermService.js — Real Payment Terms service calling backend endpoints.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { PAYMENT_TERMS_ENDPOINTS } from './paymentTermsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  paymentTermFromApi,
  paymentTermsFromApi,
  paymentTermToApiCreate,
  paymentTermToApiUpdate,
  paymentTermStatusToApi,
} from '../../models/paymentTerms/paymentTermModel';

/**
 * Returns all payment terms in display order, optionally filtered by code/name search and status.
 * GET /api/payment-terms
 * @param {{ search?: string, Search?: string, isActive?: boolean|string, IsActive?: boolean|string }} [params]
 * @returns {Promise<import('../../models/paymentTerms/paymentTermModel').PaymentTermModel[]>}
 */
export async function listPaymentTerms(params = {}) {
  try {
    const query = {};
    const act = params.isActive ?? params.IsActive;
    if (act !== undefined && act !== null && act !== '' && act !== 'ALL') {
      query.IsActive = typeof act === 'boolean' ? act : act === 'true' || act === 'ACTIVE';
    }

    const search = params.search ?? params.Search;
    if (search && String(search).trim()) {
      query.Search = String(search).trim();
    }

    const response = await axiosInstance.get(PAYMENT_TERMS_ENDPOINTS.PAYMENT_TERMS, {
      params: query,
    });
    return paymentTermsFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Returns a single payment term by ID (used for View and Edit data fetch).
 * GET /api/payment-terms/{id}
 * @param {number|string} id
 * @returns {Promise<import('../../models/paymentTerms/paymentTermModel').PaymentTermModel>}
 */
export async function getPaymentTerm(id) {
  try {
    const response = await axiosInstance.get(PAYMENT_TERMS_ENDPOINTS.PAYMENT_TERM_BY_ID(id));
    return paymentTermFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Creates a new payment term.
 * POST /api/payment-terms
 * @param {{ termCode: string, termName: string, displayOrder: number, description: string }} data
 * @returns {Promise<import('../../models/paymentTerms/paymentTermModel').PaymentTermModel>}
 */
export async function createPaymentTerm(data) {
  try {
    const payload = paymentTermToApiCreate(data);
    const response = await axiosInstance.post(PAYMENT_TERMS_ENDPOINTS.PAYMENT_TERMS, payload);
    return paymentTermFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates an existing payment term by ID.
 * PUT /api/payment-terms/{id}
 * @param {number|string} id
 * @param {{ termCode: string, termName: string, displayOrder: number, description: string }} data
 * @returns {Promise<import('../../models/paymentTerms/paymentTermModel').PaymentTermModel>}
 */
export async function updatePaymentTerm(id, data) {
  try {
    const payload = paymentTermToApiUpdate(data);
    const response = await axiosInstance.put(PAYMENT_TERMS_ENDPOINTS.PAYMENT_TERM_BY_ID(id), payload);
    return paymentTermFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * Updates the active status of a payment term.
 * PATCH /api/payment-terms/{id}/status
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
export async function updatePaymentTermStatus(id, isActive) {
  try {
    const payload = paymentTermStatusToApi(isActive);
    const response = await axiosInstance.patch(PAYMENT_TERMS_ENDPOINTS.PAYMENT_TERM_STATUS(id), payload);
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
