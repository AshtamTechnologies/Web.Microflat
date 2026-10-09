import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  FileCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  FolderLock,
  Tag,
  Layers,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Toggle,
  TagInput,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
  StatusSwitch,
} from '../../components/ui';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  typeName: '',
  allowedExtensions: ['.pdf'],
  maxSizeMB: 25,
  isMandatory: false,
  isActive: true,
};

export default function DocumentTypesPage() {
  const {
    documentTypes,
    addDocumentType,
    updateDocumentType,
    deleteDocumentType,
  } = useDocumentTypesContext();

  const { documents = [] } = useInquiryDocumentsContext();

  // Simulated initial loading delay
  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // Table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = Add, object = Edit
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState(null);

  /* ── Validation ── */
  function validateField(name, value, allData = formData) {
    const targetId = editingItem?.documentTypeId || editingItem?.id;

    switch (name) {
      case 'typeName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Type name is required.';
        if (str.length > 100) return 'Type name cannot exceed 100 characters.';

        // Check case-insensitive uniqueness
        const duplicate = documentTypes.find((dt) => {
          const currentId = dt.documentTypeId || dt.id;
          if (editingItem && currentId === targetId) return false;
          return dt.typeName.toLowerCase() === str.toLowerCase();
        });
        if (duplicate) return 'A document type with this name already exists.';
        return '';
      }
      case 'allowedExtensions': {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one allowed extension is required (e.g. .pdf).';
        }
        return '';
      }
      case 'maxSizeMB': {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 500) {
          return 'Max size must be an integer between 1 and 500 MB.';
        }
        return '';
      }
      default:
        return '';
    }
  }

  function validateAll(data) {
    const errors = {};
    ['typeName', 'allowedExtensions', 'maxSizeMB'].forEach((field) => {
      const err = validateField(field, data[field], data);
      if (err) errors[field] = err;
    });
    return errors;
  }

  /* ── Handlers ── */
  function handleOpenAdd() {
    setEditingItem(null);
    setFormData({
      typeName: '',
      allowedExtensions: ['.pdf'],
      maxSizeMB: 25,
      isMandatory: false,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleOpenEdit(item) {
    setEditingItem(item);
    setFormData({
      typeName: item.typeName || '',
      allowedExtensions: Array.isArray(item.allowedExtensions)
        ? item.allowedExtensions
        : ['.pdf'],
      maxSizeMB: item.maxSizeMB || 25,
      isMandatory: Boolean(item.isMandatory),
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingItem(null);
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
      if (editingItem) {
        const id = editingItem.documentTypeId || editingItem.id;
        await updateDocumentType(id, formData);
      } else {
        await addDocumentType(formData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      toast.error('Failed to save document type.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeleteClick(item) {
    const id = item.documentTypeId || item.id;
    // Check usage across all inquiry documents
    const usedCount = documents.filter(
      (d) => d.documentTypeId === id || d.documentTypeId === item.id
    ).length;

    if (usedCount > 0) {
      toast.error(
        `Cannot delete. ${usedCount} document${usedCount === 1 ? '' : 's'} use this type.`
      );
      return;
    }

    setItemToDelete(item);
  }

  function handleConfirmDelete() {
    if (!itemToDelete) return;
    const id = itemToDelete.documentTypeId || itemToDelete.id;
    deleteDocumentType(id);
    setItemToDelete(null);
  }

  /* ── TanStack Columns ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('typeName', {
        id: 'typeName',
        header: 'Type Name',
        size: 200,
        minSize: 140,
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileCheck size={15} />
            </div>
            <span className="font-semibold text-heading text-sm">
              {row.original.typeName}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor('allowedExtensions', {
        id: 'allowedExtensions',
        header: 'Allowed Extensions',
        size: 260,
        minSize: 180,
        cell: ({ row }) => {
          const exts = Array.isArray(row.original.allowedExtensions)
            ? row.original.allowedExtensions
            : [];
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {exts.map((ext) => (
                <span
                  key={ext}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface border border-border text-text shadow-2xs"
                >
                  {ext}
                </span>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor('maxSizeMB', {
        id: 'maxSizeMB',
        header: 'Max Size',
        size: 130,
        minSize: 100,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm font-medium text-heading">
            {row.original.maxSizeMB} MB
          </span>
        ),
      }),
      columnHelper.accessor('isMandatory', {
        id: 'isMandatory',
        header: 'Mandatory for RFQ',
        size: 150,
        minSize: 120,
        cell: ({ row }) =>
          row.original.isMandatory ? (
            <Badge variant="warning" className="text-[11px] px-2 py-0.5">
              Required
            </Badge>
          ) : (
            <Badge variant="neutral" className="text-[11px] px-2 py-0.5 opacity-80">
              Optional
            </Badge>
          ),
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 130,
        minSize: 110,
        cell: ({ row }) => {
          const isActive =
            row.original.isActive !== undefined
              ? Boolean(row.original.isActive)
              : true;
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
              title="Edit document type"
              aria-label="Edit document type"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteClick(row.original)}
              className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all cursor-pointer shadow-2xs"
              title="Delete document type"
              aria-label="Delete document type"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      }),
    ],
    [documents]
  );

  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return documentTypes;
    const q = globalFilter.toLowerCase();
    return documentTypes.filter((dt) =>
      (dt.typeName || '').toLowerCase().includes(q)
    );
  }, [documentTypes, globalFilter]);

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
            <FileCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            Inquiry Document Types
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Configure allowed document attachments, allowed file extensions, file size limits & mandatory RFQ rules.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          className="self-start sm:self-auto shrink-0 shadow-xs"
        >
          <Plus size={16} className="mr-1.5" />
          Add Document Type
        </Button>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <Card padding="sm" className="bg-bg">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by document type name..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-bg border border-border rounded-lg text-text placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="text-xs text-text-muted self-end sm:self-center font-mono">
            {filteredData.length} {filteredData.length === 1 ? 'type' : 'types'}
          </div>
        </div>
      </Card>

      {/* ── Desktop View (md+): Document Types Table Container ── */}
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
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <Td><div className="h-4 bg-surface rounded w-32" /></Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <div className="h-4 bg-surface rounded w-12" />
                      <div className="h-4 bg-surface rounded w-12" />
                    </div>
                  </Td>
                  <Td><div className="h-4 bg-surface rounded w-16" /></Td>
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
                    <FileCheck size={32} className="text-text-muted/50" />
                    <p className="font-semibold text-heading">
                      No document types found
                    </p>
                    <p className="text-xs">
                      {globalFilter
                        ? 'Try adjusting your search keywords.'
                        : 'Click "+ Add Document Type" to create your first document category.'}
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
            <div key={`dt-skel-${i}`} className="bg-bg border border-border rounded-xl p-4 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-5 bg-surface rounded w-32" />
                <div className="h-5 bg-surface rounded w-16" />
              </div>
              <div className="h-4 bg-surface rounded w-1/2" />
            </div>
          ))
        ) : filteredData.length > 0 ? (
          filteredData.map((dt) => {
            const exts = Array.isArray(dt.allowedExtensions) ? dt.allowedExtensions : [];
            return (
              <div
                key={dt.documentTypeId || dt.id}
                className="bg-bg border border-border rounded-xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileCheck size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-heading text-sm">{dt.typeName}</h3>
                      <p className="text-xs text-text-muted font-mono">{dt.maxSizeMB} MB max size</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={[
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium select-none',
                        dt.isActive !== false
                          ? 'bg-success/10 text-success border border-success/20'
                          : 'bg-danger/10 text-danger border border-danger/20',
                      ].join(' ')}
                    >
                      <span
                        className={`w-1 h-1 rounded-full shrink-0 ${
                          dt.isActive !== false ? 'bg-success' : 'bg-danger'
                        }`}
                        aria-hidden="true"
                      />
                      {dt.isActive !== false ? 'Active' : 'Inactive'}
                    </span>

                    {dt.isMandatory ? (
                      <Badge variant="warning" className="text-[11px] px-2 py-0.5 shrink-0">
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[11px] px-2 py-0.5 shrink-0 opacity-80">
                        Optional
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[11px] text-text-muted">Allowed Extensions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {exts.map((ext) => (
                      <span
                        key={ext}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface border border-border text-text"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(dt)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(dt)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-bg border border-border rounded-xl p-8 text-center text-text-muted">
            <FileCheck size={28} className="mx-auto text-text-muted/50 mb-2" />
            <p className="font-semibold text-heading text-sm">No document types found</p>
            <p className="text-xs mt-1">Click &quot;+ Add Document Type&quot; to create one.</p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Document Type Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Document Type' : 'Add New Document Type'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Type Name */}
          <Input
            id="typeName"
            name="typeName"
            type="text"
            label="Type Name"
            placeholder="e.g. Quality Inspection Report"
            required
            value={formData.typeName}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, typeName: val }));
              if (formErrors.typeName) {
                setFormErrors((prev) => ({ ...prev, typeName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('typeName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, typeName: err }));
            }}
            error={formErrors.typeName}
          />

          {/* Allowed Extensions (TagInput) */}
          <TagInput
            id="allowedExtensions"
            name="allowedExtensions"
            label="Allowed File Extensions"
            placeholder="Type extension (.pdf, .docx) & press Enter"
            required
            value={formData.allowedExtensions}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, allowedExtensions: val }));
              if (formErrors.allowedExtensions) {
                setFormErrors((prev) => ({ ...prev, allowedExtensions: '' }));
              }
            }}
            error={formErrors.allowedExtensions}
            hint="Format: .pdf, .docx, .dwg, .png, etc."
          />

          {/* Max Size in MB */}
          <Input
            id="maxSizeMB"
            name="maxSizeMB"
            type="number"
            min={1}
            max={500}
            label="Max File Size Limit (MB)"
            placeholder="25"
            required
            value={formData.maxSizeMB}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, maxSizeMB: val }));
              if (formErrors.maxSizeMB) {
                setFormErrors((prev) => ({ ...prev, maxSizeMB: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('maxSizeMB', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, maxSizeMB: err }));
            }}
            error={formErrors.maxSizeMB}
            hint="Maximum allowed size per single uploaded file (1 - 500 MB)"
          />

          {/* Mandatory Toggle */}
          <div className="pt-2 border-t border-border">
            <Toggle
              checked={formData.isMandatory}
              onChange={(checked) =>
                setFormData((prev) => ({ ...prev, isMandatory: checked }))
              }
              label="Mandatory for RFQ Inquiry"
              description="Inquiries show a warning badge until at least one document of this type is attached."
            />
          </div>

          {/* Status Switch (Active / Inactive) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-semibold text-heading block">
                Status
              </label>
              <p className="text-xs text-text-muted mt-0.5">
                Set document type active or inactive
              </p>
            </div>

            <StatusSwitch
              id="doctype-modal-status"
              checked={formData.isActive !== undefined ? formData.isActive : true}
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
              {editingItem ? 'Save Changes' : 'Create Document Type'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Document Type?"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-heading font-semibold">
              {itemToDelete?.typeName}
            </strong>
            ? This configuration will be permanently removed.
          </>
        }
        confirmText="Delete Document Type"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
