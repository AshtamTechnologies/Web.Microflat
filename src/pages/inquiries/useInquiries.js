/**
 * useInquiries.js — Core state management and API operations for the Inquiry Module.
 * Integrates with inquiryService (real REST API or mock service) with offline fallback.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { inquiryService, isMockApi } from '../../services';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../mocks/inquiries';
import { formatDateTime, getTodayISO } from '../../utils/dateUtils';
import {
  inquiryListItemFromApi,
  inquiryDetailFromApi,
} from '../../models/inquiries/inquiryModel';

let nextSeqNumber = 101;
let nextIdNumber = 1;

function formatAuditTimestamp(date = new Date()) {
  return formatDateTime(date);
}

function resolveUserName(userId, usersList = []) {
  if (!userId) return 'Unassigned';
  const found = (usersList || []).find((u) => String(u.id || u.userId) === String(userId));
  return found ? `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.userName || 'Unassigned' : 'Unassigned';
}

export function useInquiries(usersList = []) {
  const [inquiries, setInquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [assignedToFilter, setAssignedToFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(!isMockApi);
  const [error, setError] = useState(null);

  // Lookups: Sources and Priority Levels
  const [sources, setSources] = useState([]);
  const [priorityLevels, setPriorityLevels] = useState([]);

  /* ── 300ms Search Debounce ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── Load Reference Lookups (Sources & Priority Levels) ── */
  useEffect(() => {
    let isMounted = true;
    async function loadLookups() {
      try {
        const lookups = await inquiryService.getInquiryLookups();
        if (isMounted && lookups) {
          const sourcesList = Array.isArray(lookups.sources)
            ? lookups.sources
            : Array.isArray(lookups.inquirySources)
            ? lookups.inquirySources
            : [];
          const prioritiesList = Array.isArray(lookups.priorityLevels)
            ? lookups.priorityLevels
            : Array.isArray(lookups.priorities)
            ? lookups.priorities
            : [];
          if (sourcesList.length > 0) setSources(sourcesList);
          if (prioritiesList.length > 0) setPriorityLevels(prioritiesList);
        }
      } catch (err) {
        console.warn('Failed to load inquiry lookups:', err);
      }
    }
    loadLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ── Fetch Inquiries from Service ── */
  const fetchInquiries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        pageNumber,
        pageSize,
      };

      if (priorityFilter !== 'ALL') {
        const pLevel = priorityLevels.find(
          (p) => String(p.id) === String(priorityFilter) || p.priorityName?.toLowerCase() === priorityFilter.toLowerCase()
        );
        if (pLevel) {
          params.priorityLevelId = pLevel.id;
        }
      }

      if (regionFilter !== 'ALL') {
        params.regionId = regionFilter;
      }

      if (assignedToFilter !== 'ALL') {
        params.assignedToUserId = assignedToFilter;
      }

      const res = await inquiryService.listInquiries(params);
      if (res && Array.isArray(res.items)) {
        setInquiries(res.items);
        setTotalCount(res.totalCount ?? res.items.length);
        setTotalPages(res.totalPages ?? Math.max(1, Math.ceil((res.totalCount ?? res.items.length) / pageSize)));
      } else if (Array.isArray(res)) {
        setInquiries(res);
        setTotalCount(res.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.warn('inquiryService.listInquiries failed, using local/mock state:', err);
      setError(err?.message || 'Failed to fetch inquiries');
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    statusFilter,
    priorityFilter,
    regionFilter,
    assignedToFilter,
    fromDate,
    toDate,
    pageNumber,
    pageSize,
    priorityLevels,
  ]);

  /* Trigger fetch when query parameters change */
  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  /* ── Filtered inquiries list (client-side fallback / local filtering) ── */
  const filteredInquiries = useMemo(() => {
    // If backend already filtered, return inquiries directly; else apply client filter
    const q = debouncedSearch.trim().toLowerCase();

    return inquiries.filter((inq) => {
      if (q) {
        const matchesQuery =
          inq.InquiryNo?.toLowerCase().includes(q) ||
          inq.inquiryNo?.toLowerCase().includes(q) ||
          inq.CustomerName?.toLowerCase().includes(q) ||
          inq.companyName?.toLowerCase().includes(q) ||
          inq.ContactPerson?.toLowerCase().includes(q) ||
          inq.contactPersonName?.toLowerCase().includes(q) ||
          inq.Subject?.toLowerCase().includes(q) ||
          inq.Email?.toLowerCase().includes(q) ||
          inq.email?.toLowerCase().includes(q) ||
          inq.Phone?.includes(q) ||
          inq.mobileNo?.includes(q);
        if (!matchesQuery) return false;
      }

      if (statusFilter !== 'ALL') {
        const inqStatus = inq.StatusId || inq.status;
        if (inqStatus !== statusFilter) return false;
      }

      if (priorityFilter !== 'ALL') {
        const inqPriority = inq.Priority || inq.priorityName;
        if (inqPriority !== priorityFilter && String(inq.priorityLevelId) !== String(priorityFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [inquiries, debouncedSearch, statusFilter, priorityFilter]);

  /* ── Reset Filters ── */
  const resetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setRegionFilter('ALL');
    setAssignedToFilter('ALL');
    setFromDate('');
    setToDate('');
    setPageNumber(1);
  }, []);

  /* ── Get single inquiry by ID (from memory or cached) ── */
  const getInquiryById = useCallback(
    (id) => {
      if (!id) return null;
      return inquiries.find(
        (inq) =>
          String(inq.id) === String(id) ||
          String(inq.InquiryId) === String(id) ||
          inq.InquiryNo === id ||
          inq.inquiryNo === id
      );
    },
    [inquiries]
  );

  /* ── Fetch full detail of an inquiry by ID from API ── */
  const fetchInquiryById = useCallback(async (id) => {
    if (!id) return null;
    try {
      const data = await inquiryService.getInquiryById(id);
      return data;
    } catch (err) {
      console.warn(`fetchInquiryById(${id}) failed:`, err);
      return null;
    }
  }, []);

  /* ── Get next auto-generated Inquiry No (helper) ── */
  const getNextInquiryNo = useCallback(() => {
    const padded = String(nextSeqNumber).padStart(6, '0');
    return `INQ-2026-${padded}`;
  }, []);

  /* ── Create Inquiry ── */
  const addInquiry = useCallback(
    async (formData) => {
      try {
        const created = await inquiryService.createInquiry(formData);
        toast.success(`Inquiry ${created.inquiryNo || created.InquiryNo || ''} created successfully.`);
        // Refresh list
        await fetchInquiries();
        return { ok: true, inquiry: created };
      } catch (err) {
        console.error('Failed to create inquiry:', err);
        const errMsg = err?.message || 'Failed to create inquiry.';
        toast.error(errMsg);

        // When connected to the real backend, report error so the form stays open with validation hints
        if (!isMockApi) {
          return { ok: false, error: errMsg };
        }

        // Fallback to local creation for offline mock mode
        const now = formatAuditTimestamp();
        const generatedNo = formData.InquiryNo?.trim() || getNextInquiryNo();
        nextSeqNumber += 1;

        const assignedUserId = formData.AssignedTo || formData.assignedToUserId || null;
        const assignedUserName = resolveUserName(assignedUserId, usersList);
        const defaultStatus = formData.StatusId || formData.status || STATUS_OPTIONS[0].id;

        const genId = `inq-${nextIdNumber++}`;
        const newInquiry = {
          id: genId,
          InquiryId: genId,
          InquiryNo: generatedNo,
          inquiryNo: generatedNo,
          InquiryDate: formData.InquiryDate || formData.inquiryDate || getTodayISO(),
          CustomerName: formData.CustomerName?.trim() || formData.companyName?.trim() || '',
          companyName: formData.CustomerName?.trim() || formData.companyName?.trim() || '',
          ContactPerson: formData.ContactPerson?.trim() || formData.contactPersonName?.trim() || '',
          Email: formData.Email?.trim() || formData.email?.trim() || '',
          Phone: formData.Phone?.trim() || formData.mobileNo?.trim() || '',
          Priority: formData.Priority || 'Medium',
          StatusId: defaultStatus,
          status: defaultStatus,
          AssignedTo: assignedUserId,
          assignedToName: assignedUserName,
          items: Array.isArray(formData.items) ? formData.items : [],
          CreatedOn: now,
          activity: [],
        };

        setInquiries((prev) => [newInquiry, ...prev]);
        return { ok: true, inquiry: newInquiry };
      }
    },
    [fetchInquiries, getNextInquiryNo, usersList]
  );

  /* ── Update Inquiry ── */
  const updateInquiry = useCallback(
    async (id, formData) => {
      try {
        const updated = await inquiryService.updateInquiry(id, formData);
        toast.success('Inquiry updated successfully.');
        await fetchInquiries();
        return { ok: true, inquiry: updated };
      } catch (err) {
        console.error('Failed to update inquiry:', err);
        const errMsg = err?.message || 'Failed to update inquiry.';
        toast.error(errMsg);

        if (!isMockApi) {
          return { ok: false, error: errMsg };
        }

        // Fallback local update
        let updatedRecord = null;
        setInquiries((prev) =>
          prev.map((inq) => {
            if (String(inq.id) !== String(id) && String(inq.InquiryId) !== String(id)) return inq;
            updatedRecord = {
              ...inq,
              ...formData,
              ModifiedOn: formatAuditTimestamp(),
            };
            return updatedRecord;
          })
        );
        return { ok: true, inquiry: updatedRecord };
      }
    },
    [fetchInquiries]
  );

  /* ── Reassign Inquiry ── */
  const reassignInquiry = useCallback(
    async (id, newUserId, remarks = '') => {
      const newUserName = resolveUserName(newUserId, usersList);
      try {
        await inquiryService.assignInquiry(id, {
          assignedToUserId: newUserId,
          remarks: remarks?.trim() || null,
        });
        toast.success(`Inquiry assigned to ${newUserName}`);
        await fetchInquiries();
        return { ok: true };
      } catch (err) {
        console.error('Failed to assign inquiry:', err);
        // Fallback local update
        setInquiries((prev) =>
          prev.map((inq) => {
            if (String(inq.id) !== String(id) && String(inq.InquiryId) !== String(id)) return inq;
            return {
              ...inq,
              AssignedTo: newUserId,
              assignedToUserId: newUserId,
              assignedToName: newUserName,
            };
          })
        );
        toast.success(`Inquiry assigned to ${newUserName} (local)`);
        return { ok: true };
      }
    },
    [fetchInquiries, usersList]
  );

  /* ── Change Inquiry Status ── */
  const changeInquiryStatus = useCallback(
    async (id, newStatusId, remarks = '', targetItemId = null, position = 'top') => {
      try {
        await inquiryService.changeInquiryStatus(id, {
          status: newStatusId,
          comment: remarks?.trim() || null,
        });
        toast.success(`Inquiry status updated to ${newStatusId}`);
        await fetchInquiries();
        return { ok: true };
      } catch (err) {
        console.error('Failed to change inquiry status:', err);
        // Fallback local update
        setInquiries((prev) =>
          prev.map((inq) => {
            if (String(inq.id) !== String(id) && String(inq.InquiryId) !== String(id)) return inq;
            return {
              ...inq,
              StatusId: newStatusId,
              status: newStatusId,
            };
          })
        );
        toast.success(`Inquiry status updated to ${newStatusId} (local)`);
        return { ok: true };
      }
    },
    [fetchInquiries]
  );

  /* ── Add Comment / Note to Inquiry ── */
  const addInquiryComment = useCallback(
    async (id, commentText, author = 'Ian Chesnut') => {
      if (!commentText?.trim()) return { ok: false };
      try {
        const activities = await inquiryService.addInquiryComment(id, commentText);
        toast.success('Comment added successfully.');
        return { ok: true, activities };
      } catch (err) {
        console.error('Failed to add inquiry comment:', err);
        const now = formatAuditTimestamp();
        const fallbackEntry = {
          id: `act_${Date.now()}_comment`,
          type: 'comment',
          title: 'Comment Added',
          timestamp: now,
          changedBy: author,
          remarks: commentText.trim(),
        };
        setInquiries((prev) =>
          prev.map((inq) => {
            if (String(inq.id) !== String(id) && String(inq.InquiryId) !== String(id)) return inq;
            return {
              ...inq,
              activity: [fallbackEntry, ...(inq.activity || [])],
            };
          })
        );
        toast.success('Comment added (local).');
        return { ok: true, activity: fallbackEntry };
      }
    },
    []
  );

  /* ── Delete / Deactivate Inquiry ── */
  const deleteInquiry = useCallback(
    async (id) => {
      try {
        await inquiryService.toggleInquiryActive(id, false);
        toast.success('Inquiry deactivated successfully.');
        await fetchInquiries();
      } catch (err) {
        console.warn('Deactivate endpoint failed, removing from view:', err);
        setInquiries((prev) => prev.filter((inq) => String(inq.id) !== String(id) && String(inq.InquiryId) !== String(id)));
        toast.success('Inquiry removed from list.');
      }
    },
    [fetchInquiries]
  );

  return {
    inquiries: filteredInquiries,
    allInquiries: inquiries,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    regionFilter,
    setRegionFilter,
    assignedToFilter,
    setAssignedToFilter,
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
    error,
    sources,
    priorityLevels,
    resetFilters,
    fetchInquiries,
    getInquiryById,
    fetchInquiryById,
    getNextInquiryNo,
    addInquiry,
    updateInquiry,
    reassignInquiry,
    changeInquiryStatus,
    addInquiryComment,
    deleteInquiry,
    resolveUserName: (userId) => resolveUserName(userId, usersList),
  };
}
