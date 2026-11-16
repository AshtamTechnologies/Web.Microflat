/**
 * NotificationsContext.jsx — Global context & real-time polling manager for
 * ERP notifications and queue tasks.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsService, myQueueService } from '../services';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [queueSummary, setQueueSummary] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    meetingsPending: 0,
    approvalsPending: 0,
  });

  const isMountedRef = useRef(true);

  // Fetch unread count & recent notifications
  const refreshNotifications = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.allSettled([
        notificationsService.getUnreadCount(),
        notificationsService.listNotifications({ pageNumber: 1, pageSize: 8 }),
      ]);

      if (!isMountedRef.current) return;

      if (countRes.status === 'fulfilled' && countRes.value) {
        const rawCount = countRes.value.unreadCount ?? countRes.value.count ?? 0;
        setUnreadCount(Number(rawCount) || 0);
      }

      if (listRes.status === 'fulfilled' && listRes.value?.items) {
        setRecentNotifications(listRes.value.items);
      }
    } catch (err) {
      console.warn('Failed to refresh notifications:', err);
    }
  }, []);

  // Fetch queue summary for badge counters
  const refreshQueueSummary = useCallback(async () => {
    try {
      const summary = await myQueueService.getQueueSummary();
      if (!isMountedRef.current) return;
      if (summary) {
        setQueueSummary(summary);
      }
    } catch (err) {
      console.warn('Failed to refresh queue summary:', err);
    }
  }, []);

  // Mark single notification read
  const markAsRead = useCallback(
    async (id) => {
      try {
        await notificationsService.markAsRead(id);
        if (!isMountedRef.current) return;
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true, readOn: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    },
    []
  );

  // Mark all notifications read
  const markAllAsRead = useCallback(async () => {
    try {
      setLoading(true);
      await notificationsService.markAllAsRead();
      if (!isMountedRef.current) return;
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readOn: n.readOn || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  // Drawer / Dropdown toggle controls
  const openDropdown = useCallback(() => setIsDrawerOpen(true), []);
  const closeDropdown = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDropdown = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  // Initial load and 30-second heartbeat polling for simulated real-time updates
  useEffect(() => {
    isMountedRef.current = true;
    refreshNotifications();
    refreshQueueSummary();

    const intervalId = setInterval(() => {
      refreshNotifications();
      refreshQueueSummary();
    }, 30000); // 30s light heartbeat

    const handleWindowFocus = () => {
      refreshNotifications();
      refreshQueueSummary();
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('mf-refresh-notifications', refreshNotifications);
    window.addEventListener('mf-refresh-queue', refreshQueueSummary);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('mf-refresh-notifications', refreshNotifications);
      window.removeEventListener('mf-refresh-queue', refreshQueueSummary);
    };
  }, [refreshNotifications, refreshQueueSummary]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        queueSummary,
        loading,
        isDrawerOpen,
        openDrawer: openDropdown,
        closeDrawer: closeDropdown,
        toggleDrawer: toggleDropdown,
        isDropdownOpen: isDrawerOpen,
        openDropdown,
        closeDropdown,
        toggleDropdown,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        refreshQueueSummary,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

