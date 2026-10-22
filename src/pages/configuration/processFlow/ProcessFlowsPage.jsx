import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  PageHeader,
  TableToolbar,
  DataTable,
  Button,
  IconButton,
  StatusBadge,
  TableActions,
} from '../../../components/ui';
import {
  IconAdd,
  IconEdit,
  IconView,
  IconWorkflow,
  IconProcessFlow,
  IconRefresh,
  IconError,
} from '../../../constants/icons';
import { formatDateTime } from '../../../utils/dateUtils';
import useProcessFlows from './hooks/useProcessFlows';
import FlowFormModal from './components/FlowFormModal';

const columnHelper = createColumnHelper();

/**
 * ProcessFlowsPage — Admin list of all Process Flows in MicroFlat ERP.
 */
export default function ProcessFlowsPage() {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState([{ id: 'moduleCode', desc: false }]);

  const {
    filteredFlows,
    isLoading,
    error,
    refetch,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isFlowModalOpen,
    editingFlow,
    openCreateModal,
    openEditModal,
    closeFlowModal,
  } = useProcessFlows();

  const columns = useMemo(
    () => [
      columnHelper.accessor('moduleCode', {
        header: 'Module',
        size: 140,
        cell: (info) => (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading font-semibold">
            {info.getValue()}
          </span>
        ),
      }),

      columnHelper.accessor('name', {
        header: 'Flow Name',
        size: 260,
        cell: (info) => (
          <span className="font-medium text-heading text-xs" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),

      columnHelper.accessor('stepCount', {
        header: 'Steps',
        size: 90,
        cell: (info) => (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading inline-block text-center min-w-8">
            {info.getValue() ?? 0}
          </span>
        ),
      }),

      columnHelper.accessor('transitionCount', {
        header: 'Transitions',
        size: 110,
        cell: (info) => (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading inline-block text-center min-w-8">
            {info.getValue() ?? 0}
          </span>
        ),
      }),

      columnHelper.accessor('isActive', {
        header: 'Status',
        size: 110,
        cell: (info) => (
          <StatusBadge status={info.getValue()} size="sm" />
        ),
      }),

      columnHelper.accessor('createdAt', {
        header: 'Created',
        size: 170,
        cell: (info) => (
          <span className="text-text-muted text-xs">
            {formatDateTime(info.getValue())}
          </span>
        ),
      }),

      columnHelper.accessor('updatedAt', {
        header: 'Last Updated',
        size: 170,
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-text-muted text-xs">
              {val ? formatDateTime(val) : '—'}
            </span>
          );
        },
      }),

      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 100,
        minSize: 90,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const flow = info.row.original;
          return (
            <TableActions
              onView={() => navigate(`/configuration/process-flows/${flow.id}`)}
              onEdit={() => openEditModal(flow)}
              viewTooltip="Open Flow Designer"
              editTooltip="Edit Flow Properties"
            />
          );
        },
      }),
    ],
    [navigate, openEditModal]
  );

  const table = useReactTable({
    data: filteredFlows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      <PageHeader
        title="Process Flows"
        icon={IconProcessFlow}
        subtitle="Configure dynamic workflow pipelines, milestone steps, and transition rules."
        actions={
          <Button
            type="button"
            variant="primary"
            icon={IconAdd}
            onClick={openCreateModal}
          >
            Add Flow
          </Button>
        }
      />

      {/* Toolbar & Filters */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by module code or name..."
        hasActiveFilters={Boolean(searchQuery || statusFilter !== 'ALL')}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
      >
        <div className="flex items-center gap-1.5 bg-surface/60 p-1 rounded-lg border border-border">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-text-muted hover:text-heading hover:bg-surface'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </TableToolbar>

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-danger flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <IconError size={16} />
            <span>{error?.message || 'Failed to load process flows'}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={IconRefresh}
            onClick={refetch}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Flows DataTable */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No process flows found"
        emptyDescription="Create your first flow to define milestone stages and transitions."
        emptyAction={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconAdd}
            onClick={openCreateModal}
          >
            Add Flow
          </Button>
        }
        entityName="flows"
        renderMobileCard={(row) => {
          const flow = row.original;
          return (
            <div
              key={flow.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading font-semibold">
                      {flow.moduleCode}
                    </span>
                    <StatusBadge status={flow.isActive} size="sm" />
                  </div>
                  <h3 className="text-sm font-semibold text-heading truncate">
                    {flow.name}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-2 border-t border-border/50">
                <div>
                  <span className="block text-2xs uppercase tracking-wider text-text-muted font-medium">Steps</span>
                  <span className="font-mono font-medium text-heading">{flow.stepCount ?? 0}</span>
                </div>
                <div>
                  <span className="block text-2xs uppercase tracking-wider text-text-muted font-medium">Transitions</span>
                  <span className="font-mono font-medium text-heading">{flow.transitionCount ?? 0}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-2xs uppercase tracking-wider text-text-muted font-medium">Last Updated</span>
                  <span>{flow.updatedAt ? formatDateTime(flow.updatedAt) : formatDateTime(flow.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/configuration/process-flows/${flow.id}`)}
                  className="flex-1 text-xs"
                >
                  <IconView size={14} className="mr-1.5" />
                  Open Designer
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditModal(flow)}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={14} className="mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* Add / Edit Flow Modal */}
      <FlowFormModal
        isOpen={isFlowModalOpen}
        onClose={closeFlowModal}
        flow={editingFlow}
        onSuccess={refetch}
      />
    </div>
  );
}
