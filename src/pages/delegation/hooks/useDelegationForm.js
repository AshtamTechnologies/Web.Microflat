/**
 * useDelegationForm.js — Manages delegation form state, API lookups, candidate lists,
 * assignment line-items, and submission.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  createDelegation,
  updateDelegation,
  getDelegation,
  getDelegationLookups,
  getDelegatorCandidates,
  getDelegateCandidates,
} from '../../../services/delegation/delegationService';
import { getTodayISO } from '../../../utils/dateUtils';
import { useAuthContext } from '../../../context/AuthContext';
import { ApiError } from '../../../utils/apiError';
import { DELEGATION_REASONS } from '../../../constants/delegation';

let tempAssignmentCounter = 1;

function mapBackendFieldErrors(fieldErrors = {}) {
  const mapped = {};
  Object.entries(fieldErrors).forEach(([key, msg]) => {
    const lower = key.charAt(0).toLowerCase() + key.slice(1);
    mapped[lower] = msg;
    if (lower === 'delegatorUserId') mapped.delegatorUserId = msg;
    if (lower === 'startDate') mapped.startDate = msg;
    if (lower === 'endDate') mapped.endDate = msg;
    if (lower === 'reason') mapped.reason = msg;
    if (lower === 'assignments' || lower.startsWith('assignments[')) {
      mapped.assignments = msg;
    }
  });
  return mapped;
}

/**
 * Hook to manage Delegation form state, approval assignments, and submission.
 *
 * @param {{ id?: string, onSuccess?: () => void, onClose?: () => void }} options
 * @returns {object}
 */
