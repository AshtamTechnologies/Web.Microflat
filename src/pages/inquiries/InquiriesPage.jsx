/**
 * InquiriesPage.jsx — Inquiry management dashboard for MicroFlat ERP.
 *
 * Route: /inquiries
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
  Eye,
  UserPlus,
  SearchX,
  RotateCcw,
  Inbox,
  Calendar,
  Building2,
  Trash2,
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
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  getRegionName,
  getStatusOption,
  getPriorityBadgeVariant,
} from '../../mocks/inquiries';
import AssignInquiryModal from './components/AssignInquiryModal';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  ...STATUS_OPTIONS.map((s) => ({ value: s.id, label: s.name })),
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  ...PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
];

export default function InquiriesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    inquiries,
    allInquiries,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    resetFilters,
    deleteInquiry,
  } = useInquiriesContext();

  const { allUsers = [], users = [] } = useUsersContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  // Modals state
  const [assignModalInquiry, setAssignModalInquiry] = useState(null);
  const [inquiryToDelete, setInquiryToDelete] = useState(null);

  // TanStack table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [loading] = useState(false);

  // Helper to resolve user names from user IDs
  const resolveUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const found = userList.find((u) => u.id === userId);
    return found ? `${found.firstName} ${found.lastName}` : 'Unassigned';
  };

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
  );

  // Sync search parameters from URL if any
  useEffect(() => {
    const s = searchParams.get('status');
    const q = searchParams.get('search');
    if (s) setStatusFilter(s);
    if (q) setSearch(q);
  }, [searchParams, setStatusFilter, setSearch]);

  // Reset pagination on filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, priorityFilter]);

  /* ── Column Definitions for TanStack Table ── */
  const columns = useMemo(
    () => [
      /* 1. INQUIRY NO */
      columnHelper.accessor('InquiryNo', {
        header: 'INQUIRY NO',
        minSize: 140,
        size: 155,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/inquiries/${row.id || row.InquiryId}`}
              className="font-mono text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              {row.InquiryNo}
            </Link>
          );
        },
      }),

      /* 2. CUSTOMER / CONTACT */
      columnHelper.accessor(
        (row) => `${row.CustomerName} ${row.ContactPerson} ${row.Email}`,
        {
          id: 'customerContact',
          header: 'CUSTOMER / CONTACT',
          minSize: 220,
          size: 260,
          cell: (info) => {
            const row = info.row.original;
            return (
              <div className="flex flex-col py-0.5 max-w-xs">
                <Link
                  to={`/inquiries/${row.id || row.InquiryId}`}
                  className="font-semibold text-heading text-sm leading-snug hover:text-primary transition-colors truncate"
                >
                  {row.CustomerName}
                </Link>
                <span className="text-text-muted text-xs leading-normal truncate">
                  {row.ContactPerson || '—'} {row.Email ? `• ${row.Email}` : ''}
                </span>
              </div>
            );
          },
        }
      ),

      /* 3. SUBJECT */
      columnHelper.accessor('Subject', {
        header: 'SUBJECT',
        minSize: 200,
        size: 250,
        cell: (info) => {
          const subject = info.getValue();
          return (
            <span
              className="text-xs text-text font-medium line-clamp-1"
              title={subject}
            >
              {subject || '—'}
            </span>
          );
        },
      }),

      /* 4. REGION */
      columnHelper.accessor('RegionId', {
        header: 'REGION',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const regionId = info.getValue();
          const regionLabel = getRegionName(regionId);
          return (
            <span className="text-xs text-text-muted truncate block" title={regionLabel}>
              {regionLabel}
            </span>
          );
        },
      }),

      /* 5. PRIORITY */
      columnHelper.accessor('Priority', {
        header: 'PRIORITY',
        minSize: 105,
        size: 115,
        cell: (info) => {
          const priority = info.getValue() || 'Medium';
          return (
            <Badge variant={getPriorityBadgeVariant(priority)} className="text-[11px] px-2 py-0.5">
              {priority}
            </Badge>
          );
        },
      }),

      /* 6. STATUS */
      columnHelper.accessor('StatusId', {
        header: 'STATUS',
        minSize: 125,
        size: 140,
        cell: (info) => {
          const statusId = info.getValue() || 'New';
          const statusInfo = getStatusOption(statusId);
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border ${statusInfo.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} aria-hidden="true" />
              {statusInfo.name}
            </span>
          );
        },
      }),

      /* 7. ASSIGNED TO */
      columnHelper.accessor('AssignedTo', {
        header: 'ASSIGNED TO',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const assignedId = info.getValue();
          const resolvedName = resolveUserName(assignedId);
          const isUnassigned = !assignedId || resolvedName === 'Unassigned';

          return isUnassigned ? (
            <span className="text-xs text-text-muted italic">Unassigned</span>
          ) : (
            <span className="text-xs font-medium text-heading">
              {resolvedName}
            </span>
          );
        },
      }),

      /* 8. CREATED ON */
      columnHelper.accessor('CreatedOn', {
        header: 'CREATED ON',
        minSize: 140,
        size: 150,
        cell: (info) => {
          const createdOn = info.getValue() || '—';
          return (
            <span className="font-mono tabular-nums text-xs text-text-muted whitespace-nowrap">
              {createdOn}
            </span>
          );
        },
      }),

      /* 9. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 100,
        size: 110,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;

          return (
            <div className="flex items-center justify-end gap-1">
              {/* View Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/inquiries/${row.id || row.InquiryId}`)}
                title="View Inquiry Details"
                className="text-text-muted hover:text-primary hover:bg-surface"
              >
                <Eye size={15} aria-hidden="true" />
              </Button>

              {/* Assign / Reassign Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAssignModalInquiry(row)}
                title={row.AssignedTo ? 'Reassign Inquiry' : 'Assign Inquiry'}
                className="text-text-muted hover:text-primary hover:bg-surface"
              >
                <UserPlus size={15} aria-hidden="true" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [navigate, userList]
  );

  /* ── React Table Instance ── */
  const table = useReactTable({
    data: inquiries,
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

  const totalRows = inquiries.length;
  const currentPage = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const startRow = totalRows === 0 ? 0 : currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);
  const pageCount = table.getPageCount();

  function handleDeleteConfirm() {
    if (!inquiryToDelete) return;
    deleteInquiry(inquiryToDelete.id || inquiryToDelete.InquiryId);
    setInquiryToDelete(null);
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <Inbox className="h-6 w-6 text-primary" aria-hidden="true" />
            Inquiry Management
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Track customer RFQs, precision manufacturing enquiries, assignments & conversion status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/inquiries/new')}
            className="shadow-sm text-xs font-semibold"
          >
            <Plus size={16} className="mr-1.5" aria-hidden="true" />
            New Inquiry
          </Button>
        </div>
      </div>

      {/* ── DESKTOP VIEW (md+): Table ── */}
      <div className="hidden md:block">
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center flex-1 gap-3 flex-wrap">
              <div className="w-full sm:w-80">
                <Input
                  id="inquiries-search"
                  type="search"
                  placeholder="Search by customer, inquiry no, subject, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search size={16} aria-hidden="true" />}
                />
              </div>

              <div className="w-full sm:w-44">
                <SearchableSelect
                  id="filter-status"
                  placeholder="All Statuses"
                  searchPlaceholder="Search status..."
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </div>

              <div className="w-full sm:w-44">
                <SearchableSelect
                  id="filter-priority"
                  placeholder="All Priorities"
                  searchPlaceholder="Search priority..."
                  options={PRIORITY_FILTER_OPTIONS}
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
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
          <TableContainer
            tableStyle={{
              width: '100%',
              minWidth: table.getCenterTotalSize(),
            }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface/60 border-b border-border">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    const canResize = header.column.getCanResize();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={canResize ? header.getResizeHandler() : undefined}
                        className={`relative py-3.5 px-5 select-none ${
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
                  <tr key={`skel-${rIdx}`} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={`skel-c-${cIdx}`} className="py-4 px-5">
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
                      <h4 className="text-sm font-semibold text-heading">No inquiries match your criteria</h4>
                      <p className="text-xs text-text-muted mt-1 mb-4">
                        {hasActiveFilters
                          ? 'Try clearing or modifying your search and status filter chips.'
                          : 'No inquiries have been registered yet.'}
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
                      <Td key={cell.id} style={{ width: cell.column.getSize() }} className="px-5">
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
              Showing <span className="font-medium text-heading">{startRow}-{endRow}</span> of <span className="font-medium text-heading">{totalRows}</span> inquiries
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
        {/* Mobile Search & Filters */}
        <div className="bg-surface border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
          <Input
            id="mobile-inquiries-search"
            type="search"
            placeholder="Search inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={16} aria-hidden="true" />}
          />

          <div className="grid grid-cols-2 gap-2">
            <SearchableSelect
              id="mobile-filter-status"
              placeholder="Status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <SearchableSelect
              id="mobile-filter-priority"
              placeholder="Priority"
              options={PRIORITY_FILTER_OPTIONS}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
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

        {/* Mobile Cards */}
        <div className="space-y-3">
          {table.getRowModel().rows.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-xl">
              <SearchX size={24} className="mx-auto text-text-muted opacity-60 mb-2" />
              <p className="text-xs font-semibold text-heading">No inquiries found</p>
              <p className="text-[11px] text-text-muted mt-0.5">Try altering your search or status chip</p>
            </div>
          ) : (
            table.getRowModel().rows.map((row) => {
              const inq = row.original;
              const statusInfo = getStatusOption(inq.StatusId);
              const assigneeName = resolveUserName(inq.AssignedTo);

              return (
                <div
                  key={inq.id || inq.InquiryId}
                  className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">
                          {inq.InquiryNo}
                        </span>
                        <Badge variant={getPriorityBadgeVariant(inq.Priority)} className="text-[10px] px-1.5 py-0">
                          {inq.Priority}
                        </Badge>
                      </div>

                      <Link
                        to={`/inquiries/${inq.id || inq.InquiryId}`}
                        className="block text-sm font-semibold text-heading leading-tight mt-1 hover:text-primary"
                      >
                        {inq.CustomerName}
                      </Link>
                      <p className="text-xs text-text font-medium mt-1 line-clamp-1">
                        {inq.Subject}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border shrink-0 ${statusInfo.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                      {statusInfo.name}
                    </span>
                  </div>

                  {/* Details summary */}
                  <div className="space-y-1 text-xs text-text-muted pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span>Assigned:</span>
                      <span className="font-medium text-heading">
                        {assigneeName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Region:</span>
                      <span className="truncate max-w-[180px]">
                        {getRegionName(inq.RegionId)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono tabular-nums text-[11px]">
                      <span>Date:</span>
                      <span>{inq.InquiryDate}</span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/inquiries/${inq.id || inq.InquiryId}`)}
                      className="flex-1 text-xs"
                    >
                      <Eye size={13} className="mr-1.5" />
                      View Details
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAssignModalInquiry(inq)}
                      className="flex-1 text-xs text-primary hover:bg-primary/10"
                    >
                      <UserPlus size={13} className="mr-1.5" />
                      Assign
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

      {/* ── Assign Inquiry Modal ── */}
      <AssignInquiryModal
        isOpen={Boolean(assignModalInquiry)}
        onClose={() => setAssignModalInquiry(null)}
        inquiry={assignModalInquiry}
      />
    </div>
  );
}
