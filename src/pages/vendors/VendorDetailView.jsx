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
  Paperclip,
  Download,
  Eye,
  Globe,
  Image as ImageIcon,
} from 'lucide-react';
import { Button, Card, Badge, ConfirmModal, Modal } from '../../components/ui';
import { getCountryName, getStateName } from '../../mocks/vendors';
import {
  getEffectiveDateStatus,
  formatDateDisplay,
} from '../../utils/effectiveDateUtils';
import VendorEffectiveDatesGrid from './VendorEffectiveDatesGrid';

function getFileIcon(fileName = '', fileType = '') {
  const name = fileName.toLowerCase();
  const type = (fileType || '').toLowerCase();

  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <FileText size={16} className="text-danger shrink-0" />;
  }
  return <ImageIcon size={16} className="text-primary shrink-0" />;
}

function handleDownloadAttachment(att) {
  if (att.fileUrl) {
    const a = document.createElement('a');
    a.href = att.fileUrl;
    a.download = att.fileName || 'attachment';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    const blob = new Blob([`MicroFlat ERP Mock Document: ${att.documentName}\nFile: ${att.fileName}`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.fileName || 'document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function DetailItem({ label, value, mono = false, fullWidth = false }) {
  return (
    <div className={`space-y-1 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
        {label}
      </span>
      <div
        className={`text-xs text-text ${
          mono ? 'font-mono text-heading font-medium' : 'font-medium text-heading'
        }`}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function getApprovalBadgeVariant(status) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'pending':
    default:
      return 'pending';
  }
}

export default function VendorDetailView({
  vendor,
  onDelete,
  onClose,
  showFullPageLink = false,
}) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  if (!vendor) return null;

  const countryName = getCountryName(vendor.countryId);
  const stateName = getStateName(vendor.countryId, vendor.stateId);
  const attachments = vendor.attachments || [];
  const effectiveStatus = getEffectiveDateStatus(vendor.effectiveDate);

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
              <Badge variant={effectiveStatus.badgeVariant}>
                {effectiveStatus.label}
              </Badge>
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
            <span>1. Vendor Master Details</span>
          </div>
          <span className="text-[11px] text-text-muted">Master Classification</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <DetailItem label="Vendor Code" value={vendor.vendorCode} mono />
          <DetailItem label="Vendor / Company Name" value={vendor.vendorName} />
          <DetailItem
            label="Account Status"
            value={
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none ${vendor.isActive
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

      {/* ── Section 2: ERP Effective Dates & Master Revisions Grid ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <Clock size={16} className="text-primary" />
            <span>2. ERP Effective Dates & Revisions History</span>
          </div>
          <span className="text-[11px] text-text-muted">Temporal Version Log</span>
        </div>

        <VendorEffectiveDatesGrid
          history={vendor.effectiveDateHistory}
          currentEffectiveDate={vendor.effectiveDate}
          editable={false}
          vendorCode={vendor.vendorCode}
        />
      </Card>

      {/* ── Section 3: Contact Information ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <Contact size={16} className="text-primary" />
            <span>3. Contact Details</span>
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
          <DetailItem
            label="Website / Company URL"
            value={
              vendor.website ? (
                <a
                  href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 break-all max-w-full"
                >
                  <Globe size={12} className="shrink-0" />
                  <span className="break-all">{vendor.website}</span>
                  <ExternalLink size={11} className="shrink-0 opacity-70" />
                </a>
              ) : (
                '—'
              )
            }
          />
        </div>
      </Card>

      {/* ── Section 4: Address & Location ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <MapPin size={16} className="text-primary" />
            <span>4. Address & Dispatch Location</span>
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

      {/* ── Section 5: Notes ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <FileText size={16} className="text-primary" />
            <span>5. Procurement & Quality Notes</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-text bg-surface/60 p-3.5 rounded-lg border border-border leading-relaxed">
          {vendor.notes || 'No specific procurement or QA notes recorded.'}
        </p>
      </Card>

      {/* ── Section 6: Attachments ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-2.5 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <Paperclip size={16} className="text-primary" />
            <span>6. Attached Supporting Documents</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {attachments.length === 0 ? (
          <p className="text-xs text-text-muted py-3">No compliance or legal files attached.</p>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-bg">
            {attachments.map((att, idx) => (
              <div
                key={att.id || idx}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-surface border border-border shrink-0">
                    {getFileIcon(att.fileName, att.fileType)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-heading truncate">
                      {att.documentName}
                    </p>
                    <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                      <span className="font-mono">{att.fileName}</span>
                      <span>•</span>
                      <span>{att.fileSize}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(att)}
                    title="Preview attachment"
                    className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface border border-border transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(att)}
                    title="Download attachment"
                    className="p-1.5 rounded-lg text-text-muted hover:text-success hover:bg-surface border border-border transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Section 7: Audit & Approval Info ── */}
      <Card padding="md" className="bg-surface/50">
        <div className="border-b border-border pb-2.5 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <ShieldCheck size={16} className="text-primary" />
            <span>7. Verification & Audit Trail</span>
          </div>
          <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
            {vendor.approvalStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <DetailItem label="Approval Status" value={vendor.approvalStatus} />
          {vendor.approvalStatus !== 'Pending' && (
            <DetailItem label="Approved By" value={vendor.approvedBy || 'System Admin'} />
          )}
          {vendor.approvalStatus !== 'Pending' && (
            <DetailItem label="Approved On" value={vendor.approvedOn || '—'} mono />
          )}
          <DetailItem label="Created By" value={vendor.createdBy || 'Ian Chesnut'} />
          <DetailItem label="Created On" value={vendor.createdOn || '—'} mono />
          <DetailItem label="Last Updated" value={vendor.lastUpdatedOn || '—'} mono />
        </div>

        {vendor.approvedByComments && (
          <div className="mt-3 p-3 bg-bg rounded-lg border border-border text-xs">
            <span className="font-semibold text-text-muted block mb-1">Approval Comments:</span>
            <p className="text-text">{vendor.approvedByComments}</p>
          </div>
        )}
      </Card>

      {/* ── Confirm Delete Modal ── */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          onDelete?.(vendor);
        }}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${vendor.vendorName}" (${vendor.vendorCode})? This action cannot be undone.`}
        confirmText="Delete Vendor"
        confirmVariant="danger"
      />

      {/* ── Document Preview Modal ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.documentName || 'Document Preview'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted bg-surface/50 p-3 rounded-lg border border-border">
              <div>
                <span className="font-medium text-heading">Filename:</span>{' '}
                <span className="font-mono">{previewItem.fileName}</span>
              </div>
              <div>
                <span className="font-medium text-heading">Size:</span>{' '}
                <span className="font-mono">{previewItem.fileSize}</span>
              </div>
            </div>

            {previewItem.fileType?.includes('image') && previewItem.fileUrl ? (
              <div className="max-h-[420px] overflow-auto rounded-lg border border-border bg-surface/30 flex items-center justify-center p-4">
                <img
                  src={previewItem.fileUrl}
                  alt={previewItem.documentName}
                  className="max-h-[380px] max-w-full rounded object-contain"
                />
              </div>
            ) : (
              <div className="py-10 px-4 text-center rounded-lg border border-dashed border-border bg-surface/20 space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  {getFileIcon(previewItem.fileName, previewItem.fileType)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-heading">{previewItem.documentName}</h4>
                  <p className="text-xs text-text-muted mt-1 font-mono">{previewItem.fileName}</p>
                </div>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  This document format is ready for download or viewing via your device's default reader.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              {previewItem.fileUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(previewItem.fileUrl, '_blank')}
                >
                  <ExternalLink size={14} className="mr-1.5" />
                  Open in Tab
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleDownloadAttachment(previewItem)}
              >
                <Download size={14} className="mr-1.5" />
                Download
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
