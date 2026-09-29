/**
 * VendorViewPage — Full-page read-only detail view for MicroFlat ERP vendors.
 *
 * Displays complete vendor profile:
 *   - Route: /vendors/:id
 *   - Sections:
 *       1. Vendor Details
 *       2. Contact Information
 *       3. Address & Location
 *       4. Procurement & Quality Notes
 *       5. Full Approval & Audit Panel
 *   - Header with quick status badges, back link, Edit and Delete actions.
 */

import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Contact,
  MapPin,
  FileText,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  Receipt,
  Globe,
  AlertCircle,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

import { Button, Card, Badge, ConfirmModal } from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { getCountryName, getStateName } from '../../mocks/vendors';

function getApprovalBadgeVariant(status) {
  switch (status) {
    case 'Approved':
      return 'approved';
    case 'Pending':
      return 'pending';
    case 'Rejected':
      return 'rejected';
    default:
      return 'neutral';
  }
}

function DetailItem({ label, value, mono = false, icon: Icon = null, fullWidth = false }) {
  return (
    <div className={`space-y-1 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-text-muted" aria-hidden="true" />}
        {label}
      </span>
      <div className={`text-sm font-medium text-heading ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value || <span className="text-text-muted font-normal">—</span>}
      </div>
    </div>
  );
}

