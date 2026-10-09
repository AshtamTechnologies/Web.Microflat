import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Globe,
  Compass,
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
  Toggle,
  SearchableSelect,
  Modal,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
  StatusSwitch,
} from '../../components/ui';
import { useRegionsContext } from '../../context/RegionsContext';
import { useInquiriesContext } from '../../context/InquiriesContext';
import {
  buildTree,
  flattenVisible,
  getDescendantIds,
  getDropdownOptions,
} from '../../utils/treeUtils';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  regionCode: '',
  regionName: '',
  parentRegionId: '',
  isActive: true,
};

export default function RegionsPage() {
  const {
    regions,
    addRegion,
    updateRegion,
    deleteRegion,
    toggleRegionActive,
  } = useRegionsContext();

  const { inquiries = [] } = useInquiriesContext();

  // Simulated initial loading delay
  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter and Search Toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Tree expansion state (start with all regions expanded)
  const [expandedIds, setExpandedIds] = useState(() => {
    return new Set(regions.map((r) => r.regionId));
  });

  // Ensure new regions get expanded when added
  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      regions.forEach((r) => next.add(r.regionId));
      return next;
    });
  }, [regions]);

  // TanStack table state for resizable columns and sorting
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [regionToDelete, setRegionToDelete] = useState(null);

  /* ── Expand / Collapse handler ── */
  function toggleExpand(regionId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(regions.map((r) => r.regionId)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  /* ── Filtered & Hierarchical Tree Computation ── */
  const visibleRows = useMemo(() => {
    const tree = buildTree(regions, {
      idKey: 'regionId',
      parentKey: 'parentRegionId',
      nameKey: 'regionName',
      codeKey: 'regionCode',
    });

    // If no search and no status filter, normal tree flattening
    if (!searchQuery.trim() && statusFilter === 'ALL') {
      return flattenVisible(tree, expandedIds, { idKey: 'regionId' });
    }

    const q = searchQuery.toLowerCase().trim();

    // Find all matching region IDs
    const matchingIds = new Set();
    regions.forEach((reg) => {
      const matchesSearch =
        !q ||
        reg.regionCode.toLowerCase().includes(q) ||
        reg.regionName.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && reg.isActive) ||
        (statusFilter === 'INACTIVE' && !reg.isActive);

      if (matchesSearch && matchesStatus) {
        matchingIds.add(reg.regionId);
      }
    });

    // Also include all ancestors of matching nodes so hierarchy remains readable
    const visibleIdsWithAncestors = new Set(matchingIds);
    const regMap = new Map(regions.map((r) => [r.regionId, r]));

    matchingIds.forEach((id) => {
      let curr = regMap.get(id);
      while (curr && curr.parentRegionId) {
        visibleIdsWithAncestors.add(curr.parentRegionId);
        curr = regMap.get(curr.parentRegionId);
      }
    });

    // Flatten tree including visible nodes (ignore collapse state during search)
    const alwaysExpandDuringSearch = Boolean(q);
    const effectiveExpanded = alwaysExpandDuringSearch
      ? new Set(regions.map((r) => r.regionId))
      : expandedIds;

    const flattened = flattenVisible(tree, effectiveExpanded, { idKey: 'regionId' });
    return flattened.filter((row) => visibleIdsWithAncestors.has(row.regionId));
  }, [regions, expandedIds, searchQuery, statusFilter]);

  /* ── Form Validation ── */
  function validateField(name, value) {
    const targetId = editingRegion?.regionId;

    switch (name) {
      case 'regionCode': {
        const str = typeof value === 'string' ? value.trim().toUpperCase() : '';
        if (!str) return 'Region code is required.';
        if (str.length > 20) return 'Region code cannot exceed 20 characters.';
        if (!/^[A-Z0-9-]+$/.test(str)) {
          return 'Code must contain uppercase letters, numbers, and hyphens only.';
        }

        // Check unique code (case-insensitive)
        const duplicate = regions.find((r) => {
          if (editingRegion && r.regionId === targetId) return false;
          return r.regionCode.toUpperCase() === str;
        });
        if (duplicate) return 'A region with this code already exists.';
        return '';
      }
      case 'regionName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Region name is required.';
        if (str.length > 100) return 'Region name cannot exceed 100 characters.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    ['regionCode', 'regionName'].forEach((field) => {
      const err = validateField(field, data[field]);
      if (err) errors[field] = err;
    });
    return errors;
  }

  /* ── Modal Open Handlers ── */
  function handleOpenAdd(parentRegId = null) {
    // Only top-level regions can be chosen as parent
    const targetParent = parentRegId
      ? regions.find((r) => r.regionId === parentRegId && !r.parentRegionId)
      : null;

    setEditingRegion(null);
    setFormData({
      regionCode: '',
      regionName: '',
      parentRegionId: targetParent ? targetParent.regionId : '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleOpenEdit(reg) {
    setEditingRegion(reg);
    setFormData({
      regionCode: reg.regionCode || '',
      regionName: reg.regionName || '',
      parentRegionId: reg.parentRegionId || '',
      isActive: Boolean(reg.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingRegion(null);
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
      if (editingRegion) {
        await updateRegion(editingRegion.regionId, formData);
      } else {
        await addRegion(formData);
      }
      setIsModalOpen(false);
      setEditingRegion(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      toast.error('Failed to save region.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Delete Handlers with Safety Blocks ── */
  function handleDeleteClick(reg) {
    const id = reg.regionId;

    // 1. Block if region has child sub-regions
    const hasChildren = regions.some((r) => r.parentRegionId === id);
    if (hasChildren) {
      toast.error('Cannot delete. It has sub-regions.');
      return;
    }

    // 2. Block if region is used by any inquiry
    const usedCount = inquiries.filter(
      (inq) => inq.RegionId === id || inq.regionId === id
    ).length;

    if (usedCount > 0) {
      toast.error(
        `Cannot delete. Used by ${usedCount} ${usedCount === 1 ? 'inquiry' : 'inquiries'}. Deactivate it instead.`
      );
      return;
    }

    setRegionToDelete(reg);
  }

  function handleConfirmDelete() {
    if (!regionToDelete) return;
    deleteRegion(regionToDelete.regionId);
    setRegionToDelete(null);
  }

  /* ── Parent Region Options for Add/Edit Modal (Strict 2-Level Limit: Root regions only) ── */
  const parentSelectOptions = useMemo(() => {
    // If editing a region that already has children, it cannot become a child of another region (must stay root)
    const hasChildren = editingRegion
      ? regions.some((r) => r.parentRegionId === editingRegion.regionId)
      : false;

    if (hasChildren) {
      return [{ value: '', label: '— None (Top-Level Region — Contains Sub-Regions) —' }];
    }

    // Only Top-Level regions (where !parentRegionId) can be chosen as a parent
    const rootRegions = regions.filter((r) => {
      if (editingRegion && r.regionId === editingRegion.regionId) return false;
      return !r.parentRegionId; // Only root regions
    });

    const baseOptions = rootRegions.map((reg) => ({
      value: reg.regionId,
      label: `${reg.regionName} (${reg.regionCode})`,
    }));

    return [
      { value: '', label: '— None (Top-Level Region) —' },
      ...baseOptions,
    ];
  }, [regions, editingRegion]);

  /* ── TanStack Columns with Resizing Support ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('regionCode', {
        id: 'regionCode',
        header: 'Code',
        size: 140,
        minSize: 110,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums font-semibold text-xs text-heading bg-surface border border-border px-2 py-0.5 rounded-md shadow-2xs">
            {row.original.regionCode}
          </span>
        ),
      }),
      columnHelper.accessor('regionName', {
        id: 'regionName',
        header: 'Region Name',
        size: 340,
        minSize: 240,
        cell: ({ row }) => {
          const reg = row.original;
          const hasChildren = reg.hasChildren;
          const isExpanded = reg.isExpanded;
          const indentPx = (reg.depth || 0) * 24;

          return (
            <div
              className="flex items-center gap-1.5"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(reg.regionId)}
                  className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-heading hover:bg-surface transition-colors cursor-pointer"
                  title={isExpanded ? 'Collapse sub-regions' : 'Expand sub-regions'}
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-primary" />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
              ) : (
                <span className="w-5 h-5 inline-block" />
              )}

              <div className="flex items-center gap-2 min-w-0">
                {reg.depth === 0 ? (
                  <Globe
                    size={16}
                    className={reg.isActive ? 'text-primary shrink-0' : 'text-text-muted shrink-0'}
                  />
                ) : (
                  <MapPin
                    size={15}
                    className={reg.isActive ? 'text-primary/80 shrink-0' : 'text-text-muted shrink-0'}
                  />
                )}
                <span
                  className={`text-sm font-medium truncate ${
                    reg.isActive ? 'text-heading' : 'text-text-muted line-through'
                  }`}
                  title={reg.regionName}
                >
                  {reg.regionName}
                </span>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('parentName', {
        id: 'parentName',
        header: 'Parent Region',
        size: 200,
        minSize: 140,
        cell: ({ row }) => (
          <span className="text-xs text-text-muted truncate block" title={row.original.parentName || '—'}>
            {row.original.parentName || '—'}
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
        size: 130,
        minSize: 120,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 justify-end">
            {!row.original.parentRegionId && (
              <button
                type="button"
                onClick={() => handleOpenAdd(row.original.regionId)}
                className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
                title="Add sub-region"
                aria-label="Add sub-region"
              >
                <Plus size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenEdit(row.original)}
              className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
              title="Edit region"
              aria-label="Edit region"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteClick(row.original)}
              className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all cursor-pointer shadow-2xs"
              title="Delete region"
              aria-label="Delete region"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      }),
    ],
    [regions, expandedIds, inquiries]
  );

  const table = useReactTable({
    data: visibleRows,
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
            <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
            Regions
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Manage hierarchical sales territories, domestic zones, and export distribution regions.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => handleOpenAdd()}
          className="self-start sm:self-auto shrink-0 shadow-xs"
        >
          <Plus size={16} className="mr-1.5" />
          Add Region
        </Button>
      </div>

      {/* ── Toolbar: Search, Status Filter & Tree View Helpers ── */}
      <Card padding="sm" className="bg-bg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by code or region name..."
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

          {/* Status Filter Chips & Expand Controls */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
            <div className="flex items-center p-1 bg-surface rounded-lg border border-border">
              {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize ${
                    statusFilter === status
                      ? 'bg-bg text-heading shadow-2xs font-semibold'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {status.toLowerCase()}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 border-l border-border pl-2.5">
              <button
                type="button"
                onClick={expandAll}
                className="text-xs text-text-muted hover:text-heading px-2 py-1 rounded hover:bg-surface transition-colors cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-text-muted/40">•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-xs text-text-muted hover:text-heading px-2 py-1 rounded hover:bg-surface transition-colors cursor-pointer"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Desktop View (md+): Hierarchical Resizable Table ── */}
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
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <Td><div className="h-4 bg-surface rounded w-24" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-52" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-32" /></Td>
                  <Td><div className="h-5 bg-surface rounded w-16" /></Td>
                  <Td><div className="h-4 bg-surface rounded w-24" /></Td>
                  <Td className="text-right"><div className="h-7 bg-surface rounded w-24 ml-auto" /></Td>
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
                    <MapPin size={32} className="text-text-muted/50" />
                    <p className="font-semibold text-heading">
                      No regions match your filters
                    </p>
                    <p className="text-xs">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try resetting your search query or status filter.'
                        : 'Click "+ Add Region" to set up your geographical hierarchy.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </TableContainer>
      </div>

      {/* ── Mobile View (< md): Touch-friendly Card List ── */}
      <div className="block md:hidden space-y-3">
        {initialLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`m-skel-${i}`} className="bg-bg border border-border rounded-xl p-4 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-surface rounded w-24" />
                <div className="h-5 bg-surface rounded w-16" />
              </div>
              <div className="h-4 bg-surface rounded w-3/4" />
              <div className="h-8 bg-surface rounded w-full" />
            </div>
          ))
        ) : visibleRows.length > 0 ? (
          visibleRows.map((reg) => (
            <div
              key={reg.regionId}
              className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono tabular-nums font-semibold text-xs text-heading bg-surface border border-border px-2 py-0.5 rounded-md">
                      {reg.regionCode}
                    </span>
                    {reg.depth > 0 && (
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                        Level {reg.depth + 1}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-sm font-semibold mt-1 ${reg.isActive ? 'text-heading' : 'text-text-muted line-through'}`}>
                    {reg.regionName}
                  </h3>
                  {reg.parentName && (
                    <p className="text-xs text-text-muted">
                      Parent: <span className="font-medium text-text">{reg.parentName}</span>
                    </p>
                  )}
                </div>

                <span
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium select-none',
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

              <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-text-muted">
                <span className="font-mono tabular-nums">{reg.createdOn || '—'}</span>

                <div className="flex items-center gap-1.5">
                  {!reg.parentRegionId && (
                    <button
                      type="button"
                      onClick={() => handleOpenAdd(reg.regionId)}
                      className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                      title="Add sub-region"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(reg)}
                    className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                    title="Edit region"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(reg)}
                    className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all cursor-pointer"
                    title="Delete region"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-bg border border-border rounded-xl p-8 text-center text-text-muted">
            <Compass size={28} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-sm">No regions found</p>
            <p className="text-xs mt-1">Try adjusting your filters or add a new region.</p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Region Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRegion ? 'Edit Region' : 'Add New Region'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Region Code */}
          <Input
            id="regionCode"
            name="regionCode"
            type="text"
            label="Region Code"
            placeholder="e.g. REG-WEST-01"
            required
            value={formData.regionCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setFormData((prev) => ({ ...prev, regionCode: val }));
              if (formErrors.regionCode) {
                setFormErrors((prev) => ({ ...prev, regionCode: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('regionCode', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, regionCode: err }));
            }}
            error={formErrors.regionCode}
            className="font-mono uppercase text-sm"
            hint="Unique identifier (letters, numbers, hyphens only)"
          />

          {/* Region Name */}
          <Input
            id="regionName"
            name="regionName"
            type="text"
            label="Region Name"
            placeholder="e.g. West Region (Gujarat & Maharashtra)"
            required
            value={formData.regionName}
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

          {/* Parent Region (SearchableSelect) */}
          <SearchableSelect
            id="parentRegionId"
            name="parentRegionId"
            label="Parent Region (Optional)"
            placeholder="Search or select parent region..."
            options={parentSelectOptions}
            value={formData.parentRegionId}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                parentRegionId: e.target.value,
              }))
            }
          />

          {/* Created On (Read-only in edit mode) */}
          {editingRegion && (
            <div className="text-xs text-text-muted flex items-center justify-between p-2.5 bg-surface/60 rounded-lg border border-border">
              <span>Created Timestamp:</span>
              <span className="font-mono font-medium text-heading">
                {editingRegion.createdOn}
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
                Set region active or inactive
              </p>
            </div>

            <StatusSwitch
              id="region-modal-status"
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
              className="min-w-[100px] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingRegion ? 'Save Changes' : 'Add Region'}</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal
        isOpen={Boolean(regionToDelete)}
        onClose={() => setRegionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Region"
        message={
          regionToDelete ? (
            <span>
              Are you sure you want to delete{' '}
              <strong className="text-heading font-semibold">
                {regionToDelete.regionName}
              </strong>{' '}
              ({regionToDelete.regionCode})? This action cannot be undone.
            </span>
          ) : (
            'Are you sure you want to delete this region?'
          )
        }
        confirmText="Delete Region"
        confirmVariant="danger"
      />
    </div>
  );
}
