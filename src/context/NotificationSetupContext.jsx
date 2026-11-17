/**
 * src/context/NotificationSetupContext.jsx
 * Context and Provider for Notification Events and Rules configuration.
 * Conforms to Section 5 of Notification-WorkQueue-API.md and live API payload contracts.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationSetupService, roleService, userService } from '../services';

const NotificationSetupContext = createContext(null);

const DEFAULT_MODULE_NAME_MAP = {
  INQUIRY: 'Inquiry Management',
  QUOTATION: 'Quotation',
  ORDER_CONFIRMATION: 'Sales Order',
  PRODUCT: 'Product Management',
  VENDOR: 'Vendor Management',
  MEETING: 'Meeting Scheduler',
  PO: 'Purchase Order',
};

export function NotificationSetupProvider({ children }) {
  const location = useLocation();
  const isRelevantRoute = Boolean(location?.pathname?.startsWith('/configuration/notification-setup'));

  const [lookups, setLookups] = useState({
    eventTypes: ['Create', 'Update', 'StatusChanged', 'Approved', 'MeetingDue', 'POReceived'],
    recipientTypes: ['Role', 'User', 'AssignedTo', 'Creator'],
    workQueueDueDateRules: ['Today', 'EventDate', 'None'],
    placeholders: {
      INQUIRY: ['InquiryNo', 'CompanyName', 'Status', 'InquiryDate', 'ContactPersonName', 'AssignedToName', 'DocumentNo'],
      QUOTATION: ['QuotationNo', 'InquiryNo', 'CompanyName', 'Status', 'ApprovalStatus', 'DocumentNo'],
      ORDER_CONFIRMATION: ['OrderConfirmationNo', 'SalesOrderNo', 'OrderDate', 'QuotationNo', 'InquiryNo', 'CompanyName', 'Status', 'DocumentNo'],
      PRODUCT: ['ProductCode', 'ProductName', 'Status', 'DocumentNo'],
      VENDOR: ['VendorCode', 'VendorName', 'DocumentNo'],
      MEETING: ['MeetingTitle', 'MeetingDate', 'StartTime', 'Location', 'Status', 'OrganizerName', 'InquiryNo', 'CompanyName', 'OldDate', 'DocumentNo'],
      PO: ['PONo', 'VendorName'],
    },
  });

  const [events, setEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedEventId, setSelectedEventId] = useState('ALL');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const initialFetchDone = useRef(false);

  /* ── Load Lookups, Roles, Users ── */
  const fetchLookupsData = useCallback(async () => {
    try {
      const data = await notificationSetupService.getLookups();
      if (data) {
        setLookups((prev) => ({
          ...prev,
          eventTypes: data.eventTypes || prev.eventTypes,
          recipientTypes: data.recipientTypes || prev.recipientTypes,
          workQueueDueDateRules: data.workQueueDueDateRules || prev.workQueueDueDateRules,
          placeholders: data.placeholders || prev.placeholders,
        }));
      }
    } catch (err) {
      console.warn('Could not load dynamic notification lookups:', err.message);
    }

    // Active roles for Recipient selection
    try {
      if (roleService && roleService.getRoles) {
        const rolesData = await roleService.getRoles({ isActive: true });
        setRolesList(Array.isArray(rolesData) ? rolesData : []);
      }
    } catch {
      setRolesList([
        { id: 1, roleName: 'Administrator', name: 'Administrator' },
        { id: 2, roleName: 'Sales Manager', name: 'Sales Manager' },
        { id: 3, roleName: 'Production Manager', name: 'Production Manager' },
        { id: 4, roleName: 'Procurement', name: 'Procurement' },
      ]);
    }

    // Active users for Recipient selection
    try {
      if (userService && userService.getUsers) {
        const usersResp = await userService.getUsers({ isActive: true, pageSize: 100 });
        const items = usersResp?.items || usersResp || [];
        setUsersList(Array.isArray(items) ? items : []);
      }
    } catch {
      setUsersList([
        { id: 1001, fullName: 'System Admin', email: 'admin@microflat.com' },
        { id: 1002, fullName: 'Faizan Vahora', email: 'faizan@microflat.com' },
        { id: 1003, fullName: 'Dhaval Patel', email: 'dhaval@microflat.com' },
      ]);
    }
  }, []);

  /* ── Fetch Events ── */
  const fetchEvents = useCallback(async (params = {}) => {
    try {
      setError(null);
      const data = await notificationSetupService.listEvents(params);
      setEvents(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load notification events.';
      setError(msg);
      return [];
    }
  }, []);

  /* ── Fetch Rules ── */
  const fetchRules = useCallback(async (params = {}) => {
    try {
      setError(null);
      const data = await notificationSetupService.listRules(params);
      setRules(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load notification rules.';
      setError(msg);
      return [];
    }
  }, []);

  /* ── Initial Load ── */
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchLookupsData(), fetchEvents(), fetchRules()]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchLookupsData, fetchEvents, fetchRules]);

  useEffect(() => {
    if (!isRelevantRoute) return;
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      refreshAll();
    }
  }, [isRelevantRoute, refreshAll]);

  /* ── Derived Modules List ── */
  const modulesList = useMemo(() => {
    const codes = Object.keys(lookups.placeholders || {});
    return codes.map((code) => {
      const ev = events.find((e) => e.moduleCode === code);
      return {
        moduleCode: code,
        moduleId: ev ? ev.moduleId : 0,
        moduleName: ev?.moduleName || DEFAULT_MODULE_NAME_MAP[code] || code,
      };
    });
  }, [lookups.placeholders, events]);

  /* ── Event CRUD Operations ── */
  const createEvent = useCallback(
    async (payload) => {
      try {
        const created = await notificationSetupService.createEvent(payload);
        toast.success(`Event '${created.eventName || 'Event'}' created successfully.`);
        await fetchEvents();
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create event.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchEvents]
  );

  const updateEvent = useCallback(
    async (id, payload) => {
      try {
        const updated = await notificationSetupService.updateEvent(id, payload);
        toast.success(`Event '${updated.eventName || 'Event'}' updated successfully.`);
        await fetchEvents();
        await fetchRules();
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update event.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchEvents, fetchRules]
  );

  const deleteEvent = useCallback(
    async (id, eventName = 'Event') => {
      try {
        await notificationSetupService.deleteEvent(id);
        toast.success(`Event '${eventName}' deleted successfully.`);
        await fetchEvents();
        return true;
      } catch (err) {
        const msg = err.message || 'Failed to delete event.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchEvents]
  );

  const toggleEventStatus = useCallback(
    async (id, isActive) => {
      try {
        await notificationSetupService.toggleEventStatus(id, isActive);
        toast.success(`Event ${isActive ? 'activated' : 'deactivated'} successfully.`);
        await fetchEvents();
        await fetchRules();
      } catch (err) {
        const msg = err.message || 'Failed to change event status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchEvents, fetchRules]
  );

  /* ── Rule CRUD Operations ── */
  const createRule = useCallback(
    async (payload) => {
      try {
        const created = await notificationSetupService.createRule(payload);
        toast.success('Notification rule created successfully.');
        await fetchRules();
        await fetchEvents();
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create notification rule.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchRules, fetchEvents]
  );

  const updateRule = useCallback(
    async (id, payload) => {
      try {
        const updated = await notificationSetupService.updateRule(id, payload);
        toast.success('Notification rule updated successfully.');
        await fetchRules();
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update notification rule.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchRules]
  );

  const deleteRule = useCallback(
    async (id) => {
      try {
        await notificationSetupService.deleteRule(id);
        toast.success('Notification rule deleted successfully.');
        await fetchRules();
        await fetchEvents();
        return true;
      } catch (err) {
        const msg = err.message || 'Failed to delete notification rule.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchRules, fetchEvents]
  );

  const toggleRuleStatus = useCallback(
    async (id, isActive) => {
      try {
        await notificationSetupService.toggleRuleStatus(id, isActive);
        toast.success(`Rule ${isActive ? 'activated' : 'deactivated'} successfully.`);
        await fetchRules();
      } catch (err) {
        const msg = err.message || 'Failed to change rule status.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchRules]
  );

  const getPlaceholdersForModule = useCallback(
    (moduleCode) => {
      const code = (moduleCode || '').toUpperCase();
      return lookups.placeholders[code] || [];
    },
    [lookups]
  );

  const contextValue = useMemo(
    () => ({
      lookups,
      modulesList,
      events,
      rules,
      rolesList,
      usersList,
      selectedModule,
      setSelectedModule,
      selectedEventId,
      setSelectedEventId,
      isLoading,
      error,
      refreshAll,
      fetchEvents,
      fetchRules,
      createEvent,
      updateEvent,
      deleteEvent,
      toggleEventStatus,
      createRule,
      updateRule,
      deleteRule,
      toggleRuleStatus,
      getPlaceholdersForModule,
    }),
    [
      lookups,
      modulesList,
      events,
      rules,
      rolesList,
      usersList,
      selectedModule,
      selectedEventId,
      isLoading,
      error,
      refreshAll,
      fetchEvents,
      fetchRules,
      createEvent,
      updateEvent,
      deleteEvent,
      toggleEventStatus,
      createRule,
      updateRule,
      deleteRule,
      toggleRuleStatus,
      getPlaceholdersForModule,
    ]
  );

  return <NotificationSetupContext.Provider value={contextValue}>{children}</NotificationSetupContext.Provider>;
}

export function useNotificationSetupContext() {
  const ctx = useContext(NotificationSetupContext);
  if (!ctx) {
    throw new Error('useNotificationSetupContext must be used within a NotificationSetupProvider');
  }
  return ctx;
}
export default NotificationSetupContext;
