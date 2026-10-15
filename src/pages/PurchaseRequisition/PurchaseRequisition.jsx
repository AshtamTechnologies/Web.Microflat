/**
 * PurchaseRequisition.jsx — Purchase Requisition List Page.
 * Implements the system standard table grid UI matching Vendors and Clients:
 *   - Unified table card container with integrated filter toolbar
 *   - TanStack React Table with resizable columns, sort chevrons, and pagination
 *   - Project ID column and search/filter support
 *   - Live search, status filter, project filter, and date filter
 *   - URL search parameter synchronization for seamless dashboard navigation
 *   - Ghost action buttons (View, Edit, Delete) with ConfirmModal dialog
 *   - Responsive mobile card view
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { Plus, Eye, Pencil } from 'lucide-react';
import { IconPR } from '../../constants/icons';

import {
  Button,
  DatePicker,
  SearchableSelect,
  Badge,
  PageHeader,
  DataTable,
  TableToolbar,
  TableActions,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  formatPRDate,
  getPRStatusBadgeVariant,
  STATUS_OPTIONS,
  PROJECT_OPTIONS,
  getProjectName,
} from '../../mocks/purchaseRequisitions';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  ...STATUS_OPTIONS,
];

const PROJECT_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Projects' },
  ...PROJECT_OPTIONS.map((p) => ({
    value: p.value,
    label: `${p.value} - ${p.projectName}`,
  })),
];

export default function PurchaseRequisition() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    requisitions,
    filteredRequisitions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    dateFilter,
    setDateFilter,
    resetFilters,
    deletePR,
  } = usePurchaseRequisitionContext();

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Sync URL search parameters on mount / route changes (e.g. from Dashboard)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const projectParam = searchParams.get('project') || searchParams.get('projectId');
    const searchParam = searchParams.get('search');
    const resetParam = searchParams.get('reset') || searchParams.get('filter');

    if (resetParam === 'true' || resetParam === 'ALL' || resetParam === 'all') {
      resetFilters();
      return;
    }

    if (statusParam) {
      const matchedStatus = STATUS_OPTIONS.find(
        (s) => s.value.toLowerCase() === statusParam.toLowerCase()
      );
      if (matchedStatus) {
        setStatusFilter(matchedStatus.value);
      } else if (statusParam.toUpperCase() === 'ALL') {
        setStatusFilter('ALL');
      }
    }

    if (projectParam) {
      const matchedProj = PROJECT_OPTIONS.find(
        (p) => p.value.toLowerCase() === projectParam.toLowerCase()
      );
      if (matchedProj) {
        setProjectFilter(matchedProj.value);
      } else if (projectParam.toUpperCase() === 'ALL') {
        setProjectFilter('ALL');
      }
    }

    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams, setStatusFilter, setProjectFilter, setSearch, resetFilters]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, projectFilter, dateFilter]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      statusFilter !== 'ALL' ||
      projectFilter !== 'ALL' ||
      dateFilter
  );

  /* ── Column Definitions with Resizing and Sorting ── */
  const columns = useMemo(
    () => [
      /* 1. PR NUMBER */
      columnHelper.accessor('prNumber', {
        header: 'PR NUMBER',
        minSize: 130,
        size: 145,
        cell: (info) => {
          const pr = info.row.original;
          return (
            <button
              type="button"
              onClick={() =>
                navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`)
              }
              className="font-mono text-xs font-semibold text-primary hover:underline cursor-pointer text-left whitespace-nowrap"
            >
              {pr.prNumber}
            </button>
          );
        },
      }),

      /* 2. PR DATE */
      columnHelper.accessor('prDate', {
        header: 'PR DATE',
        minSize: 110,
        size: 120,
        cell: (info) => (
          <span className="text-text-muted text-xs font-mono whitespace-nowrap">
            {formatPRDate(info.getValue())}
          </span>
        ),
      }),

      /* 3. PROJECT ID (New Field) */
      columnHelper.accessor('projectId', {
        header: 'PROJECT ID',
        minSize: 140,
        size: 170,
        cell: (info) => {
          const projectId = info.getValue();
          if (!projectId) {
            return <span className="text-text-muted text-xs font-mono">—</span>;
          }
          const projectName = getProjectName(projectId);
          return (
            <div className="flex flex-col min-w-0">
              <span className="font-mono text-xs font-semibold text-heading">
                {projectId}
              </span>
              <span
                className="text-2xs text-text-muted truncate max-w-[160px]"
                title={projectName}
              >
                {projectName}
              </span>
            </div>
          );
        },
      }),

      /* 4. REQUESTED BY & DEPARTMENT */
      columnHelper.accessor('requestedBy', {
        id: 'requestedBy',
        header: 'REQUESTED BY & DEPT',
        minSize: 160,
        size: 180,
        cell: (info) => {
          const pr = info.row.original;
          return (
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-heading text-xs truncate" title={pr.requestedBy}>
                {pr.requestedBy || '—'}
              </span>
              <span className="text-2xs text-text-muted truncate mt-0.5" title={pr.department}>
                {pr.department || '—'}
              </span>
            </div>
          );
        },
      }),

      /* 5. REQUIRED DATE */
      columnHelper.accessor('requiredDate', {
        header: 'REQUIRED DATE',
        minSize: 110,
        size: 125,
        cell: (info) => (
          <span className="text-text-muted text-xs font-mono whitespace-nowrap">
            {formatPRDate(info.getValue())}
          </span>
        ),
      }),

      /* 6. STATUS */
      columnHelper.accessor('status', {
        header: 'STATUS',
        minSize: 130,
        size: 145,
        cell: (info) => {
          const status = info.getValue() || 'Pending Approval';
          const statusVariant = getPRStatusBadgeVariant(status);
          return (
            <div className="inline-flex items-center whitespace-nowrap">
              <Badge variant={statusVariant}>{status}</Badge>
            </div>
          );
        },
      }),

      /* 7. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 90,
        size: 100,
        enableResizing: false,
        enableSorting: false,
        cell: (info) => {
          const pr = info.row.original;
          const prKey = pr.prNumber || pr.prId;
          return (
            <TableActions
              onView={() => navigate(`/purchase-requisition/${prKey}`)}
              onEdit={() => navigate(`/purchase-requisition/${prKey}/edit`)}
              viewTitle="View Requisition"
              editTitle="Edit Requisition"
            />
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

  const handleDeleteConfirm = () => {
    if (!prToDelete) return;
    deletePR(prToDelete.prNumber || prToDelete.prId);
    setPrToDelete(null);
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── Page Header ── */}
      <PageHeader
        title="Purchase Requisition"
        subtitle="Manage purchase requisitions and track their approval pipeline."
        icon={<IconPR className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <Badge variant="role" className="text-xs">
            {filteredRequisitions.length}{' '}
            {filteredRequisitions.length === 1 ? 'Record' : 'Records'}
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/purchase-requisition/create')}
            className="shadow-sm font-semibold text-xs"
          >
            <Plus size={16} className="mr-1.5" />
            Create Purchase Requisition
          </Button>
        }
      />

            {/* ── Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search PR, project, requester, item..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      >
        {/* Status Filter Dropdown */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="filter-pr-status"
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>

        {/* Project Filter Dropdown */}
        <div className="w-full sm:w-56">
          <SearchableSelect
            id="filter-pr-project"
            placeholder="All Projects"
            searchPlaceholder="Search projects..."
            options={PROJECT_FILTER_OPTIONS}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="w-full sm:w-48 min-w-[185px]">
          <DatePicker
            id="filter-pr-date"
            name="dateFilter"
            placeholder="Filter Date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Responsive Mobile Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        totalCount={filteredRequisitions.length}
        entityName="requisitions"
        emptyTitle="No purchase requisitions found"
        emptyDescription={
          hasActiveFilters
            ? 'Try clearing or changing your filters to find what you are looking for.'
            : 'No purchase requisitions have been created yet. Click create to add your first requisition.'
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
              variant="primary"
              size="sm"
              onClick={() => navigate('/purchase-requisition/create')}
              className="text-xs"
            >
              <Plus size={14} className="mr-1" />
              Create Purchase Requisition
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const pr = row.original;
          const statusVariant = getPRStatusBadgeVariant(pr.status);
          return (
            <div
              key={pr.id || pr.prNumber || pr.prId}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`)
                    }
                    className="text-base font-bold text-primary hover:underline text-left font-mono"
                  >
                    {pr.prNumber}
                  </button>
                  <div className="text-xs text-text-muted mt-0.5 font-mono">
                    Date: {formatPRDate(pr.prDate)}
                  </div>
                </div>
                <Badge variant={statusVariant}>{pr.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                <div>
                  <span className="text-text-muted">Project ID:</span>
                  <div className="font-semibold text-heading font-mono mt-0.5 truncate">
                    {pr.projectId || '—'}
                  </div>
                  {pr.projectId && (
                    <div className="text-2xs text-text-muted truncate">
                      {getProjectName(pr.projectId)}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-text-muted">Requested By:</span>
                  <div className="font-medium text-text mt-0.5 truncate">
                    {pr.requestedBy}
                  </div>
                </div>
                <div>
                  <span className="text-text-muted">Department:</span>
                  <div className="font-medium text-text mt-0.5 truncate">
                    {pr.department}
                  </div>
                </div>
                <div>
                  <span className="text-text-muted">Required Date:</span>
                  <div className="font-medium text-text mt-0.5 font-mono">
                    {formatPRDate(pr.requiredDate)}
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`)
                  }
                  className="flex-1 text-xs"
                >
                  <Eye size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/purchase-requisition/${pr.prNumber || pr.prId}/edit`)
                  }
                  className="flex-1 text-xs"
                >
                  <Pencil size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
