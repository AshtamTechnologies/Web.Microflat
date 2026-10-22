import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  DataTable,
  Badge,
  StatusBadge,
  Button,
  IconButton,
  TableActions,
} from '../../../../components/ui';
import { IconEdit } from '../../../../constants/icons';
import { getOutcomeStyle } from '../../../../constants/processFlow';
import { getFlowIcon } from '../../../../constants/processFlowIcons';

const columnHelper = createColumnHelper();

/**
 * StepsTable — Displays flow steps with sorting, status badges, and actions.
 *
 * @param {object} props
 * @param {Array<object>} props.steps - Steps list (filtered or all)
 * @param {Array<object>} props.transitions - Transitions list (to count connected transitions)
 * @param {boolean} props.isLoading
 * @param {(step: object) => void} props.onEdit
 * @param {(step: object) => void} props.onRemove
 * @param {(step: object) => void} props.onRestore
 */
export default function StepsTable({
  steps = [],
  isLoading = false,
  onEdit,
}) {
  const [sorting, setSorting] = useState([{ id: 'position', desc: false }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('title', {
        header: 'Step Title',
        size: 260,
        cell: (info) => {
          const step = info.row.original;
          const IconComp = getFlowIcon(step.iconKey);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-text-muted"
                aria-hidden="true"
              >
                <IconComp size={16} />
              </span>
              <div className="min-w-0">
                <span
                  className="font-medium text-heading truncate block"
                  title={step.title}
                >
                  {step.title}
                </span>
                <span className="text-2xs text-text-muted font-mono block">
                  ID: #{step.id}
                </span>
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor((row) => `${row.colNo},${row.rowNo}`, {
        id: 'position',
        header: 'Position',
        size: 110,
        cell: (info) => {
          const step = info.row.original;
          return (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading inline-block">
              {step.colNo}, {step.rowNo}
            </span>
          );
        },
      }),

      columnHelper.accessor('outcomeType', {
        header: 'Outcome',
        size: 130,
        cell: (info) => {
          const val = info.getValue() || 'Normal';
          const { badgeVariant } = getOutcomeStyle(val);
          return (
            <Badge variant={badgeVariant} size="sm">
              {val}
            </Badge>
          );
        },
      }),

      columnHelper.accessor('description', {
        header: 'Description',
        size: 300,
        cell: (info) => {
          const desc = info.getValue();
          if (!desc) {
            return <span className="text-text-muted italic text-2xs">—</span>;
          }
          return (
            <span
              className="truncate block text-text-muted text-xs max-w-xs"
              title={desc}
            >
              {desc}
            </span>
          );
        },
      }),

      columnHelper.accessor('isActive', {
        header: 'Status',
        size: 110,
        cell: (info) => <StatusBadge status={Boolean(info.getValue())} size="sm" />,
      }),

      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 80,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const step = info.row.original;
          return (
            <TableActions
              onEdit={() => onEdit?.(step)}
              editTooltip="Edit Step"
            />
          );
        },
      }),
    ],
    [onEdit]
  );

  const table = useReactTable({
    data: steps,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No steps in this process flow"
        emptyDescription="Add steps to define the workflow stages and milestones."
        entityName="steps"
        renderMobileCard={(row) => {
          const step = row.original;
          const IconComp = getFlowIcon(step.iconKey);
          const { badgeVariant } = getOutcomeStyle(step.outcomeType || 'Normal');
          return (
            <div
              key={step.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-text-muted">
                    <IconComp size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-heading truncate">{step.title}</h3>
                    <span className="font-mono text-2xs text-text-muted block">Position: col {step.colNo}, row {step.rowNo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={badgeVariant} size="sm">{step.outcomeType || 'Normal'}</Badge>
                  <StatusBadge status={step.isActive} size="sm" />
                </div>
              </div>

              {step.description && (
                <p className="text-xs text-text-muted pt-2 border-t border-border/50 line-clamp-2">
                  {step.description}
                </p>
              )}

              <div className="flex items-center pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit?.(step)}
                  className="w-full text-xs"
                >
                  <IconEdit size={14} className="mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />
    </>
  );
}
