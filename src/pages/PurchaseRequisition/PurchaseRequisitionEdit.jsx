/**
 * PurchaseRequisitionEdit.jsx — Full-page Edit Purchase Requisition Form.
 * Route: /purchase-requisition/:id/edit
 * Pre-populates the selected PR, retains PR Number as read-only, and saves updates to local state.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconAttachment,
  IconBack,
  IconClose,
  IconDelete,
  IconError,
  IconFileSpreadsheet,
  IconFileText,
  IconPR,
  IconSave,
  IconSend,
  IconUpload,
  IconUser,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  SaveButton,
  CancelButton,
  Card,
  CollapsibleCard,
  Input,
  RichTextEditor,
  DatePicker,
  Select,
  SearchableSelect,
  Badge,
  PageHeader,
  IconButton,
  FormActionsBar,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  DEPARTMENT_OPTIONS,
  PRIORITY_OPTIONS,
  REQUESTED_BY_OPTIONS,
  PROJECT_OPTIONS,
  getPRStatusBadgeVariant,
} from '../../mocks/purchaseRequisitions';
import ItemsEditor from './components/ItemsEditor';

export default function PurchaseRequisitionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPRById, updatePR } = usePurchaseRequisitionContext();

  const originalPR = useMemo(() => {
    return getPRById(id);
  }, [id, getPRById]);

  // Form State
  const [formData, setFormData] = useState({
    prNumber: '',
    projectId: '',
    prDate: '',
    requestedBy: '',
    department: '',
    requiredDate: '',
    priority: 'Normal',
    status: 'Pending Approval',
    remarks: '',
  });

  const [items, setItems] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});

  // Populate form with existing PR data when available
  useEffect(() => {
    if (originalPR) {
      setFormData({
        prNumber: originalPR.prNumber || '',
        projectId: originalPR.projectId || '',
        prDate: originalPR.prDate ? originalPR.prDate.split('T')[0] : '',
        requestedBy: originalPR.requestedBy || 'Ian Chesnut',
        department: originalPR.department || '',
        requiredDate: originalPR.requiredDate ? originalPR.requiredDate.split('T')[0] : '',
        priority: originalPR.priority || 'Normal',
        status: originalPR.status || 'Pending Approval',
        remarks: originalPR.remarks || '',
      });
      setItems(
        Array.isArray(originalPR.items) && originalPR.items.length > 0
          ? originalPR.items.map((it) => ({
            ...it,
            requiredDate: it.requiredDate ? it.requiredDate.split('T')[0] : '',
          }))
          : []
      );
      setAttachments(Array.isArray(originalPR.attachments) ? originalPR.attachments : []);
    }
  }, [originalPR]);

  if (!originalPR) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">
            Purchase Requisition Not Found
          </h2>
          <p className="text-sm text-text-muted">
            The requested requisition with identifier "{id}" could not be loaded for editing.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/purchase-requisition')}
          >
            Back to Requisition List
          </Button>
        </Card>
      </div>
    );
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.projectId) {
      newErrors.projectId = 'Please select a project';
    }
    if (!formData.requestedBy) {
      newErrors.requestedBy = 'Please select who requested this requisition';
    }
    if (!formData.department) {
      newErrors.department = 'Please select a department';
    }
    if (!formData.requiredDate) {
      newErrors.requiredDate = 'Please select the required by date';
    }

    if (!items || items.length === 0) {
      newErrors.items = 'At least one item is required in the requisition';
    } else {
      items.forEach((it, idx) => {
        if (!it.itemId) {
          newErrors.items = `Item #${idx + 1} must have a selected Material Catalog Preset`;
        }
        if (!it.itemCode?.trim() || !it.itemName?.trim()) {
          newErrors.items = `Item #${idx + 1} is missing item code or name`;
        }
        if (!it.quantity || Number(it.quantity) <= 0) {
          newErrors.items = `Item #${idx + 1} must have a valid quantity greater than 0`;
        }
      });
    }

    setErrors(newErrors);
    return newErrors;
  };


  // Attachment handlers
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments = files.map((file) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: file.name,
      fileSizeKB: Math.round(file.size / 1024) || 1,
      fileType: file.type || 'application/octet-stream',
      uploadedBy: 'Ian Chesnut',
      uploadedDate: new Date().toISOString(),
      url: URL.createObjectURL(file),
      file: file,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    toast.success(`Attached ${files.length} file(s)`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Action: Submit for Approval
  const handleSubmitForApproval = () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please complete all required fields before submitting.');
      setTimeout(() => {
        const fieldPriority = [
          { key: 'projectId', id: 'edit-pr-project-id' },
          { key: 'department', id: 'edit-pr-department' },
          { key: 'requiredDate', id: 'edit-pr-required-date' },
          { key: 'items', id: 'item-catalog-preset' },
        ];

        for (const field of fieldPriority) {
          if (validationErrors[field.key]) {
            const el = document.getElementById(field.id);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus?.();
              break;
            }
          }
        }
      }, 60);
      return;
    }

    updatePR(originalPR.prNumber || originalPR.prId, {
      ...formData,
      status: 'Pending Approval',
      items,
      attachments,
    });

    toast.success('Purchase requisition submitted for approval.');
    navigate(`/purchase-requisition/${originalPR.prNumber || originalPR.prId}`);
  };

  const currentStatusVariant = getPRStatusBadgeVariant(formData.status);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Page Header ── */}
      <PageHeader
        title="Edit Purchase Requisition"
        subtitle="Modify requisition details, items."
        icon={<IconPR className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate(`/purchase-requisition/${originalPR.prNumber || originalPR.prId}`)}
          >
            Back to View Requisition
          </Button>
        }
        badge={
          <Badge variant={currentStatusVariant} className="px-3 py-1 text-xs">
            {formData.status}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={() => navigate(`/purchase-requisition/${originalPR.prNumber || originalPR.prId}`)}
              size="sm"
            />
            <SaveButton
              type="button"
              onClick={handleSubmitForApproval}
              size="sm"
            >
              Save Changes
            </SaveButton>
          </div>
        }
      />

      {errors.items && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
          <IconError size={18} className="shrink-0" />
          <span>{errors.items}</span>
        </div>
      )}

      {/* ── Section 1: Purchase Requisition Information ── */}
      <CollapsibleCard
        title="Purchase Requisition Information"
        subtitle="General details, department, and timeline."
        icon={<IconFileSpreadsheet size={18} />}
        defaultOpen={true}
        hasError={Boolean(errors.projectId || errors.department || errors.requiredDate)}
        badge={
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center font-mono font-bold text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
              {formData.prNumber}
            </span>
            <Badge variant="neutral" size="sm" className="font-medium text-2xs">
              System Generated
            </Badge>
          </div>
        }
      >

        {/* Form Fields Grid: 3 columns per row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Row 1, Col 2: PR Date */}
          <div>
            <DatePicker
              id="edit-pr-date"
              name="prDate"
              label="PR Date"
              required
              value={formData.prDate}
              onChange={(e) => handleFieldChange('prDate', e.target.value)}
            />
          </div>

          {/* Row 1, Col 3: Requested By (Disabled with Logged-in User) */}
          <div>
            <Input
              id="edit-pr-requested-by"
              label="Requested By"
              value={formData.requestedBy}
              disabled
              leftIcon={<IconUser size={15} />}
              hint="Current logged-in user"
              className="bg-border/30 font-medium text-text cursor-not-allowed"
            />
          </div>

          {/* Row 2, Col 1: Project ID */}
          <div>
            <SearchableSelect
              id="edit-pr-project-id"
              label="Project ID"
              required
              options={PROJECT_OPTIONS}
              value={formData.projectId}
              error={errors.projectId}
              placeholder="Select project..."
              onChange={(e) => handleFieldChange('projectId', e.target.value)}
            />
          </div>

          {/* Row 2, Col 2: Department */}
          <div>
            <SearchableSelect
              id="edit-pr-department"
              label="Department"
              required
              options={DEPARTMENT_OPTIONS}
              value={formData.department}
              error={errors.department}
              placeholder="Select department..."
              onChange={(e) => handleFieldChange('department', e.target.value)}
            />
          </div>

          {/* Row 2, Col 3: Required Date */}
          <div>
            <DatePicker
              id="edit-pr-required-date"
              name="requiredDate"
              label="Required Date"
              required
              value={formData.requiredDate}
              error={errors.requiredDate}
              onChange={(e) => handleFieldChange('requiredDate', e.target.value)}
            />
          </div>

          {/* Row 3, Col 1: Priority */}
          <div>
            <SearchableSelect
              id="edit-pr-priority"
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={formData.priority}
              placeholder="Select priority..."
              onChange={(e) => handleFieldChange('priority', e.target.value)}
            />
          </div>

          {/* Row 3: Remarks (Rich Text Editor with Text Color) */}
          <div className="md:col-span-3">
            <RichTextEditor
              id="edit-pr-remarks"
              name="remarks"
              label="Remarks / Justification"
              value={formData.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              placeholder="Enter any justification or notes..."
              minHeight="min-h-[140px]"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Section 2: Purchase Requisition Items ── */}
      <ItemsEditor
        items={items}
        onChange={(newItems) => {
          setItems(newItems);
          if (errors.items && newItems.length > 0) {
            setErrors((prev) => ({ ...prev, items: null }));
          }
        }}
        error={errors.items}
        onClearError={() => {
          if (errors.items) {
            setErrors((prev) => ({ ...prev, items: null }));
          }
        }}
      />

      {/* ── Section 3: Document Attachments ── */}
      <CollapsibleCard
        title="Document Attachments"
        subtitle="Upload drawings, technical specifications, or quotation comparisons."
        icon={<IconAttachment size={18} />}
        defaultOpen={true}
        badge={
          <Badge variant="role" className="text-xs">
            {attachments.length} {attachments.length === 1 ? 'File' : 'Files'}
          </Badge>
        }
      >

        {/* Upload Drop Zone / Button */}
        <div>
          {/* Native file input hidden for custom drag-drop styling */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/60 hover:bg-surface/50 rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <IconUpload size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-heading">
                Click to browse or drag and drop documents
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Supports PDF, DOCX, XLSX, DWG, PNG, JPG (up to 25 MB per file)
              </p>
            </div>
          </div>
        </div>

        {/* Attached Files List */}
        {attachments.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-surface/30">
            {attachments.map((file, idx) => (
              <div
                key={file.id || idx}
                className="p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconFileText size={16} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-heading truncate">
                      {file.fileName || file.name}
                    </p>
                    <p className="text-2xs text-text-muted font-mono mt-0.5">
                      {file.fileSizeKB ? `${file.fileSizeKB} KB` : `${(file.size / 1024).toFixed(1)} KB`} • Uploaded by {file.uploadedBy || 'Ian Chesnut'}
                    </p>
                  </div>
                </div>
                <IconButton
                  icon={IconDelete}
                  size="sm"
                  variant="ghost"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                  onClick={() => removeAttachment(idx)}
                  className="hover:text-danger hover:bg-danger/10 shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {/* ── Section 3: Bottom Form Actions ── */}
      <div className="mf-form-actions">
        <CancelButton
          onClick={() =>
            navigate(
              `/purchase-requisition/${originalPR.prNumber || originalPR.prId}`
            )
          }
          className="w-full sm:w-auto"
        />

        <SaveButton
          type="button"
          onClick={handleSubmitForApproval}
          className="w-full sm:w-auto font-semibold shadow-sm"
        >
          Save Changes
        </SaveButton>
      </div>
    </div>
  );
}
