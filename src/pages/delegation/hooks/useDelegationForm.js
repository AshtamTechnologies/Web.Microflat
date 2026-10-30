/**
 * useDelegationForm.js — Manages delegation form state, assignment line-items, and submission.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  createDelegation,
  updateDelegation,
  getDelegation,
} from '../../../services/delegation/delegationService';
import { getTodayISO } from '../../../utils/dateUtils';
import { useAuthContext } from '../../../context/AuthContext';
import { ApiError } from '../../../utils/apiError';
import { getApprovalPageLabel } from '../../../constants/delegation';

let tempAssignmentCounter = 1;

/**
 * Hook to manage Delegation form state, approval assignments, and submission.
 *
 * @param {{ id?: string, onSuccess?: () => void, onClose?: () => void }} options
 * @returns {object}
 */
export function useDelegationForm({ id, onSuccess, onClose } = {}) {
  const isEdit = Boolean(id);
  const { user } = useAuthContext();
  const currentUserId = user?.id || user?.userId || 'u1';
  const currentUserRoles = user?.roles || ['Super Admin'];

  const today = getTodayISO();

  const [formData, setFormData] = useState({
    delegatorId: currentUserId,
    delegateId: '',
    approvalPageKey: 'VENDOR_APPROVAL',
    fromDate: today,
    toDate: today,
    reason: 'Leave',
    note: '',
  });

  // Line items for create mode (e.g. Vendor Approvals -> User A, PR Approvals -> User B)
  const [assignments, setAssignments] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  // Draft inputs for adding a row
  const [draftAssignment, setDraftAssignment] = useState({
    approvalPageKey: 'VENDOR_APPROVAL',
    delegateId: '',
    note: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);

  // Load existing delegation if in Edit mode
  useEffect(() => {
    if (!id) return;
    let isCurrent = true;

    async function loadExisting() {
      setIsLoadingRecord(true);
      setLoadError(null);
      try {
        const existing = await getDelegation(id);
        if (isCurrent && existing) {
          setFormData({
            delegatorId: existing.delegatorId,
            delegateId: existing.delegateId,
            approvalPageKey: existing.approvalPageKey || 'VENDOR_APPROVAL',
            fromDate: existing.fromDate,
            toDate: existing.toDate,
            reason: existing.reason || 'Leave',
            note: existing.note || '',
          });
        }
      } catch (err) {
        if (isCurrent) {
          const msg = err?.message || 'Failed to load delegation record.';
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (isCurrent) setIsLoadingRecord(false);
      }
    }

    loadExisting();

    return () => {
      isCurrent = false;
    };
  }, [id]);

  // Checks whether logged-in user has Admin privileges
  const isAdmin = useMemo(() => {
    const roles = Array.isArray(currentUserRoles) ? currentUserRoles : [currentUserRoles];
    return roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.roleName || r?.name || '';
      const norm = name.trim().toLowerCase();
      return norm === 'admin' || norm === 'super admin';
    });
  }, [currentUserRoles]);

  // Set top-level form field
  const setFieldValue = useCallback((name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'fromDate' && value && next.toDate && value > next.toDate) {
        next.toDate = value;
      }
      return next;
    });

    setErrors((prev) => ({ ...prev, [name]: null }));
  }, []);

  // Update draft row input
  const setDraftValue = useCallback((name, value) => {
    setDraftAssignment((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, assignmentDraft: null }));
  }, []);

  // Start editing an assignment from the grid
  const startEditAssignment = useCallback((item) => {
    setEditingAssignmentId(item.id);
    setDraftAssignment({
      approvalPageKey: item.approvalPageKey,
      delegateId: item.delegateId,
      note: item.note || '',
    });
    setErrors((prev) => ({ ...prev, assignmentDraft: null }));
  }, []);

  // Cancel editing an assignment
  const cancelEditAssignment = useCallback(() => {
    setEditingAssignmentId(null);
    setDraftAssignment({
      approvalPageKey: 'VENDOR_APPROVAL',
      delegateId: '',
      note: '',
    });
    setErrors((prev) => ({ ...prev, assignmentDraft: null }));
  }, []);

  // Add or update assignment line item
  const addAssignment = useCallback(() => {
    const { approvalPageKey, delegateId, note } = draftAssignment;

    if (!approvalPageKey) {
      setErrors((prev) => ({ ...prev, assignmentDraft: 'Please select an approval page.' }));
      return false;
    }

    if (!delegateId) {
      setErrors((prev) => ({ ...prev, assignmentDraft: 'Please select a colleague for this approval page.' }));
      return false;
    }

    if (String(delegateId).trim() === String(formData.delegatorId || currentUserId).trim()) {
      setErrors((prev) => ({ ...prev, assignmentDraft: 'You cannot delegate work to yourself.' }));
      return false;
    }

    if (note && note.length > 250) {
      setErrors((prev) => ({ ...prev, assignmentDraft: 'Note for the delegate cannot exceed 250 characters.' }));
      return false;
    }

    // Check if approval page is already assigned to a DIFFERENT row
    const exists = assignments.some(
      (a) => a.id !== editingAssignmentId && a.approvalPageKey === approvalPageKey
    );
    if (exists) {
      setErrors((prev) => ({
        ...prev,
        assignmentDraft: `An assignment for "${getApprovalPageLabel(approvalPageKey)}" has already been added below.`,
      }));
      return false;
    }

    if (editingAssignmentId) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingAssignmentId
            ? {
                ...a,
                approvalPageKey,
                approvalPageLabel: getApprovalPageLabel(approvalPageKey),
                delegateId,
                note: (note || '').trim(),
              }
            : a
        )
      );
      setEditingAssignmentId(null);
      toast.success('Assignment updated');
    } else {
      const newRow = {
        id: `temp-${tempAssignmentCounter++}`,
        approvalPageKey,
        approvalPageLabel: getApprovalPageLabel(approvalPageKey),
        delegateId,
        note: (note || '').trim(),
        fromDate: formData.fromDate,
        toDate: formData.toDate,
      };
      setAssignments((prev) => [...prev, newRow]);
    }

    // Reset draft inputs, toggle to other page if possible
    setDraftAssignment((prev) => ({
      approvalPageKey: prev.approvalPageKey === 'VENDOR_APPROVAL' ? 'PR_APPROVAL' : 'VENDOR_APPROVAL',
      delegateId: '',
      note: '',
    }));
    setErrors((prev) => ({ ...prev, assignmentDraft: null, assignments: null }));
    return true;
  }, [draftAssignment, formData.delegatorId, formData.fromDate, formData.toDate, currentUserId, assignments, editingAssignmentId]);

  // Remove assignment line item
  const removeAssignment = useCallback(
    (idToRemove) => {
      setAssignments((prev) => prev.filter((a) => a.id !== idToRemove));
      if (editingAssignmentId === idToRemove) {
        setEditingAssignmentId(null);
        setDraftAssignment({
          approvalPageKey: 'VENDOR_APPROVAL',
          delegateId: '',
          note: '',
        });
      }
    },
    [editingAssignmentId]
  );

  // Blur handler for inline validation
  const handleBlur = useCallback(
    (e) => {
      const name = e?.target?.name || e;
      if (!name) return;
      setTouched((prev) => ({ ...prev, [name]: true }));
    },
    []
  );

  // Validate form before submission
  const validate = useCallback(() => {
    const newErrors = {};
    const todayISO = getTodayISO();

    if (!formData.fromDate) {
      newErrors.fromDate = 'Start date is required.';
    } else if (!isEdit && formData.fromDate < todayISO) {
      newErrors.fromDate = 'Start date cannot be in the past.';
    }

    if (!formData.toDate) {
      newErrors.toDate = 'End date is required.';
    } else if (formData.fromDate && formData.toDate < formData.fromDate) {
      newErrors.toDate = 'End date cannot be earlier than start date.';
    } else if (formData.toDate < todayISO) {
      newErrors.toDate = 'End date cannot be in the past.';
    }

    if (!formData.reason) {
      newErrors.reason = 'Please select a reason.';
    }

    if (formData.note && formData.note.length > 250) {
      newErrors.note = 'Note cannot exceed 250 characters.';
    }

    if (isEdit) {
      if (!formData.delegateId) {
        newErrors.delegateId = 'Please select a colleague.';
      } else if (String(formData.delegateId) === String(formData.delegatorId)) {
        newErrors.delegateId = 'You cannot delegate work to yourself.';
      }
      if (!formData.approvalPageKey) {
        newErrors.approvalPageKey = 'Please select an approval page.';
      }
    } else {
      if (assignments.length === 0) {
        newErrors.assignments = 'Please add at least one approval page assignment below.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEdit, assignments]);

  // Submit action
  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (isSubmitting) return;

      if (!validate()) {
        toast.error('Please resolve the errors before saving.');
        return;
      }

      setIsSubmitting(true);
      try {
        if (isEdit) {
          await updateDelegation(
            id,
            {
              ...formData,
              approvalPageLabel: getApprovalPageLabel(formData.approvalPageKey),
            },
            currentUserId,
            currentUserRoles
          );
          toast.success('Delegation updated successfully');
        } else {
          await createDelegation(
            {
              delegatorId: currentUserId,
              fromDate: formData.fromDate,
              toDate: formData.toDate,
              reason: formData.reason,
              note: formData.note,
              assignments,
            },
            currentUserId,
            currentUserRoles
          );
          toast.success(
            assignments.length > 1
              ? `${assignments.length} delegations created successfully`
              : 'Delegation created successfully'
          );
        }
        onSuccess?.();
      } catch (err) {
        if (err instanceof ApiError && err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
          toast.error(err.message || 'Please correct the validation errors.');
        } else {
          toast.error(err?.message || (isEdit ? 'Failed to update delegation.' : 'Failed to save delegation.'));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, validate, isEdit, id, formData, currentUserId, currentUserRoles, assignments, onSuccess]
  );

  return {
    isEdit,
    isLoadingRecord,
    loadError,
    formData,
    assignments,
    draftAssignment,
    editingAssignmentId,
    errors,
    touched,
    isSubmitting,
    isAdmin,
    currentUserId,
    setFieldValue,
    setDraftValue,
    addAssignment,
    removeAssignment,
    startEditAssignment,
    cancelEditAssignment,
    handleBlur,
    handleSubmit,
  };
}
