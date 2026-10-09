/**
 * PurchaseRequisitionEdit.jsx — Full-page Edit Purchase Requisition Form.
 * Route: /purchase-requisition/:id/edit
 * Pre-populates the selected PR, retains PR Number as read-only, and saves updates to local state.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileSpreadsheet,
  Send,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Card,
  Input,
  DatePicker,
  Select,
  SearchableSelect,
  Badge,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  DEPARTMENT_OPTIONS,
  PRIORITY_OPTIONS,
  REQUESTED_BY_OPTIONS,
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
    prDate: '',
    requestedBy: '',
    department: '',
    requiredDate: '',
    priority: 'Normal',
    status: 'Pending Approval',
    remarks: '',
  });

  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});

  // Populate form with existing PR data when available
  useEffect(() => {
    if (originalPR) {
      setFormData({
        prNumber: originalPR.prNumber || '',
        prDate: originalPR.prDate ? originalPR.prDate.split('T')[0] : '',
        requestedBy: originalPR.requestedBy || '',
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
    }
  }, [originalPR]);

  if (!originalPR) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
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


  // Action: Submit for Approval
  const handleSubmitForApproval = () => {
    if (!validateForm()) {
      toast.error('Please complete all required fields before submitting.');
      return;
    }

    updatePR(originalPR.prNumber || originalPR.prId, {
      ...formData,
      status: 'Pending Approval',
      items,
    });

    toast.success('Purchase requisition submitted for approval.');
    navigate(`/purchase-requisition/${originalPR.prNumber || originalPR.prId}`);
  };

  const currentStatusVariant = getPRStatusBadgeVariant(formData.status);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Top Navigation Breadcrumb ── */}
      <div>
        <button
          type="button"
          onClick={() =>
            navigate(
              `/purchase-requisition/${originalPR.prNumber || originalPR.prId}`
            )
          }
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg hover:bg-surface text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
        >
          <ArrowLeft
            size={14}
            className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform"
          />
          <span>Back to View Requisition</span>
        </button>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">
            Edit Purchase Requisition
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Modify requisition details, items, or status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant={currentStatusVariant} className="px-3 py-1 text-xs">
            {formData.status}
          </Badge>
          <Badge variant="role" className="px-3 py-1 text-xs font-mono">
            {formData.prNumber}
          </Badge>
        </div>
      </div>

      {/* Error Summary Banner */}
      {errors.items && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errors.items}</span>
        </div>
      )}

      {/* ── Section 1: Purchase Requisition Information ── */}
      <Card padding="md" className="space-y-5 shadow-xs border-border">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileSpreadsheet size={18} />
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

        {/* Form Fields Grid: 3 columns per row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1, Col 1: PR Number (Read Only) */}
          <div>
            <Input
              id="edit-pr-number"
              label="PR Number"
              value={formData.prNumber}
              disabled
              hint="PR number cannot be changed"
              className="bg-border/30 font-semibold text-text cursor-not-allowed"
            />
          </div>

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

          {/* Row 1, Col 3: Requested By */}
          <div>
            <SearchableSelect
              id="edit-pr-requested-by"
              label="Requested By"
              required
              options={REQUESTED_BY_OPTIONS}
              value={formData.requestedBy}
              error={errors.requestedBy}
              placeholder="Select requester..."
              onChange={(e) => handleFieldChange('requestedBy', e.target.value)}
            />
          </div>

          {/* Row 2, Col 1: Department */}
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

          {/* Row 2, Col 2: Required Date */}
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

          {/* Row 2, Col 3: Priority */}
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

          {/* Row 3: Remarks (Spans all 3 columns) */}
          <div className="md:col-span-3">
            <label
              htmlFor="edit-pr-remarks"
              className="text-sm font-medium text-text leading-none block mb-1.5"
            >
              Remarks / Justification
            </label>
            <textarea
              id="edit-pr-remarks"
              rows={3}
              placeholder="Enter any justification or notes..."
              value={formData.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
            />
          </div>
        </div>
      </Card>

      {/* ── Section 2: Purchase Requisition Items ── */}
      <ItemsEditor
        items={items}
        onChange={setItems}
      />

      {/* ── Section 3: Bottom Form Actions ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            navigate(
              `/purchase-requisition/${originalPR.prNumber || originalPR.prId}`
            )
          }
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={handleSubmitForApproval}
          className="w-full sm:w-auto font-semibold shadow-sm"
        >
          <Send size={16} className="mr-1.5" />
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}
