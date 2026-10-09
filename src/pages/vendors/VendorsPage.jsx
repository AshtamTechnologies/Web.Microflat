/**
 * VendorsPage — Vendor management dashboard for MicroFlat ERP.
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Phone,
  MapPin,
  SearchX,
  RotateCcw,
  Truck,
} from 'lucide-react';

import {
  Button,
  Input,
  SearchableSelect,
  Badge,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { getStateName } from '../../mocks/vendors';
import {
  getEffectiveDateStatus,
  formatDateDisplay,
} from '../../utils/effectiveDateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const APPROVAL_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Approvals' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Rejected', label: 'Rejected' },
];

function getApprovalBadgeVariant(status) {
  switch (status) {
    case 'Approved':
      return 'approved';
    case 'Pending':
      return 'pending';
    case 'Rejected':
      return 'rejected';
    default:
      return 'neutral';
  }
}

export default function VendorsPage() {
  const navigate = useNavigate();

  const {
    vendors,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    approvalFilter,
    setApprovalFilter,
    resetFilters,
    deleteVendor,
  } = useVendorsContext();

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter !== 'ALL' || approvalFilter !== 'ALL'
  );

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [loading] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const [searchParams] = useSearchParams();

  // Sync query parameters on mount / route changes
  useEffect(() => {
    const hasStatus = searchParams.has('status');
    const hasApproval = searchParams.has('approval') || searchParams.has('approvalStatus');
    const hasSearch = searchParams.has('search');
    const resetParam = searchParams.get('reset') || searchParams.get('filter');

    if (resetParam === 'true' || resetParam === 'ALL' || resetParam === 'all') {
      resetFilters();
      return;
    }

    if (hasStatus) {
      const rawStatus = searchParams.get('status') || '';
      const upper = rawStatus.toUpperCase();
      if (upper === 'ACTIVE' || upper === 'TRUE') {
        setStatusFilter('ACTIVE');
      } else if (upper === 'INACTIVE' || upper === 'FALSE') {
        setStatusFilter('INACTIVE');
      } else if (upper === 'ALL') {
        setStatusFilter('ALL');
      }
    }

    if (hasApproval) {
      const rawApproval = searchParams.get('approval') || searchParams.get('approvalStatus') || '';
      const lower = rawApproval.toLowerCase();
      if (lower === 'approved') {
        setApprovalFilter('Approved');
      } else if (lower === 'pending') {
        setApprovalFilter('Pending');
      } else if (lower === 'rejected') {
        setApprovalFilter('Rejected');
      } else if (lower === 'all') {
        setApprovalFilter('ALL');
      }
    }

    if (hasSearch) {
      setSearch(searchParams.get('search') || '');
    }
  }, [searchParams, setStatusFilter, setApprovalFilter, setSearch, resetFilters]);

  // Reset pagination to page 1 when search or filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, approvalFilter]);

  /* ── Column definitions for desktop table ── */
  const columns = useMemo(
    () => [
      /* 1. VENDOR CODE */
      columnHelper.accessor('vendorCode', {
        header: 'VENDOR CODE',
        minSize: 140,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/vendors/${row.id}/effective-dates`}
              className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
            >
              {row.vendorCode}
            </Link>
          );
        },
      }),

      /* 2. VENDOR NAME & CONTACT PERSON */
      columnHelper.accessor((row) => `${row.vendorName} ${row.contactPersonName}`, {
        id: 'vendorName',
        header: 'VENDOR & CONTACT',
        minSize: 240,
        size: 280,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <Link
                to={`/vendors/${row.id}/effective-dates`}
                className="font-semibold text-heading text-sm leading-snug hover:text-primary transition-colors truncate text-left cursor-pointer"
              >
                {row.vendorName}
              </Link>
              <span className="text-text-muted text-xs leading-normal truncate">
                {row.contactPersonName} {row.email ? `• ${row.email}` : ''}
              </span>
            </div>
          );
        },
      }),

      /* 3. PHONE NO */
      columnHelper.accessor('phoneNo', {
        header: 'PHONE NO',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const phone = info.getValue();
          return (
            <span className="font-mono tabular-nums text-xs text-text-muted">
              {phone || '—'}
            </span>
          );
        },
      }),

      /* 4. CITY / STATE — Commented out as requested
      columnHelper.accessor((row) => `${row.city}, ${getStateName(row.countryId, row.stateId)}`, {
        id: 'cityState',
        header: 'CITY / STATE',
        minSize: 150,
        size: 180,
        cell: (info) => {
          const row = info.row.original;
          const state = getStateName(row.countryId, row.stateId);
          return (
            <span className="text-xs text-text truncate block">
              {row.city ? `${row.city}, ${state}` : state || '—'}
            </span>
          );
        },
      }),
      */

      /* 5. EFFECTIVE DATE — Commented out as requested
      columnHelper.accessor((row) => row.effectiveDate || '', {
        id: 'effectiveDate',
        header: 'EFFECTIVE DATE',
        minSize: 145,
        size: 165,
        cell: (info) => {
          const row = info.row.original;
          const statusInfo = getEffectiveDateStatus(row.effectiveDate);
          return (
            <div className="flex flex-col py-0.5 gap-1">
              <span className="font-mono text-xs text-heading font-medium">
                {formatDateDisplay(row.effectiveDate)}
              </span>
              <div>
                <Badge variant={statusInfo.badgeVariant} className="text-[10px] px-1.5 py-0">
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          );
        },
      }),
      */

      /* 6. STATUS (Only shown if vendor is approved) */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 120,
        size: 140,
        cell: (info) => {
          const row = info.row.original;
          const isApproved = (row.approvalStatus || '').toLowerCase() === 'approved';
          if (!isApproved) {
            return <span className="text-text-muted text-xs font-mono">—</span>;
          }

          const isActive = row.isActive;
          return (
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none',
                isActive
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        },
      }),

      /* 7. APPROVAL STATUS */
      columnHelper.accessor('approvalStatus', {
        header: 'APPROVAL',
        minSize: 120,
        size: 130,
        cell: (info) => {
          const status = info.getValue() || 'Pending';
          return (
            <Badge variant={getApprovalBadgeVariant(status)}>
              {status}
            </Badge>
          );
        },
      }),

      /* 8. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 110,
        size: 120,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;

          return (
            <div className="flex items-center justify-end gap-1">
              {/* Edit Ghost Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/vendors/${row.id}/effective-dates`)}
                title="Edit vendor"
                className="text-text-muted hover:text-primary hover:bg-surface"
              >
                <Pencil size={15} aria-hidden="true" />
              </Button>

              {/* Delete Ghost Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVendorToDelete(row)}
                title="Delete vendor"
                className="text-text-muted hover:text-danger hover:bg-surface"
              >
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [navigate]
  );

  /* ── React Table Instance ── */
  const table = useReactTable({
    data: vendors,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const totalRows = vendors.length;
  const currentPage = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const startRow = totalRows === 0 ? 0 : currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);
  const pageCount = table.getPageCount();

  /* ── Delete Handler ── */
  function handleDeleteConfirm() {
    if (!vendorToDelete) return;
    deleteVendor(vendorToDelete.id);
    setVendorToDelete(null);
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-primary" aria-hidden="true" />
            Vendor Management
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Directory of approved suppliers, subcontractors, and material vendors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/vendors/new')}
            className="shadow-sm text-xs font-semibold"
          >
            <Plus size={16} className="mr-1.5" aria-hidden="true" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* ── DESKTOP VIEW (md+): Full Table ── */}
      <div className="hidden md:block">
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center flex-1 gap-3 flex-wrap">
              <div className="w-full sm:w-72">
                <Input
                  id="vendors-search"
                  type="search"
                  placeholder="Search by name, code, contact, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search size={16} aria-hidden="true" />}
                />
              </div>

              <div className="w-full sm:w-48">
                <SearchableSelect
                  id="filter-approval"
                  placeholder="All Approvals"
                  searchPlaceholder="Search approvals..."
                  options={APPROVAL_FILTER_OPTIONS}
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                />
              </div>

              <div className="w-full sm:w-44">
                <SearchableSelect
                  id="filter-status"
                  placeholder="All Statuses"
                  searchPlaceholder="Search statuses..."
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs text-text-muted hover:text-danger flex items-center gap-1.5 h-10 px-3"
                >
                  <RotateCcw size={14} />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <TableContainer>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface/60 border-b border-border">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={`relative py-3.5 px-6 select-none ${
                          canSort ? 'cursor-pointer hover:bg-surface' : ''
                        }`}
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
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={`skel-cell-${cIdx}`} className="py-4 px-6">
                        <div className="h-4 bg-surface rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mb-3">
                        <SearchX size={24} className="opacity-60" aria-hidden="true" />
                      </div>
                      <h4 className="text-sm font-semibold text-heading">No vendors match your search</h4>
                      <p className="text-xs text-text-muted mt-1 mb-4">
                        {hasActiveFilters
                          ? 'Try clearing or changing your search filters to find what you are looking for.'
                          : 'No vendors have been added yet.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFilters}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-surface/50 transition-colors duration-120 group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td key={cell.id} style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </TableContainer>

          {/* Desktop Pagination */}
          <div className="px-6 py-4 bg-bg border-t border-border flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Showing <span className="font-medium text-heading">{startRow}-{endRow}</span> of <span className="font-medium text-heading">{totalRows}</span> vendors
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value));
                }}
                className="text-xs border border-border rounded-lg bg-surface px-2 py-1 text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <div className="h-4 w-px bg-border mx-2" />

              <span className="text-xs text-text-muted">
                Page <span className="font-medium text-heading">{currentPage + 1}</span> of{' '}
                <span className="font-medium text-heading">{Math.max(1, pageCount)}</span>
              </span>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-8 px-2.5 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-8 px-2.5 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE VIEW (< md): Card List ── */}
      <div className="block md:hidden space-y-4">
        {/* Mobile Filters */}
        <div className="bg-surface border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
          <Input
            id="mobile-vendors-search"
            type="search"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} aria-hidden="true" />}
          />

          <div className="grid grid-cols-2 gap-2">
            <SearchableSelect
              id="mobile-filter-approval"
              placeholder="Approval"
              options={APPROVAL_FILTER_OPTIONS}
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
            />
            <SearchableSelect
              id="mobile-filter-status"
              placeholder="Status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="w-full text-xs text-text-muted hover:text-danger h-8 justify-center"
            >
              <RotateCcw size={13} className="mr-1.5" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Mobile Cards List */}
        <div className="space-y-3">
          {table.getRowModel().rows.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-xl">
              <SearchX size={24} className="mx-auto text-text-muted opacity-60 mb-2" />
              <p className="text-xs font-semibold text-heading">No vendors found</p>
              <p className="text-[11px] text-text-muted mt-0.5">Try changing your search terms</p>
            </div>
          ) : (
            table.getRowModel().rows.map((row) => {
              const vendor = row.original;
              return (
                <div
                  key={vendor.id}
                  className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">
                          {vendor.vendorCode}
                        </span>
                        <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
                          {vendor.approvalStatus}
                        </Badge>
                      </div>
                      <Link
                        to={`/vendors/${vendor.id}/effective-dates`}
                        className="block text-sm font-semibold text-heading leading-tight mt-1 hover:text-primary"
                      >
                        {vendor.vendorName}
                      </Link>
                      <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>Contact: {vendor.contactPersonName}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] font-medium text-heading">
                          Eff: {formatDateDisplay(vendor.effectiveDate)}
                        </span>
                      </p>
                    </div>

                    {(vendor.approvalStatus || '').toLowerCase() === 'approved' && (
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 select-none',
                          vendor.isActive
                            ? 'bg-success/10 text-success border border-success/20'
                            : 'bg-danger/10 text-danger border border-danger/20',
                        ].join(' ')}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            vendor.isActive ? 'bg-success' : 'bg-danger'
                          }`}
                          aria-hidden="true"
                        />
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  {/* Contact & Location details */}
                  <div className="space-y-1.5 text-xs text-text-muted pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                      <span className="font-mono tabular-nums">{vendor.phoneNo || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                      <span className="truncate">
                        {vendor.city ? `${vendor.city}, ${getStateName(vendor.countryId, vendor.stateId)}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/vendors/${vendor.id}/effective-dates`)}
                      className="flex-1 text-xs"
                    >
                      <Pencil size={13} className="mr-1.5" aria-hidden="true" />
                      Edit
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setVendorToDelete(vendor)}
                      className="flex-1 text-xs"
                    >
                      <Trash2 size={13} className="mr-1.5" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Pagination */}
        <div className="px-4 py-3 bg-bg border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>{startRow}-{endRow} of {totalRows}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2.5 text-xs"
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2.5 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ── Delete Vendor Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(vendorToDelete)}
        onClose={() => setVendorToDelete(null)}
        title="Delete Vendor"
        confirmText="Delete Vendor"
        variant="danger"
        message={
          vendorToDelete ? (
            <p>
              Are you sure you want to permanently delete{' '}
              <strong className="text-heading font-semibold">{vendorToDelete.vendorName}</strong>{' '}
              <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {vendorToDelete.vendorCode}
              </span>
              ? This action cannot be undone.
            </p>
          ) : null
        }
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
