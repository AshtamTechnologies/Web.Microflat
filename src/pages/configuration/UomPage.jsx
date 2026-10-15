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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Save,
  Eye,
} from 'lucide-react';
import { IconUOM } from '../../constants/icons';
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
  PageHeader,
  FilterBar,
  TableActions,
} from '../../components/ui';
import { useUomContext } from '../../context/UomContext';
import { formatDate } from '../../utils/dateUtils';

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
  const [viewingUom, setViewingUom] = useState(null); // View modal state
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
            {formatDate(row.original.createdOn)}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 100,
        minSize: 90,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <TableActions
            onView={() => setViewingUom(row.original)}
            onEdit={() => handleOpenEdit(row.original)}
            viewTitle="View UOM"
            editTitle="Edit UOM"
          />
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
      <PageHeader
        title="Unit of Measurement (UOM)"
        icon={IconUOM}
        subtitle="Manage measurement units, descriptions, and active status for procurement and inventory."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Plus size={16} className="mr-1.5" />
            Add UOM
          </Button>
        }
      />

      {/* ── Search & Status Filter Toolbar ── */}
      <FilterBar>
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Input
            id="search-uom"
            type="text"
            placeholder="Search by UOM name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={15} />}
            rightElement={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-text-muted hover:text-text cursor-pointer p-1"
                >
                  <X size={14} />
                </button>
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

                <div className="flex items-center justify-between text-2xs text-text-muted pt-2 border-t border-border">
                  <span className="font-mono">Created: {formatDate(uom.createdOn)}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setViewingUom(uom)}
                      className="text-xs"
                    >
                      <Eye size={13} className="mr-1.5" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(uom)}
                      className="text-xs"
                    >
                      <Pencil size={13} className="mr-1.5" />
                      Edit
                    </Button>
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="justify-center"
            >
              <X size={15} className="mr-1.5" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="justify-center font-semibold shadow-2xs"
            >
              <Save size={15} className="mr-1.5 shrink-0" aria-hidden="true" />
              {editingUom ? 'Save Changes' : 'Create UOM'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View UOM Modal ── */}
      <Modal
        isOpen={Boolean(viewingUom)}
        onClose={() => setViewingUom(null)}
        title="Unit of Measurement Details"
        maxWidth="max-w-lg"
      >
        {viewingUom && (
          <div className="space-y-4">
            {/* Header banner */}
            <div className="p-4 rounded-xl bg-surface/50 border border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Scale size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-heading break-words leading-snug">
                    {viewingUom.uomName}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">Unit Configuration</p>
                </div>
              </div>
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none shrink-0 mt-0.5',
                  viewingUom.isActive
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20',
                ].join(' ')}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    viewingUom.isActive ? 'bg-success' : 'bg-danger'
                  }`}
                  aria-hidden="true"
                />
                {viewingUom.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  UOM Name
                </span>
                <span className="font-semibold text-sm text-heading">
                  {viewingUom.uomName}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Created Date
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingUom.createdOn)}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1 sm:col-span-2">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Description
                </span>
                <p className="text-xs text-heading leading-relaxed">
                  {viewingUom.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setViewingUom(null)}
                className="justify-center"
              >
                <X size={15} className="mr-1.5" aria-hidden="true" />
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  const uom = viewingUom;
                  setViewingUom(null);
                  handleOpenEdit(uom);
                }}
                className="justify-center font-semibold shadow-2xs"
              >
                <Pencil size={15} className="mr-1.5 shrink-0" aria-hidden="true" />
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
