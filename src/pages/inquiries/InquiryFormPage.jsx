/**
 * InquiryFormPage.jsx — Full-page Add and Edit inquiry form for MicroFlat ERP.
 *
 * Route: /inquiries/new (Add mode) & /inquiries/:id/edit (Edit mode)
 * Grouped sections inside Cards:
 *   1. Inquiry Details (InquiryNo, InquiryDate, Subject, Description, Source, Priority)
 *   2. Customer Information (CustomerName, ContactPerson, Email, Phone)
 *   3. Classification & Value (RegionId, CategoryId, Quantity, UOM, EstimatedValue, RequiredByDate)
 *   4. Assignment & Routing (AssignedTo, StatusId)
 *   5. Documents & Attachments (RFQ, Drawings, Specs, Quotations with real-time extension & size validation)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  X,
  Inbox,
  FileText,
  User,
  Tags,
  UserCheck,
  AlertCircle,
  Clock,
  Paperclip,
  UploadCloud,
  Trash2,
  FileCheck,
  Layers,
  File,
  Plus,
  Eye,
  ExternalLink,
} from 'lucide-react';

import {
  Button,
  Input,
  SearchableSelect,
  Card,
  Badge,
  Modal,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';
import {
  REGION_OPTIONS,
  CATEGORY_OPTIONS,
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  UOM_OPTIONS,
} from '../../mocks/inquiries';
import {
  DOCUMENT_TYPE_OPTIONS,
  getDocumentType,
  formatFileSizeKB,
} from '../../mocks/inquiryDocuments';

const INITIAL_FORM = {
  InquiryNo: '',
  InquiryDate: new Date().toISOString().slice(0, 10),
  Subject: '',
  Description: '',
  Source: 'Website',
  Priority: 'Medium',
  CustomerName: '',
  ContactPerson: '',
  Email: '',
  Phone: '',
  RegionId: '',
  CategoryId: '',
  Quantity: '1',
  UOM: 'PCS',
  EstimatedValue: '',
  RequiredByDate: '',
  AssignedTo: '',
  StatusId: 'New',
  attachments: [],
};

function validateField(name, value) {
  const str = typeof value === 'string' ? value.trim() : '';

  switch (name) {
    case 'InquiryNo':
      if (!str) return 'Inquiry number is required.';
      return '';
    case 'InquiryDate':
      if (!str) return 'Inquiry date is required.';
      return '';
    case 'Subject':
      if (!str) return 'Inquiry subject / requirement title is required.';
      return '';
    case 'CustomerName':
      if (!str) return 'Customer / Company name is required.';
      return '';
    case 'Email':
      if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        return 'Enter a valid email address.';
      }
      return '';
    case 'Phone':
      if (str) {
        if (!/^\+?[\d\s-]+$/.test(str)) return 'Phone number must contain digits only.';
        const digitsOnly = str.replace(/\D/g, '');
        if (digitsOnly.length < 10) return 'Phone number must be at least 10 digits.';
      }
      return '';
    case 'RegionId':
      if (!value) return 'Sales region is required.';
      return '';
    case 'CategoryId':
      if (!value) return 'Product / service category is required.';
      return '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  const requiredFields = [
    'InquiryNo',
    'InquiryDate',
    'Subject',
    'CustomerName',
    'RegionId',
    'CategoryId',
  ];

  requiredFields.forEach((field) => {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  });

  if (form.Email) {
    const err = validateField('Email', form.Email);
    if (err) errors.Email = err;
  }
  if (form.Phone) {
    const err = validateField('Phone', form.Phone);
    if (err) errors.Phone = err;
  }

  return errors;
}

export default function InquiryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    getInquiryById,
    getNextInquiryNo,
    addInquiry,
    updateInquiry,
  } = useInquiriesContext();

  const { allUsers = [], users = [] } = useUsersContext();
  const { addDocument, getDocumentsByInquiryId } = useInquiryDocumentsContext();

  const userList = allUsers.length > 0 ? allUsers : users;

  const existingInquiry = useMemo(() => {
    return isEdit ? getInquiryById(id) : null;
  }, [isEdit, id, getInquiryById]);

  const [form, setForm] = useState(INITIAL_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Attachment Staging State
  const [stageDocTypeId, setStageDocTypeId] = useState('dt_rfq');
  const [stageDocTitle, setStageDocTitle] = useState('');
  const [stageDocFile, setStageDocFile] = useState(null);
  const [stageDocRemarks, setStageDocRemarks] = useState('');
  const [stageFileError, setStageFileError] = useState('');
  const [stageTitleError, setStageTitleError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const fileInputRef = useRef(null);
  const initializedIdRef = useRef(null);

  // Active document type metadata for staging
  const activeStagedDocType = useMemo(() => {
    return getDocumentType(stageDocTypeId);
  }, [stageDocTypeId]);

  // Initialize form state
  useEffect(() => {
    if (isEdit) {
      if (existingInquiry && initializedIdRef.current !== id) {
        initializedIdRef.current = id;
        const data = {
          InquiryNo: existingInquiry.InquiryNo || '',
          InquiryDate: existingInquiry.InquiryDate || new Date().toISOString().slice(0, 10),
          Subject: existingInquiry.Subject || '',
          Description: existingInquiry.Description || '',
          Source: existingInquiry.Source || 'Website',
          Priority: existingInquiry.Priority || 'Medium',
          CustomerName: existingInquiry.CustomerName || '',
          ContactPerson: existingInquiry.ContactPerson || '',
          Email: existingInquiry.Email || '',
          Phone: existingInquiry.Phone || '',
          RegionId: existingInquiry.RegionId || '',
          CategoryId: existingInquiry.CategoryId || '',
          Quantity: existingInquiry.Quantity !== undefined ? String(existingInquiry.Quantity) : '1',
          UOM: existingInquiry.UOM || 'PCS',
          EstimatedValue: existingInquiry.EstimatedValue !== undefined ? String(existingInquiry.EstimatedValue) : '',
          RequiredByDate: existingInquiry.RequiredByDate || '',
          AssignedTo: existingInquiry.AssignedTo || '',
          StatusId: existingInquiry.StatusId || 'New',
          attachments: [],
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    } else {
      if (initializedIdRef.current !== 'new') {
        initializedIdRef.current = 'new';
        const generatedNo = getNextInquiryNo();
        const data = {
          ...INITIAL_FORM,
          InquiryNo: generatedNo,
          attachments: [],
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    }
  }, [isEdit, id, existingInquiry, getNextInquiryNo]);

  // Build assignee options from UsersContext
  const userOptions = useMemo(() => {
    return [
      { value: '', label: 'Leave unassigned' },
      ...userList.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName} (${Array.isArray(u.roles) ? u.roles.join(', ') : u.role || 'Staff'})`,
      })),
    ];
  }, [userList]);

  // Document type options for Select
  const docTypeOptions = useMemo(() => {
    return DOCUMENT_TYPE_OPTIONS.map((dt) => ({
      value: dt.id,
      label: `${dt.typeName}${dt.isMandatory ? ' (Required)' : ''} [${dt.allowedExtensions.join(', ')}]`,
    }));
  }, []);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    const err = validateField(name, value);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  }

  function handleCancel() {
    if (isDirty) {
      const discard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!discard) return;
    }
    navigate(isEdit && existingInquiry ? `/inquiries/${existingInquiry.id || existingInquiry.InquiryId}` : '/inquiries');
  }

  // ── Attachment Validation & Addition ──
  function validateFile(file, docType) {
    if (!file) return 'Please select a file.';

    const fileName = file.name || '';
    const extIndex = fileName.lastIndexOf('.');
    const ext = extIndex >= 0 ? fileName.slice(extIndex).toLowerCase() : '';

    const allowed = (docType?.allowedExtensions || []).map((e) => e.toLowerCase());
    if (allowed.length > 0 && !allowed.includes(ext)) {
      return `Only ${allowed.join(', ')} files allowed for ${docType?.typeName || 'this document type'}.`;
    }

    const maxBytes = (docType?.maxSizeMB || 25) * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File exceeds ${docType?.maxSizeMB || 25}MB limit.`;
    }

    return '';
  }

  function handleFileSelected(file) {
    if (!file) return;
    const err = validateFile(file, activeStagedDocType);
    setStageDocFile(file);
    setStageFileError(err);

    if (!stageDocTitle.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setStageDocTitle(baseName);
      setStageTitleError('');
    }
  }

  function handleAddAttachment() {
    if (!stageDocTitle.trim()) {
      setStageTitleError('Please enter a document title.');
      return;
    }
    if (!stageDocFile) {
      setStageFileError('Please select a file to attach.');
      return;
    }
    const err = validateFile(stageDocFile, activeStagedDocType);
    if (err) {
      setStageFileError(err);
      return;
    }

    const newAtt = {
      id: `att_${Date.now()}`,
      documentTypeId: stageDocTypeId,
      documentTitle: stageDocTitle.trim(),
      file: stageDocFile,
      fileName: stageDocFile.name,
      fileSizeKB: Math.max(1, Math.round(stageDocFile.size / 1024)),
      remarks: stageDocRemarks.trim(),
    };

    setForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAtt],
    }));

    // Reset staging
    setStageDocFile(null);
    setStageDocTitle('');
    setStageDocRemarks('');
    setStageFileError('');
    setStageTitleError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleRemoveAttachment(idToRemove) {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.id !== idToRemove),
    }));
  }

  const renderFileExtIcon = (fileName = '') => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return <FileText size={16} className="text-danger shrink-0" />;
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return <FileText size={16} className="text-primary shrink-0" />;
    if (lower.endsWith('.dwg') || lower.endsWith('.dxf')) return <Layers size={16} className="text-blue-500 shrink-0" />;
    return <File size={16} className="text-text-muted shrink-0" />;
  };

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
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
      if (isEdit && existingInquiry) {
        const inquiryId = existingInquiry.id || existingInquiry.InquiryId;
        const res = await updateInquiry(inquiryId, form);
        if (res.ok) {
          // Add any newly staged attachments
          if (form.attachments && form.attachments.length > 0) {
            for (const att of form.attachments) {
              await addDocument(inquiryId, {
                documentTypeId: att.documentTypeId,
                documentTitle: att.documentTitle,
                file: att.file,
                remarks: att.remarks,
              });
            }
          }
          navigate(`/inquiries/${inquiryId}`);
        }
      } else {
        const res = await addInquiry(form);
        if (res.ok && res.inquiry) {
          const newInquiryId = res.inquiry.id || res.inquiry.InquiryId;
          // Add attached documents to new inquiry
          if (form.attachments && form.attachments.length > 0) {
            for (const att of form.attachments) {
              await addDocument(newInquiryId, {
                documentTypeId: att.documentTypeId,
                documentTitle: att.documentTitle,
                file: att.file,
                remarks: att.remarks,
              });
            }
          }
          navigate(`/inquiries/${newInquiryId}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && !existingInquiry) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Inquiry Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested inquiry with ID "{id}" could not be located in the records.
          </p>
          <Button variant="primary" onClick={() => navigate('/inquiries')}>
            Return to Inquiries
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
            <ArrowLeft
              size={14}
              className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform duration-150"
              aria-hidden="true"
            />
            <span>Back to Inquiries</span>
          </button>
          <h1 className="text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <Inbox className="h-6 w-6 text-primary" aria-hidden="true" />
            {isEdit ? `Edit Inquiry: ${existingInquiry?.InquiryNo}` : 'New Inquiry / RFQ Registration'}
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
            {isEdit ? 'Save Changes' : 'Create Inquiry'}
          </Button>
        </div>
      </div>

      {/* ── SECTION 1: INQUIRY DETAILS ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            <span>1. Inquiry Details</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Reference code, date, subject title & priority
          </span>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Inquiry No */}
            <Input
              id="InquiryNo"
              name="InquiryNo"
              type="text"
              label="Inquiry Number"
              placeholder="e.g. INQ-2026-000123"
              required
              value={form.InquiryNo}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.InquiryNo}
              hint="System auto-sequence reference"
              className="font-mono text-sm uppercase"
            />

            {/* Inquiry Date */}
            <Input
              id="InquiryDate"
              name="InquiryDate"
              type="date"
              label="Inquiry Date"
              required
              value={form.InquiryDate}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.InquiryDate}
              hint="Date customer request was received"
              className="font-mono tabular-nums text-sm"
            />

            {/* Source */}
            <SearchableSelect
              id="Source"
              name="Source"
              label="Inquiry Source"
              options={SOURCE_OPTIONS}
              value={form.Source}
              onChange={handleChange}
            />

            {/* Priority */}
            <SearchableSelect
              id="Priority"
              name="Priority"
              label="Priority Level"
              options={PRIORITY_OPTIONS}
              value={form.Priority}
              onChange={handleChange}
            />
          </div>

          {/* Subject */}
          <Input
            id="Subject"
            name="Subject"
            type="text"
            label="Inquiry Subject / Item Description Title"
            placeholder="e.g. Custom Cast Iron Surface Plate 2000x1000mm Grade 0"
            required
            value={form.Subject}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.Subject}
          />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="Description"
              className="text-sm font-medium text-heading leading-none"
            >
              Detailed Specifications & Requirement Notes
            </label>
            <textarea
              id="Description"
              name="Description"
              rows={4}
              value={form.Description}
              onChange={handleChange}
              placeholder="Provide technical specifications, tolerances, material grade, delivery expectations, drawing numbers, or testing requirements..."
              className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/60"
            />
          </div>
        </div>
      </Card>

      {/* ── SECTION 2: CUSTOMER INFORMATION ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <User size={18} className="text-primary" aria-hidden="true" />
            <span>2. Customer Information</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Company credentials & primary contact person
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Customer Name */}
          <Input
            id="CustomerName"
            name="CustomerName"
            type="text"
            label="Customer / Company Name"
            placeholder="e.g. Precision AutoWorks India Ltd"
            required
            value={form.CustomerName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.CustomerName}
            autoComplete="organization"
          />

          {/* Contact Person */}
          <Input
            id="ContactPerson"
            name="ContactPerson"
            type="text"
            label="Contact Person Name"
            placeholder="e.g. Rajesh Nair"
            value={form.ContactPerson}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="name"
          />

          {/* Email */}
          <Input
            id="Email"
            name="Email"
            type="email"
            label="Email Address"
            placeholder="contact@customer.com"
            value={form.Email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.Email}
            autoComplete="email"
          />

          {/* Phone */}
          <Input
            id="Phone"
            name="Phone"
            type="tel"
            label="Phone / Mobile Number"
            placeholder="9823012345"
            value={form.Phone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.Phone}
            className="font-mono tabular-nums"
            autoComplete="tel"
          />
        </div>
      </Card>

      {/* ── SECTION 3: CLASSIFICATION & VALUE ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <Tags size={18} className="text-primary" aria-hidden="true" />
            <span>3. Classification & Commercial Value</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Sales territory, product category & estimated value
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Region */}
          <SearchableSelect
            id="RegionId"
            name="RegionId"
            label="Sales Region"
            placeholder="Select sales region..."
            searchPlaceholder="Search regions..."
            required
            options={REGION_OPTIONS}
            value={form.RegionId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.RegionId}
          />

          {/* Category */}
          <SearchableSelect
            id="CategoryId"
            name="CategoryId"
            label="Product Category"
            placeholder="Select product category..."
            searchPlaceholder="Search categories..."
            required
            options={CATEGORY_OPTIONS}
            value={form.CategoryId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.CategoryId}
          />

          {/* Required By Date */}
          <Input
            id="RequiredByDate"
            name="RequiredByDate"
            type="date"
            label="Required By Date"
            value={form.RequiredByDate}
            onChange={handleChange}
            className="font-mono tabular-nums text-sm"
            hint="Target delivery deadline requested by client"
          />

          {/* Quantity */}
          <Input
            id="Quantity"
            name="Quantity"
            type="number"
            min="1"
            label="Quantity"
            placeholder="1"
            value={form.Quantity}
            onChange={handleChange}
            className="font-mono tabular-nums"
          />

          {/* UOM */}
          <SearchableSelect
            id="UOM"
            name="UOM"
            label="Unit of Measure (UOM)"
            options={UOM_OPTIONS}
            value={form.UOM}
            onChange={handleChange}
          />

          {/* Estimated Value */}
          <Input
            id="EstimatedValue"
            name="EstimatedValue"
            type="number"
            min="0"
            label="Estimated Commercial Value (INR)"
            placeholder="e.g. 450000"
            value={form.EstimatedValue}
            onChange={handleChange}
            className="font-mono tabular-nums"
            hint="Estimated revenue potential in INR"
          />
        </div>
      </Card>

      {/* ── SECTION 4: ASSIGNMENT ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <UserCheck size={18} className="text-primary" aria-hidden="true" />
            <span>4. Assignment & Initial Status</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Assign to an internal team member for follow-up
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Assigned To (SearchableSelect from UsersContext) */}
          <SearchableSelect
            id="AssignedTo"
            name="AssignedTo"
            label="Assign To Team Member"
            placeholder="Leave unassigned..."
            searchPlaceholder="Search team members by name..."
            options={userOptions}
            value={form.AssignedTo}
            onChange={handleChange}
            hint="Select an internal user responsible for quoting and technical review."
          />

          {/* Status */}
          {isEdit ? (
            <SearchableSelect
              id="StatusId"
              name="StatusId"
              label="Inquiry Status"
              options={STATUS_OPTIONS.map((s) => ({ value: s.id, label: s.name }))}
              value={form.StatusId}
              onChange={handleChange}
            />
          ) : (
            <div className="flex flex-col justify-center pt-2">
              <span className="text-xs font-medium text-text-muted block mb-1">
                Initial Pipeline Stage
              </span>
              <div className="p-2.5 rounded-lg border border-border bg-surface flex items-center gap-2 text-xs text-text">
                <Clock size={15} className="text-primary shrink-0" />
                <span>New inquiry will start at stage <strong className="text-heading">"New"</strong> and progress through Quoting and Won/Lost.</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── SECTION 5: DOCUMENTS & ATTACHMENTS ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <Paperclip size={18} className="text-primary" aria-hidden="true" />
            <span>5. Documents & Attachments</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Attach RFQs, 2D/3D blueprints, specifications or client PO files
          </span>
        </div>

        <div className="space-y-5">
          {/* Staging Form Controls */}
          <div className="p-4 bg-surface/50 border border-border rounded-xl space-y-4">
            <span className="text-xs font-bold text-heading block">
              Add New Document Attachment
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Type */}
              <div className="space-y-1">
                <SearchableSelect
                  id="stageDocTypeId"
                  name="stageDocTypeId"
                  label="Document Type"
                  options={docTypeOptions}
                  value={stageDocTypeId}
                  onChange={(e) => {
                    setStageDocTypeId(e.target.value);
                    if (stageDocFile) {
                      const err = validateFile(stageDocFile, getDocumentType(e.target.value));
                      setStageFileError(err);
                    }
                  }}
                />
                {activeStagedDocType && (
                  <p className="text-[11px] text-text-muted pt-0.5">
                    Allowed: <strong className="font-mono text-heading">{activeStagedDocType.allowedExtensions.join(', ')}</strong> • Max: <strong className="font-mono text-heading">{activeStagedDocType.maxSizeMB}MB</strong>
                  </p>
                )}
              </div>

              {/* Document Title */}
              <Input
                id="stageDocTitle"
                name="stageDocTitle"
                type="text"
                label="Document Title"
                placeholder="e.g. Customer Drawing Rev 0"
                value={stageDocTitle}
                onChange={(e) => {
                  setStageDocTitle(e.target.value);
                  if (stageTitleError) setStageTitleError('');
                }}
                error={stageTitleError}
              />
            </div>

            {/* File Drag & Drop Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-heading block">
                Select File
              </label>

              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                accept={activeStagedDocType?.allowedExtensions?.join(',') || undefined}
                className="hidden"
                id="inquiry-form-file-picker"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelected(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : stageFileError
                    ? 'border-danger/60 bg-danger/5'
                    : stageDocFile
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-bg',
                ].join(' ')}
              >
                {stageDocFile ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileCheck size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-heading font-mono truncate">
                          {stageDocFile.name}
                        </p>
                        <p className="text-[11px] text-text-muted font-mono tabular-nums">
                          {formatFileSizeKB(Math.round(stageDocFile.size / 1024))}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStageDocFile(null);
                        setStageFileError('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-danger hover:bg-danger/10 h-7 px-2"
                    >
                      <X size={13} className="mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <UploadCloud size={24} className="text-primary/70 mb-1" />
                    <p className="text-xs font-semibold text-heading">
                      Click to choose file or drag & drop here
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {activeStagedDocType
                        ? `Allowed formats: ${activeStagedDocType.allowedExtensions.join(', ')} (Max ${activeStagedDocType.maxSizeMB}MB)`
                        : 'Select document type above'}
                    </p>
                  </div>
                )}
              </div>

              {stageFileError && (
                <p className="text-xs text-danger flex items-center gap-1 mt-0.5">
                  <AlertCircle size={13} />
                  <span>{stageFileError}</span>
                </p>
              )}
            </div>

            {/* Remarks and Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
              <div className="flex-1">
                <label
                  htmlFor="stageDocRemarks"
                  className="text-xs font-medium text-heading block mb-1"
                >
                  Document Remarks (Optional)
                </label>
                <input
                  id="stageDocRemarks"
                  type="text"
                  value={stageDocRemarks}
                  onChange={(e) => setStageDocRemarks(e.target.value)}
                  placeholder="e.g. Initial customer specification copy..."
                  className="w-full rounded-lg border border-border bg-bg text-text text-xs px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleAddAttachment}
                className="text-xs font-semibold shrink-0 h-9"
              >
                <Plus size={15} className="mr-1.5 text-primary" />
                Add to Attachments List
              </Button>
            </div>
          </div>

          {/* List of Attached Documents */}
          {form.attachments && form.attachments.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden bg-bg">
              <div className="px-4 py-2.5 bg-surface/60 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-heading">
                  Queued Attachments ({form.attachments.length})
                </span>
                <span className="text-[11px] text-text-muted">
                  Will be uploaded upon inquiry creation
                </span>
              </div>

              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-surface/30 border-b border-border/70 text-[11px] font-semibold text-text-muted">
                    <th className="py-2.5 px-4 w-28">TYPE</th>
                    <th className="py-2.5 px-4 min-w-[140px]">DOCUMENT TITLE</th>
                    <th className="py-2.5 px-4 min-w-[180px]">FILE NAME</th>
                    <th className="py-2.5 px-4 w-24">SIZE</th>
                    <th className="py-2.5 px-4 min-w-[140px]">REMARKS</th>
                    <th className="py-2.5 px-4 w-24 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {form.attachments.map((att) => {
                    const docType = getDocumentType(att.documentTypeId);
                    return (
                      <tr key={att.id} className="hover:bg-surface/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${docType.badgeClass}`}
                          >
                            {docType.typeName}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-heading">
                          {att.documentTitle}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-heading">
                          <div className="flex items-center gap-1.5">
                            {renderFileExtIcon(att.fileName)}
                            <span className="truncate max-w-[200px]" title={att.fileName}>{att.fileName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-text-muted">
                          {formatFileSizeKB(att.fileSizeKB)}
                        </td>
                        <td className="py-2.5 px-4 text-text italic">
                          {att.remarks ? `"${att.remarks}"` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                              title="View attachment details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 border border-border/50 hover:border-danger/30 transition-all cursor-pointer"
                              title="Remove attachment"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-5 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/10">
              No attachments queued yet. Use the selector above to attach RFQs, drawings, or specifications.
            </div>
          )}
        </div>
      </Card>

      {/* ── Document Preview Modal ── */}
      {previewAttachment && (
        <Modal
          isOpen={Boolean(previewAttachment)}
          onClose={() => setPreviewAttachment(null)}
          title={`Attachment Preview: ${previewAttachment.documentTitle}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Document Type
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getDocumentType(previewAttachment.documentTypeId).badgeClass}`}>
                  {getDocumentType(previewAttachment.documentTypeId).typeName}
                </span>
              </div>
              <p className="text-sm font-bold text-heading">
                {previewAttachment.documentTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-muted pt-1 border-t border-border/60 font-mono">
                {renderFileExtIcon(previewAttachment.fileName)}
                <span className="truncate">{previewAttachment.fileName}</span>
                <span>•</span>
                <span>{formatFileSizeKB(previewAttachment.fileSizeKB)}</span>
              </div>
            </div>

            {previewAttachment.remarks && (
              <div className="p-3 bg-bg rounded-lg border border-border text-xs text-text">
                <span className="text-text-muted block text-[11px] font-medium mb-0.5">Remarks</span>
                <p className="italic text-heading">"{previewAttachment.remarks}"</p>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              {previewAttachment.file && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    const url = URL.createObjectURL(previewAttachment.file);
                    window.open(url, '_blank');
                  }}
                  className="text-xs"
                >
                  <ExternalLink size={14} className="mr-1.5" />
                  Open in New Tab
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setPreviewAttachment(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
}
