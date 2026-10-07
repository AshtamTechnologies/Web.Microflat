/**
 * useInquiries.js — Core state management and CRUD operations for the Inquiry Module.
 */

import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { mockInquiries, STATUS_OPTIONS } from '../../mocks/inquiries';
import { mockUsers } from '../../mocks/users';

let nextSeqNumber = mockInquiries.length + 101 + 1;
let nextIdNumber = mockInquiries.length + 1;

function formatAuditTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formattedHours}:${minutes} ${ampm}`;
}

function resolveUserName(userId, usersList = mockUsers) {
  if (!userId) return 'Unassigned';
  const found = usersList.find((u) => u.id === userId);
  return found ? `${found.firstName} ${found.lastName}` : 'Unassigned';
}

export function useInquiries(usersList = mockUsers) {
  const [inquiries, setInquiries] = useState(mockInquiries);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  /* ── Filtered inquiries list ── */
  const filteredInquiries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return inquiries.filter((inq) => {
      // 1. Text Search
      if (q) {
        const matchesQuery =
          inq.InquiryNo?.toLowerCase().includes(q) ||
          inq.CustomerName?.toLowerCase().includes(q) ||
          inq.ContactPerson?.toLowerCase().includes(q) ||
          inq.Subject?.toLowerCase().includes(q) ||
          inq.Email?.toLowerCase().includes(q) ||
          inq.Phone?.includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (inq.StatusId !== statusFilter) {
          return false;
        }
      }

      // 3. Priority Filter
      if (priorityFilter !== 'ALL') {
        if (inq.Priority !== priorityFilter) {
          return false;
        }
      }

      return true;
    });
  }, [inquiries, search, statusFilter, priorityFilter]);

  /* ── Reset Filters ── */
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  }, []);

  /* ── Get single inquiry by ID ── */
  const getInquiryById = useCallback((id) => {
    if (!id) return null;
    return inquiries.find(
      (inq) => inq.id === id || inq.InquiryId === id || inq.InquiryNo === id
    );
  }, [inquiries]);

  /* ── Get next auto-generated Inquiry No ── */
  const getNextInquiryNo = useCallback(() => {
    const padded = String(nextSeqNumber).padStart(6, '0');
    return `INQ-2026-${padded}`;
  }, []);

  /* ── Create Inquiry ── */
  const addInquiry = useCallback(
    async (formData) => {
      await new Promise((r) => setTimeout(r, 700));

      const now = formatAuditTimestamp();
      const generatedNo = formData.InquiryNo?.trim() || getNextInquiryNo();
      nextSeqNumber += 1;

      const assignedUserId = formData.AssignedTo || null;
      const assignedUserName = resolveUserName(assignedUserId, usersList);
      const defaultStatus = formData.StatusId || STATUS_OPTIONS[0].id;

      const initialActivity = [
        {
          id: `act_${Date.now()}_created`,
          type: 'created',
          timestamp: now,
          changedBy: 'Ian Chesnut',
          toValue: assignedUserId ? assignedUserName : 'Unassigned',
          remarks: assignedUserId
            ? `Inquiry logged and assigned to ${assignedUserName}.`
            : 'Inquiry registered into ERP system.',
        },
      ];

      const newInquiry = {
        id: `inq-${nextIdNumber++}`,
        InquiryId: `inq-${nextIdNumber}`,
        InquiryNo: generatedNo,
        InquiryDate: formData.InquiryDate || new Date().toISOString().slice(0, 10),
        CustomerName: formData.CustomerName?.trim() || '',
        ContactPerson: formData.ContactPerson?.trim() || '',
        Email: formData.Email?.trim() || '',
        Phone: formData.Phone?.trim() || '',
        RegionId: formData.RegionId || '',
        CategoryId: formData.CategoryId || '',
        Subject: formData.Subject?.trim() || '',
        Description: formData.Description?.trim() || '',
        Source: formData.Source || 'Website',
        Priority: formData.Priority || 'Medium',
        Quantity: formData.Quantity ? Number(formData.Quantity) : 1,
        UOM: formData.UOM || 'PCS',
        EstimatedValue: formData.EstimatedValue ? Number(formData.EstimatedValue) : 0,
        RequiredByDate: formData.RequiredByDate || '',
        StatusId: defaultStatus,
        AssignedTo: assignedUserId,
        CreatedBy: 'Ian Chesnut',
        CreatedOn: now,
        ModifiedBy: 'Ian Chesnut',
        ModifiedOn: now,
        activity: initialActivity,
      };

      setInquiries((prev) => [newInquiry, ...prev]);
      toast.success('Inquiry created successfully.');
      return { ok: true, inquiry: newInquiry };
    },
    [getNextInquiryNo, usersList]
  );

  /* ── Update Inquiry ── */
  const updateInquiry = useCallback(
    async (id, formData) => {
      await new Promise((r) => setTimeout(r, 700));

      const now = formatAuditTimestamp();
      let updatedRecord = null;

      setInquiries((prev) =>
        prev.map((inq) => {
          if (inq.id !== id && inq.InquiryId !== id) return inq;

          updatedRecord = {
            ...inq,
            ...formData,
            Quantity: formData.Quantity !== undefined ? Number(formData.Quantity) : inq.Quantity,
            EstimatedValue: formData.EstimatedValue !== undefined ? Number(formData.EstimatedValue) : inq.EstimatedValue,
            ModifiedBy: 'Ian Chesnut',
            ModifiedOn: now,
          };
          return updatedRecord;
        })
      );

      toast.success('Inquiry updated successfully.');
      return { ok: true, inquiry: updatedRecord };
    },
    []
  );

  /* ── Reassign Inquiry ── */
  const reassignInquiry = useCallback(
    (id, newUserId, remarks = '') => {
      const target = inquiries.find((inq) => inq.id === id || inq.InquiryId === id);
      if (!target) return { ok: false };

      const now = formatAuditTimestamp();
      const prevUserId = target.AssignedTo;
      const prevUserName = resolveUserName(prevUserId, usersList);
      const newUserName = resolveUserName(newUserId, usersList);
      const isReassignment = Boolean(prevUserId && prevUserId !== newUserId);

      const activityEntry = {
        id: `act_${Date.now()}_assign`,
        type: 'assignment',
        timestamp: now,
        changedBy: 'Ian Chesnut',
        fromValue: prevUserName,
        toValue: newUserName,
        remarks: remarks?.trim() || (isReassignment ? `Reassigned from ${prevUserName} to ${newUserName}` : `Assigned to ${newUserName}`),
      };

      setInquiries((prev) =>
        prev.map((inq) => {
          if (inq.id !== id && inq.InquiryId !== id) return inq;
          return {
            ...inq,
            AssignedTo: newUserId,
            ModifiedBy: 'Ian Chesnut',
            ModifiedOn: now,
            activity: [activityEntry, ...(inq.activity || [])],
          };
        })
      );

      if (isReassignment) {
        toast.success(`Inquiry reassigned to ${newUserName}`);
      } else {
        toast.success(`Inquiry assigned to ${newUserName}`);
      }

      return { ok: true };
    },
    [inquiries, usersList]
  );

  /* ── Change Inquiry Status ── */
  const changeInquiryStatus = useCallback(
    (id, newStatusId, remarks = '') => {
      const target = inquiries.find((inq) => inq.id === id || inq.InquiryId === id);
      if (!target) return { ok: false };

      const now = formatAuditTimestamp();
      const prevStatus = target.StatusId || 'New';

      const activityEntry = {
        id: `act_${Date.now()}_status`,
        type: 'status',
        timestamp: now,
        changedBy: 'Ian Chesnut',
        fromValue: prevStatus,
        toValue: newStatusId,
        remarks: remarks?.trim() || `Status updated to ${newStatusId}`,
      };

      setInquiries((prev) =>
        prev.map((inq) => {
          if (inq.id !== id && inq.InquiryId !== id) return inq;
          return {
            ...inq,
            StatusId: newStatusId,
            ModifiedBy: 'Ian Chesnut',
            ModifiedOn: now,
            activity: [activityEntry, ...(inq.activity || [])],
          };
        })
      );

      toast.success(`Inquiry status updated to ${newStatusId}`);
      return { ok: true };
    },
    [inquiries]
  );

  /* ── Delete Inquiry ── */
  const deleteInquiry = useCallback(
    (id) => {
      const target = inquiries.find((inq) => inq.id === id || inq.InquiryId === id);
      setInquiries((prev) => prev.filter((inq) => inq.id !== id && inq.InquiryId !== id));
      if (target) {
        toast.success(`Inquiry ${target.InquiryNo} deleted.`);
      }
    },
    [inquiries]
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
    resetFilters,
    getInquiryById,
    getNextInquiryNo,
    addInquiry,
    updateInquiry,
    reassignInquiry,
    changeInquiryStatus,
    deleteInquiry,
    resolveUserName: (userId) => resolveUserName(userId, usersList),
  };
}
