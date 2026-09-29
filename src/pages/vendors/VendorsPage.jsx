/**
 * VendorsPage — Polished vendor management dashboard for MicroFlat ERP.
 *
 * Visual Improvements & Patterns (mirrored from UsersPage):
 *   1. Container: Whole table (toolbar + table + pagination) in a single unified Card.
 *   2. Header: Contrasting bg-surface, clean hover sort indicator & solid active chevron, hover resize bar.
 *   3. Rows: Two-line primary stack (VendorName + ContactPerson), font-mono codes & numbers,
 *      divide-y border-border, 120ms hover transition, proper pill status & approval badges.
 *   4. Actions: Icon-only ghost buttons (View, Edit, Delete) with tooltips.
 *   5. Pagination: Filled bg-primary pill for active page, ghost buttons for others, disabled Prev/Next.
 *   6. Empty & Loading States: Pulsing skeleton rows during load, centered empty state with "Clear filters".
 */

import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';

import { Button, Input, SearchableSelect, Badge, ConfirmModal, TableContainer, Th, Td } from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { getStateName } from '../../mocks/vendors';

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
    toggleStatus,
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
              to={`/vendors/${row.id}`}
              className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
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
                to={`/vendors/${row.id}`}
                className="font-semibold text-heading text-sm leading-snug hover:text-primary transition-colors truncate"
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

      /* 5. STATUS — Tinted pill toggle button */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 120,
        size: 140,
        cell: (info) => {
          const row = info.row.original;
          const isActive = row.isActive;
          return (
            <button
              type="button"
              onClick={() => toggleStatus(row.id)}
              title={`Click to mark as ${isActive ? 'Inactive' : 'Active'}`}
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors duration-120 select-none',
                isActive
                  ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {isActive ? 'Active' : 'Inactive'}
            </button>
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
          return (
            <div className="flex items-center justify-end gap-1">
              {/* View Ghost Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/vendors/${row.id}`)}
                title="View vendor details"
                className="text-text-muted hover:text-primary hover:bg-surface"
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
    [navigate, toggleStatus, deleteVendor]
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

  // Paginated data slice for Mobile Card View
  const paginatedMobileVendors = useMemo(() => {
    const start = currentPage * pagination.pageSize;
    return vendors.slice(start, start + pagination.pageSize);
  }, [vendors, currentPage, pagination.pageSize]);

  return (
    <div className="space-y-6">
      {/* ── Page Header with Add Vendor Button Outside the Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-primary" aria-hidden="true" />
            Vendor Management
          </h1>
          {/* <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Manage approved industrial suppliers, contact details, and procurement status.
          </p> */}
        </div>

        {/* Add Vendor Button */}
        <Button
          id="add-vendor-btn"
          variant="primary"
          size="md"
          onClick={() => navigate('/vendors/new')}
          className="shrink-0 self-start sm:self-auto flex items-center justify-center shadow-xs"
        >
          <Plus size={16} className="mr-1.5" aria-hidden="true" />
          Add Vendor
        </Button>
      </div>

      {/* ── UNIFIED CARD CONTAINER: Toolbar + Table/Cards + Pagination ── */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* ── Toolbar: Search + Approval Filter + Status Filter ── */}
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center flex-1 gap-3 flex-wrap">
            {/* Search Input */}
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

            {/* Approval Filter Dropdown */}
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

            {/* Status Filter Dropdown */}
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

            {/* Clear Filters Button */}
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
              {loading ? (
                /* ── Skeleton Loading Rows ── */
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="bg-bg">
                    <Td>
                      <div className="h-3.5 w-20 bg-surface rounded-md animate-pulse" />
                    </Td>
                    <Td>
                      <div className="space-y-1.5 flex-1 py-0.5">
                        <div className="h-3.5 w-36 bg-surface rounded-md animate-pulse" />
                        <div className="h-2.5 w-44 bg-surface rounded-md animate-pulse" />
                      </div>
                    </Td>
                    <Td>
                      <div className="h-3 w-24 bg-surface rounded-md animate-pulse" />
                    </Td>
                    <Td>
                      <div className="h-3 w-28 bg-surface rounded-md animate-pulse" />
                    </Td>
                    <Td>
                      <div className="h-5 w-16 bg-surface rounded-full animate-pulse" />
                    </Td>
                    <Td>
                      <div className="h-5 w-20 bg-surface rounded-full animate-pulse" />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-8 h-8 rounded-md bg-surface animate-pulse" />
                        <div className="w-8 h-8 rounded-md bg-surface animate-pulse" />
                        <div className="w-8 h-8 rounded-md bg-surface animate-pulse" />
                      </div>
                    </Td>
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                /* ── Centered Empty State ── */
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 px-6">
                    <div className="flex flex-col items-center justify-center max-w-xs mx-auto text-center">
                      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mb-3">
                        <SearchX size={22} className="opacity-60" aria-hidden="true" />
                      </div>
                      <h4 className="text-sm font-semibold text-heading">No vendors found</h4>
                      <p className="text-xs text-text-muted mt-1 mb-4">
                        {hasActiveFilters
                          ? 'No vendor records match the selected search or filter criteria.'
                          : 'Get started by onboarding your first vendor.'}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetFilters}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          Clear filters
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/vendors/new')}
                        >
                          Add Vendor
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                /* ── Data Rows with 120ms hover transition ── */
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-surface/80 transition-colors duration-120 bg-bg"
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
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`mobile-skeleton-${idx}`} className="bg-surface/40 rounded-xl border border-border p-4 space-y-3 animate-pulse">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-24 bg-surface rounded" />
                  <div className="h-2.5 w-32 bg-surface rounded" />
                </div>
              </div>
            ))
          ) : paginatedMobileVendors.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text-muted mx-auto mb-3">
                <SearchX size={22} className="opacity-60" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-heading">No vendors found</h4>
              <p className="text-xs text-text-muted mt-1 mb-4">
                {hasActiveFilters
                  ? 'No vendor records match the selected search or filter criteria.'
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
            paginatedMobileVendors.map((vendor) => (
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
                    <p className="text-xs text-text-muted mt-0.5">
                      Contact: {vendor.contactPersonName}
                    </p>
                  </div>

                  {/* Status Toggle Badge */}
                  <button
                    type="button"
                    onClick={() => toggleStatus(vendor.id)}
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors duration-120 shrink-0',
                      vendor.isActive
                        ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                        : 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
                    ].join(' ')}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        vendor.isActive ? 'bg-success' : 'bg-danger'
                      }`}
                      aria-hidden="true"
                    />
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </button>
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

        {/* ── PAGINATION FOOTER STRIP ── */}
        <div className="px-6 py-4 bg-bg border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Showing X-Y of Z */}
          <p className="text-xs text-text-muted">
            Showing <span className="font-medium text-heading">{startRow}-{endRow}</span> of <span className="font-medium text-heading">{totalRows}</span> vendors
          </p>

          {/* Page controls */}
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
        onConfirm={() => {
          if (vendorToDelete) {
            deleteVendor(vendorToDelete.id);
            setVendorToDelete(null);
          }
        }}
      />
    </div>
  );
}
