/**
 * src/pages/deals/DealsPage.jsx — Deals Module List Screen.
 * 100% consistent with Inquiry Management UI, supporting Table list view
 * and Drag-and-Drop Kanban pipeline view with the shared <KanbanBoard> component.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Button,
  DataTable,
  TableToolbar,
  TableActions,
  Badge,
  SearchableSelect,
  KanbanBoard,
  DatePicker,
} from '../../components/ui';
import {
  IconInquiry,
  IconView,
  IconAdd,
  IconDeal,
  IconListView,
  IconKanbanView,
} from '../../constants/icons';
import { useDealsContext } from '../../context/DealsContext';
import { DEAL_STAGES } from './dealStages';
import DealKanbanCard from './components/DealKanbanCard';
import DealStatusModal from './DealStatusModal';
import DealFormModal from './DealFormModal';
import NegotiationModal from './NegotiationModal';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

function formatCurrency(val, currency = 'INR') {
  if (val === null || val === undefined || val === '') return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
  return `${symbol}${Number(val).toLocaleString('en-IN')}`;
}

export default function DealsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    deals,
    lookups,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    isLoading,
    resetFilters,
    changeDealStatus,
    updateDeal,
    addNegotiation,
  } = useDealsContext();

  // View mode switcher: 'list' | 'kanban' with persistent storage & URL support
  const [viewMode, setViewMode] = useState(() => {
    const urlView = searchParams.get('view');
    if (urlView === 'kanban' || urlView === 'list') return urlView;
    try {
      const saved = localStorage.getItem('mf_deals_view_mode');
      if (saved === 'kanban' || saved === 'list') return saved;
    } catch {
      // ignore storage error
    }
    return 'list';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('mf_deals_view_mode', mode);
    } catch {
      // ignore
    }
    const newParams = new URLSearchParams(searchParams);
    if (mode === 'kanban') {
      newParams.set('view', 'kanban');
    } else {
      newParams.delete('view');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Sync state if URL view param changes externally (e.g. browser back/forward)
  useEffect(() => {
    const urlView = searchParams.get('view');
    if (urlView && (urlView === 'kanban' || urlView === 'list') && urlView !== viewMode) {
      setViewMode(urlView);
    }
  }, [searchParams, viewMode]);

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Status transition modal for Kanban drag-and-drop
  const [statusModalDeal, setStatusModalDeal] = useState(null);
  const [targetStatus, setTargetStatus] = useState(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Quick action modals triggered from Kanban cards
  const [editModalDeal, setEditModalDeal] = useState(null);
  const [discussionModalDeal, setDiscussionModalDeal] = useState(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter !== 'ALL' || fromDate || toDate
  );

  // Status Filter options
  const statusOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Statuses' },
      ...(lookups?.statuses || []).map((s) => ({
        value: String(s.id),
        label: s.statusName,
      })),
    ];
  }, [lookups]);

  const getStatusBadge = (statusName) => {
    switch (statusName) {
      case 'Won':
        return <Badge variant="success" size="sm">Won</Badge>;
      case 'On Hold':
        return <Badge variant="warning" size="sm">On Hold</Badge>;
      case 'Lost':
        return <Badge variant="danger" size="sm">Lost</Badge>;
      default:
        return <Badge variant="primary" size="sm">Open</Badge>;
    }
  };

  /* ── Drag & Drop Kanban Move Handler ── */
  const handleKanbanItemMove = async (itemId, newStatusId, oldStatusId) => {
    if (newStatusId === oldStatusId) return;
    const deal = deals.find((d) => String(d.id) === String(itemId));
    if (!deal) return;

    const targetStage = DEAL_STAGES.find((s) => s.id === newStatusId);
    if (!targetStage) return;

    // Moving to On Hold or Lost requires a reason remark
    if (newStatusId === 'On Hold' || newStatusId === 'Lost') {
      setStatusModalDeal(deal);
      setTargetStatus({ id: targetStage.statusId, statusName: targetStage.id });
      return;
    }

    // Moving to Won requires negotiated value
    if (newStatusId === 'Won') {
      if (deal.negotiatedValue === null || deal.negotiatedValue === undefined || deal.negotiatedValue === '') {
        toast.error('Please enter a Negotiated Value on the deal before marking it as Won.');
        setEditModalDeal(deal);
        return;
      }
      setStatusModalDeal(deal);
      setTargetStatus({ id: targetStage.statusId, statusName: targetStage.id });
      return;
    }

    // Moving back to Open
    try {
      await changeDealStatus(deal.id, targetStage.statusId, '');
    } catch (err) {
      console.error('Error changing deal status on drag:', err);
    }
  };

  const handleStatusModalConfirm = async (statusId, remarks) => {
    if (!statusModalDeal) return;
    setIsStatusSubmitting(true);
    try {
      await changeDealStatus(statusModalDeal.id, statusId, remarks);
      setStatusModalDeal(null);
      setTargetStatus(null);
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  // Quick edit save
  const handleQuickEditSave = async (formData) => {
    if (!editModalDeal) return;
    setIsActionSubmitting(true);
    try {
      await updateDeal(editModalDeal.id, formData);
      setEditModalDeal(null);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Quick log discussion save
  const handleQuickDiscussionSave = async (formData) => {
    if (!discussionModalDeal) return;
    setIsActionSubmitting(true);
    try {
      await addNegotiation(discussionModalDeal.id, formData);
      setDiscussionModalDeal(null);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  /* ── Column Definitions for Table ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('dealNo', {
        header: 'DEAL NO',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/deals/${row.id}`}
              className="font-mono text-xs font-semibold text-primary hover:underline"
            >
              {row.dealNo}
            </Link>
          );
        },
      }),

      columnHelper.accessor('clientName', {
        header: 'CUSTOMER / CLIENT',
        minSize: 180,
        size: 220,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <p className="font-semibold text-heading truncate">{row.clientName}</p>
              {row.clientCode && (
                <span className="text-3xs font-mono text-text-muted">{row.clientCode}</span>
              )}
            </div>
          );
        },
      }),

      columnHelper.accessor('inquiryNo', {
        header: 'SOURCE INQUIRY',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/inquiries/${row.inquiryId}`}
              className="inline-flex items-center gap-1 font-mono text-xs text-text-muted hover:text-primary"
            >
              <IconInquiry size={12} />
              {row.inquiryNo}
            </Link>
          );
        },
      }),

      columnHelper.accessor('expectedValue', {
        header: 'EXPECTED VALUE',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="font-mono tabular-nums text-xs font-semibold text-heading">
              {formatCurrency(row.expectedValue, row.currencyCode)}
            </span>
          );
        },
      }),

      columnHelper.accessor('negotiatedValue', {
        header: 'NEGOTIATED VALUE',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          if (row.negotiatedValue !== null && row.negotiatedValue !== undefined) {
            return (
              <span className="font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(row.negotiatedValue, row.currencyCode)}
              </span>
            );
          }
          return <span className="text-text-muted text-xs italic">In Negotiation</span>;
        },
      }),

      columnHelper.accessor('dealDate', {
        header: 'DATE',
        minSize: 100,
        size: 110,
        cell: (info) => (
          <span className="text-xs text-text-muted">{formatDate(info.getValue())}</span>
        ),
      }),

      columnHelper.accessor('dealStatus', {
        header: 'STATUS',
        minSize: 110,
        size: 120,
        cell: (info) => getStatusBadge(info.getValue()),
      }),

      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 100,
        size: 110,
        cell: (info) => {
          const row = info.row.original;
          return (
            <TableActions
              onView={() => navigate(`/deals/${row.id}`)}
              viewTitle="View Deal details"
            />
          );
        },
      }),
    ],
    [navigate]
  );

  /* ── React Table Instance with Server-Side Pagination ── */
  const pagination = useMemo(
    () => ({
      pageIndex: Math.max(0, (pageNumber || 1) - 1),
      pageSize: pageSize || 20,
    }),
    [pageNumber, pageSize]
  );

  const table = useReactTable({
    data: deals,
    columns,
    pageCount: totalPages || 1,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    manualPagination: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setPageNumber(next.pageIndex + 1);
      if (next.pageSize && next.pageSize !== pageSize) {
        setPageSize(next.pageSize);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar (100% Consistent with Inquiry Management) ── */}
      <PageHeader
        title="Deals & Negotiations"
        subtitle="Track commercial discussions, agreed price points, and pipeline closures between inquiry and quotation."
        icon={<IconDeal className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle: List vs Kanban */}
            <div className="inline-flex items-center p-1 rounded-xl bg-surface border border-border shadow-2xs">
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                title="Switch to List View"
                aria-pressed={viewMode === 'list'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-text-muted hover:text-heading hover:bg-surface-muted'
                }`}
              >
                <IconListView size={15} />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('kanban')}
                title="Switch to Kanban Board View"
                aria-pressed={viewMode === 'kanban'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-text-muted hover:text-heading hover:bg-surface-muted'
                }`}
              >
                <IconKanbanView size={15} />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/inquiries')}
              className="shadow-sm text-xs font-semibold"
            >
              <IconAdd size={16} className="mr-1.5" aria-hidden="true" />
              Convert Inquiry to Deal
            </Button>
          </div>
        }
      />

      {/* ── Table & Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by deal no, inquiry no, client name..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="filter-status"
            placeholder="All Statuses"
            searchPlaceholder="Search status..."
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-44 sm:min-w-[170px]">
          <DatePicker
            id="deals-from-date"
            size="sm"
            placeholder="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-44 sm:min-w-[170px]">
          <DatePicker
            id="deals-to-date"
            size="sm"
            placeholder="To date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Conditional View: List vs. Kanban ── */}
      {viewMode === 'list' ? (
        <DataTable
          table={table}
          columns={columns}
          isLoading={isLoading}
          totalCount={totalCount}
          entityName="deals"
          emptyTitle="No deals found"
          emptyDescription={
            hasActiveFilters
              ? 'Try adjusting your search criteria or clearing filters.'
              : 'No deals have been created yet. Convert a New inquiry to create your first deal.'
          }
          emptyAction={
            hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-primary">
                Clear Filters
              </Button>
            ) : null
          }
          renderMobileCard={(row) => {
            const deal = row.original;
            return (
              <div
                key={deal.id}
                className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/deals/${deal.id}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {deal.dealNo}
                    </Link>
                    <p className="font-semibold text-sm text-heading mt-0.5">{deal.clientName}</p>
                    <span className="text-2xs text-text-muted font-mono flex items-center gap-1 mt-0.5">
                      <IconInquiry size={12} /> {deal.inquiryNo}
                    </span>
                  </div>
                  {getStatusBadge(deal.dealStatus)}
                </div>

                <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-text-muted text-2xs block">Expected Value</span>
                    <span className="font-mono font-semibold text-heading">
                      {formatCurrency(deal.expectedValue, deal.currencyCode)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-2xs block">Negotiated Value</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {deal.negotiatedValue !== null ? formatCurrency(deal.negotiatedValue, deal.currencyCode) : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    className="flex-1 text-xs"
                  >
                    <IconView size={13} className="mr-1.5" />
                    View Details
                  </Button>
                </div>
              </div>
            );
          }}
        />
      ) : (
        /* ── Kanban Board (100% Consistent with Inquiries Kanban) ── */
        <KanbanBoard
          columns={DEAL_STAGES}
          items={deals}
          getItemId={(item) => item.id}
          getItemStatus={(item) => item.dealStatus}
          onItemMove={handleKanbanItemMove}
          columnWidth="w-80 min-w-[300px] max-w-[320px]"
          boardHeightClass="h-[calc(100vh-230px)] min-h-[520px]"
          renderColumnHeader={({ column, count, items: colItems }) => {
            const colTotal = (colItems || []).reduce(
              (sum, d) => sum + (d.negotiatedValue ?? d.expectedValue ?? 0),
              0
            );
            return (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${column.dotClass}`} />
                  <span className="font-semibold text-xs text-heading uppercase tracking-wider truncate">
                    {column.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {colTotal > 0 && (
                    <span className="text-3xs font-mono font-medium text-text-muted">
                      {formatCurrency(colTotal)}
                    </span>
                  )}
                  <span
                    className={`text-2xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${column.badgeClass}`}
                  >
                    {count}
                  </span>
                </div>
              </div>
            );
          }}
          renderCard={(item) => (
            <DealKanbanCard
              deal={item}
              onMoveStage={handleKanbanItemMove}
              availableStages={DEAL_STAGES}
              onEditClick={(deal) => setEditModalDeal(deal)}
              onLogDiscussionClick={(deal) => setDiscussionModalDeal(deal)}
            />
          )}
          emptyColumnText="No deals in this stage"
        />
      )}

      {/* ── Status Transition Modal (for drag-and-drop actions) ── */}
      {statusModalDeal && (
        <DealStatusModal
          isOpen={Boolean(statusModalDeal)}
          onClose={() => {
            setStatusModalDeal(null);
            setTargetStatus(null);
          }}
          targetStatus={targetStatus}
          deal={statusModalDeal}
          onConfirm={handleStatusModalConfirm}
          isSubmitting={isStatusSubmitting}
        />
      )}

      {/* ── Quick Edit Deal Modal from Kanban Card ── */}
      {editModalDeal && (
        <DealFormModal
          isOpen={Boolean(editModalDeal)}
          onClose={() => setEditModalDeal(null)}
          mode="EDIT"
          initialDeal={editModalDeal}
          currencies={lookups.currencies}
          onSave={handleQuickEditSave}
          isSubmitting={isActionSubmitting}
        />
      )}

      {/* ── Quick Log Discussion Modal from Kanban Card ── */}
      {discussionModalDeal && (
        <NegotiationModal
          isOpen={Boolean(discussionModalDeal)}
          onClose={() => setDiscussionModalDeal(null)}
          currencySymbol={discussionModalDeal.currencySymbol}
          onSave={handleQuickDiscussionSave}
          isSubmitting={isActionSubmitting}
        />
      )}
    </div>
  );
}
