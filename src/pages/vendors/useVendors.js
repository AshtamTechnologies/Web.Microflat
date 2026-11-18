import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { mockVendors } from '../../mocks/vendors';
import { getActiveVendorVersion } from '../../utils/vendorVersions';
import { getTodayISO } from '../../utils/dateUtils';
import { vendorService, isMockApi } from '../../services';
import { normalizeApprovalStatus, ApprovalStatus } from '../../constants/approvalStatus';

let nextSeqNumber = mockVendors.length + 1;
let nextIdNumber = mockVendors.length + 1;

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

export function useVendors() {
  const location = useLocation();
  const [hasRequestedVendors, setHasRequestedVendors] = useState(false);
  const isVendorsRoute = Boolean(
    location?.pathname?.startsWith('/vendors') ||
    location?.pathname?.startsWith('/approvals/vendors')
  );
  const shouldFetch = isVendorsRoute || hasRequestedVendors;

  const ensureVendorsLoaded = useCallback(() => {
    setHasRequestedVendors(true);
  }, []);

  const [vendors, setVendors] = useState(isMockApi ? mockVendors : []);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [hasPendingChangeFilter, setHasPendingChangeFilter] = useState('ALL');
  const [hasDefaultedFieldsFilter, setHasDefaultedFieldsFilter] = useState('ALL');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(isMockApi ? mockVendors.length : 0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(!isMockApi);

  /* ── Debounce search input (300ms) ── */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  /* ── Reset page to 1 when filters or search change ── */
  const isInitialFilterMount = useRef(true);
  useEffect(() => {
    if (isInitialFilterMount.current) {
      isInitialFilterMount.current = false;
      return;
    }
    setPageNumber(1);
  }, [debouncedSearch, approvalFilter, statusFilter, categoryFilter, hasPendingChangeFilter, hasDefaultedFieldsFilter]);

  /* ── Load Vendors from real API with fallback ── */
  const loadVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await vendorService.listVendors({
        search: debouncedSearch,
        approvalStatus: approvalFilter,
        isActive: statusFilter,
        vendorCategory: categoryFilter,
        hasPendingChange: hasPendingChangeFilter !== 'ALL' ? hasPendingChangeFilter === 'TRUE' : undefined,
        hasDefaultedFields: hasDefaultedFieldsFilter !== 'ALL' ? hasDefaultedFieldsFilter === 'TRUE' : undefined,
        pageNumber,
        pageSize,
      });
      if (res && Array.isArray(res.items)) {
        setVendors(res.items);
        setTotalCount(res.totalCount ?? res.items.length);
        setTotalPages(res.totalPages || (pageSize > 0 ? Math.ceil((res.totalCount ?? res.items.length) / pageSize) : 1));
      }
    } catch (err) {
      console.warn('Could not fetch vendors from API, keeping existing state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, approvalFilter, statusFilter, categoryFilter, hasPendingChangeFilter, hasDefaultedFieldsFilter, pageNumber, pageSize]);

  useEffect(() => {
    if (!shouldFetch) return;
    loadVendors();
  }, [shouldFetch, loadVendors]);

  /* ── Augmented vendors list with activeVersion spread ── */
  const augmentedVendors = useMemo(() => {
    return vendors.map((v) => {
      const activeVersion = getActiveVendorVersion(v);
      return {
        ...v,
        vendorCategory: v.vendorCategory || activeVersion?.vendorCategory || '',
        tallyGroup: v.tallyGroup || '',
        tallyLedgerName: v.tallyLedgerName || '',
        tallySubGroup: v.tallySubGroup || '',
        hasDefaultedFields: Boolean(v.hasDefaultedFields),
        ...(activeVersion
          ? {
              effectiveDate: activeVersion.effectiveDate || v.effectiveDate,
              contactPersonName: activeVersion.contactPersonName || v.contactPersonName,
              phoneNo: activeVersion.phoneNo || v.phoneNo,
              alternatePhoneNo: activeVersion.alternatePhoneNo || v.alternatePhoneNo,
              gstNo: activeVersion.gstNo || v.gstNo,
              panNo: activeVersion.panNo || v.panNo || '',
              cin: activeVersion.cin || v.cin || '',
              udhyamNo: activeVersion.udhyamNo || v.udhyamNo || '',
              msmeType: activeVersion.msmeType || v.msmeType || '',
              msmeActivity: activeVersion.msmeActivity || v.msmeActivity || '',
              ccEmail: activeVersion.ccEmail || v.ccEmail || '',
              website: activeVersion.website || v.website,
              email: activeVersion.email || v.email,
              countryId: activeVersion.countryId || v.countryId,
              stateId: activeVersion.stateId || v.stateId,
              city: activeVersion.city || v.city,
              zipCode: activeVersion.zipCode || v.zipCode,
              address1: activeVersion.address1 || v.address1,
              address2: activeVersion.address2 || v.address2,
              notes: activeVersion.notes || v.notes,
              defaultedFields: activeVersion.defaultedFields || v.defaultedFields || '',
              correctedFields: activeVersion.correctedFields || v.correctedFields || '',
              attachments: activeVersion.attachments || v.attachments || [],
            }
          : {}),
        activeVersion,
        effectiveVersions: v.effectiveVersions || (activeVersion ? [activeVersion] : []),
        id: v.vendorId ?? v.id,
      };
    });
  }, [vendors]);

  /* ── Filtered vendors list ── */
  const filteredVendors = useMemo(() => {
    // When connected to the real backend, the API already applies
    // server-side filtering and server-side pagination.
    if (!isMockApi) {
      return augmentedVendors;
    }

    const q = debouncedSearch.trim().toLowerCase();

    return augmentedVendors.filter((v) => {
      if (q) {
        const matchesQuery =
          v.vendorName?.toLowerCase().includes(q) ||
          v.vendorCode?.toLowerCase().includes(q) ||
          v.contactPersonName?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q) ||
          v.panNo?.toLowerCase().includes(q) ||
          v.gstNo?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (statusFilter !== 'ALL') {
        const isActiveExpected = statusFilter === 'ACTIVE';
        if (v.isActive !== isActiveExpected) {
          return false;
        }
      }

      if (approvalFilter !== 'ALL') {
        const filterCode = typeof approvalFilter === 'number'
          ? approvalFilter
          : normalizeApprovalStatus(approvalFilter);
        const itemCode = typeof v.approvalStatus === 'number'
          ? v.approvalStatus
          : normalizeApprovalStatus(v.approvalStatus);
        if (itemCode !== filterCode) {
          return false;
        }
      }

      if (categoryFilter !== 'ALL') {
        if ((v.vendorCategory || '').toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      if (hasPendingChangeFilter !== 'ALL') {
        const expected = hasPendingChangeFilter === 'TRUE';
        if (Boolean(v.hasPendingChange) !== expected) {
          return false;
        }
      }

      if (hasDefaultedFieldsFilter !== 'ALL') {
        const expected = hasDefaultedFieldsFilter === 'TRUE';
        if (Boolean(v.hasDefaultedFields) !== expected) {
          return false;
        }
      }

      return true;
    });
  }, [augmentedVendors, debouncedSearch, statusFilter, approvalFilter, categoryFilter, hasPendingChangeFilter, hasDefaultedFieldsFilter]);

  /* ── Reset all filters ── */
  const resetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setApprovalFilter('ALL');
    setCategoryFilter('ALL');
    setHasPendingChangeFilter('ALL');
    setHasDefaultedFieldsFilter('ALL');
    setPageNumber(1);
  }, []);

  /* ── Get single vendor by id ── */
  const getVendorById = useCallback(
    (id) => {
      const cleanId = String(id).replace(/^ver_/, '').split('_')[0];
      const match = augmentedVendors.find(
        (v) =>
          String(v.id) === String(id) ||
          String(v.vendorId) === String(id) ||
          String(v.id) === cleanId ||
          String(v.vendorId) === cleanId
      );
      return match || null;
    },
    [augmentedVendors]
  );

  /* ── Fetch single vendor from API asynchronously ── */
  const fetchVendorDetail = useCallback(async (id) => {
    try {
      const detail = await vendorService.getVendor(id);
      return detail;
    } catch (err) {
      console.warn('Failed to fetch vendor detail from API, using cached:', err);
      return getVendorById(id);
    }
  }, [getVendorById]);

  /* ── Auto-generate next vendor code ── */
  const getNextVendorCode = useCallback(() => {
    const code = `VEN-${String(nextSeqNumber).padStart(4, '0')}`;
    return code;
  }, []);

  /* ── Create Vendor ── */
  const createVendor = useCallback(async (formData, submitForApproval = true) => {
    setIsLoading(true);
    const now = formatAuditTimestamp();
    const vendorCode = formData.vendorCode?.trim() || `VEN-${String(nextSeqNumber).padStart(4, '0')}`;
    nextSeqNumber += 1;

    try {
      // 1. Try real API
      const created = await vendorService.createVendor(
        formData,
        submitForApproval
      );

      if (created) {
        setVendors((prev) => [created, ...prev]);
        toast.success('Vendor registered successfully.');
        return { ok: true, vendor: created };
      }
    } catch (err) {
      // If server returned any HTTP error response (400, 404, 409, 422, 500, etc.)
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);
      const errorMsg = err?.message || err?.detail || 'Validation error from server.';

      if (status && status > 0) {
        toast.error(errorMsg);
        return {
          ok: false,
          error: errorMsg,
          status,
          fieldErrors: err?.fieldErrors || {},
        };
      }

      console.warn('POST /api/vendors network error or offline, saving locally:', err);
      // Fallback local creation only when completely offline
      const initialVersion = {
        id: `ver_${Date.now()}`,
        effectiveDate: formData.effectiveDate || getTodayISO(),
        contactPersonName: formData.contactPersonName?.trim() || '',
        phoneNo: formData.phoneNo?.trim() || '',
        alternatePhoneNo: formData.alternatePhoneNo?.trim() || '',
        gstNo: formData.gstNo?.trim().toUpperCase() || '',
        website: formData.website?.trim() || '',
        email: formData.email?.trim() || '',
        countryId: formData.countryId || 2,
        stateId: formData.stateId || '',
        city: formData.city?.trim() || '',
        zipCode: formData.zipCode?.trim() || '',
        address1: formData.address1?.trim() || '',
        address2: formData.address2?.trim() || '',
        notes: formData.notes?.trim() || '',
        attachments: formData.attachments || [],
        createdOn: now,
        createdBy: 'Current User',
      };

      const newVendor = {
        id: `v${nextIdNumber++}`,
        vendorCode,
        vendorName: formData.vendorName.trim(),
        isActive: formData.isActive !== false,
        approvalStatus: submitForApproval ? 'Pending' : 'Draft',
        createdBy: 'Current User',
        createdOn: now,
        attachments: formData.attachments || [],
        effectiveVersions: [initialVersion],
      };

      setVendors((prev) => [newVendor, ...prev]);
      toast.success('Vendor saved successfully.');
      return { ok: true, vendor: newVendor };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ── Update Vendor (Name & Version Lifecycle) ── */
  const updateUserVendor = useCallback(async (id, formData) => {
    setIsLoading(true);
    const now = formatAuditTimestamp();
    const todayIso = new Date().toISOString().slice(0, 10);
    try {
      // If vendor name or category was changed, call PUT /api/vendors/{id}
      if (formData.vendorName || formData.vendorCategory) {
        await vendorService.updateVendorName(id, {
          vendorName: formData.vendorName,
          vendorCategory: formData.vendorCategory,
        });
      }

      // If active status was changed, call PATCH /api/vendors/{id}/status
      if (formData.isActive !== undefined) {
        await vendorService.updateVendorStatus(id, {
          isActive: formData.isActive,
          inactiveDate: !formData.isActive
            ? (formData.inactiveDate ? String(formData.inactiveDate).slice(0, 10) : todayIso)
            : null,
          inactiveComment: !formData.isActive ? (formData.inactiveComment || '') : '',
        });
      }

      // If operational details changed on an existing vendor, start a new version
      if (formData.contactPersonName || formData.phoneNo || formData.address1) {
        await vendorService.createVendorVersion(id, formData, true, true);
      }

      setVendors((prev) =>
        prev.map((v) => {
          if (String(v.id) !== String(id) && String(v.vendorId) !== String(id)) return v;
          return {
            ...v,
            ...formData,
            lastUpdatedOn: now,
          };
        })
      );

      toast.success('Vendor updated successfully.');
      return { ok: true };
    } catch (err) {
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);
      const errorMsg = err?.message || err?.detail || 'Failed to update vendor on server.';

      if (status && status > 0) {
        toast.error(errorMsg);
        return {
          ok: false,
          error: errorMsg,
          status,
          fieldErrors: err?.fieldErrors || {},
        };
      }

      console.warn('API update network error, updating local state:', err);
      setVendors((prev) =>
        prev.map((v) => {
          if (String(v.id) !== String(id) && String(v.vendorId) !== String(id)) return v;
          return {
            ...v,
            ...formData,
            lastUpdatedOn: now,
          };
        })
      );
      toast.success('Vendor updated.');
      return { ok: true };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ── Update Vendor Versions ── */
  const updateVendorVersions = useCallback(async (vendorId, newVersionsArray, extraFields = {}) => {
    const now = formatAuditTimestamp();
    setVendors((prev) =>
      prev.map((v) => {
        if (String(v.id) !== String(vendorId) && String(v.vendorId) !== String(vendorId)) return v;
        return {
          ...v,
          ...extraFields,
          effectiveVersions: newVersionsArray,
          lastUpdatedOn: now,
        };
      })
    );
    return { ok: true };
  }, []);

  /* ── Toggle isActive with mandatory comment ── */
  const toggleStatus = useCallback(async (id, inactiveComment = '') => {
    const vendor = vendors.find(
      (v) => String(v.id) === String(id) || String(v.vendorId) === String(id)
    );
    if (!vendor) return;

    const nextIsActive = !vendor.isActive;
    const now = formatAuditTimestamp();
    const todayIso = new Date().toISOString().slice(0, 10);

    try {
      await vendorService.updateVendorStatus(id, {
        isActive: nextIsActive,
        inactiveDate: !nextIsActive ? todayIso : null,
        inactiveComment: !nextIsActive ? inactiveComment : '',
      });
    } catch (err) {
      console.warn('PATCH /api/vendors/{id}/status failed, applying locally:', err);
    }

    setVendors((prev) =>
      prev.map((v) => {
        if (String(v.id) !== String(id) && String(v.vendorId) !== String(id)) return v;
        return {
          ...v,
          isActive: nextIsActive,
          inactiveComment: nextIsActive ? '' : (inactiveComment?.trim() || v.inactiveComment || ''),
          inactiveDate: nextIsActive ? null : now,
          lastUpdatedOn: now,
        };
      })
    );

    toast.success(
      `${vendor.vendorName} marked ${nextIsActive ? 'Active' : 'Inactive'}.`
    );
  }, [vendors]);

  /* ── Delete Vendor ── */
  const deleteVendor = useCallback(async (id) => {
    try {
      await vendorService.deleteVendor(id);
    } catch (err) {
      console.warn('DELETE /api/vendors/{id} failed, deleting locally:', err);
    }
    const vendor = vendors.find(
      (v) => String(v.id) === String(id) || String(v.vendorId) === String(id)
    );
    setVendors((prev) =>
      prev.filter((v) => String(v.id) !== String(id) && String(v.vendorId) !== String(id))
    );
    if (vendor) {
      toast.success(`${vendor.vendorName} deleted.`);
    }
  }, [vendors]);

  return {
    vendors: filteredVendors,
    allVendors: augmentedVendors,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    approvalFilter,
    setApprovalFilter,
    categoryFilter,
    setCategoryFilter,
    hasPendingChangeFilter,
    setHasPendingChangeFilter,
    hasDefaultedFieldsFilter,
    setHasDefaultedFieldsFilter,
    resetFilters,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    getVendorById,
    fetchVendorDetail,
    getNextVendorCode,
    createVendor,
    updateVendor: updateUserVendor,
    updateVendorVersions,
    toggleStatus,
    deleteVendor,
    isLoading,
    loading: isLoading,
    totalCount,
    refreshVendors: loadVendors,
    ensureVendorsLoaded,
  };
}
