/**
 * VendorsPage — Polished vendor management dashboard for MicroFlat ERP.
 *
 * Behavior:
 *   1. Large / Desktop Screen:
 *      - By default: Full table view with sortable columns, resize handles, and action buttons.
 *      - When user clicks "View" on a row: Switches to Split-Screen view:
 *          - Left: Cards list of vendors (highlighting the currently active vendor).
 *          - Right: Full VendorDetailView panel with all vendor information & actions.
 *          - Clicking another vendor card updates the right view instantly.
 *          - "Full Table View" button or close (X) button restores full table.
 *   2. Mobile View (< md):
 *      - 100% UNTOUCHED original mobile layout.
 *      - Shows search, filters, mobile card items with direct View / Edit / Delete buttons.
 *      - Clicking View navigates directly to /vendors/:id.
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
  Eye,
  Phone,
  MapPin,
  SearchX,
  RotateCcw,
  Truck,
  Table as TableIcon,
  ChevronRight,
} from 'lucide-react';

import { Button, Input, SearchableSelect, Badge, ConfirmModal, TableContainer, Th, Td } from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { getStateName } from '../../mocks/vendors';
import {
  getEffectiveDateStatus,
  formatDateDisplay,
} from '../../utils/effectiveDateUtils';
import VendorDetailView from './VendorDetailView';

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
    allVendors,
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
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  const [searchParams] = useSearchParams();

  // Sync query parameters on mount / route changes (e.g. from Dashboard KPIs or View All links)
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

  // Selected vendor object for the right-hand view pane in split mode
  // We use allVendors so searching/filtering on the left doesn't dismiss the active split view
  const selectedVendor = useMemo(() => {
    if (!selectedVendorId) return null;
    return (allVendors || vendors).find((v) => v.id === selectedVendorId) || null;
  }, [allVendors, vendors, selectedVendorId]);

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
            <button
              type="button"
              onClick={() => setSelectedVendorId(row.id)}
              className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
            >
              {row.vendorCode}
            </button>
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
              <button
                type="button"
                onClick={() => setSelectedVendorId(row.id)}
                className="font-semibold text-heading text-sm leading-snug hover:text-primary transition-colors truncate text-left cursor-pointer"
              >
                {row.vendorName}
              </button>
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

      /* 4. CITY / STATE */
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

      /* 5. EFFECTIVE DATE — ERP temporal validity column */
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

      /* 6. STATUS — Tinted pill badge (read-only, editable in Edit mode) */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 120,
        size: 140,
        cell: (info) => {
          const row = info.row.original;
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

      /* 6. APPROVAL STATUS */
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

      /* 7. ACTIONS — Icon-only ghost buttons */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 130,
        size: 140,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const isSelected = selectedVendorId === row.id;

          return (
            <div className="flex items-center justify-end gap-1">
              {/* View Button — Opens split-view on desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedVendorId((prev) => (prev === row.id ? null : row.id))}
                title={isSelected ? 'Close details view' : 'View vendor details'}
                className={
                  isSelected
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-muted hover:text-primary hover:bg-surface'
                }
              >
                <Eye size={15} aria-hidden="true" />
              </Button>

              {/* Edit Ghost Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/vendors/${row.id}/edit`)}
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
    [navigate, selectedVendorId]
  );

  const table = useReactTable({
    data: vendors,
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
  const totalRows = vendors.length;
  const startRow = totalRows === 0 ? 0 : currentPage * pagination.pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pagination.pageSize, totalRows);

  // Paginated data slice
  const paginatedVendors = useMemo(() => {
    const start = currentPage * pagination.pageSize;
    return vendors.slice(start, start + pagination.pageSize);
  }, [vendors, currentPage, pagination.pageSize]);

  // Handle vendor deletion
  function handleDeleteConfirm() {
    if (vendorToDelete) {
      deleteVendor(vendorToDelete.id);
      if (selectedVendorId === vendorToDelete.id) {
        setSelectedVendorId(null);
      }
      setVendorToDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-primary" aria-hidden="true" />
            Vendor Management
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {selectedVendor
              ? `Split-Screen View: ${selectedVendor.vendorName} selected`
              : 'Manage approved industrial suppliers, contact details, and procurement status.'}
          </p>
        </div>

        {/* Right Actions: Add Vendor & View Toggle */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {selectedVendorId && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setSelectedVendorId(null)}
              className="hidden md:flex items-center gap-1.5 shadow-xs text-xs"
            >
              <TableIcon size={15} />
              <span>Full Table View</span>
            </Button>
          )}

          <Button
            id="add-vendor-btn"
            variant="primary"
            size="md"
            onClick={() => navigate('/vendors/new')}
            className="flex items-center justify-center shadow-xs"
          >
            <Plus size={16} className="mr-1.5" aria-hidden="true" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
         DESKTOP VIEW (md+): Full Table OR Split-Screen Master-Detail
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {selectedVendor ? (
          /* ── DESKTOP & TABLET SPLIT-SCREEN VIEW (Cards on Left + View on Right) ── */
          <div className="grid grid-cols-12 gap-4 lg:gap-5 items-stretch h-[calc(100vh-12.5rem)] min-h-[520px]">
            {/* Left Column: Cards List */}
            <div className="col-span-5 lg:col-span-4 xl:col-span-4 bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-0">
              <div className="p-3 bg-bg border-b border-border space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-heading uppercase tracking-wider">
                    Vendors ({totalRows})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedVendorId(null)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <TableIcon size={13} /> Full Table
                  </button>
                </div>

                <Input
                  id="split-vendors-search"
                  type="search"
                  placeholder="Search vendors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search size={14} className="text-text-muted" />}
                />
              </div>

              {/* Scrollable Left Cards */}
              <div className="flex-1 overflow-y-auto overscroll-y-contain p-3 space-y-3 bg-surface/30 min-h-0">
                {paginatedVendors.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <SearchX size={24} className="mx-auto text-text-muted opacity-60 mb-2" />
                    <p className="text-xs font-semibold text-heading">No vendors found</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Try a different search term</p>
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="mt-2 text-xs text-primary font-medium hover:underline cursor-pointer"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  paginatedVendors.map((vendor) => {
                  const isSelected = selectedVendorId === vendor.id;
                  return (
                    <div
                      key={vendor.id}
                      onClick={() => setSelectedVendorId(vendor.id)}
                      className={`rounded-xl border p-3.5 shadow-2xs transition-all duration-150 cursor-pointer text-left relative group ${
                        isSelected
                          ? 'bg-primary/[0.04] border-primary ring-2 ring-primary/20 shadow-sm'
                          : 'bg-bg border-border hover:border-primary/40 hover:bg-surface/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary">
                              {vendor.vendorCode}
                            </span>
                            <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
                              {vendor.approvalStatus}
                            </Badge>
                          </div>
                          <h3 className="text-sm font-bold text-heading leading-tight mt-1 truncate group-hover:text-primary transition-colors">
                            {vendor.vendorName}
                          </h3>
                          <p className="text-xs text-text-muted mt-0.5 truncate flex items-center gap-1.5">
                            <span>Contact: {vendor.contactPersonName}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-text-muted font-medium">
                              Eff: {formatDateDisplay(vendor.effectiveDate)}
                            </span>
                          </p>
                        </div>

                        <span
                          className={[
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 select-none',
                            vendor.isActive
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-danger/10 text-danger border border-danger/20',
                          ].join(' ')}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              vendor.isActive ? 'bg-success' : 'bg-danger'
                            }`}
                          />
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-text-muted pt-2.5 mt-2.5 border-t border-border/60">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone size={12} className="shrink-0 text-text-muted/70" />
                            <span className="font-mono tabular-nums truncate">{vendor.phoneNo || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-primary text-xs font-semibold shrink-0">
                            <span>{isSelected ? 'Viewing' : 'View'}</span>
                            <ChevronRight size={13} className={isSelected ? 'translate-x-0.5' : 'group-hover:translate-x-0.5'} />
                          </div>
                        </div>

                        {vendor.city && (
                          <div className="flex items-center gap-1.5 text-text-muted truncate">
                            <MapPin size={12} className="shrink-0 text-text-muted/70" />
                            <span className="truncate">
                              {vendor.city}, {getStateName(vendor.countryId, vendor.stateId)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }))}
              </div>

              {/* Compact Pagination */}
              <div className="p-2.5 bg-bg border-t border-border flex items-center justify-between text-xs text-text-muted shrink-0">
                <span>{startRow}-{endRow} of {totalRows}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-7 px-2 text-xs"
                  >
                    Prev
                  </Button>
                  <span className="font-semibold text-heading px-1">{currentPage + 1}/{Math.max(1, pageCount)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-7 px-2 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Full Detail View */}
            <div className="col-span-7 lg:col-span-8 xl:col-span-8 h-full overflow-y-auto overscroll-y-contain pr-1">
              <VendorDetailView
                vendor={selectedVendor}
                onClose={() => setSelectedVendorId(null)}
                onDelete={(vId) => {
                  deleteVendor(vId);
                  setSelectedVendorId(null);
                }}
                isSplitView={true}
              />
            </div>
          </div>
        ) : (
          /* ── DESKTOP FULL TABLE VIEW ── */
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
                    title="Reset all search & filters"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* TanStack Table Container */}
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
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
         ORIGINAL MOBILE VIEW (< md) — 100% UNTOUCHED
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="block md:hidden bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Mobile Toolbar */}
        <div className="p-4 bg-bg border-b border-border space-y-3">
          <Input
            id="mobile-vendors-search"
            type="search"
            placeholder="Search by name, code, contact, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} aria-hidden="true" />}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <SearchableSelect
                id="mobile-filter-approval"
                placeholder="Approvals"
                searchPlaceholder="Search..."
                options={APPROVAL_FILTER_OPTIONS}
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <SearchableSelect
                id="mobile-filter-status"
                placeholder="Statuses"
                searchPlaceholder="Search..."
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-text-muted hover:text-danger flex items-center gap-1.5 h-8 px-2 w-full justify-center"
            >
              <RotateCcw size={12} /> Reset Filters
            </Button>
          )}
        </div>

        {/* Mobile Card List */}
        <div className="p-4 space-y-3 bg-bg">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`mobile-skeleton-${idx}`} className="bg-surface/40 rounded-xl border border-border p-4 space-y-3 animate-pulse">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-24 bg-surface rounded" />
                  <div className="h-2.5 w-32 bg-surface rounded" />
                </div>
              </div>
            ))
          ) : paginatedVendors.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mx-auto mb-3">
                <SearchX size={22} className="opacity-60" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-heading">No vendors found</h4>
              <p className="text-xs text-text-muted mt-1 mb-4">
                {hasActiveFilters
                  ? 'No vendor records match the selected criteria.'
                  : 'Get started by onboarding your first vendor.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            paginatedVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-bg rounded-xl border border-border p-4 shadow-2xs space-y-3"
              >
                {/* Header: Vendor Code, Name, Status & Approval */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/vendors/${vendor.id}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {vendor.vendorCode}
                      </Link>
                      <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
                        {vendor.approvalStatus}
                      </Badge>
                    </div>
                    <Link
                      to={`/vendors/${vendor.id}`}
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

                  {/* Status Badge (read-only, editable via Edit) */}
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
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                    className="flex-1 text-xs"
                  >
                    <Eye size={13} className="mr-1.5" aria-hidden="true" />
                    View
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
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
            ))
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
