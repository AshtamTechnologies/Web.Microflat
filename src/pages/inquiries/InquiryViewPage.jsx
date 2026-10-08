/**
 * InquiryViewPage.jsx — Full-page read-only view for an Inquiry record.
 *
 * Route: /inquiries/:id
 */

import { useState, useMemo, Fragment } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Pencil,
  UserPlus,
  UserCheck,
  RefreshCw,
  Inbox,
  FileText,
  User,
  Tags,
  Clock,
  Building2,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Activity as ActivityIcon,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  UploadCloud,
  Download,
  ChevronDown,
  ChevronRight,
  Plus,
  FileCode,
  Layers,
  File,
  Send,
  MessageSquare,
  Eye,
  ShieldCheck,
  FileCheck,
  MapPin,
  Package,
} from 'lucide-react';

import {
  Button,
  Badge,
  Card,
  ErrorBanner,
  TableContainer,
  Th,
  Td,
  Modal,
} from '../../components/ui';
import ActivityTimeline from '../../components/ActivityTimeline';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';
import { useProductCategoriesContext } from '../../context/ProductCategoriesContext';
import { getCategoryPathName } from '../../utils/categoryTree';
import {
  getRegionName,
  getStatusOption,
  getPriorityBadgeVariant,
  formatCurrencyINR,
} from '../../mocks/inquiries';
import { formatFileSizeKB } from '../../mocks/inquiryDocuments';
import AssignInquiryModal from './components/AssignInquiryModal';
import ChangeStatusModal from './components/ChangeStatusModal';
import UploadDocumentModal from './components/UploadDocumentModal';