export function useDelegationForm({ id, onSuccess } = {}) {
  const isEdit = Boolean(id);
  const { user } = useAuthContext();
  const currentUserId = user?.id || user?.userId || '';
  const currentUserRoles = useMemo(() => user?.roles || [], [user?.roles]);

  const today = getTodayISO();

  const [formData, setFormData] = useState({
    delegatorUserId: currentUserId ? String(currentUserId) : '',
    startDate: today,
    endDate: today,
    reason: '',
    status: 'Upcoming',
    canEdit: true,
  });

  const [assignments, setAssignments] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  const [draftAssignment, setDraftAssignment] = useState({
    moduleId: '',
    delegateUserId: '',
    note: '',
  });

  const [approvalPages, setApprovalPages] = useState([]);
  const [suggestedReasons, setSuggestedReasons] = useState(DELEGATION_REASONS);
  const [delegatorCandidates, setDelegatorCandidates] = useState([]);
  const [delegateCandidates, setDelegateCandidates] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [delegatesLoading, setDelegatesLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);

  const isAdmin = useMemo(() => {
    const roles = Array.isArray(currentUserRoles) ? currentUserRoles : [currentUserRoles];
    return roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.roleName || r?.name || '';
      const norm = name.trim().toLowerCase();
      return norm === 'admin' || norm === 'super admin';
    });
  }, [currentUserRoles]);

  // Load lookups & delegator candidates on mount
  useEffect(() => {
    let isCurrent = true;

    async function loadLookups() {
      setLookupsLoading(true);
      try {
        const [lookupsRes, delegatorsRes] = await Promise.all([
          getDelegationLookups(),
          getDelegatorCandidates(),
        ]);

        if (!isCurrent) return;

        const pages = lookupsRes.approvalPages || [];
        setApprovalPages(pages);

        if (lookupsRes.suggestedReasons?.length > 0) {
          setSuggestedReasons(lookupsRes.suggestedReasons);
        }

        setDelegatorCandidates(delegatorsRes || []);

        if (!isEdit) {
          setFormData((prev) => {
            if (prev.delegatorUserId) return prev;
            const preferred =
              delegatorsRes.find((u) => String(u.userId) === String(currentUserId)) ||
              delegatorsRes[0];
            return {
              ...prev,
              delegatorUserId: preferred ? String(preferred.userId) : prev.delegatorUserId,
            };
          });
        }
      } catch (err) {
        if (isCurrent) {
          toast.error(err?.message || 'Failed to load delegation options.');
        }
      } finally {
        if (isCurrent) setLookupsLoading(false);
      }
    }

    loadLookups();
    return () => {
      isCurrent = false;
    };
  }, [isEdit, currentUserId]);

  // Load delegate candidates whenever delegatorUserId changes
  useEffect(() => {
    if (!formData.delegatorUserId) {
      return;
    }

    let isCurrent = true;
    async function loadDelegates() {
      setDelegatesLoading(true);
      try {
        const list = await getDelegateCandidates({
          delegatorUserId: formData.delegatorUserId,
        });
        if (isCurrent) {
          setDelegateCandidates(list || []);
        }
      } catch (err) {
        if (isCurrent) {
          toast.error(err?.message || 'Failed to load delegate candidates.');
        }
      } finally {
        if (isCurrent) setDelegatesLoading(false);
      }
    }

    loadDelegates();
    return () => {
      isCurrent = false;
    };
  }, [formData.delegatorUserId]);

  // Load existing delegation in Edit mode
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
            delegatorUserId: String(existing.delegatorUserId || ''),
            startDate: existing.startDate || today,
            endDate: existing.endDate || today,
            reason: existing.reason || 'Leave',
            status: existing.status || 'Upcoming',
            canEdit: existing.canEdit !== undefined ? Boolean(existing.canEdit) : true,
          });
          setAssignments(
            (existing.assignments || []).map((a) => ({
              id: a.delegationAssignmentId
                ? `existing-${a.delegationAssignmentId}`
                : `temp-${tempAssignmentCounter++}`,
              delegationAssignmentId: a.delegationAssignmentId ?? null,
              moduleId: String(a.moduleId || ''),
              moduleCode: a.moduleCode || '',
              moduleName: a.moduleName || '',
              delegateUserId: String(a.delegateUserId || ''),
              delegateName: a.delegateName || '',
              delegateEmail: a.delegateEmail || '',
              note: a.note || '',
            }))
          );
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
  }, [id, today]);

  const approvalPageOptions = useMemo(
    () =>
      approvalPages.map((p) => ({
        value: String(p.moduleId),
        label: p.moduleName,
        subLabel: p.approverRoleName ? `Role: ${p.approverRoleName}` : p.moduleCode,
      })),
    [approvalPages]
  );

  const delegatorOptions = useMemo(() => {
    const opts = delegatorCandidates.map((u) => ({
      value: String(u.userId),
      label: u.name,
      subLabel: u.email,
    }));
    const currentIdStr = currentUserId ? String(currentUserId) : '';
    if (currentIdStr && !opts.some((o) => o.value === currentIdStr)) {
      const displayName = user?.name || user?.fullName || user?.userName || 'Current User';
      opts.unshift({
        value: currentIdStr,
        label: displayName,
        subLabel: user?.email || '',
      });
    }
    return opts;
  }, [delegatorCandidates, currentUserId, user]);

  const delegateOptions = useMemo(
    () =>
      delegateCandidates.map((u) => ({
        value: String(u.userId),
        label: u.name,
        subLabel: u.email,
      })),
    [delegateCandidates]
  );

  const reasonOptions = useMemo(
    () =>
      suggestedReasons.map((r) => ({
        value: r,
        label: r,
      })),
    [suggestedReasons]
  );

  const getApprovalPageMeta = useCallback(
    (moduleId) => approvalPages.find((p) => String(p.moduleId) === String(moduleId)) || null,
    [approvalPages]
  );

  const getDelegateMeta = useCallback(
    (userId) => delegateCandidates.find((u) => String(u.userId) === String(userId)) || null,
    [delegateCandidates]
  );

  const setFieldValue = useCallback((name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'startDate' && value && next.toDate && value > next.toDate) {
        next.toDate = value;
      }
      return next;
    });

    if (name === 'delegatorUserId') {
      setDraftAssignment((prev) => ({ ...prev, delegateUserId: '' }));
    }

    setErrors((prev) => ({ ...prev, [name]: null }));
  }, []);

  const setDraftValue = useCallback((name, value) => {
    setDraftAssignment((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, assignmentDraft: null }));
  }, []);

  const startEditAssignment = useCallback((item) => {
    setEditingAssignmentId(item.id);
    setDraftAssignment({
      moduleId: String(item.moduleId),
      delegateUserId: String(item.delegateUserId),
      note: item.note || '',
    });
    setErrors((prev) => ({ ...prev, assignmentDraft: null }));
  }, []);

  const cancelEditAssignment = useCallback(() => {
    setEditingAssignmentId(null);
    setDraftAssignment({
      moduleId: '',
      delegateUserId: '',
      note: '',
    });
    setErrors((prev) => ({ ...prev, assignmentDraft: null }));
  }, []);

  const addAssignment = useCallback(() => {
    const { moduleId, delegateUserId, note } = draftAssignment;

    if (!moduleId) {
      setErrors((prev) => ({ ...prev, assignmentDraft: 'Please select an approval page.' }));
      return false;
    }

    if (!delegateUserId) {
      setErrors((prev) => ({
        ...prev,
        assignmentDraft: 'Please select a colleague for this approval page.',
      }));
      return false;
    }

    if (String(delegateUserId).trim() === String(formData.delegatorUserId).trim()) {
      setErrors((prev) => ({ ...prev, assignmentDraft: 'You cannot delegate work to yourself.' }));
      return false;
    }

    if (note && note.length > 250) {
      setErrors((prev) => ({
        ...prev,
        assignmentDraft: 'Note for the delegate cannot exceed 250 characters.',
      }));
      return false;
    }

    const pageMeta = getApprovalPageMeta(moduleId);
    const delegateMeta = getDelegateMeta(delegateUserId);
    const moduleLabel = pageMeta?.moduleName || `Module #${moduleId}`;

    const exists = assignments.some(
      (a) => a.id !== editingAssignmentId && String(a.moduleId) === String(moduleId)
    );
    if (exists) {
      setErrors((prev) => ({
        ...prev,
        assignmentDraft: `An assignment for "${moduleLabel}" has already been added below.`,
      }));
      return false;
    }

    if (editingAssignmentId) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingAssignmentId
            ? {
                ...a,
                moduleId: String(moduleId),
                moduleCode: pageMeta?.moduleCode || a.moduleCode || '',
                moduleName: moduleLabel,
                delegateUserId: String(delegateUserId),
                delegateName: delegateMeta?.name || a.delegateName || '',
                delegateEmail: delegateMeta?.email || a.delegateEmail || '',
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
        delegationAssignmentId: null,
        moduleId: String(moduleId),
        moduleCode: pageMeta?.moduleCode || '',
        moduleName: moduleLabel,
        delegateUserId: String(delegateUserId),
        delegateName: delegateMeta?.name || '',
        delegateEmail: delegateMeta?.email || '',
        note: (note || '').trim(),
      };
      setAssignments((prev) => [...prev, newRow]);
    }

    setDraftAssignment({
      moduleId: '',
      delegateUserId: '',
      note: '',
    });
    setErrors((prev) => ({ ...prev, assignmentDraft: null, assignments: null }));
    return true;
  }, [
    draftAssignment,
    formData.delegatorUserId,
    assignments,
    editingAssignmentId,
    getApprovalPageMeta,
    getDelegateMeta,
  ]);

  const removeAssignment = useCallback(
    (idToRemove) => {
      setAssignments((prev) => prev.filter((a) => a.id !== idToRemove));
      if (editingAssignmentId === idToRemove) {
        setEditingAssignmentId(null);
        setDraftAssignment({
          moduleId: '',
          delegateUserId: '',
          note: '',
        });
      }
    },
    [editingAssignmentId]
  );

  const handleBlur = useCallback((e) => {
    const name = e?.target?.name || e;
    if (!name) return;
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const isInForceEdit = isEdit && formData.status === 'InForce';

  const validate = useCallback(() => {
    const newErrors = {};
    const todayISO = getTodayISO();

    if (!formData.delegatorUserId) {
      newErrors.delegatorUserId = 'Delegating user is required.';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required.';
    } else if (!isEdit && formData.startDate < todayISO) {
      newErrors.startDate = 'Start date cannot be in the past.';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required.';
    } else if (formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date cannot be earlier than start date.';
    } else if (formData.endDate < todayISO) {
      newErrors.endDate = 'End date cannot be in the past.';
    }

    if (!formData.reason || !String(formData.reason).trim()) {
      newErrors.reason = 'Please select a reason.';
    }

    if (assignments.length === 0) {
      newErrors.assignments = 'Please add at least one approval page assignment below.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEdit, assignments]);

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
        const payload = {
          delegatorUserId: formData.delegatorUserId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason,
          assignments,
        };

        if (isEdit) {
          await updateDelegation(id, payload);
          toast.success('Delegation updated successfully');
        } else {
          await createDelegation(payload);
          toast.success('Delegation created successfully');
        }
        onSuccess?.();
      } catch (err) {
        if (err instanceof ApiError && err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          const mapped = mapBackendFieldErrors(err.fieldErrors);
          setErrors((prev) => ({ ...prev, ...mapped }));
          toast.error(err.message || 'Please correct the validation errors.');
        } else {
          toast.error(
            err?.message || (isEdit ? 'Failed to update delegation.' : 'Failed to save delegation.')
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, validate, isEdit, id, formData, assignments, onSuccess]
  );

  return {
    isEdit,
    isInForceEdit,
    isLoadingRecord,
    lookupsLoading,
    delegatesLoading,
    loadError,
    formData,
    assignments,
    draftAssignment,
    editingAssignmentId,
    approvalPages,
    approvalPageOptions,
    delegatorOptions,
    delegateOptions,
    reasonOptions,
    errors,
    touched,
    isSubmitting,
    isAdmin,
    currentUserId,
    getApprovalPageMeta,
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
