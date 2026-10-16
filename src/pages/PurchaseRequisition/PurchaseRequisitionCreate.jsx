/**
 * PurchaseRequisitionCreate.jsx — Full-page Create Purchase Requisition Form.
 * No modals. No API calls. All local state and React Router navigation.
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconAttachment,
  IconBack,
  IconBuilding2,
  IconCalendar,
  IconClose,
  IconDelete,
  IconDocumentTypes,
  IconError,
  IconFileSpreadsheet,
  IconFileText,
  IconPR,
  IconSave,
  IconSend,
  IconUpload,
  IconUser,
} from '../../constants/icons';
import { getTodayISO } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

import {
  Button,
  SaveButton,
  CancelButton,
  Card,
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
  MOCK_MATERIALS,
  PROJECT_OPTIONS,
} from '../../mocks/purchaseRequisitions';
import ItemsEditor from './components/ItemsEditor';

export default function PurchaseRequisitionCreate() {
  const navigate = useNavigate();
  const { getNextPRNumber, createPR } = usePurchaseRequisitionContext();

  const generatedPRNumber = getNextPRNumber();
  const todayStr = getTodayISO();

  // Form State
  const [formData, setFormData] = useState({
    prNumber: generatedPRNumber,
    projectId: '',
    prDate: todayStr,
    requestedBy: 'Ian Chesnut', // Current logged-in user
    department: DEPARTMENT_OPTIONS[0]?.value || 'Purchase',
    requiredDate: '',
    priority: 'Normal',
    status: 'Pending Approval',
    remarks: '',
  });

  // Items State (managed via ItemsEditor)
  const [items, setItems] = useState([]);

  // Attachments State
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const [errors, setErrors] = useState({});

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

    // Validate items
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
    return Object.keys(newErrors).length === 0;
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
    if (!validateForm()) {
      toast.error('Please complete all required fields before submitting.');
      return;
    }

    const newRecord = createPR({
      ...formData,
      status: 'Pending Approval',
      items,
      attachments,
    });

    toast.success('Purchase requisition submitted for approval.');
    navigate(`/purchase-requisition/${newRecord.prNumber || newRecord.prId}`);
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Page Header ── */}
      <PageHeader
        title="Create Purchase Requisition"
        subtitle="Create a new purchase requisition."
        icon={<IconPR className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/purchase-requisition')}
          >
            Back to Purchase Requisition
          </Button>
        }
        badge={
          <Badge variant="warning" className="px-3 py-1 text-xs">
            Pending Approval
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={() => navigate('/purchase-requisition')}
              size="sm"
            />
            <SaveButton
              type="button"
              onClick={handleSubmitForApproval}
              size="sm"
            >
              Create Requisition
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
      <Card padding="md" className="space-y-5 shadow-xs border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconFileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-heading">
                Purchase Requisition Information
              </h2>
              <p className="text-xs text-text-muted">
                General details, department, and timeline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center font-mono font-bold text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
              {formData.prNumber}
            </span>
            <Badge variant="neutral" size="sm" className="font-medium text-2xs">
              System Generated
            </Badge>
          </div>
        </div>

        {/* Form Fields Grid: 3 columns per row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Row 1, Col 2: PR Date */}
          <div>
            <DatePicker
              id="pr-date"
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
              id="pr-requested-by"
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
              id="pr-project-id"
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
              id="pr-department"
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
              id="pr-required-date"
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
              id="pr-priority"
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
              id="pr-remarks"
              name="remarks"
              label="Remarks / Justification"
              value={formData.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              placeholder="Enter any justification, special requirements, or vendor delivery instructions..."
              minHeight="min-h-[140px]"
            />
          </div>
        </div>
      </Card>

      {/* ── Section 2: Purchase Requisition Items ── */}
      <ItemsEditor
        items={items}
        onChange={setItems}
      />

      {/* ── Section 3: Document Attachments ── */}
      <Card padding="md" className="space-y-4 shadow-xs border-border">
        <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconAttachment size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-heading">
                Document Attachments
              </h2>
              <p className="text-xs text-text-muted">
                Upload drawings, technical specifications, or quotation comparisons.
              </p>
            </div>
          </div>
          <Badge variant="role" className="text-xs">
            {attachments.length} {attachments.length === 1 ? 'File' : 'Files'}
          </Badge>
        </div>

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
      </Card>

      {/* ── Section 3: Bottom Form Actions ── */}
      <div className="mf-form-actions">
        <CancelButton
          onClick={() => navigate('/purchase-requisition')}
          className="w-full sm:w-auto"
        />

        <SaveButton
          type="button"
          onClick={handleSubmitForApproval}
          className="w-full sm:w-auto font-semibold shadow-sm"
        >
          Save Requisition
        </SaveButton>
      </div>
    </div>
  );
}
