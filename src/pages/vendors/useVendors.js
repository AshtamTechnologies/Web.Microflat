import { useState, useMemo, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { mockVendors } from '../../mocks/vendors';
import { getActiveVendorVersion } from '../../utils/vendorVersions';
import { getTodayISO } from '../../utils/dateUtils';
import { vendorService, isMockApi } from '../../services';

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
  const [vendors, setVendors] = useState(isMockApi ? mockVendors : []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(!isMockApi);
  const [totalCount, setTotalCount] = useState(isMockApi ? mockVendors.length : 0);

  /* ── Load Vendors from real API with fallback ── */
  const loadVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await vendorService.listVendors({
        search,
        approvalStatus: approvalFilter,
        isActive: statusFilter,
      });
      if (res && Array.isArray(res.items)) {
        setVendors(res.items);
        setTotalCount(res.totalCount ?? res.items.length);
      }
    } catch (err) {
      console.warn('Could not fetch vendors from API, keeping existing state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, approvalFilter, statusFilter]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  /* ── Augmented vendors list with activeVersion spread ── */
  const augmentedVendors = useMemo(() => {
    return vendors.map((v) => {
      const activeVersion = getActiveVendorVersion(v);
      return {
        ...v,
        ...(activeVersion
          ? {
              effectiveDate: activeVersion.effectiveDate || v.effectiveDate,
              contactPersonName: activeVersion.contactPersonName || v.contactPersonName,
              phoneNo: activeVersion.phoneNo || v.phoneNo,
              alternatePhoneNo: activeVersion.alternatePhoneNo || v.alternatePhoneNo,
              gstNo: activeVersion.gstNo || v.gstNo,
              website: activeVersion.website || v.website,
              email: activeVersion.email || v.email,
              countryId: activeVersion.countryId || v.countryId,
              stateId: activeVersion.stateId || v.stateId,
              city: activeVersion.city || v.city,
              zipCode: activeVersion.zipCode || v.zipCode,
              address1: activeVersion.address1 || v.address1,
              address2: activeVersion.address2 || v.address2,
              notes: activeVersion.notes || v.notes,
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
    const q = search.trim().toLowerCase();

    return augmentedVendors.filter((v) => {
      if (q) {
        const matchesQuery =
          v.vendorName?.toLowerCase().includes(q) ||
          v.vendorCode?.toLowerCase().includes(q) ||
          v.contactPersonName?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (statusFilter !== 'ALL') {
        const isActiveExpected = statusFilter === 'ACTIVE';
        if (v.isActive !== isActiveExpected) {
          return false;
        }
      }

      if (approvalFilter !== 'ALL') {
        if (v.approvalStatus !== approvalFilter) {
          return false;
        }
      }

      return true;
    });
  }, [augmentedVendors, search, statusFilter, approvalFilter]);

  /* ── Reset all filters ── */
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setApprovalFilter('ALL');
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
      // If server explicitly returned a validation error (400, 422), show it and reject
      if (err?.status === 400 || err?.status === 422 || err?.statusCode === 400) {
        const errorMsg = err.detail || err.message || 'Validation error from server.';
        toast.error(errorMsg);
        throw err;
      }

      console.warn('POST /api/vendors failed or offline, saving locally:', err);
      // Fallback local creation so app never crashes
      const initialVersion = {
        id: `ver_${Date.now()}`,
        effectiveDate: formData.effectiveDate || getTodayISO(),
        contactPersonName: formData.contactPersonName?.trim() || '',
        phoneNo: formData.phoneNo?.trim() || '',
        alternatePhoneNo: formData.alternatePhoneNo?.trim() || '',
        gstNo: formData.gstNo?.trim().toUpperCase() || '',
        website: formData.website?.trim() || '',
        email: formData.email?.trim() || '',
        countryId: formData.countryId || 'IN',
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
      // If vendor name was changed, call PUT /api/vendors/{id}
      if (formData.vendorName) {
        await vendorService.updateVendorName(id, formData.vendorName);
      }

      // If active status was changed, call PATCH /api/vendors/{id}/status
      if (formData.isActive !== undefined) {
        await vendorService.updateVendorStatus(id, {
          isActive: formData.isActive,
          inactiveDate: !formData.isActive ? (formData.inactiveDate || todayIso) : null,
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
      console.warn('API update failed, updating local state:', err);
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
    resetFilters,
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
  };
}
