import React from 'react';
import { flexRender } from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { TableContainer, Th, Td } from './Table';
import Button from './Button';
import Card from './Card';
import EmptyState from './EmptyState';

/**
 * DataTable — Core reusable TanStack Table wrapper for ERP modules.
 * Standardizes sorting chevrons, column resizing, loading skeletons, empty states,
 * and pagination bar across all modules.
 *
 * Props:
 *   table: TanStack Table instance
 *   columns: column definitions array (for skeleton count & colSpan)
 *   isLoading?: boolean
 *   emptyTitle?: string
 *   emptyDescription?: string
 *   emptyAction?: React.ReactNode
 *   totalCount?: number (optional total for display; falls back to row count)
 *   entityName?: string (e.g. 'records', 'vendors', 'bank accounts')
 *   renderMobileCard?: (row: any) => React.ReactNode (optional mobile list renderer)
 *   className?: string
 */
export default function DataTable({
  table,
  columns,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search criteria or clearing filters.',
  emptyAction,
  totalCount,
  entityName = 'records',
  renderMobileCard,
  className = '',
}) {
  const pageIndex = table.getState().pagination?.pageIndex ?? 0;
  const pageSize = table.getState().pagination?.pageSize ?? 10;
  const rows = table.getRowModel().rows;
  const resolvedTotal = totalCount !== undefined ? totalCount : rows.length;

  const startRecord = resolvedTotal === 0 ? 0 : pageIndex * pageSize + 1;
  const endRecord = Math.min((pageIndex + 1) * pageSize, resolvedTotal);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── DESKTOP VIEW (>= md): TanStack Table ── */}
      <div className={renderMobileCard ? 'hidden md:block' : 'block'}>
        <Card padding="none" className="overflow-hidden border border-border bg-bg shadow-2xs">
          <TableContainer tableClassName="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-surface/90 border-b border-border">
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
                        className={`relative py-3.5 px-4 select-none bg-surface ${
                          canSort ? 'cursor-pointer hover:bg-surface/80' : ''
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
                                <ChevronUp
                                  size={14}
                                  className="text-primary"
                                  aria-hidden="true"
                                />
                              ) : sorted === 'desc' ? (
                                <ChevronDown
                                  size={14}
                                  className="text-primary"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <ChevronUp size={11} />
                                  <ChevronDown size={11} />
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

            <tbody className="divide-y divide-border bg-bg">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={`skel-${rIdx}`} className="animate-pulse">
                    {(columns || []).map((_, cIdx) => (
                      <td key={`skel-cell-${cIdx}`} className="py-3.5 px-4">
                        <div className="h-4 bg-surface rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns?.length || 1} className="py-16 text-center text-text-muted">
                    <EmptyState
                      icon={SearchX}
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-surface/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="py-3 px-4"
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

          {/* ── Standard Table Pagination Bar ── */}
          {!isLoading && resolvedTotal > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface/30 text-xs text-text-muted">
              <div>
                Showing{' '}
                <strong className="text-heading font-medium">{startRecord}</strong>{' '}
                to{' '}
                <strong className="text-heading font-medium">{endRecord}</strong>{' '}
                of <strong className="text-heading font-medium">{resolvedTotal}</strong>{' '}
                {entityName}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-7 px-2"
                >
                  <ChevronLeft size={14} className="mr-0.5" />
                  Previous
                </Button>

                <span className="font-mono tabular-nums px-2">
                  Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-7 px-2"
                >
                  Next
                  <ChevronRight size={14} className="ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── MOBILE VIEW (< md): Card List (if renderMobileCard provided) ── */}
      {renderMobileCard && (
        <div className="block md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={`m-skel-${idx}`} padding="sm" className="animate-pulse space-y-2">
                <div className="h-4 bg-surface rounded w-1/2" />
                <div className="h-3 bg-surface rounded w-3/4" />
                <div className="h-3 bg-surface rounded w-1/3" />
              </Card>
            ))
          ) : rows.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-xl">
              <SearchX size={24} className="mx-auto text-text-muted opacity-60 mb-2" />
              <p className="text-xs font-semibold text-heading">{emptyTitle}</p>
              <p className="text-2xs text-text-muted mt-0.5">{emptyDescription}</p>
              {emptyAction && <div className="mt-3">{emptyAction}</div>}
            </div>
          ) : (
            rows.map((row) => (
              <React.Fragment key={row.id}>
                {renderMobileCard(row)}
              </React.Fragment>
            ))
          )}

          {/* Mobile pagination summary */}
          {!isLoading && resolvedTotal > 0 && (
            <div className="flex items-center justify-between text-xs text-text-muted px-1 pt-2">
              <span>
                Page {pageIndex + 1} of {Math.max(1, table.getPageCount())} ({resolvedTotal} {entityName})
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-7 px-2"
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-7 px-2"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
