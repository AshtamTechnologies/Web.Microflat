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
  IconClose,
  IconDocumentTypes,
  IconEdit,
  IconSearch,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  Textarea,
  SearchableSelect,
  Badge,
  Modal,
  TagInput,
  Card,
  StatusSwitch,
  StatusBadge,
  PageHeader,
  TableToolbar,
  DataTable,
  TableActions,
} from '../../components/ui';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const INITIAL_FORM = {
  moduleId: '',
  documentTypeName: '',
  description: '',
  maxFileSizeMB: 5,
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
  isActive: true,
};

export default function DocumentTypesPage() {
  const {
    documentTypes = [],
    modules = [],
    isLoading,
    fetchDocumentTypes,
    fetchDocumentTypeById,
    addDocumentType,
    updateDocumentType,
    updateDocumentTypeStatus,
  } = useDocumentTypesContext();

  // Table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = Add, object = Edit
  const [viewingItem, setViewingItem] = useState(null); // View modal state
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger backend API filter query when module or status filter changes
  useEffect(() => {
    const apiParams = {};
    if (selectedModuleFilter !== 'ALL') {
      apiParams.moduleId = Number(selectedModuleFilter);
    }
    if (selectedStatusFilter === 'ACTIVE') {
      apiParams.isActive = true;
    } else if (selectedStatusFilter === 'INACTIVE') {
      apiParams.isActive = false;
    }
    fetchDocumentTypes(apiParams);
  }, [selectedModuleFilter, selectedStatusFilter, fetchDocumentTypes]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [globalFilter, selectedModuleFilter, selectedStatusFilter]);

  // Module options for form select & filter select
  const moduleOptions = useMemo(() => {
    return (modules || []).map((m) => ({
      value: String(m.id),
      label: `${m.moduleCode} — ${m.moduleName}`,
    }));
  }, [modules]);

  const moduleFilterOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Modules' },
      ...moduleOptions,
    ];
  }, [moduleOptions]);

  const statusFilterOptions = [
    { value: 'ALL', label: 'All Status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];

  const hasActiveFilters = Boolean(
    globalFilter.trim() || selectedModuleFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
  );

  function handleResetFilters() {
    setGlobalFilter('');
    setSelectedModuleFilter('ALL');
    setSelectedStatusFilter('ALL');
  }

  /* ── Validation ── */
  function validateField(name, value, allData = formData) {
    const targetId = editingItem?.id || editingItem?.documentTypeId;

    switch (name) {
      case 'moduleId': {
        if (!value) return 'Please select a module.';
        return '';
      }
      case 'documentTypeName': {
        const str = typeof value === 'string' ? value.trim() : '';
        if (!str) return 'Document type name is required.';
        if (str.length > 100) return 'Name cannot exceed 100 characters.';

        // Check duplicate name within the same module
        const duplicate = documentTypes.find((dt) => {
          const currentId = dt.id || dt.documentTypeId;
          if (editingItem && String(currentId) === String(targetId)) return false;
          const sameModule = String(dt.moduleId) === String(allData.moduleId);
          const sameName = (dt.documentTypeName || dt.typeName || '').toLowerCase() === str.toLowerCase();
          return sameModule && sameName;
        });
        if (duplicate) return 'A document type with this name already exists in this module.';
        return '';
      }
      case 'allowedExtensions': {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one allowed extension is required (e.g. .pdf).';
        }
        return '';
      }
      case 'maxFileSizeMB': {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 500) {
          return 'Max file size must be between 1 and 500 MB.';
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
    ['moduleId', 'documentTypeName', 'allowedExtensions', 'maxFileSizeMB', 'description'].forEach((field) => {
      const err = validateField(field, data[field], data);
      if (err) errors[field] = err;
    });
    return errors;
  }

  /* ── Form Population Helper ── */
  function populateForm(item) {
    if (!item) return;

    let rawExtensions = [];
    if (Array.isArray(item.allowedExtensionList) && item.allowedExtensionList.length > 0) {
      rawExtensions = item.allowedExtensionList;
    } else if (Array.isArray(item.allowedExtensions)) {
      rawExtensions = item.allowedExtensions;
    } else if (typeof item.allowedExtensions === 'string' && item.allowedExtensions.trim()) {
      rawExtensions = item.allowedExtensions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    }

    setFormData({
      moduleId: item.moduleId !== null && item.moduleId !== undefined ? String(item.moduleId) : '',
      documentTypeName: item.documentTypeName || item.typeName || '',
      description: item.description || '',
      maxFileSizeMB: Number(item.maxFileSizeMB !== undefined ? item.maxFileSizeMB : item.maxSizeMB) || 5,
      allowedExtensions: rawExtensions.length > 0 ? rawExtensions : ['.pdf'],
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
    });
  }

  /* ── Handlers ── */
  function handleOpenAdd() {
    setEditingItem(null);
    setFormData({
      moduleId: modules.length > 0 ? String(modules[0].id) : '',
      documentTypeName: '',
      description: '',
      maxFileSizeMB: 5,
      allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleOpenEdit(item) {
    const id = item.id || item.documentTypeId;
    setEditingItem(item);
    populateForm(item);
    setFormErrors({});
    setIsModalOpen(true);
    setIsFetchingDetail(true);

    try {
      // Fetch latest document type data from GET /api/document-types/{id}
      const fresh = await fetchDocumentTypeById(id);
      if (fresh) {
        setEditingItem(fresh);
        populateForm(fresh);
      }
    } catch (err) {
      // Error handled with toast in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  async function handleOpenView(item) {
    const id = item.id || item.documentTypeId;
    setViewingItem(item);
    setIsFetchingDetail(true);

    try {
      // Fetch latest document type data from GET /api/document-types/{id}
      const fresh = await fetchDocumentTypeById(id);
      if (fresh) {
        setViewingItem(fresh);
      }
    } catch (err) {
      // Error handled with toast in context
    } finally {
      setIsFetchingDetail(false);
    }
  }

  function handleCloseModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsFetchingDetail(false);
  }

  async function handleFormSubmit(e) {
    if (e) e.preventDefault();
    const errors = validateAll(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstKey = Object.keys(errors)[0];
      toast.error(errors[firstKey] || 'Please fix the required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        moduleId: Number(formData.moduleId),
        documentTypeName: formData.documentTypeName.trim(),
        description: formData.description.trim(),
        maxFileSizeMB: Number(formData.maxFileSizeMB),
        allowedExtensions: formData.allowedExtensions.join(','),
      };

      if (editingItem) {
        const id = editingItem.id || editingItem.documentTypeId;
        await updateDocumentType(id, payload);

        // If status changed in edit form, update via PATCH /api/document-types/{id}/status
        if (editingItem.isActive !== formData.isActive) {
          await updateDocumentTypeStatus(id, formData.isActive);
        }
      } else {
        const created = await addDocumentType(payload);
        const newId = created?.id || created?.documentTypeId;

        // If user set active status on create, update via PATCH /api/document-types/{id}/status
        if (newId && formData.isActive === false) {
          await updateDocumentTypeStatus(newId, false);
        }
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData(INITIAL_FORM);
      setFormErrors({});
    } catch (err) {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ── TanStack Columns ── */
  const columns = useMemo(
    () => [
      columnHelper.accessor('documentTypeName', {
        id: 'documentTypeName',
        header: 'Document Type Name',
        size: 260,
        minSize: 180,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-semibold text-heading text-sm break-words">
              {row.original.documentTypeName || row.original.typeName}
            </div>
            {row.original.description && (
              <p className="text-2xs text-text-muted line-clamp-1 mt-0.5" title={row.original.description}>
                {row.original.description}
              </p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('moduleCode', {
        id: 'moduleCode',
        header: 'Module',
        size: 150,
        minSize: 120,
        cell: ({ row }) => {
          const modCode = row.original.moduleCode;
          const matchedModule = modules.find((m) => m.id === row.original.moduleId);
          return (
            <Badge variant="primary" className="text-2xs font-mono font-semibold px-2 py-0.5 uppercase tracking-wide">
              {modCode || (matchedModule ? matchedModule.moduleCode : 'GENERAL')}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('allowedExtensions', {
        id: 'allowedExtensions',
        header: 'Allowed Extensions',
        size: 240,
        minSize: 160,
        cell: ({ row }) => {
          const exts = Array.isArray(row.original.allowedExtensionList) && row.original.allowedExtensionList.length > 0
            ? row.original.allowedExtensionList
            : Array.isArray(row.original.allowedExtensions)
              ? row.original.allowedExtensions
              : typeof row.original.allowedExtensions === 'string' && row.original.allowedExtensions.trim()
                ? row.original.allowedExtensions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
                : ['.pdf'];

          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {exts.map((ext) => (
                <span
                  key={ext}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono font-medium bg-surface border border-border text-heading shadow-2xs"
                >
                  {ext}
                </span>
              ))}
            </div>
          );
        },
      }),
      columnHelper.accessor('maxFileSizeMB', {
        id: 'maxFileSizeMB',
        header: 'Max Size',
        size: 110,
        minSize: 90,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm font-medium text-heading">
            {row.original.maxFileSizeMB || row.original.maxSizeMB || 5} MB
          </span>
        ),
      }),
      columnHelper.accessor('isActive', {
        id: 'isActive',
        header: 'STATUS',
        size: 110,
        minSize: 90,
        cell: ({ row }) => (
          <StatusBadge status={row.original.isActive} size="sm" />
        ),
      }),
      columnHelper.accessor('createdOn', {
        id: 'createdOn',
        header: 'Created On',
        size: 140,
        minSize: 110,
        cell: ({ row }) => (
          <span className="text-xs text-text-muted whitespace-nowrap">
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
            viewTitle="View document type"
            editTitle="Edit document type"
          />
        ),
      }),
    ],
    [modules]
  );

  /* ── Filtered & Searched Data (Global search) ── */
  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return documentTypes || [];

    const q = globalFilter.toLowerCase();
    return (documentTypes || []).filter((dt) => {
      const nameMatch = (dt.documentTypeName || dt.typeName || '').toLowerCase().includes(q);
      const descMatch = (dt.description || '').toLowerCase().includes(q);
      const modMatch = (dt.moduleCode || '').toLowerCase().includes(q);
      const extMatch = (dt.allowedExtensions || '').toLowerCase().includes(q);
      return nameMatch || descMatch || modMatch || extMatch;
    });
  }, [documentTypes, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Document Types"
        icon={<IconDocumentTypes className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle="Configure allowable document attachments, extensions, file size limits, and module mappings."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Document Type
          </Button>
        }
      />

      {/* ── Standard Table Toolbar with Search, Filters & Reset Button ── */}
      <TableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder="Search by name, description, module..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
        resetLabel="Reset"
      >
        {/* Module Filter Dropdown */}
        <div className="w-full sm:w-56">
          <SearchableSelect
            id="filter-module"
            placeholder="All Modules"
            searchPlaceholder="Search modules..."
            options={moduleFilterOptions}
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full sm:w-40">
          <SearchableSelect
            id="filter-status"
            placeholder="All Status"
            searchPlaceholder="Search status..."
            options={statusFilterOptions}
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable with Pagination ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={filteredData.length}
        entityName="document types"
        emptyTitle="No document types found"
        emptyDescription={
          hasActiveFilters
            ? 'Try clearing or changing your search filters to find what you are looking for.'
            : 'No document types have been configured yet.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-primary"
            >
              Clear filters
            </Button>
          ) : null
        }
        renderMobileCard={(row) => {
          const dt = row.original;
          const id = dt.id || dt.documentTypeId;
          const exts = Array.isArray(dt.allowedExtensionList) && dt.allowedExtensionList.length > 0
            ? dt.allowedExtensionList
            : Array.isArray(dt.allowedExtensions)
              ? dt.allowedExtensions
              : typeof dt.allowedExtensions === 'string' && dt.allowedExtensions.trim()
                ? dt.allowedExtensions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
                : ['.pdf'];

          return (
            <Card
              key={id}
              padding="sm"
              className="bg-bg border border-border rounded-xl shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-heading text-sm">
                      {dt.documentTypeName || dt.typeName}
                    </h3>
                    <Badge variant="primary" className="text-2xs font-mono px-1.5 py-0 uppercase">
                      {dt.moduleCode || 'GENERAL'}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted font-mono mt-0.5">
                    {dt.maxFileSizeMB || dt.maxSizeMB || 5} MB max size
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={dt.isActive} size="sm" />
                </div>
              </div>

              {dt.description && (
                <p className="text-xs text-text-muted line-clamp-2">
                  {dt.description}
                </p>
              )}

              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-2xs text-text-muted">Allowed Extensions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {exts.map((ext) => (
                    <span
                      key={ext}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-mono font-medium bg-surface border border-border text-heading"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenView(dt)}
                  className="text-xs"
                >
                  <IconView size={13} className="mr-1.5" />
                  View
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(dt)}
                  className="text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" />
                  Edit
                </Button>
              </div>
            </Card>
          );
        }}
      />

      {/* ── Add / Edit Document Type Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Document Type' : 'Add New Document Type'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Module Select */}
          <SearchableSelect
            id="moduleId"
            name="moduleId"
            label="Module"
            required
            value={formData.moduleId}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, moduleId: val }));
              if (formErrors.moduleId) {
                setFormErrors((prev) => ({ ...prev, moduleId: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('moduleId', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, moduleId: err }));
            }}
            options={moduleOptions}
            placeholder="Select Module"
            searchPlaceholder="Search modules..."
            error={formErrors.moduleId}
          />

          {/* Document Type Name */}
          <Input
            id="documentTypeName"
            name="documentTypeName"
            label="Document Type Name"
            placeholder="e.g. Bank Cancelled Cheque, GST Certificate"
            required
            value={formData.documentTypeName}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, documentTypeName: val }));
              if (formErrors.documentTypeName) {
                setFormErrors((prev) => ({ ...prev, documentTypeName: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('documentTypeName', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, documentTypeName: err }));
            }}
            error={formErrors.documentTypeName}
          />

          {/* Description */}
          <Textarea
            id="description"
            name="description"
            label="Description"
            placeholder="Brief explanation of when and why this document is required..."
            rows={3}
            value={formData.description}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, description: val }));
              if (formErrors.description) {
                setFormErrors((prev) => ({ ...prev, description: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('description', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, description: err }));
            }}
            error={formErrors.description}
            hint="Maximum 250 characters"
          />

          {/* Max File Size (MB) */}
          <Input
            id="maxFileSizeMB"
            name="maxFileSizeMB"
            label="Max File Size (MB)"
            type="number"
            min={1}
            max={500}
            required
            value={formData.maxFileSizeMB}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, maxFileSizeMB: val }));
              if (formErrors.maxFileSizeMB) {
                setFormErrors((prev) => ({ ...prev, maxFileSizeMB: '' }));
              }
            }}
            onBlur={(e) => {
              const err = validateField('maxFileSizeMB', e.target.value);
              if (err) setFormErrors((prev) => ({ ...prev, maxFileSizeMB: err }));
            }}
            error={formErrors.maxFileSizeMB}
            hint="Maximum allowed size per single uploaded file (1 - 500 MB)"
          />

          {/* Allowed Extensions (TagInput) */}
          <TagInput
            id="allowedExtensions"
            name="allowedExtensions"
            label="Allowed File Extensions"
            placeholder="Type extension (.pdf, .jpg) & press Enter"
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
            hint="Format: .pdf, .jpg, .jpeg, .png, .docx, .xlsx"
          />

          {/* Status Switch (Active / Inactive) for Create & Edit */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <div>
              <span className="mf-label block">Status</span>
              <p className="text-xs text-text-muted mt-0.5">
                Set document type active or inactive
              </p>
            </div>

            <StatusSwitch
              id="doctype-modal-status"
              checked={formData.isActive !== false}
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
              disabled={isSubmitting}
              className="justify-center font-semibold shadow-2xs"
            >
              {editingItem ? 'Save Changes' : 'Save Document Type'}
            </SaveButton>
          </div>
        </form>
      </Modal>

      {/* ── View Document Type Modal ── */}
      <Modal
        isOpen={Boolean(viewingItem)}
        onClose={() => setViewingItem(null)}
        title="Document Type Details"
        maxWidth="max-w-lg"
      >
        {viewingItem && (
          <div className="space-y-4">
            {/* Header banner */}
            <div className="p-4 rounded-xl bg-surface/50 border border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <IconDocumentTypes size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-heading break-words leading-snug">
                      {viewingItem.documentTypeName || viewingItem.typeName}
                    </h3>
                    <Badge variant="primary" className="text-2xs font-mono uppercase px-2 py-0.5">
                      {viewingItem.moduleCode || 'GENERAL'}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-1">Module ID: {viewingItem.moduleId || '—'}</p>
                </div>
              </div>

              <StatusBadge status={viewingItem.isActive} size="sm" />
            </div>

            {/* Description */}
            {viewingItem.description && (
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="view-field-label mf-detail-label">
                  Description
                </span>
                <p className="text-sm text-text leading-relaxed">
                  {viewingItem.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="view-field-label mf-detail-label">
                  Max File Size Limit
                </span>
                <span className="font-mono text-sm font-semibold text-heading">
                  {viewingItem.maxFileSizeMB || viewingItem.maxSizeMB || 5} MB
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                <span className="view-field-label mf-detail-label">
                  Created Date
                </span>
                <span className="text-sm text-heading">
                  {formatDate(viewingItem.createdOn || viewingItem.createdAt)}
                </span>
              </div>

              <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1 sm:col-span-2">
                <span className="view-field-label mf-detail-label">
                  Allowed Extensions
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {(
                    Array.isArray(viewingItem.allowedExtensionList) && viewingItem.allowedExtensionList.length > 0
                      ? viewingItem.allowedExtensionList
                      : Array.isArray(viewingItem.allowedExtensions)
                        ? viewingItem.allowedExtensions
                        : typeof viewingItem.allowedExtensions === 'string' && viewingItem.allowedExtensions.trim()
                          ? viewingItem.allowedExtensions.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
                          : ['.pdf']
                  ).map((ext) => (
                    <span
                      key={ext}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-surface border border-border text-heading shadow-2xs"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <CancelButton
                onClick={() => setViewingItem(null)}
                className="justify-center"
              >
                Close
              </CancelButton>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  handleOpenEdit(item);
                }}
                className="justify-center font-semibold shadow-2xs"
              >
                <IconEdit size={15} className="mr-1.5 shrink-0" aria-hidden="true" />
                Edit Document Type
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
