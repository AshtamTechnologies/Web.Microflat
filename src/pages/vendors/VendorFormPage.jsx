/**
 * VendorFormPage — Full-page Add and Edit vendor form for MicroFlat ERP.
 *
 * Replaces modal pattern with structured full-page flow:
 *   - Route: /vendors/new (Add mode) & /vendors/:id/edit (Edit mode)
 *   - Grouped sections inside Cards:
 *       1. Vendor Details (VendorCode, VendorName, Account Status)
 *       2. ERP Effective Dates & Master Revisions (VendorEffectiveDatesGrid)
 *       3. Contact Information (ContactPersonName, Email, PhoneNo, AlternatePhoneNo, GSTIN, Website)
 *       4. Address (CountryId, StateId [cascading], City, ZipCode, Address1, Address2)
 *       5. Procurement & Quality Notes
 *       6. Attachments & Supporting Documents
 *       7. [Edit Mode Only] Approval & Audit info panel (read-only collapsed/muted card)
 *   - Dual action controls: Top header bar + Sticky bottom save bar.
 *   - On-blur and on-submit validation with inline error messaging.
 *   - Dirty form detection on Cancel navigation.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  X,
  Truck,
  Building2,
  Contact,
  MapPin,
  FileText,
  ShieldCheck,
  Clock,
  AlertCircle,
  Paperclip,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Eye,
  Download,
  ExternalLink,
} from 'lucide-react';

import {
  Button,
  Input,
  SearchableSelect,
  StatusSwitch,
  Badge,
  Card,
  Modal,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import {
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
} from '../../mocks/vendors';
import {
  getTodayIsoDate,
} from '../../utils/effectiveDateUtils';
import VendorEffectiveDatesGrid from './VendorEffectiveDatesGrid';

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
  const type = fileType.toLowerCase();

  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <FileText size={18} className="text-danger shrink-0" />;
  }
  return <ImageIcon size={18} className="text-primary shrink-0" />;
}

const INITIAL_FORM = {
  vendorCode: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  effectiveDateHistory: [],
  vendorName: '',
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
  attachments: [],
  isActive: true,
};

function validateField(name, value) {
  const str = typeof value === 'string' ? value.trim() : '';

  switch (name) {
    case 'vendorCode':
      if (!str) return 'Vendor code is required.';
      return '';
    case 'vendorName':
      if (!str) return 'Vendor name is required.';
      return '';
    case 'contactPersonName':
      if (!str) return 'Contact person name is required.';
      return '';
    case 'phoneNo':
      if (!str) return 'Phone number is required.';
      if (!/^\d+$/.test(str)) return 'Phone number must contain digits only.';
      if (str.length < 10) return 'Phone number must be at least 10 digits.';
      return '';
    case 'alternatePhoneNo':
      if (str) {
        if (!/^\d+$/.test(str)) return 'Alternate phone must contain digits only.';
        if (str.length < 10) return 'Alternate phone must be at least 10 digits.';
      }
      return '';
    case 'email':
      if (!str) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
        return 'Enter a valid email address.';
      return '';
    case 'gstNo':
      if (str && str.length > 0 && str.length !== 15) {
        return 'GST number must be 15 alphanumeric characters.';
      }
      return '';
    case 'website':
      if (str && !/^https?:\/\/.+/i.test(str) && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(str)) {
        return 'Enter a valid URL (e.g. https://www.company.com).';
      }
      return '';
    case 'countryId':
      if (!value) return 'Country is required.';
      return '';
    case 'stateId':
      if (!value) return 'State / Province is required.';
      return '';
    case 'city':
      if (!str) return 'City is required.';
      return '';
    case 'zipCode':
      if (!str) return 'Postal / Zip code is required.';
      if (!/^\d+$/.test(str)) return 'Zip code must contain digits only.';
      return '';
    case 'address1':
      if (!str) return 'Address Line 1 is required.';
      return '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  const requiredFields = [
    'vendorCode',
    'vendorName',
    'contactPersonName',
    'phoneNo',
    'email',
    'countryId',
    'stateId',
    'city',
    'zipCode',
    'address1',
  ];

  requiredFields.forEach((field) => {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  });

  if (form.alternatePhoneNo) {
    const err = validateField('alternatePhoneNo', form.alternatePhoneNo);
    if (err) errors.alternatePhoneNo = err;
  }
  if (form.gstNo) {
    const err = validateField('gstNo', form.gstNo);
    if (err) errors.gstNo = err;
  }
  if (form.website) {
    const err = validateField('website', form.website);
    if (err) errors.website = err;
  }

  return errors;
}

export default function VendorFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    getVendorById,
    getNextVendorCode,
    createVendor,
    updateVendor,
  } = useVendorsContext();

  const existingVendor = useMemo(() => {
    return isEdit ? getVendorById(id) : null;
  }, [isEdit, id, getVendorById]);

  const [form, setForm] = useState(INITIAL_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAuditCollapsed, setIsAuditCollapsed] = useState(true);

  // Attachment upload helper state
  const [selectedDocType, setSelectedDocType] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  const initializedIdRef = useRef(null);

  // Initialize form state once per record / route
  useEffect(() => {
    if (isEdit) {
      if (existingVendor && initializedIdRef.current !== id) {
        initializedIdRef.current = id;
        const initialHistory =
          existingVendor.effectiveDateHistory && existingVendor.effectiveDateHistory.length > 0
            ? [...existingVendor.effectiveDateHistory]
            : [
                {
                  id: 'eff_init',
                  revisionNo: 'REV-001',
                  effectiveDate: existingVendor.effectiveDate || getTodayIsoDate(),
                  status: 'ACTIVE',
                  reason: 'Initial Vendor Registration & Master Setup',
                  updatedBy: existingVendor.createdBy || 'Ian Chesnut',
                  updatedOn: existingVendor.createdOn || `${getTodayIsoDate()} 10:00 AM`,
                },
              ];

        const data = {
          vendorCode: existingVendor.vendorCode || '',
          effectiveDate: existingVendor.effectiveDate || getTodayIsoDate(),
          effectiveDateHistory: initialHistory,
          vendorName: existingVendor.vendorName || '',
          contactPersonName: existingVendor.contactPersonName || '',
          phoneNo: existingVendor.phoneNo || '',
          alternatePhoneNo: existingVendor.alternatePhoneNo || '',
          email: existingVendor.email || '',
          gstNo: existingVendor.gstNo || '',
          website: existingVendor.website || '',
          countryId: existingVendor.countryId || 'IN',
          stateId: existingVendor.stateId || '',
          city: existingVendor.city || '',
          zipCode: existingVendor.zipCode || '',
          address1: existingVendor.address1 || '',
          address2: existingVendor.address2 || '',
          notes: existingVendor.notes || '',
          attachments: existingVendor.attachments ? [...existingVendor.attachments] : [],
          isActive: existingVendor.isActive !== undefined ? existingVendor.isActive : true,
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    } else {
      if (initializedIdRef.current !== 'new') {
        initializedIdRef.current = 'new';
        const generatedCode = getNextVendorCode();
        const today = getTodayIsoDate();
        const initialHistory = [
          {
            id: `eff_${Date.now()}`,
            revisionNo: 'REV-001',
            effectiveDate: today,
            status: 'ACTIVE',
            reason: 'Initial Vendor Registration & Master Setup',
            updatedBy: 'Ian Chesnut',
            updatedOn: `${today} 10:00 AM`,
          },
        ];

        const data = {
          ...INITIAL_FORM,
          vendorCode: generatedCode,
          effectiveDate: today,
          effectiveDateHistory: initialHistory,
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    }
  }, [isEdit, id, existingVendor, getNextVendorCode]);

  // Cascading state options based on selected country
  const stateOptions = useMemo(() => {
    if (!form.countryId) return [];
    return STATE_OPTIONS[form.countryId] || [];
  }, [form.countryId]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  function handleEffectiveGridChange({ effectiveDateHistory, effectiveDate }) {
    setForm((prev) => ({
      ...prev,
      effectiveDateHistory,
      effectiveDate: effectiveDate || prev.effectiveDate,
    }));
    setErrors((prev) => ({ ...prev, effectiveDate: '' }));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleCountryChange(e) {
    const nextCountryId = e.target.value;
    setForm((prev) => ({
      ...prev,
      countryId: nextCountryId,
      stateId: '', // Reset state when country changes
    }));
    if (errors.countryId || errors.stateId) {
      setErrors((prev) => ({ ...prev, countryId: '', stateId: '' }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    // Auto-uppercase GST number on blur
    if (name === 'gstNo' && typeof value === 'string') {
      const upper = value.toUpperCase();
      setForm((prev) => ({ ...prev, gstNo: upper }));
      const err = validateField(name, upper);
      if (err) setErrors((prev) => ({ ...prev, [name]: err }));
      return;
    }
    const err = validateField(name, value);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  }

  // ── Attachment handling ──
  function handleFilesAdded(files) {
    const validFiles = Array.from(files).filter(isAllowedFile);
    if (validFiles.length === 0) {
      setAttachmentError('Only PDF and image files (PNG, JPG, WEBP) are allowed.');
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

    setForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...newAttachments],
    }));

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

  function handleRemoveAttachment(id) {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((att) => att.id !== id),
    }));
  }

  function handleDownloadAttachment(att) {
    if (att.fileUrl) {
      const a = document.createElement('a');
      a.href = att.fileUrl;
      a.download = att.fileName || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([`MicroFlat ERP Mock Document: ${att.documentName}\nFile: ${att.fileName}`], {
        type: 'text/plain;charset=utf-8',
      });
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

  function handleCancel() {
    if (isDirty) {
      const discard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!discard) return;
    }
    navigate('/vendors');
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Scroll to first error
      const firstErrorField = Object.keys(fieldErrors)[0];
      const el = document.getElementById(firstErrorField);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }
      return;
    }

    setLoading(true);
    try {
      if (isEdit && existingVendor) {
        const res = await updateVendor(existingVendor.id, form);
        if (res.ok) {
          navigate(`/vendors/${existingVendor.id}`);
        }
      } else {
        const res = await createVendor(form);
        if (res.ok && res.vendor) {
          navigate(`/vendors/${res.vendor.id}`);
        }
      }
    } catch {
      // Handled via toast
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && !existingVendor) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested vendor with ID "{id}" could not be located in the database.
          </p>
          <Button variant="primary" onClick={() => navigate('/vendors')}>
            Return to Vendors
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-20">
      {/* ── Top Page Header & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer mb-3"
          >
            <ArrowLeft size={14} className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform duration-150" aria-hidden="true" />
            <span>Back to Vendors</span>
          </button>
          <h1 className="text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            {isEdit ? `Edit Vendor: ${existingVendor?.vendorName}` : 'Add New Vendor'}
          </h1>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleCancel}
            disabled={loading}
          >
            <X size={16} className="mr-1.5" aria-hidden="true" />
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading}
          >
            <Save size={16} className="mr-1.5" aria-hidden="true" />
            {isEdit ? 'Save Changes' : 'Create Vendor'}
          </Button>
        </div>
      </div>

      {/* ── SECTION 1: VENDOR DETAILS ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <Truck size={18} className="text-primary" aria-hidden="true" />
            <span>1. Vendor Master Details</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Basic classification & active account status
          </span>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Vendor Code */}
            <Input
              id="vendorCode"
              name="vendorCode"
              type="text"
              label="Vendor Code"
              placeholder="e.g. VEN-0007"
              required
              value={form.vendorCode}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.vendorCode}
              hint="System-suggested sequence code (editable if needed)"
              className="font-mono text-sm uppercase"
            />

            {/* Vendor Name */}
            <Input
              id="vendorName"
              name="vendorName"
              type="text"
              label="Vendor / Company Name"
              placeholder="e.g. Apex Precision Castings Pvt Ltd"
              required
              value={form.vendorName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.vendorName}
              autoComplete="organization"
            />
          </div>

          {/* Status Switch */}
          <div className="flex flex-col justify-between pt-2 border-t border-border/70">
            <label className="text-sm font-medium text-heading block leading-none mb-2">
              Account Status <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <div className="flex items-center gap-3 h-[42px]">
              <StatusSwitch
                id="vendor-status-switch"
                checked={form.isActive}
                onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
              <span className="text-xs text-text-muted">
                {form.isActive
                  ? 'Vendor is active and eligible for new purchase orders and quotes.'
                  : 'Vendor is inactive and temporarily blocked from PO creation.'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── SECTION 2: ERP EFFECTIVE DATES & MASTER REVISIONS GRID ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <Clock size={18} className="text-primary" aria-hidden="true" />
            <span>2. ERP Effective Dates & Master Revisions</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Temporal effective date management & version history
          </span>
        </div>

        <VendorEffectiveDatesGrid
          history={form.effectiveDateHistory}
          currentEffectiveDate={form.effectiveDate}
          onChange={handleEffectiveGridChange}
          editable={true}
          vendorCode={form.vendorCode}
        />
      </Card>

      {/* ── SECTION 3: CONTACT INFORMATION ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <Contact size={18} className="text-primary" aria-hidden="true" />
            <span>3. Contact Information</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Primary communication channel & tax identifier
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Contact Person Name */}
          <Input
            id="contactPersonName"
            name="contactPersonName"
            type="text"
            label="Contact Person Name"
            placeholder="e.g. Rajesh Patel"
            required
            value={form.contactPersonName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.contactPersonName}
            autoComplete="name"
          />

          {/* Email */}
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="contact@company.com"
            required
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            autoComplete="email"
          />

          {/* Phone Number */}
          <Input
            id="phoneNo"
            name="phoneNo"
            type="tel"
            label="Primary Phone Number"
            placeholder="9876543210"
            required
            maxLength={10}
            value={form.phoneNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.phoneNo}
            hint="10-digit primary mobile or landline"
            className="font-mono tabular-nums"
            autoComplete="tel"
          />

          {/* Alternate Phone Number */}
          <Input
            id="alternatePhoneNo"
            name="alternatePhoneNo"
            type="tel"
            label="Alternate Phone Number"
            placeholder="9823456781 (optional)"
            maxLength={10}
            value={form.alternatePhoneNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.alternatePhoneNo}
            hint="Optional secondary contact number"
            className="font-mono tabular-nums"
          />

          {/* GST Number */}
          <Input
            id="gstNo"
            name="gstNo"
            type="text"
            label="GST Identification Number (GSTIN)"
            placeholder="e.g. 24AABCA1234F1Z5"
            maxLength={15}
            value={form.gstNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.gstNo}
            hint="15-character alphanumeric tax identifier (auto-capitalized)"
            className="font-mono uppercase"
          />

          {/* Website Link (Optional) */}
          <Input
            id="website"
            name="website"
            type="url"
            label="Website / Company URL"
            placeholder="https://www.company.com (optional)"
            value={form.website}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.website}
            hint="Optional company website or vendor portal link"
          />
        </div>
      </Card>

      {/* ── SECTION 4: ADDRESS ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <MapPin size={18} className="text-primary" aria-hidden="true" />
            <span>4. Address & Location</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Billing & dispatch registered location
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Country (SearchableSelect) */}
          <SearchableSelect
            id="countryId"
            name="countryId"
            label="Country"
            placeholder="Select country..."
            searchPlaceholder="Search countries..."
            emptyText="No countries found"
            required
            options={COUNTRY_OPTIONS}
            value={form.countryId}
            onChange={handleCountryChange}
            onBlur={handleBlur}
            error={errors.countryId}
          />

          {/* State (Cascading SearchableSelect) */}
          <SearchableSelect
            id="stateId"
            name="stateId"
            label="State / Province"
            placeholder={
              !form.countryId
                ? 'Select country first...'
                : stateOptions.length === 0
                  ? 'No states available'
                  : 'Select state...'
            }
            searchPlaceholder="Search states..."
            emptyText="No states found"
            required
            options={stateOptions}
            value={form.stateId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.stateId}
            disabled={!form.countryId || stateOptions.length === 0}
          />

          {/* City */}
          <Input
            id="city"
            name="city"
            type="text"
            label="City"
            placeholder="e.g. Ahmedabad"
            required
            value={form.city}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.city}
            autoComplete="address-level2"
          />

          {/* Postal / Zip Code */}
          <Input
            id="zipCode"
            name="zipCode"
            type="text"
            label="Postal / Zip Code"
            placeholder="e.g. 380015"
            required
            maxLength={6}
            value={form.zipCode}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.zipCode}
            className="font-mono tabular-nums"
            autoComplete="postal-code"
          />

          {/* Address Line 1 */}
          <div className="md:col-span-2">
            <Input
              id="address1"
              name="address1"
              type="text"
              label="Address Line 1"
              placeholder="e.g. Plot No. 42, GIDC Phase II"
              required
              value={form.address1}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.address1}
              autoComplete="address-line1"
            />
          </div>

          {/* Address Line 2 */}
          <div className="md:col-span-2">
            <Input
              id="address2"
              name="address2"
              type="text"
              label="Address Line 2 (Optional)"
              placeholder="e.g. Near ABC Circle, Vatva Industrial Estate"
              value={form.address2}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.address2}
              autoComplete="address-line2"
            />
          </div>
        </div>
      </Card>

      {/* ── SECTION 5: PROCUREMENT & QUALITY NOTES ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            <span>5. Procurement & Quality Notes</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Optional supplier remarks
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-heading">
            Internal Notes / ISO Certifications / Special Capabilities
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Add any internal remarks, capability notes, tooling standards, or ISO certification references..."
            value={form.notes}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 placeholder:text-text-muted transition-colors duration-150 ease-in-out outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-text-muted"
          />
        </div>
      </Card>

      {/* ── SECTION 6: ATTACHMENTS & SUPPORTING DOCUMENTS ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <Paperclip size={18} className="text-primary" aria-hidden="true" />
            <span>6. Attachments & Supporting Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-normal">
              Upload commercial, tax, and quality compliance files
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {form.attachments?.length || 0} {form.attachments?.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Uploader Control Box */}
          <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface/40 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Add New Attachment
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Name / Category Selection */}
              <div className="space-y-2">
                <SearchableSelect
                  id="attachmentDocType"
                  name="attachmentDocType"
                  label="Document Name / Type"
                  placeholder="Select document name / type..."
                  searchPlaceholder="Search document types..."
                  emptyText="No matching document types found"
                  options={DOCUMENT_TYPE_OPTIONS}
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                />
              </div>

              {/* Drag & Drop Zone and File Browser */}
              <div className="flex flex-col justify-between">
                <label className="text-sm font-medium text-heading block leading-none mb-2">
                  Select File(s)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${isDragging
                      ? 'border-primary bg-primary/10 scale-[0.99]'
                      : 'border-border hover:border-primary/60 bg-bg hover:bg-surface/60'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <UploadCloud size={20} />
                  </div>
                  <p className="text-xs font-medium text-heading">
                    <span className="text-primary hover:underline font-semibold">Click to choose files</span> or drag & drop here
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">
                    Allowed formats: <strong className="text-heading font-medium">Images (PNG, JPG, WEBP)</strong> & <strong className="text-heading font-medium">PDF documents</strong> only (Max 15MB each)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* List of Attached Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Attached Documents ({form.attachments?.length || 0})
              </h4>
            </div>

            {(!form.attachments || form.attachments.length === 0) ? (
              <div className="border border-border/80 rounded-xl p-8 text-center bg-surface/20">
                <div className="w-10 h-10 rounded-full bg-border/50 text-text-muted flex items-center justify-center mx-auto mb-2.5">
                  <Paperclip size={18} />
                </div>
                <p className="text-xs font-medium text-heading">No documents attached yet</p>
                <p className="text-[11px] text-text-muted mt-0.5 max-w-sm mx-auto">
                  Select a document name above and upload vendor credentials, GST certificates, MSME documents, or bank details.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-bg">
                {form.attachments.map((att, index) => (
                  <div
                    key={att.id || index}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/40 transition-colors"
                  >
                    {/* Left: Icon and Document / File Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-lg bg-surface border border-border shrink-0 mt-0.5">
                        {getFileIcon(att.fileName, att.fileType)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-heading break-words">
                          {att.documentName}
                        </h4>
                        <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] text-text break-all">{att.fileName}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">{att.fileSize || 'Unknown size'}</span>
                          {att.uploadedAt && (
                            <>
                              <span>•</span>
                              <span className="text-[11px] font-mono text-text-muted">Added: {att.uploadedAt}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions (Preview, Download, Delete) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(att)}
                        title="Preview attachment"
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface border border-border transition-colors cursor-pointer"
                        aria-label={`Preview ${att.documentName}`}
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        title="Download attachment"
                        className="p-1.5 rounded-lg text-text-muted hover:text-success hover:bg-surface border border-border transition-colors cursor-pointer"
                        aria-label={`Download ${att.documentName}`}
                      >
                        <Download size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        title="Remove attachment"
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 border border-border hover:border-danger/30 transition-colors cursor-pointer"
                        aria-label={`Remove ${att.documentName}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── SECTION 7 (EDIT MODE ONLY): READ-ONLY APPROVAL & AUDIT PANEL ── */}
      {isEdit && existingVendor && (
        <Card padding="md" className="bg-surface/50 border-border/80">
          <button
            type="button"
            onClick={() => setIsAuditCollapsed((prev) => !prev)}
            className="w-full flex items-center justify-between text-left cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-text-muted group-hover:text-primary transition-colors" />
              <span className="text-sm font-semibold text-heading">
                System-Managed Approval & Audit Info
              </span>
              <span className="text-xs text-text-muted bg-border/60 px-2 py-0.5 rounded">
                Read-only
              </span>
            </div>
            <span className="text-xs text-primary font-medium group-hover:underline">
              {isAuditCollapsed ? 'Show details' : 'Hide details'}
            </span>
          </button>

          {!isAuditCollapsed && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Approval Status */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
                    Approval Status
                  </span>
                  <Badge variant={existingVendor.approvalStatus?.toLowerCase() || 'pending'}>
                    {existingVendor.approvalStatus || 'Pending'}
                  </Badge>
                </div>

                {/* Approver Name */}
                {existingVendor.approvalStatus !== 'Pending' && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
                      Approved / Reviewed By
                    </span>
                    <span className="text-xs font-medium text-heading">
                      {existingVendor.approvedBy || 'System Admin'}
                    </span>
                  </div>
                )}

                {/* Approval Date */}
                {existingVendor.approvalStatus !== 'Pending' && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
                      Approved Date
                    </span>
                    <span className="text-xs font-mono tabular-nums text-text">
                      {existingVendor.approvedOn || '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Approval Comments */}
              {existingVendor.approvalStatus !== 'Pending' && existingVendor.approvedByComments && (
                <div className="bg-bg/80 p-3 rounded-lg border border-border text-xs space-y-1">
                  <span className="font-semibold text-text-muted">Reviewer Comments:</span>
                  <p className="text-text">{existingVendor.approvedByComments}</p>
                </div>
              )}

              {/* Metadata strip */}
              <div className="text-xs text-text-muted pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  Created by <strong className="text-heading font-medium">{existingVendor.createdBy || 'Ian Chesnut'}</strong> on{' '}
                  <span className="font-mono tabular-nums">{existingVendor.createdOn || '—'}</span>
                </span>
                <span>
                  Last updated by <strong className="text-heading font-medium">{existingVendor.lastUpdatedBy || 'Ian Chesnut'}</strong> on{' '}
                  <span className="font-mono tabular-nums">{existingVendor.lastUpdatedOn || '—'}</span>
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── STICKY FOOTER SAVE BAR ── */}
      <div className="sticky bottom-0 z-20 bg-bg/95 backdrop-blur-md border-t border-border py-3.5 px-4 sm:px-6 rounded-xl shadow-lg flex items-center justify-between gap-4">
        <div className="text-xs text-text-muted hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>
            {isDirty ? (
              <span className="text-warning font-medium">Unsaved modifications</span>
            ) : isEdit ? (
              `Editing ${existingVendor?.vendorCode}`
            ) : (
              'Ready to create vendor record'
            )}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            <Save size={16} className="mr-1.5" aria-hidden="true" />
            {isEdit ? 'Save Changes' : 'Create Vendor'}
          </Button>
        </div>
      </div>

      {/* ── Document Preview Modal ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.documentName || 'Document Preview'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted bg-surface/50 p-3 rounded-lg border border-border">
              <div>
                <span className="font-medium text-heading">Filename:</span>{' '}
                <span className="font-mono">{previewItem.fileName}</span>
              </div>
              <div>
                <span className="font-medium text-heading">Size:</span>{' '}
                <span className="font-mono">{previewItem.fileSize}</span>
              </div>
            </div>

            {previewItem.fileType?.includes('image') && previewItem.fileUrl ? (
              <div className="max-h-[420px] overflow-auto rounded-lg border border-border bg-surface/30 flex items-center justify-center p-4">
                <img
                  src={previewItem.fileUrl}
                  alt={previewItem.documentName}
                  className="max-h-[380px] max-w-full rounded object-contain"
                />
              </div>
            ) : (
              <div className="py-10 px-4 text-center rounded-lg border border-dashed border-border bg-surface/20 space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  {getFileIcon(previewItem.fileName, previewItem.fileType)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-heading">{previewItem.documentName}</h4>
                  <p className="text-xs text-text-muted mt-1 font-mono">{previewItem.fileName}</p>
                </div>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  This document format is ready for download or viewing via your device's default reader.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              {previewItem.fileUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(previewItem.fileUrl, '_blank')}
                >
                  <ExternalLink size={14} className="mr-1.5" />
                  Open in Tab
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleDownloadAttachment(previewItem)}
              >
                <Download size={14} className="mr-1.5" />
                Download
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
}
