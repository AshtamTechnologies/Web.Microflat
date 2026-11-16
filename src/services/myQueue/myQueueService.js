/**
 * myQueueService.js — Real API service for My Queue.
 * Conforms to Section 5.4i of Frontend-API-Guide.md.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { MY_QUEUE_ENDPOINTS } from './myQueueEndpoints';
import { normalizeApiError } from '../../utils/apiError';

export async function listQueue(params = {}) {
  try {
    const query = {};
    if (params.search || params.Search) query.search = params.search || params.Search;
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.itemType && params.itemType !== 'ALL') query.itemType = params.itemType;
    if (params.includeUpcoming !== undefined) query.includeUpcoming = params.includeUpcoming;
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    const response = await axiosInstance.get(MY_QUEUE_ENDPOINTS.QUEUE, { params: query });
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        totalCount: data.length,
        pageNumber: params.pageNumber || 1,
        pageSize: params.pageSize || 10,
        totalPages: Math.ceil(data.length / (params.pageSize || 10)) || 1,
      };
    }
    return {
      items: data?.items || [],
      totalCount: data?.totalCount ?? (data?.items || []).length,
      pageNumber: data?.pageNumber || params.pageNumber || 1,
      pageSize: data?.pageSize || params.pageSize || 10,
      totalPages: data?.totalPages || 1,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 };
    }
    throw normalizeApiError(error);
  }
}

export async function getQueueSummary() {
  try {
    const response = await axiosInstance.get(MY_QUEUE_ENDPOINTS.SUMMARY);
    return (
      response.data || {
        total: 0,
        pending: 0,
        completed: 0,
        meetingsPending: 0,
        approvalsPending: 0,
      }
    );
  } catch (error) {
    if (error.response?.status === 404) {
      return { total: 0, pending: 0, completed: 0, meetingsPending: 0, approvalsPending: 0 };
    }
    throw normalizeApiError(error);
  }
}

export async function getQueueItem(id) {
  try {
    const response = await axiosInstance.get(MY_QUEUE_ENDPOINTS.QUEUE_ITEM(id));
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function completeQueueItem(id, payload = {}) {
  try {
    const response = await axiosInstance.patch(MY_QUEUE_ENDPOINTS.COMPLETE(id), payload);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
