/**
 * useDelegations.js — Encapsulates delegation listing, tab switching, counts and status sorting.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listDelegations } from '../../../services/delegation/delegationService';
import { getDelegationStatus } from '../../../utils/delegationUtils';
import { getTodayISO } from '../../../utils/dateUtils';
import { useAuthContext } from '../../../context/AuthContext';
import { getUserName } from '../../../context/UsersContext';

const STATUS_SORT_ORDER = {
  Active: 1,
  Scheduled: 2,
  Ended: 3,
  Cancelled: 4,
};

/**
 * Custom hook to manage delegation lists, counts, and active tab state.
 *
 * @returns {object}
 */
export function useDelegations() {
  const { user } = useAuthContext();
  const currentUserId = user?.id || user?.userId || 'u1';

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'received' ? 'received' : 'given';

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [givenItems, setGivenItems] = useState([]);
  const [receivedItems, setReceivedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setTab = useCallback(
    (nextTab) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextTab === 'received') {
          next.set('tab', 'received');
        } else {
          next.delete('tab');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [givenRes, receivedRes] = await Promise.all([
        listDelegations({
          direction: 'given',
          currentUserId,
          includeEnded: true,
        }),
        listDelegations({
          direction: 'received',
          currentUserId,
          includeEnded: true,
        }),
      ]);
      setGivenItems(givenRes);
      setReceivedItems(receivedRes);
    } catch (err) {
      setError(err?.message || 'Failed to load delegations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filter and Sort: Status filter, Search, Priority (Active -> Scheduled -> Ended -> Cancelled), then newest
  const sortedDelegations = useMemo(() => {
    const rawList = activeTab === 'received' ? receivedItems : givenItems;
    const today = getTodayISO();

    let list = [...rawList];

    // Filter by status dropdown
    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter(
        (d) => getDelegationStatus(d, today).toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Filter by search text
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => {
        const otherUserId = activeTab === 'received' ? d.delegatorId : d.delegateId;
        const colleagueName = getUserName(otherUserId).toLowerCase();
        const page = (d.approvalPageLabel || '').toLowerCase();
        const reason = (d.reason || '').toLowerCase();
        const note = (d.note || '').toLowerCase();
        return (
          colleagueName.includes(q) ||
          page.includes(q) ||
          reason.includes(q) ||
          note.includes(q)
        );
      });
    }

    return list.sort((a, b) => {
      const statusA = getDelegationStatus(a, today);
      const statusB = getDelegationStatus(b, today);
      const priorityDiff = (STATUS_SORT_ORDER[statusA] || 99) - (STATUS_SORT_ORDER[statusB] || 99);
      if (priorityDiff !== 0) return priorityDiff;

      const dateA = new Date(a.createdAt || a.fromDate).getTime();
      const dateB = new Date(b.createdAt || b.fromDate).getTime();
      return dateB - dateA;
    });
  }, [activeTab, givenItems, receivedItems, statusFilter, search]);

  const counts = useMemo(
    () => ({
      given: givenItems.length,
      received: receivedItems.length,
    }),
    [givenItems.length, receivedItems.length]
  );

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== 'ALL');

  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
  }, []);

  return {
    activeTab,
    setTab,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    hasActiveFilters,
    resetFilters,
    delegations: sortedDelegations,
    counts,
    loading,
    error,
    refresh: fetchAll,
  };
}

