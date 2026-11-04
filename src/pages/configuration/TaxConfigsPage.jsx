/**
 * TaxConfigsPage.jsx — Tax Configurations page for MicroFlat ERP.
 *
 * Route: /configuration/tax-configs
 *
 * Requirements:
 *   - Search & status filters matching GET /api/tax-configs.
 *   - Server-side pagination & TanStack DataTable.
 *   - Read-only StatusBadge in table (status only changed from inside form via PATCH).
 *   - Create Tax via POST /api/tax-configs with initial rate & effective date.
 *   - Update Tax Name via PUT /api/tax-configs/{id}.
 *   - Update Status via PATCH /api/tax-configs/{id}/status inside the form.
 *   - Delete Tax via DELETE /api/tax-configs/{id}.
 *   - Rate Timeline management via:
 *       GET /api/tax-configs/{id}/rates
 *       POST /api/tax-configs/{id}/rates
 *       GET /api/tax-config-rates/{rateId}
 *       PUT /api/tax-config-rates/{rateId}
 *       DELETE /api/tax-config-rates/{rateId}
 *   - Applicable Rates Lookup via GET /api/tax-configs/applicable?date=.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconClose,
  IconEdit,
  IconSearch,
  IconView,
  IconDelete,
  IconCalendar,
  IconTax,
  IconClock,
  IconHistory,
  IconRefresh,
  IconCheck,
} from '../../constants/icons';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  DatePicker,
  Select,
  SearchableSelect,
  Modal,
  ConfirmModal,
  StatusSwitch,
  PageHeader,
  TableToolbar,
  DataTable,
  TableActions,
  StatusBadge,
  Badge,
  Card,
  DetailField,
} from '../../components/ui';
import { useTaxConfigsContext } from '../../context/TaxConfigsContext';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const INITIAL_TAX_FORM = {
  taxName: '',
  taxPercent: '',
  effectiveDate: new Date().toISOString().split('T')[0],
  isActive: true,
};

const INITIAL_RATE_FORM = {
  taxPercent: '',
  effectiveDate: new Date().toISOString().split('T')[0],
};

export default function TaxConfigsPage() {
  const {
    taxConfigs = [],
    pagination,
    isLoading,
    fetchTaxConfigs,
    fetchTaxConfigById,
    fetchApplicableTaxes,
    addTaxConfig,
    updateTaxConfig,
    updateTaxConfigStatus,
    deleteTaxConfig,
    fetchRates,
    addRate,
    updateRate,
    deleteRate,
  } = useTaxConfigsContext();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Applicable Date Lookup Preview State
  const [applicableDate, setApplicableDate] = useState(new Date().toISOString().split('T')[0]);
  const [applicableList, setApplicableList] = useState([]);
  const [showApplicableModal, setShowApplicableModal] = useState(false);
  const [isLoadingApplicable, setIsLoadingApplicable] = useState(false);

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Server fetch trigger
  const loadData = useCallback(() => {
    const params = {
      PageNumber: currentPage,
      PageSize: pageSize,
    };
    if (debouncedSearch) {
      params.Search = debouncedSearch;
    }
    if (statusFilter === 'ACTIVE') {
      params.IsActive = true;
    } else if (statusFilter === 'INACTIVE') {
      params.IsActive = false;
    }
    fetchTaxConfigs(params);
  }, [debouncedSearch, statusFilter, currentPage, pageSize, fetchTaxConfigs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState(INITIAL_TAX_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View / Timeline Modal
  const [viewingConfig, setViewingConfig] = useState(null);
  const [timelineRates, setTimelineRates] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Rate Add/Edit Modal
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [rateFormData, setRateFormData] = useState(INITIAL_RATE_FORM);
  const [rateFormErrors, setRateFormErrors] = useState({});
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  // Delete Confirm Modal
  const [deletingConfig, setDeletingConfig] = useState(null);
  const [deletingRate, setDeletingRate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ── Validation ── */
  function validateTaxForm(data, isEdit = false) {
    const errors = {};
    if (!data.taxName || !data.taxName.trim()) {
      errors.taxName = 'Tax Name is required.';
    } else if (data.taxName.trim().length > 100) {
      errors.taxName = 'Tax Name cannot exceed 100 characters.';
    }

    if (!isEdit) {
      if (data.taxPercent === '' || data.taxPercent === null || isNaN(Number(data.taxPercent))) {
        errors.taxPercent = 'Valid Tax Percent is required.';
      } else if (Number(data.taxPercent) < 0 || Number(data.taxPercent) > 100) {
        errors.taxPercent = 'Tax Percent must be between 0 and 100.';
      }

      if (!data.effectiveDate) {
        errors.effectiveDate = 'Effective Date is required.';
      }
    }

    return errors;
  }

  function validateRateForm(data) {
    const errors = {};
    if (data.taxPercent === '' || data.taxPercent === null || isNaN(Number(data.taxPercent))) {
      errors.taxPercent = 'Valid Tax Percent is required.';
    } else if (Number(data.taxPercent) < 0 || Number(data.taxPercent) > 100) {
      errors.taxPercent = 'Tax Percent must be between 0 and 100.';
    }

    if (!data.effectiveDate) {
      errors.effectiveDate = 'Effective Date is required.';
    }
    return errors;
  }

  /* ── Open Create Tax Modal ── */
  function handleOpenAdd() {
    setEditingConfig(null);
    setFormData(INITIAL_TAX_FORM);
    setFormErrors({});
    setIsFormModalOpen(true);
  }

  /* ── Open Edit Tax Modal ── */
  async function handleOpenEdit(item) {
    setEditingConfig(item);
    setFormData({
      taxName: item.taxName || '',
      taxPercent: item.currentTaxPercent ?? '',
      effectiveDate: item.currentEffectiveDate || new Date().toISOString().split('T')[0],
      isActive: Boolean(item.isActive),
    });
    setFormErrors({});
    setIsFormModalOpen(true);

    try {
      const fresh = await fetchTaxConfigById(item.id);
      if (fresh) {
        setEditingConfig(fresh);
        setFormData({
          taxName: fresh.taxName || '',
          taxPercent: fresh.currentTaxPercent ?? '',
          effectiveDate: fresh.currentEffectiveDate || '',
          isActive: Boolean(fresh.isActive),
        });
      }
    } catch {
      // toast in context
    }
  }

  /* ── Open View Tax & Timeline Modal ── */
  async function handleOpenView(item) {
    setViewingConfig(item);
    setTimelineRates(item.rates || []);
    setIsLoadingTimeline(true);

    try {
      const fresh = await fetchTaxConfigById(item.id);
      if (fresh) {
        setViewingConfig(fresh);
        setTimelineRates(fresh.rates || []);
      }
    } catch {
      // toast in context
    } finally {
      setIsLoadingTimeline(false);
    }
  }

  /* ── Close Main Form Modal ── */
  function handleCloseFormModal() {
    if (isSubmitting) return;
    setIsFormModalOpen(false);
    setEditingConfig(null);
    setFormData(INITIAL_TAX_FORM);
    setFormErrors({});
  }

  /* ── Save Tax Form (Create / Edit with Status Patch) ── */
  async function handleSaveTax(e) {
    if (e) e.preventDefault();
    const isEdit = Boolean(editingConfig);
    const errors = validateTaxForm(formData, isEdit);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        const id = editingConfig.id;
        // 1. Rename Tax via PUT /api/tax-configs/{id}
        if (editingConfig.taxName !== formData.taxName.trim()) {
          await updateTaxConfig(id, { taxName: formData.taxName.trim() });
        }

        // 2. Status change from the form only: PATCH /api/tax-configs/{id}/status
        if (Boolean(editingConfig.isActive) !== Boolean(formData.isActive)) {
          await updateTaxConfigStatus(id, formData.isActive);
        }
      } else {
        // Create new tax via POST /api/tax-configs
        const payload = {
          taxName: formData.taxName.trim(),
          taxPercent: Number(formData.taxPercent),
          effectiveDate: formData.effectiveDate,
        };
        const created = await addTaxConfig(payload);

        // If user explicitly created as inactive in the form, patch status
        if (created?.id && formData.isActive === false) {
          await updateTaxConfigStatus(created.id, false);
        }
      }

      handleCloseFormModal();
      loadData();
    } catch {
      // toast handled in context
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Rate Timeline Operations ── */
  function handleOpenAddRate() {
    setEditingRate(null);
    setRateFormData({
      taxPercent: '',
      effectiveDate: new Date().toISOString().split('T')[0],
    });
    setRateFormErrors({});
    setIsRateModalOpen(true);
  }

  function handleOpenEditRate(rate) {
    setEditingRate(rate);
    setRateFormData({
      taxPercent: rate.taxPercent ?? '',
      effectiveDate: rate.effectiveDate || new Date().toISOString().split('T')[0],
    });
    setRateFormErrors({});
    setIsRateModalOpen(true);
  }

  async function handleSaveRate(e) {
    if (e) e.preventDefault();
    const errors = validateRateForm(rateFormData);
    if (Object.keys(errors).length > 0) {
      setRateFormErrors(errors);
      return;
    }

    setIsSubmittingRate(true);
    try {
      const payload = {
        taxPercent: Number(rateFormData.taxPercent),
        effectiveDate: rateFormData.effectiveDate,
      };

      if (editingRate) {
        await updateRate(editingRate.id, payload);
      } else {
        await addRate(viewingConfig.id, payload);
      }

      // Refresh view timeline
      setIsRateModalOpen(false);
      setEditingRate(null);
      if (viewingConfig?.id) {
        const fresh = await fetchTaxConfigById(viewingConfig.id);
        if (fresh) {
          setViewingConfig(fresh);
          setTimelineRates(fresh.rates || []);
        }
      }
      loadData();
    } catch {
      // toast in context
    } finally {
      setIsSubmittingRate(false);
    }
  }

  async function handleConfirmDeleteRate() {
    if (!deletingRate) return;
    setIsDeleting(true);
    try {
      await deleteRate(deletingRate.id);
      setDeletingRate(null);
      if (viewingConfig?.id) {
        const fresh = await fetchTaxConfigById(viewingConfig.id);
        if (fresh) {
          setViewingConfig(fresh);
          setTimelineRates(fresh.rates || []);
        }
      }
      loadData();
    } catch {
      // toast in context
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleConfirmDeleteConfig() {
    if (!deletingConfig) return;
    setIsDeleting(true);
    try {
      await deleteTaxConfig(deletingConfig.id);
      setDeletingConfig(null);
      loadData();
    } catch {
      // toast in context
    } finally {
      setIsDeleting(false);
    }
  }

  /* ── Applicable Taxes Preview ── */
  async function handleLookupApplicable() {
    setIsLoadingApplicable(true);
    setShowApplicableModal(true);
    try {
      const list = await fetchApplicableTaxes(applicableDate);
      setApplicableList(list);
    } catch {
      // toast in context
    } finally {
      setIsLoadingApplicable(false);
    }
  }

  /* ── Reset Filters ── */
  function handleResetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  }

  const hasActiveFilters = Boolean(search || statusFilter !== 'ALL');

  /* ── Table Columns ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        id: 'index',
        header: '#',
        size: 50,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-text-muted">
            {(currentPage - 1) * pageSize + row.index + 1}
          </span>
        ),
      }),
      columnHelper.accessor('taxName', {
        id: 'taxName',
        header: 'TAX NAME',
        size: 220,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconTax size={14} />
            </div>
            <span className="font-semibold text-heading text-xs">
              {row.original.taxName}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('currentTaxPercent', {
        id: 'currentTaxPercent',
        header: 'CURRENT RATE',
        size: 130,
        cell: ({ row }) => (
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading inline-block">
            {Number(row.original.currentTaxPercent).toFixed(2)}%
          </span>
        ),
      }),
      columnHelper.accessor('currentEffectiveDate', {
        id: 'currentEffectiveDate',
        header: 'EFFECTIVE FROM',
        size: 150,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {row.original.currentEffectiveDate ? formatDate(row.original.currentEffectiveDate) : '—'}
          </span>
        ),
      }),
      columnHelper.accessor('rateCount', {
        id: 'rateCount',
        header: 'RATE VERSIONS',
        size: 130,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-medium">
            <IconClock size={12} />
            {row.original.rateCount} {row.original.rateCount === 1 ? 'Rate' : 'Rates'}
          </span>
        ),
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 120,
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
        ),
      }),
      columnHelper.accessor('createdOn', {
        id: 'createdOn',
        header: 'CREATED ON',
        size: 140,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {formatDate(row.original.createdOn)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 90,
        size: 100,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <TableActions
            onView={() => handleOpenView(row.original)}
            onEdit={() => handleOpenEdit(row.original)}
            viewTitle="View Details & Rates"
            editTitle="Edit Tax"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taxConfigs, currentPage, pageSize]
  );

  const [tablePagination, setTablePagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: taxConfigs,
    columns,
    state: {
      pagination: tablePagination,
    },
    onPaginationChange: (updater) => {
      setTablePagination((old) => {
        const next = typeof updater === 'function' ? updater(old) : updater;
        setCurrentPage(next.pageIndex + 1);
        setPageSize(next.pageSize);
        return next;
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Page Header ── */}
      <PageHeader
        title="Tax Configurations"
        icon={IconTax}
        subtitle="Manage tax configurations, effective rates, and historical rate versions for quotations and invoices."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={handleLookupApplicable}
              className="shrink-0 shadow-2xs"
            >
              <IconCalendar size={16} className="mr-1.5" />
              Check Effective Rates
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenAdd}
              className="shrink-0 shadow-xs"
            >
              <IconAdd size={16} className="mr-1.5" />
              Add Tax
            </Button>
          </div>
        }
      />

      {/* ── Table Toolbar & Filters ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search taxes by name..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="tax-status-filter"
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </TableToolbar>

      {/* ── Main Data Table ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={pagination.totalCount || taxConfigs.length}
        entityName="tax configurations"
        emptyTitle="No tax configurations found"
        emptyDescription={
          hasActiveFilters
            ? 'No tax configurations match your current search or status filters.'
            : "No tax configurations configured yet. Click 'Add Tax' to create one."
        }
        emptyAction={
          hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={handleResetFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleOpenAdd}>
              <IconAdd size={14} className="mr-1" />
              Add Tax
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const item = row.original;
          const recordIndex =
            (tablePagination.pageIndex || 0) * (tablePagination.pageSize || 10) + row.index + 1;

          return (
            <div
              key={item.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              {/* Top Meta: Index & Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-mono font-medium text-text-muted">
                  #{recordIndex}
                </span>
                <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
              </div>

              {/* Tax Name & Icon */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconTax size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-heading break-words leading-snug">
                    {item.taxName}
                  </h3>
                </div>
              </div>

              {/* Rate & Effective Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div className="p-2.5 rounded-lg bg-bg/60 border border-border/50">
                  <span className="text-[11px] text-text-muted block mb-0.5">Current Rate</span>
                  <span className="font-mono font-bold text-heading text-xs">
                    {Number(item.currentTaxPercent).toFixed(2)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg/60 border border-border/50">
                  <span className="text-[11px] text-text-muted block mb-0.5">Effective From</span>
                  <span className="font-mono text-text-muted text-xs">
                    {item.currentEffectiveDate ? formatDate(item.currentEffectiveDate) : '—'}
                  </span>
                </div>
              </div>

              {/* Versions Pill & Created Date */}
              <div className="flex items-center justify-between gap-2 pt-1 text-2xs text-text-muted">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 font-medium">
                  <IconClock size={11} />
                  {item.rateCount} {item.rateCount === 1 ? 'Rate Version' : 'Rate Versions'}
                </span>
                <span className="font-mono tabular-nums">
                  {formatDate(item.createdOn)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenView(item)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" />
                  View & Rates
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(item)}
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

      {/* ── Add / Edit Tax Configuration Modal ── */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={editingConfig ? 'Edit Tax Configuration' : 'Add Tax Configuration'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveTax} className="space-y-4">
          <Input
            id="taxName"
            name="taxName"
            label="Tax Name"
            placeholder="e.g. GST 18%, IGST 12%, SGST 9%"
            required
            value={formData.taxName}
            disabled={isSubmitting}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, taxName: e.target.value }));
              if (formErrors.taxName) setFormErrors((prev) => ({ ...prev, taxName: '' }));
            }}
            error={formErrors.taxName}
          />

          {/* When creating, require initial rate & effective date */}
          {!editingConfig ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                id="taxPercent"
                name="taxPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                label="Initial Tax Percent (%)"
                placeholder="e.g. 18.00"
                required
                value={formData.taxPercent}
                disabled={isSubmitting}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, taxPercent: e.target.value }));
                  if (formErrors.taxPercent) setFormErrors((prev) => ({ ...prev, taxPercent: '' }));
                }}
                error={formErrors.taxPercent}
              />

              <DatePicker
                id="effectiveDate"
                name="effectiveDate"
                label="Effective Date"
                required
                value={formData.effectiveDate}
                disabled={isSubmitting}
                onChange={(e) => {
                  const val = typeof e === 'string' ? e : e?.target?.value ?? '';
                  setFormData((prev) => ({ ...prev, effectiveDate: val }));
                  if (formErrors.effectiveDate) setFormErrors((prev) => ({ ...prev, effectiveDate: '' }));
                }}
                error={formErrors.effectiveDate}
              />
            </div>
          ) : (
            <div className="p-3 bg-surface/50 rounded-lg border border-border text-xs text-text-muted space-y-1">
              <div className="flex items-center justify-between">
                <span>Current Effective Rate:</span>
                <span className="font-mono font-bold text-heading">
                  {Number(editingConfig.currentTaxPercent || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Effective Date:</span>
                <span className="font-mono text-heading">
                  {editingConfig.currentEffectiveDate ? formatDate(editingConfig.currentEffectiveDate) : '—'}
                </span>
              </div>
              <p className="text-[11px] text-text-muted/80 pt-1 border-t border-border/60">
                To change rates or introduce future rates, use the Rate Timeline from the View modal.
              </p>
            </div>
          )}

          {/* Status Switch (strictly inside the form) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Inactive taxes cannot be selected on new quotation lines
              </p>
            </div>
            <StatusSwitch
              id="tax-status-switch"
              checked={formData.isActive}
              disabled={isSubmitting}
              onChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <CancelButton onClick={handleCloseFormModal} disabled={isSubmitting} />
            <SaveButton type="submit" loading={isSubmitting}>
              {editingConfig ? 'Save Changes' : 'Create Tax'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Tax & Rate Timeline Modal ── */}
      <Modal
        isOpen={Boolean(viewingConfig)}
        onClose={() => setViewingConfig(null)}
        title="Tax Details & Rate History"
        maxWidth="max-w-3xl"
      >
        {viewingConfig && (
          <div className="space-y-5">
            {/* Tax Overview Banner */}
            <div className="p-4 rounded-xl bg-surface/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconTax size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-heading">{viewingConfig.taxName}</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Current Rate: <span className="font-mono font-bold text-heading">{Number(viewingConfig.currentTaxPercent).toFixed(2)}%</span>
                    {' • '}
                    Effective From: <span className="font-mono text-heading">{formatDate(viewingConfig.currentEffectiveDate)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <StatusBadge status={viewingConfig.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAddRate}
                  className="shadow-2xs"
                >
                  <IconAdd size={14} className="mr-1" />
                  Add New Rate
                </Button>
              </div>
            </div>

            {/* Rate Timeline Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <IconHistory size={14} />
                  Rate History Timeline
                </h4>
                <span className="text-xs text-text-muted">
                  Newest effective dates listed first
                </span>
              </div>

              {isLoadingTimeline ? (
                <div className="p-6 text-center text-xs text-text-muted">
                  <span className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin inline-block mb-2" />
                  <p>Loading rate timeline...</p>
                </div>
              ) : timelineRates.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted bg-surface/30 border border-border rounded-lg">
                  No rate history recorded.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg/80 border-b border-border text-text-muted uppercase text-[11px] font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Effective Date</th>
                        <th className="py-2.5 px-3">Rate (%)</th>
                        <th className="py-2.5 px-3">State</th>
                        <th className="py-2.5 px-3">Usage</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {timelineRates.map((rate) => (
                        <tr key={rate.id} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-medium text-heading">
                            {formatDate(rate.effectiveDate)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-heading">
                            {Number(rate.taxPercent).toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={[
                                'inline-block px-2 py-0.5 rounded text-[11px] font-semibold',
                                rate.state === 'Current'
                                  ? 'bg-success/10 text-success border border-success/20'
                                  : rate.state === 'Upcoming'
                                  ? 'bg-info/10 text-info border border-info/20'
                                  : 'bg-text-muted/10 text-text-muted border border-border',
                              ].join(' ')}
                            >
                              {rate.state || 'Current'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {rate.isInUse ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
                                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                                In Use
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted">
                                <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
                                Unused
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={rate.isInUse}
                                title={rate.isInUse ? 'Cannot edit rate currently in use' : 'Edit Rate'}
                                onClick={() => handleOpenEditRate(rate)}
                                className="h-7 w-7 p-0"
                              >
                                <IconEdit size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={rate.isInUse || timelineRates.length <= 1}
                                title={
                                  rate.isInUse
                                    ? 'Cannot delete rate currently in use'
                                    : timelineRates.length <= 1
                                    ? 'Cannot delete the only rate of a tax'
                                    : 'Delete Rate'
                                }
                                onClick={() => setDeletingRate(rate)}
                                className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-danger/10"
                              >
                                <IconDelete size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Audit Details */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-bg/50 border border-border rounded-lg text-xs text-text-muted">
              <div>
                <span className="text-[11px] text-text-muted/70 block">Created</span>
                <span className="font-mono text-heading">
                  {formatDate(viewingConfig.createdOn)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-text-muted/70 block">Last Updated</span>
                <span className="font-mono text-heading">
                  {viewingConfig.lastUpdatedOn ? formatDate(viewingConfig.lastUpdatedOn) : '—'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setViewingConfig(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add / Edit Rate Modal ── */}
      <Modal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        title={editingRate ? 'Edit Tax Rate' : 'Add New Effective Rate'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveRate} className="space-y-4">
          <Input
            id="rateTaxPercent"
            name="taxPercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            label="Tax Percent (%)"
            placeholder="e.g. 18.00"
            required
            value={rateFormData.taxPercent}
            disabled={isSubmittingRate}
            onChange={(e) => {
              setRateFormData((prev) => ({ ...prev, taxPercent: e.target.value }));
              if (rateFormErrors.taxPercent) setRateFormErrors((prev) => ({ ...prev, taxPercent: '' }));
            }}
            error={rateFormErrors.taxPercent}
          />

          <DatePicker
            id="rateEffectiveDate"
            name="effectiveDate"
            label="Effective From Date"
            required
            value={rateFormData.effectiveDate}
            disabled={isSubmittingRate}
            onChange={(e) => {
              const val = typeof e === 'string' ? e : e?.target?.value ?? '';
              setRateFormData((prev) => ({ ...prev, effectiveDate: val }));
              if (rateFormErrors.effectiveDate) setRateFormErrors((prev) => ({ ...prev, effectiveDate: '' }));
            }}
            error={rateFormErrors.effectiveDate}
          />

          <p className="text-xs text-text-muted">
            The tax rate will automatically become active on orders and quotations on or after this effective date.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <CancelButton onClick={() => setIsRateModalOpen(false)} disabled={isSubmittingRate} />
            <SaveButton type="submit" loading={isSubmittingRate}>
              {editingRate ? 'Save Changes' : 'Add Rate'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── Applicable Taxes Lookup Modal ── */}
      <Modal
        isOpen={showApplicableModal}
        onClose={() => setShowApplicableModal(false)}
        title="Check Applicable Taxes as of Date"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Inspect which tax configurations and rates are effective on any selected transaction date (used by Quotations & Orders).
          </p>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <DatePicker
                id="lookupApplicableDate"
                name="applicableDate"
                label="Target Date"
                value={applicableDate}
                onChange={(e) => {
                  const val = typeof e === 'string' ? e : e?.target?.value ?? '';
                  setApplicableDate(val);
                }}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleLookupApplicable}
              loading={isLoadingApplicable}
              className="shrink-0"
            >
              <IconRefresh size={14} className="mr-1.5" />
              Check Rates
            </Button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg/80 border-b border-border text-text-muted uppercase text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Tax Name</th>
                  <th className="py-2.5 px-3">Applicable Rate</th>
                  <th className="py-2.5 px-3">Effective Since</th>
                  <th className="py-2.5 px-3 text-right">Detail ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingApplicable ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-muted">
                      <span className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin inline-block mb-1" />
                      <p>Fetching applicable taxes...</p>
                    </td>
                  </tr>
                ) : applicableList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-muted">
                      No active taxes applicable on {formatDate(applicableDate)}.
                    </td>
                  </tr>
                ) : (
                  applicableList.map((item) => (
                    <tr key={item.taxConfigDetailId || item.taxConfigId} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-semibold text-heading">
                        {item.taxName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-heading">
                        {Number(item.taxPercent).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-muted">
                        {formatDate(item.effectiveDate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                        #{item.taxConfigDetailId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setShowApplicableModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Delete Tax Modal ── */}
      <ConfirmModal
        isOpen={Boolean(deletingConfig)}
        title="Delete Tax Configuration"
        message={
          deletingConfig
            ? `Are you sure you want to delete "${deletingConfig.taxName}"? This action cannot be undone if no transactions use this tax.`
            : ''
        }
        confirmLabel="Delete Tax"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteConfig}
        onClose={() => setDeletingConfig(null)}
      />

      {/* ── Confirm Delete Rate Modal ── */}
      <ConfirmModal
        isOpen={Boolean(deletingRate)}
        title="Delete Rate Version"
        message={
          deletingRate
            ? `Are you sure you want to delete rate ${Number(deletingRate.taxPercent).toFixed(2)}% effective ${formatDate(deletingRate.effectiveDate)}?`
            : ''
        }
        confirmLabel="Delete Rate"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteRate}
        onClose={() => setDeletingRate(null)}
      />
    </div>
  );
}
