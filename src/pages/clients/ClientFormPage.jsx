/**
 * ClientFormPage.jsx — Full-page Add and Edit Client form for MicroFlat ERP.
 *
 * Routes:
 *   - /clients/new (Create mode)
 *   - /clients/:id/edit (Edit mode)
 *
 * Sectioned Cards:
 *   1. Company Details (3 columns)
 *   2. Terms & Notes (Plain text textareas)
 *   3. Client Addresses (Child Editor)
 *   4. Contact Persons (Child Editor)
 *
 * Features:
 *   - Master form state held locally and committed on ONE Save click
 *   - Sticky footer bar matching VendorFormPage conventions
 *   - ~700ms simulated network delay with loading spinner
 *   - "Same as company name" billing sync toggle
 *   - Dirty form detection with confirmation prompt on discard
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Building2,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  Select,
  StatusSwitch,
  Card,
  Checkbox,
  Textarea,
} from '../../components/ui';
import { useClientsContext } from '../../context/ClientsContext';
import { CONTACT_TYPE_OPTIONS } from '../../mocks/clients';
import AddressesEditor from './components/AddressesEditor';
import ContactsEditor from './components/ContactsEditor';

const INITIAL_FORM = {
  companyName: '',
  billingName: '',
  contactTypeId: 'Customer',
  email: '',
  gstNo: '',
  isActive: true,
  paymentTerms: '',
  deliveryTerms: '',
  comments: '',
  addresses: [],
  contacts: [],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { getClientById, addClient, updateClient } = useClientsContext();

  const [form, setForm] = useState(INITIAL_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsCompany, setSameAsCompany] = useState(false);

  // Load existing client in edit mode
  useEffect(() => {
    if (isEdit) {
      const existing = getClientById(id);
      if (existing) {
        const loadedData = {
          companyName: existing.companyName || '',
          billingName: existing.billingName || '',
          contactTypeId: existing.contactTypeId || 'Customer',
          email: existing.email || '',
          gstNo: existing.gstNo || '',
          isActive: existing.isActive !== false,
          paymentTerms: existing.paymentTerms || '',
          deliveryTerms: existing.deliveryTerms || '',
          comments: existing.comments || '',
          addresses: Array.isArray(existing.addresses) ? [...existing.addresses] : [],
          contacts: Array.isArray(existing.contacts) ? [...existing.contacts] : [],
        };
        setForm(loadedData);
        setInitialSnapshot(loadedData);
        setSameAsCompany(Boolean(existing.companyName && existing.companyName === existing.billingName));
      } else {
        toast.error('Client not found');
        navigate('/clients');
      }
    }
  }, [id, isEdit, getClientById, navigate]);

  // Dirty detection
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  // Handle company name change (syncs billing name if checkbox is active)
  const handleCompanyNameChange = (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, companyName: val };
      if (sameAsCompany) {
        next.billingName = val;
      }
      return next;
    });
    if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: null }));
  };

  // Toggle "Same as company name"
  const handleSameAsCompanyToggle = (checked) => {
    setSameAsCompany(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, billingName: prev.companyName }));
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Master validation
  const validateMasterForm = () => {
    const errs = {};
    if (!form.companyName?.trim()) {
      errs.companyName = 'Company name is required';
    } else if (form.companyName.length > 200) {
      errs.companyName = 'Max 200 characters';
    }

    if (form.billingName && form.billingName.length > 200) {
      errs.billingName = 'Max 200 characters';
    }

    if (!form.contactTypeId) {
      errs.contactTypeId = 'Contact type is required';
    }

    if (form.email?.trim()) {
      if (form.email.length > 254) {
        errs.email = 'Max 254 characters';
      } else if (!EMAIL_REGEX.test(form.email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
    }

    if (form.gstNo && form.gstNo.length > 50) {
      errs.gstNo = 'Max 50 characters';
    }

    return errs;
  };

  // Master submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const validationErrors = validateMasterForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      toast.error(validationErrors[firstKey] || 'Please fix validation errors');

      const el = document.getElementById(firstKey);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 700ms simulated delay matching ERP specifications
      await new Promise((res) => setTimeout(res, 700));

      let savedRecord;
      if (isEdit) {
        savedRecord = updateClient(id, form);
      } else {
        savedRecord = addClient(form);
      }

      const targetId = savedRecord?.clientId || savedRecord?.id || id;
      navigate(`/clients/${targetId}`);
    } catch (err) {
      toast.error('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmed) return;
    }
    navigate(isEdit ? `/clients/${id}` : '/clients');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      {/* ── Top Header & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-lg border border-border bg-surface text-text hover:text-primary hover:bg-surface/80 transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-heading">
              {isEdit ? 'Edit Client' : 'Add Client'}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              {isEdit
                ? `Update company credentials, addresses, and contacts for ${form.companyName || 'client'}`
                : 'Register a new customer, distributor, dealer, or agency account'}
            </p>
          </div>
        </div>

        {/* Top Save / Cancel Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="text-xs font-semibold shadow-2xs"
          >
            <Save size={14} className="mr-1.5" />
            {isSubmitting ? 'Saving Client...' : isEdit ? 'Save Changes' : 'Save Client'}
          </Button>
        </div>
      </div>

      {/* ── 1. Company Details Card (3 Columns Layout) ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 size={17} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-heading">Company Details</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Legal name, trade billing title, contact classification, and tax credentials
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Company Name */}
          <div>
            <Input
              label="Company Name"
              id="companyName"
              required
              maxLength={200}
              value={form.companyName}
              onChange={handleCompanyNameChange}
              placeholder="e.g. Bharat Heavy Precision Ltd"
              error={errors.companyName}
            />
          </div>

          {/* 2. Billing Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="billingName" className="form-label text-xs font-medium text-heading">
                Billing Name
              </label>
              <Checkbox
                id="same-as-company"
                checked={sameAsCompany}
                onChange={handleSameAsCompanyToggle}
                label="Same as company name"
              />
            </div>
            <Input
              id="billingName"
              maxLength={200}
              value={form.billingName}
              disabled={sameAsCompany}
              onChange={(e) => handleFieldChange('billingName', e.target.value)}
              placeholder="Legal invoicing name"
              error={errors.billingName}
            />
          </div>

          {/* 3. Contact Type */}
          <div>
            <Select
              label="Contact Type"
              id="contactTypeId"
              required
              value={form.contactTypeId}
              onChange={(e) => handleFieldChange('contactTypeId', e.target.value)}
              options={CONTACT_TYPE_OPTIONS}
              error={errors.contactTypeId}
            />
          </div>

          {/* 4. Official Email */}
          <div>
            <Input
              label="Official Email"
              id="email"
              type="email"
              maxLength={254}
              value={form.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="e.g. procurement@bharatprecision.in"
              error={errors.email}
            />
          </div>

          {/* 5. GST No */}
          <div>
            <Input
              label="GST Number"
              id="gstNo"
              maxLength={50}
              value={form.gstNo}
              onChange={(e) => handleFieldChange('gstNo', e.target.value.toUpperCase())}
              placeholder="e.g. 24AAACB1234F1Z5"
              className="font-mono tabular-nums uppercase"
              error={errors.gstNo}
            />
          </div>

          {/* 6. Account Status */}
          <div className="flex flex-col justify-end pb-1.5">
            <label className="text-xs font-medium text-heading block mb-1">
              Account Status
            </label>
            <div className="flex items-center gap-2.5">
              <StatusSwitch
                checked={form.isActive}
                onChange={(checked) => handleFieldChange('isActive', checked)}
                activeLabel="Active"
                inactiveLabel="Inactive"
                size="md"
              />
              <span className="text-xs text-text-muted">
                {form.isActive ? 'Active for transactions' : 'Inactive account'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Terms & Notes Card (Plain Text Textareas) ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText size={17} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-heading">Terms & Notes</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Standard payment terms, freight dispatch clauses, and operational remarks
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Payment Terms */}
          <div>
            <Textarea
              label="Payment Terms"
              id="paymentTerms"
              rows={3}
              value={form.paymentTerms}
              onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
              placeholder="e.g. 30 Days Net from date of invoice"
            />
          </div>

          {/* Delivery Terms */}
          <div>
            <Textarea
              label="Delivery Terms"
              id="deliveryTerms"
              rows={3}
              value={form.deliveryTerms}
              onChange={(e) => handleFieldChange('deliveryTerms', e.target.value)}
              placeholder="e.g. Ex-Works Vallabh Vidyanagar"
            />
          </div>

          {/* Comments */}
          <div>
            <Textarea
              label="Internal Comments"
              id="comments"
              rows={3}
              value={form.comments}
              onChange={(e) => handleFieldChange('comments', e.target.value)}
              placeholder="Internal notes, customer preferences, packaging remarks..."
            />
          </div>
        </div>
      </Card>

      {/* ── 3. Addresses Child Editor ── */}
      <AddressesEditor
        rows={form.addresses}
        onChange={(updatedAddresses) =>
          setForm((prev) => ({ ...prev, addresses: updatedAddresses }))
        }
      />

      {/* ── 4. Contact Persons Child Editor ── */}
      <ContactsEditor
        rows={form.contacts}
        onChange={(updatedContacts) =>
          setForm((prev) => ({ ...prev, contacts: updatedContacts }))
        }
      />

      {/* ── STICKY FOOTER SAVE BAR (Matching VendorFormPage) ── */}
      <div className="sticky bottom-0 z-20 bg-bg/95 backdrop-blur-md border border-border py-3.5 px-4 sm:px-6 rounded-xl shadow-lg flex items-center justify-between gap-4 mt-6">
        <div className="text-xs text-text-muted hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>
            {isDirty ? (
              <span className="text-warning font-medium">Unsaved modifications</span>
            ) : isEdit ? (
              `Editing ${form.companyName || 'client'}`
            ) : (
              'Ready to create client record'
            )}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial"
          >
            <Save size={16} className="mr-1.5" aria-hidden="true" />
            {isSubmitting ? 'Saving Client...' : isEdit ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      </div>
    </form>
  );
}
