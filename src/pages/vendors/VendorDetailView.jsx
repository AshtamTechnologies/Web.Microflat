/**
 * VendorDetailView — Reusable detailed profile view for a single vendor.
 * Used both in full-page mode (/vendors/:id) and in split-screen/master-detail mode in VendorsPage.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  Truck,
  Contact,
  MapPin,
  FileText,
  ShieldCheck,
  Phone,
  Mail,
  Clock,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button, Card, Badge, ConfirmModal } from '../../components/ui';
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
    <div className={`space-y-1 ${fullWidth ? 'col-span-full' : ''}`}>
      <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-text-muted" aria-hidden="true" />}
        {label}
      </span>
      <div className={`text-sm font-medium text-heading break-words ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value || <span className="text-text-muted font-normal">—</span>}
      </div>
    </div>
  );
}

export default function VendorDetailView({
  vendor,
  onClose,
  onDelete,
  isSplitView = false,
}) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!vendor) return null;

  const countryName = getCountryName(vendor.countryId);
  const stateName = getStateName(vendor.countryId, vendor.stateId);

  return (
    <div className="space-y-5">
      {/* ── Top Header Bar ── */}
      <div className="bg-bg/95 backdrop-blur-xs border border-border rounded-xl p-4 sm:p-5 shadow-xs sticky top-0 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                {vendor.vendorCode}
              </span>
              <Badge variant={vendor.isActive ? 'active' : 'inactive'}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
                {vendor.approvalStatus}
              </Badge>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-heading tracking-tight mt-1.5 break-words">
              {vendor.vendorName}
            </h2>

            <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Contact: <strong className="text-text font-medium">{vendor.contactPersonName}</strong></span>
              {vendor.city && (
                <>
                  <span>•</span>
                  <span>{vendor.city}, {stateName}</span>
                </>
              )}
            </p>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
              title="Edit Vendor"
              className="text-xs"
            >
              <Pencil size={13} className="sm:mr-1" />
              <span className="hidden sm:inline">Edit</span>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Delete Vendor"
              className="text-xs"
            >
              <Trash2 size={13} className="sm:mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close detail view"
                title="Close view and return to full table"
                className="p-1.5 rounded-lg text-text-muted hover:text-heading hover:bg-surface border border-border ml-1 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1: Vendor Details ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <Truck size={16} className="text-primary" />
            <span>1. Commercial & General</span>
          </div>
          <span className="text-[11px] text-text-muted">Master Info</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <DetailItem label="Vendor Code" value={vendor.vendorCode} mono />
          <DetailItem label="Effective Date" value={vendor.effectiveDate} mono />
          <DetailItem
            label="Account Status"
            value={
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none ${
                  vendor.isActive
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${vendor.isActive ? 'bg-success' : 'bg-danger'}`} />
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
            }
          />
        </div>
      </Card>

      {/* ── Section 2: Contact Information ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <Contact size={16} className="text-primary" />
            <span>2. Contact Details</span>
          </div>
          <span className="text-[11px] text-text-muted">Direct Reach</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailItem label="Contact Person" value={vendor.contactPersonName} />
          <DetailItem
            label="Email Address"
            value={
              vendor.email ? (
                <a
                  href={`mailto:${vendor.email}`}
                  className="text-primary hover:underline inline-flex items-center gap-1 break-all max-w-full"
                >
                  <Mail size={12} className="shrink-0" />
                  <span className="break-all">{vendor.email}</span>
                </a>
              ) : null
            }
          />
          <DetailItem
            label="Primary Phone"
            value={
              vendor.phoneNo ? (
                <a
                  href={`tel:${vendor.phoneNo}`}
                  className="text-heading hover:text-primary inline-flex items-center gap-1"
                >
                  <Phone size={12} className="shrink-0" />
                  {vendor.phoneNo}
                </a>
              ) : null
            }
            mono
          />
          <DetailItem label="Alternate Phone" value={vendor.alternatePhoneNo || '—'} mono />
          <DetailItem label="GSTIN / Tax ID" value={vendor.gstNo || '—'} mono />
        </div>
      </Card>

      {/* ── Section 3: Address & Location ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <MapPin size={16} className="text-primary" />
            <span>3. Address & Dispatch Location</span>
          </div>
          <span className="text-[11px] text-text-muted">Premises</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailItem label="Country" value={countryName} />
          <DetailItem label="State / Province" value={stateName} />
          <DetailItem label="City / Town" value={vendor.city} />
          <DetailItem label="Postal / ZIP" value={vendor.zipCode} mono />
          <DetailItem label="Address Line 1" value={vendor.address1} fullWidth />
          {vendor.address2 && <DetailItem label="Address Line 2" value={vendor.address2} fullWidth />}
        </div>
      </Card>

      {/* ── Section 4: Notes ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <FileText size={16} className="text-primary" />
            <span>4. Procurement & Quality Notes</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-text bg-surface/60 p-3.5 rounded-lg border border-border leading-relaxed">
          {vendor.notes || 'No specific procurement or QA notes recorded.'}
        </p>
      </Card>

      {/* ── Section 5: Approval & Audit ── */}
      <Card padding="md" className="bg-surface/50 border-border">
        <div className="border-b border-border pb-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <ShieldCheck size={16} className="text-primary" />
            <span>5. Approval & Audit Trail</span>
          </div>
          <Badge variant="neutral">System Managed</Badge>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-bg p-3.5 rounded-xl border border-border text-xs">
            <div className="space-y-1">
              <span className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider block">
                Approval Status
              </span>
              <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
                {vendor.approvalStatus}
              </Badge>
            </div>
            {vendor.approvalStatus !== 'Pending' ? (
              <>
                <DetailItem label="Reviewed By" value={vendor.approvedBy || 'Super Admin'} />
                <DetailItem label="Approval Date" value={vendor.approvedOn || '—'} mono />
              </>
            ) : (
              <div className="text-xs text-text-muted flex items-center gap-1.5">
                <Clock size={13} className="text-warning shrink-0" />
                <span>Pending initial QA review</span>
              </div>
            )}
          </div>

          {vendor.approvedByComments && (
            <div className="bg-bg p-3 rounded-xl border border-border text-xs space-y-1">
              <span className="text-[10.5px] font-semibold text-text-muted uppercase tracking-wider block">
                Reviewer Comments
              </span>
              <p className="text-text">{vendor.approvedByComments}</p>
            </div>
          )}

          <div className="bg-bg/60 px-3.5 py-2.5 rounded-lg border border-border text-[11px] text-text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Created by <strong className="text-heading">{vendor.createdBy || 'Admin'}</strong> on <span className="font-mono">{vendor.createdOn || '—'}</span></span>
            <span>Updated: <span className="font-mono">{vendor.lastUpdatedOn || '—'}</span></span>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Vendor"
        confirmText="Delete Vendor"
        variant="danger"
        message={
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-heading font-semibold">{vendor.vendorName}</strong> ({vendor.vendorCode})?
          </p>
        }
        onConfirm={() => {
          onDelete?.(vendor.id);
          setIsDeleteModalOpen(false);
          onClose?.();
        }}
      />
    </div>
  );
}
