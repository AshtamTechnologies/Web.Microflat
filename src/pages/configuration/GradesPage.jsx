/**
 * GradesPage.jsx — Product Grades configuration page for MicroFlat ERP.
 *
 * Route: /configuration/grades
 *
 * Requirements:
 *   - Search and status filters (matching Swagger GET /api/grades).
 *   - Server-side pagination and TanStack DataTable.
 *   - Read-only StatusBadge in the table (no external status toggle).
 *   - Status change via PATCH /api/grades/{id}/status inside the Create/Edit form only.
 *   - View modal with fresh data fetched from GET /api/grades/{id}.
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
  IconGrades,
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
import { useGradesContext } from '../../context/GradesContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const INITIAL_FORM = {
  gradeCode: '',
  isActive: true,
};

export default function GradesPage() {
  const {
    gradesList = [],
    pagination,
    isLoading,
    fetchGrades,
    fetchGradeById,
    addGrade,
    updateGrade,
    updateGradeStatus,
  } = useGradesContext();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [columnSizing, setColumnSizing] = useState({});

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
      fetchGrades(params);
    },
    [debouncedSearch, statusFilter, pagination.pageSize, fetchGrades]
  );

  useEffect(() => {
    loadData(1, pagination.pageSize);
  }, [debouncedSearch, statusFilter, loadData]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [viewingGrade, setViewingGrade] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Form Validation ── */
  function validateField(name, value) {
    switch (name) {
      case 'gradeCode': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Grade code is required.';
        if (str.length > 50) return 'Grade code cannot exceed 50 characters.';

        // Client-side duplicate check within loaded list
        const currentTargetId = editingGrade?.id;
        const duplicate = gradesList.find((g) => {
          if (editingGrade && String(g.id) === String(currentTargetId)) return false;
          return g.gradeCode?.toLowerCase() === str.toLowerCase();
        });
        if (duplicate) return 'A grade with this code already exists.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    const err = validateField('gradeCode', data.gradeCode);
    if (err) errors.gradeCode = err;
    return errors;
  }

  /* ── Modal Open / Close Handlers ── */
  function handleOpenAdd() {
    setEditingGrade(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleOpenEdit(grade) {
    const id = grade.id;
    setEditingGrade(grade);
    setFormData({
      gradeCode: grade.gradeCode || '',
      isActive: Boolean(grade.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchGradeById(id);
      if (fresh) {
        setEditingGrade(fresh);
        setFormData({
          gradeCode: fresh.gradeCode || '',
          isActive: Boolean(fresh.isActive),
        });
      }
    } catch {
      // toast is handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  async function handleOpenView(grade) {
    const id = grade.id;
    setViewingGrade(grade);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchGradeById(id);
      if (fresh) {
        setViewingGrade(fresh);
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
    setEditingGrade(null);
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
        gradeCode: formData.gradeCode.trim(),
      };

      if (editingGrade) {
        const id = editingGrade.id;
        // 1. Update grade code via PUT /api/grades/{id}
        if (editingGrade.gradeCode !== payload.gradeCode) {
          await updateGrade(id, payload);
        }

        // 2. If status was modified, update via PATCH /api/grades/{id}/status
        if (Boolean(editingGrade.isActive) !== Boolean(formData.isActive)) {
          await updateGradeStatus(id, formData.isActive);
        }
      } else {
        // 1. Create new grade via POST /api/grades
        const created = await addGrade(payload);
        const newId = created?.id;

        // 2. If status set to inactive during creation, update via PATCH /api/grades/{id}/status
        if (newId && formData.isActive === false) {
          await updateGradeStatus(newId, false);
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
        minSize: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-text-muted">
            {(pagination.pageNumber - 1) * pagination.pageSize + row.index + 1}
          </span>
        ),
      }),
      columnHelper.accessor('gradeCode', {
        id: 'gradeCode',
        header: 'GRADE CODE',
        size: 200,
        minSize: 130,
        cell: ({ row }) => (
          <span className="font-semibold text-heading text-xs">
            {row.original.gradeCode}
          </span>
        ),
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 140,
        minSize: 100,
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive} size="sm" />
        ),
      }),
      columnHelper.accessor('createdOn', {
        id: 'createdOn',
        header: 'CREATED ON',
        size: 160,
        minSize: 120,
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
        minSize: 120,
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
        minSize: 90,
        enableResizing: false,
        cell: ({ row }) => (
          <TableActions
            onView={() => handleOpenView(row.original)}
            onEdit={() => handleOpenEdit(row.original)}
            viewTitle="View Grade"
            editTitle="Edit Grade"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gradesList, pagination.pageNumber, pagination.pageSize]
  );

  const table = useReactTable({
    data: gradesList,
    columns,
    pageCount: pagination.totalPages,
    state: {
      pagination: {
        pageIndex: (pagination.pageNumber || 1) - 1,
        pageSize: pagination.pageSize || 10,
      },
      columnSizing,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
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
        title="Product Grades"
        icon={IconGrades}
        subtitle="Manage product grades and quality standards used across inventory and product configurations."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Grade
          </Button>
        }
      />

      {/* ── Search & Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by grade code..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="grade-status-filter"
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Data Table ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={pagination.totalCount}
        entityName="grades"
        emptyTitle="No grades found"
        emptyDescription={
          hasActiveFilters
            ? 'No grades match your active search and filter criteria.'
            : 'No grades have been added yet.'
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
              Add Grade
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const grade = row.original;
          const recordIndex =
            ((pagination.pageNumber || 1) - 1) * (pagination.pageSize || 10) +
            row.index +
            1;

          return (
            <div
              key={grade.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              {/* Top Meta: Index & Status Pill */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-mono font-medium text-text-muted">
                  #{recordIndex}
                </span>
                <StatusBadge status={grade.isActive} size="sm" />
              </div>

              {/* Full-width Name (allows multi-line wrap without truncation) */}
              <h3 className="text-sm font-semibold text-heading break-words leading-snug">
                {grade.gradeCode}
              </h3>

              <div className="text-2xs text-text-muted space-y-1 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span>Created:</span>
                  <span className="font-mono tabular-nums">
                    {formatDate(grade.createdOn || grade.createdAt)}
                  </span>
                </div>
                {grade.lastUpdatedOn && (
                  <div className="flex items-center justify-between">
                    <span>Updated:</span>
                    <span className="font-mono tabular-nums">
                      {formatDate(grade.lastUpdatedOn)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenView(grade)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(grade)}
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
        title={editingGrade ? 'Edit Grade' : 'Add New Grade'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              Refreshing grade details...
            </div>
          )}

          {/* Grade Code */}
          <Input
            id="gradeCode"
            name="gradeCode"
            type="text"
            label="Grade Code"
            placeholder="e.g. Gr-0, Gr-00, Gr-1"
            required
            value={formData.gradeCode}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, gradeCode: val }));
              if (formErrors.gradeCode) {
                setFormErrors((prev) => ({ ...prev, gradeCode: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('gradeCode', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, gradeCode: err }));
            }}
            error={formErrors.gradeCode}
          />

          {/* Status Switch (Active / Inactive inside form only) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set grade active or inactive
              </p>
            </div>

            <StatusSwitch
              id="grade-status-toggle"
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
              {editingGrade ? 'Save Changes' : 'Save Grade'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Modal ── */}
      <Modal
        isOpen={Boolean(viewingGrade)}
        onClose={() => setViewingGrade(null)}
        title="Grade Details"
        maxWidth="max-w-md"
      >
        {viewingGrade && (
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
                  <IconGrades size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-heading break-words leading-snug">
                    {viewingGrade.gradeCode}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Grade Configuration
                  </p>
                </div>
              </div>
              <StatusBadge status={viewingGrade.isActive} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Grade Code
                </span>
                <span className="font-semibold text-sm text-heading">
                  {viewingGrade.gradeCode}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-xs font-medium">
                  {viewingGrade.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Created Date
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingGrade.createdOn || viewingGrade.createdAt)}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Last Updated
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {viewingGrade.lastUpdatedOn
                    ? formatDate(viewingGrade.lastUpdatedOn)
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
                  const target = viewingGrade;
                  setViewingGrade(null);
                  handleOpenEdit(target);
                }}
              >
                <IconEdit size={14} className="mr-1.5" />
                Edit Grade
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingGrade(null)}
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
