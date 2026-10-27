import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconArrowDown,
  IconArrowUp,
  IconArrowUpDown,
  IconClose,
  IconEdit,
  IconSearch,
  IconUOM,
  IconView,
} from '../../constants/icons';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  Modal,
  TableContainer,
  Th,
  Td,
  StatusSwitch,
  PageHeader,
  FilterBar,
  TableActions,
  IconButton,
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
    uomList = [],
    isLoading,
    fetchUoms,
    fetchUomById,
    addUom,
    updateUom,
    updateUomStatus,
  } = useUomContext();

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
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger backend API filter query when status filter changes
  useEffect(() => {
    const params = {};
    if (statusFilter === 'ACTIVE') {
      params.isActive = true;
    } else if (statusFilter === 'INACTIVE') {
      params.isActive = false;
    }
    fetchUoms(params);
  }, [statusFilter, fetchUoms]);

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
          return u.uomName?.toLowerCase() === str.toLowerCase();
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

  /**
   * Fetches fresh UOM details by ID via GET /api/uoms/{id} and populates Edit form
   */
  async function handleOpenEdit(uom) {
    const id = uom.id ?? uom.uomId;
    setEditingUom(uom);
    setFormData({
      uomName: uom.uomName || '',
      description: uom.description || '',
      isActive: Boolean(uom.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchUomById(id);
      if (fresh) {
        setEditingUom(fresh);
        setFormData({
          uomName: fresh.uomName || '',
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
   * Fetches fresh UOM details by ID via GET /api/uoms/{id} and opens View modal
   */
  async function handleOpenView(uom) {
    const id = uom.id ?? uom.uomId;
    setViewingUom(uom);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchUomById(id);
      if (fresh) {
        setViewingUom(fresh);
      }
    } catch {
      // Toast notification is handled in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingUom(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsFetchingDetail(false);
  }

  /**
   * Handles creation (POST /api/uoms) and update (PUT /api/uoms/{id}).
   * Status updates are sent via PATCH /api/uoms/{id}/status.
   */
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
        uomName: formData.uomName.trim(),
        description: formData.description.trim(),
      };

      if (editingUom) {
        const id = editingUom.id ?? editingUom.uomId;
        // 1. Update UOM name & description via PUT /api/uoms/{id}
        await updateUom(id, payload);

        // 2. If status was modified, update via PATCH /api/uoms/{id}/status
        if (Boolean(editingUom.isActive) !== Boolean(formData.isActive)) {
          await updateUomStatus(id, formData.isActive);
        }
      } else {
        // 1. Create new UOM via POST /api/uoms
        const created = await addUom(payload);
        const newId = created?.id ?? created?.uomId;

        // 2. If user toggled status to inactive during creation, update via PATCH /api/uoms/{id}/status
        if (newId && formData.isActive === false) {
          await updateUomStatus(newId, false);
        }
      }

      setIsModalOpen(false);
      setEditingUom(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      if (err?.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFormErrors(err.fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Filtered Data Computation ── */
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return uomList.filter((uom) => {
      const matchesSearch =
        !q ||
        uom.uomName?.toLowerCase().includes(q) ||
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
                <IconUOM size={15} />
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
            {formatDate(row.original.createdOn || row.original.createdAt)}
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
            onView={() => handleOpenView(row.original)}
            onEdit={() => handleOpenEdit(row.original)}
            viewTitle="View UOM"
            editTitle="Edit UOM"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uomList]
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
            <IconAdd size={16} className="mr-1.5" />
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
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none'
                            : ''
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
                              <IconArrowUp size={13} className="text-primary" />
                            ) : isSorted === 'desc' ? (
                              <IconArrowDown
                                size={13}
                                className="text-primary"
                              />
                            ) : (
                              <IconArrowUpDown
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
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <Td>
                    <div className="h-4 bg-surface rounded w-36" />
                  </Td>
                  <Td>
                    <div className="h-4 bg-surface rounded w-64" />
                  </Td>
                  <Td>
                    <div className="h-5 bg-surface rounded w-16" />
                  </Td>
                  <Td>
                    <div className="h-4 bg-surface rounded w-20" />
                  </Td>
                  <Td className="text-right">
                    <div className="h-7 bg-surface rounded w-16 ml-auto" />
                  </Td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface/50 transition-colors duration-100"
                >
                  {row.getVisibleCells().map((cell) => (
                    <Td key={cell.id} style={{ width: cell.column.getSize() }}>
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
                    <IconUOM size={32} className="text-text-muted/50" />
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
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`uom-skel-${i}`}
              className="bg-bg border border-border rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-surface rounded w-28" />
                <div className="h-5 bg-surface rounded w-16" />
              </div>
              <div className="h-4 bg-surface rounded w-3/4" />
            </div>
          ))
        ) : filteredData.length > 0 ? (
          filteredData.map((uom) => {
            const id = uom.id ?? uom.uomId;
            return (
              <div
                key={id}
                className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3
                      className={`text-sm font-semibold ${
                        uom.isActive
                          ? 'text-heading'
                          : 'text-text-muted line-through'
                      }`}
                    >
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
                  <span className="font-mono">
                    Created: {formatDate(uom.createdOn || uom.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenView(uom)}
                      className="text-xs"
                    >
                      <IconView size={13} className="mr-1.5" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(uom)}
                      className="text-xs"
                    >
                      <IconEdit size={13} className="mr-1.5" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-bg border border-border rounded-xl p-8 text-center text-text-muted">
            <IconUOM size={28} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-sm">No units found</p>
            <p className="text-xs mt-1">Click &quot;+ Add UOM&quot; to create one.</p>
          </div>
        )}
      </div>

      {/* ── Add / Edit UOM Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingUom
            ? 'Edit Unit of Measurement'
            : 'Add Unit of Measurement (UOM)'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              Loading latest details...
            </div>
          )}

          {/* UOM Name */}
          <Input
            id="uomName"
            name="uomName"
            type="text"
            label="UOM Name"
            placeholder="e.g. Nos, Kg, Meter, Box, Litre, Set"
            required
            value={formData.uomName}
            disabled={isSubmitting || isFetchingDetail}
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
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, description: val }));
            }}
          />

          {/* Status Switch (Active / Inactive) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set unit active or inactive
              </p>
            </div>

            <StatusSwitch
              id="uom-status-toggle"
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
              {editingUom ? 'Save Changes' : 'Save UOM'}
            </SaveButton>
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
                  <IconUOM size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-heading break-words leading-snug">
                    {viewingUom.uomName}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Unit Configuration
                  </p>
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
                <span className="view-field-label mf-detail-label">
                  UOM Name
                </span>
                <span className="font-semibold text-sm text-heading">
                  {viewingUom.uomName}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="view-field-label mf-detail-label">
                  Created Date
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingUom.createdOn || viewingUom.createdAt)}
                </span>
              </div>

              {viewingUom.lastUpdatedOn && (
                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">
                    Last Updated
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {formatDate(viewingUom.lastUpdatedOn)}
                  </span>
                </div>
              )}

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1 sm:col-span-2">
                <span className="view-field-label mf-detail-label">
                  Description
                </span>
                <p className="text-xs text-heading leading-relaxed">
                  {viewingUom.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <CancelButton
                onClick={() => setViewingUom(null)}
                className="justify-center"
              >
                Close
              </CancelButton>
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
