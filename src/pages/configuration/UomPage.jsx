import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Scale,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Input,
  Modal,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
  StatusSwitch,
} from '../../components/ui';
import { useUomContext } from '../../context/UomContext';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  uomName: '',
  description: '',
  isActive: true,
};

export default function UomPage() {
  const {
    uomList,
    addUom,
    updateUom,
    deleteUom,
  } = useUomContext();

  // Simulated initial loading delay
  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // TanStack table state
  const [sorting, setSorting] = useState([{ id: 'uomName', desc: false }]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUom, setEditingUom] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [uomToDelete, setUomToDelete] = useState(null);

  /* ── Form Validation ── */
  function validateField(name, value) {
    const targetId = editingUom?.uomId || editingUom?.id;

    switch (name) {
      case 'uomName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'UOM name is required.';
        if (str.length > 100) return 'UOM name cannot exceed 100 characters.';

        // Unique check (case-insensitive)
        const duplicate = uomList.find((u) => {
          const currentId = u.uomId || u.id;
          if (editingUom && currentId === targetId) return false;
          return u.uomName.toLowerCase() === str.toLowerCase();
        });
        if (duplicate) return 'A UOM with this name already exists.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    const err = validateField('uomName', data.uomName);
    if (err) errors.uomName = err;
    return errors;
  }

  /* ── Modal Open / Close Handlers ── */
  function handleOpenAdd() {
    setEditingUom(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleOpenEdit(uom) {
    setEditingUom(uom);
    setFormData({
      uomName: uom.uomName || '',
      description: uom.description || '',
      isActive: Boolean(uom.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingUom(null);
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
      if (editingUom) {
        const id = editingUom.uomId || editingUom.id;
        await updateUom(id, formData);
      } else {
        await addUom(formData);
      }
      setIsModalOpen(false);
      setEditingUom(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      toast.error('Failed to save UOM.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Delete Handlers ── */
  function handleDeleteClick(uom) {
    setUomToDelete(uom);
  }

  function handleConfirmDelete() {
    if (!uomToDelete) return;
    const id = uomToDelete.uomId || uomToDelete.id;
    deleteUom(id);
    setUomToDelete(null);
  }

  /* ── Filtered Data Computation ── */
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return uomList.filter((uom) => {
      const matchesSearch =
        !q ||
        uom.uomName.toLowerCase().includes(q) ||
        (uom.description && uom.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && uom.isActive) ||
        (statusFilter === 'INACTIVE' && !uom.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [uomList, searchQuery, statusFilter]);

  /* ── TanStack Table Columns ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('uomName', {
        id: 'uomName',
        header: 'UOM NAME',
        size: 240,
        minSize: 180,
        cell: ({ row }) => {
          const uom = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Scale size={15} />
              </div>
              <span
                className={`text-sm font-semibold truncate ${
                  uom.isActive ? 'text-heading' : 'text-text-muted line-through'
                }`}
              >
                {uom.uomName}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('description', {
        id: 'description',
        header: 'DESCRIPTION',
        size: 340,
        minSize: 220,
        cell: ({ row }) => (
          <span className="text-xs text-text-muted truncate block" title={row.original.description || '—'}>
            {row.original.description || '—'}
          </span>
        ),
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 140,
        minSize: 120,
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
        header: 'CREATED ON',
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
        header: 'ACTIONS',
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
              title="Edit UOM"
              aria-label="Edit UOM"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteClick(row.original)}
              className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all cursor-pointer shadow-2xs"
              title="Delete UOM"
              aria-label="Delete UOM"
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
            <Scale className="h-6 w-6 text-primary" aria-hidden="true" />
            Unit of Measurement (UOM)
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Manage measurement units, descriptions, and active status for procurement and inventory.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          className="self-start sm:self-auto shrink-0 shadow-xs"
        >
          <Plus size={16} className="mr-1.5" />
          Add UOM
        </Button>
      </div>

      {/* ── Search & Status Filter Toolbar ── */}
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
              placeholder="Search by UOM name or description..."
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
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <Td><div className="h-4 bg-surface rounded w-36" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-64" /></Td>
                  <Td><div className="h-5 bg-surface rounded w-16" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-20" /></Td>
                  <Td className="text-right"><div className="h-7 bg-surface rounded w-16 ml-auto" /></Td>
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
                    <Scale size={32} className="text-text-muted/50" />
                    <p className="font-semibold text-heading">
                      No units of measurement found
                    </p>
                    <p className="text-xs">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try resetting your search or status filter.'
                        : 'Click "+ Add UOM" to create your first unit.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </TableContainer>
      </div>

      {/* ── Mobile View (< md): Card List ── */}
      <div className="block md:hidden space-y-3">
        {initialLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`uom-skel-${i}`} className="bg-bg border border-border rounded-xl p-4 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-surface rounded w-28" />
                <div className="h-5 bg-surface rounded w-16" />
              </div>
              <div className="h-4 bg-surface rounded w-3/4" />
            </div>
          ))
        ) : filteredData.length > 0 ? (
          filteredData.map((uom) => {
            const id = uom.uomId || uom.id;
            return (
              <div
                key={id}
                className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3 className={`text-sm font-semibold ${uom.isActive ? 'text-heading' : 'text-text-muted line-through'}`}>
                      {uom.uomName}
                    </h3>
                    {uom.description && (
                      <p className="text-xs text-text-muted">
                        {uom.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 select-none',
                      uom.isActive
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-danger/10 text-danger border border-danger/20',
                    ].join(' ')}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        uom.isActive ? 'bg-success' : 'bg-danger'
                      }`}
                      aria-hidden="true"
                    />
                    {uom.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border">
                  <span className="font-mono">Created: {uom.createdOn || '—'}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(uom)}
                      className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                      title="Edit UOM"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(uom)}
                      className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all cursor-pointer"
                      title="Delete UOM"
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
            <Scale size={28} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-sm">No units found</p>
            <p className="text-xs mt-1">Click &quot;+ Add UOM&quot; to create one.</p>
          </div>
        )}
      </div>

      {/* ── Add / Edit UOM Modal (Clean & Simple) ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUom ? 'Edit Unit of Measurement' : 'Add Unit of Measurement (UOM)'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* UOM Name */}
          <Input
            id="uomName"
            name="uomName"
            type="text"
            label="UOM Name"
            placeholder="e.g. Nos, Kg, Meter, Box, Litre, Set"
            required
            value={formData.uomName}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, uomName: val }));
              if (formErrors.uomName) {
                setFormErrors((prev) => ({ ...prev, uomName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('uomName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, uomName: err }));
            }}
            error={formErrors.uomName}
          />

          {/* Description */}
          <Input
            id="description"
            name="description"
            type="text"
            label="Description"
            placeholder="e.g. Numbers, Kilograms, Linear meters"
            value={formData.description}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, description: val }));
            }}
          />

          {/* Status Toggle (Active / Inactive) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-semibold text-heading block">
                Status
              </label>
              <p className="text-xs text-text-muted mt-0.5">
                Set unit active or inactive
              </p>
            </div>

            <StatusSwitch
              id="uom-status-toggle"
              checked={formData.isActive}
              onChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {editingUom ? 'Save Changes' : 'Create UOM'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(uomToDelete)}
        onClose={() => setUomToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Unit of Measurement?"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-heading font-semibold">
              {uomToDelete?.uomName}
            </strong>
            ? This unit will be removed.
          </>
        }
        confirmText="Delete UOM"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