export default function VendorViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getVendorById, deleteVendor, toggleStatus } = useVendorsContext();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const vendor = useMemo(() => {
    return getVendorById(id);
  }, [id, getVendorById]);

  if (!vendor) {
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

  const countryName = getCountryName(vendor.countryId);
  const stateName = getStateName(vendor.countryId, vendor.stateId);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer mb-3"
          >
            <ArrowLeft size={14} className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform duration-150" aria-hidden="true" />
            <span>Back to Vendors</span>
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-heading tracking-tight">
              {vendor.vendorName}
            </h1>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-surface border border-border rounded-lg text-primary">
              {vendor.vendorCode}
            </span>
            <Badge variant={vendor.isActive ? 'active' : 'inactive'}>
              {vendor.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
              {vendor.approvalStatus}
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-text-muted mt-1 flex items-center gap-2 flex-wrap">
            <span>Primary Contact: <strong>{vendor.contactPersonName}</strong></span>
            <span>•</span>
            <span>{vendor.city ? `${vendor.city}, ${stateName}` : stateName}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
          >
            <Pencil size={15} className="mr-1.5" aria-hidden="true" />
            Edit Vendor
          </Button>

          <Button
            variant="danger"
            size="md"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 size={15} className="mr-1.5" aria-hidden="true" />
            Delete
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
            Commercial & onboarding information
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <DetailItem label="Vendor Code" value={vendor.vendorCode} mono />
          <DetailItem label="Effective Date" value={vendor.effectiveDate} mono />
          <DetailItem label="Company / Entity Name" value={vendor.vendorName} />
          <DetailItem
            label="Account Status"
            value={
              <button
                type="button"
                onClick={() => toggleStatus(vendor.id)}
                title="Click to toggle status"
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors',
                  vendor.isActive
                    ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
                ].join(' ')}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    vendor.isActive ? 'bg-success' : 'bg-danger'
                  }`}
                />
                {vendor.isActive ? 'Active' : 'Inactive'}
              </button>
            }
          />
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
            Communication & tax identification
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <DetailItem
            label="Contact Person Name"
            value={vendor.contactPersonName}
          />
          <DetailItem
            label="Email Address"
            value={
              vendor.email ? (
                <a
                  href={`mailto:${vendor.email}`}
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Mail size={13} aria-hidden="true" />
                  {vendor.email}
                </a>
              ) : null
            }
          />
          <DetailItem
            label="Primary Phone Number"
            value={
              vendor.phoneNo ? (
                <a
                  href={`tel:${vendor.phoneNo}`}
                  className="text-heading hover:text-primary inline-flex items-center gap-1"
                >
                  <Phone size={13} aria-hidden="true" />
                  {vendor.phoneNo}
                </a>
              ) : null
            }
            mono
          />
          <DetailItem
            label="Alternate Phone Number"
            value={vendor.alternatePhoneNo || '—'}
            mono
          />
          <DetailItem
            label="GST Identification Number (GSTIN)"
            value={vendor.gstNo || '—'}
            mono
            fullWidth={false}
          />
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
            Official business premise & dispatch hub
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <DetailItem label="Country" value={countryName} />
          <DetailItem label="State / Province" value={stateName} />
          <DetailItem label="City / Town" value={vendor.city} />
          <DetailItem label="Postal / Zip Code" value={vendor.zipCode} mono />
          <DetailItem label="Address Line 1" value={vendor.address1} fullWidth />
          {vendor.address2 && (
            <DetailItem label="Address Line 2" value={vendor.address2} fullWidth />
          )}
        </div>
      </Card>

      {/* ── SECTION 4: PROCUREMENT & QUALITY NOTES ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            <span>4. Procurement & Quality Notes</span>
          </div>
          <span className="text-xs text-text-muted font-normal">
            Special capabilities & tooling specifications
          </span>
        </div>

        <p className="text-sm text-text leading-relaxed bg-surface/60 p-4 rounded-lg border border-border">
          {vendor.notes || 'No specific procurement notes recorded for this vendor.'}
        </p>
      </Card>

      {/* ── SECTION 5: APPROVAL & AUDIT PANEL (ALWAYS FULLY VISIBLE) ── */}
      <Card padding="md" className="bg-surface/50 border-border">
        <div className="border-b border-border pb-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
            <span>5. System Approval & Audit Trail</span>
          </div>
          <Badge variant="neutral">System Managed</Badge>
        </div>

        <div className="space-y-6">
          {/* Approval Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-bg p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Approval Status
              </span>
              <div className="pt-0.5">
                <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
                  {vendor.approvalStatus}
                </Badge>
              </div>
            </div>

            {vendor.approvalStatus !== 'Pending' ? (
              <>
                <DetailItem
                  label="Approved / Reviewed By"
                  value={vendor.approvedBy || 'Ian Chesnut (Super Admin)'}
                />
                <DetailItem
                  label="Approval Date"
                  value={vendor.approvedOn || '—'}
                  mono
                />
              </>
            ) : (
              <div className="sm:col-span-2 text-xs text-text-muted flex items-center gap-1.5 py-1">
                <Clock size={14} className="text-warning shrink-0" />
                <span>Pending initial QA and commercial approval.</span>
              </div>
            )}
          </div>

          {/* Reviewer Comments (if approved or rejected) */}
          {vendor.approvalStatus !== 'Pending' && vendor.approvedByComments && (
            <div className="bg-bg p-4 rounded-xl border border-border space-y-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Approver / Quality Comments
              </span>
              <p className="text-sm text-text">{vendor.approvedByComments}</p>
            </div>
          )}

          {/* Audit Timestamp Strip */}
          <div className="bg-bg/60 px-4 py-3 rounded-lg border border-border text-xs text-text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-border shrink-0" />
              <span>
                Created by <strong className="text-heading font-medium">{vendor.createdBy || 'Ian Chesnut'}</strong> on{' '}
                <span className="font-mono tabular-nums">{vendor.createdOn || '—'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-border shrink-0" />
              <span>
                Last updated by <strong className="text-heading font-medium">{vendor.lastUpdatedBy || 'Ian Chesnut'}</strong> on{' '}
                <span className="font-mono tabular-nums">{vendor.lastUpdatedOn || '—'}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Delete Vendor Confirmation Modal ── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Vendor"
        confirmText="Delete Vendor"
        variant="danger"
        message={
          vendor ? (
            <p>
              Are you sure you want to permanently delete{' '}
              <strong className="text-heading font-semibold">{vendor.vendorName}</strong>{' '}
              <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {vendor.vendorCode}
              </span>
              ? This action cannot be undone.
            </p>
          ) : null
        }
        onConfirm={() => {
          if (vendor) {
            deleteVendor(vendor.id);
            setIsDeleteModalOpen(false);
            navigate('/vendors');
          }
        }}
      />
    </div>
  );
}
