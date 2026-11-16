/**
 * notificationsService.js — Real API service for Notifications.
 * Conforms to Section 5.4i of Frontend-API-Guide.md.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { NOTIFICATIONS_ENDPOINTS } from './notificationsEndpoints';
import { normalizeApiError } from '../../utils/apiError';

export async function listNotifications(params = {}) {
  try {
    const query = {};
    if (params.search || params.Search) query.search = params.search || params.Search;
    if (params.isRead !== undefined && params.isRead !== '' && params.isRead !== 'ALL') {
      query.isRead = params.isRead;
    }
    if (params.notificationType && params.notificationType !== 'ALL') {
      query.notificationType = params.notificationType;
    }
    if (params.pageNumber) query.pageNumber = params.pageNumber;
    if (params.pageSize) query.pageSize = params.pageSize;

    const response = await axiosInstance.get(NOTIFICATIONS_ENDPOINTS.NOTIFICATIONS, { params: query });
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

export async function getUnreadCount() {
  try {
    const response = await axiosInstance.get(NOTIFICATIONS_ENDPOINTS.UNREAD_COUNT);
    const data = response.data;
    const count = typeof data === 'number' ? data : (data?.unreadCount ?? data?.count ?? 0);
    return { unreadCount: Number(count) || 0, count: Number(count) || 0 };
  } catch (error) {
    if (error.response?.status === 404) {
      return { unreadCount: 0, count: 0 };
    }
    throw normalizeApiError(error);
  }
}

export async function markAsRead(id) {
  try {
    const response = await axiosInstance.patch(NOTIFICATIONS_ENDPOINTS.MARK_READ(id));
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function markAllAsRead() {
  try {
    const response = await axiosInstance.patch(NOTIFICATIONS_ENDPOINTS.MARK_ALL_READ);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
