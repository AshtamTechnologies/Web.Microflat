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
  IconClose,
  IconEdit,
  IconError,
  IconPaymentTerms,
  IconSearch,
  IconView,
} from '../../constants/icons';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  IconButton,
  RichTextEditor,
  Modal,
  StatusSwitch,
  PageHeader,
  FilterBar,
  TableActions,
  DataTable,
} from '../../components/ui';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  termCode: '',
  termName: '',
  displayOrder: 1,
  description: '',
  isActive: true,
};

export default function PaymentTermsPage() {
  const {
    paymentTerms,
    isLoading,
    fetchPaymentTerms,
    fetchPaymentTermById,
    addPaymentTerm,
    updatePaymentTerm,
    updatePaymentTermStatus,
  } = usePaymentTermsContext();

  // Search & Status Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // TanStack table state for resizable columns and sorting
  const [sorting, setSorting] = useState([{ id: 'displayOrder', desc: false }]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [viewingTerm, setViewingTerm] = useState(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [isFetchingView, setIsFetchingView] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger backend API query when search or status filter changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter === 'ACTIVE') {
        params.isActive = true;
      } else if (statusFilter === 'INACTIVE') {
        params.isActive = false;
      }
      fetchPaymentTerms(params);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, fetchPaymentTerms]);

  /* ── Form Validation ── */
  function isRichTextEmpty(val) {
    if (!val) return true;
    const str = typeof val === 'string' ? val : (val?.target?.value ?? '');
    const stripped = str.replace(/<[^>]*>/g, '').trim();
    return stripped.length === 0;
  }

  function validateField(name, value) {
    const targetId = editingTerm?.id ?? editingTerm?.paymentTermId;

    switch (name) {
      case 'termCode': {
        const str = typeof value === 'string' ? value.trim().toUpperCase() : '';
        if (!str) return 'Term code is required.';
        if (str.length > 20) return 'Term code cannot exceed 20 characters.';
        if (!/^[A-Z0-9-]+$/.test(str)) {
          return 'Code must contain uppercase letters, numbers, and hyphens only.';
        }

        // Check unique code (case-insensitive)
        const duplicate = paymentTerms.find((pt) => {
          const currentId = pt.id ?? pt.paymentTermId;
          if (editingTerm && String(currentId) === String(targetId)) return false;
          return pt.termCode.toUpperCase() === str;
        });
        if (duplicate) return 'A payment term with this code already exists.';
        return '';
      }
      case 'termName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Term name is required.';
        if (str.length > 100) return 'Term name cannot exceed 100 characters.';
        return '';
      }
      case 'displayOrder': {
        if (value === '' || value === null || value === undefined) {
          return 'Display order is required.';
        }
        const num = Number(value);
        if (isNaN(num) || num < 1) {
          return 'Display order must be a positive integer.';
        }
        return '';
      }
      case 'description': {
        if (isRichTextEmpty(value)) {
          return 'Description is required.';
        }
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    ['termCode', 'termName', 'displayOrder', 'description'].forEach((field) => {
      const err = validateField(field, data[field]);
      if (err) errors[field] = err;
    });
    return errors;
  }

  /* ── Modal Open Handlers ── */
  function handleOpenAdd() {
    const maxOrder = paymentTerms.reduce(
      (max, pt) => Math.max(max, Number(pt.displayOrder) || 0),
      0
    );
    setEditingTerm(null);
    setFormData({
      ...INITIAL_FORM,
      displayOrder: maxOrder + 1,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  /**
   * Fetches fresh payment term details by ID via GET /api/payment-terms/{id} and populates Edit form
   */
  async function handleOpenEdit(term) {
    const id = term.id ?? term.paymentTermId;
    setEditingTerm(term);
    setFormData({
      termCode: term.termCode || '',
      termName: term.termName || '',
      displayOrder: term.displayOrder !== undefined ? term.displayOrder : 1,
      description: term.description || '',
      isActive: Boolean(term.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchPaymentTermById(id);
      if (fresh) {
        setEditingTerm(fresh);
        setFormData({
          termCode: fresh.termCode || '',
          termName: fresh.termName || '',
          displayOrder: fresh.displayOrder !== undefined ? fresh.displayOrder : 1,
          description: fresh.description || '',
          isActive: Boolean(fresh.isActive),
        });
      }
    } catch {
      // Toast notification is handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  /**
   * Fetches fresh payment term details by ID via GET /api/payment-terms/{id} and opens View modal
   */
  async function handleOpenView(term) {
    const id = term.id ?? term.paymentTermId;
    setViewingTerm(term);
    setIsFetchingView(true);

    try {
      const fresh = await fetchPaymentTermById(id);
      if (fresh) {
        setViewingTerm(fresh);
      }
    } catch {
      // Toast notification is handled in context
    } finally {
      setIsFetchingView(false);
    }
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingTerm(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  }

  async function handleFormSubmit(e) {
    if (e) e.preventDefault();
    const cleanDescription =
      typeof formData.description === 'string'
        ? formData.description
        : (formData.description?.target?.value ?? '');

    const normalizedData = {
      termCode: formData.termCode.trim().toUpperCase(),
      termName: formData.termName.trim(),
      displayOrder: Number(formData.displayOrder) || 1,
      description: cleanDescription,
    };

    const errors = validateAll(normalizedData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTerm) {
        const id = editingTerm.id ?? editingTerm.paymentTermId;
        await updatePaymentTerm(id, normalizedData);
        // If status was toggled in edit modal, call PATCH /api/payment-terms/{id}/status
        if (formData.isActive !== editingTerm.isActive) {
          await updatePaymentTermStatus(id, formData.isActive);
        }
      } else {
        const created = await addPaymentTerm(normalizedData);
        if (created && formData.isActive === false) {
          const newId = created.id ?? created.paymentTermId;
          await updatePaymentTermStatus(newId, false);
        }
      }
      setIsModalOpen(false);
      setEditingTerm(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      // Toast is handled in context
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Filtered Data (Fallback in-memory filter) ── */
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return paymentTerms.filter((term) => {
      const matchesSearch =
        !q ||
        (term.termCode && term.termCode.toLowerCase().includes(q)) ||
        (term.termName && term.termName.toLowerCase().includes(q)) ||
        (term.description && term.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && term.isActive) ||
        (statusFilter === 'INACTIVE' && !term.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [paymentTerms, searchQuery, statusFilter]);

  /* ── TanStack Columns ── */
  const columns = useMemo(
    () => [
      /* 1. TERM CODE */
      columnHelper.accessor('termCode', {
        id: 'termCode',
        header: 'TERM CODE',
        size: 160,
        minSize: 130,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconPaymentTerms size={15} />
            </div>
            <button
              type="button"
              onClick={() => handleOpenView(row.original)}
              className="font-mono text-xs font-bold text-primary hover:underline cursor-pointer text-left truncate"
            >
              {row.original.termCode}
            </button>
          </div>
        ),
      }),
      /* 2. TERM NAME */
      columnHelper.accessor('termName', {
        id: 'termName',
        header: 'TERM NAME',
        size: 200,
        minSize: 150,
        cell: ({ row }) => {
          const term = row.original;
          return (
            <span
              className={`text-sm font-semibold truncate ${
                term.isActive ? 'text-heading' : 'text-text-muted line-through'
              }`}
            >
              {term.termName || '—'}
            </span>
          );
        },
      }),
      /* 3. DISPLAY ORDER */
      columnHelper.accessor('displayOrder', {
        id: 'displayOrder',
        header: 'ORDER',
        size: 90,
        minSize: 80,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            #{row.original.displayOrder ?? '—'}
          </span>
        ),
      }),
      /* 4. DESCRIPTION */
      columnHelper.accessor('description', {
        id: 'description',
        header: 'PAYMENT TERMS / DESCRIPTION',
        size: 360,
        minSize: 220,
        cell: ({ row }) => {
          const desc = row.original.description || '';
          const isHtml = /<[a-z][\s\S]*>/i.test(desc);
          if (isHtml) {
            return (
              <div
                className="text-xs text-text max-h-24 overflow-y-auto pr-1 prose prose-xs max-w-none leading-relaxed [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5"
                dangerouslySetInnerHTML={{
                  __html: desc,
                }}
              />
            );
          }
          return (
            <p className="text-xs text-text whitespace-pre-line line-clamp-3 leading-relaxed" title={desc}>
              {desc || <span className="text-text-muted italic">No terms specified</span>}
            </p>
          );
        },
      }),
      /* 5. STATUS (Badge only — matching RegionsPage) */
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 130,
        minSize: 110,
        cell: ({ row }) => {
          const isActive = Boolean(row.original.isActive);
          return (
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none',
                isActive
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isActive ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        },
      }),
      /* 6. CREATED ON */
      columnHelper.accessor('createdOn', {
        id: 'createdOn',
        header: 'CREATED ON',
        size: 140,
        minSize: 120,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {formatDate(row.original.createdOn || row.original.createdAt)}
          </span>
        ),
      }),
      /* 7. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 100,
        minSize: 90,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <TableActions
            onView={() => handleOpenView(row.original)}
            onEdit={() => handleOpenEdit(row.original)}
            viewTitle="View Payment Term"
            editTitle="Edit Payment Term"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paymentTerms]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Payment Terms"
        icon={IconPaymentTerms}
        subtitle="Configure commercial invoice credit periods, milestone disbursement conditions, and default customer payment rules."
        actions={
          <Button
            id="btn-add-payment-term"
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Payment Term
          </Button>
        }
      />

      {/* ── Search & Status Filter Toolbar ── */}
      <FilterBar>
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Input
            id="search-payment-terms"
            type="text"
            placeholder="Search by code, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<IconSearch size={15} />}
            rightElement={
              searchQuery ? (
                <IconButton
                  icon={IconClose}
                  size="sm"
                  variant="ghost"
                  title="Clear search"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                />
              ) : null
            }
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center p-1 bg-surface rounded-lg border border-border self-start sm:self-auto">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${
                statusFilter === status
                  ? 'bg-bg text-heading shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {status.toLowerCase()}
            </button>
          ))}
        </div>
      </FilterBar>

      {/* ── Centralized DataTable ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={filteredData.length}
        entityName="payment terms"
        emptyTitle="No payment terms found"
        emptyDescription={
          searchQuery || statusFilter !== 'ALL'
            ? 'Try resetting your search or status filter.'
            : 'Click "+ Add Payment Term" to configure commercial terms.'
        }
        emptyAction={
          searchQuery || statusFilter !== 'ALL' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
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
              Add Payment Term
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const term = row.original;
          const id = term.id ?? term.paymentTermId;
          return (
            <div
              key={id}
              className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleOpenView(term)}
                    className="font-mono text-xs font-bold text-primary hover:underline text-left cursor-pointer"
                  >
                    {term.termCode}
                  </button>
                  {term.termName && (
                    <h3
                      className={`text-sm font-semibold ${
                        term.isActive
                          ? 'text-heading'
                          : 'text-text-muted line-through'
                      }`}
                    >
                      {term.termName}
                    </h3>
                  )}
                </div>

                {/* Badge only */}
                <span
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 select-none',
                    term.isActive
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-danger/10 text-danger border border-danger/20',
                  ].join(' ')}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      term.isActive ? 'bg-success' : 'bg-danger'
                    }`}
                    aria-hidden="true"
                  />
                  {term.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-2xs text-text-muted">
                <span className="font-mono bg-surface px-1.5 py-0.5 rounded border border-border">
                  Order: #{term.displayOrder ?? '—'}
                </span>
              </div>

              {term.description && (
                <div className="text-xs text-text-muted bg-surface/30 p-2.5 rounded-lg border border-border/50 line-clamp-2">
                  {term.description.replace(/<[^>]*>/g, '')}
                </div>
              )}

              <div className="flex items-center justify-between text-2xs text-text-muted pt-2 border-t border-border">
                <span className="font-mono">
                  Created: {formatDate(term.createdOn || term.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenView(term)}
                    className="text-xs"
                  >
                    <IconView size={13} className="mr-1.5" />
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEdit(term)}
                    className="text-xs"
                  >
                    <IconEdit size={13} className="mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          );
        }}
      />

      {/* ── Add / Edit Payment Term Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTerm ? 'Edit Payment Term' : 'Add New Payment Term'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              Loading latest details...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Term Code */}
            <Input
              id="termCode"
              name="termCode"
              type="text"
              label="Term Code"
              placeholder="e.g. 100-ADV, 30-DAYS, 50-50"
              required
              value={formData.termCode}
              disabled={isSubmitting || isFetchingDetail}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setFormData((prev) => ({ ...prev, termCode: val }));
                if (formErrors.termCode) {
                  setFormErrors((prev) => ({ ...prev, termCode: '' }));
                }
              }}
              onBlur={(e) => {
                const err = validateField('termCode', e.target.value);
                if (err) setFormErrors((prev) => ({ ...prev, termCode: err }));
              }}
              error={formErrors.termCode}
              helperText="Uppercase letters, numbers, and hyphens only (max 20)."
            />

            {/* Display Order */}
            <Input
              id="displayOrder"
              name="displayOrder"
              type="number"
              min={1}
              step={1}
              label="Display Order"
              placeholder="e.g. 1, 2, 3"
              required
              value={formData.displayOrder}
              disabled={isSubmitting || isFetchingDetail}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, displayOrder: val }));
                if (formErrors.displayOrder) {
                  setFormErrors((prev) => ({ ...prev, displayOrder: '' }));
                }
              }}
              onBlur={(e) => {
                const err = validateField('displayOrder', e.target.value);
                if (err) {
                  setFormErrors((prev) => ({ ...prev, displayOrder: err }));
                }
              }}
              error={formErrors.displayOrder}
              helperText="Sequence priority in selection dropdowns."
            />
          </div>

          {/* Term Name */}
          <Input
            id="termName"
            name="termName"
            type="text"
            label="Term Name"
            placeholder="e.g. 100% Advance with Purchase Order, 30 Days Net Credit"
            required
            value={formData.termName}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, termName: val }));
              if (formErrors.termName) {
                setFormErrors((prev) => ({ ...prev, termName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('termName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, termName: err }));
            }}
            error={formErrors.termName}
          />

          {/* Rich Text Editor for Description */}
          <div>
            <label className="mf-label block mb-1">
              Payment Terms & Commercial Conditions <span className="text-danger">*</span>
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, description: val }));
                if (formErrors.description) {
                  setFormErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              placeholder="Enter comprehensive payment condition clauses, milestones, bank guarantee terms..."
              minHeight="140px"
              disabled={isSubmitting || isFetchingDetail}
            />
            {formErrors.description && (
              <p className="mf-error mt-1 flex items-center gap-1 text-xs text-danger">
                <IconError size={12} />
                {formErrors.description}
              </p>
            )}
            <p className="text-xs text-text-muted mt-1">
              Use bold, lists, and numbers for multi-stage disbursement structures.
            </p>
          </div>

          {/* Status Switch (Active / Inactive) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set payment term active or inactive for new quotations and orders
              </p>
            </div>

            <StatusSwitch
              id="payment-term-status-toggle"
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
              {editingTerm ? 'Save Changes' : 'Save Payment Term'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Payment Term Modal ── */}
      <Modal
        isOpen={Boolean(viewingTerm)}
        onClose={() => setViewingTerm(null)}
        title="Payment Term Details"
        maxWidth="max-w-xl"
      >
        {viewingTerm && (
          <div className="space-y-4">
            {isFetchingView && (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
                <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
                Refreshing details from server...
              </div>
            )}

            {/* Header banner */}
            <div className="p-4 rounded-xl bg-surface/50 border border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <IconPaymentTerms size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface border border-border text-primary">
                      {viewingTerm.termCode}
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      Order: #{viewingTerm.displayOrder ?? '—'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-heading break-words leading-snug mt-1">
                    {viewingTerm.termName}
                  </h3>
                </div>
              </div>
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none shrink-0 mt-0.5',
                  viewingTerm.isActive
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20',
                ].join(' ')}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    viewingTerm.isActive ? 'bg-success' : 'bg-danger'
                  }`}
                  aria-hidden="true"
                />
                {viewingTerm.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="view-field-label mf-detail-label">
                  Terms & Conditions
                </span>
                <div className="text-xs text-heading leading-relaxed prose prose-xs max-w-none pt-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4">
                  {/<[a-z][\s\S]*>/i.test(viewingTerm.description || '') ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: viewingTerm.description,
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-line">
                      {viewingTerm.description || 'No detailed conditions specified.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">
                    Created Date
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {formatDate(viewingTerm.createdOn || viewingTerm.createdAt)}
                  </span>
                </div>

                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">
                    Last Updated
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {viewingTerm.lastUpdatedOn
                      ? formatDate(viewingTerm.lastUpdatedOn)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <CancelButton
                onClick={() => setViewingTerm(null)}
                className="justify-center"
              >
                Close
              </CancelButton>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  const term = viewingTerm;
                  setViewingTerm(null);
                  handleOpenEdit(term);
                }}
                className="justify-center font-semibold shadow-2xs"
              >
                <IconEdit
                  size={15}
                  className="mr-1.5 shrink-0"
                  aria-hidden="true"
                />
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
