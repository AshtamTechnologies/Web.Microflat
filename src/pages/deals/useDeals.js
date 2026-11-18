/**
 * src/pages/deals/useDeals.js — React hook for Deals business logic and state.
 * Features automatic fallback to comprehensive dummy data so you can test all views and forms immediately.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { dealService, isMockApi } from '../../services';
import { INITIAL_MOCK_DEALS, MOCK_DEAL_LOOKUPS } from '../../mocks/deals';
import {
  dealItemFromApi,
  dealDetailFromApi,
  negotiationFromApi,
} from '../../models/deals/dealModel';

// In-memory working copy for local mutations fallback
let localDeals = JSON.parse(JSON.stringify(INITIAL_MOCK_DEALS));
let localNegotiationSeq = 500;
let localDealSeq = 100;

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

  const [deals, setDeals] = useState(() => localDeals.map(dealItemFromApi));
  const [lookups, setLookups] = useState(() => JSON.parse(JSON.stringify(MOCK_DEAL_LOOKUPS)));

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(localDeals.length);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(!isMockApi);

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

  /* ── Load Lookups with Fallback ── */
  const loadLookups = useCallback(async () => {
    try {
      const data = await dealService.getDealLookups();
      if (data && Array.isArray(data.statuses) && data.statuses.length > 0) {
        setLookups({
          statuses: data.statuses,
          currencies: Array.isArray(data.currencies) && data.currencies.length > 0
            ? data.currencies
            : MOCK_DEAL_LOOKUPS.currencies,
          defaultCurrencyId: data.defaultCurrencyId || 1,
        });
      }
    } catch (err) {
      console.warn('Could not load deal lookups from API, using fallback lookups:', err);
      setLookups(JSON.parse(JSON.stringify(MOCK_DEAL_LOOKUPS)));
    }
  }, []);

  /* ── Helper to filter local deals when falling back ── */
  const getFilteredLocalDeals = useCallback(() => {
    let list = [...localDeals];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.dealNo?.toLowerCase().includes(q) ||
          d.inquiryNo?.toLowerCase().includes(q) ||
          d.clientName?.toLowerCase().includes(q) ||
          d.clientCode?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((d) => String(d.dealStatusId) === String(statusFilter));
    }
    if (fromDate) {
      list = list.filter((d) => d.dealDate >= fromDate);
    }
    if (toDate) {
      list = list.filter((d) => d.dealDate <= toDate);
    }
    return list;
  }, [debouncedSearch, statusFilter, fromDate, toDate]);

  /* ── Load Deals List with Automatic Fallback ── */
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

      // If backend returns records, use them
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        setDeals(res.items);
        setTotalCount(res.totalCount ?? res.items.length);
        setTotalPages(res.totalPages || Math.ceil((res.totalCount ?? res.items.length) / pageSize) || 1);
      } else {
        // Otherwise, automatically fall back to realistic dummy data
        const fallbackList = getFilteredLocalDeals();
        const start = (pageNumber - 1) * pageSize;
        const paged = fallbackList.slice(start, start + pageSize).map(dealItemFromApi);
        setDeals(paged);
        setTotalCount(fallbackList.length);
        setTotalPages(Math.ceil(fallbackList.length / pageSize) || 1);
      }
    } catch (err) {
      console.warn('API listDeals unavailable, falling back to dummy deals:', err);
      const fallbackList = getFilteredLocalDeals();
      const start = (pageNumber - 1) * pageSize;
      const paged = fallbackList.slice(start, start + pageSize).map(dealItemFromApi);
      setDeals(paged);
      setTotalCount(fallbackList.length);
      setTotalPages(Math.ceil(fallbackList.length / pageSize) || 1);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, fromDate, toDate, pageNumber, pageSize, getFilteredLocalDeals]);

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

  /* ── Get single deal by ID with Fallback ── */
  const fetchDealDetail = useCallback(async (id) => {
    try {
      const deal = await dealService.getDealById(id);
      if (deal) return deal;
    } catch (err) {
      console.warn('API getDealById unavailable, checking local dummy deals:', err);
    }

    const match = localDeals.find((d) => String(d.id) === String(id));
    if (match) {
      return dealDetailFromApi(match);
    }
    return null;
  }, []);

  /* ── Create Deal with Fallback ── */
  const createDeal = useCallback(
    async (formData) => {
      try {
        const created = await dealService.createDeal(formData);
        toast.success(`Deal ${created.dealNo || ''} created successfully.`);
        loadDeals();
        return created;
      } catch (err) {
        console.warn('API createDeal failed, creating in local state:', err);
        const newId = localDealSeq++;
        const newDocNo = `DEAL/26-27/${String(newId).padStart(4, '0')}`;
        const newDeal = {
          id: newId,
          dealNo: newDocNo,
          inquiryId: Number(formData.inquiryId),
          inquiryNo: `INQ/26-27/${String(formData.inquiryId).padStart(4, '0')}`,
          dealDate: formData.dealDate || new Date().toISOString().slice(0, 10),
          clientId: 7,
          clientDetailId: 19,
          clientCode: 'CL0007',
          clientName: 'Acme Heavy Engineering Ltd',
          clientContactId: formData.clientContactId ? Number(formData.clientContactId) : 31,
          clientContactName: 'Ravi Shah',
          clientContactEmail: 'ravi@acme.com',
          currencyId: formData.currencyId ? Number(formData.currencyId) : 1,
          currencyCode: 'INR',
          currencySymbol: '₹',
          expectedValue: Number(formData.expectedValue || 0),
          negotiatedValue: formData.negotiatedValue ? Number(formData.negotiatedValue) : null,
          dealStatusId: 1,
          dealStatus: 'Open',
          statusChangedOn: null,
          statusRemarks: null,
          remarks: formData.remarks || '',
          createdBy: 1,
          createdByName: 'Admin',
          createdOn: new Date().toISOString().slice(0, 19),
          isEditable: true,
          canQuote: true,
          nextStatuses: [
            { id: 2, statusName: 'On Hold', isActive: true },
            { id: 3, statusName: 'Won', isActive: true },
            { id: 4, statusName: 'Lost', isActive: true },
          ],
          negotiations: [],
        };
        localDeals.unshift(newDeal);
        loadDeals();
        toast.success(`Deal ${newDocNo} created successfully.`);
        return dealDetailFromApi(newDeal);
      }
    },
    [loadDeals]
  );

  /* ── Edit Deal Header with Fallback ── */
  const updateDeal = useCallback(async (id, formData) => {
    try {
      const updated = await dealService.updateDeal(id, formData);
      toast.success(`Deal updated successfully.`);
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      return updated;
    } catch (err) {
      console.warn('API updateDeal failed, updating local dummy deal:', err);
      const match = localDeals.find((d) => String(d.id) === String(id));
      if (match) {
        match.expectedValue = Number(formData.expectedValue ?? match.expectedValue);
        match.negotiatedValue = formData.negotiatedValue !== '' && formData.negotiatedValue !== null
          ? Number(formData.negotiatedValue)
          : null;
        match.currencyId = formData.currencyId ? Number(formData.currencyId) : match.currencyId;
        match.clientContactId = formData.clientContactId ? Number(formData.clientContactId) : null;
        match.remarks = formData.remarks ? String(formData.remarks).trim() : null;
        match.lastUpdatedOn = new Date().toISOString().slice(0, 19);

        const normalized = dealDetailFromApi(match);
        setDeals((prev) => prev.map((d) => (d.id === match.id ? { ...d, ...normalized } : d)));
        toast.success(`Deal updated successfully.`);
        return normalized;
      }
      throw err;
    }
  }, []);

  /* ── Change Deal Status with Fallback ── */
  const changeDealStatus = useCallback(async (id, dealStatusId, statusRemarks = '') => {
    try {
      const updated = await dealService.changeDealStatus(id, dealStatusId, statusRemarks);
      toast.success(`Deal moved to ${updated.dealStatus || 'new status'}.`);
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      return updated;
    } catch (err) {
      console.warn('API changeDealStatus failed, updating local dummy deal:', err);
      const match = localDeals.find((d) => String(d.id) === String(id));
      if (match) {
        const targetId = Number(dealStatusId);
        const sObj = MOCK_DEAL_LOOKUPS.statuses.find((s) => s.id === targetId);
        const sName = sObj ? sObj.statusName : 'Open';

        match.dealStatusId = targetId;
        match.dealStatus = sName;
        match.statusRemarks = statusRemarks || null;
        match.statusChangedOn = new Date().toISOString().slice(0, 19);

        if (sName === 'Won') {
          match.isEditable = false;
          match.canQuote = true;
          match.nextStatuses = [];
        } else if (sName === 'Lost') {
          match.isEditable = false;
          match.canQuote = false;
          match.nextStatuses = [{ id: 1, statusName: 'Open', isActive: true }];
        } else if (sName === 'On Hold') {
          match.isEditable = true;
          match.canQuote = false;
          match.nextStatuses = [
            { id: 1, statusName: 'Open', isActive: true },
            { id: 4, statusName: 'Lost', isActive: true },
          ];
        } else {
          match.isEditable = true;
          match.canQuote = true;
          match.nextStatuses = [
            { id: 2, statusName: 'On Hold', isActive: true },
            { id: 3, statusName: 'Won', isActive: true },
            { id: 4, statusName: 'Lost', isActive: true },
          ];
        }

        const normalized = dealDetailFromApi(match);
        setDeals((prev) => prev.map((d) => (d.id === match.id ? { ...d, ...normalized } : d)));
        toast.success(`Deal moved to ${sName}.`);
        return normalized;
      }
      throw err;
    }
  }, []);

  /* ── Add Negotiation with Fallback ── */
  const addNegotiation = useCallback(async (dealId, formData) => {
    try {
      const added = await dealService.addDealNegotiation(dealId, formData);
      toast.success('Negotiation note added.');
      return added;
    } catch (err) {
      console.warn('API addDealNegotiation failed, saving in local dummy deal:', err);
      const match = localDeals.find((d) => String(d.id) === String(dealId));
      if (match) {
        const newNeg = {
          id: localNegotiationSeq++,
          dealId: match.id,
          negotiationDate: formData.negotiationDate || new Date().toISOString().slice(0, 10),
          discussedValue: formData.discussedValue !== '' && formData.discussedValue !== null ? Number(formData.discussedValue) : null,
          notes: formData.notes || '',
          createdBy: 1,
          createdByName: 'Admin',
          createdOn: new Date().toISOString().slice(0, 19),
          lastUpdatedOn: null,
        };
        match.negotiations = [newNeg, ...(match.negotiations || [])];
        toast.success('Negotiation note added.');
        return negotiationFromApi(newNeg);
      }
      throw err;
    }
  }, []);

  /* ── Update Negotiation with Fallback ── */
  const updateNegotiation = useCallback(async (id, formData) => {
    try {
      const updated = await dealService.updateDealNegotiation(id, formData);
      toast.success('Negotiation note updated.');
      return updated;
    } catch (err) {
      console.warn('API updateDealNegotiation failed, updating local dummy negotiation:', err);
      for (const d of localDeals) {
        const n = (d.negotiations || []).find((item) => item.id === Number(id));
        if (n) {
          if (formData.negotiationDate) n.negotiationDate = formData.negotiationDate;
          n.discussedValue = formData.discussedValue !== '' && formData.discussedValue !== null ? Number(formData.discussedValue) : null;
          n.notes = formData.notes || '';
          n.lastUpdatedOn = new Date().toISOString().slice(0, 19);
          toast.success('Negotiation note updated.');
          return negotiationFromApi(n);
        }
      }
      throw err;
    }
  }, []);

  /* ── Delete Negotiation with Fallback ── */
  const deleteNegotiation = useCallback(async (id) => {
    try {
      await dealService.deleteDealNegotiation(id);
      toast.success('Negotiation entry deleted.');
      return true;
    } catch (err) {
      console.warn('API deleteDealNegotiation failed, deleting from local dummy negotiation:', err);
      for (const d of localDeals) {
        const idx = (d.negotiations || []).findIndex((item) => item.id === Number(id));
        if (idx !== -1) {
          d.negotiations.splice(idx, 1);
          toast.success('Negotiation entry deleted.');
          return true;
        }
      }
      throw err;
    }
  }, []);

  /* ── Prefill info for Convert to Deal with Fallback ── */
  const getDealPrefill = useCallback(async (inquiryId) => {
    try {
      const prefill = await dealService.getDealPrefill(inquiryId);
      if (prefill) return prefill;
    } catch (err) {
      console.warn('API getDealPrefill failed, providing fallback prefill data:', err);
    }

    const numId = Number(inquiryId) || 1;
    return {
      inquiryId: numId,
      inquiryNo: `INQ/26-27/${String(numId).padStart(4, '0')}`,
      client: {
        clientDetailId: 19,
        clientId: 7,
        clientCode: 'CL0007',
        clientName: 'Acme Heavy Engineering Ltd',
        contactType: 'Customer',
        gstNo: '24AAACC1206D1ZM',
        contacts: [
          { clientContactId: 31, fullName: 'Ravi Shah', email: 'ravi@acme.com', phoneNo: '9876543210', isPrimary: true, isActive: true },
          { clientContactId: 32, fullName: 'Pooja Dave', email: 'pooja@acme.com', phoneNo: '9825122974', isPrimary: false, isActive: true },
        ],
      },
      clientContactId: 31,
      currencyId: 1,
    };
  }, []);

  /* ── Next Deal Number Preview with Fallback ── */
  const getNextDealNumber = useCallback(async (dealDate) => {
    try {
      const res = await dealService.getNextDealNumber(dealDate);
      if (res) return res;
    } catch (err) {
      console.warn('API getNextDealNumber failed, providing fallback document number:', err);
    }
    return {
      documentNumber: `DEAL/26-27/${String(localDealSeq).padStart(4, '0')}`,
      seriesId: 3,
      periodKey: '2026-27',
      runningNumber: localDealSeq,
    };
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
