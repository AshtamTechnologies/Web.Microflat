/**
 * VendorApprovalPage — Dedicated review and approval queue for pending vendors.
 *
 * Core Behavior:
 *   - Shows ONLY vendors where approvalStatus === 'Pending' from live VendorsContext.
 *   - Real-time filtered state: As soon as a vendor is approved or rejected, it immediately
 *     disappears from the queue without manual removal logic or page refresh.
 *   - Labeled ghost action buttons: "Approve" (success) and "Reject" (danger).
 *   - Confirmation dialog on Approve according to system standard.
 *   - Redesigned, polished Reject modal with quick-reasons and clear validation.
 *   - Row click navigates to /vendors/:id for full read-only review.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconCheck,
  IconClock,
  IconClose,
  IconFileText,
  IconLocation,
  IconSuccess,
  IconBuilding,
  IconError,
  IconUser,
  IconVendorApproval,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Modal,
  Badge,
  PageHeader,
  Textarea,
  DataTable,
  TableToolbar,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { getStateName } from '../../mocks/vendors';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

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

export default function VendorApprovalPage() {
  const navigate = useNavigate();
  const { allVendors, updateVendor } = useVendorsContext();

  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Modal States
  const [vendorToApprove, setVendorToApprove] = useState(null);
  const [approveComments, setApproveComments] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [vendorToReject, setVendorToReject] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  /* ── Filter all vendors for Pending only & Search query ── */
  const pendingVendors = useMemo(() => {
    return allVendors.filter(
      (v) => (v.approvalStatus || '').toLowerCase() === 'pending'
    );
  }, [allVendors]);

  const filteredPendingVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingVendors;

    return pendingVendors.filter((v) => {
      return (
        v.vendorName?.toLowerCase().includes(q) ||
        v.vendorCode?.toLowerCase().includes(q) ||
        v.contactPersonName?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q)
      );
    });
  }, [pendingVendors, search]);

  const totalPendingCount = pendingVendors.length;
  const hasSearchFilter = Boolean(search.trim());

  /* ── Approve Handler with Confirmation ── */
  function handleOpenApprove(vendor) {
    setVendorToApprove(vendor);
    setApproveComments('');
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setVendorToApprove(null);
    setApproveComments('');
  }

  async function handleConfirmApprove(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!vendorToApprove) return;

    try {
      setIsSubmittingApprove(true);
      const now = formatAuditTimestamp();

      await updateVendor(vendorToApprove.id, {
        approvalStatus: 'Approved',
        approvedOn: now,
        approvedBy: 'Ian Chesnut',
        approvedByComments: approveComments.trim(),
      });

      toast.success(`${vendorToApprove.vendorName} approved successfully`);
      handleCloseApprove();
    } catch {
      toast.error('Failed to approve vendor. Please try again.');
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  /* ── Reject Modal Handlers ── */
  function handleOpenReject(vendor) {
    setVendorToReject(vendor);
    setRejectComments('');
  }

  function handleCloseReject() {
    if (isSubmittingReject) return;
    setVendorToReject(null);
    setRejectComments('');
  }

  async function handleConfirmReject(e) {
    e.preventDefault();
    if (!vendorToReject || !rejectComments.trim()) return;

    try {
      setIsSubmittingReject(true);
      const now = formatAuditTimestamp();

      await updateVendor(vendorToReject.id, {
        approvalStatus: 'Rejected',
        approvedOn: now,
        approvedBy: 'Ian Chesnut',
        approvedByComments: rejectComments.trim(),
      });

      toast.success(`${vendorToReject.vendorName} rejected`);
      handleCloseReject();
    } catch {
      toast.error('Failed to reject vendor. Please try again.');
    } finally {
      setIsSubmittingReject(false);
    }
  }

  /* ── TanStack Table Columns ── */
  const columns = useMemo(
    () => [
      /* 1. VENDOR CODE */
      columnHelper.accessor('vendorCode', {
        header: 'VENDOR CODE',
        minSize: 130,
        size: 150,
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {info.getValue() || '—'}
          </span>
        ),
      }),

      /* 2. VENDOR NAME & CONTACT PERSON (Two-line stack) */
      columnHelper.accessor('vendorName', {
        header: 'VENDOR & CONTACT',
        minSize: 220,
        size: 280,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <span className="font-semibold text-heading text-sm leading-snug">
                {row.vendorName}
              </span>
              <span className="text-text-muted text-xs leading-normal">
                {row.contactPersonName ? `Contact: ${row.contactPersonName}` : 'No contact person'}
              </span>
            </div>
          );
        },
      }),

      /* 3. CITY / STATE */
      columnHelper.accessor('city', {
        header: 'CITY / STATE',
        minSize: 150,
        size: 180,
        cell: (info) => {
          const row = info.row.original;
          const state = getStateName(row.countryId, row.stateId);
          return (
            <div className="flex items-center gap-1.5 text-xs text-heading">
              <IconLocation size={13} className="text-text-muted shrink-0" aria-hidden="true" />
              <span className="truncate">
                {row.city ? `${row.city}, ${state}` : state || '—'}
              </span>
            </div>
          );
        },
      }),

      /* 4. SUBMITTED ON */
      columnHelper.accessor((row) => row.effectiveDate || row.createdOn, {
        id: 'submittedOn',
        header: 'SUBMITTED ON',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const val = info.getValue();
          return (
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono tabular-nums">
              <IconClock size={13} className="text-text-muted/70 shrink-0" aria-hidden="true" />
              <span>{formatDate(val)}</span>
            </div>
          );
        },
      }),

      /* 5. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 300,
        size: 310,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;

          return (
            <div
              className="flex items-center justify-end gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* View Button */}
              <Button
                type="button"
                variant="primary-soft"
                size="sm"
                onClick={() =>
                  navigate(`/vendors/${row.id}/effective-dates`, {
                    state: { from: '/approvals/vendors', backLabel: 'Vendor Approval', readOnly: true },
                  })
                }
                className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`View ${row.vendorName}`}
              >
                <IconView size={14} className="" aria-hidden="true" />
                View
              </Button>

              {/* Approve Button */}
              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={() => handleOpenApprove(row)}
                className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`Approve ${row.vendorName}`}
              >
                <IconCheck size={14} className="" aria-hidden="true" />
                Approve
              </Button>

              {/* Reject Button */}
              <Button
                type="button"
                variant="danger-soft"
                size="sm"
                onClick={() => handleOpenReject(row)}
                className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`Reject ${row.vendorName}`}
              >
                <IconClose size={14} className="" aria-hidden="true" />
                Reject
              </Button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredPendingVendors,
    columns,
    state: { sorting, columnSizing, pagination },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });



  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Vendor Approval"
        subtitle="Vendors awaiting review. Click the View button to inspect complete vendor documentation before deciding."
        icon={<IconVendorApproval className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <Badge variant="pending" size="sm" className="ml-2 gap-1">
            <IconClock size={12} className="shrink-0" />
            {totalPendingCount} pending
          </Badge>
        }
      />

      {/* ── Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by vendor name, code, contact person, or city..."
        hasActiveFilters={hasSearchFilter}
        onReset={() => setSearch('')}
      >
        <div className="text-xs text-text-muted flex items-center gap-1.5 self-end sm:self-center">
          <IconFileText size={13} className="text-primary" />
          <span>Showing queue of pending submissions</span>
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        totalCount={filteredPendingVendors.length}
        entityName="pending vendors"
        emptyTitle={
          hasSearchFilter
            ? 'No matching pending vendors'
            : 'All vendor submissions reviewed'
        }
        emptyDescription={
          hasSearchFilter
            ? `No pending vendors match "${search}". Try adjusting your query.`
            : 'There are currently no vendors awaiting approval in the queue.'
        }
        emptyAction={
          hasSearchFilter ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              className="text-xs text-primary"
            >
              Clear search
            </Button>
          ) : null
        }
        renderMobileCard={(row) => {
          const vendor = row.original;
          return (
            <div
              key={vendor.id}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold text-primary">
                    {vendor.vendorCode}
                  </span>
                  <h3 className="text-sm font-semibold text-heading leading-tight mt-0.5">
                    {vendor.vendorName}
                  </h3>
                </div>
                <Badge variant="pending" size="sm">
                  Pending Review
                </Badge>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-2 border-t border-border/50">
                <div>
                  <span className="text-2xs text-text-muted block">Contact</span>
                  <span className="font-medium text-heading truncate block">
                    {vendor.contactPersonName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-text-muted block">Location</span>
                  <span className="font-medium text-heading truncate block">
                    {vendor.city ? `${vendor.city}, ${getStateName(vendor.countryId, vendor.stateId)}` : '—'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-2xs text-text-muted block">Submitted On</span>
                  <span className="font-mono text-2xs text-heading">
                    {formatDate(vendor.effectiveDate)}
                  </span>
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1"
                >
                  <IconView size={13} />
                  View
                </Button>

                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => handleOpenApprove(vendor)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1"
                >
                  <IconCheck size={13} className="" />
                  Approve
                </Button>

                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={() => handleOpenReject(vendor)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1"
                >
                  <IconClose size={13} className="" />
                  Reject
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* ── 1. APPROVE CONFIRMATION MODAL WITH APPROVAL COMMENT ── */}
      <Modal
        isOpen={Boolean(vendorToApprove)}
        onClose={handleCloseApprove}
        title="Approve Vendor Application"
        maxWidth="max-w-xl"
      >
        {vendorToApprove && (
          <form onSubmit={handleConfirmApprove} className="space-y-4">
            {/* Vendor Profile Highlight Card */}
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-success/5 border border-success/20">
              <div className="w-11 h-11 rounded-xl bg-success/15 border border-success/30 text-success flex items-center justify-center shrink-0">
                <IconSuccess size={22} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendorToApprove.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendorToApprove.vendorCode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                  {vendorToApprove.contactPersonName && (
                    <span className="flex items-center gap-1">
                      <IconUser size={12} className="text-text-muted/70" />
                      {vendorToApprove.contactPersonName}
                    </span>
                  )}
                  {vendorToApprove.city && (
                    <span className="flex items-center gap-1">
                      <IconLocation size={12} className="text-text-muted/70" />
                      {vendorToApprove.city}, {getStateName(vendorToApprove.countryId, vendorToApprove.stateId)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Approving will activate this vendor for purchase orders and procurement workflows.
            </p>

            {/* Approval Comments Field */}
            <Textarea
                id="approve-comments"
                label="Approval Comments / Remarks (Optional)"
                rows={3}
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                placeholder="Enter approval remarks or internal audit notes..."
              />

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCloseApprove}
                disabled={isSubmittingApprove}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmittingApprove}
                className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-white border-transparent"
              >
                <IconCheck size={15} />
                Confirm Approval
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── 2. REJECT FEEDBACK MODAL (Polished & Redesigned) ── */}
      <Modal
        isOpen={Boolean(vendorToReject)}
        onClose={handleCloseReject}
        title="Reject Vendor Application"
        maxWidth="max-w-xl"
      >
        {vendorToReject && (
          <form onSubmit={handleConfirmReject} className="space-y-5">
            {/* Vendor Profile Highlight Card */}
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-surface/70 border border-border">
              <div className="w-11 h-11 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center shrink-0">
                <IconBuilding size={20} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendorToReject.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendorToReject.vendorCode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                  {vendorToReject.contactPersonName && (
                    <span className="flex items-center gap-1">
                      <IconUser size={12} className="text-text-muted/70" />
                      {vendorToReject.contactPersonName}
                    </span>
                  )}
                  {vendorToReject.city && (
                    <span className="flex items-center gap-1">
                      <IconLocation size={12} className="text-text-muted/70" />
                      {vendorToReject.city}, {getStateName(vendorToReject.countryId, vendorToReject.stateId)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rejection Comments Field */}
            <Textarea
              id="reject-comments"
              label="Reason for Rejection"
              required
              rows={3}
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Explain why this vendor application is being rejected (required for audit log)..."
            />

            {/* Alert Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/15 text-xs text-text-muted">
              <IconError size={15} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Rejecting will mark this vendor as <strong>Rejected</strong> and remove it from the pending approval queue. Your remarks will be saved to the vendor&apos;s audit trail.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCloseReject}
                disabled={isSubmittingReject}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="md"
                disabled={!rejectComments.trim() || isSubmittingReject}
                loading={isSubmittingReject}
                className="flex items-center gap-1.5"
              >
                <IconClose size={15} />
                Confirm Rejection
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
