/**
 * ProjectFormPage.jsx — Project Creation & Edit form for MicroFlat ERP.
 * Supports:
 *   - Mode A: Customer Order (linked to a Confirmed Sales Order)
 *   - Mode B: In-House (Internal project without sales order)
 * Aligned with ProjectCreation.md §4, §5, §10 and MicroFlat ERP Design System.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Input,
  DatePicker,
  SearchableSelect,
  Textarea,
  SaveButton,
  CancelButton,
  Badge,
  DetailField,
} from '../../components/ui';
import {
  IconProject,
  IconSalesOrder,
  IconClient,
  IconClock,
  IconCreditCard,
  IconCheck,
  IconBack,
} from '../../constants/icons';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  FileText,
  Briefcase,
  Wrench,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { projectService } from '../../services';
import {
  buildCreateProjectPayload,
  buildUpdateProjectPayload,
} from '../../models/projects/projectModel';
import { formatDate } from '../../utils/dateUtils';

export default function ProjectFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  // Deep-link from sales order page (/projects/new?orderConfirmationId=18)
  const initialOrderConfirmationId = searchParams.get('orderConfirmationId');

  // Creation Mode: 'salesOrder' (Customer Order) | 'inHouse' (Internal)
  const [creationMode, setCreationMode] = useState(
    initialOrderConfirmationId ? 'salesOrder' : 'salesOrder'
  );

  // Lookups & Code series preview
  const [lookups, setLookups] = useState({
    projectTypes: [],
    billingTypes: [],
    statuses: [],
  });
  const [nextCodePreview, setNextCodePreview] = useState('PRJ/--/----');
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);

  // Sales Order Picker State
  const [salesOrders, setSalesOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [existingProjectsForOrder, setExistingProjectsForOrder] = useState([]);

  // Form State
  const [form, setForm] = useState({
    projectName: '',
    projectTypeId: '',
    projectBillingTypeId: '',
    startDate: '',
    endDate: '',
    remarks: '',
    orderConfirmationId: initialOrderConfirmationId ? Number(initialOrderConfirmationId) : null,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProjectNameCustomized, setIsProjectNameCustomized] = useState(false);

  // ── 1. Load Lookups & Code Preview ──
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      setIsLoadingLookups(true);
      try {
        const [lk, code] = await Promise.all([
          projectService.getLookups().catch(() => ({})),
          !isEdit ? projectService.getNextCode().catch(() => 'PRJ/--/----') : Promise.resolve(''),
        ]);

        if (isMounted) {
          setLookups({
            projectTypes: lk?.projectTypes || [],
            billingTypes: lk?.billingTypes || [],
            statuses: lk?.statuses || [],
          });
          if (code) setNextCodePreview(code);

          // If adding new project, default Project Type according to mode
          if (!isEdit && lk?.projectTypes?.length > 0) {
            const customerType = lk.projectTypes.find(
              (t) => t.typeName?.toLowerCase() === 'customer order'
            );
            if (customerType) {
              setForm((prev) => ({
                ...prev,
                projectTypeId: prev.projectTypeId || String(customerType.id),
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load project metadata:', err);
      } finally {
        if (isMounted) setIsLoadingLookups(false);
      }
    }
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [isEdit]);

  // ── 2. Load Confirmed Sales Orders for Picker ──
  const fetchConfirmedSalesOrders = useCallback(async (query = '') => {
    setIsLoadingOrders(true);
    try {
      const res = await projectService.listConfirmedSalesOrders(query, 1, 50);
      setSalesOrders(res?.items || []);
    } catch (e) {
      console.warn('Failed to load sales orders for picker:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!isEdit && creationMode === 'salesOrder') {
      fetchConfirmedSalesOrders('');
    }
  }, [isEdit, creationMode, fetchConfirmedSalesOrders]);

  // ── 3. On Select Sales Order -> Load Order Details, Auto-prefill ──
  const handleSelectSalesOrder = useCallback(
    async (orderId) => {
      const numId = Number(orderId);
      if (!numId) {
        setSelectedOrderDetails(null);
        setExistingProjectsForOrder([]);
        setForm((prev) => ({ ...prev, orderConfirmationId: null }));
        return;
      }

      setForm((prev) => ({ ...prev, orderConfirmationId: numId }));

      try {
        // Fetch full order details & check existing projects in parallel
        const [order, existing] = await Promise.all([
          projectService.getOrderConfirmationById(numId).catch(() => null),
          projectService.checkExistingProjectsForOrder(numId).catch(() => []),
        ]);

        if (order) {
          setSelectedOrderDetails(order);

          // Auto-prefill Project Name if not manually edited
          if (!isProjectNameCustomized) {
            const labelParts = [order.clientName || 'Customer'];
            if (order.clientPoNo) labelParts.push(`PO-${order.clientPoNo}`);
            else if (order.orderConfirmationNo) labelParts.push(order.orderConfirmationNo);
            setForm((prev) => ({
              ...prev,
              projectName: labelParts.join(' – '),
            }));
          }

          // Auto-prefill End Date from Expected Delivery Date
          if (order.expectedDeliveryDate) {
            setForm((prev) => ({
              ...prev,
              endDate: prev.endDate || String(order.expectedDeliveryDate).slice(0, 10),
            }));
          }
        }

        setExistingProjectsForOrder(existing || []);
      } catch (err) {
        console.warn('Failed to load selected order details:', err);
      }
    },
    [isProjectNameCustomized]
  );

  // If opened with ?orderConfirmationId query param, auto-select it
  useEffect(() => {
    if (initialOrderConfirmationId && !isEdit) {
      handleSelectSalesOrder(initialOrderConfirmationId);
    }
  }, [initialOrderConfirmationId, isEdit, handleSelectSalesOrder]);

  // ── 4. Load Existing Project in Edit Mode ──
  useEffect(() => {
    if (!isEdit) return;
    let isMounted = true;

    async function loadProject() {
      try {
        const data = await projectService.getProjectById(id);
        if (isMounted && data) {
          setForm({
            projectName: data.projectName || '',
            projectTypeId: String(data.projectTypeId || ''),
            projectBillingTypeId: data.projectBillingTypeId ? String(data.projectBillingTypeId) : '',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            remarks: data.remarks || '',
            orderConfirmationId: data.orderConfirmationId || null,
          });

          setCreationMode(data.orderConfirmationId ? 'salesOrder' : 'inHouse');

          // If linked to an order, load order details for read-only view
          if (data.orderConfirmationId) {
            projectService
              .getOrderConfirmationById(data.orderConfirmationId)
              .then((ord) => {
                if (isMounted && ord) setSelectedOrderDetails(ord);
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        toast.error('Failed to load project details for editing');
        navigate('/projects');
      }
    }
    loadProject();
    return () => {
      isMounted = false;
    };
  }, [id, isEdit, navigate]);

  // ── Mode Switch Handler (Sales Order vs In-House) ──
  const handleModeChange = (newMode) => {
    if (isEdit) return; // Sales order linkage cannot be changed after creation
    setCreationMode(newMode);
    setFieldErrors({});

    if (newMode === 'salesOrder') {
      const customerType = lookups.projectTypes.find(
        (t) => t.typeName?.toLowerCase() === 'customer order'
      );
      setForm((prev) => ({
        ...prev,
        projectTypeId: customerType ? String(customerType.id) : prev.projectTypeId,
      }));
    } else {
      // In-House mode
      const inHouseType = lookups.projectTypes.find(
        (t) => t.typeName?.toLowerCase() === 'in-house'
      );
      setSelectedOrderDetails(null);
      setExistingProjectsForOrder([]);
      setForm((prev) => ({
        ...prev,
        orderConfirmationId: null,
        projectTypeId: inHouseType ? String(inHouseType.id) : prev.projectTypeId,
      }));
    }
  };

  // ── Form Change Handlers ──
  const handleFieldChange = (name, val) => {
    const value = val?.target?.value !== undefined ? val.target.value : val;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'projectName') {
      setIsProjectNameCustomized(true);
    }

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ── Validation ──
  const validateForm = () => {
    const errors = {};

    if (!form.projectName?.trim()) {
      errors.projectName = 'Project name is required';
    } else if (form.projectName.trim().length > 200) {
      errors.projectName = 'Project name cannot exceed 200 characters';
    }

    if (!form.projectTypeId) {
      errors.projectTypeId = 'Project type is required';
    }

    if (creationMode === 'salesOrder' && !isEdit && !form.orderConfirmationId) {
      errors.orderConfirmationId = 'Please select a confirmed sales order';
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        errors.endDate = 'Planned end date must be on or after planned start date';
      }
    }

    if (form.remarks && form.remarks.length > 500) {
      errors.remarks = 'Remarks cannot exceed 500 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit Handler ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the validation errors before saving');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        const payload = buildUpdateProjectPayload(form);
        const updated = await projectService.updateProject(id, payload);
        toast.success(`Project "${updated.projectCode}" updated successfully`);
        navigate(`/projects/${updated.id}`);
      } else {
        const payload = buildCreateProjectPayload(form, creationMode === 'salesOrder');
        const created = await projectService.createProject(payload);
        toast.success(`Project "${created.projectCode}" created successfully`);
        navigate(`/projects/${created.id}`);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to save project';
      toast.error(msg);
      // Map ASP.NET model validation errors if returned
      if (err?.response?.data?.errors) {
        const backendErrors = {};
        Object.entries(err.response.data.errors).forEach(([field, msgs]) => {
          const key = field.charAt(0).toLowerCase() + field.slice(1);
          backendErrors[key] = Array.isArray(msgs) ? msgs[0] : msgs;
        });
        setFieldErrors(backendErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dropdown Options
  const projectTypeOptions = useMemo(() => {
    return (lookups.projectTypes || []).map((t) => ({
      value: String(t.id),
      label: t.typeName,
    }));
  }, [lookups.projectTypes]);

  const billingTypeOptions = useMemo(() => {
    return [
      { value: '', label: '-- None (Default) --' },
      ...(lookups.billingTypes || []).map((b) => ({
        value: String(b.id),
        label: b.billingTypeName,
      })),
    ];
  }, [lookups.billingTypes]);

  const salesOrderSelectOptions = useMemo(() => {
    return salesOrders.map((oc) => ({
      value: String(oc.id),
      label: `${oc.orderConfirmationNo} — ${oc.clientName}${oc.clientPoNo ? ` (PO: ${oc.clientPoNo})` : ''}`,
    }));
  }, [salesOrders]);

  return (
    <div className="w-full space-y-6 pb-20 animate-in fade-in duration-150">
      {/* ── Page Header ── */}
      <PageHeader
        title={isEdit ? 'Edit Project' : 'Create Project'}
        subtitle={
          isEdit
            ? 'Update project details, timelines, and commercial configurations'
            : 'Initialize a new project from a confirmed sales order or create directly without a sales order'
        }
        icon={IconProject}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate(isEdit ? `/projects/${id}` : '/projects')}
          >
            {isEdit ? 'Back to Project Details' : 'Back to Projects'}
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton onClick={() => navigate(isEdit ? `/projects/${id}` : '/projects')} />
            <SaveButton
              type="button"
              onClick={handleSubmit}
              loading={isSubmitting}
            >
              {isEdit ? 'Update Project' : 'Save Project'}
            </SaveButton>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Section 1: Project Origin & Mode Toggle (Only on Create) ── */}
        {!isEdit && (
          <Card padding="md" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-heading">Project Origin</h3>
              <Badge variant="neutral" size="sm" className="font-mono text-xs self-start sm:self-auto">
                Code: {nextCodePreview}
              </Badge>
            </div>

            {/* Simple Compact Selection */}
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <button
                type="button"
                onClick={() => handleModeChange('salesOrder')}
                className={[
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                  creationMode === 'salesOrder'
                    ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/20'
                    : 'border-border bg-surface text-text-muted hover:text-heading hover:border-text-muted/60',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0',
                    creationMode === 'salesOrder'
                      ? 'border-primary bg-primary'
                      : 'border-text-muted bg-transparent',
                  ].join(' ')}
                >
                  {creationMode === 'salesOrder' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <Briefcase size={13} className={creationMode === 'salesOrder' ? 'text-primary' : 'text-text-muted'} />
                <span>From Sales Order</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('inHouse')}
                className={[
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                  creationMode === 'inHouse'
                    ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/20'
                    : 'border-border bg-surface text-text-muted hover:text-heading hover:border-text-muted/60',
                ].join(' ')}
              >
                <div
                  className={[
                    'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0',
                    creationMode === 'inHouse'
                      ? 'border-primary bg-primary'
                      : 'border-text-muted bg-transparent',
                  ].join(' ')}
                >
                  {creationMode === 'inHouse' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <Wrench size={13} className={creationMode === 'inHouse' ? 'text-primary' : 'text-text-muted'} />
                <span>Without Sales Order</span>
              </button>
            </div>

            {/* Sales Order Picker (When Sales Order mode is active) */}
            {creationMode === 'salesOrder' && (
              <div className="space-y-3 pt-2">
                <SearchableSelect
                  id="orderConfirmationId"
                  name="orderConfirmationId"
                  label="Confirmed Sales Order"
                  required
                  options={salesOrderSelectOptions}
                  value={form.orderConfirmationId ? String(form.orderConfirmationId) : ''}
                  onChange={(e) => handleSelectSalesOrder(e?.target?.value ?? e)}
                  placeholder="-- Select a confirmed sales order --"
                  searchPlaceholder="Search order number, client, or PO..."
                  error={fieldErrors.orderConfirmationId}
                  disabled={isLoadingOrders}
                  hint="Only Confirmed order confirmations are eligible to launch a project."
                />

                {/* Warning if projects already exist for this order (§4a) */}
                {existingProjectsForOrder.length > 0 && (
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2 text-xs text-warning-heading">
                    <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">
                        Notice: {existingProjectsForOrder.length} project(s) already exist for this Sales Order
                      </span>
                      <span className="text-3xs text-text-muted mt-0.5 block">
                        Existing:{' '}
                        {existingProjectsForOrder
                          .map((p) => `${p.projectCode} (${p.projectName})`)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Auto-populated Order Summary Card */}
                {selectedOrderDetails && (
                  <div className="p-3.5 bg-surface-subtle border border-border rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {selectedOrderDetails.orderConfirmationNo}
                        </span>
                        <span className="text-xs font-semibold text-heading">
                          {selectedOrderDetails.clientName}
                        </span>
                      </div>
                      <Badge variant="approved" size="sm">
                        Confirmed Order
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <DetailField
                        label="Client PO No"
                        value={selectedOrderDetails.clientPoNo || '—'}
                        mono={Boolean(selectedOrderDetails.clientPoNo)}
                      />
                      <DetailField
                        label="Order Date"
                        value={selectedOrderDetails.orderConfirmationDate ? formatDate(selectedOrderDetails.orderConfirmationDate) : '—'}
                      />
                      <DetailField
                        label="Expected Delivery"
                        value={selectedOrderDetails.expectedDeliveryDate ? formatDate(selectedOrderDetails.expectedDeliveryDate) : '—'}
                      />
                      <DetailField
                        label="Order Total"
                        value={
                          selectedOrderDetails.totalAmount
                            ? `${selectedOrderDetails.currencyCode || 'INR'} ${Number(selectedOrderDetails.totalAmount).toLocaleString('en-IN')}`
                            : '—'
                        }
                        mono
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* ── Read-Only Order Linkage Banner (In Edit Mode) ── */}
        {isEdit && (
          <Card padding="sm" className="bg-surface-subtle">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xs uppercase font-semibold text-text-muted block">Project Linkage</span>
                <span className="text-xs font-bold text-heading mt-0.5 block">
                  {form.orderConfirmationId ? (
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={13} className="text-primary" />
                      <span>Linked to Sales Order: <strong>{selectedOrderDetails?.orderConfirmationNo || `#${form.orderConfirmationId}`}</strong> ({selectedOrderDetails?.clientName || 'Customer'})</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <Wrench size={13} />
                      <span>Without Sales Order (Direct Project)</span>
                    </span>
                  )}
                </span>
              </div>
              {form.orderConfirmationId && (
                <Link
                  to={`/sales-orders/${form.orderConfirmationId}`}
                  target="_blank"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>View Order</span>
                  <ExternalLink size={12} />
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* ── Section 2: Core Project Details ── */}
        <Card padding="md" className="space-y-4">
          <h3 className="text-sm font-bold text-heading border-b border-border/60 pb-2 flex items-center gap-1.5">
            <FileText size={15} className="text-primary" />
            <span>Project Specifications</span>
          </h3>

          <div className="space-y-4">
            {/* Project Name */}
            <Input
              id="projectName"
              name="projectName"
              label="Project Name"
              required
              value={form.projectName}
              onChange={(e) => handleFieldChange('projectName', e.target.value)}
              placeholder="e.g. Acme Ltd – Flatness Inspection Plates PO-901"
              error={fieldErrors.projectName}
              hint="Descriptive name (max 200 characters). Auto-suggested when an order is picked."
            />

            {/* Project Type & Billing Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableSelect
                id="projectTypeId"
                name="projectTypeId"
                label="Project Type"
                required
                options={projectTypeOptions}
                value={form.projectTypeId}
                onChange={(e) => handleFieldChange('projectTypeId', e?.target?.value ?? e)}
                placeholder="Select project type..."
                error={fieldErrors.projectTypeId}
                disabled={creationMode === 'inHouse'}
              />

              <SearchableSelect
                id="projectBillingTypeId"
                name="projectBillingTypeId"
                label="Billing Type"
                options={billingTypeOptions}
                value={form.projectBillingTypeId}
                onChange={(e) => handleFieldChange('projectBillingTypeId', e?.target?.value ?? e)}
                placeholder="Select billing structure..."
                error={fieldErrors.projectBillingTypeId}
                hint="Fixed Price, Time & Material, or Milestone Based."
              />
            </div>

            {/* Timeline: Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePicker
                id="startDate"
                name="startDate"
                label="Planned Start Date"
                value={form.startDate}
                onChange={(e) => handleFieldChange('startDate', e?.target?.value ?? e)}
                placeholder="Select start date..."
                error={fieldErrors.startDate}
              />

              <DatePicker
                id="endDate"
                name="endDate"
                label="Planned End Date"
                value={form.endDate}
                onChange={(e) => handleFieldChange('endDate', e?.target?.value ?? e)}
                placeholder="Select delivery target date..."
                error={fieldErrors.endDate}
                hint="Must be on or after planned start date."
              />
            </div>

            {/* Remarks */}
            <Textarea
              id="remarks"
              name="remarks"
              label="Project Remarks / Scope Notes"
              value={form.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              placeholder="e.g. Fabricated against specific surface plate tolerance clause..."
              rows={3}
              error={fieldErrors.remarks}
              hint="Optional scope specifications, delivery instructions, or notes (max 500 characters)."
            />
          </div>
        </Card>

        {/* ── Form Action Buttons Footer ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <CancelButton onClick={() => navigate('/projects')} />
          <SaveButton
            type="submit"
            loading={isSubmitting}
          >
            {isEdit ? 'Update Project' : 'Create Project'}
          </SaveButton>
        </div>
      </form>
    </div>
  );
}
