import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  HandCoins,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Input,
  RichTextEditor,
  Toggle,
  Modal,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
  StatusSwitch,
} from '../../components/ui';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  termCode: '',
  description: '',
  isActive: true,
};

export default function PaymentTermsPage() {
  const {
    paymentTerms,
    addPaymentTerm,
    updatePaymentTerm,
    deletePaymentTerm,
    togglePaymentTermActive,
  } = usePaymentTermsContext();

  // Simulated initial loading delay
  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter and Search Toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // TanStack table state for resizable columns and sorting
  const [sorting, setSorting] = useState([{ id: 'termCode', desc: false }]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [termToDelete, setTermToDelete] = useState(null);

  /* ── Form Validation ── */
  function isRichTextEmpty(val) {
    if (!val) return true;
    const str = typeof val === 'string' ? val : (val?.target?.value ?? '');
    const stripped = str.replace(/<[^>]*>/g, '').trim();
    return stripped.length === 0;
  }

  function validateField(name, value) {
    const targetId = editingTerm?.paymentTermId || editingTerm?.id;

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
          const currentId = pt.paymentTermId || pt.id;
          if (editingTerm && currentId === targetId) return false;
          return pt.termCode.toUpperCase() === str;
        });
        if (duplicate) return 'A payment term with this code already exists.';
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
    ['termCode', 'description'].forEach((field) => {
      const err = validateField(field, data[field]);
      if (err) errors[field] = err;
    });
    return errors;
  }

  /* ── Modal Open Handlers ── */
  function handleOpenAdd() {
    setEditingTerm(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleOpenEdit(term) {
    setEditingTerm(term);
    setFormData({
      termCode: term.termCode || '',
      description: term.description || '',
      isActive: Boolean(term.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
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
      ...formData,
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
        const id = editingTerm.paymentTermId || editingTerm.id;
        await updatePaymentTerm(id, normalizedData);
      } else {
        await addPaymentTerm(normalizedData);
      }
      setIsModalOpen(false);
      setEditingTerm(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      toast.error('Failed to save payment term.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Delete Handlers ── */
  function handleDeleteClick(term) {
    // Usage check placeholder:
    // When Purchase Orders, Inquiries, or Vendor contracts start referencing payment terms,
    // verify here if any record uses this paymentTermId and block with toast.error(...).
    setTermToDelete(term);
  }

  function handleConfirmDelete() {
    if (!termToDelete) return;
    const id = termToDelete.paymentTermId || termToDelete.id;
    deletePaymentTerm(id);
    setTermToDelete(null);
  }

  /* ── Filtered Data Computation ── */
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return paymentTerms.filter((term) => {
      const matchesSearch =
        !q ||
        term.termCode.toLowerCase().includes(q) ||
        (term.description && term.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && term.isActive) ||
        (statusFilter === 'INACTIVE' && !term.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [paymentTerms, searchQuery, statusFilter]);

  /* ── TanStack Columns with Resizing and Sorting ── */
  /* ── TanStack Columns with Resizing and Sorting ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('termCode', {
        id: 'termCode',
        header: 'Code',
        size: 130,
        minSize: 110,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums font-semibold text-xs text-heading bg-surface border border-border px-2 py-0.5 rounded-md shadow-2xs">
            {row.original.termCode}
          </span>
        ),
      }),
      columnHelper.accessor('description', {
        id: 'description',
        header: 'Payment Terms / Description',
        size: 460,
        minSize: 260,
        cell: ({ row }) => {
          const desc = row.original.description || '';
          return (
            <div
              className="text-xs text-text max-h-24 overflow-y-auto pr-1 prose prose-xs max-w-none leading-relaxed [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5"
              dangerouslySetInnerHTML={{
                __html: desc || '<span class="text-text-muted italic">No terms specified</span>',
              }}
            />
          );
        },
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'Status',
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
      columnHelper.accessor('createdOn', {
        id: 'createdOn',
        header: 'Created Date',
        size: 130,
        minSize: 110,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {formatDate(row.original.createdOn)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        size: 110,
        minSize: 100,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => handleOpenEdit(row.original)}
              className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
              title="Edit payment term"
              aria-label="Edit payment term"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteClick(row.original)}
              className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all cursor-pointer shadow-2xs"
              title="Delete payment term"
              aria-label="Delete payment term"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      }),
    ],
    []
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
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <HandCoins className="h-6 w-6 text-primary" aria-hidden="true" />
            Payment Terms
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Configure commercial payment credit periods, due day thresholds & billing agreements for purchase and sales contracts.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          className="self-start sm:self-auto shrink-0 shadow-xs"
        >
          <Plus size={16} className="mr-1.5" />
          Add Payment Term
        </Button>
      </div>

      {/* ── Toolbar: Search & Status Filters ── */}
      <Card padding="sm" className="bg-bg">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-bg border border-border rounded-lg text-text placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={14} />
              </button>
            )}
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
        </div>
      </Card>

      {/* ── Desktop View (md+): Data Table ── */}
      <div className="hidden md:block rounded-xl border border-border bg-bg overflow-hidden shadow-2xs">
        <TableContainer
          tableStyle={{
            width: '100%',
            minWidth: `${table.getCenterTotalSize()}px`,
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
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
                    >
                      <div
                        className={`flex items-center gap-1.5 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                        {header.column.getCanSort() && (
                          <span className="text-text-muted/60 transition-opacity">
                            {isSorted === 'asc' ? (
                              <ArrowUp size={13} className="text-primary" />
                            ) : isSorted === 'desc' ? (
                              <ArrowDown size={13} className="text-primary" />
                            ) : (
                              <ArrowUpDown
                                size={12}
                                className="opacity-0 group-hover/th:opacity-100"
                              />
                            )}
                          </span>
                        )}
                      </div>
                    </Th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-border bg-bg">
            {initialLoading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <Td><div className="h-4 bg-surface rounded w-20" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-44" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-24" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-64" /></Td>
                  <Td><div className="h-5 bg-surface rounded w-16" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-24" /></Td>
                  <Td className="text-right"><div className="h-7 bg-surface rounded w-20 ml-auto" /></Td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface/50 transition-colors duration-100"
                >
                  {row.getVisibleCells().map((cell) => (
                    <Td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </Td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-text-muted text-sm"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <HandCoins size={32} className="text-text-muted/50" />
                    <p className="font-semibold text-heading">
                      No payment terms match your search
                    </p>
                    <p className="text-xs">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try clearing your search query or status filter.'
                        : 'Click "+ Add Payment Term" to configure credit terms.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </TableContainer>
      </div>

      {/* ── Mobile Card View (< md) ── */}
      <div className="block md:hidden space-y-3">
        {initialLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`m-skel-${i}`}
              className="bg-bg border border-border rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-surface rounded w-24" />
                <div className="h-5 bg-surface rounded w-16" />
              </div>
              <div className="h-4 bg-surface rounded w-3/4" />
              <div className="h-8 bg-surface rounded w-full" />
            </div>
          ))
        ) : filteredData.length > 0 ? (
          filteredData.map((term) => {
            const id = term.paymentTermId || term.id;
            return (
              <div
                key={id}
                className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono tabular-nums font-semibold text-xs text-heading bg-surface border border-border px-2 py-0.5 rounded-md shadow-2xs">
                    {term.termCode}
                  </span>

                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium select-none',
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

                {term.description && (
                  <div
                    className="text-xs text-text max-h-24 overflow-y-auto prose prose-xs max-w-none [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5"
                    dangerouslySetInnerHTML={{ __html: term.description }}
                  />
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-muted">
                  <span className="font-mono tabular-nums">{formatDate(term.createdOn)}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(term)}
                      className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                      title="Edit payment term"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(term)}
                      className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all cursor-pointer"
                      title="Delete payment term"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-bg border border-border rounded-xl p-8 text-center text-text-muted">
            <HandCoins size={28} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-sm">
              No payment terms found
            </p>
            <p className="text-xs mt-1">
              Try adjusting your filters or create a new payment term.
            </p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Payment Term Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTerm ? 'Edit Payment Term' : 'Add New Payment Term'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Term Code */}
          <Input
            id="termCode"
            name="termCode"
            type="text"
            label="Term Code"
            placeholder="e.g. NET-30"
            required
            value={formData.termCode}
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
            className="font-mono uppercase text-sm"
            hint="Unique identifier (letters, numbers, hyphens only)"
          />

          {/* Description / Payment Terms (Compulsory Rich Text Editor) */}
          <div className="space-y-1.5">
            <label
              htmlFor="payment-terms-description"
              className="text-xs font-semibold text-heading block"
            >
              Description <span className="text-danger">*</span>
            </label>
            <RichTextEditor
              id="payment-terms-description"
              value={
                typeof formData.description === 'string'
                  ? formData.description
                  : (formData.description?.target?.value ?? '')
              }
              onChange={(e) => {
                const val = typeof e === 'string' ? e : (e?.target?.value ?? '');
                setFormData((prev) => ({ ...prev, description: val }));
                if (formErrors.description) {
                  setFormErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              placeholder="Enter payment terms in order, e.g.:&#10;1. payment term-1&#10;2. payment term-2"
              minHeight="min-h-[160px]"
            />
            {formErrors.description && (
              <p className="text-xs text-danger flex items-center gap-1 mt-1">
                <AlertCircle size={13} className="shrink-0" />
                <span>{formErrors.description}</span>
              </p>
            )}
            <p className="text-[11px] text-text-muted">
              Use the numbered list toolbar icon to structure ordered payment terms (1., 2., 3.).
            </p>
          </div>

          {/* Created Date (Read-only in edit mode) */}
          {editingTerm && (
            <div className="text-xs text-text-muted flex items-center justify-between p-2.5 bg-surface/60 rounded-lg border border-border">
              <span>Created Date:</span>
              <span className="font-mono font-medium text-heading">
                {formatDate(editingTerm.createdOn)}
              </span>
            </div>
          )}

          {/* Status Switch (Active / Inactive) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-semibold text-heading block">
                Status
              </label>
              <p className="text-xs text-text-muted mt-0.5">
                Set payment term active or inactive
              </p>
            </div>

            <StatusSwitch
              id="payment-term-modal-status"
              checked={formData.isActive}
              onChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="min-w-[120px] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingTerm ? 'Save Changes' : 'Add Term'}</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal
        isOpen={Boolean(termToDelete)}
        onClose={() => setTermToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Payment Term"
        message={
          termToDelete ? (
            <span>
              Are you sure you want to delete payment term{' '}
              <strong className="text-heading font-semibold">
                {termToDelete.termCode}
              </strong>
              ? This action cannot be undone.
            </span>
          ) : (
            'Are you sure you want to delete this payment term?'
          )
        }
        confirmText="Delete Payment Term"
        confirmVariant="danger"
      />
    </div>
  );
}
