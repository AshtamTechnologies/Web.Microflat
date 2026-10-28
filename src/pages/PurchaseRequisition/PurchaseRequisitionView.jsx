/**
 * PurchaseRequisitionView.jsx — Full-page read-only view of a Purchase Requisition.
 * Route: /purchase-requisition/:id
 * Fully read-only, professional ERP layout with audit trail and print support.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconAttachment,
  IconBack,
  IconBuilding2,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconDownload,
  IconEdit,
  IconError,
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconPR,
  IconPackage,
  IconSuccess,
  IconUserCheck,
  IconView,
} from '../../constants/icons';

import {
  Button,
  CancelButton,
  Card,
  Badge,
  DetailField,
  TableContainer,
  Th,
  Td,
  Modal,
  PageHeader,
  Textarea,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  formatPRDate,
  formatPRDateTime,
  getPRStatusBadgeVariant,
  getPRPriorityBadgeVariant,
  getProjectName,
} from '../../mocks/purchaseRequisitions';
import { formatDateTime } from '../../utils/dateUtils';
import { formatNumber } from '../../utils/format';

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

  const [mobileItemsMode, setMobileItemsMode] = useState('cards');

  const totalItemQty = useMemo(() => {
    return (pr?.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [pr?.items]);

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
          `Uploaded Date    : ${att.uploadedDate ? formatDateTime(att.uploadedDate) : 'N/A'}`,
          `================================================================`,
          `Exported On      : ${formatDateTime(new Date())}`,
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
            <IconError size={24} />
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
                  <IconCheck size={14} className="" aria-hidden="true" />
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
                  <IconClose size={14} className="" aria-hidden="true" />
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
                <IconEdit size={15} className="mr-1.5" />
                Edit Requisition
              </Button>
            )}
          </div>
        }
      />

      {/* ── 2-Column Responsive Workspace Layout (xl:grid-cols-12) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: Core Details & Line Items (xl:col-span-8) ── */}
        <div className="xl:col-span-8 space-y-6">
          {/* Section 1: PR Information Card */}
          <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <IconFileSpreadsheet size={18} className="text-primary shrink-0" />
                <h2 className="text-base font-bold text-heading">
                  Purchase Requisition Information
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                {pr.prNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <DetailField
                label="PR Number"
                value={pr.prNumber}
                mono
                valueClassName="text-primary font-semibold"
              />
              <DetailField
                label="PR Date"
                value={formatPRDate(pr.prDate)}
                mono
              />
              <DetailField
                label="Project ID"
                value={
                  pr.projectId ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-primary font-semibold">
                        {pr.projectId}
                      </span>
                      <span className="text-text-muted text-xs">
                        ({getProjectName(pr.projectId)})
                      </span>
                    </div>
                  ) : (
                    '—'
                  )
                }
              />
              <DetailField
                label="Requested By"
                value={pr.requestedBy}
              />
              <DetailField
                label="Department"
                value={pr.department}
              />
              <DetailField
                label="Required Date"
                value={formatPRDate(pr.requiredDate)}
                mono
              />
              <DetailField label="Priority">
                <Badge variant={priorityVariant}>
                  {pr.priority || 'Normal'}
                </Badge>
              </DetailField>

              {/* Remarks / Justification across full width */}
              <div className="sm:col-span-2 md:col-span-3 pt-2 border-t border-border/50">
                <span className="view-field-label">Remarks / Justification</span>
                {pr.remarks && pr.remarks.includes('<') ? (
                  <div
                    className="rich-text-content text-text bg-surface/40 p-3.5 rounded-lg border border-border leading-relaxed text-sm overflow-x-auto mt-1"
                    dangerouslySetInnerHTML={{ __html: pr.remarks }}
                  />
                ) : (
                  <p className="view-field-value font-medium text-text mt-1 bg-surface/30 p-2.5 rounded-lg border border-border/60 whitespace-pre-wrap text-xs sm:text-sm">
                    {pr.remarks || 'No remarks provided.'}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Section 2: PR Items Card (Responsive Table + Mobile Cards Toggle) */}
          <Card padding="none" className="overflow-hidden border border-border shadow-xs bg-bg">
            <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-surface/60 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <IconPackage size={18} className="text-primary shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-heading">
                  Requisition Items
                </h2>
                <Badge variant="neutral" className="font-mono text-xs px-2 py-0.5">
                  {pr.items?.length || 0} {pr.items?.length === 1 ? 'Item' : 'Items'}
                </Badge>
                <span className="text-xs text-text-muted hidden md:inline font-mono">
                  Total Qty: <strong className="text-heading">{totalItemQty}</strong>
                </span>
              </div>

              {/* Mobile View Switcher (< sm) */}
              <div className="sm:hidden flex items-center bg-bg border border-border rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMobileItemsMode('cards')}
                  className={`px-2 py-0.5 text-2xs font-medium rounded transition-colors ${
                    mobileItemsMode === 'cards'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-heading'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setMobileItemsMode('table')}
                  className={`px-2 py-0.5 text-2xs font-medium rounded transition-colors ${
                    mobileItemsMode === 'table'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-heading'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Mobile Card List View (< sm when mobileItemsMode === 'cards') */}
            <div className={`${mobileItemsMode === 'cards' ? 'block sm:hidden' : 'hidden'} divide-y divide-border bg-bg`}>
              {!pr.items || pr.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  No items listed for this purchase requisition.
                </div>
              ) : (
                pr.items.map((item, index) => (
                  <div key={item.prItemId || index} className="p-3.5 space-y-2 bg-surface/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-2xs font-mono text-text-muted shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-xs text-heading leading-snug">
                            {item.itemName || '--'}
                          </span>
                          <span className="font-mono text-2xs text-text-muted block mt-0.5">
                            {item.itemCode || '--'}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-heading bg-surface border border-border px-2 py-0.5 rounded-md text-xs shrink-0">
                        {formatNumber(item.quantity)} {item.uom || 'Nos'}
                      </span>
                    </div>

                    {item.specification && item.specification !== '--' && (
                      <div className="text-2xs text-text-muted bg-surface/50 p-2 rounded-lg border border-border/60">
                        <span className="font-semibold text-text-muted block text-3xs uppercase tracking-wider mb-0.5">Specification</span>
                        <span>{item.specification}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Standard Desktop / Tablet Table View */}
            <div className={`${mobileItemsMode === 'cards' ? 'hidden sm:block' : 'block'} overflow-x-auto`}>
              <TableContainer variant="plain">
                <thead>
                  <tr className="bg-surface/80 border-b border-border text-xs">
                    <Th className="w-[50px] text-center">#</Th>
                    <Th className="w-[150px]">Item Code</Th>
                    <Th className="w-[200px]">Item Name</Th>
                    <Th className="min-w-[180px]">Specification</Th>
                    <Th className="w-[110px] text-right">Quantity</Th>
                    <Th className="w-[90px]">UOM</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg">
                  {!pr.items || pr.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-text-muted italic">
                        No items listed for this purchase requisition.
                      </td>
                    </tr>
                  ) : (
                    pr.items.map((item, index) => (
                      <tr
                        key={item.prItemId || index}
                        className="hover:bg-surface/50 transition-colors"
                      >
                        <Td className="text-center font-semibold text-text-muted text-xs py-2.5">
                          {index + 1}
                        </Td>
                        <Td className="font-medium text-text py-2.5">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border">
                            {item.itemCode || '--'}
                          </span>
                        </Td>
                        <Td className="font-semibold text-heading text-xs py-2.5">
                          {item.itemName || '--'}
                        </Td>
                        <Td className="text-text-muted text-xs py-2.5">
                          {item.specification || '--'}
                        </Td>
                        <Td className="text-right font-bold text-heading font-mono tabular-nums text-xs py-2.5">
                          {formatNumber(item.quantity)}
                        </Td>
                        <Td className="text-text-muted text-xs py-2.5">
                          {item.uom || 'Nos'}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </TableContainer>
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN: Workflow Status, Attachments & Audit (xl:col-span-4) ── */}
        <div className="xl:col-span-4 space-y-6">
          {/* Card 3: Requisition Lifecycle & Quick Actions */}
          <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <IconUserCheck size={17} className="text-primary shrink-0" />
                <h3 className="text-sm font-bold text-heading">Lifecycle & Status</h3>
              </div>
              <Badge variant={statusVariant} className="px-2 py-0.5 text-xs font-semibold">
                {pr.status}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface/60 border border-border flex items-center justify-between">
                <div>
                  <span className="view-field-label">Department</span>
                  <p className="text-xs font-bold text-heading mt-0.5">{pr.department || 'General'}</p>
                </div>
                <div className="text-right">
                  <span className="view-field-label">Priority</span>
                  <Badge variant={priorityVariant} className="mt-0.5 text-2xs">
                    {pr.priority || 'Normal'}
                  </Badge>
                </div>
              </div>

              {/* Fast Executive Approval Actions if pending & from approvals */}
              {isFromApproval && (pr.status || '').toLowerCase().includes('pending') && (
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block">
                    Action Required
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={handleOpenApprove}
                      className="w-full text-xs font-semibold justify-center shadow-2xs h-8"
                    >
                      <IconCheck size={14} className="mr-1" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="danger-soft"
                      size="sm"
                      onClick={handleOpenReject}
                      className="w-full text-xs font-semibold justify-center shadow-2xs h-8"
                    >
                      <IconClose size={14} className="mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {!isReadOnly && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/purchase-requisition/${pr.prNumber || pr.prId}/edit`)
                  }
                  className="w-full text-xs font-semibold justify-center mt-1"
                >
                  <IconEdit size={14} className="mr-1.5" />
                  Edit Requisition
                </Button>
              )}
            </div>
          </Card>

          {/* Card 4: Document Attachments */}
          <Card padding="md" className="space-y-3.5 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <IconAttachment size={17} className="text-primary shrink-0" />
                <h3 className="text-sm font-bold text-heading">
                  Attachments
                </h3>
              </div>
              <Badge variant="neutral" className="text-2xs font-mono px-2 py-0.5">
                {pr.attachments?.length || 0}
              </Badge>
            </div>

            {Array.isArray(pr.attachments) && pr.attachments.length > 0 ? (
              <div className="space-y-2">
                {pr.attachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="p-2.5 rounded-xl border border-border bg-surface/40 hover:bg-surface/70 transition-colors flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <IconFileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-heading truncate text-xs" title={att.fileName}>
                          {att.fileName}
                        </p>
                        <p className="text-3xs text-text-muted font-mono mt-0.5">
                          {att.fileSizeKB ? `${att.fileSizeKB} KB` : '150 KB'}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDownloadAttachment(att)}
                      className="h-7 w-7 p-0 text-text-muted hover:text-primary shrink-0"
                      title="Download"
                    >
                      <IconDownload size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-text-muted italic bg-surface/30 rounded-xl border border-dashed border-border/70">
                No attachments uploaded.
              </div>
            )}
          </Card>

          {/* Card 5: Audit Information Card */}
          <Card padding="md" className="space-y-3 shadow-xs border-border bg-bg">
            <div className="flex items-center gap-2 pb-2.5 border-b border-border">
              <IconClock size={16} className="text-text-muted shrink-0" />
              <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
                Audit Information
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
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
        </div>
      </div>

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
              <IconSuccess size={18} className="text-success shrink-0 mt-0.5" aria-hidden="true" />
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
            <Textarea
                id="view-pr-approval-remarks"
                name="view-pr-approval-remarks"
                label="Approval Remarks / Comments (Optional)"
                rows={3}
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                placeholder="Enter approval remarks or authorization notes..."
              />

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <CancelButton
                size="md"
                onClick={handleCloseApprove}
                disabled={isSubmittingApprove}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={IconCheck}
                disabled={isSubmittingApprove}
                loading={isSubmittingApprove}
                className="bg-success hover:bg-success/90 text-white border-transparent"
              >
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
              <IconError size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
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
            <Textarea
                id="view-rejection-reason"
                name="view-rejection-reason"
                label="Reason for Rejection"
                required
                rows={3}
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Explain clearly why this purchase requisition is rejected..."
              />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <CancelButton
                size="md"
                onClick={handleCloseReject}
                disabled={isSubmittingReject}
              />
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={isSubmittingReject || !rejectComments.trim()}
                loading={isSubmittingReject}
              >
                <IconClose size={14} className="mr-1.5" />
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
