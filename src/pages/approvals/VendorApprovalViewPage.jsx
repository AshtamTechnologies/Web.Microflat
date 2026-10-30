/**
 * VendorApprovalViewPage — Dedicated review page for single vendor approval request.
 *
 * Route: /approvals/vendors/:id
 * Fetches: GET /api/approval-requests/{id}
 * Response format: { request: { ... }, vendorDetail: { ... } }
 *
 * Features:
 *   - Consistent MicroFlat ERP UI layout with Cards and DetailFields.
 *   - Full review of submitted vendor details, contact info, and address.
 *   - Downloadable attachments with file size and type icons.
 *   - Approve action with Document Verification checkbox ONLY if vendor has attachments.
 *   - Reject action with mandatory comments.
 *   - Step-by-step Request Timeline modal.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconBack,
  IconBuilding2,
  IconCheck,
  IconClock,
  IconClose,
  IconContact,
  IconDownload,
  IconError,
  IconExternalLink,
  IconFileText,
  IconHistory,
  IconImage,
  IconLocation,
  IconShieldCheck,
  IconSuccess,
  IconUser,
  IconVendorApproval,
  IconAttachment,
} from '../../constants/icons';

import {
  Button,
  Badge,
  Card,
  CollapsibleCard,
  DetailField,
  Modal,
  PageHeader,
  Textarea,
  StatusBadge,
} from '../../components/ui';
import { approvalsService, vendorService } from '../../services';
import { useAuthContext } from '../../context/AuthContext';
import { useVendorsContext } from '../../context/VendorsContext';
import { useCountryState } from '../../context/CountryStateContext';
import { formatDate } from '../../utils/dateUtils';
import { formatDateDisplay } from '../../utils/effectiveDateUtils';
import {
  ApprovalStatus,
  getApprovalBadgeVariant,
  getApprovalStatusLabel,
  normalizeApprovalStatus,
} from '../../constants/approvalStatus';

function getFileIcon(fileName = '', contentType = '') {
  const name = (fileName || '').toLowerCase();
  const type = (contentType || '').toLowerCase();
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <IconFileText size={20} className="text-danger shrink-0" />;
  }
  return <IconImage size={20} className="text-primary shrink-0" />;
}

export default function VendorApprovalViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { refreshVendors } = useVendorsContext();
  const { getCountryName, getStateName, fetchStatesForCountry } = useCountryState();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { request, vendorDetail }

  // Modal States - Approve
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveComments, setApproveComments] = useState('');
  const [isDocVerified, setIsDocVerified] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Modal States - Reject
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Modal States - Timeline
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineSteps, setTimelineSteps] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Load Request Details
  const loadRequestDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await approvalsService.getApprovalRequest(id);
      if (res) {
        setData(res);
        if (res.vendorDetail?.countryId && fetchStatesForCountry) {
          fetchStatesForCountry(res.vendorDetail.countryId);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch approval request detail:', err);
      toast.error(err?.detail || err?.message || 'Failed to load approval request detail.');
    } finally {
      setLoading(false);
    }
  }, [id, fetchStatesForCountry]);

  useEffect(() => {
    loadRequestDetail();
  }, [loadRequestDetail]);

  const request = data?.request || {};
  const vendorDetail = data?.vendorDetail || {};
  const attachments = Array.isArray(vendorDetail?.attachments) ? vendorDetail.attachments : [];
  const hasDocuments = attachments.length > 0;

  const currentStatus = normalizeApprovalStatus(request.status ?? vendorDetail.approvalStatus);
  const isPending = currentStatus === ApprovalStatus.Pending;

  // RBAC Checks
  const userRole = (user?.role || user?.roleName || user?.roles?.[0]?.name || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const isSuperAdmin = userRole.includes('super');
  const isOwnRequest = user?.id && String(request.initiatedBy) === String(user.id);
  const canDecide = isAdmin && (!isOwnRequest || isSuperAdmin);

  /* ── Confirm Approve ── */
  async function handleConfirmApprove(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setIsSubmittingApprove(true);
      await approvalsService.approveRequest(id, {
        comments: approveComments.trim(),
        // Send true only if documents were present and verified; otherwise send false
        isDocumentVerified: hasDocuments ? Boolean(isDocVerified) : false,
      });

      toast.success('Vendor approved successfully.');
      setIsApproveOpen(false);
      refreshVendors?.();
      loadRequestDetail();
    } catch (err) {
      if (err?.status === 403) {
        toast.error('You are not allowed to approve this request.');
      } else if (err?.status === 409) {
        toast.error('Someone else already decided or cancelled this request.');
        setIsApproveOpen(false);
        loadRequestDetail();
      } else {
        toast.error(err?.detail || err?.message || 'Failed to approve vendor.');
      }
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  /* ── Confirm Reject ── */
  async function handleConfirmReject(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!rejectComments.trim()) {
      toast.error('Rejection reason comments are required.');
      return;
    }

    try {
      setIsSubmittingReject(true);
      await approvalsService.rejectRequest(id, {
        comments: rejectComments.trim(),
      });

      toast.success('Vendor application rejected.');
      setIsRejectOpen(false);
      refreshVendors?.();
      loadRequestDetail();
    } catch (err) {
      if (err?.status === 403) {
        toast.error('You are not allowed to reject this request.');
      } else if (err?.status === 409) {
        toast.error('Someone else already decided or cancelled this request.');
        setIsRejectOpen(false);
        loadRequestDetail();
      } else {
        toast.error(err?.detail || err?.message || 'Failed to reject vendor.');
      }
    } finally {
      setIsSubmittingReject(false);
    }
  }

  /* ── Load Timeline ── */
  async function handleOpenTimeline() {
    setIsTimelineOpen(true);
    setLoadingTimeline(true);
    try {
      const steps = await approvalsService.getRequestTimeline(id);
      setTimelineSteps(Array.isArray(steps) ? steps : []);
    } catch (err) {
      console.warn('Could not load timeline:', err);
      toast.error('Failed to load audit timeline.');
    } finally {
      setLoadingTimeline(false);
    }
  }

  /* ── Download Attachment ── */
  async function handleDownloadAttachment(att) {
    if (!att) return;
    try {
      if (att.id) {
        await vendorService.downloadVendorAttachment(att.id, att.fileName || 'attachment');
      } else if (att.downloadUrl) {
        window.open(att.downloadUrl, '_blank');
      }
    } catch (err) {
      toast.error('Failed to download document.');
    }
  }

  if (loading) {
    return (
      <div className="w-full py-16 px-4 text-center">
        <div className="bg-surface border border-border rounded-2xl p-8 max-w-lg mx-auto space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-xs text-text-muted font-medium">Loading approval request details...</p>
        </div>
      </div>
    );
  }

  if (!data || (!data.request && !data.vendorDetail)) {
    return (
      <div className="w-full py-16 px-4 text-center">
        <div className="bg-surface border border-border rounded-2xl p-8 max-w-lg mx-auto space-y-4">
          <IconError size={40} className="text-warning mx-auto" />
          <h2 className="text-base font-bold text-heading">Approval Request Not Found</h2>
          <p className="text-xs text-text-muted">
            The requested approval record with ID &ldquo;{id}&rdquo; does not exist or has been removed.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/approvals/vendors')}>
            <IconBack size={15} className="mr-1.5" />
            Back to Approvals Queue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Page Header ── */}
      <PageHeader
        title={vendorDetail.vendorName || request.referenceTitle || 'Vendor Application'}
        subtitle={`Request #${id} • ${request.typeName || 'Vendor Registration'} • Submitted by ${request.initiatedByName || 'User'} on ${formatDate(request.initiatedOn)}`}
        icon={<IconVendorApproval className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
              {vendorDetail.vendorCode}
            </span>
            <Badge variant={getApprovalBadgeVariant(currentStatus)}>
              {getApprovalStatusLabel(currentStatus)}
            </Badge>
          </div>
        }
        backButton={{
          onClick: () => navigate('/approvals/vendors'),
          label: 'Approvals Queue',
        }}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeline Action */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOpenTimeline}
              className="text-xs font-semibold h-8 px-3"
            >
              <IconHistory size={14} className="mr-1.5 text-text-muted" />
              Timeline
            </Button>

            {/* Decision Actions (if pending) */}
            {isPending && canDecide && (
              <>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => {
                    setApproveComments('');
                    setIsDocVerified(false);
                    setIsApproveOpen(true);
                  }}
                  className="text-xs font-semibold h-8 px-3.5 shadow-2xs"
                >
                  <IconCheck size={14} className="mr-1.5" />
                  Approve
                </Button>

                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={() => {
                    setRejectComments('');
                    setIsRejectOpen(true);
                  }}
                  className="text-xs font-semibold h-8 px-3.5 shadow-2xs"
                >
                  <IconClose size={14} className="mr-1.5" />
                  Reject
                </Button>
              </>
            )}

            {isPending && isOwnRequest && !isSuperAdmin && (
              <span className="text-2xs text-text-muted italic px-2">
                (You cannot decide your own submission)
              </span>
            )}
          </div>
        }
      />

      {/* ── Decision Status Banner (for finalized decisions) ── */}
      {!isPending && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xs ${
            currentStatus === ApprovalStatus.Approved
              ? 'bg-success/5 border-success/20 text-success'
              : 'bg-danger/5 border-danger/20 text-danger'
          }`}
        >
          {currentStatus === ApprovalStatus.Approved ? (
            <IconSuccess size={20} className="shrink-0 mt-0.5" />
          ) : (
            <IconError size={20} className="shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-heading">
              This request was {getApprovalStatusLabel(currentStatus)} by {request.actionedByName || 'Reviewer'} on {formatDate(request.actionedOn)}
            </p>
            {request.comments && (
              <p className="text-text mt-1 bg-surface/70 p-2.5 rounded-lg border border-border">
                &ldquo;{request.comments}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 2-COLUMN OPTIMIZED LAYOUT: Eliminates blank space on desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (7 cols on lg, 8 cols on xl): Vendor Master Details & Address ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* CARD 1: VENDOR & OPERATIONAL DETAILS */}
          <CollapsibleCard
            title="1. Vendor & Contact Information"
            subtitle="Registration parameters, contact person, tax ID, and notes"
            icon={<IconContact size={17} />}
            defaultOpen={true}
          >
            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <DetailField label="Vendor Name" value={vendorDetail.vendorName} />
                <DetailField label="Vendor Code" value={vendorDetail.vendorCode} mono />
                <DetailField label="Effective Date" value={formatDateDisplay(vendorDetail.effectiveDate)} mono />
                <DetailField label="Contact Person" value={vendorDetail.contactPersonName || '—'} />
                <DetailField label="Phone Number" value={vendorDetail.phoneNo || '—'} mono />
                <DetailField label="Alternate Phone" value={vendorDetail.alternatePhoneNo || '—'} mono />
                <DetailField label="Email Address" value={vendorDetail.email || '—'} />
                <DetailField label="GSTIN / Tax ID" value={vendorDetail.gstNo || '—'} mono />
                {vendorDetail.website && (
                  <DetailField label="Website" value={vendorDetail.website} isLink href={vendorDetail.website} />
                )}
                <DetailField label="Active Status" value={<StatusBadge status={vendorDetail.isActive} size="sm" />} />
              </div>

              {vendorDetail.notes && (
                <div className="pt-3 border-t border-border/60">
                  <span className="view-field-label mf-detail-label block mb-1">Procurement & Audit Notes</span>
                  <div className="text-xs text-heading bg-surface/60 p-3 rounded-lg border border-border/60 whitespace-pre-line leading-relaxed">
                    {vendorDetail.notes}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleCard>

          {/* CARD 2: ADDRESS & LOCATION */}
          <CollapsibleCard
            title="2. Address"
            subtitle="Registered billing and factory operating address"
            icon={<IconLocation size={17} />}
            defaultOpen={true}
          >
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <DetailField label="Country" value={getCountryName(vendorDetail.countryId)} />
                <DetailField label="State" value={getStateName(vendorDetail.countryId, vendorDetail.stateId)} />
                <DetailField label="City" value={vendorDetail.city || '—'} />
                <DetailField label="PIN / Postal Code" value={vendorDetail.zipCode || '—'} mono />
                <div className="sm:col-span-2">
                  <DetailField label="Address Line 1" value={vendorDetail.address1 || '—'} />
                </div>
                {vendorDetail.address2 && (
                  <div className="sm:col-span-2">
                    <DetailField label="Address Line 2" value={vendorDetail.address2} />
                  </div>
                )}
              </div>
            </div>
          </CollapsibleCard>
        </div>

        {/* ── RIGHT COLUMN (5 cols on lg, 4 cols on xl): Request Context & Compliance Documents ── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* CARD A: APPROVAL REQUEST SUMMARY */}
          <Card className="p-4 sm:p-5 space-y-4 shadow-2xs border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <IconVendorApproval size={17} className="text-primary" />
                <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
                  Request Overview
                </h3>
              </div>
              <Badge variant={getApprovalBadgeVariant(currentStatus)}>
                {getApprovalStatusLabel(currentStatus)}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40">
                <span className="text-text-muted">Initiated By</span>
                <span className="font-medium text-heading">{request.initiatedByName || 'User'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-text-muted">Submitted On</span>
                <span className="font-mono text-heading">{formatDate(request.initiatedOn)}</span>
              </div>
              {request.actionedByName && (
                <div className="flex items-center justify-between gap-2 py-1 border-t border-border/40">
                  <span className="text-text-muted">Actioned By</span>
                  <span className="font-medium text-heading">{request.actionedByName}</span>
                </div>
              )}
            </div>

            {/* In-Card Quick Action Buttons for Pending */}
            {isPending && canDecide && (
              <div className="pt-3 border-t border-border/60 flex items-center gap-2">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => {
                    setApproveComments('');
                    setIsDocVerified(false);
                    setIsApproveOpen(true);
                  }}
                  className="flex-1 text-xs font-semibold h-8.5 shadow-2xs justify-center"
                >
                  <IconCheck size={14} className="mr-1" />
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={() => {
                    setRejectComments('');
                    setIsRejectOpen(true);
                  }}
                  className="flex-1 text-xs font-semibold h-8.5 shadow-2xs justify-center"
                >
                  <IconClose size={14} className="mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </Card>

          {/* CARD B: COMPLIANCE DOCUMENTS & ATTACHMENTS */}
          <CollapsibleCard
            title="3. Documents"
            subtitle={`Attached certificates & proofs (${attachments.length})`}
            icon={<IconAttachment size={17} />}
            defaultOpen={true}
            badge={
              hasDocuments ? (
                <span className="font-mono text-2xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {attachments.length}
                </span>
              ) : null
            }
          >
            <div className="p-4 sm:p-5">
              {!hasDocuments ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No compliance documents were uploaded for this vendor.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:border-primary/50 transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="p-1.5 rounded-lg bg-bg border border-border shrink-0">
                          {getFileIcon(att.fileName, att.contentType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                            {att.documentName || att.documentTypeName || att.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-2xs text-text-muted font-mono mt-0.5">
                            <span className="truncate max-w-[120px]">{att.fileName}</span>
                            {att.fileSizeMB && <span>• {att.fileSizeMB} MB</span>}
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(att)}
                        title="Download document"
                        className="h-7 w-7 p-0 text-text-muted hover:text-primary shrink-0"
                      >
                        <IconDownload size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleCard>
        </div>
      </div>

      {/* ── APPROVE MODAL ── */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => !isSubmittingApprove && setIsApproveOpen(false)}
        title="Approve Vendor Application"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleConfirmApprove} className="space-y-4">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-success/5 border border-success/20">
            <div className="w-11 h-11 rounded-xl bg-success/15 border border-success/30 text-success flex items-center justify-center shrink-0">
              <IconSuccess size={22} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                {vendorDetail.vendorName}
              </h3>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                {vendorDetail.vendorCode} • {vendorDetail.city}
              </p>
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Approving sets the status to <strong>Approved (3)</strong> and activates this vendor version for procurement workflows.
          </p>

          {/* Conditional Checkbox: ONLY if vendor has documents */}
          {hasDocuments && (
            <div className="p-3 bg-surface border border-border rounded-xl">
              <label className="flex items-center gap-2.5 text-xs text-heading font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDocVerified}
                  onChange={(e) => setIsDocVerified(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span>Confirm GST, PAN and KYC compliance documents are verified</span>
              </label>
            </div>
          )}

          <Textarea
            id="approve-comments"
            label="Approval Comments / Remarks (Optional)"
            rows={3}
            value={approveComments}
            onChange={(e) => setApproveComments(e.target.value)}
            placeholder="Enter approval remarks or internal audit notes..."
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsApproveOpen(false)}
              disabled={isSubmittingApprove}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmittingApprove}
              className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-white border-transparent"
            >
              <IconCheck size={15} />
              Confirm Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── REJECT MODAL ── */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => !isSubmittingReject && setIsRejectOpen(false)}
        title="Reject Vendor Application"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-danger/5 border border-danger/20">
            <div className="w-11 h-11 rounded-xl bg-danger/15 border border-danger/30 text-danger flex items-center justify-center shrink-0">
              <IconClose size={22} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                {vendorDetail.vendorName}
              </h3>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                {vendorDetail.vendorCode} • {vendorDetail.city}
              </p>
            </div>
          </div>

          <Textarea
            id="reject-comments"
            label="Reason for Rejection (Required)"
            required
            rows={3}
            value={rejectComments}
            onChange={(e) => setRejectComments(e.target.value)}
            placeholder="Explain why this vendor application is being rejected (required for audit log)..."
          />

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/15 text-xs text-text-muted">
            <IconError size={15} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Rejecting sets status to <strong>Rejected (4)</strong>. The vendor creator can edit and resubmit the version for approval.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsRejectOpen(false)}
              disabled={isSubmittingReject}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={!rejectComments.trim() || isSubmittingReject}
              loading={isSubmittingReject}
              className="flex items-center gap-1.5"
            >
              <IconClose size={15} />
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── TIMELINE MODAL ── */}
      <Modal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title={`Audit Timeline: ${vendorDetail.vendorName || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 py-1">
          {loadingTimeline ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : timelineSteps.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-6">No timeline events recorded yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      step.action === 'Approved'
                        ? 'bg-success text-white'
                        : step.action === 'Rejected'
                        ? 'bg-danger text-white'
                        : step.action === 'DocumentsVerified'
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-border text-text-muted'
                    }`}
                  >
                    {step.action === 'Approved' ? (
                      <IconCheck size={12} />
                    ) : step.action === 'Rejected' ? (
                      <IconClose size={12} />
                    ) : step.action === 'DocumentsVerified' ? (
                      <IconShieldCheck size={12} />
                    ) : (
                      <IconClock size={12} />
                    )}
                  </div>
                  <div className="bg-surface border border-border p-3 rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-heading">{step.action}</span>
                      <span className="text-2xs font-mono text-text-muted">{formatDate(step.on)}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Actioned by: <strong className="text-heading">{step.userName || 'System'}</strong>
                    </p>
                    {step.comments && (
                      <p className="text-xs bg-bg p-2 rounded-lg mt-2 text-text border border-border">
                        &ldquo;{step.comments}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setIsTimelineOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
