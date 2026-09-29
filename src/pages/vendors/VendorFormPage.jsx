/**
 * VendorFormPage — Full-page Add and Edit vendor form for MicroFlat ERP.
 *
 * Replaces modal pattern with structured full-page flow:
 *   - Route: /vendors/new (Add mode) & /vendors/:id/edit (Edit mode)
 *   - Grouped sections inside Cards:
 *       1. Vendor Details (VendorCode, EffectiveDate, VendorName, Status)
 *       2. Contact Information (ContactPersonName, PhoneNo, AlternatePhoneNo, Email, GSTNO)
 *       3. Address (CountryId, StateId [cascading], City, ZipCode, Address1, Address2)
 *       4. Notes (Notes textarea)
 *       5. [Edit Mode Only] Approval & Audit info panel (read-only collapsed/muted card)
 *   - Dual action controls: Top header bar + Sticky bottom save bar.
 *   - On-blur and on-submit validation with inline error messaging.
 *   - Dirty form detection on Cancel navigation.
 */

import { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

import {
  Button,
  Input,
  SearchableSelect,
  StatusSwitch,
  Badge,
  Card,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import {
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
  getCountryName,
  getStateName,
} from '../../mocks/vendors';

const INITIAL_FORM = {
  vendorCode: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  vendorName: '',
  contactPersonName: '',
  phoneNo: '',
  alternatePhoneNo: '',
  email: '',
  gstNo: '',
  countryId: 'IN',
  stateId: '',
  city: '',
  zipCode: '',
  address1: '',
  address2: '',
  notes: '',
  isActive: true,
};

function validateField(name, value) {
  const str = typeof value === 'string' ? value.trim() : '';

  switch (name) {
    case 'vendorCode':
      if (!str) return 'Vendor code is required.';
      return '';
    case 'effectiveDate':
      if (!str) return 'Effective date is required.';
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
    'effectiveDate',
    'vendorName',
    'contactPersonName',
    'phoneNo',
    'alternatePhoneNo',
    'email',
    'gstNo',
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

  // Initialize form state
  useEffect(() => {
    if (isEdit) {
      if (existingVendor) {
        const data = {
          vendorCode: existingVendor.vendorCode || '',
          effectiveDate: existingVendor.effectiveDate || '',
          vendorName: existingVendor.vendorName || '',
          contactPersonName: existingVendor.contactPersonName || '',
          phoneNo: existingVendor.phoneNo || '',
          alternatePhoneNo: existingVendor.alternatePhoneNo || '',
          email: existingVendor.email || '',
          gstNo: existingVendor.gstNo || '',
          countryId: existingVendor.countryId || 'IN',
          stateId: existingVendor.stateId || '',
          city: existingVendor.city || '',
          zipCode: existingVendor.zipCode || '',
          address1: existingVendor.address1 || '',
          address2: existingVendor.address2 || '',
          notes: existingVendor.notes || '',
          isActive: existingVendor.isActive !== undefined ? existingVendor.isActive : true,
        };
        setForm(data);
        setInitialSnapshot(data);
      }
    } else {
      const generatedCode = getNextVendorCode();
      const data = {
        ...INITIAL_FORM,
        vendorCode: generatedCode,
        effectiveDate: new Date().toISOString().slice(0, 10),
      };
      setForm(data);
      setInitialSnapshot(data);
    }
    setErrors({});
  }, [isEdit, existingVendor, getNextVendorCode]);

  // Cascading state options based on selected country
  const stateOptions = useMemo(() => {
    if (!form.countryId) return [];
    return STATE_OPTIONS[form.countryId] || [];
  }, [form.countryId]);

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
          {/* <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {isEdit
              ? `Update profile, commercial registration, and address details for ${existingVendor?.vendorCode}.`
              : 'Enter supplier details, primary contact, billing address, and procurement notes.'}
          </p> */}
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
            <span>1. Vendor Details</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Basic classification & active status
          </span>
        </div>

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

          {/* Effective Date */}
          <Input
            id="effectiveDate"
            name="effectiveDate"
            type="date"
            label="Effective Date"
            required
            value={form.effectiveDate}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.effectiveDate}
            hint="Date when vendor contract or onboarding takes effect"
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

          {/* Status Switch */}
          <div className="flex flex-col justify-between">
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
                  ? 'Vendor is active and eligible for new purchase orders.'
                  : 'Vendor is inactive and temporarily blocked from PO creation.'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── SECTION 2: CONTACT INFORMATION ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <Contact size={18} className="text-primary" aria-hidden="true" />
            <span>2. Contact Information</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Key personnel & communication details
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
          <div className="md:col-span-2">
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
              className="font-mono uppercase max-w-md"
            />
          </div>
        </div>
      </Card>

      {/* ── SECTION 3: ADDRESS ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <MapPin size={18} className="text-primary" aria-hidden="true" />
            <span>3. Address & Location</span>
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
            placeholder={form.countryId ? 'Select state/province...' : 'Select country first'}
            searchPlaceholder="Search states..."
            emptyText="No states found for selected country"
            required
            disabled={!form.countryId || stateOptions.length === 0}
            options={stateOptions}
            value={form.stateId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.stateId}
            hint={!form.countryId ? 'Choose a country to enable states' : undefined}
          />

          {/* City */}
          <Input
            id="city"
            name="city"
            type="text"
            label="City / Town"
            placeholder="e.g. Vallabh Vidyanagar"
            required
            value={form.city}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.city}
            autoComplete="address-level2"
          />

          {/* Zip / Postal Code */}
          <Input
            id="zipCode"
            name="zipCode"
            type="text"
            label="Postal / Zip Code"
            placeholder="e.g. 388120"
            required
            value={form.zipCode}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.zipCode}
            className="font-mono"
            autoComplete="postal-code"
          />

          {/* Address Line 1 */}
          <div className="md:col-span-2">
            <Input
              id="address1"
              name="address1"
              type="text"
              label="Address Line 1"
              placeholder="Building, street, plot number, industrial area"
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
              placeholder="Landmark, suite, unit, floor"
              value={form.address2}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.address2}
              autoComplete="address-line2"
            />
          </div>
        </div>
      </Card>

      {/* ── SECTION 4: NOTES ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            <span>4. Procurement & Quality Notes</span>
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

      {/* ── SECTION 5 (EDIT MODE ONLY): READ-ONLY APPROVAL & AUDIT PANEL ── */}
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
    </form>
  );
}
