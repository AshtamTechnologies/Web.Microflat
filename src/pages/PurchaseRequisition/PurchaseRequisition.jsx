/**
 * PurchaseRequisition.jsx — Purchase Requisition List Page.
 * Displays all purchase requisitions with resizable columns, sorting, pagination,
 * live search, status, priority, and date filters using TanStack React Table and Table.jsx system.
 */

import { useState, useMemo, useEffect } from 'react';
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
  Plus,
  Eye,
  Pencil,
  RotateCcw,
  Calendar,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Inbox,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Filter,
} from 'lucide-react';

import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  formatPRDate,
  getPRStatusBadgeVariant,
  getPRPriorityBadgeVariant,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../mocks/purchaseRequisitions';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  ...STATUS_OPTIONS,
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  ...PRIORITY_OPTIONS,
];

export default function PurchaseRequisition() {
  const navigate = useNavigate();
  const {
    requisitions,
    filteredRequisitions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    dateFilter,
    setDateFilter,
    resetFilters,
  } = usePurchaseRequisitionContext();

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, priorityFilter, dateFilter]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      statusFilter !== 'ALL' ||
      priorityFilter !== 'ALL' ||
      dateFilter
  );

  // Summary Metrics for quick ERP overview
  const metrics = useMemo(() => {
    return {
      total: requisitions.length,
      pending: requisitions.filter((r) => r.status === 'Pending Approval').length,
      approved: requisitions.filter((r) => r.status === 'Approved').length,
      draft: requisitions.filter((r) => r.status === 'Draft').length,
    };
  }, [requisitions]);

  /* ── Column Definitions with Resizing and Sorting ── */
  const columns = useMemo(
    () => [
      /* 1. PR NUMBER */
      columnHelper.accessor('prNumber', {
        header: 'PR Number',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const pr = info.row.original;
          return (
            <button
              type="button"
              onClick={() =>
                navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`)
              }
              className="font-semibold text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left"
            >
              <FileText size={14} className="text-primary/70 shrink-0" />
              <span>{pr.prNumber}</span>
            </button>
          );
        },
      }),

      /* 2. PR DATE */
      columnHelper.accessor('prDate', {
        header: 'PR Date',
        minSize: 110,
        size: 130,
        cell: (info) => (
          <span className="text-text-muted text-xs sm:text-sm">
            {formatPRDate(info.getValue())}
          </span>
        ),
      }),

      /* 3. REQUESTED BY */
      columnHelper.accessor('requestedBy', {
        header: 'Requested By',
        minSize: 140,
        size: 170,
        cell: (info) => (
          <span className="font-medium text-text text-xs sm:text-sm">
            {info.getValue() || '—'}
          </span>
        ),
      }),

      /* 4. DEPARTMENT */
      columnHelper.accessor('department', {
        header: 'Department',
        minSize: 130,
        size: 150,
        cell: (info) => (
          <span className="text-text-muted text-xs sm:text-sm">
            {info.getValue() || '—'}
          </span>
        ),
      }),

      /* 5. REQUIRED DATE */
      columnHelper.accessor('requiredDate', {
        header: 'Required Date',
        minSize: 110,
        size: 130,
        cell: (info) => (
          <span className="text-text-muted text-xs sm:text-sm">
            {formatPRDate(info.getValue())}
          </span>
        ),
      }),

      /* 6. PRIORITY */
      columnHelper.accessor('priority', {
        header: 'Priority',
        minSize: 100,
        size: 120,
        cell: (info) => {
          const priority = info.getValue() || 'Normal';
          const priorityVariant = getPRPriorityBadgeVariant(priority);
          return <Badge variant={priorityVariant}>{priority}</Badge>;
        },
      }),

      /* 7. STATUS */
      columnHelper.accessor('status', {
        header: 'Status',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const status = info.getValue() || 'Draft';
          const statusVariant = getPRStatusBadgeVariant(status);
          return <Badge variant={statusVariant}>{status}</Badge>;
        },
      }),

      /* 8. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        minSize: 120,
        size: 130,
        enableResizing: false,
        enableSorting: false,
        cell: (info) => {
          const pr = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5 pr-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`)
                }
                title="View Requisition"
                className="h-8 px-2.5 text-xs text-text hover:text-primary hover:border-primary"
              >
                <Eye size={13} className="mr-1" />
                View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigate(
                    `/purchase-requisition/${pr.prNumber || pr.prId}/edit`
                  )
                }
                title="Edit Requisition"
                className="h-8 px-2.5 text-xs text-text hover:text-primary hover:border-primary"
              >
                <Pencil size={13} className="mr-1" />
                Edit
              </Button>
            </div>
          );
        },
      }),
    ],
    [navigate]
  );

  /* ── TanStack Table Instance ── */
  const table = useReactTable({
    data: filteredRequisitions,
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
  const currentPageIndex = table.getState().pagination.pageIndex;
  const totalRows = filteredRequisitions.length;
  const startRow = totalRows === 0 ? 0 : currentPageIndex * pagination.pageSize + 1;
  const endRow = Math.min((currentPageIndex + 1) * pagination.pageSize, totalRows);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-heading">
              Purchase Requisition
            </h1>
            <Badge variant="role" className="text-xs">
              {filteredRequisitions.length}{' '}
              {filteredRequisitions.length === 1 ? 'Record' : 'Records'}
            </Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Manage purchase requisitions and track their status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/purchase-requisition/create')}
            className="shadow-sm font-semibold"
          >
            <Plus size={16} className="mr-1.5" />
            Create Purchase Requisition
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card
          padding="sm"
          className="flex items-center gap-3.5 border-border/80 bg-surface shadow-xs cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => {
            resetFilters();
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Total PRs
            </div>
            <div className="text-xl font-bold text-heading mt-0.5">
              {metrics.total}
            </div>
          </div>
        </Card>

        <Card
          padding="sm"
          className="flex items-center gap-3.5 border-border/80 bg-surface shadow-xs cursor-pointer hover:border-warning/40 transition-colors"
          onClick={() => {
            setStatusFilter('Pending Approval');
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Pending
            </div>
            <div className="text-xl font-bold text-warning mt-0.5">
              {metrics.pending}
            </div>
          </div>
        </Card>

        <Card
          padding="sm"
          className="flex items-center gap-3.5 border-border/80 bg-surface shadow-xs cursor-pointer hover:border-success/40 transition-colors"
          onClick={() => {
            setStatusFilter('Approved');
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Approved
            </div>
            <div className="text-xl font-bold text-success mt-0.5">
              {metrics.approved}
            </div>
          </div>
        </Card>

        <Card
          padding="sm"
          className="flex items-center gap-3.5 border-border/80 bg-surface shadow-xs cursor-pointer hover:border-border transition-colors"
          onClick={() => {
            setStatusFilter('Draft');
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-border/60 text-text-muted flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Drafts
            </div>
            <div className="text-xl font-bold text-heading mt-0.5">
              {metrics.draft}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <Card padding="md" className="space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Search Box */}
          <div className="md:col-span-4">
            <Input
              id="pr-search"
              label="Search"
              placeholder="Search by PR #, requester, department, or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <Select
              id="pr-status-filter"
              label="Status Filter"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <Select
              id="pr-priority-filter"
              label="Priority Filter"
              options={PRIORITY_FILTER_OPTIONS}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
          </div>

          {/* Date Filter */}
          <div className="md:col-span-2">
            <Input
              id="pr-date-filter"
              label="Date Filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex items-end">
            <Button
              variant="secondary"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              title="Reset all filters"
              className="w-full h-10 px-0 flex items-center justify-center"
            >
              <RotateCcw size={15} />
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2 border-t border-border text-xs text-text-muted">
            <Filter size={13} className="text-primary" />
            <span>
              Active filters applied. Showing {filteredRequisitions.length}{' '}
              results.
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-primary hover:underline font-medium ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </Card>

      {/* ── Desktop Data Table with Column Resizing & Sorting ── */}
      <div className="hidden md:block">
        <Card padding="none" className="overflow-hidden border border-border shadow-xs">
          <TableContainer
            tableStyle={{ width: table.getTotalSize(), minWidth: '100%' }}
            tableClassName="table-fixed"
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface border-b border-border">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const canResize = header.column.getCanResize();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={
                          canResize ? header.getResizeHandler() : undefined
                        }
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
                                <ChevronUp
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : sorted === 'desc' ? (
                                <ChevronDown
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <ChevronUp size={11} strokeWidth={2.5} />
                                  <ChevronDown size={11} strokeWidth={2.5} />
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div
                            className={`select-none ${
                              header.id === 'actions'
                                ? 'text-right w-full pr-4'
                                : ''
                            }`}
                          >
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

            <tbody className="divide-y divide-border bg-surface">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-border/40 flex items-center justify-center text-text-muted">
                        <Inbox size={24} />
                      </div>
                      <div className="text-base font-semibold text-heading">
                        No purchase requisitions found
                      </div>
                      <p className="text-xs text-text-muted">
                        {hasActiveFilters
                          ? 'No requisitions match your current search and filter criteria.'
                          : 'Get started by creating your first purchase requisition.'}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-2"
                        >
                          <RotateCcw size={14} className="mr-1" />
                          Reset Filters
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            navigate('/purchase-requisition/create')
                          }
                          className="mt-2"
                        >
                          <Plus size={14} className="mr-1" />
                          Create Purchase Requisition
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-bg/60 transition-colors group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className={cell.column.id === 'actions' ? 'text-right' : ''}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </Td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </TableContainer>

          {/* Pagination Footer */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-surface text-xs text-text-muted">
              <div>
                Showing {startRow} to {endRow} of {totalRows} entries
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  className="h-8 px-2.5 text-xs"
                >
                  Previous
                </Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((pg) => (
                  <Button
                    key={pg}
                    variant={pg === currentPageIndex + 1 ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => table.setPageIndex(pg - 1)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {pg}
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                  className="h-8 px-2.5 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Mobile Responsive Card View ── */}
      <div className="block md:hidden space-y-3">
        {table.getRowModel().rows.length === 0 ? (
          <Card padding="lg" className="text-center py-10">
            <div className="w-10 h-10 rounded-full bg-border/40 flex items-center justify-center text-text-muted mx-auto mb-2">
              <Inbox size={20} />
            </div>
            <div className="text-sm font-semibold text-heading">
              No purchase requisitions found
            </div>
            <p className="text-xs text-text-muted mt-1">
              Try adjusting your search or filters.
            </p>
          </Card>
        ) : (
          table.getRowModel().rows.map((row) => {
            const pr = row.original;
            const statusVariant = getPRStatusBadgeVariant(pr.status);
            const priorityVariant = getPRPriorityBadgeVariant(pr.priority);

            return (
              <Card
                key={pr.prId}
                padding="md"
                className="space-y-3 border-border hover:border-primary/40 transition-colors shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/purchase-requisition/${pr.prNumber || pr.prId}`
                        )
                      }
                      className="text-base font-bold text-primary hover:underline text-left"
                    >
                      {pr.prNumber}
                    </button>
                    <div className="text-xs text-text-muted mt-0.5">
                      Date: {formatPRDate(pr.prDate)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={statusVariant}>{pr.status}</Badge>
                    <Badge variant={priorityVariant} className="text-[10px]">
                      {pr.priority}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                  <div>
                    <span className="text-text-muted">Requested By:</span>
                    <div className="font-medium text-text mt-0.5">
                      {pr.requestedBy}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted">Department:</span>
                    <div className="font-medium text-text mt-0.5">
                      {pr.department}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted">Required Date:</span>
                    <div className="font-medium text-text mt-0.5">
                      {formatPRDate(pr.requiredDate)}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted">Items Count:</span>
                    <div className="font-medium text-text mt-0.5">
                      {pr.items?.length || 0} items
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/purchase-requisition/${pr.prNumber || pr.prId}`
                      )
                    }
                    className="flex-1 text-xs"
                  >
                    <Eye size={13} className="mr-1" />
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/purchase-requisition/${pr.prNumber || pr.prId}/edit`
                      )
                    }
                    className="flex-1 text-xs"
                  >
                    <Pencil size={13} className="mr-1" />
                    Edit
                  </Button>
                </div>
              </Card>
            );
          })
        )}

        {/* Mobile pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="text-xs"
            >
              Previous
            </Button>
            <span className="text-xs text-text-muted">
              Page {currentPageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
