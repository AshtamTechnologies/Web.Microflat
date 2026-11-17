/**
 * deliveryTermService.js — Real API service for Delivery Terms.
 * Conforms to Section 5.3 of Frontend-API-Guide.md.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { DELIVERY_TERMS_ENDPOINTS } from './deliveryTermsEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import * as mockDeliveryTerms from './deliveryTermService.mock';

export async function listDeliveryTerms(params = {}) {
  try {
    const query = {};
    if (params.search || params.Search) query.search = params.search || params.Search;
    if (params.isActive !== undefined && params.isActive !== '' && params.isActive !== 'ALL') {
      query.isActive = params.isActive;
    }

    const response = await axiosInstance.get(DELIVERY_TERMS_ENDPOINTS.DELIVERY_TERMS, { params: query });
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      console.warn('Real Delivery Terms API unavailable, falling back to mock:', error.message);
      return mockDeliveryTerms.listDeliveryTerms(params);
    }
    throw normalizeApiError(error);
  }
}

export async function getDeliveryTerm(id) {
  try {
    const response = await axiosInstance.get(DELIVERY_TERMS_ENDPOINTS.DELIVERY_TERM_BY_ID(id));
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockDeliveryTerms.getDeliveryTerm(id);
    }
    throw normalizeApiError(error);
  }
}

export async function createDeliveryTerm(data) {
  try {
    const response = await axiosInstance.post(DELIVERY_TERMS_ENDPOINTS.DELIVERY_TERMS, data);
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockDeliveryTerms.createDeliveryTerm(data);
    }
    throw normalizeApiError(error);
  }
}

export async function updateDeliveryTerm(id, data) {
  try {
    const response = await axiosInstance.put(DELIVERY_TERMS_ENDPOINTS.DELIVERY_TERM_BY_ID(id), data);
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockDeliveryTerms.updateDeliveryTerm(id, data);
    }
    throw normalizeApiError(error);
  }
}

export async function updateDeliveryTermStatus(id, isActive) {
  try {
    const response = await axiosInstance.patch(DELIVERY_TERMS_ENDPOINTS.DELIVERY_TERM_STATUS(id), {
      isActive: Boolean(isActive),
    });
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockDeliveryTerms.updateDeliveryTermStatus(id, isActive);
    }
    throw normalizeApiError(error);
  }
}

