/**
 * PurchaseRequisitionCreate.jsx — Full-page Create Purchase Requisition Form.
 * No modals. No API calls. All local state and React Router navigation.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileSpreadsheet,
  Send,
  X,
  FileCheck,
  Building2,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Card,
  Input,
  Select,
  Badge,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  DEPARTMENT_OPTIONS,
  PRIORITY_OPTIONS,
  REQUESTED_BY_OPTIONS,
  MOCK_MATERIALS,
} from '../../mocks/purchaseRequisitions';
import PRItemsEditor from './PRItemsEditor';

export default function PurchaseRequisitionCreate() {
  const navigate = useNavigate();
  const { getNextPRNumber, createPR } = usePurchaseRequisitionContext();

  const generatedPRNumber = getNextPRNumber();
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState({
    prNumber: generatedPRNumber,
    prDate: todayStr,
    requestedBy: REQUESTED_BY_OPTIONS[0]?.value || 'John Patel',
    department: DEPARTMENT_OPTIONS[0]?.value || 'Purchase',
    requiredDate: '',
    priority: 'Normal',
    status: 'Draft',
    remarks: '',
  });

  // Items State (initially one item with blank fields)
  const [items, setItems] = useState([
    {
      prItemId: Date.now(),
      itemId: '',
      itemCode: '',
      itemName: '',
      specification: '',
      quantity: '',
      uom: 'Nos',
      requiredDate: '',
      remarks: '',
      status: 'Pending',
    },
  ]);

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

    const newRecord = createPR({
      ...formData,
      status: 'Pending Approval',
      items,
    });

    toast.success('Purchase requisition submitted for approval.');
    navigate(`/purchase-requisition/${newRecord.prNumber || newRecord.prId}`);
  };

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Top Navigation Breadcrumb ── */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/purchase-requisition')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg hover:bg-surface text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
        >
          <ArrowLeft
            size={14}
            className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform"
          />
          <span>Back to Purchase Requisition</span>
        </button>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">
            Create Purchase Requisition
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Create a new purchase requisition.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="neutral" className="px-3 py-1 text-xs">
            Status: Draft
          </Badge>
          <Badge variant="role" className="px-3 py-1 text-xs">
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

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PR Number */}
          <div>
            <Input
              id="pr-number"
              label="PR Number"
              value={formData.prNumber}
              disabled
              hint="Automatically generated sequential PR identifier"
              className="bg-border/30 font-semibold text-text cursor-not-allowed"
            />
          </div>

          {/* PR Date */}
          <div>
            <Input
              id="pr-date"
              label="PR Date"
              type="date"
              required
              value={formData.prDate}
              onChange={(e) => handleFieldChange('prDate', e.target.value)}
            />
          </div>

          {/* Requested By */}
          <div>
            <Select
              id="pr-requested-by"
              label="Requested By"
              required
              options={REQUESTED_BY_OPTIONS}
              value={formData.requestedBy}
              error={errors.requestedBy}
              onChange={(e) => handleFieldChange('requestedBy', e.target.value)}
            />
          </div>

          {/* Department */}
          <div>
            <Select
              id="pr-department"
              label="Department"
              required
              options={DEPARTMENT_OPTIONS}
              value={formData.department}
              error={errors.department}
              onChange={(e) => handleFieldChange('department', e.target.value)}
            />
          </div>

          {/* Required Date */}
          <div>
            <Input
              id="pr-required-date"
              label="Required Date"
              type="date"
              required
              value={formData.requiredDate}
              error={errors.requiredDate}
              onChange={(e) => handleFieldChange('requiredDate', e.target.value)}
            />
          </div>

          {/* Priority */}
          <div>
            <Select
              id="pr-priority"
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={formData.priority}
              onChange={(e) => handleFieldChange('priority', e.target.value)}
            />
          </div>

          {/* Status (Read-only Draft) */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-text leading-none block mb-1.5">
              Initial Status
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-border/20 text-sm">
              <Badge variant="neutral">Draft</Badge>
              <span className="text-xs text-text-muted">
                Will be saved as Draft or set to Pending Approval when submitted.
              </span>
            </div>
          </div>

          {/* Remarks */}
          <div className="md:col-span-2">
            <label
              htmlFor="pr-remarks"
              className="text-sm font-medium text-text leading-none block mb-1.5"
            >
              Remarks / Justification
            </label>
            <textarea
              id="pr-remarks"
              rows={3}
              placeholder="Enter any justification, special requirements, or vendor delivery instructions..."
              value={formData.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
            />
          </div>
        </div>
      </Card>

      {/* ── Section 2: Purchase Requisition Items ── */}
      <PRItemsEditor
        items={items}
        onChangeItems={setItems}
        defaultRequiredDate={formData.requiredDate}
      />

      {/* ── Section 3: Bottom Form Actions ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/purchase-requisition')}
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
