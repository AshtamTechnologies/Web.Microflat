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
  IconAdd,
  IconChevronDown,
  IconChevronUp,
  IconDelete,
  IconEdit,
  IconLocation,
  IconPhone,
  IconReset,
  IconSearch,
  IconSearchEmpty,
  IconVendor,
  IconView,
} from '../../constants/icons';

import {
  Button,
  Input,
  SearchableSelect,
  Badge,
  ConfirmModal,
  TableContainer,
  Th,
  PageHeader,
  DataTable,
  TableToolbar,
  TableActions,
  StatusBadge,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { getStateName } from '../../mocks/vendors';
import {
  ApprovalStatus,
  ApprovalStatusLabel,
  getApprovalStatusLabel,
  getApprovalBadgeVariant,
  normalizeApprovalStatus,
} from '../../constants/approvalStatus';
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
  { value: String(ApprovalStatus.Approved), label: 'Approved' },
  { value: String(ApprovalStatus.Pending), label: 'Pending' },
  { value: String(ApprovalStatus.Rejected), label: 'Rejected' },
  { value: String(ApprovalStatus.Draft), label: 'Draft' },
];

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
    isLoading: loading,
    refreshVendors,
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
      if (rawApproval.toUpperCase() === 'ALL') {
        setApprovalFilter('ALL');
      } else {
        const normalized = normalizeApprovalStatus(rawApproval);
        setApprovalFilter(String(normalized));
      }
    }

    if (hasSearch) {
      setSearch(searchParams.get('search') || '');
    }
  }, [searchParams, setStatusFilter, setApprovalFilter, setSearch, resetFilters]);

  // Re-fetch vendors whenever VendorsPage mounts to ensure fresh ERP data
  useEffect(() => {
    refreshVendors?.();
  }, [refreshVendors]);

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
              to={`/vendors/${row.vendorId ?? row.id}/effective-dates`}
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
                to={`/vendors/${row.vendorId ?? row.id}/effective-dates`}
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

      /* 6. STATUS (Only shown if vendor is approved) */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 120,
        size: 140,
        cell: (info) => {
          const row = info.row.original;
          const isApproved = normalizeApprovalStatus(row.approvalStatus) === ApprovalStatus.Approved;
          if (!isApproved) {
            return <span className="text-text-muted text-xs font-mono">—</span>;
          }

          return <StatusBadge status={row.isActive} size="sm" />;
        },
      }),

      /* 7. APPROVAL STATUS */
      columnHelper.accessor('approvalStatus', {
        header: 'APPROVAL',
        minSize: 120,
        size: 130,
        cell: (info) => {
          const status = info.getValue();
          const label = getApprovalStatusLabel(status);
          return (
            <Badge variant={getApprovalBadgeVariant(status)}>
              {label}
            </Badge>
          );
        },
      }),

      /* 8. ACTIONS */
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
            <TableActions
              onView={() => navigate(`/vendors/${row.vendorId ?? row.id}/effective-dates`, { state: { readOnly: true } })}
              onEdit={() => navigate(`/vendors/${row.vendorId ?? row.id}/effective-dates`)}
              viewTitle="View vendor details"
              editTitle="Edit vendor"
            />
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

  /* ── Delete Handler ── */
  function handleDeleteConfirm() {
    if (!vendorToDelete) return;
    deleteVendor(vendorToDelete.id);
    setVendorToDelete(null);
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Vendor Management"
        subtitle="Directory of approved suppliers, subcontractors, and material vendors."
        icon={<IconVendor className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/vendors/new')}
            className="shadow-sm text-xs font-semibold"
          >
            <IconAdd size={16} className="mr-1.5" aria-hidden="true" />
            Add Vendor
          </Button>
        }
      />

      {/* ── Standard Table Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, code, contact, city..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset Filters"
      >
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
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={loading}
        totalCount={totalRows}
        entityName="vendors"
        emptyTitle="No vendors match your search"
        emptyDescription={
          hasActiveFilters
            ? 'Try clearing or changing your search filters to find what you are looking for.'
            : 'No vendors have been added yet.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-primary"
            >
              Clear filters
            </Button>
          ) : null
        }
        renderMobileCard={(row) => {
          const vendor = row.original;
          const isApproved = normalizeApprovalStatus(vendor.approvalStatus) === ApprovalStatus.Approved;
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
                      {getApprovalStatusLabel(vendor.approvalStatus)}
                    </Badge>
                  </div>
                  <Link
                    to={`/vendors/${vendor.vendorId ?? vendor.id}/effective-dates`}
                    className="block text-sm font-semibold text-heading leading-tight mt-1 hover:text-primary"
                  >
                    {vendor.vendorName}
                  </Link>
                  <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>Contact: {vendor.contactPersonName}</span>
                    <span>•</span>
                    <span className="font-mono text-2xs font-medium text-heading">
                      Eff: {formatDateDisplay(vendor.effectiveDate)}
                    </span>
                  </p>
                </div>

                {isApproved && (
                  <StatusBadge status={vendor.isActive} size="sm" />
                )}
              </div>

              {/* Contact & Location details */}
              <div className="space-y-1.5 text-xs text-text-muted pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <IconPhone size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{vendor.phoneNo || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconLocation size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
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
                  onClick={() => navigate(`/vendors/${vendor.vendorId ?? vendor.id}/effective-dates`, { state: { readOnly: true } })}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/vendors/${vendor.vendorId ?? vendor.id}/effective-dates`, { state: { mode: 'EDIT' } })}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />

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
