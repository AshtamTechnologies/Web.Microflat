/**
 * ProjectsListPage.jsx — Projects Master console for MicroFlat ERP.
 * Displays, filters, and manages projects created from sales orders or in-house.
 * Aligned with ProjectCreation.md §7 and MicroFlat ERP Design System.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Button,
  DataTable,
  Badge,
  Input,
  SearchableSelect,
  FilterBar,
} from '../../components/ui';
import {
  IconProject,
  IconAdd,
  IconSearch,
  IconEdit,
  IconView,
  IconClock,
  IconReset,
} from '../../constants/icons';
import {
  Briefcase,
  Wrench,
  Layers,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { projectService } from '../../services';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Created', label: 'Created' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function getStatusBadgeVariant(status = '') {
  switch (status?.toLowerCase()) {
    case 'created':
      return 'neutral';
    case 'in progress':
      return 'active';
    case 'on hold':
      return 'warning';
    case 'completed':
      return 'approved';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Projects State
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Filter States
  const [search, setSearch] = useState('');
  const [projectTypeId, setProjectTypeId] = useState('ALL');
  const [projectBillingTypeId, setProjectBillingTypeId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Lookups
  const [lookups, setLookups] = useState({
    projectTypes: [],
    billingTypes: [],
  });

  // Load Lookups on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadLookups() {
      try {
        const lk = await projectService.getLookups();
        if (isMounted) {
          setLookups({
            projectTypes: lk?.projectTypes || [],
            billingTypes: lk?.billingTypes || [],
          });
        }
      } catch (err) {
        console.warn('Failed to load project lookups:', err);
      }
    }
    loadLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Projects from Backend
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = {
        pageNumber,
        pageSize,
      };

      if (search.trim()) query.search = search.trim();
      if (projectTypeId !== 'ALL') query.projectTypeId = Number(projectTypeId);
      if (projectBillingTypeId !== 'ALL') query.projectBillingTypeId = Number(projectBillingTypeId);
      if (statusFilter !== 'ALL') query.status = statusFilter;

      const res = await projectService.listProjects(query);
      setProjects(res.items || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      toast.error(err?.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [pageNumber, pageSize, search, projectTypeId, projectBillingTypeId, statusFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Reset Filters
  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setProjectTypeId('ALL');
    setProjectBillingTypeId('ALL');
    setStatusFilter('ALL');
    setPageNumber(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      projectTypeId !== 'ALL' ||
      projectBillingTypeId !== 'ALL' ||
      statusFilter !== 'ALL'
    );
  }, [search, projectTypeId, projectBillingTypeId, statusFilter]);

  // Dropdown Options
  const projectTypeOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Types' },
      ...(lookups.projectTypes || []).map((t) => ({
        value: String(t.id),
        label: t.typeName,
      })),
    ];
  }, [lookups.projectTypes]);

  const billingTypeOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Billing Types' },
      ...(lookups.billingTypes || []).map((b) => ({
        value: String(b.id),
        label: b.billingTypeName,
      })),
    ];
  }, [lookups.billingTypes]);

  // TanStack Table Column Definitions
  const columns = useMemo(
    () => [
      // 1. Project Code
      columnHelper.accessor('projectCode', {
        header: 'PROJECT CODE',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/projects/${row.id}`}
              className="font-mono text-xs font-bold text-primary hover:underline block"
            >
              {info.getValue()}
            </Link>
          );
        },
      }),

      // 2. Project Name
      columnHelper.accessor('projectName', {
        header: 'PROJECT NAME',
        minSize: 200,
        size: 240,
        cell: (info) => (
          <span
            className="text-xs font-medium text-heading block truncate max-w-[260px]"
            title={info.getValue()}
          >
            {info.getValue()}
          </span>
        ),
      }),

      // 3. Project Type
      columnHelper.accessor('projectTypeName', {
        header: 'TYPE',
        minSize: 120,
        size: 130,
        cell: (info) => {
          const val = info.getValue();
          const isCustomerOrder = val?.toLowerCase() === 'customer order';
          return (
            <span
              className={[
                'inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded font-medium',
                isCustomerOrder
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-surface-subtle text-text-muted border border-border',
              ].join(' ')}
            >
              {isCustomerOrder ? <Briefcase size={12} /> : <Wrench size={12} />}
              <span>{val}</span>
            </span>
          );
        },
      }),

      // 4. Sales Order No
      columnHelper.accessor('orderConfirmationNo', {
        header: 'SALES ORDER NO',
        minSize: 130,
        size: 140,
        cell: (info) => {
          const row = info.row.original;
          const orderNo = info.getValue();
          if (!orderNo || !row.orderConfirmationId) {
            return <span className="text-text-muted text-xs">—</span>;
          }
          return (
            <Link
              to={`/sales-orders/${row.orderConfirmationId}`}
              state={{ from: location.pathname + location.search }}
              className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>{orderNo}</span>
              <ExternalLink size={11} className="text-text-muted" />
            </Link>
          );
        },
      }),

      // 5. Client
      columnHelper.accessor('clientName', {
        header: 'CLIENT',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-xs text-heading truncate block max-w-[160px]" title={val}>
              {val || '—'}
            </span>
          );
        },
      }),

      // 6. Dates (Start → End)
      columnHelper.display({
        id: 'timeline',
        header: 'TIMELINE',
        minSize: 150,
        size: 170,
        cell: (info) => {
          const row = info.row.original;
          if (!row.startDate && !row.endDate) {
            return <span className="text-text-muted text-xs">—</span>;
          }
          return (
            <div className="text-xs font-mono text-text-muted">
              <span>{row.startDate ? formatDate(row.startDate) : '—'}</span>
              <span className="mx-1 text-text-muted/60">→</span>
              <span className="text-heading font-medium">
                {row.endDate ? formatDate(row.endDate) : '—'}
              </span>
            </div>
          );
        },
      }),

      // 7. Status
      columnHelper.accessor('status', {
        header: 'STATUS',
        minSize: 100,
        size: 110,
        cell: (info) => {
          const val = info.getValue();
          return (
            <Badge variant={getStatusBadgeVariant(val)} size="sm">
              {val}
            </Badge>
          );
        },
      }),

      // 8. Phases Count
      columnHelper.accessor('phaseCount', {
        header: 'PHASES',
        minSize: 80,
        size: 90,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted inline-flex items-center gap-1">
            <Layers size={12} className="text-text-muted" />
            <span>{info.getValue() ?? 0}</span>
          </span>
        ),
      }),

      // 9. Actions (View & Edit)
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 85,
        size: 90,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-text-muted hover:text-heading hover:bg-surface"
                onClick={() => navigate(`/projects/${row.id}`)}
                title="View project details"
              >
                <IconView size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary hover:bg-primary/10"
                onClick={() => navigate(`/projects/${row.id}/edit`)}
                title="Edit project"
              >
                <IconEdit size={14} />
              </Button>
            </div>
          );
        },
      }),
    ],
    [navigate]
  );

  const table = useReactTable({
    data: projects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: pageNumber - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: pageNumber - 1, pageSize })
          : updater;
      setPageNumber(next.pageIndex + 1);
      setPageSize(next.pageSize);
    },
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* ── Page Header ── */}
      <PageHeader
        title="Projects"
        subtitle="Manage customer order executions, in-house projects, phases, and costings"
        icon={IconProject}
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconAdd}
            onClick={() => navigate('/projects/new')}
            className="text-xs font-semibold h-8 px-3.5 shadow-2xs"
          >
            New Project
          </Button>
        }
      />

      {/* ── Filter Toolbar ── */}
      <FilterBar className="p-3 bg-surface border border-border rounded-xl shadow-2xs w-full">
        <div className="flex flex-wrap items-center gap-2.5 w-full">
          {/* Search Box */}
          <div className="flex-1 min-w-[220px]">
            <Input
              size="sm"
              value={search}
              onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
              placeholder="Search code, name, client, order no..."
              leftIcon={<IconSearch size={14} className="text-text-muted" />}
            />
          </div>

          {/* Project Type Filter */}
          <div className="w-[160px] sm:w-[170px]">
            <SearchableSelect
              size="sm"
              options={projectTypeOptions}
              value={projectTypeId}
              onChange={(e) => handleFilterChange(setProjectTypeId)(e?.target?.value ?? e)}
              placeholder="All Types"
            />
          </div>

          {/* Billing Type Filter */}
          <div className="w-[160px] sm:w-[170px]">
            <SearchableSelect
              size="sm"
              options={billingTypeOptions}
              value={projectBillingTypeId}
              onChange={(e) => handleFilterChange(setProjectBillingTypeId)(e?.target?.value ?? e)}
              placeholder="All Billing Types"
            />
          </div>

          {/* Status Filter */}
          <div className="w-[140px] sm:w-[150px]">
            <SearchableSelect
              size="sm"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e?.target?.value ?? e)}
              placeholder="All Statuses"
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-text-muted hover:text-danger h-8 px-2"
              title="Reset all filters"
            >
              <IconReset size={14} className="mr-1" />
              Reset
            </Button>
          )}
        </div>
      </FilterBar>

      {/* ── Projects Table / Mobile Cards ── */}
      <DataTable
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
        emptyTitle="No projects found"
        emptyDescription={
          hasActiveFilters
            ? 'No projects match your current filter criteria. Try resetting filters.'
            : 'Get started by creating your first project from a confirmed sales order or in-house mandate.'
        }
        emptyAction={
          !hasActiveFilters ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={IconAdd}
              onClick={() => navigate('/projects/new')}
            >
              Create Project
            </Button>
          ) : undefined
        }
        renderMobileCard={(row) => {
          const item = row.original;
          return (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              {/* Card Header: Project Code & Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/projects/${item.id}`}
                    className="font-mono text-xs font-bold text-primary hover:underline"
                  >
                    {item.projectCode}
                  </Link>
                  <h4 className="text-sm font-bold text-heading mt-0.5 truncate" title={item.projectName}>
                    {item.projectName}
                  </h4>
                </div>
                <Badge variant={getStatusBadgeVariant(item.status)} size="sm">
                  {item.status}
                </Badge>
              </div>

              {/* Card Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-3xs text-text-muted uppercase font-semibold block">Type</span>
                  <span className="text-xs text-heading font-medium mt-0.5 inline-flex items-center gap-1">
                    {item.projectTypeName === 'Customer Order' ? <Briefcase size={11} className="text-primary" /> : <Wrench size={11} />}
                    <span>{item.projectTypeName}</span>
                  </span>
                </div>

                <div>
                  <span className="text-3xs text-text-muted uppercase font-semibold block">Sales Order</span>
                  {item.orderConfirmationNo ? (
                    <span className="font-mono text-xs text-primary font-semibold mt-0.5 block">
                      {item.orderConfirmationNo}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted mt-0.5 block">—</span>
                  )}
                </div>

                <div>
                  <span className="text-3xs text-text-muted uppercase font-semibold block">Client</span>
                  <span className="text-xs text-heading mt-0.5 block truncate">
                    {item.clientName || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-3xs text-text-muted uppercase font-semibold block">Phases</span>
                  <span className="font-mono text-xs text-heading mt-0.5 inline-flex items-center gap-1">
                    <Layers size={11} className="text-text-muted" />
                    <span>{item.phaseCount || 0}</span>
                  </span>
                </div>
              </div>

              {/* Mobile Actions Footer */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/projects/${item.id}`)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1.5"
                >
                  <IconView size={13} />
                  View
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/projects/${item.id}/edit`)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1.5"
                >
                  <IconEdit size={13} />
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
