/**
 * useDelegations.js — Encapsulates delegation listing, tab switching, counts and status sorting.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listDelegations,
  listDelegatedToMe,
} from '../../../services/delegation/delegationService';
import { getDelegationStatus } from '../../../utils/delegationUtils';

const STATUS_SORT_ORDER = {
  InForce: 1,
  Upcoming: 2,
  Expired: 3,
  Cancelled: 4,
};

/**
 * Custom hook to manage delegation lists, counts, and active tab state.
 *
 * @returns {object}
 */
export function useDelegations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = rawTab === 'received' ? 'received' : 'given';

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [givenItems, setGivenItems] = useState([]);
  const [receivedItems, setReceivedItems] = useState([]);
  const [counts, setCounts] = useState({ given: 0, received: 0 });
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
      const filterParams = {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search.trim() || undefined,
        pageNumber: 1,
        pageSize: 50,
      };

      const [givenRes, receivedRes] = await Promise.all([
        listDelegations({ ...filterParams, mine: true }),
        listDelegatedToMe(filterParams),
      ]);

      setGivenItems(givenRes.items || []);
      setReceivedItems(receivedRes.items || []);
      setCounts({
        given: givenRes.totalCount ?? (givenRes.items?.length || 0),
        received: receivedRes.totalCount ?? (receivedRes.items?.length || 0),
      });
    } catch (err) {
      setError(err?.message || 'Failed to load delegations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const filterParams = {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: search.trim() || undefined,
          pageNumber: 1,
          pageSize: 50,
        };

        const [givenRes, receivedRes] = await Promise.all([
          listDelegations({ ...filterParams, mine: true }),
          listDelegatedToMe(filterParams),
        ]);

        if (!active) return;
        setGivenItems(givenRes.items || []);
        setReceivedItems(receivedRes.items || []);
        setCounts({
          given: givenRes.totalCount ?? (givenRes.items?.length || 0),
          received: receivedRes.totalCount ?? (receivedRes.items?.length || 0),
        });
      } catch (err) {
        if (active) {
          setError(err?.message || 'Failed to load delegations. Please try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [statusFilter, search]);

  const sortedDelegations = useMemo(() => {
    const rawList = activeTab === 'received' ? receivedItems : givenItems;
    return [...rawList].sort((a, b) => {
      const statusA = getDelegationStatus(a);
      const statusB = getDelegationStatus(b);
      const priorityDiff = (STATUS_SORT_ORDER[statusA] || 99) - (STATUS_SORT_ORDER[statusB] || 99);
      if (priorityDiff !== 0) return priorityDiff;

      const dateA = new Date(a.createdAt || a.startDate).getTime() || 0;
      const dateB = new Date(b.createdAt || b.startDate).getTime() || 0;
      return dateB - dateA;
    });
  }, [activeTab, givenItems, receivedItems]);

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
