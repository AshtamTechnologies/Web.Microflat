/**
 * src/pages/companyRegistration/CompanyViewPage.jsx — 360-degree Master View for Company Registration.
 *
 * Route: /company-registration/:id
 * Designed strictly matching the layout and typography of ClientViewPage.jsx.
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  DetailField,
} from '../../components/ui';

import {
  IconBuilding2,
  IconEdit,
  IconBack,
  IconMail,
  IconPhone,
  IconMapPin,
  IconError,
  IconWebsite,
  IconClock,
  IconCopy,
  IconCheck,
  IconShieldCheck,
  IconUser,
} from '../../constants/icons';

import { useCompanyContext } from '../../context/CompanyContext';
import { useCountryState } from '../../context/CountryStateContext';
import { formatDateTime } from '../../utils/dateUtils';

export default function CompanyViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCompanyById } = useCompanyContext();
  const { getCountryName, getStateName, fetchStatesForCountry } = useCountryState();

  const [copiedField, setCopiedField] = useState(null);

  const company = getCompanyById(id);

  React.useEffect(() => {
    if (company?.country) {
      fetchStatesForCountry(company.country);
    }
  }, [company?.country, fetchStatesForCountry]);

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Company Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested company registration record with ID "{id}" was not found or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/company-registration')}>
            Back to Companies
          </Button>
        </Card>
      </div>
    );
  }

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const stateName = getStateName(company.country, company.state) || company.state;
  const countryName = getCountryName(company.country) || company.country;

  const fullAddress = [
    company.address1,
    company.address2,
    company.city,
    stateName,
    countryName,
    company.pinCode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* ── Top Header & Actions ── */}
      <PageHeader
        title={company.companyName}
        icon={<IconBuilding2 className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle={`Company ID: ${company.id} • Registered Office & Legal Profile`}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/company-registration')}
          >
            Back to Companies
          </Button>
        }
        badge={
          <Badge variant={company.isActive ? 'active' : 'inactive'}>
            {company.isActive ? 'Active' : 'Inactive'}
          </Badge>
        }
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconEdit}
            onClick={() => navigate(`/company-registration/${company.id}/edit`)}
            className="text-xs font-semibold shadow-2xs"
          >
            Edit Company
          </Button>
        }
      />

      {/* ── Balanced 2-Column Responsive Layout (lg:grid-cols-12) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: Corporate Profile & Key Signatory (lg:col-span-7) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Corporate Profile & Identifiers */}
          <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <IconBuilding2 size={18} className="text-primary shrink-0" />
                <h2 className="text-base font-bold text-heading">
                  Corporate Profile & Identification
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                {company.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <DetailField label="Company Legal Name" value={company.companyName} />

              {/* GST Number with 1-click Copy */}
              <div>
                <span className="view-field-label">GSTIN / Tax ID</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading font-semibold">
                    {company.gstNo || '—'}
                  </span>
                  {company.gstNo && (
                    <button
                      type="button"
                      onClick={() => handleCopy(company.gstNo, 'GST Number')}
                      className="text-text-muted hover:text-primary p-0.5 rounded transition-colors"
                      title="Copy GSTIN"
                    >
                      {copiedField === 'GST Number' ? (
                        <IconCheck size={14} className="text-success" />
                      ) : (
                        <IconCopy size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <DetailField
                label="Account Status"
                value={
                  <Badge variant={company.isActive ? 'active' : 'inactive'} className="text-2xs px-2 py-0.5">
                    {company.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                }
              />

              <DetailField
                label="Company Email"
                value={company.email}
                isEmail
                icon={IconMail}
              />

              <DetailField
                label="Company Website"
                value={company.website || '—'}
                isLink={Boolean(company.website)}
                href={
                  company.website
                    ? company.website.startsWith('http')
                      ? company.website
                      : `https://${company.website}`
                    : undefined
                }
                icon={IconWebsite}
              />

              <DetailField
                label="Primary Phone (Line 1)"
                value={company.phone1 || '—'}
                isPhone={Boolean(company.phone1)}
                mono
                icon={IconPhone}
              />

              <DetailField
                label="Secondary Phone (Line 2)"
                value={company.phone2 || '—'}
                isPhone={Boolean(company.phone2)}
                mono
                icon={IconPhone}
              />
            </div>
          </Card>

          {/* Card 2: Key Personnel & Authorized Contacts */}
          <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <IconUser size={18} className="text-primary shrink-0" />
                <h3 className="text-sm font-bold text-heading">
                  Authorized Key Personnel
                </h3>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Primary Legal Signatory
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <DetailField
                label="Contact Person Name"
                value={company.contactPersonName || '—'}
                valueClassName="font-semibold text-heading"
              />
              <DetailField
                label="Official Email"
                value={company.contactPersonEmail || '—'}
                isEmail={Boolean(company.contactPersonEmail)}
                icon={IconMail}
              />
              <DetailField
                label="Direct Mobile"
                value={company.contactPersonMobile || '—'}
                isPhone={Boolean(company.contactPersonMobile)}
                mono
                icon={IconPhone}
              />
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN: Registered Office & System Audit (lg:col-span-5) ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Registered Office Address */}
          <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <IconMapPin size={18} className="text-primary shrink-0" />
                <h3 className="text-sm font-bold text-heading">
                  Registered Office Location
                </h3>
              </div>
              <span className="text-2xs font-mono text-text-muted">Official Headquarters</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface/50 border border-border">
                <IconMapPin size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5 min-w-0">
                  <p className="font-semibold text-heading leading-relaxed">
                    {fullAddress || 'No registered office address provided.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-2xs pt-1">
                    {company.city && (
                      <div className="bg-bg p-1.5 rounded border border-border/80">
                        <span className="text-text-muted block">City</span>
                        <span className="font-semibold text-heading">{company.city}</span>
                      </div>
                    )}
                    {stateName && (
                      <div className="bg-bg p-1.5 rounded border border-border/80">
                        <span className="text-text-muted block">State</span>
                        <span className="font-semibold text-heading">{stateName}</span>
                      </div>
                    )}
                    {countryName && (
                      <div className="bg-bg p-1.5 rounded border border-border/80">
                        <span className="text-text-muted block">Country</span>
                        <span className="font-semibold text-heading">{countryName}</span>
                      </div>
                    )}
                    {company.pinCode && (
                      <div className="bg-bg p-1.5 rounded border border-border/80">
                        <span className="text-text-muted block">Postal PIN</span>
                        <span className="font-mono font-semibold text-heading">{company.pinCode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 4: Master Audit Trail & Verification */}
          <Card padding="md" className="space-y-3.5 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <IconClock size={16} className="text-primary shrink-0" />
                <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
                  Registration & System Audit
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                <IconShieldCheck size={12} />
                Verified Master
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-surface/40 border border-border/60 flex items-center justify-between">
                <span className="text-text-muted">Master Entity ID</span>
                <span className="font-mono font-bold text-primary">{company.id}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface/40 border border-border/60 flex items-center justify-between">
                <span className="text-text-muted">Record Status</span>
                <Badge variant={company.isActive ? 'active' : 'inactive'} size="sm">
                  {company.isActive ? 'Active Record' : 'Inactive Record'}
                </Badge>
              </div>
              {company.createdAt && (
                <div className="p-2.5 rounded-lg bg-surface/40 border border-border/60 flex items-center justify-between">
                  <span className="text-text-muted">Registered On</span>
                  <span className="font-mono text-text">{formatDateTime(company.createdAt)}</span>
                </div>
              )}
              {company.updatedAt && (
                <div className="p-2.5 rounded-lg bg-surface/40 border border-border/60 flex items-center justify-between">
                  <span className="text-text-muted">Last Modified</span>
                  <span className="font-mono text-text">{formatDateTime(company.updatedAt)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
