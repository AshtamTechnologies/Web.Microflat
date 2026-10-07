/**
 * PurchaseRequisitionApprovalPage — Dedicated review and approval queue for pending purchase requisitions.
 * Route: /approvals/purchase-requisitions
 *
 * Core Behavior:
 *   - Shows ONLY requisitions where status === 'Pending Approval' from live PurchaseRequisitionContext.
 *   - Real-time filtered state: As soon as a requisition is approved or rejected, it immediately
 *     disappears from the queue without manual removal logic or page refresh.
 *   - Labeled ghost action buttons: "Approve" (success) and "Reject" (danger).
 *   - Confirmation dialog on Approve according to system standard.
 *   - Polished Reject modal with quick-reasons and clear validation.
 *   - Row click navigates to /purchase-requisition/:id for full read-only inspection.
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
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Building2,
  SearchX,
  RotateCcw,
  AlertCircle,
  FileText,
  User,
  Package,
  Calendar,
  Layers,
  Flame,
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
  Badge,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  formatPRDate,
  formatPRDateTime,
  getPRPriorityBadgeVariant,
} from '../../mocks/purchaseRequisitions';

const columnHelper = createColumnHelper();

export default function PurchaseRequisitionApprovalPage() {
  const navigate = useNavigate();
  const { requisitions, approvePR, rejectPR } = usePurchaseRequisitionContext();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Modal States
  const [prToApprove, setPrToApprove] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [prToReject, setPrToReject] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  /* ── Filter all requisitions for Pending only & Search query ── */
  const pendingPRs = useMemo(() => {
    return requisitions.filter(
      (pr) => (pr.status || '').toLowerCase().includes('pending')
    );
  }, [requisitions]);

  const filteredPendingPRs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pendingPRs.filter((pr) => {
      // Priority filter
      if (priorityFilter !== 'ALL') {
        if ((pr.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) {
          return false;
        }
      }

      // Search text
      if (!q) return true;
      const matchNumber = (pr.prNumber || '').toLowerCase().includes(q);
      const matchRequester = (pr.requestedBy || '').toLowerCase().includes(q);
      const matchDept = (pr.department || '').toLowerCase().includes(q);
      const matchItem = (pr.items || []).some(
        (it) =>
          (it.itemCode || '').toLowerCase().includes(q) ||
          (it.itemName || '').toLowerCase().includes(q)
      );

      return matchNumber || matchRequester || matchDept || matchItem;
    });
  }, [pendingPRs, search, priorityFilter]);

  const totalPendingCount = pendingPRs.length;
  const urgentCount = useMemo(
    () => pendingPRs.filter((pr) => pr.priority === 'Urgent').length,
    [pendingPRs]
  );
  const totalLineItems = useMemo(
    () => pendingPRs.reduce((sum, pr) => sum + (pr.items?.length || 0), 0),
    [pendingPRs]
  );
  const distinctDeptsCount = useMemo(
    () => new Set(pendingPRs.map((pr) => pr.department).filter(Boolean)).size,
    [pendingPRs]
  );

  const hasSearchFilter = Boolean(search.trim() || priorityFilter !== 'ALL');

  /* ── Approve Handler with Confirmation ── */
  function handleOpenApprove(pr) {
    setPrToApprove(pr);
    setApproveRemarks('');
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setPrToApprove(null);
    setApproveRemarks('');
  }

  async function handleConfirmApprove() {
    if (!prToApprove) return;

    try {
      setIsSubmittingApprove(true);
      await approvePR(prToApprove.prId || prToApprove.prNumber, {
        approvedBy: 'Ian Chesnut',
        remarks: approveRemarks.trim(),
      });

      toast.success(`Purchase Requisition ${prToApprove.prNumber} approved successfully`);
      setPrToApprove(null);
      setApproveRemarks('');
    } catch {
      toast.error('Failed to approve purchase requisition. Please try again.');
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  /* ── Reject Modal Handlers ── */
  function handleOpenReject(pr) {
    setPrToReject(pr);
    setRejectComments('');
  }

  function handleCloseReject() {
    if (isSubmittingReject) return;
    setPrToReject(null);
    setRejectComments('');
  }

  async function handleConfirmReject(e) {
    if (e) e.preventDefault();
    if (!prToReject || !rejectComments.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }

    try {
      setIsSubmittingReject(true);
      await rejectPR(prToReject.prId || prToReject.prNumber, {
        rejectedBy: 'Ian Chesnut',
        rejectionReason: rejectComments.trim(),
      });

      toast.success(`Purchase Requisition ${prToReject.prNumber} rejected`);
      handleCloseReject();
    } catch {
      toast.error('Failed to reject purchase requisition. Please try again.');
    } finally {
      setIsSubmittingReject(false);
    }
  }

  /* ── TanStack Table Columns ── */
  const columns = useMemo(
    () => [
      /* 1. PR NUMBER & PRIORITY */
      columnHelper.accessor('prNumber', {
        header: 'REQUISITION NO.',
        minSize: 150,
        size: 170,
        cell: (info) => {
          const row = info.row.original;
          const isUrgent = row.priority === 'Urgent';
          return (
            <div className="flex items-center gap-2 flex-wrap py-0.5">
              <span className="font-mono text-xs font-bold text-primary">
                {info.getValue() || '—'}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  isUrgent
                    ? 'bg-danger/10 text-danger border-danger/25'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                {isUrgent && <Flame size={10} className="stroke-[2.5]" />}
                {row.priority || 'Normal'}
              </span>
            </div>
          );
        },
      }),

      /* 2. REQUESTER & DEPARTMENT */
      columnHelper.accessor('requestedBy', {
        header: 'REQUESTER & DEPT',
        minSize: 200,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <span className="font-semibold text-heading text-xs sm:text-sm leading-snug">
                {row.requestedBy || 'Unknown'}
              </span>
              <span className="text-text-muted text-[11px] sm:text-xs leading-normal flex items-center gap-1 mt-0.5">
                <Building2 size={12} className="text-text-muted/70 shrink-0" />
                {row.department || 'General'}
              </span>
            </div>
          );
        },
      }),

      /* 3. LINE ITEMS COUNT & PREVIEW */
      columnHelper.accessor('items', {
        header: 'LINE ITEMS',
        minSize: 220,
        size: 260,
        cell: (info) => {
          const items = info.getValue() || [];
          const itemCount = items.length;
          const firstTwo = items.slice(0, 2).map((i) => i.itemName || i.itemCode).join(', ');
          const hasMore = itemCount > 2;

          return (
            <div className="flex items-center gap-2 py-0.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-surface border border-border text-heading rounded-md shrink-0">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="text-xs text-text-muted truncate max-w-xs" title={firstTwo}>
                {firstTwo}
                {hasMore && ` +${itemCount - 2} more`}
              </span>
            </div>
          );
        },
      }),

      /* 4. SUBMITTED / REQUIRED DATE */
      columnHelper.accessor('prDate', {
        header: 'SUBMITTED ON',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col text-xs text-text-muted font-mono tabular-nums py-0.5">
              <div className="flex items-center gap-1.5 text-heading font-medium">
                <Calendar size={12} className="text-primary shrink-0" />
                <span>{formatPRDate(row.prDate) || '—'}</span>
              </div>
              {row.requiredDate && (
                <span className="text-[10.5px] text-text-muted mt-0.5">
                  Req: {formatPRDate(row.requiredDate)}
                </span>
              )}
            </div>
          );
        },
      }),

      /* 5. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 190,
        size: 200,
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
                className="text-xs font-semibold text-success hover:text-success hover:bg-success/15 border border-success/30 hover:border-success/50 transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title={`Approve ${row.prNumber}`}
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
                className="text-xs font-semibold text-danger hover:text-danger hover:bg-danger/15 border border-danger/30 hover:border-danger/50 transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title={`Reject ${row.prNumber}`}
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
    data: filteredPendingPRs,
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
  const totalRows = filteredPendingPRs.length;
  const startRow = totalRows === 0 ? 0 : currentPage * pagination.pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pagination.pageSize, totalRows);

  const paginatedMobilePRs = useMemo(() => {
    const start = currentPage * pagination.pageSize;
    return filteredPendingPRs.slice(start, start + pagination.pageSize);
  }, [filteredPendingPRs, currentPage, pagination.pageSize]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-heading tracking-tight">
              Purchase Requisition Approval
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/30 shadow-2xs">
              <Clock size={12} className="shrink-0" />
              {totalPendingCount} pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Purchase requisitions awaiting review. Click any row to inspect complete item specifications before deciding.
          </p>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Pending PRs
            </span>
            <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{totalPendingCount}</p>
          <span className="text-[11px] text-text-muted mt-0.5 block">Awaiting manager signoff</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Urgent Priority
            </span>
            <div className="p-1.5 rounded-lg bg-danger/10 text-danger">
              <Flame size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{urgentCount}</p>
          <span className="text-[11px] text-text-muted mt-0.5 block">High urgency requisitions</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Line Items
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Package size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{totalLineItems}</p>
          <span className="text-[11px] text-text-muted mt-0.5 block">Materials requested</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Departments
            </span>
            <div className="p-1.5 rounded-lg bg-success/10 text-success">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{distinctDeptsCount}</p>
          <span className="text-[11px] text-text-muted mt-0.5 block">Active request centers</span>
        </div>
      </div>

      {/* ── Unified Card Container ── */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* ── Toolbar: Search & Priority Filter ── */}
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-1 gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search PR number, requester, department, item..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                className="w-full pl-9 pr-8 py-2 bg-surface text-text placeholder:text-text-muted border border-border rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-150"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-heading cursor-pointer p-0.5"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Priority Quick Filter */}
            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-lg border border-border text-xs">
              {['ALL', 'Normal', 'Urgent'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPriorityFilter(p);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    priorityFilter === p
                      ? 'bg-primary text-white shadow-2xs font-semibold'
                      : 'text-text-muted hover:text-heading hover:bg-bg'
                  }`}
                >
                  {p === 'ALL' ? 'All Priority' : p}
                </button>
              ))}
            </div>

            {hasSearchFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setPriorityFilter('ALL');
                }}
                className="text-xs text-text-muted hover:text-danger h-8 px-2"
                title="Reset filters"
              >
                <RotateCcw size={12} className="mr-1" />
                Reset
              </Button>
            )}
          </div>

          <span className="text-xs font-mono text-text-muted shrink-0 self-end sm:self-center">
            Showing <strong className="text-heading font-semibold">{filteredPendingPRs.length}</strong> of {totalPendingCount} pending
          </span>
        </div>

        {/* ── DESKTOP TABLE VIEW (md+) ── */}
        <div className="hidden md:block">
          <TableContainer>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={
                          header.column.getCanResize()
                            ? header.getResizeHandler()
                            : undefined
                        }
                        className={canSort ? 'cursor-pointer select-none' : 'select-none'}
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
                              header.id === 'actions' ? 'text-right w-full pr-1' : ''
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
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-16 text-center text-text-muted bg-bg"
                  >
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      {hasSearchFilter ? (
                        <>
                          <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted mb-3">
                            <SearchX size={22} className="stroke-[1.75]" aria-hidden="true" />
                          </div>
                          <h4 className="text-sm font-semibold text-heading">
                            No matching requisitions found
                          </h4>
                          <p className="text-xs text-text-muted mt-1">
                            Try adjusting or clearing your search term.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSearch('');
                              setPriorityFilter('ALL');
                            }}
                            className="mt-4 text-xs"
                          >
                            <RotateCcw size={13} className="mr-1.5" />
                            Clear search
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success mb-3 shadow-xs">
                            <CheckCircle2 size={24} className="stroke-[2.2]" aria-hidden="true" />
                          </div>
                          <h4 className="text-sm font-semibold text-heading">
                            No purchase requisitions pending approval
                          </h4>
                          <p className="text-xs text-text-muted mt-1">
                            All caught up! There are currently no purchase requisitions awaiting review.
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                /* ── Data Rows (Click row to view PR details) ── */
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      navigate(`/purchase-requisition/${row.original.prNumber || row.original.prId}`, {
                        state: { from: '/approvals/purchase-requisitions', backLabel: 'PR Approval', readOnly: true },
                      })
                    }
                    className="hover:bg-surface/80 cursor-pointer transition-colors duration-120 bg-bg group/row"
                    title="Click row to view full purchase requisition details"
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
          {paginatedMobilePRs.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success mx-auto mb-3">
                <CheckCircle2 size={22} className="stroke-[2.2]" aria-hidden="true" />
              </div>
              <h4 className="text-sm font-semibold text-heading">
                No requisitions pending approval
              </h4>
              <p className="text-xs text-text-muted mt-1">
                All caught up! There are currently no purchase requisitions awaiting review.
              </p>
            </div>
          ) : (
            paginatedMobilePRs.map((pr) => {
              const isUrgent = pr.priority === 'Urgent';
              const items = pr.items || [];

              return (
                <div
                  key={pr.prId || pr.prNumber}
                  onClick={() =>
                    navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`, {
                      state: { from: '/approvals/purchase-requisitions', backLabel: 'PR Approval', readOnly: true },
                    })
                  }
                  className="bg-bg rounded-xl border border-border p-4 shadow-2xs space-y-3 hover:border-primary/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">
                          {pr.prNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isUrgent
                              ? 'bg-danger/10 text-danger border-danger/25'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          {isUrgent && <Flame size={10} className="stroke-[2.5]" />}
                          {pr.priority || 'Normal'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-heading leading-tight mt-1">
                        {pr.requestedBy}
                      </h3>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <Building2 size={12} />
                        <span>{pr.department}</span>
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning/15 text-warning border border-warning/30 shrink-0">
                      <Clock size={11} className="shrink-0" />
                      Pending
                    </span>
                  </div>

                  {/* Materials brief */}
                  <div className="pt-2 border-t border-border text-xs text-text-muted space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span>Items: <strong>{items.length} line{items.length !== 1 ? 's' : ''}</strong></span>
                      <span>Date: {formatPRDate(pr.prDate)}</span>
                    </div>
                    {items.length > 0 && (
                      <p className="truncate text-[11px] text-text">
                        {items.map((i) => i.itemName || i.itemCode).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2 pt-2 border-t border-border"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenApprove(pr)}
                      className="flex-1 text-xs font-semibold text-success hover:bg-success/15 border border-success/30 h-8 justify-center"
                    >
                      <Check size={14} className="mr-1 stroke-[2.5]" />
                      Approve
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenReject(pr)}
                      className="flex-1 text-xs font-semibold text-danger hover:bg-danger/15 border border-danger/30 h-8 justify-center"
                    >
                      <X size={14} className="mr-1 stroke-[2.5]" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Table Pagination Footer ── */}
        {totalRows > 0 && (
          <div className="p-4 sm:px-6 bg-surface/50 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-text-muted">
              Showing <strong className="text-heading font-medium">{startRow}</strong> to{' '}
              <strong className="text-heading font-medium">{endRow}</strong> of{' '}
              <strong className="text-heading font-medium">{totalRows}</strong> results
            </span>

            <div className="flex items-center gap-2 self-center sm:self-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="text-xs h-8 px-3"
              >
                Previous
              </Button>

              <span className="font-mono text-xs px-2 text-text-muted">
                Page <strong className="text-heading">{currentPage + 1}</strong> of{' '}
                <strong className="text-heading">{Math.max(1, pageCount)}</strong>
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="text-xs h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 1. APPROVE CONFIRMATION MODAL ── */}
      <ConfirmModal
        isOpen={Boolean(prToApprove)}
        onClose={handleCloseApprove}
        onConfirm={handleConfirmApprove}
        title="Approve Purchase Requisition"
        description={
          prToApprove
            ? `Are you sure you want to approve purchase requisition ${prToApprove.prNumber} requested by ${prToApprove.requestedBy} (${prToApprove.department}) for ${prToApprove.items?.length || 0} line items? This will authorize procurement processing.`
            : ''
        }
        confirmText={isSubmittingApprove ? 'Approving...' : 'Yes, Approve Requisition'}
        confirmVariant="primary"
        loading={isSubmittingApprove}
      />

      {/* ── 2. REJECT MODAL WITH REASONS & VALIDATION ── */}
      {prToReject && (
        <Modal
          isOpen={Boolean(prToReject)}
          onClose={handleCloseReject}
          title="Reject Purchase Requisition"
          size="md"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
              <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-semibold text-danger">
                  Rejecting {prToReject.prNumber}
                </p>
                <p className="text-text-muted mt-0.5">
                  Requested by <strong className="text-heading">{prToReject.requestedBy}</strong> ({prToReject.department})
                </p>
              </div>
            </div>

            {/* Reason Textarea */}
            <div>
              <label htmlFor="rejection-reason" className="block text-xs font-semibold text-heading mb-1.5">
                Reason for Rejection <span className="text-danger">*</span>
              </label>
              <textarea
                id="rejection-reason"
                name="rejection-reason"
                rows={3}
                required
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Explain clearly why this purchase requisition is rejected..."
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-heading placeholder:text-text-muted focus:border-danger focus:outline-hidden focus:ring-2 focus:ring-danger/20 transition-all resize-y"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseReject}
                disabled={isSubmittingReject}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={isSubmittingReject || !rejectComments.trim()}
                loading={isSubmittingReject}
              >
                <X size={14} className="mr-1.5 stroke-[2.5]" />
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
