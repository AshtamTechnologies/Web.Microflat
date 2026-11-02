/**
 * StandardsPage.jsx — Standards configuration page for MicroFlat ERP.
 *
 * Route: /configuration/standards
 *
 * Requirements:
 *   - Search and status filters (matching Swagger GET /api/standards).
 *   - Server-side pagination and TanStack DataTable.
 *   - Read-only StatusBadge in the table (no external status toggle).
 *   - Mobile card view with full-width wrapping title and top metadata bar.
 *   - Status change via PATCH /api/standards/{id}/status inside the Create/Edit form only.
 *   - View modal with fresh data fetched from GET /api/standards/{id}.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconClose,
  IconEdit,
  IconStandards,
  IconSearch,
  IconView,
} from '../../constants/icons';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  Modal,
  StatusSwitch,
  PageHeader,
  TableToolbar,
  DataTable,
  TableActions,
  StatusBadge,
  SearchableSelect,
} from '../../components/ui';
import { useStandardsContext } from '../../context/StandardsContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const INITIAL_FORM = {
  standardCode: '',
  isActive: true,
};

export default function StandardsPage() {
  const {
    standardsList = [],
    pagination,
    isLoading,
    fetchStandards,
    fetchStandardById,
    addStandard,
    updateStandard,
    updateStandardStatus,
  } = useStandardsContext();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Trigger server fetch when filters change
  const loadData = useCallback(
    (page = 1, size = pagination.pageSize || 10) => {
      const params = {
        pageNumber: page,
        pageSize: size,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (statusFilter === 'ACTIVE') {
        params.isActive = true;
      } else if (statusFilter === 'INACTIVE') {
        params.isActive = false;
      }
      fetchStandards(params);
    },
    [debouncedSearch, statusFilter, pagination.pageSize, fetchStandards]
  );

  useEffect(() => {
    loadData(1, pagination.pageSize);
  }, [debouncedSearch, statusFilter, loadData]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState(null);
  const [viewingStandard, setViewingStandard] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Form Validation ── */
  function validateField(name, value) {
    switch (name) {
      case 'standardCode': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Standard code is required.';
        if (str.length > 50) return 'Standard code cannot exceed 50 characters.';

        // Client-side duplicate check within loaded list
        const currentTargetId = editingStandard?.id;
        const duplicate = standardsList.find((s) => {
          if (editingStandard && String(s.id) === String(currentTargetId)) return false;
          return s.standardCode?.toLowerCase() === str.toLowerCase();
        });
        if (duplicate) return 'A standard with this code already exists.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    const err = validateField('standardCode', data.standardCode);
    if (err) errors.standardCode = err;
    return errors;
  }

  /* ── Modal Open / Close Handlers ── */
  function handleOpenAdd() {
    setEditingStandard(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleOpenEdit(standard) {
    const id = standard.id;
    setEditingStandard(standard);
    setFormData({
      standardCode: standard.standardCode || '',
      isActive: Boolean(standard.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchStandardById(id);
      if (fresh) {
        setEditingStandard(fresh);
        setFormData({
          standardCode: fresh.standardCode || '',
          isActive: Boolean(fresh.isActive),
        });
      }
    } catch {
      // toast is handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  async function handleOpenView(standard) {
    const id = standard.id;
    setViewingStandard(standard);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchStandardById(id);
      if (fresh) {
        setViewingStandard(fresh);
      }
    } catch {
      // toast is handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingStandard(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsFetchingDetail(false);
  }

  /* ── Form Submit with Status Patching ── */
  async function handleFormSubmit(e) {
    if (e) e.preventDefault();
    const errors = validateAll(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        standardCode: formData.standardCode.trim(),
      };

      if (editingStandard) {
        const id = editingStandard.id;
        // 1. Update standard via PUT /api/standards/{id}
        if (editingStandard.standardCode !== payload.standardCode) {
          await updateStandard(id, payload);
        }

        // 2. If status was modified, update via PATCH /api/standards/{id}/status
        if (Boolean(editingStandard.isActive) !== Boolean(formData.isActive)) {
          await updateStandardStatus(id, formData.isActive);
        }
      } else {
        // 1. Create new standard via POST /api/standards
        const created = await addStandard(payload);
        const newId = created?.id;

        // 2. If status set to inactive during creation, update via PATCH /api/standards/{id}/status
        if (newId && formData.isActive === false) {
          await updateStandardStatus(newId, false);
        }
      }

      handleCloseModal();
      loadData(pagination.pageNumber, pagination.pageSize);
    } catch {
      // error handled in context
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Reset Filters ── */
  function handleResetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
  }

  const hasActiveFilters = Boolean(search || statusFilter !== 'ALL');

  /* ── Table Columns ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        id: 'index',
        header: '#',
        size: 60,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-text-muted">
            {(pagination.pageNumber - 1) * pagination.pageSize + row.index + 1}
          </span>
        ),
      }),
      columnHelper.accessor('standardCode', {
        id: 'standardCode',
        header: 'STANDARD CODE',
        size: 240,
        cell: ({ row }) => (
          <span className="font-semibold text-heading text-xs">
            {row.original.standardCode}
          </span>
        ),
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 140,
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive} size="sm" />
        ),
      }),
      columnHelper.accessor('createdOn', {
        id: 'createdOn',
        header: 'CREATED ON',
        size: 160,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {formatDate(row.original.createdOn || row.original.createdAt)}
          </span>
        ),
      }),
      columnHelper.accessor('lastUpdatedOn', {
        id: 'lastUpdatedOn',
        header: 'LAST UPDATED',
        size: 160,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {row.original.lastUpdatedOn ? formatDate(row.original.lastUpdatedOn) : '—'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 100,
        cell: ({ row }) => (
          <TableActions
            onView={() => handleOpenView(row.original)}
            onEdit={() => handleOpenEdit(row.original)}
            viewTitle="View Standard"
            editTitle="Edit Standard"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [standardsList, pagination.pageNumber, pagination.pageSize]
  );

  const table = useReactTable({
    data: standardsList,
    columns,
    pageCount: pagination.totalPages,
    state: {
      pagination: {
        pageIndex: (pagination.pageNumber || 1) - 1,
        pageSize: pagination.pageSize || 10,
      },
    },
    manualPagination: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
    onPaginationChange: (updater) => {
      const nextState =
        typeof updater === 'function'
          ? updater({
              pageIndex: (pagination.pageNumber || 1) - 1,
              pageSize: pagination.pageSize || 10,
            })
          : updater;
      loadData(nextState.pageIndex + 1, nextState.pageSize);
    },
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Standards"
        icon={IconStandards}
        subtitle="Manage industry and engineering quality standards (DIN, IS, BS, JIS, ASME)."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Standard
          </Button>
        }
      />

      {/* ── Search & Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by standard code..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="standard-status-filter"
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Data Table + Mobile Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={pagination.totalCount}
        entityName="standards"
        emptyTitle="No standards found"
        emptyDescription={
          hasActiveFilters
            ? 'No standards match your active search and filter criteria.'
            : 'No standards have been added yet.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-primary"
            >
              Clear filters
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="text-xs"
            >
              <IconAdd size={14} className="mr-1.5" />
              Add Standard
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const standard = row.original;
          const recordIndex =
            ((pagination.pageNumber || 1) - 1) * (pagination.pageSize || 10) +
            row.index +
            1;

          return (
            <div
              key={standard.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              {/* Top Meta: Index & Status Pill */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-mono font-medium text-text-muted">
                  #{recordIndex}
                </span>
                <StatusBadge status={standard.isActive} size="sm" />
              </div>

              {/* Full-width Name (allows multi-line wrap without truncation) */}
              <h3 className="text-sm font-semibold text-heading break-words leading-snug">
                {standard.standardCode}
              </h3>

              {/* Date Timestamps */}
              <div className="text-2xs text-text-muted space-y-1 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span>Created:</span>
                  <span className="font-mono tabular-nums">
                    {formatDate(standard.createdOn || standard.createdAt)}
                  </span>
                </div>
                {standard.lastUpdatedOn && (
                  <div className="flex items-center justify-between">
                    <span>Updated:</span>
                    <span className="font-mono tabular-nums">
                      {formatDate(standard.lastUpdatedOn)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenView(standard)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(standard)}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStandard ? 'Edit Standard' : 'Add New Standard'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              Refreshing standard details...
            </div>
          )}

          {/* Standard Code */}
          <Input
            id="standardCode"
            name="standardCode"
            type="text"
            label="Standard Code"
            placeholder="e.g. IS-7327-2003, DIN-876, BS-817"
            required
            value={formData.standardCode}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, standardCode: val }));
              if (formErrors.standardCode) {
                setFormErrors((prev) => ({ ...prev, standardCode: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('standardCode', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, standardCode: err }));
            }}
            error={formErrors.standardCode}
          />

          {/* Status Switch (Active / Inactive inside form only) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set standard active or inactive
              </p>
            </div>

            <StatusSwitch
              id="standard-status-toggle"
              checked={formData.isActive}
              disabled={isSubmitting || isFetchingDetail}
              onChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <CancelButton
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="justify-center"
            />
            <SaveButton
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || isFetchingDetail}
              className="justify-center font-semibold shadow-2xs"
            >
              {editingStandard ? 'Save Changes' : 'Save Standard'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Modal ── */}
      <Modal
        isOpen={Boolean(viewingStandard)}
        onClose={() => setViewingStandard(null)}
        title="Standard Details"
        maxWidth="max-w-md"
      >
        {viewingStandard && (
          <div className="space-y-4">
            {isFetchingDetail && (
              <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
                <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
                Refreshing details from server...
              </div>
            )}

            {/* Header banner */}
            <div className="p-4 rounded-xl bg-surface/50 border border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <IconStandards size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-heading break-words leading-snug">
                    {viewingStandard.standardCode}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Standard Configuration
                  </p>
                </div>
              </div>
              <StatusBadge status={viewingStandard.isActive} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Standard Code
                </span>
                <span className="font-semibold text-sm text-heading">
                  {viewingStandard.standardCode}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-xs font-medium">
                  {viewingStandard.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Created Date
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingStandard.createdOn || viewingStandard.createdAt)}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Last Updated
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {viewingStandard.lastUpdatedOn
                    ? formatDate(viewingStandard.lastUpdatedOn)
                    : '—'}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const target = viewingStandard;
                  setViewingStandard(null);
                  handleOpenEdit(target);
                }}
              >
                <IconEdit size={14} className="mr-1.5" />
                Edit Standard
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingStandard(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

