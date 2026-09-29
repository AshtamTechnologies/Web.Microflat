/**
 * useVendors — encapsulates all CRUD and state logic for the Vendor Management module.
 */

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { mockVendors } from '../../mocks/vendors';

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

  /* ── Filtered vendors list ── */
  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();

    return vendors.filter((v) => {
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
  }, [vendors, search, statusFilter, approvalFilter]);

  /* ── Reset all filters ── */
  function resetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setApprovalFilter('ALL');
  }

  /* ── Get single vendor by id ── */
  function getVendorById(id) {
    return vendors.find((v) => v.id === id);
  }

  /* ── Auto-generate next vendor code ── */
  function getNextVendorCode() {
    const code = `VEN-${String(nextSeqNumber).padStart(4, '0')}`;
    return code;
  }

  /* ── Create Vendor (mock async) ── */
  async function createVendor(formData) {
    await new Promise((r) => setTimeout(r, 700));

    const now = formatAuditTimestamp();
    const vendorCode = formData.vendorCode?.trim() || getNextVendorCode();
    nextSeqNumber += 1;

    const newVendor = {
      id: `v${nextIdNumber++}`,
      vendorCode,
      effectiveDate: formData.effectiveDate || new Date().toISOString().slice(0, 10),
      vendorName: formData.vendorName.trim(),
      contactPersonName: formData.contactPersonName.trim(),
      phoneNo: formData.phoneNo.trim(),
      alternatePhoneNo: formData.alternatePhoneNo?.trim() || '',
      gstNo: formData.gstNo?.trim().toUpperCase() || '',
      email: formData.email.trim(),
      countryId: formData.countryId,
      stateId: formData.stateId,
      city: formData.city.trim(),
      zipCode: formData.zipCode.trim(),
      address1: formData.address1.trim(),
      address2: formData.address2?.trim() || '',
      notes: formData.notes?.trim() || '',
      isActive: formData.isActive !== undefined ? formData.isActive : true,
      approvalStatus: 'Pending',
      approvedBy: '',
      approvedByComments: '',
      approvedOn: '',
      createdBy: 'Ian Chesnut',
      createdOn: now,
      lastUpdatedBy: 'Ian Chesnut',
      lastUpdatedOn: now,
    };

    setVendors((prev) => [newVendor, ...prev]);
    toast.success('Vendor created successfully.');
    return { ok: true, vendor: newVendor };
  }

  /* ── Update Vendor (mock async) ── */
  async function updateUserVendor(id, formData) {
    await new Promise((r) => setTimeout(r, 700));

    const now = formatAuditTimestamp();
    let updatedRecord = null;

    setVendors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        updatedRecord = {
          ...v,
          ...formData,
          gstNo: formData.gstNo ? formData.gstNo.trim().toUpperCase() : v.gstNo,
          lastUpdatedBy: 'Ian Chesnut',
          lastUpdatedOn: now,
        };
        return updatedRecord;
      })
    );

    toast.success('Vendor updated successfully.');
    return { ok: true, vendor: updatedRecord };
  }

  /* ── Toggle isActive ── */
  function toggleStatus(id) {
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
  }

  /* ── Delete Vendor ── */
  function deleteVendor(id) {
    const vendor = vendors.find((v) => v.id === id);
    setVendors((prev) => prev.filter((v) => v.id !== id));
    if (vendor) {
      toast.success(`${vendor.vendorName} deleted.`);
    }
  }

  return {
    vendors: filteredVendors,
    allVendors: vendors,
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
    toggleStatus,
    deleteVendor,
  };
}
