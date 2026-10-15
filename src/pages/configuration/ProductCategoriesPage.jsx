import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  FolderTree,
  Plus,
  Search,
  Pencil,
  ChevronRight,
  ChevronDown,
  Folder,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  AlertTriangle,
  Save,
  Eye,
} from 'lucide-react';
import { IconProductCategories } from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Input,
  SearchableSelect,
  Toggle,
  Badge,
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
import { formatDate } from '../../utils/dateUtils';
import { useProductCategoriesContext } from '../../context/ProductCategoriesContext';
import { useInquiriesContext } from '../../context/InquiriesContext';
import {
  buildTree,
  flattenVisible,
  getDescendantIds,
  getDropdownOptions,
  getPathLabel,
} from '../../utils/treeUtils';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  categoryCode: '',
  categoryName: '',
  parentCategoryId: '',
  isActive: true,
};

export default function ProductCategoriesPage() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryActive,
  } = useProductCategoriesContext();

  const { inquiries = [] } = useInquiriesContext();

  // Simulated initial loading delay
  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // Filter and Search Toolbar state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Tree expansion state (start with all categories expanded)
  const [expandedIds, setExpandedIds] = useState(() => {
    return new Set(categories.map((c) => c.categoryId));
  });

  // Ensure new categories get expanded when added
  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      categories.forEach((c) => next.add(c.categoryId));
      return next;
    });
  }, [categories]);

  // TanStack table state for resizable columns and sorting
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null); // View modal state
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  /* ── Expand / Collapse handler ── */
  function toggleExpand(catId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(categories.map((c) => c.categoryId)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  /* ── Filtered & Hierarchical Tree Computation ── */
  const visibleRows = useMemo(() => {
    const tree = buildTree(categories, {
      idKey: 'categoryId',
      parentKey: 'parentCategoryId',
      nameKey: 'categoryName',
      codeKey: 'categoryCode',
    });

    // If no search and no status filter, normal tree flattening
    if (!searchQuery.trim() && statusFilter === 'ALL') {
      return flattenVisible(tree, expandedIds);
    }

    const q = searchQuery.toLowerCase().trim();

    // Find all matching category IDs
    const matchingIds = new Set();
    categories.forEach((cat) => {
      const matchesSearch =
        !q ||
        cat.categoryCode.toLowerCase().includes(q) ||
        cat.categoryName.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && cat.isActive) ||
        (statusFilter === 'INACTIVE' && !cat.isActive);

      if (matchesSearch && matchesStatus) {
        matchingIds.add(cat.categoryId);
      }
    });

    // Also include all ancestors of matching nodes so hierarchy remains readable
    const visibleIdsWithAncestors = new Set(matchingIds);
    const catMap = new Map(categories.map((c) => [c.categoryId, c]));

    matchingIds.forEach((id) => {
      let curr = catMap.get(id);
      while (curr && curr.parentCategoryId) {
        visibleIdsWithAncestors.add(curr.parentCategoryId);
        curr = catMap.get(curr.parentCategoryId);
      }
    });

    // Flatten tree including visible nodes (ignore collapse state during search)
    const alwaysExpandDuringSearch = Boolean(q);
    const effectiveExpanded = alwaysExpandDuringSearch
      ? new Set(categories.map((c) => c.categoryId))
      : expandedIds;

    const flattened = flattenVisible(tree, effectiveExpanded);
    return flattened.filter((row) => visibleIdsWithAncestors.has(row.categoryId));
  }, [categories, expandedIds, searchQuery, statusFilter]);

  /* ── Form Validation ── */
  function validateField(name, value) {
    const targetId = editingCategory?.categoryId;

    switch (name) {
      case 'categoryCode': {
        const str = typeof value === 'string' ? value.trim().toUpperCase() : '';
        if (!str) return 'Category code is required.';
        if (str.length > 20) return 'Category code cannot exceed 20 characters.';
        if (!/^[A-Z0-9-]+$/.test(str)) {
          return 'Code must contain uppercase letters, numbers, and hyphens only.';
        }

        // Check unique code (case-insensitive)
        const duplicate = categories.find((c) => {
          if (editingCategory && c.categoryId === targetId) return false;
          return c.categoryCode.toUpperCase() === str;
        });
        if (duplicate) return 'A category with this code already exists.';
        return '';
      }
      case 'categoryName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Category name is required.';
        if (str.length > 100) return 'Category name cannot exceed 100 characters.';
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    ['categoryCode', 'categoryName'].forEach((field) => {
      const err = validateField(field, data[field]);
      if (err) errors[field] = err;
    });
    return errors;
  }

  /* ── Modal Open Handlers ── */
  function handleOpenAdd(parentCatId = null) {
    // Only top-level categories can be chosen as parent
    const targetParent = parentCatId
      ? categories.find((c) => c.categoryId === parentCatId && !c.parentCategoryId)
      : null;

    setEditingCategory(null);
    setFormData({
      categoryCode: '',
      categoryName: '',
      parentCategoryId: targetParent ? targetParent.categoryId : '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleOpenEdit(cat) {
    setEditingCategory(cat);
    setFormData({
      categoryCode: cat.categoryCode || '',
      categoryName: cat.categoryName || '',
      parentCategoryId: cat.parentCategoryId || '',
      isActive: Boolean(cat.isActive),
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingCategory(null);
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
      if (editingCategory) {
        await updateCategory(editingCategory.categoryId, formData);
      } else {
        await addCategory(formData);
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      toast.error('Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── Delete Handlers with Safety Blocks ── */
  function handleDeleteClick(cat) {
    const id = cat.categoryId;

    // 1. Block if category has children
    const hasChildren = categories.some((c) => c.parentCategoryId === id);
    if (hasChildren) {
      toast.error('Cannot delete. It has sub-categories.');
      return;
    }

    // 2. Block if category is used by any inquiry
    const usedCount = inquiries.filter(
      (inq) => inq.CategoryId === id || inq.categoryId === id
    ).length;

    if (usedCount > 0) {
      toast.error(
        `Cannot delete. Used by ${usedCount} ${usedCount === 1 ? 'inquiry' : 'inquiries'}. Deactivate it instead.`
      );
      return;
    }

    setCategoryToDelete(cat);
  }

  function handleConfirmDelete() {
    if (!categoryToDelete) return;
    deleteCategory(categoryToDelete.categoryId);
    setCategoryToDelete(null);
  }

  /* ── Parent Category Options for Add/Edit Modal (Strict 2-Level Limit: Root categories only) ── */
  const parentSelectOptions = useMemo(() => {
    // If editing a category that already has children, it cannot become a child of another category (must stay root)
    const hasChildren = editingCategory
      ? categories.some((c) => c.parentCategoryId === editingCategory.categoryId)
      : false;

    if (hasChildren) {
      return [{ value: '', label: '— None (Top-Level Category — Contains Sub-Categories) —' }];
    }

    // Only Top-Level categories (where !parentCategoryId) can be chosen as a parent
    const rootCategories = categories.filter((c) => {
      if (editingCategory && c.categoryId === editingCategory.categoryId) return false;
      return !c.parentCategoryId; // Only root categories
    });

    const baseOptions = rootCategories.map((cat) => ({
      value: cat.categoryId,
      label: `${cat.categoryName} (${cat.categoryCode})`,
    }));

    return [
      { value: '', label: '— None (Top-Level Category) —' },
      ...baseOptions,
    ];
  }, [categories, editingCategory]);

  /* ── TanStack Columns with Resizing Support ── */
  const columns = useMemo(
    () => [
      /* 1. CATEGORY CODE */
      columnHelper.accessor('categoryCode', {
        id: 'categoryCode',
        header: 'CATEGORY CODE',
        size: 140,
        minSize: 110,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setViewingCategory(row.original)}
            className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
          >
            {row.original.categoryCode}
          </button>
        ),
      }),
      columnHelper.accessor('categoryName', {
        id: 'categoryName',
        header: 'CATEGORY NAME',
        size: 340,
        minSize: 240,
        cell: ({ row }) => {
          const cat = row.original;
          const hasChildren = cat.hasChildren;
          const isExpanded = cat.isExpanded;
          const indentPx = (cat.depth || 0) * 24;

          return (
            <div
              className="flex items-center gap-1.5"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(cat.categoryId)}
                  className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-heading hover:bg-surface transition-colors cursor-pointer"
                  title={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
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
                {cat.depth === 0 ? (
                  <Folder
                    size={16}
                    className={cat.isActive ? 'text-primary shrink-0' : 'text-text-muted shrink-0'}
                  />
                ) : (
                  <Layers
                    size={15}
                    className={cat.isActive ? 'text-primary/80 shrink-0' : 'text-text-muted shrink-0'}
                  />
                )}
                <span
                  className={`text-sm font-medium truncate ${
                    cat.isActive ? 'text-heading' : 'text-text-muted line-through'
                  }`}
                  title={cat.categoryName}
                >
                  {cat.categoryName}
                </span>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('parentName', {
        id: 'parentName',
        header: 'PARENT CATEGORY',
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
        size: 130,
        minSize: 110,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <TableActions
            extraActions={
              !row.original.parentCategoryId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenAdd(row.original.categoryId)}
                  title="Add sub-category"
                  className="h-8 w-8 text-text-muted hover:text-primary hover:bg-surface transition-colors"
                >
                  <Plus size={15} aria-hidden="true" />
                </Button>
              )
            }
            onView={() => setViewingCategory(row.original)}
            onEdit={() => handleOpenEdit(row.original)}
            viewTitle="View category"
            editTitle="Edit category"
          />
        ),
      }),
    ],
    [categories, expandedIds, inquiries]
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
      <PageHeader
        title="Product Categories"
        icon={IconProductCategories}
        subtitle="Manage hierarchical precision metrology categories, parent-child structures & inquiry classification options."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpenAdd()}
            className="shadow-xs"
          >
            <Plus size={16} className="mr-1.5" />
            Add Category
          </Button>
        }
      />

      {/* ── Toolbar: Search, Status Filter & Tree View Helpers ── */}
      <FilterBar>
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Input
            id="search-product-categories"
            type="text"
            placeholder="Search by code or category name..."
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
      </FilterBar>

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
                    <FolderTree size={32} className="text-text-muted/50" />
                    <p className="font-semibold text-heading">
                      No categories match your filters
                    </p>
                    <p className="text-xs">
                      {searchQuery || statusFilter !== 'ALL'
                        ? 'Try resetting your search query or status filter.'
                        : 'Click "+ Add Category" to set up your product hierarchy.'}
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
          visibleRows.map((cat) => (
            <div
              key={cat.categoryId}
              className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setViewingCategory(cat)}
                      className="font-mono text-xs font-bold text-primary hover:underline text-left cursor-pointer"
                    >
                      {cat.categoryCode}
                    </button>
                    {cat.depth > 0 && (
                      <span className="text-2xs text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                        Level {cat.depth + 1}
                      </span>
                    )}
                  </div>
                  <h3 className={`text-sm font-semibold mt-1 ${cat.isActive ? 'text-heading' : 'text-text-muted line-through'}`}>
                    {cat.categoryName}
                  </h3>
                  {cat.parentName && (
                    <p className="text-xs text-text-muted">
                      Parent: <span className="text-text font-medium">{cat.parentName}</span>
                    </p>
                  )}
                </div>

                <span
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 select-none',
                    cat.isActive
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-danger/10 text-danger border border-danger/20',
                  ].join(' ')}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      cat.isActive ? 'bg-success' : 'bg-danger'
                    }`}
                    aria-hidden="true"
                  />
                  {cat.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center justify-between text-2xs text-text-muted pt-2 border-t border-border">
                <span className="font-mono">Created: {formatDate(cat.createdOn)}</span>
                <div className="flex items-center gap-1.5">
                  {!cat.parentCategoryId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAdd(cat.categoryId)}
                      title="Add sub-category"
                      className="text-xs"
                    >
                      <Plus size={13} className="mr-1" />
                      Add Sub
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewingCategory(cat)}
                    className="text-xs"
                  >
                    <Eye size={13} className="mr-1.5" />
                    View
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEdit(cat)}
                    className="text-xs"
                  >
                    <Pencil size={13} className="mr-1.5" />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-bg border border-border rounded-xl p-8 text-center text-text-muted">
            <FolderTree size={28} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-sm">No categories found</p>
            <p className="text-xs mt-1">Try adjusting your filters or add a new category.</p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Category Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edit Product Category' : 'Add New Product Category'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Category Code */}
          <Input
            id="categoryCode"
            name="categoryCode"
            type="text"
            label="Category Code"
            placeholder="e.g. CAT-GRAN-01"
            required
            value={formData.categoryCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setFormData((prev) => ({ ...prev, categoryCode: val }));
              if (formErrors.categoryCode) {
                setFormErrors((prev) => ({ ...prev, categoryCode: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('categoryCode', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, categoryCode: err }));
            }}
            error={formErrors.categoryCode}
            className="font-mono uppercase text-sm"
            hint="Unique identifier (letters, numbers, hyphens only)"
          />

          {/* Category Name */}
          <Input
            id="categoryName"
            name="categoryName"
            type="text"
            label="Category Name"
            placeholder="e.g. Granite Surface Plates & Comparator Stands"
            required
            value={formData.categoryName}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, categoryName: val }));
              if (formErrors.categoryName) {
                setFormErrors((prev) => ({ ...prev, categoryName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('categoryName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, categoryName: err }));
            }}
            error={formErrors.categoryName}
          />

          {/* Parent Category (SearchableSelect) */}
          <SearchableSelect
            id="parentCategoryId"
            name="parentCategoryId"
            label="Parent Category (Optional)"
            placeholder="Search or select parent category..."
            options={parentSelectOptions}
            value={formData.parentCategoryId}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                parentCategoryId: e.target.value,
              }))
            }
          />

          {/* Created On (Read-only in edit mode) */}
          {editingCategory && (
            <div className="text-xs text-text-muted flex items-center justify-between p-2.5 bg-surface/60 rounded-lg border border-border">
              <span>Created Date:</span>
              <span className="font-mono font-medium text-heading">
                {formatDate(editingCategory.createdOn)}
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
                Set category active or inactive
              </p>
            </div>

            <StatusSwitch
              id="category-modal-status"
              checked={Boolean(formData.isActive)}
              onChange={(checked) =>
                setFormData((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>

          {/* Modal Footer Actions */}
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
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── View Product Category Modal ── */}
      <Modal
        isOpen={Boolean(viewingCategory)}
        onClose={() => setViewingCategory(null)}
        title="Product Category Details"
        maxWidth="max-w-lg"
      >
        {viewingCategory && (
          <div className="space-y-4">
            {/* Header banner */}
            <div className="p-4 rounded-xl bg-surface/50 border border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <FolderTree size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-heading break-words leading-snug">
                    {viewingCategory.categoryName}
                  </h3>
                  <p className="text-xs text-text-muted font-mono mt-1">{viewingCategory.categoryCode}</p>
                </div>
              </div>
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none shrink-0 mt-0.5',
                  viewingCategory.isActive
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20',
                ].join(' ')}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    viewingCategory.isActive ? 'bg-success' : 'bg-danger'
                  }`}
                  aria-hidden="true"
                />
                {viewingCategory.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Category Code
                </span>
                <span className="font-mono text-sm font-semibold text-heading break-words">
                  {viewingCategory.categoryCode}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Category Type
                </span>
                <span className="text-xs font-medium text-heading">
                  {!viewingCategory.parentCategoryId ? 'Top-Level Category' : 'Sub-Category'}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1 sm:col-span-2">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Parent Category
                </span>
                <span className="text-xs text-text break-words block leading-relaxed">
                  {viewingCategory.parentName || '— (None / Top-Level)'}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Sub-Categories
                </span>
                <span className="text-xs font-medium text-heading">
                  {categories.filter(c => c.parentCategoryId === viewingCategory.categoryId).length} sub-categories
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Created On
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(viewingCategory.createdOn)}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-bold block">
                  Linked Inquiries
                </span>
                <span className="text-xs text-text">
                  {inquiries.filter(inq => inq.CategoryId === viewingCategory.categoryId || inq.categoryId === viewingCategory.categoryId).length} inquiries
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setViewingCategory(null)}
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
                  const cat = viewingCategory;
                  setViewingCategory(null);
                  handleOpenEdit(cat);
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
