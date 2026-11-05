/**
 * SeriesSetupPage.jsx — Document Series Setup screen for MicroFlat ERP.
 *
 * Implements Module-based Series Architecture per 4 Nov 2026 API update:
 * - Left panel: Modules loaded via GET /api/modules?isActive=true
 * - Active version: GET /api/document-series?moduleId={id}&currentOnly=true
 * - Version history: GET /api/document-series?moduleId={id}
 * - Add new version: POST /api/document-series (body: { moduleId, prefix, ... })
 * - Edit unused version: PUT /api/document-series/{id} (isUsed = false)
 * - Delete unused version: DELETE /api/document-series/{id} (isUsed = false)
 * - Route param: /configuration/series/:docType (maps to moduleCode e.g. PO, INQUIRY, QUOTATION, ORDER_CONFIRMATION, PROJECT)
 * - Read-only for non-admin users
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import {
  IconAdd,
  IconEdit,
  IconHistory,
  IconLayers,
  IconReset,
  IconSeriesSetup,
  IconSparkles,
  IconView,
  IconShoppingCart,
  IconPR,
  IconInquiry,
  IconDocument,
  IconPackageCheck,
  IconReceipt,
  IconLock,
} from '../../constants/icons';

import {
  Card,
  Input,
  DatePicker,
  SearchableSelect,
  Button,
  SaveButton,
  CancelButton,
  Badge,
  Modal,
  ConfirmModal,
  DataTable,
  TableActions,
} from '../../components/ui';
import SubSidebar from '../../components/layout/SubSidebar';
import { documentSeriesService } from '../../services';
import { useSeriesContext } from '../../context/SeriesContext';
import { useAuthContext } from '../../context/AuthContext';
import {
  buildSampleNumber,
  formatSeriesNumber,
  formatSeriesPattern,
  normalizeDateString,
  getSeriesStatus,
} from '../../utils/seriesUtils';
import { formatDate } from '../../utils/dateUtils';

const SEPARATOR_OPTIONS = [
  { value: '-', label: 'Hyphen ( - )' },
  { value: '/', label: 'Slash ( / )' },
  { value: '_', label: 'Underscore ( _ )' },
  { value: 'None', label: 'None (No separator)' },
];

const YEAR_FORMAT_OPTIONS = [
  { value: 'YYYY', label: 'YYYY (e.g. 2026)' },
  { value: 'YY', label: 'YY (e.g. 26)' },
  { value: 'NONE', label: 'None (No Year)' },
];

const RESET_COUNTER_OPTIONS = [
  { value: 'YEARLY', label: 'Yearly (Resets on Jan 1st)' },
  { value: 'NEVER', label: 'Never (Continuous Sequential)' },
  { value: 'MONTHLY', label: 'Monthly (Resets on 1st of month)' },
];

// Fallback modules matching backend requirement if API has not seeded or is offline
const FALLBACK_MODULES = [
  { id: 1, moduleId: 1, moduleCode: 'PO', moduleName: 'Purchase Order', defaultPrefix: 'PO' },
  { id: 2, moduleId: 2, moduleCode: 'PR', moduleName: 'Purchase Requisition', defaultPrefix: 'PR' },
  { id: 3, moduleId: 3, moduleCode: 'INQUIRY', moduleName: 'Inquiry', defaultPrefix: 'INQ' },
  { id: 4, moduleId: 4, moduleCode: 'QUOTATION', moduleName: 'Quotation', defaultPrefix: 'QTN' },
  { id: 5, moduleId: 5, moduleCode: 'ORDER_CONFIRMATION', moduleName: 'Order Confirmation', defaultPrefix: 'ORD' },
  { id: 6, moduleId: 6, moduleCode: 'PROJECT', moduleName: 'Project', defaultPrefix: 'PRJ' },
  { id: 7, moduleId: 7, moduleCode: 'INVOICE', moduleName: 'Invoice', defaultPrefix: 'INV' },
];

// Icon mapping helper for modules
function getModuleIcon(code = '') {
  const c = (code || '').toUpperCase();
  if (c.includes('PO') || c.includes('PURCHASE_ORDER')) return IconShoppingCart;
  if (c.includes('PR') || c.includes('REQUISITION')) return IconPR;
  if (c.includes('INQ')) return IconInquiry;
  if (c.includes('QTN') || c.includes('QUOTATION')) return IconDocument;
  if (c.includes('ORDER')) return IconPackageCheck;
  if (c.includes('PROJ')) return IconLayers;
  if (c.includes('INV')) return IconReceipt;
  return IconSeriesSetup;
}

export default function SeriesSetupPage() {
  const { docType: rawDocType } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // Role verification: only Admin or Super Admin can create, edit, or delete series versions
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const roleNames = [
      user.primaryRole,
      user.role,
      ...(Array.isArray(user.roles) ? user.roles.map((r) => (typeof r === 'string' ? r : r.roleName)) : []),
    ]
      .filter(Boolean)
      .map((r) => String(r).toLowerCase());

    return roleNames.some((r) => r.includes('admin'));
  }, [user]);

  // Context methods for series (now module-based)
  const {
    fetchVersionsForModule,
    fetchActiveVersion,
    getVersionsFor,
    getActiveVersion,
    addVersion,
    updateVersion,
    deleteVersion,
    isLoading,
  } = useSeriesContext();

  // State: Dynamic modules from GET /api/modules?isActive=true
  const [modules, setModules] = useState([]);
  const [isModulesLoading, setIsModulesLoading] = useState(true);

  // Load modules on mount
  useEffect(() => {
    let isMounted = true;
    async function loadModules() {
      try {
        setIsModulesLoading(true);
        const data = await documentSeriesService.listModules({ isActive: true });
        if (!isMounted) return;
        setModules(Array.isArray(data) && data.length > 0 ? data : []);
      } catch (err) {
        console.warn('Failed to load modules from API, using fallback modules list.', err);
        if (isMounted) setModules([]);
      } finally {
        if (isMounted) setIsModulesLoading(false);
      }
    }
    loadModules();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute secondary sidebar items: from backend modules or fallback list
  const sidebarItems = useMemo(() => {
    const sourceList = modules.length > 0 ? modules : FALLBACK_MODULES;

    return sourceList.map((m) => {
      const code = (m.moduleCode || '').trim();
      const key = (code || m.moduleName || String(m.id)).toLowerCase();

      return {
        id: m.id,
        key,
        label: m.moduleName || code,
        shortLabel: code || m.moduleName,
        icon: getModuleIcon(code),
        path: `/configuration/series/${key}`,
        moduleId: m.id,
        moduleCode: code,
        moduleName: m.moduleName || code,
        defaultPrefix: (code.length >= 2 && code.length <= 6 ? code : code.slice(0, 3) || 'DOC').toUpperCase(),
      };
    });
  }, [modules]);

  // Current selected module
  const currentModule = useMemo(() => {
    const targetKey = (rawDocType || 'po').toLowerCase();
    const matched = sidebarItems.find(
      (item) =>
        item.key === targetKey ||
        String(item.moduleId) === targetKey ||
        (item.moduleCode || '').toLowerCase() === targetKey
    );
    return matched || sidebarItems[0] || {
      key: 'po',
      label: 'Purchase Order',
      shortLabel: 'PO',
      moduleId: 1,
      moduleCode: 'PO',
      moduleName: 'Purchase Order',
      defaultPrefix: 'PO',
    };
  }, [rawDocType, sidebarItems]);

  const activeModuleId = currentModule.moduleId;

  // Fetch active version and all versions for this module from API
  useEffect(() => {
    if (activeModuleId) {
      fetchActiveVersion(activeModuleId);
      fetchVersionsForModule(activeModuleId);
    }
  }, [activeModuleId, fetchActiveVersion, fetchVersionsForModule]);

  // Read current active and historical versions from context cache
  const activeVersion = useMemo(() => getActiveVersion(activeModuleId), [getActiveVersion, activeModuleId]);
  const versions = useMemo(() => getVersionsFor(activeModuleId), [getVersionsFor, activeModuleId]);

  // Form State (New Version)
  const [form, setForm] = useState({
    prefix: '',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'YEARLY',
    effectiveDate: normalizeDateString(new Date()),
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit, View, and Delete Modal States
  const [editingVersion, setEditingVersion] = useState(null);
  const [viewingVersion, setViewingVersion] = useState(null);
  const [deletingVersion, setDeletingVersion] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editForm, setEditForm] = useState({
    prefix: '',
    separator: '-',
    yearFormat: 'YYYY',
    numberLength: 6,
    startingNumber: 1,
    resetCounter: 'YEARLY',
    effectiveDate: '',
  });
  const [editErrors, setEditErrors] = useState({});
  const [editServerError, setEditServerError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync form values whenever activeModuleId or activeVersion changes
  useEffect(() => {
    const todayStr = normalizeDateString(new Date());

    if (activeVersion) {
      setForm({
        prefix: activeVersion.prefix || currentModule.defaultPrefix || 'DOC',
        separator:
          activeVersion.separator === ''
            ? 'None'
            : (activeVersion.separator ?? '-'),
        yearFormat: (activeVersion.yearFormat || 'YYYY').toUpperCase(),
        numberLength: activeVersion.numberLength || 6,
        startingNumber: activeVersion.startNumber || activeVersion.startingNumber || 1,
        resetCounter: (activeVersion.resetCounter || 'YEARLY').toUpperCase(),
        effectiveDate: todayStr, // New version defaults to today
      });
    } else {
      // Defaults from spec when no active version exists
      setForm({
        prefix: currentModule.defaultPrefix || 'DOC',
        separator: '-',
        yearFormat: 'YYYY',
        numberLength: 4,
        startingNumber: 1,
        resetCounter: 'YEARLY',
        effectiveDate: todayStr,
      });
    }

    setErrors({});
    setServerError(null);
  }, [activeModuleId, activeVersion, currentModule]);

  // Reset form handler: restores active version values (or defaults)
  const handleReset = () => {
    const todayStr = normalizeDateString(new Date());
    if (activeVersion) {
      setForm({
        prefix: activeVersion.prefix || currentModule.defaultPrefix || 'DOC',
        separator:
          activeVersion.separator === ''
            ? 'None'
            : (activeVersion.separator ?? '-'),
        yearFormat: (activeVersion.yearFormat || 'YYYY').toUpperCase(),
        numberLength: activeVersion.numberLength || 6,
        startingNumber: activeVersion.startNumber || activeVersion.startingNumber || 1,
        resetCounter: (activeVersion.resetCounter || 'YEARLY').toUpperCase(),
        effectiveDate: todayStr,
      });
    } else {
      setForm({
        prefix: currentModule.defaultPrefix || 'DOC',
        separator: '-',
        yearFormat: 'YYYY',
        numberLength: 4,
        startingNumber: 1,
        resetCounter: 'YEARLY',
        effectiveDate: todayStr,
      });
    }
    setErrors({});
    setServerError(null);
  };

  // Live sample preview number for New Version Form (formula matching backend spec)
  const previewSampleNumber = useMemo(() => {
    const effDate = form.effectiveDate ? new Date(form.effectiveDate) : new Date();
    const isFuture = effDate > new Date();
    return buildSampleNumber(
      {
        prefix: form.prefix || currentModule.defaultPrefix || 'DOC',
        separator: form.separator === 'None' ? '' : form.separator,
        yearFormat: form.yearFormat,
        numberLength: form.numberLength,
        startNumber: form.startingNumber,
        resetCounter: form.resetCounter,
      },
      isFuture ? effDate : new Date()
    );
  }, [form, currentModule.defaultPrefix]);

  // Pattern schema string for New Version Form
  const previewFormatPattern = useMemo(() => {
    return formatSeriesPattern({
      prefix: form.prefix || currentModule.defaultPrefix || 'DOC',
      separator: form.separator === 'None' ? '' : form.separator,
      yearFormat: form.yearFormat,
      numberLength: form.numberLength,
      startNumber: form.startingNumber,
      resetCounter: form.resetCounter,
    });
  }, [form, currentModule.defaultPrefix]);

  // Live sample preview number for Edit Form
  const editPreviewSampleNumber = useMemo(() => {
    const effDate = editForm.effectiveDate ? new Date(editForm.effectiveDate) : new Date();
    return buildSampleNumber(
      {
        prefix: editForm.prefix || 'DOC',
        separator: editForm.separator === 'None' ? '' : editForm.separator,
        yearFormat: editForm.yearFormat,
        numberLength: editForm.numberLength,
        startNumber: editForm.startingNumber,
        resetCounter: editForm.resetCounter,
      },
      effDate
    );
  }, [editForm]);

  // Pattern schema string for Edit Form
  const editPreviewFormatPattern = useMemo(() => {
    return formatSeriesPattern({
      prefix: editForm.prefix || 'DOC',
      separator: editForm.separator === 'None' ? '' : editForm.separator,
      yearFormat: editForm.yearFormat,
      numberLength: editForm.numberLength,
      startNumber: editForm.startingNumber,
      resetCounter: editForm.resetCounter,
    });
  }, [editForm]);

  // Validate form fields matching backend specification
  const validateForm = (values, isEdit = false, editingId = null) => {
    const errs = {};
    const todayStr = normalizeDateString(new Date());

    // 1. Prefix: 2 to 6 letters A-Z only
    const cleanPrefix = (values.prefix || '').trim();
    if (!cleanPrefix) {
      errs.prefix = 'Prefix is required.';
    } else if (!/^[A-Za-z]{2,6}$/.test(cleanPrefix)) {
      errs.prefix = 'Prefix must be 2 to 6 capital letters (e.g. PO).';
    }

    // 2. Number Length: 1 to 10
    const numLen = Number(values.numberLength);
    if (isNaN(numLen) || numLen < 1 || numLen > 10) {
      errs.numberLength = 'Number length must be between 1 and 10 digits.';
    }

    // 3. Starting Number: at least 1 and must fit within numberLength digits
    const startNum = Number(values.startingNumber);
    if (isNaN(startNum) || startNum < 1) {
      errs.startingNumber = 'Starting number must be at least 1.';
    } else if (!isNaN(numLen) && numLen >= 1 && numLen <= 10) {
      const maxVal = Math.pow(10, numLen) - 1;
      if (startNum > maxVal) {
        errs.startingNumber = `Starting number must fit in ${numLen} digits (maximum ${maxVal}).`;
      }
    }

    // 4. Reset Counter & Year Format check
    const reset = (values.resetCounter || '').toUpperCase();
    const yFmt = (values.yearFormat || '').toUpperCase();
    if ((reset === 'YEARLY' || reset === 'MONTHLY') && yFmt === 'NONE') {
      errs.yearFormat = 'A counter that resets YEARLY or MONTHLY needs YearFormat YY or YYYY, otherwise numbers would repeat.';
    }

    // 5. Effective Date
    if (!values.effectiveDate) {
      errs.effectiveDate = 'Effective Date is required.';
    } else {
      const selectedDateStr = normalizeDateString(values.effectiveDate);

      // Check for backdating
      if (selectedDateStr < todayStr) {
        errs.effectiveDate = 'Effective Date cannot be earlier than today (no backdating).';
      }

      // Check for duplicate date in local versions list for this module
      const isDuplicate = versions.some((v) => {
        if (isEdit && editingId && String(v.id) === String(editingId)) return false;
        return normalizeDateString(v.effectiveDate) === selectedDateStr;
      });

      if (isDuplicate) {
        errs.effectiveDate = `A series version with effective date ${selectedDateStr} already exists for this module.`;
      }
    }

    return errs;
  };

  // Submit Handler: Add New Version (POST /api/document-series with moduleId)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only Admin can change numbering rules.');
      return;
    }

    const valErrors = validateForm(form);
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        moduleId: activeModuleId,
        prefix: form.prefix,
        separator: form.separator === 'None' ? '' : form.separator,
        yearFormat: form.yearFormat,
        numberLength: Number(form.numberLength),
        startNumber: Number(form.startingNumber),
        resetCounter: form.resetCounter,
        effectiveDate: form.effectiveDate,
      };

      const result = await addVersion(activeModuleId, payload);

      if (result?.ok) {
        const todayStr = normalizeDateString(new Date());
        setForm((prev) => ({
          ...prev,
          effectiveDate: todayStr,
        }));
        setErrors({});
        setServerError(null);
      } else {
        setServerError(result?.error || 'Failed to save series version.');
        if (result?.fieldErrors) {
          setErrors(result.fieldErrors);
        }
      }
    } catch (err) {
      setServerError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal (only for unused versions)
  const handleOpenEditModal = (version) => {
    if (version.isUsed) {
      toast.error('This version has already issued numbers and cannot be edited.');
      return;
    }
    setEditingVersion(version);
    setEditForm({
      prefix: version.prefix || '',
      separator:
        version.separator === '' || version.separator === 'None'
          ? 'None'
          : (version.separator ?? '-'),
      yearFormat: (version.yearFormat || 'YYYY').toUpperCase(),
      numberLength: version.numberLength || 6,
      startingNumber: version.startNumber || version.startingNumber || 1,
      resetCounter: (version.resetCounter || 'YEARLY').toUpperCase(),
      effectiveDate: version.effectiveDate || '',
    });
    setEditErrors({});
    setEditServerError(null);
  };

  const handleCloseEditModal = () => {
    setEditingVersion(null);
    setEditErrors({});
    setEditServerError(null);
  };

  // Save Edit Handler (PUT /api/document-series/{id})
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only Admin can change numbering rules.');
      return;
    }
    if (!editingVersion || isUpdating) return;

    const valErrors = validateForm(editForm, true, editingVersion.id);
    if (Object.keys(valErrors).length > 0) {
      setEditErrors(valErrors);
      return;
    }

    setIsUpdating(true);
    setEditServerError(null);

    try {
      const payload = {
        moduleId: activeModuleId,
        prefix: editForm.prefix,
        separator: editForm.separator === 'None' ? '' : editForm.separator,
        yearFormat: editForm.yearFormat,
        numberLength: Number(editForm.numberLength),
        startNumber: Number(editForm.startingNumber),
        resetCounter: editForm.resetCounter,
        effectiveDate: editForm.effectiveDate,
      };

      const result = await updateVersion(editingVersion.id, payload, activeModuleId);

      if (result?.ok) {
        handleCloseEditModal();
      } else {
        setEditServerError(result?.error || 'Failed to update series version.');
        if (result?.fieldErrors) {
          setEditErrors(result.fieldErrors);
        }
      }
    } catch (err) {
      setEditServerError(err.message || 'An error occurred.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (version) => {
    if (version.isUsed) {
      toast.error('This version has already issued numbers and cannot be deleted.');
      return;
    }
    setDeletingVersion(version);
  };

  // Confirm Delete Handler (DELETE /api/document-series/{id})
  const handleConfirmDelete = async () => {
    if (!deletingVersion) return;
    setIsDeleting(true);
    try {
      const res = await deleteVersion(deletingVersion.id, activeModuleId);
      if (res?.ok) {
        setDeletingVersion(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for Status Badge & Label
  const getStatusInfo = (ver) => {
    const status = getSeriesStatus(ver, versions);
    if (status === 'current') {
      return {
        variant: 'success',
        label: 'Current',
        isCurrent: true,
      };
    }
    if (status === 'scheduled') {
      return {
        variant: 'role',
        label: 'Scheduled',
        isScheduled: true,
      };
    }
    return {
      variant: 'neutral',
      label: 'Expired',
      isExpired: true,
    };
  };

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  const columnHelper = useMemo(() => createColumnHelper(), []);

  const columns = useMemo(() => [
    columnHelper.accessor('effectiveDate', {
      header: 'Effective Date',
      size: 130,
      cell: (info) => (
        <span className="font-mono font-semibold text-heading tabular-nums whitespace-nowrap">
          {formatDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('prefix', {
      header: 'Prefix',
      size: 90,
      cell: (info) => (
        <span className="font-mono font-bold text-primary whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('separator', {
      header: 'Separator',
      size: 90,
      cell: (info) => {
        const val = info.getValue();
        return val === '' || val === 'None' ? (
          <span className="text-text-muted/60 italic text-2xs">None</span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded bg-surface border border-border text-xs font-semibold text-heading">
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor('yearFormat', {
      header: 'Year Format',
      size: 110,
      cell: (info) => (
        <span className="font-mono text-text whitespace-nowrap">
          {info.getValue() || 'NONE'}
        </span>
      ),
    }),
    columnHelper.accessor('numberLength', {
      header: 'Length',
      size: 80,
      cell: (info) => (
        <span className="font-mono tabular-nums text-text whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.startNumber || row.startingNumber, {
      id: 'startNumber',
      header: 'Start Number',
      size: 110,
      cell: (info) => (
        <span className="font-mono tabular-nums text-text whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('resetCounter', {
      header: 'Reset',
      size: 90,
      cell: (info) => (
        <span className="text-text whitespace-nowrap">
          {info.getValue() || 'YEARLY'}
        </span>
      ),
    }),
    columnHelper.accessor((row) => {
      return row.sampleNumber || formatSeriesNumber(
        row,
        row.startNumber || row.startingNumber,
        row.effectiveDate ? new Date(row.effectiveDate) : new Date()
      );
    }, {
      id: 'example',
      header: 'Example',
      size: 150,
      cell: (info) => (
        <span className="inline-block bg-surface/90 px-2.5 py-1 rounded-md border border-border text-xs font-mono font-bold text-heading tabular-nums whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => getStatusInfo(row).label, {
      id: 'status',
      header: 'Status',
      size: 100,
      cell: (info) => {
        const statusInfo = getStatusInfo(info.row.original);
        return (
          <Badge variant={statusInfo.variant} className="text-xs px-2.5 py-0.5">
            {statusInfo.label}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('isUsed', {
      header: 'In Use',
      size: 80,
      cell: (info) => info.getValue() ? (
        <Badge variant="neutral" className="text-2xs px-2 py-0.5 font-mono">
          Yes
        </Badge>
      ) : (
        <span className="text-text-muted/60 text-2xs">No</span>
      ),
    }),
    columnHelper.accessor('createdOn', {
      header: 'Created On',
      size: 110,
      cell: (info) => (
        <span className="font-mono text-2xs text-text-muted tabular-nums whitespace-nowrap">
          {formatDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: (info) => {
        const ver = info.row.original;
        return (
          <TableActions
            onView={() => setViewingVersion(ver)}
            onEdit={isAdmin && !ver.isUsed ? () => handleOpenEditModal(ver) : undefined}
            onDelete={isAdmin && !ver.isUsed ? () => handleOpenDelete(ver) : undefined}
            viewTitle="View series version"
            editTitle={ver.isUsed ? 'Cannot edit version that is in use' : 'Edit series version'}
            deleteTitle={ver.isUsed ? 'Cannot delete version that is in use' : 'Delete series version'}
          />
        );
      },
    }),
  ], [isAdmin, versions]);

  const table = useReactTable({
    data: versions,
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

  const TypeIcon = currentModule.icon || IconSeriesSetup;
  const todayMinDate = normalizeDateString(new Date());

  return (
    <div className="space-y-5 sm:space-y-6 pb-20">
      {/* ── Top Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-1.5 truncate">
            <span>Configuration</span>
            <span>/</span>
            <span className="text-text">Series Setup</span>
            <span>/</span>
            <span className="text-primary font-semibold truncate">{currentModule.shortLabel || currentModule.label}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs shrink-0">
              <TypeIcon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-heading tracking-tight leading-tight truncate">
                {currentModule.label} Series Setup
              </h1>
              <p className="text-xs text-text-muted mt-0.5 truncate sm:whitespace-normal">
                Configure module sequence numbering formats, prefix structure, and revision dates.
              </p>
            </div>
          </div>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium self-start sm:self-auto">
            <IconLock size={14} className="shrink-0" />
            <span>Read-only: Only Admin can modify series rules</span>
          </div>
        )}
      </div>

      {/* ── Responsive Layout: SubSidebar + Content ── */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {/* Secondary Navigation (SubSidebar) populated from GET /api/modules */}
        <SubSidebar
          items={sidebarItems}
          title="Module Series"
          className="w-full lg:w-auto"
        />

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6 w-full">
          {/* ── CARD 1: NEW SERIES VERSION FORM ── */}
          <Card padding="md" className="bg-bg shadow-2xs">
            {/* Header with Title and Active Version Pill */}
            <div className="border-b border-border pb-3.5 mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconAdd size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-heading">New Series Version</h2>
                  <p className="text-2xs text-text-muted">
                    Pre-populated from currently active version. Create a new revision to change numbering rules.
                  </p>
                </div>
              </div>

              {activeVersion ? (
                <div className="self-start sm:self-auto flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-text-muted bg-surface/90 px-3 py-1.5 rounded-xl border border-border shadow-2xs">
                  <span className="whitespace-nowrap flex items-center gap-1">
                    <span>Active Prefix:</span>
                    <strong className="font-mono font-bold text-primary">{activeVersion.prefix}</strong>
                  </span>
                  <span className="text-text-muted/60 hidden sm:inline">•</span>
                  <span className="whitespace-nowrap flex items-center gap-1">
                    <span>Effective Since:</span>
                    <strong className="font-mono font-medium text-heading tabular-nums">{formatDate(activeVersion.effectiveDate)}</strong>
                  </span>
                </div>
              ) : (
                <Badge variant="neutral" className="text-xs px-2.5 py-1">
                  No Active Series
                </Badge>
              )}
            </div>

            {/* Server Error Alert Banner */}
            {serverError && (
              <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
              {/* Responsive Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {/* 1. Prefix */}
                <div>
                  <Input
                    label="Prefix"
                    id="series-prefix"
                    required
                    disabled={!isAdmin || isSubmitting}
                    value={form.prefix}
                    onChange={(e) => {
                      const clean = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
                      setForm((prev) => ({ ...prev, prefix: clean }));
                      if (errors.prefix) setErrors((prev) => ({ ...prev, prefix: null }));
                    }}
                    placeholder="e.g. PO"
                    maxLength={6}
                    error={errors.prefix}
                    hint="2-6 letters (A-Z), automatically uppercased"
                    className="font-mono uppercase font-bold"
                  />
                </div>

                {/* 2. Separator */}
                <div>
                  <SearchableSelect
                    label="Separator"
                    id="series-separator"
                    disabled={!isAdmin || isSubmitting}
                    value={form.separator}
                    onChange={(e) => setForm((prev) => ({ ...prev, separator: e.target.value }))}
                    options={SEPARATOR_OPTIONS}
                    error={errors.separator}
                    hint="Delimiter character between segments"
                    placeholder="Select separator..."
                    searchPlaceholder="Search separators..."
                  />
                </div>

                {/* 3. Year Format */}
                <div>
                  <SearchableSelect
                    label="Year Format"
                    id="series-year-format"
                    disabled={!isAdmin || isSubmitting}
                    value={form.yearFormat}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, yearFormat: e.target.value }));
                      if (errors.yearFormat) setErrors((prev) => ({ ...prev, yearFormat: null }));
                    }}
                    options={YEAR_FORMAT_OPTIONS}
                    error={errors.yearFormat}
                    hint="Optional year segment representation"
                    placeholder="Select year format..."
                    searchPlaceholder="Search year formats..."
                  />
                </div>

                {/* 4. Number Length */}
                <div>
                  <Input
                    label="Number Length"
                    id="series-number-length"
                    type="number"
                    min={1}
                    max={10}
                    required
                    disabled={!isAdmin || isSubmitting}
                    value={form.numberLength}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, numberLength: e.target.value }));
                      if (errors.numberLength) setErrors((prev) => ({ ...prev, numberLength: null }));
                    }}
                    error={errors.numberLength}
                    hint="Zero-padded length (1 to 10 digits)"
                    className="font-mono tabular-nums"
                  />
                </div>

                {/* 5. Starting Number */}
                <div>
                  <Input
                    label="Starting Number"
                    id="series-starting-number"
                    type="number"
                    min={1}
                    required
                    disabled={!isAdmin || isSubmitting}
                    value={form.startingNumber}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, startingNumber: e.target.value }));
                      if (errors.startingNumber) setErrors((prev) => ({ ...prev, startingNumber: null }));
                    }}
                    error={errors.startingNumber}
                    hint="First sequence value (minimum 1)"
                    className="font-mono tabular-nums"
                  />
                </div>

                {/* 6. Reset Counter */}
                <div>
                  <SearchableSelect
                    label="Reset Counter"
                    id="series-reset-counter"
                    disabled={!isAdmin || isSubmitting}
                    value={form.resetCounter}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, resetCounter: e.target.value }));
                      if (errors.yearFormat) setErrors((prev) => ({ ...prev, yearFormat: null }));
                    }}
                    options={RESET_COUNTER_OPTIONS}
                    error={errors.resetCounter}
                    hint="Reset schedule for sequence counter"
                    placeholder="Select reset schedule..."
                    searchPlaceholder="Search reset options..."
                  />
                </div>

                {/* 7. Effective Date */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="w-full sm:max-w-md">
                    <DatePicker
                      label="Effective Date"
                      id="series-effective-date"
                      name="effectiveDate"
                      min={todayMinDate}
                      required
                      disabled={!isAdmin || isSubmitting}
                      value={form.effectiveDate}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, effectiveDate: e.target.value }));
                        if (errors.effectiveDate) setErrors((prev) => ({ ...prev, effectiveDate: null }));
                      }}
                      error={errors.effectiveDate}
                      hint="Date when this numbering configuration becomes active (No backdating)"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-surface/60 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <IconSparkles size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-2xs sm:text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                      Live Sample Preview
                    </span>
                    <span className="font-mono font-bold text-base sm:text-lg text-primary tabular-nums tracking-wide break-all">
                      {previewSampleNumber}
                    </span>
                  </div>
                </div>

                <div className="text-2xs text-text-muted font-mono bg-bg px-3 py-1.5 rounded-lg border border-border/80 self-start sm:self-auto break-all">
                  Format: {previewFormatPattern}
                </div>
              </div>

              {/* Form Action Buttons */}
              {isAdmin && (
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    icon={IconReset}
                    onClick={handleReset}
                    disabled={isSubmitting}
                    className="justify-center"
                  >
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    icon={IconAdd}
                    className="font-semibold shadow-2xs justify-center"
                  >
                    {isSubmitting ? 'Adding Series...' : 'Add Series'}
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* ── CARD 2: SERIES HISTORY ── */}
          <Card padding="md" className="bg-bg shadow-2xs">
            <div className="border-b border-border pb-3.5 mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-surface text-text-muted flex items-center justify-center border border-border shrink-0">
                  <IconHistory size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-heading">Series Version History</h2>
                  <p className="text-2xs text-text-muted">
                    Audit history of past, current active, and scheduled series numbering rules for {currentModule.label}.
                  </p>
                </div>
              </div>

              <Badge variant="neutral" className="text-xs font-mono px-2.5 py-0.5 self-start sm:self-auto">
                {versions.length} Version{versions.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <DataTable
              table={table}
              columns={columns}
              isLoading={isLoading}
              totalCount={versions.length}
              showPagination={false}
              entityName="series versions"
              emptyTitle="No series configured yet"
              emptyDescription={`Add the initial series version for ${currentModule.label} using the form above.`}
              renderMobileCard={(row) => {
                const ver = row.original || row;
                const statusInfo = getStatusInfo(ver);
                const sampleNum = ver.sampleNumber || formatSeriesNumber(
                  ver,
                  ver.startNumber || ver.startingNumber,
                  ver.effectiveDate ? new Date(ver.effectiveDate) : new Date()
                );

                return (
                  <div
                    key={ver.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 ${
                      statusInfo.isCurrent
                        ? 'border-primary/40 bg-primary/5 shadow-2xs'
                        : 'border-border bg-surface/40'
                    }`}
                  >
                    {/* Header: Effective Date & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-2xs uppercase font-bold tracking-wider text-text-muted block">
                          Effective Date
                        </span>
                        <span className="font-mono font-bold text-sm text-heading tabular-nums">
                          {formatDate(ver.effectiveDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ver.isUsed && (
                          <Badge variant="neutral" className="text-2xs px-2 py-0.5 font-mono">
                            In Use
                          </Badge>
                        )}
                        <Badge variant={statusInfo.variant} className="text-xs px-2.5 py-0.5 font-medium">
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Example Number Box */}
                    <div className="bg-bg/95 px-3 py-2 rounded-lg border border-border/80 flex items-center justify-between gap-2">
                      <span className="text-2xs text-text-muted font-medium">Example Number:</span>
                      <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 break-all">
                        {sampleNum}
                      </span>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs py-2 px-1 border-t border-b border-border/60 bg-bg/40 rounded-lg">
                      <div>
                        <span className="text-2xs text-text-muted block">Prefix</span>
                        <span className="font-mono font-bold text-heading">{ver.prefix}</span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">Separator</span>
                        <span className="font-mono text-heading">
                          {ver.separator === '' || ver.separator === 'None' ? 'None' : ver.separator}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">Year Fmt</span>
                        <span className="font-mono text-heading">{ver.yearFormat || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">Length</span>
                        <span className="font-mono text-heading tabular-nums">{ver.numberLength} digits</span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">Start No</span>
                        <span className="font-mono text-heading tabular-nums">{ver.startNumber || ver.startingNumber}</span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">Reset</span>
                        <span className="text-heading truncate block">{ver.resetCounter || 'Yearly'}</span>
                      </div>
                    </div>

                    {/* Audit Details & Actions */}
                    <div className="flex items-center justify-between gap-2.5 pt-1">
                      <div className="text-2xs text-text-muted truncate">
                        {ver.createdBy ? `By ${ver.createdBy} • ` : ''}{formatDate(ver.createdOn)}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setViewingVersion(ver)}
                          className="text-xs"
                        >
                          <IconView size={13} className="mr-1.5" />
                          View
                        </Button>
                        {isAdmin && !ver.isUsed && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEditModal(ver)}
                            className="text-xs"
                          >
                            <IconEdit size={13} className="mr-1.5" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </Card>
        </div>
      </div>

      {/* ── EDIT SERIES VERSION MODAL ── */}
      <Modal
        isOpen={Boolean(editingVersion)}
        onClose={handleCloseEditModal}
        title={`Edit ${currentModule.label} Series Version`}
        maxWidth="max-w-xl"
      >
        {editingVersion && (
          <form onSubmit={handleSaveEdit} noValidate className="space-y-4">
            {editServerError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
                {editServerError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Prefix */}
              <div>
                <Input
                  label="Prefix"
                  id="edit-series-prefix"
                  required
                  value={editForm.prefix}
                  onChange={(e) => {
                    const clean = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
                    setEditForm((prev) => ({ ...prev, prefix: clean }));
                    if (editErrors.prefix) setEditErrors((prev) => ({ ...prev, prefix: null }));
                  }}
                  maxLength={6}
                  error={editErrors.prefix}
                  className="font-mono uppercase font-bold"
                />
              </div>

              {/* Separator */}
              <div>
                <SearchableSelect
                  label="Separator"
                  id="edit-series-separator"
                  value={editForm.separator}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, separator: e.target.value }))}
                  options={SEPARATOR_OPTIONS}
                  placeholder="Select separator..."
                  searchPlaceholder="Search separators..."
                />
              </div>

              {/* Year Format */}
              <div>
                <SearchableSelect
                  label="Year Format"
                  id="edit-series-year-format"
                  value={editForm.yearFormat}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, yearFormat: e.target.value }));
                    if (editErrors.yearFormat) setEditErrors((prev) => ({ ...prev, yearFormat: null }));
                  }}
                  options={YEAR_FORMAT_OPTIONS}
                  error={editErrors.yearFormat}
                  placeholder="Select year format..."
                  searchPlaceholder="Search year formats..."
                />
              </div>

              {/* Number Length */}
              <div>
                <Input
                  label="Number Length"
                  id="edit-series-number-length"
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={editForm.numberLength}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, numberLength: e.target.value }));
                    if (editErrors.numberLength) setEditErrors((prev) => ({ ...prev, numberLength: null }));
                  }}
                  error={editErrors.numberLength}
                  className="font-mono tabular-nums"
                />
              </div>

              {/* Starting Number */}
              <div>
                <Input
                  label="Starting Number"
                  id="edit-series-starting-number"
                  type="number"
                  min={1}
                  required
                  value={editForm.startingNumber}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, startingNumber: e.target.value }));
                    if (editErrors.startingNumber) setEditErrors((prev) => ({ ...prev, startingNumber: null }));
                  }}
                  error={editErrors.startingNumber}
                  className="font-mono tabular-nums"
                />
              </div>

              {/* Reset Counter */}
              <div>
                <SearchableSelect
                  label="Reset Counter"
                  id="edit-series-reset-counter"
                  value={editForm.resetCounter}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, resetCounter: e.target.value }));
                    if (editErrors.yearFormat) setEditErrors((prev) => ({ ...prev, yearFormat: null }));
                  }}
                  options={RESET_COUNTER_OPTIONS}
                  placeholder="Select reset schedule..."
                  searchPlaceholder="Search reset options..."
                />
              </div>

              {/* Effective Date */}
              <div className="sm:col-span-2">
                <DatePicker
                  label="Effective Date"
                  id="edit-series-effective-date"
                  name="effectiveDate"
                  min={todayMinDate}
                  required
                  value={editForm.effectiveDate}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, effectiveDate: e.target.value }));
                    if (editErrors.effectiveDate) setEditErrors((prev) => ({ ...prev, effectiveDate: null }));
                  }}
                  error={editErrors.effectiveDate}
                />
              </div>
            </div>

            {/* Live Sample Preview Box inside Modal */}
            <div className="p-3.5 rounded-xl bg-surface/60 border border-border flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconSparkles size={14} />
                </div>
                <div>
                  <span className="view-field-label mf-detail-label">
                    Updated Number Preview
                  </span>
                  <span className="font-mono font-bold text-sm text-primary tabular-nums">
                    {editPreviewSampleNumber}
                  </span>
                </div>
              </div>

              <div className="text-2xs text-text-muted font-mono bg-bg px-2.5 py-1 rounded-lg border border-border/80">
                Format: {editPreviewFormatPattern}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <CancelButton
                onClick={handleCloseEditModal}
                disabled={isUpdating}
                className="justify-center"
              />

              <SaveButton
                type="submit"
                loading={isUpdating}
                disabled={isUpdating}
                className="justify-center font-semibold shadow-2xs"
              >
                Save Changes
              </SaveButton>
            </div>
          </form>
        )}
      </Modal>

      {/* ── VIEW SERIES VERSION MODAL ── */}
      <Modal
        isOpen={Boolean(viewingVersion)}
        onClose={() => setViewingVersion(null)}
        title={`${currentModule.label} Series Details`}
        maxWidth="max-w-lg"
      >
        {viewingVersion && (() => {
          const statusInfo = getStatusInfo(viewingVersion);
          const sampleNum = viewingVersion.sampleNumber || formatSeriesNumber(
            viewingVersion,
            viewingVersion.startNumber || viewingVersion.startingNumber,
            viewingVersion.effectiveDate ? new Date(viewingVersion.effectiveDate) : new Date()
          );
          const pattern = formatSeriesPattern(viewingVersion);

          return (
            <div className="space-y-4">
              {/* Header banner */}
              <div className="p-4 rounded-xl bg-surface/50 border border-border flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <IconSeriesSetup size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-heading break-words leading-snug">
                      {currentModule.label} Series
                    </h3>
                    <p className="text-xs text-text-muted mt-1">Effective {formatDate(viewingVersion.effectiveDate)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 mt-0.5">
                  <Badge variant={statusInfo.variant} className="text-xs px-2.5 py-0.5 font-medium">
                    {statusInfo.label}
                  </Badge>
                  {viewingVersion.isUsed && (
                    <span className="text-2xs text-text-muted font-mono">In Use (Locked)</span>
                  )}
                </div>
              </div>

              {/* Sample Number Highlight */}
              <div className="bg-bg p-3.5 rounded-xl border border-border flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="view-field-label mf-detail-label">
                    Generated Sample Number
                  </span>
                  <span className="text-2xs font-mono text-text-muted">
                    Pattern: {pattern}
                  </span>
                </div>
                <span className="font-mono font-bold text-base text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 tracking-wider">
                  {sampleNum}
                </span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">Prefix</span>
                  <span className="font-mono font-bold text-heading">{viewingVersion.prefix}</span>
                </div>

                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">Separator</span>
                  <span className="font-mono text-heading">
                    {viewingVersion.separator === '' || viewingVersion.separator === 'None' ? 'None' : viewingVersion.separator}
                  </span>
                </div>

                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">Year Format</span>
                  <span className="font-mono text-heading">{viewingVersion.yearFormat || 'NONE'}</span>
                </div>

                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">Number Length</span>
                  <span className="font-mono text-heading tabular-nums">{viewingVersion.numberLength} digits</span>
                </div>

                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">Start Number</span>
                  <span className="font-mono text-heading tabular-nums">{viewingVersion.startNumber || viewingVersion.startingNumber}</span>
                </div>

                <div className="p-3 bg-surface/40 border border-border rounded-lg space-y-1">
                  <span className="view-field-label mf-detail-label">Reset Frequency</span>
                  <span className="text-heading truncate block font-medium">{viewingVersion.resetCounter || 'YEARLY'}</span>
                </div>
              </div>

              {/* Audit Details */}
              <div className="p-3 bg-surface/40 border border-border rounded-lg flex items-center justify-between text-2xs text-text-muted">
                <span>{viewingVersion.createdBy ? `Created by ${viewingVersion.createdBy}` : 'Created'}</span>
                <span>{formatDate(viewingVersion.createdOn)}</span>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <CancelButton
                  onClick={() => setViewingVersion(null)}
                  className="justify-center"
                >
                  Close
                </CancelButton>
                {isAdmin && !viewingVersion.isUsed && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => {
                      const ver = viewingVersion;
                      setViewingVersion(null);
                      handleOpenEditModal(ver);
                    }}
                    className="justify-center font-semibold shadow-2xs"
                  >
                    <IconEdit size={15} className="mr-1.5 shrink-0" aria-hidden="true" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <ConfirmModal
        isOpen={Boolean(deletingVersion)}
        onClose={() => setDeletingVersion(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Series Version"
        description={`Are you sure you want to delete the series version effective ${deletingVersion ? formatDate(deletingVersion.effectiveDate) : ''}? This action cannot be undone.`}
        confirmText="Delete Version"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
