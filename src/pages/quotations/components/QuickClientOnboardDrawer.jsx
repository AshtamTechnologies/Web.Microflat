/**
 * QuickClientOnboardDrawer.jsx
 *
 * Slide-over drawer for fast, seamless client registration directly from the
 * Quotation workflow. 100% prefilled with prospect details captured in the inquiry.
 */

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Drawer,
  Button,
  SaveButton,
  CancelButton,
  Input,
  Checkbox,
  SearchableSelect,
  Badge,
} from '../../../components/ui';
import {
  IconBuilding2,
  IconUser,
  IconPhone,
  IconMail,
  IconLocation,
  IconCheck,
  IconInfo,
} from '../../../constants/icons';
import { useClientsContext } from '../../../context/ClientsContext';
import { useCountryState } from '../../../context/CountryStateContext';
import { useRegions } from '../../../context/RegionsContext';
import { getTodayIsoDate } from '../../../utils/effectiveDateUtils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function QuickClientOnboardDrawer({
  isOpen,
  onClose,
  inquiry,
  onSuccess,
}) {
  const { addClient } = useClientsContext();
  const {
    countries = [],
    countryOptions = [],
    getStateOptions,
    fetchStatesForCountry,
  } = useCountryState();
  const { regions = [] } = useRegions();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    effectiveDate: getTodayIsoDate(),
    companyName: '',
    billingName: '',
    billingNameSameAsClientName: true,
    contactTypeId: 'Customer',
    email: '',
    phone: '',
    gstNo: '',
    panNo: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    countryId: 1, // Default India
    stateId: '',
    zipCode: '',
    regionId: '',
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
  });

  // Populate form with 100% inquiry prospect details whenever drawer opens or inquiry changes
  useEffect(() => {
    if (!isOpen || !inquiry) return;

    const rawCustName = (inquiry.CustomerName || inquiry.companyName || '').trim();
    const rawContact = (inquiry.ContactPerson || inquiry.contactPersonName || '').trim();
    const contactParts = rawContact ? rawContact.split(' ') : [];
    const firstName = contactParts[0] || '';
    const lastName = contactParts.slice(1).join(' ') || '';
    const rawEmail = (inquiry.Email || inquiry.email || '').trim().toLowerCase();
    const rawPhone = String(inquiry.Phone || inquiry.mobileNo || '').trim();
    const rawAddr1 = inquiry.AddressLine1 || inquiry.address1 || '';
    const rawAddr2 = inquiry.AddressLine2 || inquiry.address2 || '';
    const rawCity = inquiry.City || inquiry.city || '';
    const rawZip = inquiry.pincode || inquiry.zipCode || '';
    const rawRegion = inquiry.RegionId || inquiry.regionId || '';

    // Resolve country
    let initialCountryId = 1; // default to India
    const rawCountry = String(inquiry.Country || inquiry.country || '').trim().toLowerCase();
    if (rawCountry) {
      const matchedCountry = countries.find(
        (c) =>
          String(c.id) === rawCountry ||
          c.countryName?.toLowerCase() === rawCountry ||
          (rawCountry === 'in' && c.countryName?.toLowerCase() === 'india')
      );
      if (matchedCountry) {
        initialCountryId = matchedCountry.id;
      }
    }

    setForm({
      effectiveDate: getTodayIsoDate(),
      companyName: rawCustName,
      billingName: rawCustName,
      billingNameSameAsClientName: true,
      contactTypeId: 'Customer',
      email: rawEmail,
      phone: rawPhone,
      gstNo: '',
      panNo: '',
      addressLine1: rawAddr1,
      addressLine2: rawAddr2,
      city: rawCity,
      countryId: initialCountryId,
      stateId: inquiry.stateId || '',
      zipCode: rawZip,
      regionId: rawRegion,
      contactFirstName: firstName || rawCustName,
      contactLastName: lastName,
      contactEmail: rawEmail,
      contactPhone: rawPhone,
    });
    setErrors({});
  }, [isOpen, inquiry, countries]);

  // Load states when country changes
  useEffect(() => {
    if (form.countryId && fetchStatesForCountry) {
      fetchStatesForCountry(form.countryId);
    }
  }, [form.countryId, fetchStatesForCountry]);

  // Try matching state by inquiry.State name if stateId was empty
  useEffect(() => {
    if (isOpen && inquiry && !form.stateId && form.countryId) {
      const stateOptions = getStateOptions(form.countryId) || [];
      const rawState = String(inquiry.State || inquiry.state || '').trim().toLowerCase();
      if (rawState && stateOptions.length > 0) {
        const found = stateOptions.find(
          (s) =>
            s.label.toLowerCase() === rawState ||
            String(s.value).toLowerCase() === rawState
        );
        if (found) {
          setForm((prev) => ({ ...prev, stateId: found.value }));
        }
      }
    }
  }, [isOpen, inquiry, form.countryId, form.stateId, getStateOptions]);

  const stateOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select State --' },
      ...(getStateOptions(form.countryId) || []),
    ];
  }, [form.countryId, getStateOptions]);

  const regionOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Region --' },
      ...regions
        .filter((r) => r.isActive !== false)
        .map((r) => ({
          value: r.id ?? r.regionId,
          label: r.regionName,
        })),
    ];
  }, [regions]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'companyName' && prev.billingNameSameAsClientName) {
        next.billingName = value;
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSameAsCompanyToggle = (checked) => {
    setForm((prev) => ({
      ...prev,
      billingNameSameAsClientName: checked,
      billingName: checked ? prev.companyName : '',
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.companyName?.trim()) {
      errs.companyName = 'Company name is required';
    }
    if (form.email?.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (form.contactEmail?.trim() && !EMAIL_REGEX.test(form.contactEmail.trim())) {
      errs.contactEmail = 'Please enter a valid contact email';
    }
    if (!form.contactFirstName?.trim()) {
      errs.contactFirstName = 'Contact person name is required';
    }
    if (!form.city?.trim()) {
      errs.city = 'City is required';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please resolve the required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        effectiveDate: form.effectiveDate,
        companyName: form.companyName.trim(),
        billingName: form.billingNameSameAsClientName
          ? form.companyName.trim()
          : (form.billingName || '').trim(),
        billingNameSameAsClientName: form.billingNameSameAsClientName,
        contactTypeId: form.contactTypeId || 'Customer',
        email: form.email?.trim()?.toLowerCase() || null,
        gstNo: form.gstNo?.trim()?.toUpperCase() || null,
        panNo: form.panNo?.trim()?.toUpperCase() || null,
        regionId: form.regionId ? Number(form.regionId) || form.regionId : null,
        isActive: true,
        addresses: [
          {
            addressType: 'Billing',
            address1: (form.addressLine1 || form.city).trim(),
            address2: form.addressLine2?.trim() || null,
            city: form.city.trim(),
            stateId: form.stateId ? Number(form.stateId) : null,
            countryId: form.countryId ? Number(form.countryId) : 1,
            zipCode: form.zipCode?.trim() || null,
            isActive: true,
          },
        ],
        contacts: [
          {
            firstName: form.contactFirstName.trim(),
            lastName: form.contactLastName.trim() || null,
            email: (form.contactEmail || form.email || '').trim().toLowerCase() || null,
            phoneNo: String(form.contactPhone || form.phone || '').trim() || null,
            isPrimary: true,
            isActive: true,
          },
        ],
      };

      const createdClient = await addClient(payload);
      onSuccess?.(createdClient);
    } catch (err) {
      console.error('Failed to quick-onboard client:', err);
      const errMsg = err?.message || 'Failed to register client';
      toast.error(errMsg);
      if (err?.fieldErrors) {
        setErrors(err.fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Register & Onboard Client"
      subtitle={`Prefilled from Inquiry #${inquiry?.InquiryNo || inquiry?.id || ''}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-2xs text-text-muted">
            All fields can be edited or refined later in Client Master.
          </span>
          <div className="flex items-center gap-2">
            <CancelButton onClick={onClose} disabled={isSubmitting} size="sm" />
            <SaveButton
              type="button"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              size="sm"
              loadingText="Registering..."
            >
              Save & Link Client
            </SaveButton>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Helper Banner */}
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-2.5 text-xs text-primary dark:text-primary-light">
          <IconInfo size={16} className="shrink-0 mt-0.5" />
          <span>
            Captured details from this inquiry have been automatically populated below. Review and complete registration to unlock official quotations.
          </span>
        </div>

        {/* Section 1: Company Profile */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <IconBuilding2 size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
              Company Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Company Name *"
                placeholder="Enter client company name"
                value={form.companyName}
                onChange={(e) => handleFieldChange('companyName', e.target.value)}
                error={errors.companyName}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-text-secondary">Billing Name</span>
                <Checkbox
                  id="billingSameAsClient"
                  label="Same as Company Name"
                  checked={form.billingNameSameAsClientName}
                  onChange={(e) => handleSameAsCompanyToggle(e.target.checked)}
                />
              </div>
              <Input
                placeholder="Billing trade name"
                value={form.billingName}
                onChange={(e) => handleFieldChange('billingName', e.target.value)}
                disabled={form.billingNameSameAsClientName}
                error={errors.billingName}
              />
            </div>

            <Input
              label="Official Email"
              type="email"
              placeholder="e.g. info@company.com"
              value={form.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              error={errors.email}
            />

            <Input
              label="Official Phone"
              placeholder="e.g. +91 98765 43210"
              value={form.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              error={errors.phone}
            />

            <Input
              label="GSTIN"
              placeholder="e.g. 24AAAAA0000A1Z5"
              value={form.gstNo}
              onChange={(e) => handleFieldChange('gstNo', e.target.value.toUpperCase())}
              error={errors.gstNo}
            />

            <Input
              label="PAN"
              placeholder="e.g. ABCDE1234F"
              value={form.panNo}
              onChange={(e) => handleFieldChange('panNo', e.target.value.toUpperCase())}
              error={errors.panNo}
            />
          </div>
        </div>

        {/* Section 2: Primary Address */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <IconLocation size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
              Registered Billing Address
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Address Line 1"
                placeholder="Street address, factory plot or building"
                value={form.addressLine1}
                onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                error={errors.addressLine1}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Address Line 2 (Optional)"
                placeholder="Industrial area, landmark, or suite"
                value={form.addressLine2}
                onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
              />
            </div>

            <Input
              label="City *"
              placeholder="e.g. Ahmedabad, Pune"
              value={form.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              error={errors.city}
              required
            />

            <Input
              label="Pincode / Zip Code"
              placeholder="e.g. 382445"
              value={form.zipCode}
              onChange={(e) => handleFieldChange('zipCode', e.target.value)}
              error={errors.zipCode}
            />

            <SearchableSelect
              label="Country"
              options={countryOptions}
              value={form.countryId}
              onChange={(e) => handleFieldChange('countryId', Number(e.target.value) || 1)}
              placeholder="Select Country"
            />

            <SearchableSelect
              label="State / Province"
              options={stateOptions}
              value={form.stateId}
              onChange={(e) => handleFieldChange('stateId', e.target.value)}
              placeholder="Select State"
            />

            {regionOptions.length > 1 && (
              <div className="sm:col-span-2">
                <SearchableSelect
                  label="Sales Region"
                  options={regionOptions}
                  value={form.regionId}
                  onChange={(e) => handleFieldChange('regionId', e.target.value)}
                  placeholder="-- Select Sales Region --"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Primary Contact Person */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border">
            <IconUser size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
              Primary Commercial Contact
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="First Name *"
              placeholder="e.g. Rajesh"
              value={form.contactFirstName}
              onChange={(e) => handleFieldChange('contactFirstName', e.target.value)}
              error={errors.contactFirstName}
              required
            />

            <Input
              label="Last Name"
              placeholder="e.g. Nair"
              value={form.contactLastName}
              onChange={(e) => handleFieldChange('contactLastName', e.target.value)}
            />

            <Input
              label="Contact Email"
              type="email"
              placeholder="e.g. rajesh@company.com"
              value={form.contactEmail}
              onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
              error={errors.contactEmail}
            />

            <Input
              label="Direct Mobile / Phone"
              placeholder="e.g. 9823012345"
              value={form.contactPhone}
              onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
}