export default function InquiryViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { getInquiryById, addInquiryComment } = useInquiriesContext();
  const { allUsers = [], users = [] } = useUsersContext();
  const { getDocumentsByInquiryId, getMissingMandatoryDocumentTypes } = useInquiryDocumentsContext();
  const { documentTypes = [], getDocumentTypeById } = useDocumentTypesContext();
  const { categories = [] } = useProductCategoriesContext();

  const userList = allUsers.length > 0 ? allUsers : users;

  const inquiry = useMemo(() => {
    return getInquiryById(id);
  }, [id, getInquiryById]);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalMode, setUploadModalMode] = useState('add');
  const [selectedDocForVersion, setSelectedDocForVersion] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Accordion state for document version history
  const [expandedDocIds, setExpandedDocIds] = useState(new Set());

  // Documents attached to this inquiry
  const inquiryDocuments = useMemo(() => {
    return inquiry ? getDocumentsByInquiryId(inquiry.id || inquiry.InquiryId) : [];
  }, [inquiry, getDocumentsByInquiryId]);

  // Missing mandatory document types computed dynamically against configuration
  const missingMandatoryTypes = useMemo(() => {
    return inquiry
      ? getMissingMandatoryDocumentTypes(inquiry.id || inquiry.InquiryId, documentTypes)
      : [];
  }, [inquiry, getMissingMandatoryDocumentTypes, documentTypes]);

  // Helper to resolve user name
  const resolveUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const found = userList.find((u) => u.id === userId);
    return found ? `${found.firstName} ${found.lastName}` : 'Unassigned';
  };

  const toggleDocExpanded = (docId) => {
    setExpandedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const result = addInquiryComment(inquiry.id || inquiry.InquiryId, trimmed);
      if (result?.ok) {
        setCommentText('');
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDownloadAttachment = (item) => {
    if (!item) return;

    try {
      const fileName = item.fileName || 'attachment.pdf';
      const fileUrl = item.fileUrl;

      if (fileUrl) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const fileContent = [
          `================================================================`,
          ` MICROFLAT ERP - ATTACHMENT EXPORT`,
          `================================================================`,
          `Document Title   : ${item.documentTitle || item.fileName}`,
          `File Name        : ${fileName}`,
          `Revision         : v${item.versionNo || 1} ${item.isCurrent ? '(Current Active)' : '(Archived)'}`,
          `Document Type    : ${getDocumentTypeById(item.documentTypeId)?.typeName || 'Attachment'}`,
          `File Size        : ${formatFileSizeKB(item.fileSizeKB || 1024)}`,
          `Inquiry No       : ${inquiry.InquiryNo}`,
          `Requirement      : ${inquiry.Subject || 'N/A'}`,
          `Customer         : ${inquiry.CustomerName}`,
          `Uploaded By      : ${item.uploadedBy || 'Ian Chesnut'}`,
          `Uploaded Date    : ${item.uploadedOn || 'N/A'}`,
          `Revision Remarks : ${item.changeRemarks || 'N/A'}`,
          `================================================================`,
          `Exported On      : ${new Date().toLocaleString()}`,
          `Status           : Verified ERP Record Attachment`,
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

  const renderFileExtIcon = (ext = '') => {
    const lower = ext.toLowerCase();
    if (lower === '.pdf') return <FileText size={15} className="text-danger shrink-0" />;
    if (lower === '.docx' || lower === '.doc') return <FileText size={15} className="text-primary shrink-0" />;
    if (lower === '.dwg' || lower === '.dxf') return <Layers size={15} className="text-blue-500 shrink-0" />;
    return <File size={15} className="text-text-muted shrink-0" />;
  };

  if (!inquiry) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Inquiry Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested inquiry record with ID "{id}" does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/inquiries')}>
            Return to Inquiries
          </Button>
        </Card>
      </div>
    );
  }

  const isAssigned = Boolean(inquiry.AssignedTo);
  const assigneeName = resolveUserName(inquiry.AssignedTo);
  const statusInfo = getStatusOption(inquiry.StatusId);

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <button
            type="button"
            onClick={() => navigate('/inquiries')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer mb-3"
          >
            <ArrowLeft
              size={14}
              className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform duration-150"
              aria-hidden="true"
            />
            <span>Back to Inquiries</span>
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-heading tracking-tight font-mono">
              {inquiry.InquiryNo}
            </h1>

            {/* Badges */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border ${statusInfo.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.name}
              </span>

              <Badge
                variant={getPriorityBadgeVariant(inquiry.Priority)}
                className="text-xs px-2 py-0.5"
              >
                {inquiry.Priority} Priority
              </Badge>
            </div>
          </div>

          <p className="text-sm font-medium text-text-muted mt-1 max-w-2xl">
            {inquiry.Subject}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Change Status Button */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setIsStatusModalOpen(true)}
            className="text-xs"
          >
            <RefreshCw size={14} className="mr-1.5" />
            Change Status
          </Button>

          {/* Assign / Reassign Button */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setIsAssignModalOpen(true)}
            className="text-xs"
          >
            {isAssigned ? (
              <>
                <UserCheck size={14} className="mr-1.5 text-primary" />
                Reassign
              </>
            ) : (
              <>
                <UserPlus size={14} className="mr-1.5" />
                Assign
              </>
            )}
          </Button>

          {/* Edit Button */}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => navigate(`/inquiries/${inquiry.id || inquiry.InquiryId}/edit`)}
            className="text-xs"
          >
            <Pencil size={14} className="mr-1.5" />
            Edit Inquiry
          </Button>
        </div>
      </div>

      {/* ── Grid of Detail Sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Inquiry Details Card */}
        <Card padding="md" className="bg-bg">
          <div className="border-b border-border pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <FileText size={17} className="text-primary" />
              <span>1. Inquiry Master Details</span>
            </div>
            <span className="font-mono text-xs text-text-muted">
              {inquiry.InquiryNo}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-text-muted block mb-0.5">Inquiry Date</span>
              <span className="font-mono tabular-nums font-medium text-heading text-sm">
                {inquiry.InquiryDate}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Estimate Date</span>
              <span className="font-mono tabular-nums font-medium text-heading text-sm flex items-center gap-1.5">
                <Calendar size={14} className="text-text-muted" />
                {inquiry.RequiredByDate || inquiry.EstimateDate || 'Not specified'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Sales Region</span>
              <span className="font-medium text-heading text-sm">
                {getRegionName(inquiry.RegionId)}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Source Channel</span>
              <span className="font-medium text-heading text-sm">
                {inquiry.Source || 'Website'}
                {inquiry.Source === 'Distributor' && inquiry.DistributorName ? (
                  <span className="text-text-muted font-normal text-xs block">
                    Distributor: <strong className="text-heading font-medium">{inquiry.DistributorName}</strong>
                  </span>
                ) : null}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-text-muted block mb-0.5">Requirement Subject</span>
              <p className="font-semibold text-heading text-sm">
                {inquiry.Subject}
              </p>
            </div>

            {inquiry.Description && (
              <div className="sm:col-span-2 pt-2 border-t border-border/60">
                <span className="text-text-muted block mb-1">Specifications & Notes</span>
                {inquiry.Description.includes('<') ? (
                  <div
                    className="rich-text-content text-text bg-surface/40 p-3.5 rounded-lg border border-border leading-relaxed text-sm overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: inquiry.Description }}
                  />
                ) : (
                  <p className="text-text bg-surface/40 p-3 rounded-lg border border-border leading-relaxed whitespace-pre-line text-sm">
                    {inquiry.Description}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* 2. Customer Information Card */}
        <Card padding="md" className="bg-bg">
          <div className="border-b border-border pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <Building2 size={17} className="text-primary" />
              <span>2. Customer Information</span>
            </div>
            <span className="text-xs text-text-muted">Client Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <span className="text-text-muted block mb-0.5">Company / Customer Name</span>
              <span className="font-bold text-heading text-sm">
                {inquiry.CustomerName}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Contact Person</span>
              <span className="font-medium text-heading text-sm flex items-center gap-1.5">
                <User size={14} className="text-text-muted" />
                {inquiry.ContactPerson || '—'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Email Address</span>
              {inquiry.Email ? (
                <a
                  href={`mailto:${inquiry.Email}`}
                  className="font-medium text-primary hover:underline text-sm flex items-center gap-1.5 truncate"
                >
                  <Mail size={14} className="shrink-0 text-primary/80" />
                  {inquiry.Email}
                </a>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Phone / Contact No</span>
              {inquiry.Phone ? (
                <span className="font-mono tabular-nums font-medium text-heading text-sm flex items-center gap-1.5">
                  <Phone size={14} className="text-text-muted" />
                  {inquiry.Phone}
                </span>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>

            {inquiry.AlternativePhone ? (
              <div>
                <span className="text-text-muted block mb-0.5">Alternative Phone</span>
                <span className="font-mono tabular-nums font-medium text-heading text-sm flex items-center gap-1.5">
                  <Phone size={14} className="text-text-muted" />
                  {inquiry.AlternativePhone}
                </span>
              </div>
            ) : null}

            <div>
              <span className="text-text-muted block mb-0.5">Sales Territory</span>
              <span className="font-medium text-heading text-sm">
                {getRegionName(inquiry.RegionId)}
              </span>
            </div>

            {(inquiry.AddressLine1 || inquiry.AddressLine2 || inquiry.City || inquiry.State || inquiry.Country) && (
              <div className="sm:col-span-2 pt-2 border-t border-border/60">
                <span className="text-text-muted block mb-1">Customer Address</span>
                <div className="flex items-start gap-1.5 text-heading text-xs">
                  <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                  <span>
                    {[
                      inquiry.AddressLine1,
                      inquiry.AddressLine2,
                      inquiry.City,
                      inquiry.State,
                      inquiry.Country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 3. Product Selection Card (Full Width) */}
        <Card padding="md" className="lg:col-span-2 bg-bg space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <Package size={17} className="text-primary" />
              <span>3. Product Selection</span>
            </div>
            <span className="text-xs text-text-muted">Scope & Line Items</span>
          </div>

          {/* Line Items Table if multiple items exist */}
          {Array.isArray(inquiry.items) && inquiry.items.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden bg-surface/40">
              <div className="px-4 py-2.5 bg-surface border-b border-border flex items-center justify-between text-xs font-semibold text-heading">
                <span>Inquiry Items ({inquiry.items.length})</span>
                <span className="font-mono text-text-muted text-xs">
                  Total Qty: <strong className="text-heading">{inquiry.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}</strong>
                </span>
              </div>
              <TableContainer>
                <thead>
                  <tr>
                    <Th className="w-12 text-center text-xs py-2.5">#</Th>
                    <Th className="text-xs py-2.5">PRODUCT CATEGORY</Th>
                    <Th className="text-xs py-2.5">ITEM CODE</Th>
                    <Th className="text-xs py-2.5">SPECIFICATION</Th>
                    <Th className="text-right text-xs py-2.5">QTY</Th>
                    <Th className="text-xs py-2.5">UOM</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {inquiry.items.map((item, idx) => (
                    <tr key={item.prItemId || item.id || idx} className="hover:bg-surface/60 transition-colors">
                      <Td className="text-center font-mono text-text-muted py-2.5">{idx + 1}</Td>
                      <Td className="font-medium text-heading text-xs py-2.5">
                        {item.categoryName || getCategoryPathName(item.categoryId || inquiry.CategoryId, categories) || '—'}
                      </Td>
                      <Td className="py-2.5">
                        <span className="font-mono font-semibold text-heading bg-surface border border-border px-2 py-0.5 rounded-md text-xs">
                          {item.itemCode || '—'}
                        </span>
                      </Td>
                      <Td className="text-text-muted py-2.5">{item.specification || '—'}</Td>
                      <Td className="text-right font-mono font-bold text-heading text-xs py-2.5">{item.quantity}</Td>
                      <Td className="text-text-muted font-mono text-xs py-2.5">{item.uom}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableContainer>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-text-muted block mb-0.5">Product Category</span>
                <span className="font-medium text-heading text-sm block">
                  {getCategoryPathName(inquiry.CategoryId, categories)}
                </span>
              </div>
              <div>
                <span className="text-text-muted block mb-0.5">Quantity & UOM</span>
                <span className="font-mono tabular-nums font-bold text-heading text-sm">
                  {inquiry.Quantity || '1'} {inquiry.UOM || 'PCS'}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* 4. Assignment & Audit Card (Full Width) */}
        <Card padding="md" className="lg:col-span-2 bg-bg">
          <div className="border-b border-border pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <UserCheck size={17} className="text-primary" />
              <span>4. Assignment & Audit History</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              {isAssigned ? 'Reassign' : 'Assign User'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2 p-3 bg-surface rounded-xl border border-border flex items-center justify-between">
              <div>
                <span className="text-text-muted block text-[11px]">Current Assignee</span>
                <span className="text-sm font-bold text-heading">
                  {assigneeName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-xs text-primary hover:bg-primary/10"
              >
                {isAssigned ? 'Change' : 'Assign'}
              </Button>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Created By</span>
              <span className="font-medium text-heading text-sm">
                {inquiry.CreatedBy || 'Ian Chesnut'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Created On</span>
              <span className="font-mono tabular-nums text-text-muted text-xs">
                {inquiry.CreatedOn || '—'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Last Modified By</span>
              <span className="font-medium text-heading text-sm">
                {inquiry.ModifiedBy || 'Ian Chesnut'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Last Modified On</span>
              <span className="font-mono tabular-nums text-text-muted text-xs">
                {inquiry.ModifiedOn || '—'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── SECTION 5: ACTIVITY TIMELINE HISTORY & COMMENTS ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ActivityIcon size={18} className="text-primary" />
            <h3 className="text-heading font-semibold text-base">Activity & Audit Trail</h3>
            <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
              {(inquiry.activity || []).length}
            </Badge>
          </div>
          <span className="text-xs text-text-muted">
            Chronological history of status shifts, reassignments, comments & remarks
          </span>
        </div>

        {/* ── Add Comment Section ── */}
        <div className="mb-6 p-4 rounded-xl bg-surface/50 border border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="inquiry-comment-input"
              className="text-xs font-semibold text-heading flex items-center gap-1.5"
            >
              <MessageSquare size={14} className="text-primary" />
              <span>Add Comment / Internal Note</span>
            </label>
            <span className="text-[11px] text-text-muted">
              Posting as <strong className="text-heading font-medium">Ian Chesnut</strong>
            </span>
          </div>

          <textarea
            id="inquiry-comment-input"
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a note, client communication summary, or internal remark..."
            className="w-full text-xs bg-bg border border-border rounded-lg p-3 text-heading placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none shadow-2xs"
          />

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div>
              {commentText.length > 0 ? (
                <span className="font-mono text-[11px] text-text-muted tabular-nums">
                  {commentText.length} chars
                </span>
              ) : (
                <span className="text-[11px] text-text-muted">
                  Add remarks or updates to the inquiry audit history
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleAddComment}
              disabled={!commentText.trim() || isSubmittingComment}
              className="text-xs font-semibold shadow-2xs"
            >
              <Send size={13} className="mr-1.5" />
              {isSubmittingComment ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>

        {/* ── Scrollable Activity Timeline History ── */}
        <div className="max-h-[460px] overflow-y-auto pr-1 sm:pr-2 overscroll-contain">
          <ActivityTimeline
            activities={inquiry.activity || []}
            emptyMessage="No activity events or comments logged for this inquiry yet."
          />
        </div>
      </Card>

      {/* ── SECTION 6: MANDATORY DOCUMENTS WARNING BANNER & ATTACHMENTS CARD ── */}
      <div className="space-y-4">
        {/* Missing Mandatory Documents Banner */}
        {missingMandatoryTypes.length > 0 && (
          <ErrorBanner
            variant="warning"
            message={`Missing required documents: ${missingMandatoryTypes.map((t) => t.typeName).join(', ')}`}
          />
        )}

        {/* Documents Card */}
        <Card padding="md" className="bg-bg">
          <div className="border-b border-border pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Paperclip size={18} className="text-primary" />
              <h3 className="text-heading font-semibold text-base">Documents & Attachments</h3>
              <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
                {inquiryDocuments.length}
              </Badge>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedDocForVersion(null);
                setUploadModalMode('add');
                setIsUploadModalOpen(true);
              }}
              className="text-xs font-semibold self-start sm:self-auto shadow-2xs"
            >
              <Plus size={15} className="mr-1.5" />
              Upload Document
            </Button>
          </div>

          {/* Document list or empty state */}
          {inquiryDocuments.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/20 space-y-3">
              <Paperclip size={24} className="mx-auto text-text-muted/60" />
              <div>
                <p className="font-semibold text-heading text-sm">No documents attached yet</p>
                <p className="mt-0.5">Upload customer RFQs, engineering drawings, or technical specifications.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedDocForVersion(null);
                  setUploadModalMode('add');
                  setIsUploadModalOpen(true);
                }}
                className="text-xs mt-2"
              >
                <Plus size={14} className="mr-1.5" />
                Upload First Attachment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <TableContainer>
                <thead>
                  <tr className="bg-surface/60 border-b border-border text-left">
                    <Th className="py-3 px-3 w-12 text-center"></Th>
                    <Th className="py-3 px-4 w-40">DOCUMENT TYPE</Th>
                    <Th className="py-3 px-4 min-w-[220px]">DOCUMENT TITLE</Th>
                    <Th className="py-3 px-4 min-w-[220px]">CURRENT REVISION</Th>
                    <Th className="py-3 px-4 w-28">FILE SIZE</Th>
                    <Th className="py-3 px-4 w-48">UPLOADED BY / DATE</Th>
                    <Th className="py-3 px-4 w-28 text-right">ACTIONS</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border bg-bg">
                  {inquiryDocuments.map((doc) => {
                    const docType = getDocumentTypeById(doc.documentTypeId);
                    const isExpanded = expandedDocIds.has(doc.documentId);
                    const versions = doc.versions || [];
                    const currentVersion = versions.find((v) => v.isCurrent) || versions[0] || {};

                    return (
                      <Fragment key={doc.documentId}>
                        <tr className="hover:bg-surface/50 transition-colors group">
                          {/* Expand / Collapse Button */}
                          <Td className="py-3 px-3 w-12 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDocExpanded(doc.documentId)}
                              className="p-1 rounded-lg text-text-muted hover:text-heading hover:bg-surface transition-colors cursor-pointer inline-flex items-center justify-center"
                              title={isExpanded ? 'Collapse version history' : 'Expand version history'}
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} className="text-primary" />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                          </Td>

                          {/* Document Type */}
                          <Td className="py-3 px-4 w-40">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${docType.badgeClass}`}
                            >
                              {docType.typeName}
                            </span>
                          </Td>

                          {/* Document Title */}
                          <Td className="py-3 px-4 min-w-[220px]">
                            <span className="font-semibold text-heading text-xs block truncate" title={doc.documentTitle}>
                              {doc.documentTitle}
                            </span>
                            <span className="text-[11px] text-text-muted font-mono block mt-0.5">
                              {versions.length} revision{versions.length > 1 ? 's' : ''} recorded
                            </span>
                          </Td>

                          {/* Current Version File Name (Click to open preview) */}
                          <Td className="py-3 px-4 min-w-[220px]">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewItem({
                                  ...currentVersion,
                                  documentTitle: doc.documentTitle,
                                  documentTypeId: doc.documentTypeId,
                                })
                              }
                              className="flex items-center gap-2 group/file hover:text-primary transition-colors cursor-pointer text-left w-full focus:outline-none"
                              title={`Click to open preview of ${currentVersion.fileName}`}
                            >
                              {renderFileExtIcon(currentVersion.fileExtension)}
                              <span
                                className="font-mono text-xs text-heading font-medium truncate group-hover/file:text-primary group-hover/file:underline"
                                title={currentVersion.fileName}
                              >
                                {currentVersion.fileName}
                              </span>
                              <Eye size={13} className="text-text-muted/50 group-hover/file:text-primary shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                            </button>
                          </Td>

                          {/* File Size */}
                          <Td className="py-3 px-4 w-28 font-mono tabular-nums text-text-muted text-xs">
                            {formatFileSizeKB(currentVersion.fileSizeKB)}
                          </Td>

                          {/* Uploaded By & On */}
                          <Td className="py-3 px-4 w-48">
                            <span className="text-heading font-medium block text-xs truncate">
                              {currentVersion.uploadedBy || doc.createdBy}
                            </span>
                            <span className="font-mono text-[11px] text-text-muted tabular-nums block mt-0.5">
                              {currentVersion.uploadedOn || doc.createdOn}
                            </span>
                          </Td>

                          {/* Actions */}
                          <Td className="py-3 px-4 w-28 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDocForVersion(doc);
                                setUploadModalMode('new_version');
                                setIsUploadModalOpen(true);
                              }}
                              title="Upload new version"
                              className="text-xs text-primary hover:bg-primary/10 h-8 px-2"
                            >
                              <UploadCloud size={14} className="mr-1" />
                              New Rev
                            </Button>
                          </Td>
                        </tr>

                        {/* Nested Version History Accordion Drawer */}
                        {isExpanded && (
                          <tr className="bg-surface/30">
                            <td colSpan={7} className="p-0 border-b border-border/80">
                              <div className="p-4 pl-14 space-y-2 animate-in fade-in duration-100">
                                <div className="flex items-center justify-between pb-1">
                                  <span className="text-xs font-bold text-heading flex items-center gap-1.5">
                                    <Clock size={14} className="text-text-muted" />
                                    <span>Version History for "{doc.documentTitle}"</span>
                                  </span>
                                  <span className="text-[11px] text-text-muted">
                                    Newest revisions listed first
                                  </span>
                                </div>

                                <div className="bg-bg border border-border rounded-lg overflow-hidden">
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="bg-surface/60 border-b border-border text-[11px] font-semibold text-text-muted">
                                        <th className="py-2.5 px-3">REVISION</th>
                                        <th className="py-2.5 px-3">FILE NAME</th>
                                        <th className="py-2.5 px-3">SIZE</th>
                                        <th className="py-2.5 px-3">UPLOADED BY / DATE</th>
                                        <th className="py-2.5 px-3">CHANGE REMARKS</th>
                                        <th className="py-2.5 px-3 text-right">ACTION</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                      {versions.map((ver) => (
                                        <tr key={ver.versionId} className="hover:bg-surface/40 transition-colors">
                                          <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-heading">
                                                v{ver.versionNo}
                                              </span>
                                              {ver.isCurrent && (
                                                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                                  Current
                                                </Badge>
                                              )}
                                            </div>
                                          </td>

                                          <td className="py-2.5 px-3 font-mono text-heading">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setPreviewItem({
                                                  ...ver,
                                                  documentTitle: doc.documentTitle,
                                                  documentTypeId: doc.documentTypeId,
                                                })
                                              }
                                              className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-left group/verfile focus:outline-none"
                                              title={`Click to view ${ver.fileName}`}
                                            >
                                              {renderFileExtIcon(ver.fileExtension)}
                                              <span
                                                className="truncate max-w-[220px] group-hover/verfile:underline"
                                                title={ver.fileName}
                                              >
                                                {ver.fileName}
                                              </span>
                                              <Eye size={12} className="text-text-muted/50 group-hover/verfile:text-primary shrink-0 opacity-0 group-hover/verfile:opacity-100 transition-opacity" />
                                            </button>
                                          </td>

                                          <td className="py-2.5 px-3 font-mono tabular-nums text-text-muted">
                                            {formatFileSizeKB(ver.fileSizeKB)}
                                          </td>

                                          <td className="py-2.5 px-3 font-mono text-[11px] text-text-muted tabular-nums">
                                            <div>{ver.uploadedBy}</div>
                                            <div>{ver.uploadedOn}</div>
                                          </td>

                                          <td className="py-2.5 px-3 text-text italic">
                                            {ver.changeRemarks ? `"${ver.changeRemarks}"` : '—'}
                                          </td>

                                          <td className="py-2.5 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  setPreviewItem({
                                                    ...ver,
                                                    documentTitle: doc.documentTitle,
                                                    documentTypeId: doc.documentTypeId,
                                                  })
                                                }
                                                title="View / Preview attachment"
                                                className="text-xs text-text-muted hover:text-primary h-7 px-2"
                                              >
                                                <Eye size={13} className="mr-1" />
                                                View
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleDownloadAttachment({
                                                    ...ver,
                                                    documentTitle: doc.documentTitle,
                                                    documentTypeId: doc.documentTypeId,
                                                  })
                                                }
                                                title="Download attachment"
                                                className="text-xs text-text-muted hover:text-primary h-7 px-2"
                                              >
                                                <Download size={13} className="mr-1" />
                                                Download
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </TableContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ── Document Preview Modal ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.documentTitle || previewItem.fileName}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-surface/60 p-3.5 rounded-xl border border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    getDocumentTypeById(previewItem.documentTypeId)?.badgeClass ||
                    'bg-surface text-text-muted border-border'
                  }`}
                >
                  {getDocumentTypeById(previewItem.documentTypeId)?.typeName || 'Attachment'}
                </span>
                <Badge
                  variant={previewItem.isCurrent ? 'success' : 'neutral'}
                  className="text-[11px] font-mono px-2 py-0.5"
                >
                  Rev v{previewItem.versionNo} {previewItem.isCurrent ? '(Current)' : ''}
                </Badge>
                <span
                  className="font-mono text-heading font-medium text-xs truncate max-w-xs sm:max-w-sm"
                  title={previewItem.fileName}
                >
                  {previewItem.fileName}
                </span>
              </div>

              <div className="flex items-center gap-3 text-text-muted text-xs">
                <span>
                  Size: <strong className="text-heading font-mono">{formatFileSizeKB(previewItem.fileSizeKB)}</strong>
                </span>
                <span>
                  Uploaded: <strong className="text-heading font-mono">{previewItem.uploadedOn}</strong> by{' '}
                  <strong className="text-heading">{previewItem.uploadedBy}</strong>
                </span>
              </div>
            </div>

            {/* Document Preview Display Box */}
            <div className="bg-bg rounded-2xl border border-border p-6 flex flex-col items-center justify-center min-h-[320px] shadow-inner text-center space-y-4 relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                {previewItem.fileExtension?.toLowerCase() === '.pdf' ? (
                  <FileText size={32} className="text-danger" />
                ) : previewItem.fileExtension?.toLowerCase() === '.dwg' ||
                  previewItem.fileExtension?.toLowerCase() === '.dxf' ? (
                  <Layers size={32} className="text-blue-500" />
                ) : (
                  <FileCheck size={32} className="text-primary" />
                )}
              </div>

              <div className="space-y-1 max-w-md">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-success/10 text-success border border-success/20">
                  <ShieldCheck size={14} /> Verified Document File
                </span>
                <h4 className="text-base font-bold text-heading mt-2">
                  {previewItem.documentTitle || previewItem.fileName}
                </h4>
                <p className="text-xs text-text-muted font-mono break-all">
                  {previewItem.fileName}
                </p>
              </div>

              {/* Change Remarks */}
              {previewItem.changeRemarks && (
                <div className="w-full max-w-lg bg-surface/50 rounded-xl p-3 border border-border text-left space-y-1 text-xs">
                  <span className="text-[11px] font-semibold text-text-muted block">Revision Remarks:</span>
                  <p className="text-heading italic">"{previewItem.changeRemarks}"</p>
                </div>
              )}

              {/* Document Information Sheet */}
              <div className="w-full max-w-lg bg-surface/30 rounded-xl p-3.5 border border-border text-left grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Inquiry No</span>
                  <span className="font-mono font-medium text-heading">{inquiry.InquiryNo}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Customer</span>
                  <span className="font-medium text-heading truncate block">{inquiry.CustomerName}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">File Format</span>
                  <span className="font-mono uppercase font-semibold text-primary">
                    {previewItem.fileExtension?.replace('.', '') || 'FILE'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[11px]">Version Status</span>
                  <span className="font-medium text-heading">
                    {previewItem.isCurrent
                      ? 'Current Active Version'
                      : `Archived Revision (v${previewItem.versionNo})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewItem(null)}
              >
                Close Preview
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleDownloadAttachment(previewItem)}
                className="text-xs font-semibold"
              >
                <Download size={14} className="mr-1.5" />
                Download Attachment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modals ── */}
      <AssignInquiryModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        inquiry={inquiry}
      />

      <ChangeStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        inquiry={inquiry}
      />

      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        inquiryId={inquiry.id || inquiry.InquiryId}
        mode={uploadModalMode}
        document={selectedDocForVersion}
      />
    </div>
  );
}
