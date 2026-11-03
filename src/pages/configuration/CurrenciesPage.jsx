/**
 * CurrenciesPage.jsx — Currencies configuration page for MicroFlat ERP.
 *
 * Route: /configuration/currencies
 *
 * Requirements:
 *   - Search & status filters (matching Swagger GET /api/currencies).
 *   - TanStack DataTable with pagination & sorting.
 *   - Read-only StatusBadge in the table (no external status toggle).
 *   - Status change via PATCH /api/currencies/{id}/status inside the Create/Edit form only.
 *   - View modal with fresh data fetched from GET /api/currencies/{id}.
 *   - Mobile card view with consistent styling.
 *   - Currency Symbol quick-select chips + auto-suggestion based on code.
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
  IconCurrency,
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
import { useCurrenciesContext } from '../../context/CurrenciesContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export const COMMON_CURRENCY_PRESETS = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

const INITIAL_FORM = {
  currencyCode: '',
  currencyName: '',
  currencySymbol: '',
  isActive: true,
};

export default function CurrenciesPage() {
  const {
    currencies = [],
    isLoading,
    fetchCurrencies,
    fetchCurrencyById,
    addCurrency,
    updateCurrency,
    updateCurrencyStatus,
  } = useCurrenciesContext();

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
  const loadData = useCallback(() => {
    const params = {};
    if (debouncedSearch) {
      params.Search = debouncedSearch;
    }
    if (statusFilter === 'ACTIVE') {
      params.IsActive = true;
    } else if (statusFilter === 'INACTIVE') {
      params.IsActive = false;
    }
    fetchCurrencies(params);
  }, [debouncedSearch, statusFilter, fetchCurrencies]);

  useEffect(() => {
    loadData();
  }, [debouncedSearch, statusFilter, loadData]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [viewingCurrency, setViewingCurrency] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table pagination state (client-side)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  /* ── Form Validation ── */
  function validateField(name, value) {
    switch (name) {
      case 'currencyCode': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Currency code is required.';
        if (str.length > 10) return 'Currency code cannot exceed 10 characters.';

        // Duplicate check within loaded list
        const currentTargetId = editingCurrency?.id;
        const duplicate = currencies.find((c) => {
          if (editingCurrency && String(c.id) === String(currentTargetId)) return false;
          return c.currencyCode?.toUpperCase() === str.toUpperCase();
        });
        if (duplicate) return 'A currency with this code already exists.';
        return '';
      }
      case 'currencyName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Currency name is required.';
        if (str.length > 50) return 'Currency name cannot exceed 50 characters.';
        return '';
      }
      case 'currencySymbol': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Currency symbol is required.';
        if (str.length > 10) return 'Currency symbol cannot exceed 10 characters.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    const codeErr = validateField('currencyCode', data.currencyCode);
    if (codeErr) errors.currencyCode = codeErr;
    const nameErr = validateField('currencyName', data.currencyName);
    if (nameErr) errors.currencyName = nameErr;
    const symErr = validateField('currencySymbol', data.currencySymbol);
    if (symErr) errors.currencySymbol = symErr;
    return errors;
  }

  /* ── Modal Open / Close Handlers ── */
  function handleOpenAdd() {
    setEditingCurrency(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleOpenEdit(currency) {
    const id = currency.id;
    setEditingCurrency(currency);
    setFormData({
      currencyCode: currency.currencyCode || '',
      currencyName: currency.currencyName || '',
      currencySymbol: currency.currencySymbol || '',
      isActive: Boolean(currency.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchCurrencyById(id);
      if (fresh) {
        setEditingCurrency(fresh);
        setFormData({
          currencyCode: fresh.currencyCode || '',
          currencyName: fresh.currencyName || '',
          currencySymbol: fresh.currencySymbol || '',
          isActive: Boolean(fresh.isActive),
        });
      }
    } catch {
      // toast is handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  async function handleOpenView(currency) {
    const id = currency.id;
    setViewingCurrency(currency);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchCurrencyById(id);
      if (fresh) {
        setViewingCurrency(fresh);
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
    setEditingCurrency(null);
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
        currencyCode: formData.currencyCode.trim().toUpperCase(),
        currencyName: formData.currencyName.trim(),
        currencySymbol: formData.currencySymbol.trim(),
      };

      if (editingCurrency) {
        const id = editingCurrency.id;
        // 1. Update currency via PUT /api/currencies/{id} if details modified
        const currentCode = (editingCurrency.currencyCode || '').trim().toUpperCase();
        const currentName = (editingCurrency.currencyName || '').trim();
        const currentSym = (editingCurrency.currencySymbol || '').trim();

        if (
          currentCode !== payload.currencyCode ||
          currentName !== payload.currencyName ||
          currentSym !== payload.currencySymbol
        ) {
          await updateCurrency(id, payload);
        }

        // 2. If status was modified, update via PATCH /api/currencies/{id}/status
        if (Boolean(editingCurrency.isActive) !== Boolean(formData.isActive)) {
          await updateCurrencyStatus(id, formData.isActive);
        }
      } else {
        // 1. Create new currency via POST /api/currencies
        const created = await addCurrency(payload);
        const newId = created?.id;

        // 2. If status set to inactive during creation, update via PATCH /api/currencies/{id}/status
        if (newId && formData.isActive === false) {
          await updateCurrencyStatus(newId, false);
        }
      }

      handleCloseModal();
      loadData();
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
            {pagination.pageIndex * pagination.pageSize + row.index + 1}
          </span>
        ),
      }),
      columnHelper.accessor('currencyCode', {
        id: 'currencyCode',
        header: 'CODE',
        size: 130,
        cell: ({ row }) => (
          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading inline-block">
            {row.original.currencyCode}
          </span>
        ),
      }),
      columnHelper.accessor('currencyName', {
        id: 'currencyName',
        header: 'CURRENCY NAME',
        size: 220,
        cell: ({ row }) => (
          <span className="font-semibold text-heading text-xs">
            {row.original.currencyName}
          </span>
        ),
      }),
      columnHelper.accessor('currencySymbol', {
        id: 'currencySymbol',
        header: 'SYMBOL',
        size: 110,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-heading px-2.5 py-0.5 rounded bg-surface/80 border border-border inline-block min-w-[28px] text-center">
            {row.original.currencySymbol}
          </span>
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
            viewTitle="View Currency"
            editTitle="Edit Currency"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currencies, pagination.pageIndex, pagination.pageSize]
  );

  const table = useReactTable({
    data: currencies,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Currencies"
        icon={IconCurrency}
        subtitle="Manage international trade currencies, ISO codes, and currency symbols."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Currency
          </Button>
        }
      />

      {/* ── Search & Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by currency code or name..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="currency-status-filter"
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
        totalCount={currencies.length}
        entityName="currencies"
        emptyTitle="No currencies found"
        emptyDescription={
          hasActiveFilters
            ? 'No currencies match your active search and filter criteria.'
            : 'No currencies have been added yet.'
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
              Add Currency
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const currency = row.original;
          const recordIndex =
            pagination.pageIndex * pagination.pageSize + row.index + 1;

          return (
            <div
              key={currency.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              {/* Top Meta: Index & Status Pill */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-mono font-medium text-text-muted">
                  #{recordIndex}
                </span>
                <StatusBadge status={currency.isActive} size="sm" />
              </div>

              {/* Currency Code & Symbol Badge */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading">
                  {currency.currencyCode}
                </span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface/80 border border-border text-text-muted">
                  {currency.currencySymbol}
                </span>
              </div>

              {/* Currency Name */}
              <h3 className="text-sm font-semibold text-heading break-words leading-snug">
                {currency.currencyName}
              </h3>

              {/* Date Timestamps */}
              <div className="text-2xs text-text-muted space-y-1 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span>Created:</span>
                  <span className="font-mono tabular-nums">
                    {formatDate(currency.createdOn || currency.createdAt)}
                  </span>
                </div>
                {currency.lastUpdatedOn && (
                  <div className="flex items-center justify-between">
                    <span>Updated:</span>
                    <span className="font-mono tabular-nums">
                      {formatDate(currency.lastUpdatedOn)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenView(currency)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(currency)}
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
        title={editingCurrency ? 'Edit Currency' : 'Add New Currency'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              Refreshing currency details...
            </div>
          )}

          {/* Currency Code (with auto-suggest for symbol and name) */}
          <Input
            id="currencyCode"
            name="currencyCode"
            type="text"
            label="Currency Code"
            placeholder="e.g. USD, EUR, INR"
            maxLength={10}
            required
            value={formData.currencyCode}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setFormData((prev) => {
                const next = { ...prev, currencyCode: val };
                // Auto-suggest symbol and name if code matches known preset
                const match = COMMON_CURRENCY_PRESETS.find(
                  (p) => p.code === val.trim()
                );
                if (match) {
                  if (
                    !prev.currencySymbol ||
                    COMMON_CURRENCY_PRESETS.some((p) => p.symbol === prev.currencySymbol)
                  ) {
                    next.currencySymbol = match.symbol;
                  }
                  if (
                    !prev.currencyName ||
                    COMMON_CURRENCY_PRESETS.some((p) => p.name === prev.currencyName)
                  ) {
                    next.currencyName = match.name;
                  }
                }
                return next;
              });
              if (formErrors.currencyCode) {
                setFormErrors((prev) => ({ ...prev, currencyCode: '' }));
              }
              if (formErrors.currencySymbol) {
                setFormErrors((prev) => ({ ...prev, currencySymbol: '' }));
              }
              if (formErrors.currencyName) {
                setFormErrors((prev) => ({ ...prev, currencyName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('currencyCode', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, currencyCode: err }));
            }}
            error={formErrors.currencyCode}
            hint="Up to 10 characters, stored in uppercase"
          />

          {/* Currency Name */}
          <Input
            id="currencyName"
            name="currencyName"
            type="text"
            label="Currency Name"
            placeholder="e.g. US Dollar, Indian Rupee"
            maxLength={50}
            required
            value={formData.currencyName}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, currencyName: val }));
              if (formErrors.currencyName) {
                setFormErrors((prev) => ({ ...prev, currencyName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('currencyName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, currencyName: err }));
            }}
            error={formErrors.currencyName}
          />

          {/* Currency Symbol */}
          <Input
            id="currencySymbol"
            name="currencySymbol"
            type="text"
            label="Currency Symbol"
            placeholder="e.g. $, ₹, €, £"
            maxLength={10}
            required
            value={formData.currencySymbol}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, currencySymbol: val }));
              if (formErrors.currencySymbol) {
                setFormErrors((prev) => ({ ...prev, currencySymbol: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('currencySymbol', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, currencySymbol: err }));
            }}
            error={formErrors.currencySymbol}
          />

          {/* Quick Preset Symbol Chips */}
          <div className="space-y-1.5 -mt-2">
            <span className="text-2xs font-medium text-text-muted">
              Quick select popular symbol:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CURRENCY_PRESETS.map((preset) => {
                const isSelected = formData.currencySymbol === preset.symbol;
                return (
                  <button
                    key={`${preset.code}-${preset.symbol}`}
                    type="button"
                    disabled={isSubmitting || isFetchingDetail}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        currencySymbol: preset.symbol,
                        ...(!prev.currencyCode || COMMON_CURRENCY_PRESETS.some((p) => p.code === prev.currencyCode)
                          ? { currencyCode: preset.code }
                          : {}),
                        ...(!prev.currencyName || COMMON_CURRENCY_PRESETS.some((p) => p.name === prev.currencyName)
                          ? { currencyName: preset.name }
                          : {}),
                      }));
                      if (formErrors.currencySymbol) {
                        setFormErrors((prev) => ({ ...prev, currencySymbol: '' }));
                      }
                      if (formErrors.currencyCode) {
                        setFormErrors((prev) => ({ ...prev, currencyCode: '' }));
                      }
                      if (formErrors.currencyName) {
                        setFormErrors((prev) => ({ ...prev, currencyName: '' }));
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs'
                        : 'bg-surface hover:bg-surface/80 border-border text-text-muted hover:text-heading hover:border-text-muted/40'
                    }`}
                    title={`${preset.name} (${preset.code})`}
                  >
                    <span className="font-mono font-semibold">{preset.symbol}</span>
                    <span className="text-2xs opacity-70">({preset.code})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Switch (Active / Inactive inside form only) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set currency active or inactive
              </p>
            </div>

            <StatusSwitch
              id="currency-status-toggle"
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
              {editingCurrency ? 'Save Changes' : 'Save Currency'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Modal ── */}
      <Modal
        isOpen={Boolean(viewingCurrency)}
        onClose={() => setViewingCurrency(null)}
        title="Currency Details"
        maxWidth="max-w-md"
      >
        {viewingCurrency && (
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
                  <IconCurrency size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-heading break-words leading-snug">
                      {viewingCurrency.currencyCode}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                      {viewingCurrency.currencySymbol}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {viewingCurrency.currencyName}
                  </p>
                </div>
              </div>
              <StatusBadge status={viewingCurrency.isActive} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Currency Code
                </span>
                <span className="font-semibold text-sm text-heading font-mono">
                  {viewingCurrency.currencyCode}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Symbol
                </span>
                <span className="font-mono text-sm font-semibold text-heading">
                  {viewingCurrency.currencySymbol}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1 col-span-1 sm:col-span-2">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Currency Name
                </span>
                <span className="font-semibold text-xs text-heading">
                  {viewingCurrency.currencyName}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-xs font-medium">
                  {viewingCurrency.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Created Date
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingCurrency.createdOn || viewingCurrency.createdAt)}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1 col-span-1 sm:col-span-2">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                  Last Updated
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {viewingCurrency.lastUpdatedOn
                    ? formatDate(viewingCurrency.lastUpdatedOn)
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
                  const target = viewingCurrency;
                  setViewingCurrency(null);
                  handleOpenEdit(target);
                }}
              >
                <IconEdit size={14} className="mr-1.5" />
                Edit Currency
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingCurrency(null)}
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
