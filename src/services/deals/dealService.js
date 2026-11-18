/**
 * src/services/deals/dealService.js — Real Deals API service.
 * Full implementation of the 13 Deal endpoints adhering to Deal-API-Guide.md.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { DEAL_ENDPOINTS } from './dealEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import {
  dealItemFromApi,
  dealDetailFromApi,
  negotiationFromApi,
  dealToApiCreate,
  dealToApiUpdate,
  negotiationToApi,
} from '../../models/deals/dealModel';

/**
 * 1. Paged list of deals with search, status, client, inquiry, and date range filters.
 * GET /api/deals
 */
export async function listDeals(params = {}) {
  try {
    const query = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.dealStatusId !== undefined && params.dealStatusId !== null && params.dealStatusId !== 'ALL') {
      query.dealStatusId = Number(params.dealStatusId);
    }
    if (params.inquiryId) query.inquiryId = Number(params.inquiryId);
    if (params.clientId) query.clientId = Number(params.clientId);
    if (params.fromDate) query.fromDate = params.fromDate;
    if (params.toDate) query.toDate = params.toDate;
    if (params.pageNumber !== undefined && params.pageNumber !== null) {
      query.pageNumber = Number(params.pageNumber);
    }
    if (params.pageSize !== undefined && params.pageSize !== null) {
      query.pageSize = Number(params.pageSize);
    }

    const response = await axiosInstance.get(DEAL_ENDPOINTS.DEALS, { params: query });
    const data = response.data || {};
    const items = Array.isArray(data.items)
      ? data.items.map(dealItemFromApi)
      : Array.isArray(data)
        ? data.map(dealItemFromApi)
        : [];

    const totalCount =
      data.totalCount ??
      data.total ??
      (response.headers?.['x-total-count'] ? Number(response.headers['x-total-count']) : undefined) ??
      items.length;
    const pageSize = Number(data.pageSize || params.pageSize || (items.length > 0 ? items.length : 20));
    const totalPages = Number(data.totalPages || (pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1));

    return {
      items,
      pageNumber: Number(data.pageNumber || params.pageNumber || 1),
      pageSize,
      totalCount,
      totalPages,
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 2. Dropdown lookups (statuses, currencies, defaultCurrencyId).
 * GET /api/deals/lookups
 */
export async function getDealLookups() {
  try {
    const response = await axiosInstance.get(DEAL_ENDPOINTS.LOOKUPS);
    return response.data || {
      statuses: [],
      currencies: [],
      defaultCurrencyId: 1,
    };
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 3. Preview next deal document number.
 * GET /api/deals/next-number?dealDate=...
 */
export async function getNextDealNumber(dealDate) {
  try {
    const params = dealDate ? { dealDate } : {};
    const response = await axiosInstance.get(DEAL_ENDPOINTS.NEXT_NUMBER, { params });
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 4. Prefill data for "Convert to Deal".
 * GET /api/deals/prefill?inquiryId=...
 */
export async function getDealPrefill(inquiryId) {
  try {
    const response = await axiosInstance.get(DEAL_ENDPOINTS.PREFILL, {
      params: { inquiryId: Number(inquiryId) },
    });
    return response.data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 5. Get full single deal details with negotiations & action flags.
 * GET /api/deals/{id}
 */
export async function getDealById(id) {
  try {
    const response = await axiosInstance.get(DEAL_ENDPOINTS.DEAL_BY_ID(id));
    return dealDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 6. Create deal (Convert inquiry to deal).
 * POST /api/deals
 */
export async function createDeal(formData) {
  try {
    const payload = dealToApiCreate(formData);
    const response = await axiosInstance.post(DEAL_ENDPOINTS.DEALS, payload);
    return dealDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 7. Edit deal details. Only allowed when deal is editable.
 * PUT /api/deals/{id}
 */
export async function updateDeal(id, formData) {
  try {
    const payload = dealToApiUpdate(formData);
    const response = await axiosInstance.put(DEAL_ENDPOINTS.DEAL_BY_ID(id), payload);
    return dealDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 8. Change deal status (Open, On Hold, Won, Lost).
 * PATCH /api/deals/{id}/status
 */
export async function changeDealStatus(id, dealStatusId, statusRemarks = '') {
  try {
    const payload = {
      dealStatusId: Number(dealStatusId),
      statusRemarks: statusRemarks ? String(statusRemarks).trim() : null,
    };
    const response = await axiosInstance.patch(DEAL_ENDPOINTS.STATUS(id), payload);
    return dealDetailFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 9. List negotiations of a deal.
 * GET /api/deals/{id}/negotiations
 */
export async function listDealNegotiations(dealId) {
  try {
    const response = await axiosInstance.get(DEAL_ENDPOINTS.NEGOTIATIONS(dealId));
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(negotiationFromApi);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 10. Add a negotiation entry.
 * POST /api/deals/{id}/negotiations
 */
export async function addDealNegotiation(dealId, formData) {
  try {
    const payload = negotiationToApi(formData);
    const response = await axiosInstance.post(DEAL_ENDPOINTS.NEGOTIATIONS(dealId), payload);
    return negotiationFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 11. Get one negotiation entry by id.
 * GET /api/deal-negotiations/{id}
 */
export async function getDealNegotiationById(id) {
  try {
    const response = await axiosInstance.get(DEAL_ENDPOINTS.NEGOTIATION_BY_ID(id));
    return negotiationFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 12. Edit a negotiation entry.
 * PUT /api/deal-negotiations/{id}
 */
export async function updateDealNegotiation(id, formData) {
  try {
    const payload = negotiationToApi(formData);
    const response = await axiosInstance.put(DEAL_ENDPOINTS.NEGOTIATION_BY_ID(id), payload);
    return negotiationFromApi(response.data);
  } catch (err) {
    throw normalizeApiError(err);
  }
}

/**
 * 13. Delete a negotiation entry (permanent).
 * DELETE /api/deal-negotiations/{id}
 */
export async function deleteDealNegotiation(id) {
  try {
    await axiosInstance.delete(DEAL_ENDPOINTS.NEGOTIATION_BY_ID(id));
    return true;
  } catch (err) {
    throw normalizeApiError(err);
  }
}
