/**
 * src/services/notificationSetup/notificationSetupService.js
 * Real API service for Notification Events and Rules with automatic fallback to mock.
 * Conforms to Section 5 of Notification-WorkQueue-API.md.
 */

import { axiosInstance } from '../../axiosConfig/axiosInstance';
import { NOTIFICATION_SETUP_ENDPOINTS } from './notificationSetupEndpoints';
import { normalizeApiError } from '../../utils/apiError';
import * as mockNotificationSetup from './notificationSetupService.mock';

/* ── Lookups ── */
export async function getLookups() {
  try {
    const response = await axiosInstance.get(NOTIFICATION_SETUP_ENDPOINTS.LOOKUPS);
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      console.warn('Real Notification Lookups API unavailable, falling back to mock:', error.message);
      return mockNotificationSetup.getLookups();
    }
    throw normalizeApiError(error);
  }
}

/* ── Events ── */
export async function listEvents(params = {}) {
  try {
    const query = {};
    if (params.moduleId) query.moduleId = params.moduleId;
    if (params.moduleCode) query.moduleCode = params.moduleCode;
    if (params.isActive !== undefined && params.isActive !== '' && params.isActive !== 'ALL') {
      query.isActive = params.isActive;
    }
    if (params.search) query.search = params.search;

    const response = await axiosInstance.get(NOTIFICATION_SETUP_ENDPOINTS.EVENTS, { params: query });
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      console.warn('Real Notification Events API unavailable, falling back to mock:', error.message);
      return mockNotificationSetup.listEvents(params);
    }
    throw normalizeApiError(error);
  }
}

export async function getEvent(id) {
  try {
    const response = await axiosInstance.get(NOTIFICATION_SETUP_ENDPOINTS.EVENT_BY_ID(id));
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.getEvent(id);
    }
    throw normalizeApiError(error);
  }
}

export async function createEvent(data) {
  try {
    const response = await axiosInstance.post(NOTIFICATION_SETUP_ENDPOINTS.EVENTS, data);
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.createEvent(data);
    }
    throw normalizeApiError(error);
  }
}

export async function updateEvent(id, data) {
  try {
    const response = await axiosInstance.put(NOTIFICATION_SETUP_ENDPOINTS.EVENT_BY_ID(id), data);
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.updateEvent(id, data);
    }
    throw normalizeApiError(error);
  }
}

export async function deleteEvent(id) {
  try {
    const response = await axiosInstance.delete(NOTIFICATION_SETUP_ENDPOINTS.EVENT_BY_ID(id));
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.deleteEvent(id);
    }
    throw normalizeApiError(error);
  }
}

export async function toggleEventStatus(id, isActive) {
  return updateEvent(id, { isActive });
}

/* ── Rules ── */
export async function listRules(params = {}) {
  try {
    const query = {};
    if (params.notificationEventId) query.notificationEventId = params.notificationEventId;
    if (params.moduleId) query.moduleId = params.moduleId;
    if (params.moduleCode) query.moduleCode = params.moduleCode;
    if (params.isActive !== undefined && params.isActive !== '' && params.isActive !== 'ALL') {
      query.isActive = params.isActive;
    }
    if (params.search) query.search = params.search;

    const response = await axiosInstance.get(NOTIFICATION_SETUP_ENDPOINTS.RULES, { params: query });
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      console.warn('Real Notification Rules API unavailable, falling back to mock:', error.message);
      return mockNotificationSetup.listRules(params);
    }
    throw normalizeApiError(error);
  }
}

export async function getRule(id) {
  try {
    const response = await axiosInstance.get(NOTIFICATION_SETUP_ENDPOINTS.RULE_BY_ID(id));
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.getRule(id);
    }
    throw normalizeApiError(error);
  }
}

export async function createRule(data) {
  try {
    const response = await axiosInstance.post(NOTIFICATION_SETUP_ENDPOINTS.RULES, data);
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.createRule(data);
    }
    throw normalizeApiError(error);
  }
}

export async function updateRule(id, data) {
  try {
    const response = await axiosInstance.put(NOTIFICATION_SETUP_ENDPOINTS.RULE_BY_ID(id), data);
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.updateRule(id, data);
    }
    throw normalizeApiError(error);
  }
}

export async function deleteRule(id) {
  try {
    const response = await axiosInstance.delete(NOTIFICATION_SETUP_ENDPOINTS.RULE_BY_ID(id));
    return response.data;
  } catch (error) {
    if (!error.response || error.response.status === 404 || error.response.status === 502) {
      return mockNotificationSetup.deleteRule(id);
    }
    throw normalizeApiError(error);
  }
}

export async function toggleRuleStatus(id, isActive) {
  return updateRule(id, { isActive });
}
