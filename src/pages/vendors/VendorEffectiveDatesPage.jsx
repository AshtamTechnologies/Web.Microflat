/**
 * VendorEffectiveDatesPage — Effective-dated version history & master management for vendors.
 * Route: /vendors/:id/effective-dates
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Eye,
  Pencil,
  Save,
  X,
  Building2,
  Contact,
  MapPin,
  FileText,
  Clock,
  Globe,
  Mail,
  Phone,
  Paperclip,
  UploadCloud,
  Trash2,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileCheck,
  ShieldCheck,
  Maximize2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  SearchableSelect,
  Badge,
  Card,
  TableContainer,
  Th,
  Td,
  Modal,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import {
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
  getCountryName,
  getStateName,
} from '../../mocks/vendors';
import { getActiveVendorVersion } from '../../utils/vendorVersions';
import { formatDateDisplay, getTodayIsoDate } from '../../utils/effectiveDateUtils';

const columnHelper = createColumnHelper();

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'GST Registration Certificate', label: 'GST Registration Certificate' },
  { value: 'PAN Card Copy', label: 'PAN Card Copy' },
  { value: 'MSME / Udyam Certificate', label: 'MSME / Udyam Certificate' },
  { value: 'ISO 9001 / Quality Certificate', label: 'ISO 9001 / Quality Certificate' },
  { value: 'Bank Cancelled Cheque / Mandate', label: 'Bank Cancelled Cheque / Mandate' },
  { value: 'Vendor Agreement / NDA', label: 'Vendor Agreement / NDA' },
  { value: 'Company Profile & Brochure', label: 'Company Profile & Brochure' },
  { value: 'Material Test / Calibration Report', label: 'Material Test / Calibration Report' },
  { value: 'Purchase Terms & Conditions', label: 'Purchase Terms & Conditions' },
  { value: 'Other Document', label: 'Other Document' },
];

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

function isAllowedFile(file) {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();
  const hasValidExt = ALLOWED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = type === 'application/pdf' || type.startsWith('image/');
  return hasValidExt || hasValidMime;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileName = '', fileType = '') {
  const name = fileName.toLowerCase();
  const type = (fileType || '').toLowerCase();

  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <FileText size={18} className="text-danger shrink-0" />;
  }
  return <ImageIcon size={18} className="text-primary shrink-0" />;
}

function formatAuditTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formattedHours}:${minutes} ${ampm}`;
}

function getApprovalBadgeVariant(status) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'pending':
    default:
      return 'pending';
  }
}

function DetailField({ label, value, mono = false, isLink = false, href = '' }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
        {label}
      </span>
      {isLink && href ? (
        <a
          href={href.startsWith('http') ? href : `https://${href}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          {value}
          <ExternalLink size={12} className="shrink-0" />
        </a>
      ) : (
        <div
          className={`text-xs text-heading font-medium break-words ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value || '—'}
        </div>
      )}
    </div>
  );
}

export default function VendorEffectiveDatesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getVendorById, updateVendorVersions } = useVendorsContext();

  const backPath = location.state?.from || '/vendors';
  const backLabel = location.state?.backLabel || 'Vendors';
  const isReadOnly = Boolean(
    location.state?.readOnly ||
    location.state?.from === '/approvals/vendors' ||
    location.state?.from === '/vendors/dashboard'
  );

  const vendor = getVendorById(id);

  // Versions array from vendor
  const versions = useMemo(() => {
    if (!vendor?.effectiveVersions) return [];
    // Sort descending by effectiveDate
    return [...vendor.effectiveVersions].sort((a, b) =>
      (b.effectiveDate || '').localeCompare(a.effectiveDate || '')
    );
  }, [vendor]);

  // Current active version
  const activeVersion = useMemo(() => {
    return vendor ? getActiveVendorVersion(vendor) : null;
  }, [vendor]);

  // UI state: mode is 'VIEW' | 'EDIT' | 'ADD'
  const [mode, setMode] = useState('VIEW');
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  // TanStack table state for resizable column grid
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Latest previous effective date that new revisions cannot precede
  const minAllowedEffectiveDate = useMemo(() => {
    const dates = versions
      .filter((v) => (mode === 'EDIT' ? v.id !== selectedVersionId : true))
      .map((v) => v.effectiveDate)
      .filter(Boolean);
    if (dates.length === 0) return null;
    return [...dates].sort().reverse()[0];
  }, [versions, mode, selectedVersionId]);

  // Form state for ADD or EDIT
  const [formData, setFormData] = useState({
    effectiveDate: '',
    contactPersonName: '',
    phoneNo: '',
    alternatePhoneNo: '',
    email: '',
    gstNo: '',
    website: '',
    countryId: 'IN',
    stateId: '',
    city: '',
    zipCode: '',
    address1: '',
    address2: '',
    notes: '',
  });

  // Attachments state for active/edit mode
  const [attachments, setAttachments] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Default selection on mount or vendor change
  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      if (activeVersion?.id) {
        setSelectedVersionId(activeVersion.id);
      } else {
        setSelectedVersionId(versions[0].id);
      }
    }
  }, [versions, activeVersion, selectedVersionId]);

  // The currently viewed/selected version object
  const selectedVersion = useMemo(() => {
    if (!selectedVersionId && activeVersion) return activeVersion;
    return versions.find((v) => v.id === selectedVersionId) || activeVersion || versions[0] || null;
  }, [versions, selectedVersionId, activeVersion]);

  // Attachments for the currently viewed version (version-scoped)
  const currentViewAttachments = useMemo(() => {
    if (!selectedVersion) return [];
    if (Array.isArray(selectedVersion.attachments)) {
      return selectedVersion.attachments;
    }
    // Fallback if top-level vendor has attachments
    return vendor?.attachments || [];
  }, [selectedVersion, vendor]);

  // Synchronize attachments when entering EDIT or ADD mode or switching view
  useEffect(() => {
    if (mode === 'VIEW') {
      setAttachments(currentViewAttachments);
    }
  }, [mode, currentViewAttachments]);

  // Cascading state options
  const stateOptions = useMemo(() => {
    if (!formData.countryId) return [];
    return STATE_OPTIONS[formData.countryId] || [];
  }, [formData.countryId]);

  /* ── Handlers for switching modes ── */
  function handleSelectView(ver) {
    setSelectedVersionId(ver.id);
    setMode('VIEW');
    setFormErrors({});
    const verAtts = Array.isArray(ver.attachments)
      ? ver.attachments
      : vendor?.attachments || [];
    setAttachments(verAtts);
  }

  function handleStartEdit(ver) {
    setSelectedVersionId(ver.id);
    setFormData({
      effectiveDate: ver.effectiveDate || '',
      contactPersonName: ver.contactPersonName || '',
      phoneNo: ver.phoneNo || '',
      alternatePhoneNo: ver.alternatePhoneNo || '',
      email: ver.email || '',
      gstNo: ver.gstNo || '',
      website: ver.website || '',
      countryId: ver.countryId || 'IN',
      stateId: ver.stateId || '',
      city: ver.city || '',
      zipCode: ver.zipCode || '',
      address1: ver.address1 || '',
      address2: ver.address2 || '',
      notes: ver.notes || '',
    });
    const verAtts = Array.isArray(ver.attachments)
      ? ver.attachments
      : vendor?.attachments || [];
    setAttachments(verAtts);
    setMode('EDIT');
    setFormErrors({});
  }

  function handleStartAdd() {
    // Clone forward from active version and default to today's date
    const base = activeVersion || selectedVersion || {};
    const today = getTodayIsoDate();
    setFormData({
      effectiveDate: today,
      contactPersonName: base.contactPersonName || '',
      phoneNo: base.phoneNo || '',
      alternatePhoneNo: base.alternatePhoneNo || '',
      email: base.email || '',
      gstNo: base.gstNo || '',
      website: base.website || '',
      countryId: base.countryId || 'IN',
      stateId: base.stateId || '',
      city: base.city || '',
      zipCode: base.zipCode || '',
      address1: base.address1 || '',
      address2: base.address2 || '',
      notes: base.notes || '',
    });
    const baseAtts = Array.isArray(base.attachments)
      ? base.attachments
      : vendor?.attachments || [];
    setAttachments([...baseAtts]);
    setMode('ADD');
    setFormErrors({});
  }

  function handleCancel() {
    setMode('VIEW');
    setFormErrors({});
    setAttachments(currentViewAttachments);
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleCountryChange(e) {
    const nextCountryId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      countryId: nextCountryId,
      stateId: '', // reset state on country change
    }));
    if (formErrors.countryId || formErrors.stateId) {
      setFormErrors((prev) => ({ ...prev, countryId: '', stateId: '' }));
    }
  }

  /* ── Attachment Handlers ── */
  function handleFilesAdded(files) {
    const validFiles = Array.from(files).filter(isAllowedFile);
    if (validFiles.length === 0) {
      setAttachmentError('Only PDF and image files (PNG, JPG, JPEG, WEBP) are allowed.');
      return;
    }

    setAttachmentError('');

    const newAttachments = validFiles.map((file, idx) => {
      const docName =
        selectedDocType ||
        file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') ||
        'Vendor Document';
      const fileUrl = file.type?.startsWith('image/')
        ? URL.createObjectURL(file)
        : null;

      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${idx}`,
        documentName: docName,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileSizeBytes: file.size,
        fileType: file.type || 'application/octet-stream',
        fileUrl,
        uploadedAt: new Date().toISOString().slice(0, 10),
      };
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedDocType('');
  }

  function handleFileInputChange(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesAdded(files);
    }
  }

  function handleRemoveAttachment(idToRemove) {
    setAttachments((prev) => prev.filter((att) => att.id !== idToRemove));
  }

  function handleDownloadAttachment(att, e) {
    if (e) e.stopPropagation();
    if (att.fileUrl) {
      const a = document.createElement('a');
      a.href = att.fileUrl;
      a.download = att.fileName || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob(
        [`MicroFlat ERP Document: ${att.documentName}\nFile: ${att.fileName}`],
        { type: 'text/plain;charset=utf-8' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.fileName || 'document.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesAdded(files);
    }
  }

  /* ── Form Validation ── */
  function validateForm() {
    const errors = {};

    // 1. Effective Date validation
    if (!formData.effectiveDate?.trim()) {
      errors.effectiveDate = 'Effective date is required.';
    } else {
      const enteredDate = formData.effectiveDate.trim();
      // Check collision with other versions
      const collision = versions.find((v) => {
        if (mode === 'EDIT' && v.id === selectedVersionId) return false;
        return v.effectiveDate === enteredDate;
      });
      if (collision) {
        errors.effectiveDate = 'Another version with this effective date already exists for this vendor.';
      } else if (minAllowedEffectiveDate && enteredDate < minAllowedEffectiveDate) {
        errors.effectiveDate = `Effective date cannot be earlier than previous effective date (${formatDateDisplay(minAllowedEffectiveDate)}).`;
      }
    }

    // 2. Contact Person Name
    if (!formData.contactPersonName?.trim()) {
      errors.contactPersonName = 'Contact person name is required.';
    }

    // 3. Phone Number
    if (!formData.phoneNo?.trim()) {
      errors.phoneNo = 'Phone number is required.';
    }

    // 4. Email
    if (!formData.email?.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // 5. City
    if (!formData.city?.trim()) {
      errors.city = 'City is required.';
    }

    // 6. State
    if (!formData.stateId) {
      errors.stateId = 'Please select a state.';
    }

    // 7. Zip Code
    if (!formData.zipCode?.trim()) {
      errors.zipCode = 'ZIP / Postal code is required.';
    }

    // 8. Address 1
    if (!formData.address1?.trim()) {
      errors.address1 = 'Address line 1 is required.';
    }

    return errors;
  }

  /* ── Form Submit ── */
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setIsSaving(true);
    const now = formatAuditTimestamp();

    try {
      if (mode === 'EDIT') {
        // Update existing version entry with version-scoped attachments
        const updatedVersions = (vendor.effectiveVersions || []).map((v) => {
          if (v.id !== selectedVersionId) return v;
          return {
            ...v,
            effectiveDate: formData.effectiveDate.trim(),
            contactPersonName: formData.contactPersonName.trim(),
            phoneNo: formData.phoneNo.trim(),
            alternatePhoneNo: formData.alternatePhoneNo?.trim() || '',
            gstNo: formData.gstNo?.trim().toUpperCase() || '',
            website: formData.website?.trim() || '',
            email: formData.email.trim(),
            countryId: formData.countryId,
            stateId: formData.stateId,
            city: formData.city.trim(),
            zipCode: formData.zipCode.trim(),
            address1: formData.address1.trim(),
            address2: formData.address2?.trim() || '',
            notes: formData.notes?.trim() || '',
            attachments: [...attachments],
          };
        });

        await updateVendorVersions(vendor.id, updatedVersions);
        toast.success('Effective date updated');
        setMode('VIEW');
      } else if (mode === 'ADD') {
        // Create new version entry with version-scoped attachments
        const newVersionId = `ver_${Date.now()}`;
        const newVersion = {
          id: newVersionId,
          effectiveDate: formData.effectiveDate.trim(),
          contactPersonName: formData.contactPersonName.trim(),
          phoneNo: formData.phoneNo.trim(),
          alternatePhoneNo: formData.alternatePhoneNo?.trim() || '',
          gstNo: formData.gstNo?.trim().toUpperCase() || '',
          website: formData.website?.trim() || '',
          email: formData.email.trim(),
          countryId: formData.countryId,
          stateId: formData.stateId,
          city: formData.city.trim(),
          zipCode: formData.zipCode.trim(),
          address1: formData.address1.trim(),
          address2: formData.address2?.trim() || '',
          notes: formData.notes?.trim() || '',
          attachments: [...attachments],
          createdOn: now,
          createdBy: 'Ian Chesnut',
        };

        const updatedVersions = [...(vendor.effectiveVersions || []), newVersion];
        await updateVendorVersions(vendor.id, updatedVersions);
        toast.success('New effective date added');
        setSelectedVersionId(newVersionId);
        setMode('VIEW');
      }
    } catch {
      toast.error('Failed to save vendor version.');
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Column Definitions for Resizable TanStack Table Grid ── */
  const columns = useMemo(
    () => [
      /* 1. EFFECTIVE DATE */
      columnHelper.accessor('effectiveDate', {
        header: 'EFFECTIVE DATE',
        minSize: 180,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          const isCurrent = activeVersion?.id === row.id;
          return (
            <div className="flex items-center gap-2 flex-wrap py-0.5">
              <span className="font-mono text-xs font-semibold text-heading">
                {formatDateDisplay(row.effectiveDate)}
              </span>
              <span className="font-mono text-[11px] text-text-muted">
                ({row.effectiveDate})
              </span>
              {isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-success/15 text-success border border-success/30 select-none">
                  Current
                </span>
              )}
            </div>
          );
        },
      }),

      /* 2. CITY / STATE */
      columnHelper.accessor(
        (row) =>
          `${row.city ? row.city + ', ' : ''}${getStateName(row.countryId, row.stateId) || '—'}`,
        {
          id: 'cityState',
          header: 'CITY / STATE',
          minSize: 180,
          size: 260,
          cell: (info) => {
            const row = info.row.original;
            return (
              <span className="text-xs text-text truncate block py-0.5">
                {row.city ? `${row.city}, ` : ''}
                {getStateName(row.countryId, row.stateId) || '—'}
              </span>
            );
          },
        }
      ),

      /* 3. CREATED ON */
      columnHelper.accessor('createdOn', {
        header: 'CREATED ON',
        minSize: 160,
        size: 220,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted py-0.5 block">
            {info.getValue() || '—'}
          </span>
        ),
      }),

      /* 4. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 110,
        size: 120,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const isSelected = selectedVersion?.id === row.id;

          return (
            <div
              className="flex items-center justify-end gap-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSelectView(row)}
                title="View this version"
                className={
                  isSelected && mode === 'VIEW'
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-muted hover:text-primary hover:bg-surface'
                }
              >
                <Eye size={15} />
              </Button>

              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStartEdit(row)}
                  title="Edit this version"
                  className={
                    isSelected && mode === 'EDIT'
                      ? 'bg-primary/15 text-primary'
                      : 'text-text-muted hover:text-primary hover:bg-surface'
                  }
                >
                  <Pencil size={15} />
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [activeVersion, selectedVersion, mode, isReadOnly]
  );

  /* ── React Table Instance with Column Resizing Enabled ── */
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

  // Not found fallback
  if (!vendor) {
    return (
      <div className="w-full py-12 px-4 sm:px-6">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
          <AlertCircle size={40} className="text-warning mx-auto" />
          <h2 className="text-xl font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The vendor you are trying to edit does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/vendors')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Vendors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── 1. HEADER (FULL SCREEN WIDTH) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backPath)}
            className="text-text-muted hover:text-heading h-9 px-2.5 -ml-2"
            title={backLabel}
          >
            <ArrowLeft size={18} className="mr-1" />
            <span className="text-xs font-semibold">{backLabel}</span>
          </Button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-heading tracking-tight">
                {vendor.vendorName}
              </h1>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                {vendor.vendorCode}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Effective-dated version history, master details, and supporting documents
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium select-none',
              vendor.isActive
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20',
            ].join(' ')}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                vendor.isActive ? 'bg-success' : 'bg-danger'
              }`}
              aria-hidden="true"
            />
            {vendor.isActive ? 'Active' : 'Inactive'}
          </span>

          <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
            {vendor.approvalStatus || 'Pending'}
          </Badge>
        </div>
      </div>

      {/* ── 2. EFFECTIVE DATES GRID / CARDS (CARD WITH RESIZABLE COLUMNS) ── */}
      <Card className="overflow-hidden shadow-xs border-border">
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-heading flex items-center gap-2">
              <Calendar size={17} className="text-primary shrink-0" />
              Effective Dates
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Timeline of version records for this vendor. Drag column borders to resize columns.
            </p>
          </div>

          {!isReadOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartAdd}
              className="text-xs shrink-0 w-full sm:w-auto justify-center"
            >
              <Plus size={14} className="mr-1.5" />
              Add New Effective Date
            </Button>
          )}
        </div>

        {/* ── MOBILE VIEW (< md): Card List for Small Screens ── */}
        <div className="block md:hidden p-3 space-y-2.5 bg-bg/50 max-h-[260px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          {versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No effective date records found for this vendor.
            </div>
          ) : (
            versions.map((ver) => {
              const isCurrent = activeVersion?.id === ver.id;
              const isSelected = selectedVersion?.id === ver.id;
              const verAtts = Array.isArray(ver.attachments) ? ver.attachments : [];

              return (
                <div
                  key={ver.id}
                  onClick={() => handleSelectView(ver)}
                  className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left relative ${
                    isSelected
                      ? 'bg-primary/[0.06] border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'bg-surface border-border hover:border-primary/40'
                  }`}
                >
                  {/* Top line: Date + Badge + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-heading">
                          {formatDateDisplay(ver.effectiveDate)}
                        </span>
                        <span className="font-mono text-[10px] text-text-muted">
                          ({ver.effectiveDate})
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-success/15 text-success border border-success/30">
                            Current
                          </span>
                        )}
                        {isSelected && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-primary/15 text-primary">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Card Actions */}
                    <div
                      className="flex items-center gap-1 shrink-0 -mt-1 -mr-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSelectView(ver)}
                        title="View this version"
                        className={`h-7 w-7 ${
                          isSelected && mode === 'VIEW'
                            ? 'bg-primary/15 text-primary'
                            : 'text-text-muted hover:text-primary hover:bg-surface'
                        }`}
                      >
                        <Eye size={14} />
                      </Button>

                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(ver)}
                          title="Edit this version"
                          className={`h-7 w-7 ${
                            isSelected && mode === 'EDIT'
                              ? 'bg-primary/15 text-primary'
                              : 'text-text-muted hover:text-primary hover:bg-surface'
                          }`}
                        >
                          <Pencil size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Middle / Bottom line: Context info */}
                  <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-text-muted">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="shrink-0 text-text-muted/70" />
                      <span className="truncate">
                        {ver.city ? `${ver.city}, ` : ''}
                        {getStateName(ver.countryId, ver.stateId) || '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <Clock size={11} className="shrink-0 text-text-muted/70" />
                        <span>{ver.createdOn || '—'}</span>
                      </div>

                      {verAtts.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                          <Paperclip size={10} />
                          {verAtts.length} doc{verAtts.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── DESKTOP & TABLET VIEW (md+): Resizable TanStack Table Grid with Scroll & Sticky Header ── */}
        <div className="hidden md:block max-h-[230px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          <TableContainer>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface border-b border-border sticky top-0 z-10 shadow-2xs">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

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
                        className={`relative py-3.5 px-6 select-none bg-surface ${
                          canSort ? 'cursor-pointer hover:bg-surface/80' : ''
                        }`}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="group/th-btn flex items-center gap-1.5 w-full text-left select-none cursor-pointer hover:text-heading transition-colors"
                          >
                            <span className="truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>

                            <span className="shrink-0 ml-1 inline-flex items-center">
                              {sorted === 'asc' ? (
                                <ChevronUp
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : sorted === 'desc' ? (
                                <ChevronDown
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <ChevronUp size={11} strokeWidth={2.5} />
                                  <ChevronDown size={11} strokeWidth={2.5} />
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div
                            className={`select-none ${
                              header.id === 'actions' ? 'text-right w-full pr-1' : ''
                            }`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </Th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border bg-bg">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-xs text-text-muted"
                  >
                    No effective date records found for this vendor.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedVersion?.id === row.original.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectView(row.original)}
                      className={`cursor-pointer transition-colors duration-120 ${
                        isSelected
                          ? 'bg-primary/[0.06]'
                          : 'hover:bg-surface/50'
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className="py-3.5 px-6"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </Td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableContainer>
        </div>
      </Card>

      {/* ── 3. DETAIL / FORM PANEL (CARD) ── */}
      <Card className="overflow-hidden shadow-xs border-border">
        {/* Panel Header */}
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-heading break-words">
              {mode === 'VIEW' && (
                <>
                  Viewing version — Effective{' '}
                  <span className="font-mono text-primary">
                    {formatDateDisplay(selectedVersion?.effectiveDate)}
                  </span>
                </>
              )}
              {mode === 'EDIT' && (
                <>
                  Editing version — Effective{' '}
                  <span className="font-mono text-primary">
                    {formatDateDisplay(formData.effectiveDate || selectedVersion?.effectiveDate)}
                  </span>
                </>
              )}
              {mode === 'ADD' && 'Add new effective date'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {mode === 'VIEW' &&
                'Read-only view of fields and attachments effective from this date.'}
              {mode === 'EDIT' &&
                'Modify versioned vendor information, address, and attachments.'}
              {mode === 'ADD' &&
                'Clone-forward from current active version with a new unique effective date.'}
            </p>
          </div>

          {/* Panel Top Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-end">
            {!isReadOnly && mode === 'VIEW' && selectedVersion && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStartEdit(selectedVersion)}
                className="text-xs w-full sm:w-auto justify-center"
              >
                <Pencil size={13} className="mr-1.5" />
                Edit this version
              </Button>
            )}

            {(mode === 'EDIT' || mode === 'ADD') && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-xs"
                >
                  <X size={13} className="mr-1.5" />
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="text-xs"
                >
                  <Save size={13} className="mr-1.5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Mode 1: VIEW MODE ── */}
        {mode === 'VIEW' && selectedVersion && (
          <div className="p-4 sm:p-6 space-y-6 divide-y divide-border/60">
            {/* 1. Contact Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <Contact size={15} className="text-primary" />
                Contact Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                <DetailField
                  label="Effective Date"
                  value={`${formatDateDisplay(selectedVersion.effectiveDate)} (${selectedVersion.effectiveDate || '—'})`}
                  mono
                />
                <DetailField
                  label="Contact Person Name"
                  value={selectedVersion.contactPersonName}
                />
                <DetailField
                  label="Phone Number"
                  value={selectedVersion.phoneNo}
                  mono
                />
                <DetailField
                  label="Alternate Phone"
                  value={selectedVersion.alternatePhoneNo}
                  mono
                />
                <DetailField
                  label="Email Address"
                  value={selectedVersion.email}
                />
                <DetailField
                  label="GST / Tax Identification"
                  value={selectedVersion.gstNo}
                  mono
                />
                <DetailField
                  label="Website URL"
                  value={selectedVersion.website}
                  isLink
                  href={selectedVersion.website}
                />
              </div>
            </div>

            {/* 2. Address Details */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <MapPin size={15} className="text-primary" />
                Address Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                <DetailField
                  label="Country"
                  value={getCountryName(selectedVersion.countryId)}
                />
                <DetailField
                  label="State / Province"
                  value={getStateName(selectedVersion.countryId, selectedVersion.stateId)}
                />
                <DetailField
                  label="City"
                  value={selectedVersion.city}
                />
                <DetailField
                  label="ZIP / Postal Code"
                  value={selectedVersion.zipCode}
                  mono
                />
                <DetailField
                  label="Address Line 1"
                  value={selectedVersion.address1}
                />
                <DetailField
                  label="Address Line 2"
                  value={selectedVersion.address2}
                />
              </div>
            </div>

            {/* 3. Procurement Notes & Version Audit */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <FileText size={15} className="text-primary" />
                Procurement & Quality Notes
              </div>
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
                    Notes & Terms
                  </span>
                  <div className="text-xs text-heading font-medium bg-surface/50 rounded-lg p-3.5 border border-border/60 whitespace-pre-line leading-relaxed">
                    {selectedVersion.notes || 'No specific notes recorded for this effective date.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <DetailField
                    label="Version Created On"
                    value={selectedVersion.createdOn || '—'}
                    mono
                  />
                  <DetailField
                    label="Version Created By"
                    value={selectedVersion.createdBy || 'System'}
                  />
                </div>
              </div>
            </div>

            {/* 4. Attachments & Supporting Documents (VIEW MODE — Click opens Screen Popup) */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                  <Paperclip size={15} className="text-primary" />
                  Attachments & Supporting Documents
                  <span className="text-[11px] font-normal text-text-muted ml-1">
                    ({currentViewAttachments.length})
                  </span>
                </div>
                <span className="text-[11px] text-text-muted hidden sm:inline">
                  Click any document card to view details in popup
                </span>
              </div>

              {currentViewAttachments.length === 0 ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No documents or certificates attached for this effective date.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {currentViewAttachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setPreviewItem(att)}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-bg hover:border-primary/60 hover:bg-primary/[0.03] hover:shadow-xs transition-all duration-150 cursor-pointer group select-none"
                      title="Click to view document in popup"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-surface border border-border group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors shrink-0">
                          {getFileIcon(att.fileName, att.fileType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                            {att.documentName || att.fileName}
                          </p>
                          <p className="text-[11px] text-text-muted truncate mt-0.5">
                            {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(att);
                          }}
                          title="View preview"
                          className="h-8 w-8 text-text-muted group-hover:text-primary hover:bg-primary/10"
                        >
                          <Maximize2 size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDownloadAttachment(att, e)}
                          title="Download document"
                          className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/10"
                        >
                          <Download size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Mode 2 & 3: EDIT & ADD FORM ── */}
        {(mode === 'EDIT' || mode === 'ADD') && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {/* Section 1: Effective Date & Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <Contact size={15} className="text-primary" />
                Contact Information
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Effective Date */}
                <div>
                  <Input
                    id="effectiveDate"
                    name="effectiveDate"
                    label="Effective Date"
                    type="date"
                    min={minAllowedEffectiveDate || undefined}
                    value={formData.effectiveDate}
                    onChange={handleInputChange}
                    error={formErrors.effectiveDate}
                    hint={minAllowedEffectiveDate ? `Must be on or after ${formatDateDisplay(minAllowedEffectiveDate)}` : undefined}
                    required
                  />
                </div>

                {/* Contact Person Name */}
                <div>
                  <Input
                    id="contactPersonName"
                    name="contactPersonName"
                    label="Contact Person Name"
                    placeholder="e.g. Rajesh Patel"
                    value={formData.contactPersonName}
                    onChange={handleInputChange}
                    error={formErrors.contactPersonName}
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <Input
                    id="phoneNo"
                    name="phoneNo"
                    label="Phone Number"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.phoneNo}
                    onChange={handleInputChange}
                    error={formErrors.phoneNo}
                    required
                  />
                </div>

                {/* Alternate Phone */}
                <div>
                  <Input
                    id="alternatePhoneNo"
                    name="alternatePhoneNo"
                    label="Alternate Phone"
                    type="tel"
                    placeholder="e.g. 9823456781"
                    value={formData.alternatePhoneNo}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <Input
                    id="email"
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="e.g. rajesh.patel@apexcastings.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={formErrors.email}
                    required
                  />
                </div>

                {/* GST Number */}
                <div>
                  <Input
                    id="gstNo"
                    name="gstNo"
                    label="GST / Tax ID"
                    placeholder="e.g. 24AABCA1234F1Z5"
                    value={formData.gstNo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        gstNo: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>

                {/* Website */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <Input
                    id="website"
                    name="website"
                    label="Website URL"
                    type="url"
                    placeholder="e.g. https://www.apexcastings.com"
                    value={formData.website}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Address Details */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <MapPin size={15} className="text-primary" />
                Address Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Country */}
                <div>
                  <SearchableSelect
                    id="countryId"
                    name="countryId"
                    label="Country"
                    required
                    options={COUNTRY_OPTIONS}
                    value={formData.countryId}
                    onChange={handleCountryChange}
                    placeholder="Select Country..."
                    searchPlaceholder="Search country..."
                    error={formErrors.countryId}
                  />
                </div>

                {/* State */}
                <div>
                  <SearchableSelect
                    id="stateId"
                    name="stateId"
                    label="State / Province"
                    required
                    options={stateOptions}
                    value={formData.stateId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, stateId: e.target.value }));
                      if (formErrors.stateId) {
                        setFormErrors((prev) => ({ ...prev, stateId: '' }));
                      }
                    }}
                    placeholder="Select State..."
                    searchPlaceholder="Search state..."
                    disabled={!formData.countryId}
                    error={formErrors.stateId}
                  />
                </div>

                {/* City */}
                <div>
                  <Input
                    id="city"
                    name="city"
                    label="City"
                    placeholder="e.g. Vallabh Vidyanagar"
                    value={formData.city}
                    onChange={handleInputChange}
                    error={formErrors.city}
                    required
                  />
                </div>

                {/* ZIP / Postal Code */}
                <div>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    label="ZIP / Postal Code"
                    placeholder="e.g. 388120"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    error={formErrors.zipCode}
                    required
                  />
                </div>

                {/* Address Line 1 */}
                <div className="sm:col-span-2">
                  <Input
                    id="address1"
                    name="address1"
                    label="Address Line 1"
                    placeholder="e.g. Plot 45, GIDC Industrial Estate Phase II"
                    value={formData.address1}
                    onChange={handleInputChange}
                    error={formErrors.address1}
                    required
                  />
                </div>

                {/* Address Line 2 */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <Input
                    id="address2"
                    name="address2"
                    label="Address Line 2"
                    placeholder="e.g. Near Anand Cross Road"
                    value={formData.address2}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Notes & Instructions */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <FileText size={15} className="text-primary" />
                Procurement & Quality Notes
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-xs font-semibold text-heading mb-1.5"
                >
                  Notes & Special Terms
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Enter vendor terms, quality certificates, delivery notes, or special handling instructions..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-heading placeholder:text-text-muted/60 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all resize-y"
                />
              </div>
            </div>

            {/* Section 4: Attachments & Supporting Documents (EDIT/ADD MODE — Version-Scoped) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <Paperclip size={15} className="text-primary" />
                Attachments & Supporting Documents for this Version
                <span className="text-[11px] font-normal text-text-muted ml-1">
                  ({attachments.length})
                </span>
              </div>

              {/* Upload Header Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <SearchableSelect
                    id="docTypeSelector"
                    placeholder="Select Document Type before uploading (optional)..."
                    searchPlaceholder="Search document types..."
                    options={DOCUMENT_TYPE_OPTIONS}
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                  />
                </div>

                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 text-xs"
                  >
                    <UploadCloud size={15} className="mr-1.5" />
                    Browse Files
                  </Button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-surface/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <UploadCloud
                  size={28}
                  className={`mx-auto mb-2 ${
                    isDragging ? 'text-primary' : 'text-text-muted'
                  }`}
                />
                <p className="text-xs font-semibold text-heading">
                  Drag and drop files here, or <span className="text-primary">browse</span>
                </p>
                <p className="text-[11px] text-text-muted mt-1">
                  Supported formats: PDF, PNG, JPG, JPEG, WEBP (Up to 10 MB per file)
                </p>
              </div>

              {attachmentError && (
                <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{attachmentError}</span>
                </div>
              )}

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg hover:border-primary/40 transition-colors"
                    >
                      <div
                        onClick={() => setPreviewItem(att)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        title="Click to preview"
                      >
                        {getFileIcon(att.fileName, att.fileType)}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-heading truncate hover:text-primary transition-colors">
                            {att.documentName || att.fileName}
                          </p>
                          <p className="text-[11px] text-text-muted truncate">
                            {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewItem(att)}
                          title="Preview file"
                          className="h-7 w-7 text-text-muted hover:text-primary"
                        >
                          <Maximize2 size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDownloadAttachment(att, e)}
                          title="Download file"
                          className="h-7 w-7 text-text-muted hover:text-primary"
                        >
                          <Download size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAttachment(att.id)}
                          title="Remove attachment"
                          className="h-7 w-7 text-text-muted hover:text-danger"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
              >
                <Save size={15} className="mr-1.5" />
                {isSaving ? 'Saving...' : mode === 'ADD' ? 'Add Effective Date' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* ── Document Screen Popup (Modal) ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.documentName || previewItem.fileName}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-surface/50 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="text-[11px] font-mono">
                  {previewItem.fileName.split('.').pop()?.toUpperCase() || 'DOC'}
                </Badge>
                <span className="text-heading font-medium truncate max-w-xs sm:max-w-md">
                  {previewItem.fileName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-text-muted">
                {previewItem.fileSize && (
                  <span>Size: <strong className="text-heading">{previewItem.fileSize}</strong></span>
                )}
                {previewItem.uploadedAt && (
                  <span>Uploaded: <strong className="text-heading font-mono">{previewItem.uploadedAt}</strong></span>
                )}
              </div>
            </div>

            {/* Screen Popup Preview Content */}
            <div className="bg-bg rounded-2xl border border-border p-4 sm:p-6 flex items-center justify-center min-h-[320px] max-h-[65vh] overflow-auto shadow-inner">
              {previewItem.fileUrl ? (
                previewItem.fileType?.startsWith('image/') ? (
                  <img
                    src={previewItem.fileUrl}
                    alt={previewItem.documentName}
                    className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <iframe
                    src={previewItem.fileUrl}
                    title={previewItem.documentName}
                    className="w-full h-[55vh] rounded-xl border border-border shadow-xs"
                  />
                )
              ) : (
                /* Enhanced visual certificate / document card presentation for mock documents */
                <div className="w-full max-w-lg bg-surface border-2 border-border/80 rounded-2xl p-6 shadow-sm text-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                    <ShieldCheck size={180} />
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                    {previewItem.fileName?.toLowerCase().endsWith('.pdf') ? (
                      <FileText size={28} className="text-danger" />
                    ) : (
                      <FileCheck size={28} className="text-primary" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-success/10 text-success border border-success/20">
                      <ShieldCheck size={12} /> Verified Document
                    </span>
                    <h4 className="text-base font-bold text-heading mt-2">
                      {previewItem.documentName || previewItem.fileName}
                    </h4>
                    <p className="text-xs text-text-muted font-mono">
                      {previewItem.fileName}
                    </p>
                  </div>

                  <div className="bg-bg rounded-xl p-3 border border-border text-left space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Vendor:</span>
                      <span className="font-semibold text-heading">{vendor.vendorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Document Type:</span>
                      <span className="font-semibold text-heading">{previewItem.documentName || 'General Attachment'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">File Size:</span>
                      <span className="font-mono text-heading">{previewItem.fileSize || 'Standard Document'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Effective Scope:</span>
                      <span className="font-mono text-heading">{selectedVersion?.effectiveDate || 'Master'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Popup Action Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewItem(null)}
              >
                Close Preview
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={(e) => handleDownloadAttachment(previewItem, e)}
              >
                <Download size={14} className="mr-1.5" />
                Download Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
