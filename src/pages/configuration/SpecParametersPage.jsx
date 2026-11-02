/**
 * SpecParametersPage.jsx — Specification Parameters configuration page for MicroFlat ERP.
 *
 * Route: /configuration/spec-parameters
 *
 * Requirements:
 *   - Search and status filters (matching Swagger GET /api/spec-parameters).
 *   - Server-side pagination and TanStack DataTable.
 *   - Read-only StatusBadge in the table (no external status toggle).
 *   - Mobile card view with full-width wrapping title and top metadata bar.
 *   - Status change via PATCH /api/spec-parameters/{id}/status inside the Create/Edit form only.
 *   - View modal with fresh data fetched from GET /api/spec-parameters/{id}.
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
  IconSpecParameters,
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
import { useSpecParametersContext } from '../../context/SpecParametersContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const INITIAL_FORM = {
  parameterName: '',
  unitSymbol: '',
  toleranceUnitSymbol: '',
  isActive: true,
};

export default function SpecParametersPage() {
  const {
    specParametersList = [],
    pagination,
    isLoading,
    fetchSpecParameters,
    fetchSpecParameterById,
    addSpecParameter,
    updateSpecParameter,
    updateSpecParameterStatus,
  } = useSpecParametersContext();

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
      fetchSpecParameters(params);
    },
    [debouncedSearch, statusFilter, pagination.pageSize, fetchSpecParameters]
  );

  useEffect(() => {
    loadData(1, pagination.pageSize);
  }, [debouncedSearch, statusFilter, loadData]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState(null);
  const [viewingParameter, setViewingParameter] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Form Validation ── */
  function validateField(name, value) {
    switch (name) {
      case 'parameterName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Parameter name is required.';
        if (str.length > 150) return 'Parameter name cannot exceed 150 characters.';

        // Client-side duplicate check within loaded list
        const currentTargetId = editingParameter?.id;
        const duplicate = specParametersList.find((p) => {
          if (editingParameter && String(p.id) === String(currentTargetId)) return false;
          return p.parameterName?.toLowerCase() === str.toLowerCase();
        });
        if (duplicate) return 'A specification parameter with this name already exists.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    const err = validateField('parameterName', data.parameterName);
    if (err) errors.parameterName = err;
    return errors;
  }

  /* ── Modal Open / Close Handlers ── */
  function handleOpenAdd() {
    setEditingParameter(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleOpenEdit(param) {
    const id = param.id;
    setEditingParameter(param);
    setFormData({
      parameterName: param.parameterName || '',
      unitSymbol: param.unitSymbol || '',
      toleranceUnitSymbol: param.toleranceUnitSymbol || '',
      isActive: Boolean(param.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchSpecParameterById(id);
      if (fresh) {
        setEditingParameter(fresh);
        setFormData({
          parameterName: fresh.parameterName || '',
          unitSymbol: fresh.unitSymbol || '',
          toleranceUnitSymbol: fresh.toleranceUnitSymbol || '',
          isActive: Boolean(fresh.isActive),
        });
      }
    } catch {
      // toast is handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  async function handleOpenView(param) {
    const id = param.id;
    setViewingParameter(param);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchSpecParameterById(id);
      if (fresh) {
        setViewingParameter(fresh);
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
    setEditingParameter(null);
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
        parameterName: formData.parameterName.trim(),
        unitSymbol: formData.unitSymbol.trim() || null,
        toleranceUnitSymbol: formData.toleranceUnitSymbol.trim() || null,
      };

      if (editingParameter) {
        const id = editingParameter.id;
        // 1. Update parameter via PUT /api/spec-parameters/{id}
        await updateSpecParameter(id, payload);

        // 2. If status was modified, update via PATCH /api/spec-parameters/{id}/status
        if (Boolean(editingParameter.isActive) !== Boolean(formData.isActive)) {
          await updateSpecParameterStatus(id, formData.isActive);
        }
      } else {
        // 1. Create new parameter via POST /api/spec-parameters
        const created = await addSpecParameter(payload);
        const newId = created?.id;

        // 2. If status set to inactive during creation, update via PATCH /api/spec-parameters/{id}/status
        if (newId && formData.isActive === false) {
          await updateSpecParameterStatus(newId, false);
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
      columnHelper.accessor('parameterName', {
        id: 'parameterName',
        header: 'PARAMETER NAME',
        size: 240,
        cell: ({ row }) => (
          <span className="font-semibold text-heading text-xs">
            {row.original.parameterName}
          </span>
        ),
      }),
      columnHelper.accessor('unitSymbol', {
        id: 'unitSymbol',
        header: 'UNIT',
        size: 110,
        cell: ({ row }) =>
          row.original.unitSymbol ? (
            <span className="inline-block px-2 py-0.5 font-mono text-2xs font-semibold rounded bg-surface border border-border text-heading">
              {row.original.unitSymbol}
            </span>
          ) : (
            <span className="text-text-muted/60 text-xs">—</span>
          ),
      }),
      columnHelper.accessor('toleranceUnitSymbol', {
        id: 'toleranceUnitSymbol',
        header: 'TOLERANCE UNIT',
        size: 130,
        cell: ({ row }) =>
          row.original.toleranceUnitSymbol ? (
            <span className="inline-block px-2 py-0.5 font-mono text-2xs font-semibold rounded bg-surface border border-border text-heading">
              {row.original.toleranceUnitSymbol}
            </span>
          ) : (
            <span className="text-text-muted/60 text-xs">—</span>
          ),
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 130,
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive} size="sm" />
        ),
      }),
      columnHelper.accessor('createdOn', {
        id: 'createdOn',
        header: 'CREATED ON',
        size: 150,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {formatDate(row.original.createdOn || row.original.createdAt)}
          </span>
        ),
      }),
      columnHelper.accessor('lastUpdatedOn', {
        id: 'lastUpdatedOn',
        header: 'LAST UPDATED',
        size: 150,
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
            viewTitle="View Parameter"
            editTitle="Edit Parameter"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [specParametersList, pagination.pageNumber, pagination.pageSize]
  );

  const table = useReactTable({
    data: specParametersList,
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
        title="Spec Parameters"
        icon={IconSpecParameters}
        subtitle="Configure specification parameters, measurement units, and tolerance standards."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Parameter
          </Button>
        }
      />

      {/* ── Search & Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by parameter name..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="spec-parameter-status-filter"
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
        entityName="parameters"
        emptyTitle="No specification parameters found"
        emptyDescription={
          hasActiveFilters
            ? 'No parameters match your active search and filter criteria.'
            : 'No specification parameters have been added yet.'
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
              Add Parameter
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const param = row.original;
          const recordIndex =
            ((pagination.pageNumber || 1) - 1) * (pagination.pageSize || 10) +
            row.index +
            1;

          return (
            <div
              key={param.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              {/* Top Meta: Index & Status Pill */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-mono font-medium text-text-muted">
                  #{recordIndex}
                </span>
                <StatusBadge status={param.isActive} size="sm" />
              </div>

              {/* Full-width Name (allows multi-line wrap without truncation) */}
              <h3 className="text-sm font-semibold text-heading break-words leading-snug">
                {param.parameterName}
              </h3>

              {/* Units Badges */}
              {(param.unitSymbol || param.toleranceUnitSymbol) && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-2xs text-text-muted">
                  {param.unitSymbol && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg border border-border">
                      <span className="text-text-muted/70">Unit:</span>
                      <strong className="font-mono text-heading">{param.unitSymbol}</strong>
                    </span>
                  )}
                  {param.toleranceUnitSymbol && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg border border-border">
                      <span className="text-text-muted/70">Tolerance:</span>
                      <strong className="font-mono text-heading">{param.toleranceUnitSymbol}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Date Timestamps */}
              <div className="text-2xs text-text-muted space-y-1 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span>Created:</span>
                  <span className="font-mono tabular-nums">
                    {formatDate(param.createdOn || param.createdAt)}
                  </span>
                </div>
                {param.lastUpdatedOn && (
                  <div className="flex items-center justify-between">
                    <span>Updated:</span>
                    <span className="font-mono tabular-nums">
                      {formatDate(param.lastUpdatedOn)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenView(param)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(param)}
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
        title={editingParameter ? 'Edit Specification Parameter' : 'Add New Specification Parameter'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              Refreshing parameter details...
            </div>
          )}

          {/* Parameter Name */}
          <Input
            id="parameterName"
            name="parameterName"
            type="text"
            label="Parameter Name"
            placeholder="e.g. Flatness, Admit Between Centers, Base Size"
            required
            value={formData.parameterName}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, parameterName: val }));
              if (formErrors.parameterName) {
                setFormErrors((prev) => ({ ...prev, parameterName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('parameterName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, parameterName: err }));
            }}
            error={formErrors.parameterName}
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Unit Symbol */}
            <Input
              id="unitSymbol"
              name="unitSymbol"
              type="text"
              label="Unit Symbol"
              placeholder="e.g. mm, µm, kg"
              value={formData.unitSymbol}
              disabled={isSubmitting || isFetchingDetail}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, unitSymbol: val }));
              }}
            />

            {/* Tolerance Unit Symbol */}
            <Input
              id="toleranceUnitSymbol"
              name="toleranceUnitSymbol"
              type="text"
              label="Tolerance Unit"
              placeholder="e.g. µm, mm"
              value={formData.toleranceUnitSymbol}
              disabled={isSubmitting || isFetchingDetail}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, toleranceUnitSymbol: val }));
              }}
            />
          </div>

          {/* Status Switch (Active / Inactive inside form only) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set parameter active or inactive
              </p>
            </div>

            <StatusSwitch
              id="spec-parameter-status-toggle"
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
              {editingParameter ? 'Save Changes' : 'Save Parameter'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Modal ── */}
      <Modal
        isOpen={Boolean(viewingParameter)}
        onClose={() => setViewingParameter(null)}
        title="Parameter Details"
        maxWidth="max-w-md"
      >
        {viewingParameter && (
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
                  <IconSpecParameters size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-heading break-words leading-snug">
                    {viewingParameter.parameterName}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Specification Configuration
                  </p>
                </div>
              </div>
              <StatusBadge status={viewingParameter.isActive} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Unit Symbol
                </span>
                <span className="font-semibold text-sm text-heading">
                  {viewingParameter.unitSymbol || '—'}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Tolerance Unit
                </span>
                <span className="font-semibold text-sm text-heading">
                  {viewingParameter.toleranceUnitSymbol || '—'}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Created Date
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingParameter.createdOn || viewingParameter.createdAt)}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Last Updated
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {viewingParameter.lastUpdatedOn
                    ? formatDate(viewingParameter.lastUpdatedOn)
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
                  const target = viewingParameter;
                  setViewingParameter(null);
                  handleOpenEdit(target);
                }}
              >
                <IconEdit size={14} className="mr-1.5" />
                Edit Parameter
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingParameter(null)}
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

