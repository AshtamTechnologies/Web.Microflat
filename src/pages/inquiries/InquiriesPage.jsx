/**
 * InquiriesPage.jsx — Inquiry management dashboard for MicroFlat ERP.
 *
 * Route: /inquiries
 * Supports both Table / List View and Drag-and-Drop Kanban View.
 * View preference is remembered across page refreshes and navigation.
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  IconAdd,
  IconEdit,
  IconInquiry,
  IconUserPlus,
  IconView,
  IconListView,
  IconKanbanView,
  IconQuotation,
  IconMeeting,
} from '../../constants/icons';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';

import {
  Button,
  SearchableSelect,
  Badge,
  PageHeader,
  DataTable,
  TableToolbar,
  TableActions,
  KanbanBoard,
} from '../../components/ui';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { useUsersContext } from '../../context/UsersContext';
import { INQUIRY_STAGES, normalizeInquiryStage, mapStageToApiStatus, API_INQUIRY_STATUSES, getInquiryStage } from './inquiryStages';
import InquiryKanbanCard from './components/InquiryKanbanCard';
import AssignInquiryModal from './components/AssignInquiryModal';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

function getPriorityBadgeVariant(priority) {
  if (priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'neutral';
}

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  ...API_INQUIRY_STATUSES.map((s) => ({ value: s.id, label: s.name })),
];

export default function InquiriesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    inquiries,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    resetFilters,
    changeInquiryStatus,
    isLoading,
    priorityLevels = [],
  } = useInquiriesContext();

  const priorityFilterOptions = useMemo(() => [
    { value: 'ALL', label: 'All Priorities' },
    ...priorityLevels.map((priority) => ({
      value: String(priority.id),
      label: priority.priorityName || priority.name || '',
    })),
  ], [priorityLevels]);

  const { quotations = [], refreshQuotations } = useQuotationsContext();

  // Ensure quotations are loaded on page mount/refresh
  useEffect(() => {
    if (refreshQuotations) {
      refreshQuotations();
    }
  }, [refreshQuotations]);

  // Lookup map to quickly check if an inquiry has linked quotation(s)
  const quotationByInquiryMap = useMemo(() => {
    const map = new Map();
    (quotations || []).forEach((q) => {
      if (q.inquiryId !== undefined && q.inquiryId !== null && q.inquiryId !== '') {
        map.set(String(q.inquiryId).toLowerCase(), q);
      }
      if (q.inquiryNo) {
        const cleanNo = String(q.inquiryNo).trim().toLowerCase();
        map.set(cleanNo, q);
      }
    });
    return map;
  }, [quotations]);

  // Helper to find linked quotation for any inquiry
  const getLinkedQuotation = useCallback(
    (inq) => {
      if (!inq) return null;
      const inqId = inq.id || inq.InquiryId;
      const inqNo = inq.InquiryNo || inq.inquiryNo;

      let linked = null;
      if (inqId) {
        linked = quotationByInquiryMap.get(String(inqId).toLowerCase());
      }
      if (!linked && inqNo) {
        const cleanInqNo = String(inqNo).trim().toLowerCase();
        linked = quotationByInquiryMap.get(cleanInqNo);
      }
      return linked;
    },
    [quotationByInquiryMap]
  );

  // Derive inquiry's active stage, respecting linked quotations & normalized stages
  const resolveInquiryStage = useCallback(
    (inq) => {
      if (!inq) return '';
      const explicitStatus = inq.StatusId || inq.status;
      const normalized = normalizeInquiryStage(explicitStatus);
      const linkedQuotation = getLinkedQuotation(inq);

      if (linkedQuotation) {
        const qStatus = String(linkedQuotation.status || '').trim().toLowerCase();
        if (qStatus.includes('negotiat')) {
          return 'Negotiation';
        }
        if (linkedQuotation.poReceived || qStatus === 'po received') {
          return 'PO created';
        }
        if (qStatus === 'confirmed') {
          return 'Accepted';
        }
        // If the inquiry was in initial stage, advance it to Quotation
        if (
          normalized === 'Inquiry' ||
          normalized === 'Qualified' ||
          !explicitStatus ||
          explicitStatus === 'New'
        ) {
          return 'Quotation';
        }
      }

      return normalized;
    },
    [getLinkedQuotation]
  );

  const { allUsers = [], users = [], ensureUsersLoaded } = useUsersContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  useEffect(() => {
    if (userList.length === 0 && ensureUsersLoaded) {
      ensureUsersLoaded();
    }
  }, [userList.length, ensureUsersLoaded]);

  // View mode switcher: 'list' | 'kanban' with persistent storage & URL support
  const [viewMode, setViewMode] = useState(() => {
    const urlView = searchParams.get('view');
    if (urlView === 'kanban' || urlView === 'list') return urlView;
    try {
      const saved = localStorage.getItem('mf_inquiries_view_mode');
      if (saved === 'kanban' || saved === 'list') return saved;
    } catch {
      // ignore storage error
    }
    return 'list';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('mf_inquiries_view_mode', mode);
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

  // Modals state
  const [assignModalInquiry, setAssignModalInquiry] = useState(null);

  // TanStack table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const loading = isLoading;

  // Helper to resolve user names from user IDs
  const resolveUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const found = userList.find((u) => String(u.id || u.userId) === String(userId));
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

  const getInquiryOverflowActions = useCallback(
    (inq) => {
      const inqId = inq.id || inq.InquiryId;
      const status = inq.status || inq.StatusId || '';
      const canCreateQuotation =
        status === 'New' || status === 'Quoting';
      return [
        ...(canCreateQuotation
          ? [{
              label: 'Create Quotation',
              icon: IconQuotation,
              onClick: () =>
                navigate(`/quotations/new?inquiryId=${inqId}`, {
                  state: { from: '/inquiries' },
                }),
            }]
          : []),
        {
          label: 'Schedule Meeting',
          icon: IconMeeting,
          onClick: () =>
            navigate(`/meetings/new?inquiryId=${inqId}`, {
              state: { from: '/inquiries' },
            }),
        },
        {
          label: inq.AssignedTo ? 'Reassign Inquiry' : 'Assign Inquiry',
          icon: IconUserPlus,
          onClick: () => setAssignModalInquiry(inq),
        },
      ];
    },
    [navigate]
  );

  /* ── Column Definitions for TanStack Table ── */
  const columns = useMemo(
    () => [
      /* 1. INQUIRY NO */
      columnHelper.accessor('InquiryNo', {
        header: 'INQUIRY NO',
        minSize: 125,
        size: 135,
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
          minSize: 210,
          size: 240,
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
        minSize: 180,
        size: 220,
        cell: (info) => {
          const subject =
            info.getValue() ||
            info.row.original.items?.[0]?.itemName ||
            info.row.original.items?.[0]?.specification ||
            '—';
          return (
            <span
              className="text-xs text-text font-medium line-clamp-1"
              title={subject}
            >
              {subject}
            </span>
          );
        },
      }),

      /* 4. REGION */
      columnHelper.accessor((row) => row.regionName || row.RegionName || '', {
        id: 'region',
        header: 'REGION',
        minSize: 120,
        size: 140,
        cell: (info) => {
          const regionLabel = info.getValue() || '—';
          return (
            <span
              className="text-xs text-text-muted truncate block"
              title={regionLabel}
            >
              {regionLabel}
            </span>
          );
        },
      }),

      /* 5. PRIORITY */
      columnHelper.accessor('Priority', {
        header: 'PRIORITY',
        minSize: 95,
        size: 105,
        cell: (info) => {
          const priority = info.getValue();
          if (!priority) return <span className="text-xs text-text-muted">—</span>;
          return (
            <Badge
              variant={getPriorityBadgeVariant(priority)}
              className="text-2xs px-2 py-0.5"
            >
              {priority}
            </Badge>
          );
        },
      }),

      /* 6. STATUS */
      columnHelper.accessor((row) => resolveInquiryStage(row), {
        id: 'status',
        header: 'STATUS',
        minSize: 120,
        size: 130,
        cell: (info) => {
          const statusId = info.getValue();
          const statusInfo = getInquiryStage(statusId);
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border ${statusInfo?.badgeClass || 'bg-surface text-text-muted border-border'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusInfo?.dotClass || 'bg-text-muted'}`}
                aria-hidden="true"
              />
              {statusInfo?.name || statusId || '—'}
            </span>
          );
        },
      }),

      /* 7. ASSIGNED TO */
      columnHelper.accessor('AssignedTo', {
        header: 'ASSIGNED TO',
        minSize: 130,
        size: 145,
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
        minSize: 115,
        size: 125,
        cell: (info) => {
          const createdOn = info.getValue();
          return (
            <span className="font-mono tabular-nums text-xs text-text-muted whitespace-nowrap">
              {formatDate(createdOn)}
            </span>
          );
        },
      }),

      /* 9. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 136,
        size: 140,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const rowId = row.id || row.InquiryId;

          return (
            <TableActions
              onView={() => navigate(`/inquiries/${rowId}`)}
              onEdit={() => navigate(`/inquiries/${rowId}/edit`)}
              viewTooltip="View Inquiry Details"
              editTooltip="Edit Inquiry"
              className="justify-end shrink-0"
              overflowActions={getInquiryOverflowActions(row)}
            />
          );
        },
      }),
    ],
    [navigate, userList, getInquiryOverflowActions]
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

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Inquiry Management"
        subtitle="Track customer RFQs, precision manufacturing enquiries, assignments & conversion status."
        icon={<IconInquiry className="h-6 w-6 text-primary" aria-hidden="true" />}
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
              onClick={() => navigate('/inquiries/new')}
              className="shadow-sm text-xs font-semibold"
            >
              <IconAdd size={16} className="mr-1.5" aria-hidden="true" />
              New Inquiry
            </Button>
          </div>
        }
      />

      {/* ── Table & Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer, inquiry no, subject, email..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      >
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
            options={priorityFilterOptions}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Conditional View Rendering: List vs. Kanban ── */}
      {viewMode === 'list' ? (
        <DataTable
          table={table}
          columns={columns}
          isLoading={loading}
          totalCount={inquiries.length}
          entityName="inquiries"
          emptyTitle="No inquiries found"
          emptyDescription={
            hasActiveFilters
              ? 'Try altering your search or status filters.'
              : 'No customer inquiries have been logged yet.'
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
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate('/inquiries/new')}
                className="text-xs"
              >
                <IconAdd size={14} className="mr-1.5" />
                New Inquiry
              </Button>
            )
          }
          renderMobileCard={(row) => {
            const inq = row.original;
            const statusId = inq.status || inq.StatusId || '';
            const statusInfo = getInquiryStage(statusId);
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
                      <Badge
                        variant={getPriorityBadgeVariant(inq.Priority)}
                        className="text-2xs px-1.5 py-0"
                      >
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
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border shrink-0 ${statusInfo?.badgeClass || 'bg-surface text-text-muted border-border'}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusInfo?.dotClass || 'bg-text-muted'}`}
                    />
                    {statusInfo?.name || statusId || '—'}
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
                      {inq.regionName || ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono tabular-nums text-2xs">
                    <span>Date:</span>
                    <span>{formatDate(inq.InquiryDate)}</span>
                  </div>
                </div>

                {/* Action buttons footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(`/inquiries/${inq.id || inq.InquiryId}`)
                    }
                    className="flex-1 text-xs"
                  >
                    <IconView
                      size={13}
                      className="mr-1.5"
                      aria-hidden="true"
                    />
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(`/inquiries/${inq.id || inq.InquiryId}/edit`)
                    }
                    className="flex-1 text-xs"
                  >
                    <IconEdit
                      size={13}
                      className="mr-1.5"
                      aria-hidden="true"
                    />
                    Edit
                  </Button>
                  <TableActions overflowActions={getInquiryOverflowActions(inq)} />
                </div>
              </div>
            );
          }}
        />
      ) : (
        /* ── Kanban Board View ── */
        <div className="space-y-3">
          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs text-text-muted px-1">
              <span>
                Showing filtered inquiries across stages ({inquiries.length} total)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-primary h-7 px-2"
              >
                Clear filters
              </Button>
            </div>
          )}

          <KanbanBoard
            columns={INQUIRY_STAGES}
            items={inquiries}
            getItemId={(item) => item.id || item.InquiryId}
            getItemStatus={(item) => resolveInquiryStage(item)}
            onItemMove={(itemId, newStatusId, oldStatusId, targetItemId, position) => {
              const apiStatus = mapStageToApiStatus(newStatusId);
              changeInquiryStatus(itemId, apiStatus, '', targetItemId, position);
            }}
            renderCard={(item) => {
              const linkedQuotation = getLinkedQuotation(item);
              const stage = resolveInquiryStage(item);

              return (
                <InquiryKanbanCard
                  inquiry={item}
                  assigneeName={resolveUserName(item.AssignedTo)}
                  onAssignClick={(inq) => setAssignModalInquiry(inq)}
                  onMoveStage={(itemId, newStatusId) => {
                    const apiStatus = mapStageToApiStatus(newStatusId);
                    changeInquiryStatus(itemId, apiStatus);
                  }}
                  availableStages={INQUIRY_STAGES}
                  linkedQuotation={linkedQuotation}
                  inquiryStage={stage}
                />
              );
            }}
            emptyColumnText="No inquiries in this stage"
          />
        </div>
      )}

      {/* ── Assign Inquiry Modal ── */}
      <AssignInquiryModal
        isOpen={Boolean(assignModalInquiry)}
        onClose={() => setAssignModalInquiry(null)}
        inquiry={assignModalInquiry}
      />
    </div>
  );
}
