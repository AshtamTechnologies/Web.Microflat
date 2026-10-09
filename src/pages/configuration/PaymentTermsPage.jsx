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
  Clock,
  FileText,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Input,
  Toggle,
  Modal,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
  StatusSwitch,
} from '../../components/ui';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  termCode: '',
  termName: '',
  dueDays: 30,
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
  const [sorting, setSorting] = useState([{ id: 'dueDays', desc: false }]);
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
      case 'termName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Term name is required.';
        if (str.length > 100) return 'Term name cannot exceed 100 characters.';

        // Check unique name (case-insensitive)
        const duplicate = paymentTerms.find((pt) => {
          const currentId = pt.paymentTermId || pt.id;
          if (editingTerm && currentId === targetId) return false;
          return pt.termName.toLowerCase() === str.toLowerCase();
        });
        if (duplicate) return 'A payment term with this name already exists.';
        return '';
      }
      case 'dueDays': {
        if (value === '' || value === null || value === undefined) {
          return 'Due days is required.';
        }
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) {
          return 'Due days must be an integer.';
        }
        if (num < 0 || num > 365) {
          return 'Due days must be between 0 and 365.';
        }
        return '';
      }
      case 'description': {
        if (value && value.length > 250) {
          return 'Description cannot exceed 250 characters.';
        }
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    ['termCode', 'termName', 'dueDays', 'description'].forEach((field) => {
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
      termName: term.termName || '',
      dueDays: term.dueDays !== undefined ? term.dueDays : 30,
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
    const errors = validateAll(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTerm) {
        const id = editingTerm.paymentTermId || editingTerm.id;
        await updatePaymentTerm(id, formData);
      } else {
        await addPaymentTerm(formData);
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
        term.termName.toLowerCase().includes(q) ||
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
      columnHelper.accessor('termName', {
        id: 'termName',
        header: 'Term Name',
        size: 240,
        minSize: 180,
        cell: ({ row }) => {
          const term = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <HandCoins size={15} />
              </div>
              <span
                className={`text-sm font-semibold truncate ${
                  term.isActive ? 'text-heading' : 'text-text-muted line-through'
                }`}
                title={term.termName}
              >
                {term.termName}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('dueDays', {
        id: 'dueDays',
        header: 'Due Days',
        size: 140,
        minSize: 120,
        cell: ({ row }) => {
          const days = Number(row.original.dueDays);
          return (
            <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs">
              <Clock size={13} className="text-text-muted shrink-0" />
              <span className="font-semibold text-heading">
                {days === 0 ? 'Immediate' : `${days} days`}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('description', {
        id: 'description',
        header: 'Description',
        size: 340,
        minSize: 220,
        cell: ({ row }) => (
          <span
            className="text-xs text-text-muted truncate block"
            title={row.original.description || '—'}
          >
            {row.original.description || '—'}
          </span>
        ),
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
        header: 'Created On',
        size: 130,
        minSize: 110,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs text-text-muted">
            {row.original.createdOn || '—'}
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
              placeholder="Search by code, term name or description..."
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
            const days = Number(term.dueDays);
            return (
              <div
                key={id}
                className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono tabular-nums font-semibold text-xs text-heading bg-surface border border-border px-2 py-0.5 rounded-md">
                        {term.termCode}
                      </span>
                      <span className="font-mono text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {days === 0 ? 'Immediate' : `${days} days`}
                      </span>
                    </div>
                    <h3
                      className={`text-sm font-semibold mt-1 ${
                        term.isActive ? 'text-heading' : 'text-text-muted line-through'
                      }`}
                    >
                      {term.termName}
                    </h3>
                  </div>

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
                  <p className="text-xs text-text-muted line-clamp-2">
                    {term.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-muted">
                  <span className="font-mono tabular-nums">{term.createdOn || '—'}</span>

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
        maxWidth="max-w-md"
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

          {/* Term Name */}
          <Input
            id="termName"
            name="termName"
            type="text"
            label="Term Name"
            placeholder="e.g. Net 30 Days"
            required
            value={formData.termName}
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

          {/* Due Days */}
          <Input
            id="dueDays"
            name="dueDays"
            type="number"
            min={0}
            max={365}
            step={1}
            label="Due Days (Calendar Days)"
            placeholder="30"
            required
            value={formData.dueDays}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, dueDays: val }));
              if (formErrors.dueDays) {
                setFormErrors((prev) => ({ ...prev, dueDays: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('dueDays', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, dueDays: err }));
            }}
            error={formErrors.dueDays}
            className="font-mono tabular-nums text-sm"
            hint="0 means payment is due immediately."
          />

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-xs font-semibold text-text uppercase tracking-wider"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={250}
              placeholder="e.g. Standard 30 days commercial credit period from invoice date..."
              value={formData.description}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, description: val }));
                if (formErrors.description) {
                  setFormErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>Short description or billing agreement note</span>
              <span className="font-mono tabular-nums">
                {formData.description.length}/250
              </span>
            </div>
            {formErrors.description && (
              <p className="text-xs text-danger">{formErrors.description}</p>
            )}
          </div>

          {/* Created On (Read-only in edit mode) */}
          {editingTerm && (
            <div className="text-xs text-text-muted flex items-center justify-between p-2.5 bg-surface/60 rounded-lg border border-border">
              <span>Created Timestamp:</span>
              <span className="font-mono font-medium text-heading">
                {editingTerm.createdOn}
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
              Are you sure you want to delete{' '}
              <strong className="text-heading font-semibold">
                {termToDelete.termName}
              </strong>{' '}
              ({termToDelete.termCode})? This action cannot be undone.
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
