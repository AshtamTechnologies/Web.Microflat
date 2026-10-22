/**
 * src/pages/companyRegistration/components/CompanyDetailsTab.jsx — Tab 1 of Company Registration.
 */

import React from 'react';
import { CollapsibleCard, Input, StatusSwitch } from '../../../components/ui';
import {
  IconBuilding2,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconHash,
} from '../../../constants/icons';

export default function CompanyDetailsTab({ form, onChange, errors }) {
  const hasInfoErrors = Boolean(
    errors.companyName ||
      errors.firstName ||
      errors.email ||
      errors.phone1 ||
      errors.gstNo ||
      errors.phone2
  );

  const hasAddressErrors = Boolean(
    errors.address1 ||
      errors.city ||
      errors.state ||
      errors.country ||
      errors.pinCode ||
      errors.address2
  );

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
          {/* Row 1: Company Name (1 col) + First Name (1 col) + Last Name (1 col) */}
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
            <label className="mf-label" htmlFor="firstName">
              First Name <span className="mf-required">*</span>
            </label>
            <Input
              id="firstName"
              placeholder="e.g. Krupal"
              value={form.firstName || ''}
              onChange={(e) => onChange('firstName', e.target.value)}
              error={errors.firstName}
              icon={IconUser}
              required
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="lastName">
              Last Name
            </label>
            <Input
              id="lastName"
              placeholder="e.g. Bhoi"
              value={form.lastName || ''}
              onChange={(e) => onChange('lastName', e.target.value)}
              error={errors.lastName}
              icon={IconUser}
            />
          </div>

          {/* Row 2: Company Email (1 col) + Phone 1 (1 col) + Phone 2 (1 col) */}
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
            <label className="mf-label" htmlFor="phone1">
              Phone 1 <span className="mf-required">*</span>
            </label>
            <Input
              id="phone1"
              placeholder="e.g. +91 98250 12345"
              value={form.phone1 || ''}
              onChange={(e) => onChange('phone1', e.target.value)}
              error={errors.phone1}
              icon={IconPhone}
              required
            />
          </div>

          <div>
            <label className="mf-label" htmlFor="phone2">
              Phone 2
            </label>
            <Input
              id="phone2"
              placeholder="e.g. +91 265 2345678"
              value={form.phone2 || ''}
              onChange={(e) => onChange('phone2', e.target.value)}
              error={errors.phone2}
              icon={IconPhone}
            />
          </div>

          {/* Row 3: GST No. (1 col) + Account Status (1 col) */}
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
              <Input
                id="country"
                placeholder="e.g. India"
                value={form.country || ''}
                onChange={(e) => onChange('country', e.target.value)}
                error={errors.country}
                required
              />
            </div>

            <div>
              <label className="mf-label" htmlFor="state">
                State <span className="mf-required">*</span>
              </label>
              <Input
                id="state"
                placeholder="e.g. Gujarat"
                value={form.state || ''}
                onChange={(e) => onChange('state', e.target.value)}
                error={errors.state}
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
