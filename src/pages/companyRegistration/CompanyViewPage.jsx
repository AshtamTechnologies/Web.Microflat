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
  IconUser,
} from '../../constants/icons';

import { useCompanyContext } from '../../context/CompanyContext';
import { useCountryState } from '../../context/CountryStateContext';
import { formatDateTime } from '../../utils/dateUtils';

export default function CompanyViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCompanyById, fetchCompanyById } = useCompanyContext();
  const { getCountryName, getStateName, fetchStatesForCountry } = useCountryState();

  const [copiedField, setCopiedField] = useState(null);
  const [company, setCompany] = useState(() => getCompanyById(id));
  const [loading, setLoading] = useState(!company);

  React.useEffect(() => {
    let isMounted = true;
    async function loadCompanyData() {
      if (!company) setLoading(true);
      try {
        const fetched = await fetchCompanyById(id);
        if (fetched && isMounted) {
          setCompany(fetched);
        }
      } catch (err) {
        console.warn('Failed to load company by id:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCompanyData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  React.useEffect(() => {
    if (company?.country) {
      fetchStatesForCountry(company.country);
    }
  }, [company?.country, fetchStatesForCountry]);

  if (loading && !company) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-muted">Loading company profile...</p>
        </div>
      </div>
    );
  }

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
        subtitle={`Company ID: ${company.companyCode || company.companyId || company.id} • Registered Office & Legal Profile`}
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
            onClick={() => navigate(`/company-registration/${company.companyId || company.id}/edit`)}
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
                {company.companyCode || company.companyId || company.id}
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

              {/* CIN Number with 1-click Copy */}
              <div>
                <span className="view-field-label">CIN (Corporate Identification No.)</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading font-semibold">
                    {company.cinNo || '—'}
                  </span>
                  {company.cinNo && (
                    <button
                      type="button"
                      onClick={() => handleCopy(company.cinNo, 'CIN Number')}
                      className="text-text-muted hover:text-primary p-0.5 rounded transition-colors"
                      title="Copy CIN"
                    >
                      {copiedField === 'CIN Number' ? (
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
                value={company.companyEmail || company.email}
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

              {/* Official Phone Numbers Grid */}
              <div className="sm:col-span-2 pt-3 border-t border-border/60">
                <span className="view-field-label block mb-2">Official Phone Numbers</span>
                {company.phones && company.phones.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {company.phones.map((p, idx) => (
                      <div
                        key={p.companyPhoneId || idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-border text-xs"
                      >
                        <div className="min-w-0">
                          <span className="text-3xs uppercase tracking-wider text-text-muted block font-semibold">
                            {p.phoneLabel || 'Phone'}
                          </span>
                          <span className="font-mono text-heading font-medium">
                            {p.phoneNumber}
                          </span>
                        </div>
                        {p.isPrimary && (
                          <Badge variant="primary" size="sm" className="text-3xs px-1.5 py-0">
                            Primary
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-text-muted italic">No official phone numbers registered</span>
                )}
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <DetailField
                label="Address Line 1"
                value={company.address1 || '—'}
                valueClassName="font-medium text-heading"
              />
              <DetailField
                label="Address Line 2"
                value={company.address2 || '—'}
                valueClassName="font-medium text-heading"
              />
              <DetailField
                label="City"
                value={company.city || '—'}
              />
              <DetailField
                label="State"
                value={stateName || '—'}
              />
              <DetailField
                label="Country"
                value={countryName || '—'}
              />
              <DetailField
                label="PIN / Postal Code"
                value={company.pinCode || '—'}
                mono
              />

              {/* Full Postal Address Strip with Copy */}
              <div className="sm:col-span-2 pt-3 border-t border-border/60">
                <span className="view-field-label block mb-1.5">Full Postal Address</span>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface/50 border border-border text-xs">
                  <div className="flex items-center gap-2 text-heading font-medium min-w-0">
                    <IconMapPin size={14} className="text-primary shrink-0" />
                    <span className="truncate">{fullAddress || 'No registered office address provided.'}</span>
                  </div>
                  {fullAddress && (
                    <button
                      type="button"
                      onClick={() => handleCopy(fullAddress, 'Full Address')}
                      className="text-text-muted hover:text-primary p-1 rounded transition-colors shrink-0"
                      title="Copy full address"
                    >
                      {copiedField === 'Full Address' ? (
                        <IconCheck size={14} className="text-success" />
                      ) : (
                        <IconCopy size={14} />
                      )}
                    </button>
                  )}
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
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-surface/40 border border-border/60 flex items-center justify-between">
                <span className="text-text-muted">Company ID</span>
                <span className="font-mono font-bold text-primary">{company.companyCode || company.companyId || company.id}</span>
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
