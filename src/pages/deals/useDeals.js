/**
 * src/pages/deals/useDeals.js — React hook for Deals business logic and state.
 * Direct live API integration without mock fallback data.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { dealService } from '../../services';

export function useDeals() {
  const location = useLocation();
  const [hasRequestedDeals, setHasRequestedDeals] = useState(false);
  const isDealsRoute = Boolean(
    location?.pathname?.startsWith('/deals') ||
    location?.pathname?.startsWith('/inquiries')
  );
  const shouldFetch = isDealsRoute || hasRequestedDeals;

  const ensureDealsLoaded = useCallback(() => {
    setHasRequestedDeals(true);
  }, []);

  const [deals, setDeals] = useState([]);
  const [lookups, setLookups] = useState({
    statuses: [],
    currencies: [],
    defaultCurrencyId: 1,
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  /* ── 300ms Debounce Search ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── Reset page to 1 on filter changes ── */
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPageNumber(1);
  }, [debouncedSearch, statusFilter, fromDate, toDate]);

  /* ── Load Lookups ── */
  const loadLookups = useCallback(async () => {
    try {
      const data = await dealService.getDealLookups();
      if (data) {
        setLookups({
          statuses: Array.isArray(data.statuses) ? data.statuses : [],
          currencies: Array.isArray(data.currencies) ? data.currencies : [],
          defaultCurrencyId: data.defaultCurrencyId || 1,
        });
      }
    } catch (err) {
      console.error('Could not load deal lookups from API:', err);
    }
  }, []);

  /* ── Load Deals List ── */
  const loadDeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await dealService.listDeals({
        search: debouncedSearch,
        dealStatusId: statusFilter !== 'ALL' ? statusFilter : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        pageNumber,
        pageSize,
      });

      if (res && Array.isArray(res.items)) {
        setDeals(res.items);
        setTotalCount(res.totalCount ?? res.items.length);
        setTotalPages(res.totalPages || Math.ceil((res.totalCount ?? res.items.length) / pageSize) || 1);
      } else {
        setDeals([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('API listDeals error:', err);
      toast.error(err?.message || 'Failed to load deals from server.');
      setDeals([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, fromDate, toDate, pageNumber, pageSize]);

  useEffect(() => {
    if (!shouldFetch) return;
    loadLookups();
  }, [shouldFetch, loadLookups]);

  useEffect(() => {
    if (!shouldFetch) return;
    loadDeals();
  }, [shouldFetch, loadDeals]);

  /* ── Reset Filters ── */
  const resetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setFromDate('');
    setToDate('');
    setPageNumber(1);
  }, []);

  /* ── Get single deal by ID ── */
  const fetchDealDetail = useCallback(async (id) => {
    try {
      const deal = await dealService.getDealById(id);
      return deal || null;
    } catch (err) {
      console.error('API getDealById failed:', err);
      toast.error(err?.message || 'Failed to fetch deal details.');
      return null;
    }
  }, []);

  /* ── Create Deal ── */
  const createDeal = useCallback(
    async (formData) => {
      try {
        const created = await dealService.createDeal(formData);
        toast.success(`Deal ${created?.dealNo || ''} created successfully.`);
        loadDeals();
        return created;
      } catch (err) {
        console.error('API createDeal failed:', err);
        toast.error(err?.message || 'Failed to create deal.');
        throw err;
      }
    },
    [loadDeals]
  );

  /* ── Edit Deal Header ── */
  const updateDeal = useCallback(async (id, formData) => {
    try {
      const updated = await dealService.updateDeal(id, formData);
      toast.success('Deal updated successfully.');
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      return updated;
    } catch (err) {
      console.error('API updateDeal failed:', err);
      toast.error(err?.message || 'Failed to update deal.');
      throw err;
    }
  }, []);

  /* ── Change Deal Status ── */
  const changeDealStatus = useCallback(async (id, dealStatusId, statusRemarks = '') => {
    try {
      const updated = await dealService.changeDealStatus(id, dealStatusId, statusRemarks);
      toast.success(`Deal moved to ${updated.dealStatus || 'new status'}.`);
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      return updated;
    } catch (err) {
      console.error('API changeDealStatus failed:', err);
      toast.error(err?.message || 'Failed to change deal status.');
      throw err;
    }
  }, []);

  /* ── Add Negotiation ── */
  const addNegotiation = useCallback(async (dealId, formData) => {
    try {
      const added = await dealService.addDealNegotiation(dealId, formData);
      toast.success('Negotiation note added.');
      return added;
    } catch (err) {
      console.error('API addDealNegotiation failed:', err);
      toast.error(err?.message || 'Failed to add negotiation note.');
      throw err;
    }
  }, []);

  /* ── Update Negotiation ── */
  const updateNegotiation = useCallback(async (id, formData) => {
    try {
      const updated = await dealService.updateDealNegotiation(id, formData);
      toast.success('Negotiation note updated.');
      return updated;
    } catch (err) {
      console.error('API updateDealNegotiation failed:', err);
      toast.error(err?.message || 'Failed to update negotiation note.');
      throw err;
    }
  }, []);

  /* ── Delete Negotiation ── */
  const deleteNegotiation = useCallback(async (id) => {
    try {
      await dealService.deleteDealNegotiation(id);
      toast.success('Negotiation entry deleted.');
      return true;
    } catch (err) {
      console.error('API deleteDealNegotiation failed:', err);
      toast.error(err?.message || 'Failed to delete negotiation entry.');
      throw err;
    }
  }, []);

  /* ── Prefill info for Convert to Deal ── */
  const getDealPrefill = useCallback(async (inquiryId) => {
    try {
      const prefill = await dealService.getDealPrefill(inquiryId);
      return prefill || null;
    } catch (err) {
      console.error('API getDealPrefill failed:', err);
      toast.error(err?.message || 'Failed to load deal prefill data.');
      throw err;
    }
  }, []);

  /* ── Next Deal Number Preview ── */
  const getNextDealNumber = useCallback(async (dealDate) => {
    try {
      const res = await dealService.getNextDealNumber(dealDate);
      return res || null;
    } catch (err) {
      console.error('API getNextDealNumber failed:', err);
      return null;
    }
  }, []);

  return {
    deals,
    lookups,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    isLoading,
    resetFilters,
    refreshDeals: loadDeals,
    fetchDealDetail,
    createDeal,
    updateDeal,
    changeDealStatus,
    addNegotiation,
    updateNegotiation,
    deleteNegotiation,
    getDealPrefill,
    getNextDealNumber,
    ensureDealsLoaded,
  };
}
