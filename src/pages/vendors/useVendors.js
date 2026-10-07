import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { mockVendors } from '../../mocks/vendors';
import { getActiveVendorVersion } from '../../utils/vendorVersions';

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
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formattedHours}:${minutes} ${ampm}`;
}

export function useVendors() {
  const [vendors, setVendors] = useState(mockVendors);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');

  /* ── Augmented vendors list with activeVersion spread ── */
  const augmentedVendors = useMemo(() => {
    return vendors.map((v) => {
      const activeVersion = getActiveVendorVersion(v);
      return {
        ...v,
        ...(activeVersion
          ? {
              effectiveDate: activeVersion.effectiveDate,
              contactPersonName: activeVersion.contactPersonName,
              phoneNo: activeVersion.phoneNo,
              alternatePhoneNo: activeVersion.alternatePhoneNo,
              gstNo: activeVersion.gstNo,
              website: activeVersion.website,
              email: activeVersion.email,
              countryId: activeVersion.countryId,
              stateId: activeVersion.stateId,
              city: activeVersion.city,
              zipCode: activeVersion.zipCode,
              address1: activeVersion.address1,
              address2: activeVersion.address2,
              notes: activeVersion.notes,
              attachments: activeVersion.attachments || v.attachments || [],
            }
          : {}),
        activeVersion,
        effectiveVersions: v.effectiveVersions || (activeVersion ? [activeVersion] : []),
        id: v.id, // Preserve vendor header ID
      };
    });
  }, [vendors]);

  /* ── Filtered vendors list ── */
  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();

    return augmentedVendors.filter((v) => {
      // 1. Text Search Filter (VendorName, VendorCode, ContactPersonName, Email, City)
      if (q) {
        const matchesQuery =
          v.vendorName?.toLowerCase().includes(q) ||
          v.vendorCode?.toLowerCase().includes(q) ||
          v.contactPersonName?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        const isActiveExpected = statusFilter === 'ACTIVE';
        if (v.isActive !== isActiveExpected) {
          return false;
        }
      }

      // 3. Approval Status Filter
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
  const getVendorById = useCallback((id) => {
    return augmentedVendors.find((v) => v.id === id);
  }, [augmentedVendors]);

  /* ── Auto-generate next vendor code ── */
  const getNextVendorCode = useCallback(() => {
    const code = `VEN-${String(nextSeqNumber).padStart(4, '0')}`;
    return code;
  }, []);

  /* ── Create Vendor (mock async) ── */
  const createVendor = useCallback(async (formData) => {
    await new Promise((r) => setTimeout(r, 700));

    const now = formatAuditTimestamp();
    const vendorCode = formData.vendorCode?.trim() || `VEN-${String(nextSeqNumber).padStart(4, '0')}`;
    nextSeqNumber += 1;

    const effectiveDate = formData.effectiveDate || new Date().toISOString().slice(0, 10);

    const initialVersion = {
      id: `ver_${Date.now()}`,
      effectiveDate,
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
      createdBy: 'Ian Chesnut',
    };

    const effectiveVersions = formData.effectiveVersions && formData.effectiveVersions.length > 0
      ? formData.effectiveVersions
      : [initialVersion];

    const newVendor = {
      id: `v${nextIdNumber++}`,
      vendorCode,
      vendorName: formData.vendorName.trim(),
      isActive: formData.isActive !== undefined ? formData.isActive : true,
      approvalStatus: 'Pending',
      approvedBy: '',
      approvedByComments: '',
      approvedOn: '',
      createdBy: 'Ian Chesnut',
      createdOn: now,
      lastUpdatedBy: 'Ian Chesnut',
      lastUpdatedOn: now,
      attachments: formData.attachments || [],
      effectiveVersions,
    };

    setVendors((prev) => [newVendor, ...prev]);
    toast.success('Vendor created successfully.');
    return { ok: true, vendor: newVendor };
  }, []);

  /* ── Update Vendor (mock async) ── */
  const updateUserVendor = useCallback(async (id, formData) => {
    await new Promise((r) => setTimeout(r, 700));

    const now = formatAuditTimestamp();
    let updatedRecord = null;

    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        updatedRecord = {
          ...v,
          ...formData,
          effectiveVersions: formData.effectiveVersions || v.effectiveVersions || [],
          lastUpdatedBy: 'Ian Chesnut',
          lastUpdatedOn: now,
        };
        return updatedRecord;
      })
    );

    toast.success('Vendor updated successfully.');
    return { ok: true, vendor: updatedRecord };
  }, []);

  /* ── Update Vendor Versions ── */
  const updateVendorVersions = useCallback(async (vendorId, newVersionsArray, extraFields = {}) => {
    const now = formatAuditTimestamp();
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== vendorId) return v;
        return {
          ...v,
          ...extraFields,
          effectiveVersions: newVersionsArray,
          lastUpdatedBy: 'Ian Chesnut',
          lastUpdatedOn: now,
        };
      })
    );
    return { ok: true };
  }, []);

  /* ── Toggle isActive ── */
  const toggleStatus = useCallback((id) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const next = { ...v, isActive: !v.isActive };
        toast.success(
          `${next.vendorName} marked ${next.isActive ? 'Active' : 'Inactive'}.`
        );
        return next;
      })
    );
  }, []);

  /* ── Delete Vendor ── */
  const deleteVendor = useCallback((id) => {
    const vendor = vendors.find((v) => v.id === id);
    setVendors((prev) => prev.filter((v) => v.id !== id));
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
    getNextVendorCode,
    createVendor,
    updateVendor: updateUserVendor,
    updateVendorVersions,
    toggleStatus,
    deleteVendor,
  };
}
