import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconMail,
  IconAdd,
  IconClose,
  IconCopy,
  IconEye,
} from '../../constants/icons';

import {
  PageHeader,
  Button,
  SaveButton,
  CancelButton,
  Input,
  SearchableSelect,
  Card,
  StatusSwitch,
  RichTextEditor,
  FormActionsBar,
} from '../../components/ui';

import {
  INITIAL_EMAIL_TEMPLATES,
  EMAIL_MODULE_OPTIONS,
} from '../../mocks/emailTemplates';

const INITIAL_FORM = {
  templateCode: '',
  templateName: '',
  moduleName: 'VENDOR',
  subject: '',
  body: `<p>Dear {{ContactPerson}},</p>
<p>We are writing to provide an update regarding your account with <strong>Micro-Flat Engineering</strong>.</p>
<p>Please review the details below:</p>
<p>Best regards,<br />Micro-Flat Team</p>`,
  availablePlaceholders: ['ContactPerson', 'Date'],
  status: 'Active',
};

// Helper: extract {{Marker}} tokens from text
function extractPlaceholders(text = '') {
  const matches = text.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim())));
}

export default function EmailTemplateFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Load existing templates from localStorage (mock database)
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('microflat_email_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_EMAIL_TEMPLATES;
      }
    }
    return INITIAL_EMAIL_TEMPLATES;
  });

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'

  // Pre-fill when editing
  useEffect(() => {
    if (isEdit) {
      const existing = templates.find((t) => String(t.id) === String(id));
      if (existing) {
        setFormData({
          templateCode: existing.templateCode,
          templateName: existing.templateName,
          moduleName: existing.moduleName,
          subject: existing.subject,
          body: existing.body,
          availablePlaceholders: [...(existing.availablePlaceholders || [])],
          status: existing.status || 'Active',
        });
      } else {
        toast.error('Email template not found.');
        navigate('/configuration/email-templates');
      }
    }
  }, [id, isEdit, templates, navigate]);

  // Handle adding a placeholder tag
  const handleAddPlaceholder = (nameToAdd) => {
    const clean = nameToAdd.replace(/\{\{|\}\}/g, '').trim();
    if (!clean) return;
    if (formData.availablePlaceholders.includes(clean)) {
      toast.error(`'${clean}' is already in available placeholders.`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      availablePlaceholders: [...prev.availablePlaceholders, clean],
    }));
    setNewTagInput('');
    if (formErrors.availablePlaceholders) {
      setFormErrors((prev) => ({ ...prev, availablePlaceholders: null }));
    }
  };

  // Handle removing a placeholder tag
  const handleRemovePlaceholder = (nameToRemove) => {
    setFormData((prev) => ({
      ...prev,
      availablePlaceholders: prev.availablePlaceholders.filter((t) => t !== nameToRemove),
    }));
  };

  // Copy helper
  const handleCopy = (text, label = 'Placeholder') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Generate sample test values for live preview
  const previewValues = useMemo(() => {
    const values = {};
    (formData.availablePlaceholders || []).forEach((placeholder) => {
      values[placeholder] = `[${placeholder}]`;
    });

    if (values.VendorName) values.VendorName = 'Acme Precision Tools Pvt Ltd';
    if (values.VendorCode) values.VendorCode = 'VEN-0042';
    if (values.ContactPerson) values.ContactPerson = 'Ravi Sharma';
    if (values.ClientContact) values.ClientContact = 'Amit Patel';
    if (values.CompanyName) values.CompanyName = 'Apex Manufacturing Ltd';
    if (values.InquiryNumber) values.InquiryNumber = 'INQ-2026-000128';
    if (values.QuotationNumber) values.QuotationNumber = 'QT-2026-0045';
    if (values.PRNumber) values.PRNumber = 'PR-2026-0089';
    if (values.OrderNumber) values.OrderNumber = 'SO-2026-0012';
    if (values.CurrencySymbol) values.CurrencySymbol = '₹';
    if (values.TotalAmount) values.TotalAmount = '1,85,000';
    if (values.ApprovedDate) values.ApprovedDate = '13 Nov 2026';
    if (values.Date) values.Date = '13 Nov 2026';

    return values;
  }, [formData.availablePlaceholders]);

  // Rendered preview subject
  const renderedSubject = useMemo(() => {
    let result = formData.subject || '';
    Object.entries(previewValues).forEach(([key, val]) => {
      result = result.replaceAll(`{{${key}}}`, val || `[${key}]`);
    });
    return result;
  }, [formData.subject, previewValues]);

  // Rendered preview body
  const renderedBody = useMemo(() => {
    let result = formData.body || '';
    Object.entries(previewValues).forEach(([key, val]) => {
      result = result.replaceAll(`{{${key}}}`, val || `[${key}]`);
    });
    return result;
  }, [formData.body, previewValues]);

  // Form submit
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const errors = {};

    if (!isEdit && !formData.templateCode.trim()) {
      errors.templateCode = 'Template code is required.';
    } else if (!isEdit && !/^[A-Z0-9_]{3,50}$/.test(formData.templateCode.trim())) {
      errors.templateCode = 'Code must be uppercase letters, numbers or underscore (3-50 chars).';
    } else if (
      !isEdit &&
      templates.some((t) => t.templateCode.toUpperCase() === formData.templateCode.trim().toUpperCase())
    ) {
      errors.templateCode = 'A template with this code already exists.';
    }

    if (!formData.templateName.trim()) {
      errors.templateName = 'Template name is required.';
    }

    if (!formData.moduleName) {
      errors.moduleName = 'Please select a module.';
    }

    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required.';
    }

    if (!formData.body.trim()) {
      errors.body = 'Email body content is required.';
    }

    const inSubject = extractPlaceholders(formData.subject);
    const inBody = extractPlaceholders(formData.body);
    const allUsed = Array.from(new Set([...inSubject, ...inBody]));
    const missing = allUsed.filter((p) => !formData.availablePlaceholders.includes(p));

    if (missing.length > 0) {
      errors.availablePlaceholders = `Placeholders used in subject/body must be declared in Available Placeholders: ${missing
        .map((p) => `{{${p}}}`)
        .join(', ')}`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      let updatedList;
      if (isEdit) {
        updatedList = templates.map((t) =>
          String(t.id) === String(id)
            ? {
                ...t,
                templateName: formData.templateName.trim(),
                moduleName: formData.moduleName,
                subject: formData.subject.trim(),
                body: formData.body,
                availablePlaceholders: formData.availablePlaceholders,
                status: formData.status,
                updatedOn: new Date().toISOString(),
              }
            : t
        );
        toast.success(`Template '${formData.templateCode}' updated successfully.`);
      } else {
        const newTemplate = {
          id: Date.now(),
          templateCode: formData.templateCode.trim().toUpperCase(),
          templateName: formData.templateName.trim(),
          moduleName: formData.moduleName,
          subject: formData.subject.trim(),
          body: formData.body,
          availablePlaceholders: formData.availablePlaceholders,
          status: formData.status,
          createdOn: new Date().toISOString(),
          updatedOn: new Date().toISOString(),
        };
        updatedList = [newTemplate, ...templates];
        toast.success(`Email template '${newTemplate.templateCode}' created successfully.`);
      }

      localStorage.setItem('microflat_email_templates', JSON.stringify(updatedList));
      setIsSubmitting(false);
      navigate('/configuration/email-templates');
    }, 350);
  };

  return (
    <div className="w-full min-w-0 space-y-6 pb-24 max-w-full overflow-x-hidden">
      {/* ── Page Header with Back Action ── */}
      <PageHeader
        title={isEdit ? `Edit Template: ${formData.templateCode}` : 'Create Email Template'}
        subtitle="Configure dynamic email subject, HTML content, and placeholder markers for system notifications."
        icon={IconMail}
        backButton={{
          onClick: () => navigate('/configuration/email-templates'),
          label: 'Back to Email Templates',
        }}
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={() => navigate('/configuration/email-templates')}
              disabled={isSubmitting}
            />
            <SaveButton
              onClick={handleSubmit}
              loading={isSubmitting}
              label={isEdit ? 'Save Changes' : 'Create Template'}
            />
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full min-w-0 max-w-full">
        {/* ── Card 1: General Settings ── */}
        <Card
          title="General Information"
          subtitle="Specify the unique template code, business module, and initial status."
          padding="md"
          className="shadow-xs border-border"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
            {/* Template Code */}
            <div>
              <Input
                label="Template Code"
                id="templateCode"
                name="templateCode"
                placeholder="e.g. VENDOR_APPROVED"
                value={formData.templateCode}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, templateCode: e.target.value.toUpperCase() }))
                }
                disabled={isEdit}
                required
                error={formErrors.templateCode}
              />
            </div>

            {/* Template Name */}
            <div>
              <Input
                label="Template Name"
                id="templateName"
                name="templateName"
                placeholder="e.g. Vendor Approval Notice"
                value={formData.templateName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, templateName: e.target.value }))
                }
                required
                error={formErrors.templateName}
              />
            </div>

            {/* Module Selection */}
            <div>
              <SearchableSelect
                label="Module"
                id="moduleName"
                name="moduleName"
                placeholder="Select Module"
                options={EMAIL_MODULE_OPTIONS.filter((o) => o.value !== 'ALL')}
                value={formData.moduleName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, moduleName: e.target.value }))
                }
                required
                error={formErrors.moduleName}
              />
            </div>
          </div>

          {/* Status Switch inline row */}
          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-medium text-heading block">Active Template</span>
              <span className="text-xs text-text-muted">
                {formData.status === 'Active'
                  ? 'Enabled: Backend services can trigger and send this email.'
                  : 'Disabled: This template will not be dispatched.'}
              </span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <StatusSwitch
                checked={formData.status === 'Active'}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    status: prev.status === 'Active' ? 'Inactive' : 'Active',
                  }))
                }
                title="Toggle Active / Inactive"
              />
            </div>
          </div>
        </Card>

        {/* ── Card 2: Email Composer (Full-Width, Space-Optimized Canvas) ── */}
        <Card
          title="Email Composer"
          subtitle="Configure the subject line, dynamic placeholder markers, and HTML body."
          padding="md"
          className="shadow-xs border-border"
        >
          <div className="flex flex-col gap-5">
            {/* Subject Input */}
            <div>
              <Input
                label="Email Subject Line"
                id="subject"
                name="subject"
                placeholder="e.g. Vendor Account Approved - {{VendorCode}}"
                value={formData.subject}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subject: e.target.value }))
                }
                required
                error={formErrors.subject}
                hint="Tip: Click any declared marker below to copy and paste it into the subject line."
              />
            </div>

            {/* Dynamic Placeholders Bar (Sleek Inline Bar with Responsive Input) */}
            <div className="flex flex-col gap-3 p-3 bg-surface/60 rounded-xl border border-border w-full min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-heading uppercase tracking-wider">
                    Dynamic Markers ({formData.availablePlaceholders.length}):
                  </span>
                  <span className="text-2xs text-text-muted">
                    (Click to copy marker)
                  </span>
                </div>

                {/* Add Custom Marker Input - Fully Responsive on Mobile */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Enter marker name (e.g. PoNumber)..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPlaceholder(newTagInput);
                      }
                    }}
                    className="h-8 px-2.5 text-xs bg-bg border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-48 font-mono min-w-0"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddPlaceholder(newTagInput)}
                    className="h-8 text-xs w-full sm:w-auto shrink-0 px-3 justify-center"
                  >
                    <IconAdd size={13} className="mr-1" /> Add Marker
                  </Button>
                </div>
              </div>

              {/* Chips List with Responsive Wrap */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 min-w-0">
                {formData.availablePlaceholders.length === 0 ? (
                  <span className="text-xs text-text-muted italic">No markers added yet.</span>
                ) : (
                  formData.availablePlaceholders.map((marker) => (
                    <span
                      key={marker}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg border border-border text-xs font-mono text-heading shadow-2xs group max-w-full"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(`{{${marker}}}`, `{{${marker}}}`)}
                        className="text-primary font-semibold hover:underline truncate"
                        title="Click to copy into clipboard"
                      >
                        {`{{${marker}}}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePlaceholder(marker)}
                        className="text-text-muted hover:text-danger ml-0.5 shrink-0"
                        title={`Remove ${marker}`}
                      >
                        <IconClose size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {formErrors.availablePlaceholders && (
                <p className="text-xs text-danger font-medium mt-1">
                  {formErrors.availablePlaceholders}
                </p>
              )}
            </div>

            {/* Email Message Body with Tabs */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm font-medium text-heading">
                  Email Message Body (HTML) <span className="text-danger">*</span>
                </label>

                {/* Tab switch between Editor and Live Preview */}
                <div className="flex items-center p-1 bg-surface rounded-lg border border-border self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'editor'
                        ? 'bg-primary text-white shadow-2xs'
                        : 'text-text-muted hover:text-heading'
                    }`}
                  >
                    HTML Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                      activeTab === 'preview'
                        ? 'bg-primary text-white shadow-2xs'
                        : 'text-text-muted hover:text-heading'
                    }`}
                  >
                    <IconEye size={13} />
                    Live Inbox Preview
                  </button>
                </div>
              </div>

              {activeTab === 'editor' ? (
                <div className="flex flex-col gap-2 w-full min-w-0 max-w-full overflow-hidden">
                  <RichTextEditor
                    id="body"
                    name="body"
                    value={formData.body}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, body: e.target.value }))
                    }
                    placeholder="Compose your rich HTML email template here..."
                    minHeight="min-h-[420px]"
                  />

                  {formErrors.body && (
                    <p className="text-xs text-danger font-medium">{formErrors.body}</p>
                  )}
                </div>
              ) : (
                /* Live Preview View */
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-surface rounded-lg border border-border text-xs text-text-muted flex items-center justify-between flex-wrap gap-1">
                    <span>Simulated email render using sample test data:</span>
                    <span className="font-mono text-primary font-semibold">
                      {formData.availablePlaceholders.length} markers active
                    </span>
                  </div>

                  <div className="rounded-xl border border-border shadow-xs overflow-hidden">
                    <div className="bg-surface px-4 sm:px-5 py-3.5 border-b border-border flex flex-col gap-2 text-xs">
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="text-text-muted w-16 font-semibold uppercase shrink-0">Subject:</span>
                        <span className="font-semibold text-heading text-sm sm:text-base break-words">
                          {renderedSubject || '(No Subject)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-text-muted">
                        <span className="w-16 font-semibold uppercase shrink-0">From:</span>
                        <span className="truncate">Micro-Flat ERP &lt;no-reply@microflat.example&gt;</span>
                      </div>
                    </div>

                    <div
                      className="p-4 sm:p-8 bg-white text-gray-900 prose prose-sm max-w-none min-h-[320px] overflow-auto"
                      dangerouslySetInnerHTML={{ __html: renderedBody }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Standard Full-Page Sticky Bottom Actions Bar ── */}
        <FormActionsBar
          onCancel={() => navigate('/configuration/email-templates')}
          onSave={handleSubmit}
          saveText={isEdit ? 'Save Changes' : 'Create Template'}
          cancelText="Cancel"
          saveLoading={isSubmitting}
        />
      </form>
    </div>
  );
}
