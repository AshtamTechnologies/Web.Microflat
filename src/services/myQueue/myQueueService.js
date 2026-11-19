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

    // 1. Status (Pending default, Completed, Cancelled)
    const status = params.status || params.Status;
    if (status && status !== 'ALL') {
      query.Status = status;
    }

    // 2. ItemType (Meeting, Approval, Notification, FollowUp, etc.)
    const itemType = params.itemType || params.ItemType;
    if (itemType && itemType !== 'ALL') {
      query.ItemType = itemType;
    }

    // 3. View (Upcoming, All, etc.)
    const view = params.view || params.View;
    if (view && view !== '') {
      query.View = view.toLowerCase() === 'all' ? 'All' : view;
    }

    // 4. IncludeUpcoming (boolean)
    const includeUpcoming = params.includeUpcoming ?? params.IncludeUpcoming;
    if (includeUpcoming !== undefined && includeUpcoming !== null && includeUpcoming !== '') {
      query.IncludeUpcoming = includeUpcoming;
    }

    // 5. AssignedToUserId (Admin only)
    const assignedToUserId = params.assignedToUserId || params.AssignedToUserId;
    if (assignedToUserId) {
      query.AssignedToUserId = assignedToUserId;
    }

    // 6. Pagination (PageNumber & PageSize)
    const pageNumber = params.pageNumber || params.PageNumber || 1;
    const pageSize = params.pageSize || params.PageSize || 20;
    query.PageNumber = pageNumber;
    query.PageSize = pageSize;

    const response = await axiosInstance.get(MY_QUEUE_ENDPOINTS.QUEUE, { params: query });
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        items: data,
        totalCount: data.length,
        pageNumber,
        pageSize,
        totalPages: Math.ceil(data.length / pageSize) || 1,
      };
    }
    return {
      items: data?.items || [],
      totalCount: data?.totalCount ?? (data?.items || []).length,
      pageNumber: data?.pageNumber || pageNumber,
      pageSize: data?.pageSize || pageSize,
      totalPages: data?.totalPages || 1,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 1 };
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

export async function doneQueueItem(id) {
  try {
    // Prefer PUT /api/my-queue/{id}/done according to Section 3.4 of API guide
    const response = await axiosInstance.put(MY_QUEUE_ENDPOINTS.DONE(id));
    return response.data;
  } catch (error) {
    // Fallback to PATCH /api/my-queue/{id}/complete if PUT isn't supported
    if (error.response?.status === 404 || error.response?.status === 405) {
      const fallback = await axiosInstance.patch(MY_QUEUE_ENDPOINTS.COMPLETE(id));
      return fallback.data;
    }
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
