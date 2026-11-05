/**
 * src/pages/companyRegistration/components/CompanyDetailsTab.jsx — Tab 1 of Company Registration.
 */

import React, { useMemo, useEffect } from 'react';
import {
  CollapsibleCard,
  Input,
  StatusSwitch,
  SearchableSelect,
  Button,
  IconButton,
} from '../../../components/ui';
import {
  IconBuilding2,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconHash,
  IconWebsite,
  IconAdd,
  IconDelete,
} from '../../../constants/icons';
import { useCountryState } from '../../../context/CountryStateContext';

export default function CompanyDetailsTab({ form, onChange, errors }) {
  const hasInfoErrors = Boolean(
    errors.companyName ||
      errors.contactPersonName ||
      errors.contactPersonEmail ||
      errors.contactPersonMobile ||
      errors.email ||
      errors.website ||
      errors.cinNo ||
      errors.gstNo
  );

  const hasAddressErrors = Boolean(
    errors.address1 ||
      errors.city ||
      errors.state ||
      errors.country ||
      errors.pinCode ||
      errors.address2
  );

  const {
    countries,
    countryOptions,
    getStateOptions,
    fetchStatesForCountry,
    statesCache,
    loadingStatesMap,
  } = useCountryState();

  // Resolve legacy country codes/names ('IN', 'India') to API ID
  const resolvedCountryId = useMemo(() => {
    if (!form.country) return '';
    const match = countries.find(
      (c) =>
        String(c.id) === String(form.country) ||
        c.countryName?.toLowerCase() === String(form.country).toLowerCase() ||
        (String(form.country).toUpperCase() === 'IN' && (c.countryName?.toLowerCase() === 'india' || c.id === 2)) ||
        (String(form.country).toUpperCase() === 'US' && (c.countryName?.toLowerCase().includes('united states') || c.id === 1))
    );
    return match ? match.id : form.country;
  }, [form.country, countries]);

  useEffect(() => {
    if (resolvedCountryId) {
      fetchStatesForCountry(resolvedCountryId);
    }
  }, [resolvedCountryId, fetchStatesForCountry]);

  // Cascading state options based on selected country
  const stateOptions = useMemo(() => {
    if (!resolvedCountryId) return [];
    return getStateOptions(resolvedCountryId);
  }, [resolvedCountryId, getStateOptions]);

  // Resolve legacy state codes/names ('GJ', 'Gujarat') to API ID
  const resolvedStateId = useMemo(() => {
    if (!form.state) return '';
    const list = (statesCache && statesCache[String(resolvedCountryId)]) || [];
    const match = list.find(
      (s) =>
        String(s.id) === String(form.state) ||
        s.stateName?.toLowerCase() === String(form.state).toLowerCase() ||
        (String(form.state).toUpperCase() === 'GJ' && s.stateName?.toLowerCase() === 'gujarat')
    );
    return match ? match.id : form.state;
  }, [form.state, resolvedCountryId, statesCache]);

  const handleCountryChange = (e) => {
    const raw = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const countryVal = typeof raw === 'object' && raw !== null ? raw.value || '' : raw || '';
    onChange('country', countryVal);
    onChange('state', '');
  };

  const handleStateChange = (e) => {
    const raw = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const stateVal = typeof raw === 'object' && raw !== null ? raw.value || '' : raw || '';
    onChange('state', stateVal);
  };

  const phones = Array.isArray(form.phones) ? form.phones : [];

  const handlePhoneChange = (index, field, value) => {
    const updated = phones.map((p, idx) => {
      if (idx !== index) return p;
      return { ...p, [field]: value };
    });
    onChange('phones', updated);
  };

  const handleSetPrimary = (index) => {
    const updated = phones.map((p, idx) => ({
      ...p,
      isPrimary: idx === index,
    }));
    onChange('phones', updated);
  };

  const handleAddPhone = () => {
    if (phones.length >= 20) return;
    const isFirst = phones.length === 0;
    const updated = [
      ...phones,
      { phoneLabel: 'Office', phoneNumber: '', isPrimary: isFirst },
    ];
    onChange('phones', updated);
  };

  const handleRemovePhone = (index) => {
    if (phones.length <= 1) {
      onChange('phones', [{ phoneLabel: 'Office', phoneNumber: '', isPrimary: true }]);
      return;
    }
    const removedWasPrimary = phones[index]?.isPrimary;
    const updated = phones.filter((_, idx) => idx !== index);
    if (removedWasPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    onChange('phones', updated);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. General Profile & Primary Contact (3 Columns) ── */}
      <CollapsibleCard
        title="General Company Information"
        subtitle="Legal registered name and primary representative"
        icon={<IconBuilding2 size={16} />}
        hasError={hasInfoErrors}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1: Company Name (1 col) + Contact Person Name (1 col) + Contact Person Mobile (1 col) */}
          <div>
            <label className="mf-label" htmlFor="companyName">
              Company Name <span className="mf-required">*</span>
            </label>
            <Input
              id="companyName"
              placeholder="e.g. Micro-Flat Datasoft Pvt. Ltd."
              value={form.companyName || ''}
              onChange={(e) => onChange('companyName', e.target.value)}
              error={errors.companyName}
              icon={IconBuilding2}
              required
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="contactPersonName">
              Contact Person Name <span className="mf-required">*</span>
            </label>
            <Input
              id="contactPersonName"
              placeholder="e.g. Rajesh Patel"
              value={form.contactPersonName || ''}
              onChange={(e) => onChange('contactPersonName', e.target.value)}
              error={errors.contactPersonName}
              icon={IconUser}
              required
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="contactPersonMobile">
              Contact Person Mobile <span className="mf-required">*</span>
            </label>
            <Input
              id="contactPersonMobile"
              type="tel"
              placeholder="e.g. +91 98250 12345"
              value={form.contactPersonMobile || ''}
              onChange={(e) => onChange('contactPersonMobile', e.target.value)}
              error={errors.contactPersonMobile}
              icon={IconPhone}
              required
            />
          </div>

          {/* Row 2: Contact Person Email (1 col) + Company Email (1 col) + Company Website (1 col) */}
          <div>
            <label className="mf-label" htmlFor="contactPersonEmail">
              Contact Person Email <span className="mf-required">*</span>
            </label>
            <Input
              id="contactPersonEmail"
              type="email"
              placeholder="e.g. rajesh.patel@company.com"
              value={form.contactPersonEmail || ''}
              onChange={(e) => onChange('contactPersonEmail', e.target.value)}
              error={errors.contactPersonEmail}
              icon={IconMail}
              required
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="email">
              Company Email <span className="mf-required">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. contact@microflat.com"
              value={form.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              error={errors.email}
              icon={IconMail}
              required
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="website">
              Company Website
            </label>
            <Input
              id="website"
              type="url"
              placeholder="e.g. https://www.microflat.com"
              value={form.website || ''}
              onChange={(e) => onChange('website', e.target.value)}
              error={errors.website}
              icon={IconWebsite}
            />
          </div>

          {/* Row 3: GST No. + CIN No. + Account Status */}
          <div>
            <label className="mf-label" htmlFor="gstNo">
              GST No.
            </label>
            <Input
              id="gstNo"
              placeholder="e.g. 24AAACM1234F1Z5"
              value={form.gstNo || ''}
              onChange={(e) => onChange('gstNo', e.target.value.toUpperCase())}
              error={errors.gstNo}
              icon={IconHash}
              className="uppercase font-mono"
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="cinNo">
              CIN No.
            </label>
            <Input
              id="cinNo"
              placeholder="e.g. U29100GJ2010PTC012345"
              value={form.cinNo || ''}
              onChange={(e) => onChange('cinNo', e.target.value.replace(/\s/g, '').toUpperCase())}
              error={errors.cinNo}
              icon={IconHash}
              maxLength={21}
              className="uppercase font-mono"
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="accountStatus">
              Account Status
            </label>
            <div className="pt-1.5 flex items-center">
              <StatusSwitch
                id="accountStatus"
                checked={form.isActive}
                onChange={(val) => onChange('isActive', val)}
                size="md"
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── 2. Official Phone Numbers Grid ── */}
      <CollapsibleCard
        title="Official Phone Numbers"
        subtitle="Manage office, landline, and department numbers"
        icon={<IconPhone size={16} />}
        hasError={Boolean(errors.phones)}
        defaultOpen={true}
      >
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-text-muted">
                  <th className="py-2 px-3 font-semibold w-1/4">Label</th>
                  <th className="py-2 px-3 font-semibold w-2/5">Phone Number</th>
                  <th className="py-2 px-3 font-semibold w-24 text-center">Primary</th>
                  <th className="py-2 px-3 font-semibold w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {phones.map((phone, idx) => {
                  const phoneError = errors.phones?.[idx];
                  return (
                    <tr key={idx} className="hover:bg-surface/40 transition-colors">
                      <td className="py-2 px-3 align-top">
                        <Input
                          placeholder="e.g. Office, Landline"
                          value={phone.phoneLabel || ''}
                          onChange={(e) => handlePhoneChange(idx, 'phoneLabel', e.target.value)}
                          maxLength={50}
                          size="sm"
                        />
                      </td>
                      <td className="py-2 px-3 align-top">
                        <Input
                          type="tel"
                          placeholder="e.g. 079 2658 1234 or +91 98250 11111"
                          value={phone.phoneNumber || ''}
                          onChange={(e) => handlePhoneChange(idx, 'phoneNumber', e.target.value)}
                          error={phoneError}
                          maxLength={20}
                          size="sm"
                          icon={IconPhone}
                        />
                      </td>
                      <td className="py-2 px-3 align-middle text-center">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="primaryPhoneSelection"
                            checked={Boolean(phone.isPrimary)}
                            onChange={() => handleSetPrimary(idx)}
                            className="text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                          <span className="text-2xs text-text-muted">
                            {phone.isPrimary ? (
                              <span className="font-semibold text-primary">Primary</span>
                            ) : (
                              'Set'
                            )}
                          </span>
                        </label>
                      </td>
                      <td className="py-2 px-3 align-middle text-right">
                        <IconButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          icon={IconDelete}
                          title="Remove phone number"
                          aria-label="Remove phone number"
                          onClick={() => handleRemovePhone(idx)}
                          disabled={phones.length <= 1 && !phone.phoneNumber}
                          className="text-text-muted hover:text-danger hover:bg-danger/10"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={IconAdd}
              onClick={handleAddPhone}
              disabled={phones.length >= 20}
              className="text-xs"
            >
              Add Phone Number
            </Button>
            <span className="text-2xs text-text-muted">
              {phones.length} / 20 numbers • Blank rows are ignored on save
            </span>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── 2. Registered Office Address ── */}
      <CollapsibleCard
        title="Registered Address"
        subtitle="Physical office or headquarter location"
        icon={<IconMapPin size={16} />}
        hasError={hasAddressErrors}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* Row 1: Location & Postal Routing (4 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="mf-label" htmlFor="country">
                Country <span className="mf-required">*</span>
              </label>
              <SearchableSelect
                id="country"
                name="country"
                options={countryOptions}
                value={resolvedCountryId || ''}
                onChange={handleCountryChange}
                error={errors.country}
                placeholder="Select country..."
                searchPlaceholder="Search countries..."
                emptyText="No countries found"
                required
              />
            </div>

            <div>
              <label className="mf-label" htmlFor="state">
                State <span className="mf-required">*</span>
              </label>
              <SearchableSelect
                id="state"
                name="state"
                options={stateOptions}
                value={resolvedStateId || ''}
                onChange={handleStateChange}
                error={errors.state}
                placeholder={
                  !resolvedCountryId
                    ? 'Select Country first'
                    : loadingStatesMap && loadingStatesMap[String(resolvedCountryId)]
                    ? 'Loading states...'
                    : stateOptions.length === 0
                    ? 'No states available'
                    : 'Select State'
                }
                searchPlaceholder="Search states..."
                emptyText="No states found"
                disabled={!resolvedCountryId || stateOptions.length === 0}
                required
              />
            </div>

            <div>
              <label className="mf-label" htmlFor="city">
                City <span className="mf-required">*</span>
              </label>
              <Input
                id="city"
                placeholder="e.g. Vadodara"
                value={form.city || ''}
                onChange={(e) => onChange('city', e.target.value)}
                error={errors.city}
                required
              />
            </div>

            <div>
              <label className="mf-label" htmlFor="pinCode">
                ZIP / PIN Code <span className="mf-required">*</span>
              </label>
              <Input
                id="pinCode"
                placeholder="e.g. 390010"
                value={form.pinCode || ''}
                onChange={(e) => onChange('pinCode', e.target.value)}
                error={errors.pinCode}
                required
              />
            </div>
          </div>

          {/* Row 2: Address Line 1 and Address Line 2 (in 2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mf-label" htmlFor="address1">
                Address Line 1 <span className="mf-required">*</span>
              </label>
              <Input
                id="address1"
                placeholder="Door / Building / Street address"
                value={form.address1 || ''}
                onChange={(e) => onChange('address1', e.target.value)}
                error={errors.address1}
                required
              />
            </div>

            <div>
              <label className="mf-label" htmlFor="address2">
                Address Line 2
              </label>
              <Input
                id="address2"
                placeholder="Area, Landmark, or Locality"
                value={form.address2 || ''}
                onChange={(e) => onChange('address2', e.target.value)}
                error={errors.address2}
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
