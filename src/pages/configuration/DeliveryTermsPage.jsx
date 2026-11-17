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
  IconDeliveryTerms,
  IconCheck,
} from '../../constants/icons';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  RichTextEditor,
  Modal,
  StatusSwitch,
  StatusBadge,
  PageHeader,
  TableToolbar,
  TableActions,
  DataTable,
  SearchableSelect,
  Badge,
  Card,
  Checkbox,
} from '../../components/ui';
import { useDeliveryTermsContext } from '../../context/DeliveryTermsContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const INITIAL_FORM = {
  termCode: '',
  termName: '',
  displayOrder: 1,
  isDefault: false,
  description: '',
  isActive: true,
};

export default function DeliveryTermsPage() {
  const {
    deliveryTerms,
    isLoading,
    fetchDeliveryTerms,
    fetchDeliveryTermById,
    addDeliveryTerm,
    updateDeliveryTerm,
    updateDeliveryTermStatus,
  } = useDeliveryTermsContext();

  // Search & Status Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // TanStack table state
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

  // Debounced search / filter query
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
      fetchDeliveryTerms(params);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, fetchDeliveryTerms]);

  /* ── Form Validation ── */
  function isRichTextEmpty(val) {
    if (!val) return true;
    const str = typeof val === 'string' ? val : (val?.target?.value ?? '');
    const stripped = str.replace(/<[^>]*>/g, '').trim();
    return stripped.length === 0;
  }

  function validateField(name, value) {
    const targetId = editingTerm?.id ?? editingTerm?.deliveryTermId;

    switch (name) {
      case 'termCode': {
        const str = typeof value === 'string' ? value.trim().toUpperCase() : '';
        if (!str) return 'Term code is required.';
        if (str.length > 20) return 'Term code cannot exceed 20 characters.';
        if (!/^[A-Z0-9_-]+$/.test(str)) {
          return 'Code must contain uppercase letters, numbers, underscores or hyphens only.';
        }

        // Check unique code (case-insensitive)
        const duplicate = deliveryTerms.find((dt) => {
          const currentId = dt.id ?? dt.deliveryTermId;
          if (editingTerm && String(currentId) === String(targetId)) return false;
          return dt.termCode.toUpperCase() === str;
        });
        if (duplicate) return 'A delivery term with this code already exists.';
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
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    ['termCode', 'termName', 'displayOrder'].forEach((field) => {
      const err = validateField(field, data[field]);
      if (err) errors[field] = err;
    });
    return errors;
  }

  /* ── Modal Open Handlers ── */
  function handleOpenAdd() {
    const maxOrder = deliveryTerms.reduce(
      (max, dt) => Math.max(max, Number(dt.displayOrder) || 0),
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

  async function handleOpenEdit(term) {
    const id = term.id ?? term.deliveryTermId;
    setEditingTerm(term);
    setFormData({
      termCode: term.termCode || '',
      termName: term.termName || '',
      displayOrder: term.displayOrder !== undefined ? term.displayOrder : 1,
      isDefault: Boolean(term.isDefault),
      description: term.description || '',
      isActive: Boolean(term.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchDeliveryTermById(id);
      if (fresh) {
        setEditingTerm(fresh);
        setFormData({
          termCode: fresh.termCode || '',
          termName: fresh.termName || '',
          displayOrder: fresh.displayOrder !== undefined ? fresh.displayOrder : 1,
          isDefault: Boolean(fresh.isDefault),
          description: fresh.description || '',
          isActive: Boolean(fresh.isActive),
        });
      }
    } catch {
      // Handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  async function handleOpenView(term) {
    const id = term.id ?? term.deliveryTermId;
    setViewingTerm(term);
    setIsFetchingView(true);

    try {
      const fresh = await fetchDeliveryTermById(id);
      if (fresh) {
        setViewingTerm(fresh);
      }
    } catch {
      // Handled in context
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
      isDefault: Boolean(formData.isDefault),
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
        const id = editingTerm.id ?? editingTerm.deliveryTermId;
        await updateDeliveryTerm(id, normalizedData);
        if (formData.isActive !== editingTerm.isActive) {
          await updateDeliveryTermStatus(id, formData.isActive);
        }
      } else {
        const created = await addDeliveryTerm(normalizedData);
        if (created && formData.isActive === false) {
          const newId = created.id ?? created.deliveryTermId;
          await updateDeliveryTermStatus(newId, false);
        }
      }
      setIsModalOpen(false);
      setEditingTerm(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Filtered Data ── */
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return deliveryTerms.filter((term) => {
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
  }, [deliveryTerms, searchQuery, statusFilter]);

  /* ── TanStack Columns ── */
  const columns = useMemo(
    () => [
      /* 1. TERM CODE */
      columnHelper.accessor('termCode', {
        id: 'termCode',
        header: 'TERM CODE',
        size: 150,
        minSize: 120,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconDeliveryTerms size={15} />
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
            <div className="space-y-0.5">
              <span
                className={`text-xs font-semibold truncate block ${
                  term.isActive ? 'text-heading' : 'text-text-muted line-through'
                }`}
              >
                {term.termName || '—'}
              </span>
            </div>
          );
        },
      }),
      /* 3. DEFAULT */
      columnHelper.accessor('isDefault', {
        id: 'isDefault',
        header: 'DEFAULT',
        size: 110,
        cell: ({ row }) => {
          const isDef = row.original.isDefault;
          return isDef ? (
            <Badge variant="success" size="xs">
              <IconCheck size={11} className="mr-1" />
              Default
            </Badge>
          ) : (
            <span className="text-text-muted text-xs">—</span>
          );
        },
      }),
      /* 4. DISPLAY ORDER */
      columnHelper.accessor('displayOrder', {
        id: 'displayOrder',
        header: 'ORDER',
        size: 90,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-text px-2 py-0.5 rounded bg-surface border border-border">
            {row.original.displayOrder ?? 1}
          </span>
        ),
      }),
      /* 5. DESCRIPTION */
      columnHelper.accessor('description', {
        id: 'description',
        header: 'DESCRIPTION',
        size: 320,
        cell: ({ row }) => {
          const raw = row.original.description || '';
          const stripped = raw.replace(/<[^>]*>/g, '').trim();
          return (
            <p className="text-2xs text-text-muted line-clamp-1 max-w-sm" title={stripped}>
              {stripped || '—'}
            </p>
          );
        },
      }),
      /* 6. STATUS */
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 120,
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive} size="sm" />
        ),
      }),
      /* 7. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 110,
        cell: ({ row }) => {
          const term = row.original;
          return (
            <TableActions
              onView={() => handleOpenView(term)}
              onEdit={() => handleOpenEdit(term)}
              viewTooltip="View term details"
              editTooltip="Edit delivery term"
            />
          );
        },
      }),
    ],
    [deliveryTerms, updateDeliveryTermStatus]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
  });

  /* ── Mobile Stacked Cards (renderMobileCard) ── */
  const renderMobileCard = (row) => {
    const term = row.original;
    const id = term.id ?? term.deliveryTermId;
    const strippedDesc = (term.description || '').replace(/<[^>]*>/g, '').trim();

    return (
      <Card key={id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {term.termCode}
            </span>
            {term.isDefault && (
              <Badge variant="success" size="xs">
                Default
              </Badge>
            )}
          </div>
          <StatusBadge status={term.isActive} size="sm" />
        </div>

        <div>
          <h4
            className="text-xs font-semibold text-heading hover:text-primary cursor-pointer"
            onClick={() => handleOpenView(term)}
          >
            {term.termName}
          </h4>
          {strippedDesc && (
            <p className="text-2xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
              {strippedDesc}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-2xs">
          <span className="text-text-muted">
            Order: <span className="font-mono font-semibold text-text">{term.displayOrder}</span>
          </span>

          <TableActions
            onView={() => handleOpenView(term)}
            onEdit={() => handleOpenEdit(term)}
            viewTooltip="View term details"
            editTooltip="Edit delivery term"
          />
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Delivery Terms"
        subtitle="Manage standard commercial Incoterms and delivery clauses for Quotations and Sales Orders."
        icon={<IconDeliveryTerms className="text-primary" />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            icon={<IconAdd size={16} />}
          >
            Add Delivery Term
          </Button>
        }
      />

      {/* ── Table Toolbar (Search + Status Filter) ── */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by code, term name, description…"
        hasActiveFilters={Boolean(searchQuery.trim() || statusFilter !== 'ALL')}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
        resetLabel="Reset Filters"
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="filter-delivery-status"
            placeholder="All Statuses"
            searchPlaceholder="Search status…"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </TableToolbar>

      {/* ── Main Data Table ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={filteredData.length}
        entityName="delivery terms"
        emptyTitle="No delivery terms found"
        emptyDescription="Create commercial shipping and delivery terms (e.g. EXW, FOB, CIF) to use across the ERP."
        renderMobileCard={renderMobileCard}
      />

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTerm ? 'Edit Delivery Term' : 'Add Delivery Term'}
        subtitle={
          editingTerm
            ? `Update delivery term ${editingTerm.termCode}`
            : 'Create a new Incoterm or shipping condition.'
        }
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <CancelButton onClick={handleCloseModal} disabled={isSubmitting} size="sm" />
            <SaveButton
              onClick={handleFormSubmit}
              loading={isSubmitting}
              size="sm"
              label={editingTerm ? 'Save Changes' : 'Create Term'}
            />
          </div>
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 py-1 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Term Code */}
            <div>
              <Input
                label="Term Code"
                placeholder="e.g. EXW, FOB, CIF"
                value={formData.termCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData((prev) => ({ ...prev, termCode: val }));
                  setFormErrors((prev) => ({ ...prev, termCode: validateField('termCode', val) }));
                }}
                error={formErrors.termCode}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Term Name */}
            <div>
              <Input
                label="Term Name"
                placeholder="e.g. Ex-Works, Free On Board"
                value={formData.termName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, termName: val }));
                  setFormErrors((prev) => ({ ...prev, termName: validateField('termName', val) }));
                }}
                error={formErrors.termName}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Display Order */}
            <div>
              <Input
                type="number"
                min="1"
                step="1"
                label="Display Order"
                placeholder="1"
                value={formData.displayOrder}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, displayOrder: val }));
                  setFormErrors((prev) => ({
                    ...prev,
                    displayOrder: validateField('displayOrder', val),
                  }));
                }}
                error={formErrors.displayOrder}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Set As Default */}
            <div className="space-y-1 sm:pt-6">
              <Checkbox
                id="delivery-term-default-checkbox"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
                }
                disabled={isSubmitting || !formData.isActive}
                label={
                  <span className="text-xs font-semibold text-heading">
                    Set as Default Term
                  </span>
                }
              />
              <p className="text-xs text-text-muted pl-6">
                Default terms automatically pre-populate on new Quotations & Orders.
              </p>
            </div>
          </div>

          {/* Description / Delivery Clause */}
          <div>
            <label className="block text-xs font-medium text-heading mb-1.5">
              Description / Delivery Clause
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(content) => setFormData((prev) => ({ ...prev, description: content }))}
              placeholder="Enter standard delivery clause, transport conditions, and freight terms…"
              minHeight="140px"
              disabled={isSubmitting}
            />
          </div>

          {/* Status Switch (Active / Inactive) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set delivery term active or inactive for new quotations and orders
              </p>
            </div>

            <StatusSwitch
              id="delivery-term-status-toggle"
              checked={formData.isActive}
              disabled={isSubmitting || isFetchingDetail}
              onChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  isActive: checked,
                  isDefault: checked ? prev.isDefault : false,
                }))
              }
            />
          </div>
        </form>
      </Modal>

      {/* ── View Details Modal ── */}
      <Modal
        isOpen={Boolean(viewingTerm)}
        onClose={() => setViewingTerm(null)}
        title={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {viewingTerm?.termCode}
            </span>
            <span>Delivery Term Details</span>
          </div>
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setViewingTerm(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const term = viewingTerm;
                setViewingTerm(null);
                handleOpenEdit(term);
              }}
            >
              Edit Term
            </Button>
          </div>
        }
      >
        {viewingTerm && (
          <div className="space-y-4 py-1 text-left text-xs">
            <div>
              <span className="text-3xs font-semibold uppercase text-text-muted">Term Name</span>
              <h3 className="text-sm font-bold text-heading mt-0.5">{viewingTerm.termName}</h3>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-surface border border-border">
              <div>
                <span className="text-3xs font-semibold uppercase text-text-muted">Order</span>
                <p className="font-mono font-semibold text-heading mt-0.5">
                  {viewingTerm.displayOrder ?? 1}
                </p>
              </div>

              <div>
                <span className="text-3xs font-semibold uppercase text-text-muted">Default</span>
                <div className="mt-0.5">
                  {viewingTerm.isDefault ? (
                    <Badge variant="success" size="xs">
                      Default
                    </Badge>
                  ) : (
                    <span className="text-text-muted">No</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-3xs font-semibold uppercase text-text-muted">Status</span>
                <div className="mt-0.5">
                  <Badge variant={viewingTerm.isActive ? 'success' : 'outline'} size="xs">
                    {viewingTerm.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <span className="text-3xs font-semibold uppercase text-text-muted block mb-1.5">
                Delivery Clause / Description
              </span>
              <div
                className="p-3.5 rounded-lg bg-surface/50 border border-border leading-relaxed prose prose-sm max-w-none text-text"
                dangerouslySetInnerHTML={{
                  __html: viewingTerm.description || '<p class="text-text-muted">No description provided.</p>',
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

