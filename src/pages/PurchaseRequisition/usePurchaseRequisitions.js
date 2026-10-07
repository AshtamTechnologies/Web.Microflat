/**
 * usePurchaseRequisitions.js — Hook managing local state for Purchase Requisitions.
 * 100% Mock/Frontend state — No Axios or backend API dependencies.
 */

import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  mockPurchaseRequisitions,
  MOCK_MATERIALS,
} from '../../mocks/purchaseRequisitions';

export function usePurchaseRequisitions() {
  const [requisitions, setRequisitions] = useState(mockPurchaseRequisitions);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Auto-generate next PR number in format PR-YYYY-XXXX
  const getNextPRNumber = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const prefix = `PR-${currentYear}-`;
    
    // Find highest sequence number for this year
    let maxSeq = 0;
    requisitions.forEach((pr) => {
      if (pr.prNumber && pr.prNumber.startsWith(prefix)) {
        const seqStr = pr.prNumber.replace(prefix, '');
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }, [requisitions]);

  // Lookup PR by either numeric id (prId) or PR Number (prNumber e.g. "PR-2026-0001")
  const getPRById = useCallback(
    (id) => {
      if (!id) return null;
      const cleanId = String(id).trim().toLowerCase();
      return (
        requisitions.find(
          (pr) =>
            String(pr.prId).toLowerCase() === cleanId ||
            String(pr.prNumber).toLowerCase() === cleanId
        ) || null
      );
    },
    [requisitions]
  );

  // Create new Purchase Requisition
  const createPR = useCallback(
    (formData) => {
      const now = new Date().toISOString();
      const generatedPRNumber = formData.prNumber || getNextPRNumber();
      const newPRId = Date.now();

      const newRecord = {
        prId: newPRId,
        prNumber: generatedPRNumber,
        prDate: formData.prDate || new Date().toISOString().split('T')[0],
        requestedBy: formData.requestedBy || 'Current User',
        department: formData.department || 'Purchase',
        requiredDate: formData.requiredDate || '',
        priority: formData.priority || 'Normal',
        remarks: formData.remarks || '',
        status: formData.status || 'Pending Approval',
        createdBy: formData.requestedBy || 'Current User',
        createdDate: now,
        modifiedBy: formData.requestedBy || 'Current User',
        modifiedDate: now,
        items: Array.isArray(formData.items)
          ? formData.items.map((item, idx) => ({
              prItemId: item.prItemId || Date.now() + idx,
              itemId: item.itemId || null,
              itemCode: item.itemCode || '',
              itemName: item.itemName || '',
              specification: item.specification || '',
              quantity: Number(item.quantity) || 1,
              uom: item.uom || 'Nos',
              requiredDate: item.requiredDate || formData.requiredDate || '',
              remarks: item.remarks || '',
              status: item.status || 'Pending',
            }))
          : [],
      };

      setRequisitions((prev) => [newRecord, ...prev]);
      return newRecord;
    },
    [getNextPRNumber]
  );

  // Update existing Purchase Requisition
  const updatePR = useCallback((id, formData) => {
    const now = new Date().toISOString();
    let updatedRecord = null;

    setRequisitions((prev) =>
      prev.map((pr) => {
        if (
          String(pr.prId).toLowerCase() === String(id).toLowerCase() ||
          String(pr.prNumber).toLowerCase() === String(id).toLowerCase()
        ) {
          updatedRecord = {
            ...pr,
            ...formData,
            prNumber: pr.prNumber, // PR Number remains immutable
            modifiedBy: formData.requestedBy || pr.requestedBy || 'Current User',
            modifiedDate: now,
            items: Array.isArray(formData.items)
              ? formData.items.map((item, idx) => ({
                  prItemId: item.prItemId || Date.now() + idx,
                  itemId: item.itemId || null,
                  itemCode: item.itemCode || '',
                  itemName: item.itemName || '',
                  specification: item.specification || '',
                  quantity: Number(item.quantity) || 1,
                  uom: item.uom || 'Nos',
                  requiredDate: item.requiredDate || formData.requiredDate || '',
                  remarks: item.remarks || '',
                  status: item.status || 'Pending',
                }))
              : pr.items,
          };
          return updatedRecord;
        }
        return pr;
      })
    );

    return updatedRecord;
  }, []);

  // Approve PR
  const approvePR = useCallback((id, meta = {}) => {
    const now = new Date().toISOString();
    let updatedRecord = null;

    setRequisitions((prev) =>
      prev.map((pr) => {
        if (
          String(pr.prId).toLowerCase() === String(id).toLowerCase() ||
          String(pr.prNumber).toLowerCase() === String(id).toLowerCase()
        ) {
          updatedRecord = {
            ...pr,
            status: 'Approved',
            approvedBy: meta.approvedBy || 'Ian Chesnut',
            approvedDate: now,
            approvalRemarks: meta.remarks || '',
            modifiedBy: meta.approvedBy || 'Ian Chesnut',
            modifiedDate: now,
            items: (pr.items || []).map((it) => ({
              ...it,
              status: 'Approved',
            })),
          };
          return updatedRecord;
        }
        return pr;
      })
    );

    return updatedRecord;
  }, []);

  // Reject PR
  const rejectPR = useCallback((id, meta = {}) => {
    const now = new Date().toISOString();
    let updatedRecord = null;

    setRequisitions((prev) =>
      prev.map((pr) => {
        if (
          String(pr.prId).toLowerCase() === String(id).toLowerCase() ||
          String(pr.prNumber).toLowerCase() === String(id).toLowerCase()
        ) {
          updatedRecord = {
            ...pr,
            status: 'Rejected',
            rejectedBy: meta.rejectedBy || 'Ian Chesnut',
            rejectedDate: now,
            rejectionReason: meta.rejectionReason || '',
            modifiedBy: meta.rejectedBy || 'Ian Chesnut',
            modifiedDate: now,
            items: (pr.items || []).map((it) => ({
              ...it,
              status: 'Rejected',
            })),
          };
          return updatedRecord;
        }
        return pr;
      })
    );

    return updatedRecord;
  }, []);

  // Delete PR (Mock)
  const deletePR = useCallback((id) => {
    setRequisitions((prev) =>
      prev.filter(
        (pr) =>
          String(pr.prId).toLowerCase() !== String(id).toLowerCase() &&
          String(pr.prNumber).toLowerCase() !== String(id).toLowerCase()
      )
    );
    toast.success('Purchase requisition removed.');
  }, []);

  // Filtered dataset
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((pr) => {
      // 1. Search Query filter (matches PR Number, Requested By, Department)
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchNumber = (pr.prNumber || '').toLowerCase().includes(query);
        const matchRequester = (pr.requestedBy || '').toLowerCase().includes(query);
        const matchDept = (pr.department || '').toLowerCase().includes(query);
        const matchItem = (pr.items || []).some(
          (it) =>
            (it.itemCode || '').toLowerCase().includes(query) ||
            (it.itemName || '').toLowerCase().includes(query)
        );

        if (!matchNumber && !matchRequester && !matchDept && !matchItem) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (pr.status?.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Priority Filter
      if (priorityFilter !== 'ALL') {
        if (pr.priority?.toLowerCase() !== priorityFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Date Filter (matches PR date or required date)
      if (dateFilter) {
        const prDatePart = (pr.prDate || '').split('T')[0];
        const reqDatePart = (pr.requiredDate || '').split('T')[0];
        if (prDatePart !== dateFilter && reqDatePart !== dateFilter) {
          return false;
        }
      }

      return true;
    });
  }, [requisitions, search, statusFilter, priorityFilter, dateFilter]);

  // Reset search and filters
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setDateFilter('');
  }, []);

  return {
    requisitions,
    filteredRequisitions,
    materials: MOCK_MATERIALS,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    dateFilter,
    setDateFilter,
    resetFilters,
    getPRById,
    getNextPRNumber,
    createPR,
    updatePR,
    approvePR,
    rejectPR,
    deletePR,
  };
}
