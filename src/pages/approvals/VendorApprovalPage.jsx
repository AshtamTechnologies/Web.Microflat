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
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Search,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  SearchX,
  RotateCcw,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  Modal,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { getStateName } from '../../mocks/vendors';

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
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setVendorToApprove(null);
  }

  async function handleConfirmApprove() {
    if (!vendorToApprove) return;

    try {
      setIsSubmittingApprove(true);
      const now = formatAuditTimestamp();

      await updateVendor(vendorToApprove.id, {
        approvalStatus: 'Approved',
        approvedOn: now,
        approvedBy: 'Ian Chesnut',
      });

      toast.success(`${vendorToApprove.vendorName} approved successfully`);
      setVendorToApprove(null);
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
              <MapPin size={13} className="text-text-muted shrink-0" aria-hidden="true" />
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
              <Clock size={13} className="text-text-muted/70 shrink-0" aria-hidden="true" />
              <span>{val || '—'}</span>
            </div>
          );
        },
      }),

      /* 5. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 200,
        size: 220,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;

          return (
            <div
              className="flex items-center justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Approve Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenApprove(row)}
                className="text-xs font-semibold text-success hover:text-success hover:bg-success/15 border border-success/30 hover:border-success/50 transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5"
                title={`Approve ${row.vendorName}`}
              >
                <Check size={14} className="stroke-[2.5]" aria-hidden="true" />
                Approve
              </Button>

              {/* Reject Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenReject(row)}
                className="text-xs font-semibold text-danger hover:text-danger hover:bg-danger/15 border border-danger/30 hover:border-danger/50 transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5"
                title={`Reject ${row.vendorName}`}
              >
                <X size={14} className="stroke-[2.5]" aria-hidden="true" />
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

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const totalRows = filteredPendingVendors.length;
  const startRow = totalRows === 0 ? 0 : currentPage * pagination.pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pagination.pageSize, totalRows);

  const paginatedMobileVendors = useMemo(() => {
    const start = currentPage * pagination.pageSize;
    return filteredPendingVendors.slice(start, start + pagination.pageSize);
  }, [filteredPendingVendors, currentPage, pagination.pageSize]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-heading tracking-tight">
              Vendor Approval
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/30 shadow-2xs">
              <Clock size={12} className="shrink-0" />
              {totalPendingCount} pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Vendors awaiting review. Click any row to inspect complete vendor documentation before deciding.
          </p>
        </div>
      </div>

      {/* ── Unified Card Container ── */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* ── Toolbar: Search Filter ── */}
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-1 gap-3 flex-wrap">
            <div className="w-full sm:w-80">
              <Input
                id="vendor-approval-search"
                type="search"
                placeholder="Search by vendor name, code, contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={16} aria-hidden="true" />}
              />
            </div>

            {hasSearchFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="text-xs text-text-muted hover:text-danger flex items-center gap-1.5 h-10 px-3"
                title="Clear search"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-text-muted flex items-center gap-1.5 self-end sm:self-center">
            <FileText size={13} className="text-primary" />
            <span>Showing queue of pending submissions</span>
          </div>
        </div>

        {/* ── DESKTOP TABLE VIEW (md+) ── */}
        <div className="hidden md:block">
          <TableContainer
            tableStyle={{ width: table.getTotalSize(), minWidth: '100%' }}
            tableClassName="table-fixed"
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const canResize = header.column.getCanResize();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={canResize ? header.getResizeHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="group/th-btn flex items-center gap-1.5 w-full text-left select-none cursor-pointer hover:text-heading transition-colors"
                          >
                            <span className="truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>

                            {/* Sort indicator */}
                            <span className="shrink-0 ml-1 inline-flex items-center">
                              {sorted === 'asc' ? (
                                <ChevronUp size={14} className="text-primary stroke-[2.5]" aria-hidden="true" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown size={14} className="text-primary stroke-[2.5]" aria-hidden="true" />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <ChevronUp size={11} strokeWidth={2.5} />
                                  <ChevronDown size={11} strokeWidth={2.5} />
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div className={`select-none ${header.id === 'actions' ? 'text-right w-full pr-1' : ''}`}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </Th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-border bg-bg">
              {table.getRowModel().rows.length === 0 ? (
                /* ── Empty State ── */
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 px-6">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      {hasSearchFilter ? (
                        <>
                          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mb-3">
                            <SearchX size={22} className="opacity-60" aria-hidden="true" />
                          </div>
                          <h4 className="text-sm font-semibold text-heading">
                            No matching pending vendors
                          </h4>
                          <p className="text-xs text-text-muted mt-1 mb-4">
                            No pending vendor records match your search criteria.
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearch('')}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                          >
                            Clear search
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success mb-3 shadow-sm">
                            <CheckCircle2 size={26} className="stroke-[2.2]" aria-hidden="true" />
                          </div>
                          <h4 className="text-base font-semibold text-heading">
                            No vendors pending approval
                          </h4>
                          <p className="text-xs text-text-muted mt-1">
                            All caught up! There are currently no vendor records awaiting review.
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                /* ── Data Rows (Click row to view vendor details) ── */
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/vendors/${row.original.id}`)}
                    className="hover:bg-surface/80 cursor-pointer transition-colors duration-120 bg-bg group/row"
                    title="Click row to view full vendor details"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </TableContainer>
        </div>

        {/* ── MOBILE CARD VIEW (< md) ── */}
        <div className="block md:hidden p-4 space-y-3 bg-bg">
          {paginatedMobileVendors.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success mx-auto mb-3">
                <CheckCircle2 size={22} className="stroke-[2.2]" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-heading">
                No vendors pending approval
              </h4>
              <p className="text-xs text-text-muted mt-1">
                All caught up! There are currently no vendor records awaiting review.
              </p>
            </div>
          ) : (
            paginatedMobileVendors.map((vendor) => {
              const state = getStateName(vendor.countryId, vendor.stateId);

              return (
                <div
                  key={vendor.id}
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                  className="bg-bg rounded-xl border border-border p-4 shadow-2xs space-y-3 hover:border-primary/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary block">
                        {vendor.vendorCode}
                      </span>
                      <h3 className="text-sm font-semibold text-heading leading-tight mt-0.5">
                        {vendor.vendorName}
                      </h3>
                      {vendor.contactPersonName && (
                        <p className="text-xs text-text-muted mt-0.5">
                          Contact: {vendor.contactPersonName}
                        </p>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning/15 text-warning border border-warning/30 shrink-0">
                      <Clock size={11} />
                      Pending
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="shrink-0 text-text-muted/70" />
                      <span>{vendor.city ? `${vendor.city}, ${state}` : state || '—'}</span>
                    </div>
                    <span className="font-mono">{vendor.effectiveDate || vendor.createdOn || '—'}</span>
                  </div>

                  {/* Actions Footer */}
                  <div
                    className="flex items-center justify-end gap-2 pt-2 border-t border-border/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenApprove(vendor)}
                      className="flex-1 text-xs font-semibold text-success hover:text-success hover:bg-success/15 border border-success/30"
                    >
                      <Check size={13} className="mr-1 stroke-[2.5]" />
                      Approve
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenReject(vendor)}
                      className="flex-1 text-xs font-semibold text-danger hover:text-danger hover:bg-danger/15 border border-danger/30"
                    >
                      <X size={13} className="mr-1 stroke-[2.5]" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── PAGINATION FOOTER ── */}
        <div className="px-6 py-4 bg-bg border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            Showing <span className="font-medium text-heading">{startRow}-{endRow}</span> of{' '}
            <span className="font-medium text-heading">{totalRows}</span> pending vendors
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="text-xs h-8 px-2.5"
            >
              Prev
            </Button>

            {Array.from({ length: Math.max(1, pageCount) }, (_, i) => {
              const isActive = i === currentPage;
              return isActive ? (
                <button
                  key={i}
                  type="button"
                  className="min-w-[32px] h-8 px-2 text-xs font-semibold rounded-md bg-primary text-white shadow-xs select-none cursor-default"
                >
                  {i + 1}
                </button>
              ) : (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  onClick={() => table.setPageIndex(i)}
                  className="min-w-[32px] h-8 px-2 text-xs text-text-muted hover:text-heading hover:bg-surface"
                >
                  {i + 1}
                </Button>
              );
            })}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="text-xs h-8 px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ── 1. APPROVE CONFIRMATION MODAL (System Standard) ── */}
      <ConfirmModal
        isOpen={Boolean(vendorToApprove)}
        onClose={handleCloseApprove}
        title="Approve Vendor"
        confirmText="Approve Vendor"
        variant="primary"
        icon={CheckCircle2}
        loading={isSubmittingApprove}
        maxWidth="max-w-md"
        message={
          vendorToApprove ? (
            <div className="space-y-2 text-left">
              <p className="text-sm text-heading leading-relaxed">
                Are you sure you want to approve{' '}
                <strong className="font-semibold text-primary">
                  {vendorToApprove.vendorName}
                </strong>{' '}
                (<span className="font-mono text-xs">{vendorToApprove.vendorCode}</span>)?
              </p>
              <p className="text-xs text-text-muted leading-normal">
                This vendor will be marked as <strong>Approved</strong> and activated for purchase orders and procurement workflows.
              </p>
            </div>
          ) : null
        }
        onConfirm={handleConfirmApprove}
      />

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
                <Building2 size={20} aria-hidden="true" />
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
                      <User size={12} className="text-text-muted/70" />
                      {vendorToReject.contactPersonName}
                    </span>
                  )}
                  {vendorToReject.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-text-muted/70" />
                      {vendorToReject.city}, {getStateName(vendorToReject.countryId, vendorToReject.stateId)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rejection Comments Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="reject-comments"
                  className="text-sm font-medium text-heading block leading-none"
                >
                  Reason for Rejection <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <span className="text-[11px] text-text-muted font-mono">
                  {rejectComments.length} chars
                </span>
              </div>
              <textarea
                id="reject-comments"
                rows={3}
                required
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Explain why this vendor application is being rejected (required for audit log)..."
                className={[
                  'w-full rounded-xl border bg-bg text-heading text-sm p-3',
                  'border-border placeholder:text-text-muted transition-all duration-150',
                  'focus:border-danger focus:ring-2 focus:ring-danger/20 outline-none resize-none leading-relaxed',
                ].join(' ')}
              />
            </div>

            {/* Alert Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/15 text-xs text-text-muted">
              <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
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
                <X size={15} strokeWidth={2.5} />
                Reject Vendor
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
