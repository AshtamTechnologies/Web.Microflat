import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconEdit,
  IconView,
  IconCopy,
  IconSend,
  IconMail,
  IconClose,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  SearchableSelect,
  Badge,
  Modal,
  StatusBadge,
  PageHeader,
  TableToolbar,
  DataTable,
  TableActions,
  IconButton,
  ConfirmModal,
} from '../../components/ui';

import { useEmailTemplates } from '../../context/EmailTemplatesContext';
import { useAuthContext } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

// Module badge color mapping
const MODULE_COLORS = {
  VENDOR: 'info',
  INQUIRY: 'primary',
  QUOTATION: 'warning',
  PR: 'secondary',
  SALES_ORDER: 'success',
  AUTH: 'purple',
  MEETINGS: 'teal',
  DELEGATION: 'orange',
};

export default function EmailTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Connected to real Email Templates Context & API
  const {
    templates,
    modules,
    totalCount,
    isLoading,
    fetchTemplates,
    getTemplateById,
    deleteTemplate,
    toggleStatus,
    previewTemplate,
  } = useEmailTemplates();

  // Loading state when fetching single template details by ID
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  // Table filtering & pagination state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Query API with filters matching Swagger (Search, ModuleName, Status, PageNumber, PageSize)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates({
        Search: globalFilter.trim() || undefined,
        ModuleName: selectedModuleFilter !== 'ALL' ? selectedModuleFilter : undefined,
        Status: selectedStatusFilter !== 'ALL' ? selectedStatusFilter : undefined,
        PageNumber: pagination.pageIndex + 1,
        PageSize: pagination.pageSize,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    globalFilter,
    selectedModuleFilter,
    selectedStatusFilter,
    pagination.pageIndex,
    pagination.pageSize,
    fetchTemplates,
  ]);

  // Modals state
  const [viewingItem, setViewingItem] = useState(null); // Centered popup View modal
  const [previewItem, setPreviewItem] = useState(null); // Live preview modal
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null); // Delete modal

  // Live preview test values state
  const [previewValues, setPreviewValues] = useState({});

  // Reset filters
  const handleResetFilters = () => {
    setGlobalFilter('');
    setSelectedModuleFilter('ALL');
    setSelectedStatusFilter('ALL');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const hasActiveFilters = Boolean(
    globalFilter || selectedModuleFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
  );

  // Open Add Page
  const handleOpenAdd = () => {
    navigate('/configuration/email-templates/new');
  };

  // Open Edit Page
  const handleOpenEdit = (item) => {
    navigate(`/configuration/email-templates/${item.id}/edit`);
  };

  // Open View Modal by fetching complete template details via GET /api/email-templates/{id}
  const handleOpenView = async (item) => {
    if (!item?.id) return;
    try {
      setIsFetchingDetail(true);
      const fullDetail = await getTemplateById(item.id);
      setViewingItem(fullDetail || item);
    } catch {
      setViewingItem(item);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  // Open Live Preview modal by fetching complete template details via GET /api/email-templates/{id}
  const handleOpenPreview = async (item) => {
    if (!item?.id) return;
    try {
      setIsFetchingDetail(true);
      const fullDetail = await getTemplateById(item.id);
      const target = fullDetail || item;
      setPreviewItem(target);

      // Initialize all test marker input values as completely BLANK
      const sampleValues = {};
      (target.availablePlaceholders || []).forEach((placeholder) => {
        sampleValues[placeholder] = '';
      });

      setPreviewValues(sampleValues);
    } catch {
      setPreviewItem(item);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  // Delete Template via API
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    try {
      await deleteTemplate(deleteConfirmItem.id, deleteConfirmItem.templateName);
      setDeleteConfirmItem(null);
    } catch {
      // Error toast is handled inside deleteTemplate
    }
  };

  // Dynamic module filter options derived from active API modules
  const moduleOptions = useMemo(() => {
    if (modules && modules.length > 0) {
      return [
        { value: 'ALL', label: 'All Modules' },
        ...modules.map((m) => ({
          value: m.moduleCode,
          label: `${m.moduleName} (${m.moduleCode})`,
        })),
      ];
    }
    return [{ value: 'ALL', label: 'All Modules' }];
  }, [modules]);

  // Copy helper
  const handleCopy = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Columns definition for TanStack Table
  const columns = useMemo(
    () => [
      columnHelper.accessor('templateCode', {
        header: 'Template Code',
        size: 210,
        cell: (info) => {
          const code = info.getValue();
          return (
            <div className="flex items-center gap-1.5 group">
              <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-surface border border-border text-heading tracking-wide">
                {code}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(code, 'Code')}
                title="Copy Code"
                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-primary transition-opacity"
              >
                <IconCopy size={13} />
              </button>
            </div>
          );
        },
      }),

      columnHelper.accessor('templateName', {
        header: 'Template Name',
        size: 280,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span
              className="font-medium text-sm text-heading hover:text-primary cursor-pointer transition-colors"
              onClick={() => handleOpenView(row)}
            >
              {row.templateName}
            </span>
          );
        },
      }),

      columnHelper.accessor('moduleName', {
        header: 'Module',
        size: 130,
        cell: (info) => {
          const mod = info.getValue();
          const colorVariant = MODULE_COLORS[mod] || 'neutral';
          return (
            <Badge variant={colorVariant} size="sm">
              {mod}
            </Badge>
          );
        },
      }),

      columnHelper.accessor('status', {
        header: 'Status',
        size: 110,
        cell: (info) => {
          const status = info.getValue();
          return (
            <div className="flex items-center">
              <StatusBadge status={status} />
            </div>
          );
        },
      }),

      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 130,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <TableActions
              onView={() => handleOpenView(row)}
              onEdit={() => handleOpenEdit(row)}
              viewTitle="View Template Details"
              editTitle="Edit Template"
              extraActions={
                <IconButton
                  icon={IconSend}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenPreview(row)}
                  title="Live Test Preview"
                  aria-label="Live Test Preview"
                  className="hover:text-primary hover:bg-surface"
                />
              }
            />
          );
        },
      }),
    ],
    []
  );

  // TanStack table instance
  const table = useReactTable({
    data: templates,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Calculate live preview replacement
  const renderedSubject = useMemo(() => {
    if (!previewItem) return '';
    let result = previewItem.subject || '';
    Object.entries(previewValues).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        result = result.replaceAll(`{{${key}}}`, val);
      }
    });
    return result;
  }, [previewItem, previewValues]);

  const renderedBody = useMemo(() => {
    if (!previewItem) return '';
    let result = previewItem.body || '';
    Object.entries(previewValues).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        result = result.replaceAll(`{{${key}}}`, val);
      }
    });
    return result;
  }, [previewItem, previewValues]);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Email Templates"
        description="Configure standardized system email templates, dynamic placeholder markers, and HTML notifications."
        icon={IconMail}
        breadcrumbs={[
          { label: 'Administration', href: '/dashboard' },
          { label: 'Configuration', href: '/configuration/series' },
          { label: 'Email Templates' },
        ]}
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="self-start sm:self-auto shrink-0 shadow-xs"
          >
            <IconAdd size={16} className="mr-1.5" />
            Add Template
          </Button>
        }
      />

      {/* ── Table Toolbar with Search & Dropdown Filters (No KPI Bar) ── */}
      <TableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder="Search by code, template name, subject..."
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
            options={moduleOptions}
            value={selectedModuleFilter}
            onChange={(e) => {
              setSelectedModuleFilter(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full sm:w-40">
          <SearchableSelect
            id="filter-status"
            placeholder="All Status"
            searchPlaceholder="Search status..."
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
            value={selectedStatusFilter}
            onChange={(e) => {
              setSelectedStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>
      </TableToolbar>

      {/* ── TanStack DataTable with Pagination & Mobile Card Responsive View ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        totalCount={totalCount ?? templates.length}
        entityName="email templates"
        emptyTitle="No email templates found"
        emptyDescription={
          hasActiveFilters
            ? 'No templates match your selected search or filter criteria. Try clearing filters.'
            : 'No email templates have been configured yet.'
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
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="text-xs"
            >
              <IconAdd size={14} className="mr-1.5" />
              Add Template
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const item = row.original;
          return (
            <div className="p-4 bg-surface border border-border rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-bg border border-border text-heading">
                  {item.templateCode}
                </span>
                <StatusBadge status={item.status} />
              </div>

              <div>
                <h4
                  className="font-semibold text-sm text-heading hover:text-primary cursor-pointer transition-colors"
                  onClick={() => handleOpenView(item)}
                >
                  {item.templateName}
                </h4>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                  <strong>Subject:</strong> {item.subject}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                <Badge variant={MODULE_COLORS[item.moduleName] || 'neutral'} size="sm">
                  {item.moduleName}
                </Badge>

                <div className="w-auto shrink-0">
                  <TableActions
                    onView={() => handleOpenView(item)}
                    onEdit={() => handleOpenEdit(item)}
                    viewTitle="View Template Details"
                    editTitle="Edit Template"
                    extraActions={
                      <IconButton
                        icon={IconSend}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenPreview(item)}
                        title="Live Test Preview"
                        aria-label="Live Test Preview"
                        className="hover:text-primary hover:bg-bg"
                      />
                    }
                  />
                </div>
              </div>
            </div>
          );
        }}
      />

      {/* ── CENTERED POPUP VIEW MODAL (Like Preview Modal Style) ── */}
      {viewingItem && (
        <Modal
          isOpen={Boolean(viewingItem)}
          onClose={() => setViewingItem(null)}
          title={`Email Template — ${viewingItem.templateCode}`}
          size="2xl"
        >
          <div className="flex flex-col gap-4 py-2">
            {/* Header info cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-surface rounded-lg border border-border">
              <div>
                <span className="text-3xs text-text-muted uppercase font-semibold block">Module</span>
                <div className="mt-1">
                  <Badge variant={MODULE_COLORS[viewingItem.moduleName] || 'neutral'} size="sm">
                    {viewingItem.moduleName}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-3xs text-text-muted uppercase font-semibold block">Status</span>
                <div className="mt-1">
                  <StatusBadge status={viewingItem.status} />
                </div>
              </div>

              <div>
                <span className="text-3xs text-text-muted uppercase font-semibold block">Placeholders</span>
                <p className="text-xs font-mono font-medium text-heading mt-1">
                  {viewingItem.availablePlaceholders?.length || 0} registered
                </p>
              </div>

              <div>
                <span className="text-3xs text-text-muted uppercase font-semibold block">
                  {viewingItem.updatedOn ? 'Last Updated' : 'Created On'}
                </span>
                <p className="text-xs font-medium text-heading mt-1">
                  {formatDate(viewingItem.updatedOn || viewingItem.createdOn)}
                </p>
              </div>
            </div>

            {/* Template Name & Subject */}
            <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-bg">
              <div className="text-xs font-semibold text-text-muted uppercase">Template Name</div>
              <div className="text-sm font-semibold text-heading">{viewingItem.templateName}</div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-semibold text-text-muted uppercase">Subject Line</span>
                <button
                  type="button"
                  onClick={() => handleCopy(viewingItem.subject, 'Subject')}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <IconCopy size={12} /> Copy
                </button>
              </div>
              <div className="text-sm font-mono bg-surface p-2.5 rounded border border-border text-primary font-medium">
                {viewingItem.subject}
              </div>
            </div>

            {/* Placeholders */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-muted uppercase">
                Declared Dynamic Markers ({viewingItem.availablePlaceholders?.length || 0})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(viewingItem.availablePlaceholders || []).map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => handleCopy(`{{${ph}}}`, `{{${ph}}}`)}
                    className="font-mono text-xs px-2 py-0.5 rounded bg-surface hover:bg-primary/10 hover:text-primary border border-border text-heading transition-colors"
                    title="Click to copy marker"
                  >
                    {`{{${ph}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Rendered HTML Body Preview Card */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-muted uppercase">Email Body Content</span>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-surface px-3 py-2 border-b border-border flex items-center justify-between text-xs text-text-muted">
                  <span>HTML Email Preview</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(viewingItem.body, 'HTML Body')}
                    className="text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    <IconCopy size={12} /> Copy HTML
                  </button>
                </div>
                <div
                  className="p-4 bg-white text-gray-900 prose prose-sm max-w-none min-h-[160px] overflow-auto"
                  dangerouslySetInnerHTML={{ __html: viewingItem.body }}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  handleOpenPreview(item);
                }}
              >
                <IconSend size={14} className="mr-1.5" />
                Live Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  handleOpenEdit(item);
                }}
              >
                <IconEdit size={14} className="mr-1.5" />
                Edit Template
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── LIVE PREVIEW MODAL ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={`Live Test Preview — ${previewItem.templateCode}`}
          size="2xl"
        >
          <div className="flex flex-col gap-4 py-2">
            <p className="text-xs text-text-muted">
              Enter sample values for dynamic placeholders to verify how the final email subject and body will look to recipients.
            </p>

            {/* Test values input grid */}
            <div className="p-3 bg-surface rounded-lg border border-border flex flex-col gap-2.5 max-h-48 overflow-y-auto">
              <span className="text-xs font-semibold text-heading uppercase tracking-wide">
                Test Marker Values ({previewItem.availablePlaceholders?.length || 0})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(previewItem.availablePlaceholders || []).map((key) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-text-muted">{`{{${key}}}`}</label>
                    <input
                      type="text"
                      value={previewValues[key] || ''}
                      onChange={(e) =>
                        setPreviewValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="h-8 px-2.5 text-xs bg-bg border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      placeholder={`Enter value for ${key}...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Live Rendered Email Preview */}
            <div className="rounded-lg border border-border shadow-xs overflow-hidden">
              <div className="bg-surface px-4 py-3 border-b border-border flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted w-14 font-semibold uppercase">Subject:</span>
                  <span className="font-semibold text-heading text-sm">{renderedSubject}</span>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="w-14 font-semibold uppercase">From:</span>
                  <span>Micro-Flat ERP &lt;no-reply@microflat.example&gt;</span>
                </div>
              </div>

              <div
                className="p-6 bg-white text-gray-900 prose prose-sm max-w-none min-h-[220px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: renderedBody }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DETAIL FETCHING OVERLAY ── */}
      {isFetchingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 bg-surface px-4 py-3 rounded-xl border border-border shadow-lg">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-xs font-medium text-heading">Loading template details…</span>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmItem)}
        onClose={() => setDeleteConfirmItem(null)}
        onConfirm={handleDelete}
        title="Delete Email Template?"
        message={`Are you sure you want to delete template '${deleteConfirmItem?.templateCode}'? This action cannot be undone.`}
        confirmText="Delete Template"
        confirmVariant="danger"
      />
    </div>
  );
}
