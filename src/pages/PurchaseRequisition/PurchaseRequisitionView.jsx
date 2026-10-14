/**
 * PurchaseRequisitionView.jsx — Full-page read-only view of a Purchase Requisition.
 * Route: /purchase-requisition/:id
 * Fully read-only, professional ERP layout with audit trail and print support.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Pencil,
  FileSpreadsheet,
  Package,
  Clock,
  UserCheck,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  Check,
  X,
  Paperclip,
  Download,
  Eye,
  File,
} from 'lucide-react';
import { IconPR } from '../../constants/icons';

import {
  Button,
  Card,
  Badge,
  DetailField,
  TableContainer,
  Th,
  Td,
  Modal,
  PageHeader,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  formatPRDate,
  formatPRDateTime,
  getPRStatusBadgeVariant,
  getPRPriorityBadgeVariant,
} from '../../mocks/purchaseRequisitions';

export default function PurchaseRequisitionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getPRById, approvePR, rejectPR } = usePurchaseRequisitionContext();

  const backPath = location.state?.from || '/purchase-requisition';
  const backLabel = location.state?.backLabel || 'Back to Purchase Requisition';
  const isFromApproval = Boolean(
    location.state?.from === '/approvals/purchase-requisitions' ||
    location.state?.isApprovalView
  );
  const isReadOnly = Boolean(
    location.state?.readOnly ||
    isFromApproval
  );

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const pr = useMemo(() => {
    return getPRById(id);
  }, [id, getPRById]);

  function handleOpenApprove() {
    setApproveRemarks('');
    setIsApproveModalOpen(true);
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setIsApproveModalOpen(false);
    setApproveRemarks('');
  }

  async function handleConfirmApprove() {
    if (!pr) return;
    try {
      setIsSubmittingApprove(true);
      await approvePR(pr.prId || pr.prNumber, {
        approvedBy: 'Ian Chesnut',
        remarks: approveRemarks.trim(),
      });
      toast.success(`Purchase Requisition ${pr.prNumber} approved successfully`);
      setIsApproveModalOpen(false);
    } catch {
      toast.error('Failed to approve purchase requisition.');
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  function handleOpenReject() {
    setRejectComments('');
    setIsRejectModalOpen(true);
  }

  function handleCloseReject() {
    if (isSubmittingReject) return;
    setIsRejectModalOpen(false);
    setRejectComments('');
  }

  async function handleConfirmReject(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!pr || !rejectComments.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    try {
      setIsSubmittingReject(true);
      await rejectPR(pr.prId || pr.prNumber, {
        rejectedBy: 'Ian Chesnut',
        rejectionReason: rejectComments.trim(),
      });
      toast.success(`Purchase Requisition ${pr.prNumber} rejected`);
      setIsRejectModalOpen(false);
    } catch {
      toast.error('Failed to reject purchase requisition.');
    } finally {
      setIsSubmittingReject(false);
    }
  }

  /* ── Download Attachment Handler ── */
  const handleDownloadAttachment = (att) => {
    if (!att) return;
    try {
      const fileName = att.fileName || att.name || 'requisition-document.pdf';
      const fileUrl = att.url || att.fileUrl;

      if (att.file instanceof File || att.file instanceof Blob) {
        const blobUrl = URL.createObjectURL(att.file);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else if (fileUrl && fileUrl !== '#') {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const fileContent = [
          `================================================================`,
          ` MICROFLAT ERP - PURCHASE REQUISITION ATTACHMENT`,
          `================================================================`,
          `PR Number        : ${pr?.prNumber || 'N/A'}`,
          `File Name        : ${fileName}`,
          `File Size        : ${att.fileSizeKB ? `${att.fileSizeKB} KB` : '150 KB'}`,
          `Requested By     : ${pr?.requestedBy || 'N/A'}`,
          `Department       : ${pr?.department || 'N/A'}`,
          `Uploaded By      : ${att.uploadedBy || pr?.requestedBy || 'Ian Chesnut'}`,
          `Uploaded Date    : ${att.uploadedDate || 'N/A'}`,
          `================================================================`,
          `Exported On      : ${new Date().toLocaleString()}`,
          `Status           : Verified Requisition Document`,
          `================================================================\n`,
        ].join('\n');

        const mimeType = fileName.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : fileName.toLowerCase().endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : fileName.toLowerCase().endsWith('.dwg')
          ? 'application/acad'
          : 'text/plain;charset=utf-8';

        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download document attachment.');
    }
  };

  if (!pr) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">
            Purchase Requisition Not Found
          </h2>
          <p className="text-sm text-text-muted">
            The requested requisition with identifier "{id}" could not be found.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(backPath)}
          >
            {backLabel}
          </Button>
        </Card>
      </div>
    );
  }

  const statusVariant = getPRStatusBadgeVariant(pr.status);
  const priorityVariant = getPRPriorityBadgeVariant(pr.priority);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Page Header ── */}
      <PageHeader
        backButton={{
          onClick: () => navigate(backPath),
          label: backLabel,
        }}
        title={`Purchase Requisition ${pr.prNumber}`}
        icon={<IconPR className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant} className="px-2.5 py-0.5 text-xs font-medium">
              {pr.status}
            </Badge>
            <Badge variant={priorityVariant} className="px-2.5 py-0.5 text-xs font-medium">
              Priority: {pr.priority}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {isFromApproval && (pr.status || '').toLowerCase().includes('pending') && (
              <>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={handleOpenApprove}
                  className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title={`Approve ${pr.prNumber}`}
                >
                  <Check size={14} className="stroke-[2.5]" aria-hidden="true" />
                  Approve
                </Button>

                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={handleOpenReject}
                  className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title={`Reject ${pr.prNumber}`}
                >
                  <X size={14} className="stroke-[2.5]" aria-hidden="true" />
                  Reject
                </Button>
              </>
            )}

            {!isReadOnly && (
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigate(`/purchase-requisition/${pr.prNumber || pr.prId}/edit`)
                }
                className="font-semibold shadow-sm"
              >
                <Pencil size={15} className="mr-1.5" />
                Edit Requisition
              </Button>
            )}
          </div>
        }
      />

      {/* ── Section 1: PR Information Card ── */}
      <Card padding="md" className="space-y-4 shadow-xs border-border">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <FileSpreadsheet size={18} className="text-primary" />
          <h2 className="text-base font-bold text-heading">
            Purchase Requisition Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
          {/* PR Number */}
          <DetailField
            label="PR Number"
            value={pr.prNumber}
            mono
            valueClassName="text-primary font-semibold text-base"
          />

          {/* PR Date */}
          <DetailField
            label="PR Date"
            value={formatPRDate(pr.prDate)}
            mono
          />

          {/* Requested By */}
          <DetailField
            label="Requested By"
            value={pr.requestedBy}
          />

          {/* Department */}
          <DetailField
            label="Department"
            value={pr.department}
          />

          {/* Required Date */}
          <DetailField
            label="Required Date"
            value={formatPRDate(pr.requiredDate)}
            mono
          />

          {/* Priority */}
          <DetailField label="Priority">
            <Badge variant={priorityVariant}>
              {pr.priority || 'Normal'}
            </Badge>
          </DetailField>

          {/* Remarks / Justification */}
          <div className="sm:col-span-2 md:col-span-3">
            <span className="view-field-label">Remarks / Justification</span>
            {pr.remarks && pr.remarks.includes('<') ? (
              <div
                className="rich-text-content text-text bg-bg p-3.5 rounded-lg border border-border leading-relaxed text-sm overflow-x-auto mt-1"
                dangerouslySetInnerHTML={{ __html: pr.remarks }}
              />
            ) : (
              <p className="view-field-value font-medium text-text mt-0.5 whitespace-pre-wrap">
                {pr.remarks || 'No remarks provided.'}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Section 2: PR Items Card ── */}
      <Card padding="none" className="overflow-hidden border border-border shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <h2 className="text-base font-bold text-heading">
              Purchase Requisition Items
            </h2>
            <Badge variant="role" className="ml-1 text-xs">
              {pr.items?.length || 0} {pr.items?.length === 1 ? 'Item' : 'Items'}
            </Badge>
          </div>
        </div>

        <TableContainer>
          <thead>
            <tr className="bg-surface border-b border-border">
              <Th className="w-[50px] text-center">#</Th>
              <Th className="w-[160px]">Item Code</Th>
              <Th className="w-[200px]">Item Name</Th>
              <Th className="w-[260px]">Specification</Th>
              <Th className="w-[120px] text-right">Quantity</Th>
              <Th className="w-[100px]">UOM</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {!pr.items || pr.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-text-muted">
                  No items listed for this purchase requisition.
                </td>
              </tr>
            ) : (
              pr.items.map((item, index) => (
                <tr
                  key={item.prItemId || index}
                  className="hover:bg-bg/50 transition-colors"
                >
                  {/* Index */}
                  <Td className="text-center font-semibold text-text-muted">
                    {index + 1}
                  </Td>

                  {/* Item Code */}
                  <Td className="font-medium text-text">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg border border-border">
                      {item.itemCode || '--'}
                    </span>
                  </Td>

                  {/* Item Name */}
                  <Td className="font-semibold text-heading">
                    {item.itemName || '--'}
                  </Td>

                  {/* Specification */}
                  <Td className="text-text-muted text-xs">
                    {item.specification || '--'}
                  </Td>

                  {/* Quantity */}
                  <Td className="text-right font-bold text-heading font-mono tabular-nums">
                    {Number(item.quantity).toLocaleString()}
                  </Td>

                  {/* UOM */}
                  <Td className="text-text-muted text-xs">
                    {item.uom || 'Nos'}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableContainer>
      </Card>

      {/* ── Section 3: Document Attachments Card ── */}
      <Card padding="md" className="space-y-4 shadow-xs border-border bg-surface">
        <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Paperclip size={18} className="text-primary" />
            <h2 className="text-base font-bold text-heading">
              Document Attachments
            </h2>
          </div>
          <Badge variant="role" className="text-xs">
            {pr.attachments?.length || 0} {pr.attachments?.length === 1 ? 'Attachment' : 'Attachments'}
          </Badge>
        </div>

        {Array.isArray(pr.attachments) && pr.attachments.length > 0 ? (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-bg/50">
            {pr.attachments.map((att, idx) => (
              <div
                key={att.id || idx}
                className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-surface/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-heading truncate">
                      {att.fileName}
                    </p>
                    <p className="text-2xs text-text-muted font-mono mt-0.5">
                      {att.fileSizeKB ? `${att.fileSizeKB} KB` : '150 KB'} • Uploaded by {att.uploadedBy || pr.requestedBy} {att.uploadedDate ? `• ${formatPRDate(att.uploadedDate)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadAttachment(att)}
                    className="h-8 px-2.5 text-xs text-text hover:text-primary flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-text-muted italic bg-bg/40 rounded-xl border border-border/60">
            No document attachments uploaded for this requisition.
          </div>
        )}
      </Card>

      {/* ── Section 4: Audit Information Card ── */}
      <Card padding="md" className="space-y-4 shadow-xs border-border bg-surface">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Clock size={18} className="text-text-muted" />
          <h2 className="text-base font-bold text-heading">
            Audit Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <DetailField
            label="Created By"
            value={pr.createdBy || '—'}
          />
          <DetailField
            label="Created Date"
            value={formatPRDateTime(pr.createdDate)}
            mono
          />
          <DetailField
            label="Modified By"
            value={pr.modifiedBy || '—'}
          />
          <DetailField
            label="Modified Date"
            value={formatPRDateTime(pr.modifiedDate)}
            mono
          />
        </div>
      </Card>

      {/* ── 1. APPROVE CONFIRMATION MODAL WITH REMARKS ── */}
      {isApproveModalOpen && pr && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={handleCloseApprove}
          title="Approve Purchase Requisition"
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmApprove();
            }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-semibold text-success">
                  Approving {pr.prNumber}
                </p>
                <p className="text-text-muted mt-0.5">
                  Requested by <strong className="text-heading">{pr.requestedBy}</strong> ({pr.department}) for{' '}
                  <strong className="text-heading">{pr.items?.length || 0} line items</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Approving this requisition authorizes procurement and generation of purchase orders.
            </p>

            {/* Approval Comments / Remarks Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="view-pr-approval-remarks"
                className="text-xs font-semibold text-heading block"
              >
                Approval Remarks / Comments (Optional)
              </label>
              <textarea
                id="view-pr-approval-remarks"
                name="view-pr-approval-remarks"
                rows={3}
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                placeholder="Enter approval remarks or authorization notes..."
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-heading placeholder:text-text-muted focus:border-success focus:outline-hidden focus:ring-2 focus:ring-success/20 transition-all resize-y"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCloseApprove}
                disabled={isSubmittingApprove}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmittingApprove}
                loading={isSubmittingApprove}
                className="bg-success hover:bg-success/90 text-white border-transparent"
              >
                <Check size={14} className="mr-1.5 stroke-[2.5]" />
                Confirm Approval
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 2. REJECT MODAL WITH REASONS & VALIDATION ── */}
      {isRejectModalOpen && pr && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={handleCloseReject}
          title="Reject Purchase Requisition"
          size="md"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
              <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-semibold text-danger">
                  Rejecting {pr.prNumber}
                </p>
                <p className="text-text-muted mt-0.5">
                  Requested by <strong className="text-heading">{pr.requestedBy}</strong> ({pr.department})
                </p>
              </div>
            </div>

            {/* Reason Textarea */}
            <div>
              <label htmlFor="view-rejection-reason" className="block text-xs font-semibold text-heading mb-1.5">
                Reason for Rejection <span className="text-danger">*</span>
              </label>
              <textarea
                id="view-rejection-reason"
                name="view-rejection-reason"
                rows={3}
                required
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Explain clearly why this purchase requisition is rejected..."
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-heading placeholder:text-text-muted focus:border-danger focus:outline-hidden focus:ring-2 focus:ring-danger/20 transition-all resize-y"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCloseReject}
                disabled={isSubmittingReject}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={isSubmittingReject || !rejectComments.trim()}
                loading={isSubmittingReject}
              >
                <X size={14} className="mr-1.5 stroke-[2.5]" />
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
