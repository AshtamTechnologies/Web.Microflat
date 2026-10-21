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
} from '../../../../components/ui';
import { IconEdit, IconArrowRight } from '../../../../constants/icons';
import { getOutcomeStyle } from '../../../../constants/processFlow';

const columnHelper = createColumnHelper();

/**
 * TransitionsTable — Displays flow transitions with sorting, status badges, and actions.
 *
 * @param {object} props
 * @param {Array<object>} props.transitions - Transitions list
 * @param {Array<object>} props.steps - Steps list (to lookup step titles and coordinates)
 * @param {boolean} props.isLoading
 * @param {(transition: object) => void} props.onEdit
 * @param {(transition: object) => void} props.onRemove
 * @param {(transition: object) => void} props.onRestore
 */
export default function TransitionsTable({
  transitions = [],
  steps = [],
  isLoading = false,
  onEdit,
}) {
  const [sorting, setSorting] = useState([{ id: 'fromStep', desc: false }]);

  const stepMap = useMemo(() => {
    const map = new Map();
    steps.forEach((s) => map.set(s.id, s));
    return map;
  }, [steps]);

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => {
          const s = stepMap.get(row.fromStepId);
          return s ? `${s.title} (${s.colNo},${s.rowNo})` : `#${row.fromStepId}`;
        },
        {
          id: 'fromStep',
          header: 'From Step',
          size: 220,
          cell: (info) => {
            const row = info.row.original;
            const s = stepMap.get(row.fromStepId);
            return (
              <div className="flex items-center gap-2">
                <span className="font-medium text-heading">
                  {s?.title || `Step #${row.fromStepId}`}
                </span>
                {s && (
                  <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                    {s.colNo},{s.rowNo}
                  </span>
                )}
              </div>
            );
          },
        }
      ),

      columnHelper.display({
        id: 'arrow',
        header: '',
        size: 50,
        cell: () => (
          <span className="text-text-muted flex justify-center">
            <IconArrowRight size={14} />
          </span>
        ),
      }),

      columnHelper.accessor(
        (row) => {
          const s = stepMap.get(row.toStepId);
          return s ? `${s.title} (${s.colNo},${s.rowNo})` : `#${row.toStepId}`;
        },
        {
          id: 'toStep',
          header: 'To Step',
          size: 220,
          cell: (info) => {
            const row = info.row.original;
            const s = stepMap.get(row.toStepId);
            return (
              <div className="flex items-center gap-2">
                <span className="font-medium text-heading">
                  {s?.title || `Step #${row.toStepId}`}
                </span>
                {s && (
                  <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                    {s.colNo},{s.rowNo}
                  </span>
                )}
              </div>
            );
          },
        }
      ),

      columnHelper.accessor('label', {
        header: 'Label',
        size: 160,
        cell: (info) => {
          const val = info.getValue();
          if (!val) {
            return <span className="text-text-muted italic text-2xs">—</span>;
          }
          return (
            <span className="px-2 py-0.5 rounded bg-surface border border-border text-xs text-heading font-medium">
              {val}
            </span>
          );
        },
      }),

      columnHelper.accessor('outcomeType', {
        header: 'Outcome',
        size: 120,
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

      columnHelper.accessor('isActive', {
        header: 'Status',
        size: 110,
        cell: (info) => <StatusBadge status={Boolean(info.getValue())} size="sm" />,
      }),

      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        size: 80,
        cell: (info) => {
          const trans = info.row.original;
          return (
            <div className="flex items-center justify-end">
              <IconButton
                icon={IconEdit}
                size="sm"
                variant="ghost"
                title="Edit Transition"
                onClick={() => onEdit?.(trans)}
              />
            </div>
          );
        },
      }),
    ],
    [stepMap, onEdit]
  );

  const table = useReactTable({
    data: transitions,
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
        emptyTitle="No transitions defined"
        emptyDescription="Connect steps with transitions to model sequential and branching paths."
        entityName="transitions"
        renderMobileCard={(row) => {
          const trans = row.original;
          const fromStep = stepMap.get(trans.fromStepId);
          const toStep = stepMap.get(trans.toStepId);
          const { badgeVariant } = getOutcomeStyle(trans.outcomeType || 'Normal');
          return (
            <div
              key={trans.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-heading text-sm">
                      {fromStep?.title || `#${trans.fromStepId}`}
                    </span>
                    <IconArrowRight size={14} className="text-text-muted shrink-0" />
                    <span className="font-semibold text-heading text-sm">
                      {toStep?.title || `#${trans.toStepId}`}
                    </span>
                  </div>
                  {trans.label && (
                    <span className="inline-block px-2 py-0.5 mt-1 rounded bg-surface border border-border text-2xs text-heading font-medium">
                      {trans.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={badgeVariant} size="sm">{trans.outcomeType || 'Normal'}</Badge>
                  <StatusBadge status={trans.isActive} size="sm" />
                </div>
              </div>

              <div className="flex items-center pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit?.(trans)}
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
