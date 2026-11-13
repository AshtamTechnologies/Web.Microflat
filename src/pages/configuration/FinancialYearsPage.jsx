/**
 * FinancialYearsPage.jsx — Financial Year Setup configuration screen for MicroFlat ERP.
 *
 * Implements Section 5.3 ("Financial year setup") of Frontend-API-Guide 1.md:
 * - Status lifecycle: UPCOMING → OPEN (started) → CLOSED (stopped).
 * - Only OPEN years number documents of FINANCIAL_YEAR series.
 * - isCurrent marks the active OPEN year covering today.
 * - Years never overlap, only 1 starts per calendar year, max 18 months duration.
 * - Connected to backend APIs & FinancialYearsContext with offline mock fallback.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';

import {
  IconAdd,
  IconView,
  IconEdit,
  IconDelete,
  IconCalendar,
  IconCheck,
  IconLock,
  IconSparkles,
} from '../../constants/icons';

import {
  PageHeader,
  Button,
  SaveButton,
  CancelButton,
  Textarea,
  DatePicker,
  SearchableSelect,
  Badge,
  Modal,
  ConfirmModal,
  TableToolbar,
  DataTable,
  TableActions,
  IconButton,
  DetailField,
} from '../../components/ui';

import { formatDate } from '../../utils/dateUtils';
import {
  generateFyCode,
  calculateDayCount,
  validateFinancialYearDates,
} from '../../mocks/financialYears';
import { useFinancialYearsContext } from '../../context/FinancialYearsContext';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open (Active)' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'CLOSED', label: 'Closed' },
];

const INITIAL_YEAR_FORM = {
  startDate: '',
  endDate: '',
  remarks: '',
};

export default function FinancialYearsPage() {
  const {
    financialYears,
    currentYear,
    isLoading,
    fetchFinancialYears,
    fetchFinancialYearById,
    createYear,
    updateYear,
    openYear,
    closeYear,
    deleteYear,
  } = useFinancialYearsContext();

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // TanStack table sorting & column sizing state
  const [sorting, setSorting] = useState([{ id: 'startDate', desc: true }]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modals state
  const [viewingYear, setViewingYear] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearFormData, setYearFormData] = useState(INITIAL_YEAR_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [yearToClose, setYearToClose] = useState(null);
  const [closingRemarks, setClosingRemarks] = useState('');
  const [closeError, setCloseError] = useState('');

  const [yearToOpen, setYearToOpen] = useState(null);
  const [yearToDelete, setYearToDelete] = useState(null);

  // Active current operating year
  const currentYearObj = useMemo(() => {
    return currentYear || financialYears.find((y) => y.isCurrent) || null;
  }, [currentYear, financialYears]);

  // Debounced fetch when filter/search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFinancialYears({
        status: statusFilter,
        search: searchQuery.trim(),
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, fetchFinancialYears]);

  /* ── Form Actions ── */

  const handleOpenAdd = () => {
    setEditingYear(null);
    setYearFormData({
      startDate: '',
      endDate: '',
      remarks: '',
    });
    setFormError(null);
    setIsFetchingDetail(false);
    setIsAddEditModalOpen(true);
  };

  const handleOpenView = async (year) => {
    setViewingYear(year);
    setIsFetchingDetail(true);
    try {
      const fresh = await fetchFinancialYearById(year.id);
      if (fresh) {
        setViewingYear(fresh);
      }
    } catch {
      // Error handled with toast in context
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleOpenEdit = async (year) => {
    if (year.status === 'CLOSED') return;
    setEditingYear(year);
    setYearFormData({
      startDate: year.startDate,
      endDate: year.endDate,
      remarks: year.remarks || '',
    });
    setFormError(null);
    setIsAddEditModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchFinancialYearById(year.id);
      if (fresh) {
        setEditingYear(fresh);
        setYearFormData({
          startDate: fresh.startDate,
          endDate: fresh.endDate,
          remarks: fresh.remarks || '',
        });
      }
    } catch {
      // Error handled with toast in context
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleSaveYear = async (e) => {
    if (e) e.preventDefault();
    const { startDate, endDate, remarks } = yearFormData;

    // Client-side rule validation
    const err = validateFinancialYearDates(startDate, endDate, financialYears, editingYear?.id);
    if (err) {
      setFormError(err);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingYear) {
        await updateYear(editingYear.id, {
          startDate: editingYear.status === 'UPCOMING' ? startDate : editingYear.startDate,
          endDate: editingYear.status === 'UPCOMING' ? endDate : editingYear.endDate,
          remarks: remarks.trim() || null,
        });
      } else {
        await createYear({
          startDate,
          endDate,
          remarks: remarks.trim() || null,
        });
      }
      setIsAddEditModalOpen(false);
    } catch (saveErr) {
      setFormError(saveErr?.message || 'Failed to save financial year.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!closingRemarks.trim()) {
      setCloseError('Closing remarks are required for audit trail.');
      return;
    }

    setIsSubmitting(true);
    try {
      await closeYear(yearToClose.id, closingRemarks.trim());
      setYearToClose(null);
      setClosingRemarks('');
      setCloseError('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOpen = async () => {
    setIsSubmitting(true);
    try {
      await openYear(yearToOpen.id);
      setYearToOpen(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteYear(yearToDelete.id, yearToDelete.fyCode);
      setYearToDelete(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── TanStack Table Columns ── */
  const columns = useMemo(() => {
    return [
      /* 1. FY CODE */
      columnHelper.accessor('fyCode', {
        id: 'fyCode',
        header: 'FY CODE',
        size: 150,
        minSize: 120,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-heading">
                {item.fyCode}
              </span>
              {item.isCurrent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-success/15 text-success border border-success/30">
                  <IconSparkles className="w-3 h-3 text-success shrink-0" />
                  <span>Current</span>
                </span>
              )}
            </div>
          );
        },
      }),

      /* 2. DURATION / DATE RANGE */
      columnHelper.accessor('startDate', {
        id: 'startDate',
        header: 'PERIOD DATES',
        size: 240,
        minSize: 190,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-xs space-y-0.5">
              <div className="font-medium text-text flex items-center gap-1.5">
                <IconCalendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>
                  {formatDate(item.startDate)} – {formatDate(item.endDate)}
                </span>
              </div>
              <span className="text-2xs font-mono text-text-muted block">
                {item.dayCount} Calendar Days
              </span>
            </div>
          );
        },
      }),

      /* 3. STATUS */
      columnHelper.accessor('status', {
        id: 'status',
        header: 'STATUS',
        size: 130,
        minSize: 110,
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === 'OPEN') {
            return (
              <Badge variant="success" size="sm" className="font-semibold">
                OPEN
              </Badge>
            );
          }
          if (status === 'UPCOMING') {
            return (
              <Badge variant="primary" size="sm" className="font-semibold">
                UPCOMING
              </Badge>
            );
          }
          return (
            <Badge variant="neutral" size="sm" className="font-semibold">
              CLOSED
            </Badge>
          );
        },
      }),

      /* 4. CLOSING AUDIT */
      columnHelper.accessor('closedOn', {
        id: 'closedAudit',
        header: 'CLOSING AUDIT',
        size: 200,
        minSize: 150,
        cell: ({ row }) => {
          const item = row.original;
          if (item.status === 'CLOSED' && item.closedOn) {
            return (
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-text">By {item.closedByName || 'Admin'}</p>
                <p className="text-2xs text-text-muted font-mono">{formatDate(item.closedOn)}</p>
              </div>
            );
          }
          return <span className="text-text-muted text-xs">—</span>;
        },
      }),

      /* 5. REMARKS */
      columnHelper.accessor('remarks', {
        id: 'remarks',
        header: 'REMARKS / AUDIT NOTES',
        size: 260,
        minSize: 180,
        cell: ({ row }) => {
          const rem = row.original.remarks;
          return (
            <p className="text-xs text-text truncate max-w-[240px]" title={rem || ''}>
              {rem || <span className="text-text-muted italic">No remarks</span>}
            </p>
          );
        },
      }),

      /* 6. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 160,
        minSize: 140,
        cell: ({ row }) => {
          const item = row.original;
          const isOpen = item.status === 'OPEN';
          const isUpcoming = item.status === 'UPCOMING';
          const isClosed = item.status === 'CLOSED';

          return (
            <TableActions
              align="right"
              onView={() => handleOpenView(item)}
              viewTooltip="View Financial Year Details"
              onEdit={() => handleOpenEdit(item)}
              editDisabled={isClosed}
              editTooltip={
                isClosed
                  ? 'Closed financial years cannot be edited'
                  : isUpcoming
                  ? 'Edit Dates & Remarks'
                  : 'Edit Remarks'
              }
              extraActions={
                <>
                  {/* Close Button: only for OPEN year */}
                  {isOpen && (
                    <IconButton
                      icon={IconLock}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setYearToClose(item);
                        setClosingRemarks('');
                        setCloseError('');
                      }}
                      className="text-danger hover:text-danger hover:bg-danger/10"
                      title="Close Financial Year"
                      aria-label="Close Financial Year"
                    />
                  )}

                  {/* Start / Open Button: ONLY for UPCOMING year (reopen button removed for CLOSED) */}
                  {isUpcoming && (
                    <IconButton
                      icon={IconCheck}
                      size="sm"
                      variant="ghost"
                      onClick={() => setYearToOpen(item)}
                      className="text-success hover:text-success hover:bg-success/10"
                      title="Start / Open Financial Year"
                      aria-label="Start / Open Financial Year"
                    />
                  )}
                </>
              }
            />
          );
        },
      }),
    ];
  }, []);

  const table = useReactTable({
    data: financialYears,
    columns,
    state: { sorting, columnSizing },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Preview generated code in Add/Edit modal
  const previewFyCode = useMemo(() => {
    return generateFyCode(yearFormData.startDate, yearFormData.endDate);
  }, [yearFormData.startDate, yearFormData.endDate]);

  const previewDayCount = useMemo(() => {
    return calculateDayCount(yearFormData.startDate, yearFormData.endDate);
  }, [yearFormData.startDate, yearFormData.endDate]);

  return (
    <div className="space-y-4 pb-16 w-full">
      {/* ── Top Header ── */}
      <PageHeader
        title="Financial Year Setup"
        icon={IconCalendar}
        subtitle="Manage fiscal accounting periods, active operating year, and document series numbering."
        badge={
          currentYearObj ? (
            <Badge variant="success" size="md" className="font-mono font-semibold">
              Current: {currentYearObj.fyCode} (OPEN)
            </Badge>
          ) : (
            <Badge variant="warning" size="md">
              No Active Financial Year
            </Badge>
          )
        }
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="gap-1.5 shadow-2xs"
          >
            <IconAdd className="w-4 h-4" />
            <span>Add Financial Year</span>
          </Button>
        }
      />

      {/* ── Search & Filter Toolbar ── */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by FY code, remarks, or closed by..."
        hasActiveFilters={Boolean(searchQuery || statusFilter !== 'ALL')}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="fy-status-filter"
            placeholder="All Statuses"
            searchPlaceholder="Search status..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              const val = e?.target?.value !== undefined ? e.target.value : e;
              setStatusFilter(val);
            }}
          />
        </div>
      </TableToolbar>

      {/* ── DataTable ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={financialYears.length}
        entityName="financial years"
        emptyTitle="No financial years found"
        emptyDescription={
          searchQuery || statusFilter !== 'ALL'
            ? 'No periods match your filter criteria. Try resetting the search or filters.'
            : 'Get started by creating your first operating financial year.'
        }
        renderMobileCard={(row) => {
          const item = row.original;
          const isOpen = item.status === 'OPEN';
          const isUpcoming = item.status === 'UPCOMING';
          const isClosed = item.status === 'CLOSED';

          return (
            <div
              key={item.id}
              className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              {/* Top Meta: FY Code, Current Pill & Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenView(item)}
                    className="font-mono text-sm font-bold text-primary hover:underline cursor-pointer text-left"
                  >
                    {item.fyCode}
                  </button>
                  {item.isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-success/15 text-success border border-success/30">
                      <IconSparkles className="w-3 h-3 text-success shrink-0" />
                      <span>Current</span>
                    </span>
                  )}
                </div>
                <Badge
                  variant={isOpen ? 'success' : isUpcoming ? 'primary' : 'neutral'}
                  size="sm"
                  className="font-semibold"
                >
                  {item.status}
                </Badge>
              </div>

              {/* Date Period Details */}
              <div className="text-xs space-y-1 bg-surface/40 p-2.5 rounded-lg border border-border/60">
                <div className="font-medium text-text flex items-center gap-1.5">
                  <IconCalendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span>
                    {formatDate(item.startDate)} – {formatDate(item.endDate)}
                  </span>
                </div>
                <div className="text-2xs font-mono text-text-muted flex items-center justify-between">
                  <span>{item.dayCount} Calendar Days</span>
                  <span>
                    {isOpen ? 'Document series open' : isUpcoming ? 'Pending start' : 'Locked'}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              {item.remarks && (
                <p className="text-xs text-text-muted line-clamp-2">
                  {item.remarks}
                </p>
              )}

              {/* Audit Details if closed */}
              {isClosed && item.closedOn && (
                <div className="text-2xs text-text-muted pt-1 border-t border-border/60 flex items-center justify-between">
                  <span>Closed By: {item.closedByName || 'Admin'}</span>
                  <span className="font-mono">{formatDate(item.closedOn)}</span>
                </div>
              )}

              {/* Actions Bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenView(item)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" />
                  View
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(item)}
                  disabled={isClosed}
                  className="flex-1 text-xs"
                  title={isClosed ? 'Closed financial years cannot be edited' : 'Edit Financial Year'}
                >
                  <IconEdit size={13} className="mr-1.5" />
                  Edit
                </Button>

                {isOpen && (
                  <IconButton
                    icon={IconLock}
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setYearToClose(item);
                      setClosingRemarks('');
                      setCloseError('');
                    }}
                    className="text-danger hover:text-danger hover:bg-danger/10 border border-border"
                    title="Close Financial Year"
                    aria-label="Close Financial Year"
                  />
                )}

                {isUpcoming && (
                  <IconButton
                    icon={IconCheck}
                    size="sm"
                    variant="ghost"
                    onClick={() => setYearToOpen(item)}
                    className="text-success hover:text-success hover:bg-success/10 border border-border"
                    title="Start / Open Financial Year"
                    aria-label="Start / Open Financial Year"
                  />
                )}
              </div>
            </div>
          );
        }}
      />

      {/* ── Modal 1: View Financial Year Details ── */}
      <Modal
        isOpen={Boolean(viewingYear)}
        onClose={() => setViewingYear(null)}
        title={`Financial Year ${viewingYear?.fyCode || ''}`}
        subtitle="Accounting Period Summary & Operational Audit Information"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {isFetchingDetail ? (
              <span className="text-2xs text-primary animate-pulse font-medium">
                Fetching latest data...
              </span>
            ) : <span />}
            <Button variant="secondary" size="md" onClick={() => setViewingYear(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewingYear && (
          <div className="space-y-4 text-xs">
            {/* Top Banner / Status Overview */}
            <div className="p-3.5 rounded-lg border border-border bg-surface/40 flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <span className="text-2xs text-text-muted uppercase tracking-wider block font-semibold">
                  Fiscal Period
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-heading">
                    {viewingYear.fyCode}
                  </span>
                  {viewingYear.isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-success/15 text-success border border-success/30">
                      <IconSparkles className="w-3 h-3 text-success shrink-0" />
                      <span>Current Operating Year</span>
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant={
                  viewingYear.status === 'OPEN'
                    ? 'success'
                    : viewingYear.status === 'UPCOMING'
                    ? 'primary'
                    : 'neutral'
                }
                size="md"
                className="font-semibold"
              >
                {viewingYear.status}
              </Badge>
            </div>

            {/* Core Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailField
                label="Start Date"
                value={formatDate(viewingYear.startDate)}
              />
              <DetailField
                label="End Date"
                value={formatDate(viewingYear.endDate)}
              />
              <DetailField
                label="Period Duration"
                value={`${viewingYear.dayCount} Calendar Days`}
              />
              <DetailField
                label="Document Series Numbering"
                value={
                  viewingYear.status === 'OPEN' ? (
                    <span className="text-success font-medium">Active (Allows numbering)</span>
                  ) : viewingYear.status === 'UPCOMING' ? (
                    <span className="text-text-muted font-medium">Pending Start</span>
                  ) : (
                    <span className="text-danger font-medium">Locked (Numbering blocked)</span>
                  )
                }
              />
            </div>

            {/* Closing Audit if closed */}
            {viewingYear.status === 'CLOSED' && viewingYear.closedOn && (
              <div className="p-3 rounded-lg border border-border bg-surface/30 space-y-2">
                <span className="font-semibold text-heading text-xs block">Closing Audit Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField
                    label="Closed By"
                    value={viewingYear.closedByName || 'Administrator'}
                  />
                  <DetailField
                    label="Closed On"
                    value={formatDate(viewingYear.closedOn)}
                  />
                </div>
              </div>
            )}

            {/* System Timestamps Grid */}
            {(viewingYear.createdOn || viewingYear.lastUpdatedOn) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                {viewingYear.createdOn && (
                  <DetailField
                    label="Created On"
                    value={formatDate(viewingYear.createdOn)}
                  />
                )}
                {viewingYear.lastUpdatedOn && (
                  <DetailField
                    label="Last Updated"
                    value={formatDate(viewingYear.lastUpdatedOn)}
                  />
                )}
              </div>
            )}

            {/* Remarks */}
            <div>
              <DetailField
                label="Audit Remarks / Notes"
                value={viewingYear.remarks || <span className="italic text-text-muted">No remarks provided.</span>}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal 2: Add / Edit Financial Year ── */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingYear ? `Edit Financial Year (${editingYear.fyCode})` : 'Schedule New Financial Year'}
        subtitle="Dates must be within 18 months and cannot overlap existing financial periods."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <CancelButton onClick={() => setIsAddEditModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </CancelButton>
            <SaveButton onClick={handleSaveYear} loading={isSubmitting} disabled={isSubmitting}>
              {editingYear ? 'Save Changes' : 'Schedule Year'}
            </SaveButton>
          </div>
        }
      >
        <form onSubmit={handleSaveYear} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-primary text-2xs animate-pulse font-medium">
              Loading latest financial year details...
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs">
              {formError}
            </div>
          )}

          {/* Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                Start Date <span className="text-danger">*</span>
              </label>
              <DatePicker
                value={yearFormData.startDate}
                onChange={(e) => {
                  const val = e?.target?.value !== undefined ? e.target.value : e;
                  setYearFormData((prev) => ({ ...prev, startDate: val }));
                  if (formError) setFormError(null);
                }}
                disabled={editingYear && editingYear.status !== 'UPCOMING'}
              />
              {editingYear && editingYear.status !== 'UPCOMING' && (
                <p className="text-2xs text-text-muted mt-1">
                  Dates locked for {editingYear.status} period.
                </p>
              )}
            </div>

            <div>
              <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
                End Date <span className="text-danger">*</span>
              </label>
              <DatePicker
                value={yearFormData.endDate}
                onChange={(e) => {
                  const val = e?.target?.value !== undefined ? e.target.value : e;
                  setYearFormData((prev) => ({ ...prev, endDate: val }));
                  if (formError) setFormError(null);
                }}
                disabled={editingYear && editingYear.status !== 'UPCOMING'}
              />
            </div>
          </div>

          {/* Live Calculated Preview Box */}
          {previewFyCode && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-2xs text-text-muted uppercase tracking-wider block font-semibold">
                  Generated FY Code
                </span>
                <span className="font-mono font-bold text-sm text-primary">
                  {previewFyCode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xs text-text-muted uppercase tracking-wider block font-semibold">
                  Duration
                </span>
                <span className="font-mono font-bold text-sm text-heading">
                  {previewDayCount} Days
                </span>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
              Audit Remarks / Notes
            </label>
            <Textarea
              value={yearFormData.remarks}
              onChange={(e) =>
                setYearFormData((prev) => ({ ...prev, remarks: e.target.value }))
              }
              placeholder="e.g., Annual operating fiscal year for manufacturing and sales."
              rows={3}
            />
          </div>
        </form>
      </Modal>

      {/* ── Modal 3: Close Financial Year Confirmation ── */}
      <Modal
        isOpen={Boolean(yearToClose)}
        onClose={() => setYearToClose(null)}
        title={`Close Financial Year ${yearToClose?.fyCode}`}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <CancelButton onClick={() => setYearToClose(null)} disabled={isSubmitting}>
              Cancel
            </CancelButton>
            <Button variant="danger" size="md" onClick={handleConfirmClose} disabled={isSubmitting}>
              <IconLock className="w-3.5 h-3.5 mr-1" />
              {isSubmitting ? 'Closing...' : 'Close Year'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-danger space-y-1">
            <p className="font-semibold">Warning: Document numbering restriction</p>
            <p className="text-2xs leading-relaxed">
              Closing this financial year will block all document numbering for this period.
            </p>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
              Closing Remarks <span className="text-danger">*</span>
            </label>
            <Textarea
              value={closingRemarks}
              onChange={(e) => {
                setClosingRemarks(e.target.value);
                if (closeError) setCloseError('');
              }}
              placeholder="e.g., Annual accounts verified and audited by statutory auditor."
              rows={3}
            />
            {closeError && <p className="text-2xs text-danger mt-1">{closeError}</p>}
          </div>
        </div>
      </Modal>

      {/* ── Modal 4: Start / Open Confirmation ── */}
      <ConfirmModal
        isOpen={Boolean(yearToOpen)}
        onClose={() => setYearToOpen(null)}
        onConfirm={handleConfirmOpen}
        title={`Open Financial Year ${yearToOpen?.fyCode}`}
        message={
          <span>
            Are you sure you want to mark financial year{' '}
            <strong className="text-heading font-mono">{yearToOpen?.fyCode}</strong> as{' '}
            <strong className="text-success">OPEN</strong>? This will set it as the active operating period and enable document numbering.
          </span>
        }
        confirmText={isSubmitting ? 'Opening...' : 'Open Financial Year'}
        variant="primary"
      />

      {/* ── Modal 5: Delete Confirmation ── */}
      <ConfirmModal
        isOpen={Boolean(yearToDelete)}
        onClose={() => setYearToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Upcoming Financial Year"
        message={
          <span>
            Are you sure you want to delete upcoming financial year{' '}
            <strong className="text-heading font-mono">{yearToDelete?.fyCode}</strong>? This action cannot be undone.
          </span>
        }
        confirmText={isSubmitting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}
