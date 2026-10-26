/**
 * src/pages/companyRegistration/CompanyViewPage.jsx — 360-degree Master View for Company Registration.
 *
 * Route: /company-registration/:id
 * Designed strictly matching the layout and typography of ClientViewPage.jsx.
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '../../constants/icons';

import { useCompanyContext } from '../../context/CompanyContext';
import { formatDateTime } from '../../utils/dateUtils';
import { getCountryName, getStateName } from '../../mocks/vendors';

export default function CompanyViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCompanyById } = useCompanyContext();

  const company = getCompanyById(id);

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
        subtitle={`Company ID: ${company.id} • Registered Office & Banking Profile`}
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

      {/* ── 1. Company Details Card (3 Columns Layout) ── */}
      <Card padding="md" className="space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IconBuilding2 size={17} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-heading">Company Details</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-6">
          <DetailField label="Company Name" value={company.companyName} />
          <DetailField label="Authorized Contact Person" value={company.contactPersonName || '—'} />
          <DetailField
            label="Contact Person Email"
            value={company.contactPersonEmail || '—'}
            isEmail={Boolean(company.contactPersonEmail)}
            icon={IconMail}
          />
          <DetailField
            label="Contact Person Mobile"
            value={company.contactPersonMobile || '—'}
            isPhone={Boolean(company.contactPersonMobile)}
            mono
            icon={IconPhone}
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
            label="Primary Landline (Phone 1)"
            value={company.phone1 || '—'}
            isPhone={Boolean(company.phone1)}
            mono
            icon={IconPhone}
          />
          <DetailField
            label="Secondary Landline (Phone 2)"
            value={company.phone2 || '—'}
            isPhone={Boolean(company.phone2)}
            mono
            icon={IconPhone}
          />
          <DetailField
            label="GST No."
            value={
              company.gstNo ? (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border text-heading font-semibold">
                  {company.gstNo}
                </span>
              ) : (
                '—'
              )
            }
          />

          <DetailField
            label="Account Status"
            value={
              <Badge variant={company.isActive ? 'active' : 'inactive'} className="text-2xs px-2 py-0.5">
                {company.isActive ? 'Active' : 'Inactive'}
              </Badge>
            }
          />

          <div className="md:col-span-2 lg:col-span-3">
            <DetailField
              label="Registered Office Address"
              value={fullAddress || '—'}
              icon={IconMapPin}
            />
          </div>
        </div>
      </Card>



      {/* ── Audit Footer ── */}
      {company.createdAt && (
        <div className="text-2xs text-text-muted flex items-center justify-between px-2 pt-1 border-t border-border/50">
          <span>Created: {formatDateTime(company.createdAt)}</span>
          {company.updatedAt && <span>Last Updated: {formatDateTime(company.updatedAt)}</span>}
        </div>
      )}
    </div>
  );
}
