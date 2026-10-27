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
  IconRegions,
  IconSearch,
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
import { useRegionsContext } from '../../context/RegionsContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  regionName: '',
  isActive: true,
};

export default function RegionsPage() {
  const {
    regions = [],
    isLoading,
    fetchRegions,
    fetchRegionById,
    addRegion,
    updateRegion,
    updateRegionStatus,
  } = useRegionsContext();

  // Search & Status Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // TanStack table state for sorting and resizing
  const [sorting, setSorting] = useState([{ id: 'regionName', desc: false }]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [viewingRegion, setViewingRegion] = useState(null);
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
    fetchRegions(params);
  }, [statusFilter, fetchRegions]);

  /* ── Form Validation ── */
  function validateField(name, value) {
    const targetId = editingRegion?.regionId ?? editingRegion?.id;

    switch (name) {
      case 'regionName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Region name is required.';
        if (str.length > 100) return 'Region name cannot exceed 100 characters.';

        // Unique check (case-insensitive)
        const duplicate = regions.find((r) => {
          const currentId = r.regionId ?? r.id;
          if (editingRegion && String(currentId) === String(targetId)) return false;
          return r.regionName?.toLowerCase() === str.toLowerCase();
        });
        if (duplicate) return 'A region with this name already exists.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    const err = validateField('regionName', data.regionName);
    if (err) errors.regionName = err;
    return errors;
  }

  /* ── Modal Open / Close Handlers ── */
  function handleOpenAdd() {
    setEditingRegion(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  /**
   * Fetches fresh region details by ID via GET /api/regions/{id} and populates Edit form
   */
  async function handleOpenEdit(reg) {
    const id = reg.id ?? reg.regionId;
    setEditingRegion(reg);
    setFormData({
      regionName: reg.regionName || '',
      isActive: Boolean(reg.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchRegionById(id);
      if (fresh) {
        setEditingRegion(fresh);
        setFormData({
          regionName: fresh.regionName || '',
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
   * Fetches fresh region details by ID via GET /api/regions/{id} and opens View modal
   */
  async function handleOpenView(reg) {
    const id = reg.id ?? reg.regionId;
    setViewingRegion(reg);
    setIsFetchingDetail(true);

    try {
      const fresh = await fetchRegionById(id);
      if (fresh) {
        setViewingRegion(fresh);
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
    setEditingRegion(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsFetchingDetail(false);
  }

  /**
   * Handles creation (POST /api/regions) and update (PUT /api/regions/{id}).
   * Status updates are sent via PATCH /api/regions/{id}/status.
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
        regionName: formData.regionName.trim(),
      };

      if (editingRegion) {
        const id = editingRegion.id ?? editingRegion.regionId;
        // 1. Update region name via PUT /api/regions/{id}
        await updateRegion(id, payload);

        // 2. If status was modified, update via PATCH /api/regions/{id}/status
        if (Boolean(editingRegion.isActive) !== Boolean(formData.isActive)) {
          await updateRegionStatus(id, formData.isActive);
        }
      } else {
        // 1. Create new region via POST /api/regions
        const created = await addRegion(payload);
        const newId = created?.id ?? created?.regionId;

        // 2. If user toggled status to inactive during creation, update via PATCH /api/regions/{id}/status
        if (newId && formData.isActive === false) {
          await updateRegionStatus(newId, false);
        }
      }

      setIsModalOpen(false);
      setEditingRegion(null);
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

    return regions.filter((reg) => {
      const matchesSearch =
        !q || reg.regionName?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && reg.isActive) ||
        (statusFilter === 'INACTIVE' && !reg.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [regions, searchQuery, statusFilter]);

  /* ── TanStack Table Columns ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('regionName', {
        id: 'regionName',
        header: 'REGION NAME',
        size: 380,
        minSize: 220,
        cell: ({ row }) => {
          const reg = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconRegions size={15} />
              </div>
              <span
                className={`text-sm font-semibold truncate ${
                  reg.isActive ? 'text-heading' : 'text-text-muted line-through'
                }`}
              >
                {reg.regionName}
              </span>
            </div>
          );
        },
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
        size: 150,
        minSize: 120,
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
            viewTitle="View Region"
            editTitle="Edit Region"
          />
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regions]
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
        title="Regions Setup"
        icon={IconRegions}
        subtitle="Manage sales and geographical business territories, territory codes, and active status."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Region
          </Button>
        }
      />

      {/* ── Search & Status Filter Toolbar ── */}
      <FilterBar>
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Input
            id="search-regions"
            type="text"
            placeholder="Search by region name..."
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
                    <div className="h-4 bg-surface rounded w-48" />
                  </Td>
                  <Td>
                    <div className="h-5 bg-surface rounded w-16" />
                  </Td>
                  <Td>
                    <div className="h-4 bg-surface rounded w-24" />
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
                    <IconRegions size={32} className="text-text-muted/50" />
                    <p className="font-semibold text-heading">
                      No regions found
                    </p>
                    <p className="text-xs">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try resetting your search or status filter.'
                        : 'Click "+ Add Region" to create your first region.'}
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
              key={`reg-skel-${i}`}
              className="bg-bg border border-border rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-surface rounded w-36" />
                <div className="h-5 bg-surface rounded w-16" />
              </div>
              <div className="h-4 bg-surface rounded w-24" />
            </div>
          ))
        ) : filteredData.length > 0 ? (
          filteredData.map((reg) => {
            const id = reg.id ?? reg.regionId;
            return (
              <div
                key={id}
                className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <h3
                      className={`text-sm font-semibold ${
                        reg.isActive
                          ? 'text-heading'
                          : 'text-text-muted line-through'
                      }`}
                    >
                      {reg.regionName}
                    </h3>
                  </div>

                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 select-none',
                      reg.isActive
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-danger/10 text-danger border border-danger/20',
                    ].join(' ')}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        reg.isActive ? 'bg-success' : 'bg-danger'
                      }`}
                      aria-hidden="true"
                    />
                    {reg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-2xs text-text-muted pt-2 border-t border-border">
                  <span className="font-mono">
                    Created: {formatDate(reg.createdOn || reg.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenView(reg)}
                      className="text-xs"
                    >
                      <IconView size={13} className="mr-1.5" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(reg)}
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
            <IconRegions size={28} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-sm">No regions found</p>
            <p className="text-xs mt-1">Click &quot;+ Add Region&quot; to create one.</p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Region Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRegion ? 'Edit Region' : 'Add Region'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {isFetchingDetail && (
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs text-primary">
              <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />
              Loading latest details...
            </div>
          )}

          {/* Region Name */}
          <Input
            id="regionName"
            name="regionName"
            type="text"
            label="Region Name"
            placeholder="e.g. West Region, North Region, Export Market"
            required
            value={formData.regionName}
            disabled={isSubmitting || isFetchingDetail}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, regionName: val }));
              if (formErrors.regionName) {
                setFormErrors((prev) => ({ ...prev, regionName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('regionName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, regionName: err }));
            }}
            error={formErrors.regionName}
          />

          {/* Status Switch (Active / Inactive) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set region active or inactive
              </p>
            </div>

            <StatusSwitch
              id="region-status-toggle"
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
              {editingRegion ? 'Save Changes' : 'Save Region'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Region Modal ── */}
      <Modal
        isOpen={Boolean(viewingRegion)}
        onClose={() => setViewingRegion(null)}
        title="Region Details"
        maxWidth="max-w-lg"
      >
        {viewingRegion && (
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
                  <IconRegions size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-heading break-words leading-snug">
                    {viewingRegion.regionName}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Territory Configuration
                  </p>
                </div>
              </div>
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none shrink-0 mt-0.5',
                  viewingRegion.isActive
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20',
                ].join(' ')}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    viewingRegion.isActive ? 'bg-success' : 'bg-danger'
                  }`}
                  aria-hidden="true"
                />
                {viewingRegion.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1 sm:col-span-2">
                <span className="view-field-label mf-detail-label">
                  Region Name
                </span>
                <span className="font-semibold text-sm text-heading">
                  {viewingRegion.regionName}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="view-field-label mf-detail-label">
                  Created Date
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingRegion.createdOn || viewingRegion.createdAt)}
                </span>
              </div>

              {viewingRegion.lastUpdatedOn && (
                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">
                    Last Updated
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {formatDate(viewingRegion.lastUpdatedOn)}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <CancelButton
                onClick={() => setViewingRegion(null)}
                className="justify-center"
              >
                Close
              </CancelButton>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  const reg = viewingRegion;
                  setViewingRegion(null);
                  handleOpenEdit(reg);
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
