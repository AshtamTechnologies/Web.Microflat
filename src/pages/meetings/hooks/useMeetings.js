/**
 * useMeetings.js — Hook managing list state, filtering, tab counters, and status updates.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMeetings,
  getMeetingCounts,
  changeMeetingStatus,
} from '../../../services/meetings/meetingsService';
import { useAuthContext } from '../../../context/AuthContext';

export function useMeetings() {
  const { user } = useAuthContext();
  const currentUserId = user?.id || user?.userId || 'u1';
  const currentUserEmail = user?.email || '';
  const currentUserName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [meetings, setMeetings] = useState([]);
  const [counts, setCounts] = useState({ all: 0, mine: 0, scheduled: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, countsData] = await Promise.all([
        getMeetings({
          search,
          status: statusFilter,
          meetingType: meetingTypeFilter,
          fromDate,
          toDate,
          tab: activeTab,
          mine: activeTab === 'mine',
          currentUserId,
          currentUserEmail,
          currentUserName,
        }),
        getMeetingCounts(currentUserId, currentUserEmail, currentUserName),
      ]);
      setMeetings(list);
      setCounts(countsData);
    } catch (err) {
      setError(err?.message || 'Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, meetingTypeFilter, fromDate, toDate, activeTab, currentUserId, currentUserEmail, currentUserName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      statusFilter !== 'ALL' ||
      meetingTypeFilter !== 'ALL' ||
      Boolean(fromDate) ||
      Boolean(toDate)
    );
  }, [search, statusFilter, meetingTypeFilter, fromDate, toDate]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setMeetingTypeFilter('ALL');
    setFromDate('');
    setToDate('');
  }, []);

  const handleComplete = useCallback(
    async (id, remarks) => {
      await changeMeetingStatus(id, { status: 'Completed', remarks });
      await loadData();
    },
    [loadData]
  );

  const handleCancel = useCallback(
    async (id, remarks) => {
      await changeMeetingStatus(id, { status: 'Cancelled', remarks });
      await loadData();
    },
    [loadData]
  );

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    meetingTypeFilter,
    setMeetingTypeFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    meetings,
    counts,
    loading,
    error,
    hasActiveFilters,
    resetFilters,
    refresh: loadData,
    handleComplete,
    handleCancel,
  };
}

