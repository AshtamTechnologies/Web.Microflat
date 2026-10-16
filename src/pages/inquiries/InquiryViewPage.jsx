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
import { IconInquiry } from '../../constants/icons';

import {
  Button,
  CancelButton,
  Badge,
  Card,
  DetailField,
  ErrorBanner,
  TableContainer,
  Th,
  Td,
  Modal,
  PageHeader,
} from '../../components/ui';
import ActivityTimeline from '../../components/ActivityTimeline';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';
import { useProductCategoriesContext } from '../../context/ProductCategoriesContext';
import { getCategoryPathName } from '../../utils/treeUtils';
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
import { formatDate, formatDateTime } from '../../utils/dateUtils';

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

  // Mobile view switcher for line items table (cards vs scrollable table on small screens)
  const [mobileViewMode, setMobileViewMode] = useState('cards');

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

  // Line items for Product Selection table — always provides structured items even for legacy single-item records
  const inquiryItems = useMemo(() => {
    if (!inquiry) return [];
    if (Array.isArray(inquiry.items) && inquiry.items.length > 0) {
      return inquiry.items.map((it, idx) => ({
        ...it,
        prItemId: it.prItemId || it.id || idx + 1,
        itemCode: it.itemCode || it.ItemCode || `MAT-CAT-${String(idx + 1).padStart(3, '0')}`,
        specification: it.specification || it.Specification || '—',
        quantity: it.quantity !== undefined && it.quantity !== null && it.quantity !== '' ? it.quantity : (it.Quantity || 1),
        uom: it.uom || it.UOM || 'PCS',
        categoryName: it.categoryName || (it.categoryId ? getCategoryPathName(it.categoryId, categories) : getCategoryPathName(inquiry.CategoryId, categories)) || '—',
      }));
    }
    if (inquiry.CategoryId || inquiry.Quantity) {
      return [
        {
          prItemId: 1,
          itemCode: inquiry.ItemCode || 'MAT-CAT-001',
          itemName: inquiry.Subject || 'Main Product Requirement',
          specification: inquiry.Specification || '—',
          quantity: inquiry.Quantity !== undefined && inquiry.Quantity !== null && inquiry.Quantity !== '' ? inquiry.Quantity : 1,
          uom: inquiry.UOM || 'PCS',
          categoryId: inquiry.CategoryId || '',
          categoryName: inquiry.CategoryId ? getCategoryPathName(inquiry.CategoryId, categories) : '—',
        },
      ];
    }
    return [];
  }, [inquiry, categories]);

  const totalItemQty = useMemo(() => {
    return inquiryItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  }, [inquiryItems]);

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
          `Uploaded Date    : ${formatDate(item.uploadedOn)}`,
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
    if (lower === '.dwg' || lower === '.dxf') return <Layers size={15} className="text-primary shrink-0" />;
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
      <PageHeader
        title={inquiry.InquiryNo}
        icon={<IconInquiry className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <button
            type="button"
            onClick={() => navigate('/inquiries')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
          >
            <ArrowLeft
              size={14}
              className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform duration-150"
              aria-hidden="true"
            />
            <span>Back to Inquiries</span>
          </button>
        }
        badge={
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
        }
        actions={
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
        }
      />

      {/* ── Grid of Detail Sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Inquiry Details Card */}
        <Card padding="md" className="bg-bg">
          <div className="border-b border-border pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <FileText size={17} className="text-primary shrink-0" />
              <span>1. Inquiry Master Details</span>
            </div>
            {inquiry.InquiryNo && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center font-mono font-bold text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                  {inquiry.InquiryNo}
                </span>
                <Badge variant="neutral" size="sm" className="font-medium text-2xs">
                  System Generated
                </Badge>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField
              label="Inquiry Date"
              value={formatDate(inquiry.InquiryDate)}
              mono
            />

            <DetailField
              label="Estimate Date"
              value={inquiry.RequiredByDate || inquiry.EstimateDate ? formatDate(inquiry.RequiredByDate || inquiry.EstimateDate) : 'Not specified'}
              icon={Calendar}
              mono
            />

            <DetailField
              label="Sales Region"
              value={getRegionName(inquiry.RegionId)}
            />

            <DetailField
              label="Source Channel"
            >
              <span className="font-medium text-heading text-sm">
                {inquiry.Source || 'Website'}
                {inquiry.Source === 'Distributor' && inquiry.DistributorName ? (
                  <span className="text-text-muted font-normal text-xs block">
                    Distributor: <strong className="text-heading font-medium">{inquiry.DistributorName}</strong>
                  </span>
                ) : null}
              </span>
            </DetailField>

            {inquiry.Description && (
              <div className="sm:col-span-2 pt-2 border-t border-border/60">
                <span className="view-field-label">Specifications & Notes</span>
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
          <div className="border-b border-border pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <Building2 size={17} className="text-primary shrink-0" />
              <span>2. Customer Information</span>
            </div>
            <span className="text-xs text-text-muted">Client Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField
              label="Company / Customer Name"
              value={inquiry.CustomerName}
              className="sm:col-span-2"
              valueClassName="text-sm font-bold"
            />

            <DetailField
              label="Contact Person"
              value={inquiry.ContactPerson}
              icon={User}
            />

            <DetailField
              label="Email Address"
              value={inquiry.Email}
              icon={Mail}
              isEmail
            />

            <DetailField
              label="Phone / Contact No"
              value={inquiry.Phone}
              icon={Phone}
              isPhone
              mono
            />

            {inquiry.AlternativePhone ? (
              <DetailField
                label="Alternative Phone"
                value={inquiry.AlternativePhone}
                icon={Phone}
                isPhone
                mono
              />
            ) : null}

            <DetailField
              label="Sales Territory"
              value={getRegionName(inquiry.RegionId)}
            />

            {(inquiry.AddressLine1 || inquiry.AddressLine2 || inquiry.City || inquiry.State || inquiry.Country) && (
              <div className="sm:col-span-2 pt-2 border-t border-border/60">
                <span className="view-field-label">Customer Address</span>
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
          <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <Package size={17} className="text-primary shrink-0" />
              <span>3. Product Selection</span>
            </div>
            <span className="text-xs text-text-muted">Scope & Line Items</span>
          </div>

          {/* Line Items Container — fully responsive with mobile cards & scrollable table */}
          <div className="rounded-xl border border-border overflow-hidden bg-surface/40">
            {/* Header bar with count, total qty & mobile view switcher */}
            <div className="px-3.5 py-2.5 bg-surface border-b border-border flex items-center justify-between text-xs font-semibold text-heading flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>Inquiry Items ({inquiryItems.length})</span>
                <span className="font-mono text-text-muted text-xs">
                  Total Qty: <strong className="text-heading">{totalItemQty}</strong>
                </span>
              </div>

              {/* Mobile View Switcher (Cards vs Table on small screens) */}
              <div className="sm:hidden flex items-center bg-bg border border-border rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('cards')}
                  className={`px-2 py-0.5 text-2xs font-medium rounded transition-colors ${
                    mobileViewMode === 'cards'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-heading'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('table')}
                  className={`px-2 py-0.5 text-2xs font-medium rounded transition-colors ${
                    mobileViewMode === 'table'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-heading'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            {/* Mobile Card List View (rendered when mobileViewMode === 'cards' on mobile) */}
            <div className={`${mobileViewMode === 'cards' ? 'block sm:hidden' : 'hidden'} divide-y divide-border`}>
              {inquiryItems.length > 0 ? (
                inquiryItems.map((item, idx) => (
                  <div key={item.prItemId || item.id || idx} className="p-3.5 space-y-2.5 bg-surface/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center text-2xs font-mono text-text-muted shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-2xs uppercase font-semibold text-text-muted block">Product Category</span>
                          <span className="font-semibold text-xs text-heading leading-snug">
                            {item.categoryName || getCategoryPathName(item.categoryId || inquiry.CategoryId, categories) || '—'}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-heading bg-surface border border-border px-2 py-0.5 rounded-md text-2xs shrink-0">
                        {item.itemCode || 'MAT-CAT-001'}
                      </span>
                    </div>

                    {item.specification && item.specification !== '—' && (
                      <div className="text-xs text-text-muted bg-surface/50 p-2.5 rounded-lg border border-border/60 pl-3">
                        <span className="text-2xs uppercase font-semibold text-text-muted block mb-0.5">Specification</span>
                        <span className="leading-relaxed">{item.specification}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <span className="text-text-muted">Quantity & UOM:</span>
                      <span className="font-mono font-bold text-heading bg-surface px-2.5 py-0.5 rounded border border-border">
                        {item.quantity} <span className="font-medium text-text-muted">{item.uom}</span>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-text-muted italic">
                  No items added to inquiry yet.
                </div>
              )}
            </div>

            {/* Desktop Table & Mobile Horizontal-Scrollable Table */}
            <div className={mobileViewMode === 'cards' ? 'hidden sm:block' : 'block'}>
              <TableContainer tableClassName="min-w-[620px] w-full">
                <thead>
                  <tr>
                    <Th className="w-12 min-w-[48px] text-center text-xs py-2.5">#</Th>
                    <Th className="min-w-[180px] text-xs py-2.5">PRODUCT CATEGORY</Th>
                    <Th className="w-32 min-w-[130px] text-xs py-2.5">ITEM CODE</Th>
                    <Th className="min-w-[180px] text-xs py-2.5">SPECIFICATION</Th>
                    <Th className="w-20 min-w-[75px] text-right text-xs py-2.5">QTY</Th>
                    <Th className="w-20 min-w-[75px] text-xs py-2.5">UOM</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {inquiryItems.length > 0 ? (
                    inquiryItems.map((item, idx) => (
                      <tr key={item.prItemId || item.id || idx} className="hover:bg-surface/60 transition-colors">
                        <Td className="text-center font-mono text-text-muted py-2.5 whitespace-nowrap">{idx + 1}</Td>
                        <Td className="font-medium text-heading text-xs py-2.5">
                          {item.categoryName || getCategoryPathName(item.categoryId || inquiry.CategoryId, categories) || '—'}
                        </Td>
                        <Td className="py-2.5 whitespace-nowrap">
                          <span className="font-mono font-semibold text-heading bg-surface border border-border px-2 py-0.5 rounded-md text-xs">
                            {item.itemCode || 'MAT-CAT-001'}
                          </span>
                        </Td>
                        <Td className="text-text-muted py-2.5">{item.specification || '—'}</Td>
                        <Td className="text-right font-mono font-bold text-heading text-xs py-2.5 whitespace-nowrap">{item.quantity}</Td>
                        <Td className="text-text-muted font-mono text-xs py-2.5 whitespace-nowrap">{item.uom}</Td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <Td colSpan={6} className="text-center py-6 text-text-muted italic">
                        No items added to inquiry yet.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </TableContainer>
            </div>
          </div>
        </Card>

        {/* 4. Assignment & Audit Card (Full Width) */}
        <Card padding="md" className="lg:col-span-2 bg-bg">
          <div className="border-b border-border pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <UserCheck size={17} className="text-primary shrink-0" />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 p-3 bg-surface rounded-xl border border-border flex items-center justify-between">
              <div>
                <span className="view-field-label">Current Assignee</span>
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

            <DetailField
              label="Created By"
              value={inquiry.CreatedBy || 'Ian Chesnut'}
            />

            <DetailField
              label="Created On"
              value={formatDateTime(inquiry.CreatedOn)}
              mono
            />

            <DetailField
              label="Last Modified By"
              value={inquiry.ModifiedBy || 'Ian Chesnut'}
            />

            <DetailField
              label="Last Modified On"
              value={formatDateTime(inquiry.ModifiedOn)}
              mono
            />
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
            <span className="text-2xs text-text-muted">
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
                <span className="font-mono text-2xs text-text-muted tabular-nums">
                  {commentText.length} chars
                </span>
              ) : (
                <span className="text-2xs text-text-muted">
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
            <TableContainer
              className="rounded-xl border border-border overflow-x-auto"
              tableClassName="w-full min-w-[840px] text-xs text-left border-collapse table-auto sm:table-fixed"
            >
              <thead>
                <tr className="bg-surface/60 border-b border-border text-left">
                  <Th className="py-3 px-3 w-12 text-center"></Th>
                  <Th className="py-3 px-4 w-40">DOCUMENT TYPE</Th>
                  <Th className="py-3 px-4 min-w-[220px]">DOCUMENT TITLE</Th>
                  <Th className="py-3 px-4 min-w-[220px]">CURRENT REVISION</Th>
                  <Th className="py-3 px-4 w-28">FILE SIZE</Th>
                  <Th className="py-3 px-4 w-48">UPLOADED BY / DATE</Th>
                  <Th className="py-3 px-4 w-32 text-right">ACTIONS</Th>
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
                            <span className="text-2xs text-text-muted font-mono block mt-0.5">
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
                            <span className="font-mono text-2xs text-text-muted tabular-nums block mt-0.5">
                              {formatDate(currentVersion.uploadedOn || doc.createdOn)}
                            </span>
                          </Td>

                          {/* Actions */}
                          <Td className="py-3 px-4 w-32 text-right whitespace-nowrap">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedDocForVersion(doc);
                                setUploadModalMode('new_version');
                                setIsUploadModalOpen(true);
                              }}
                              title="Upload new version"
                              className="text-xs font-semibold text-primary border-primary/30 hover:border-primary hover:bg-primary/10 bg-surface shadow-2xs h-7 px-2.5 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                            >
                              <UploadCloud size={13} className="shrink-0 text-primary" />
                              <span>New Rev</span>
                            </Button>
                          </Td>
                        </tr>

                        {/* Nested Version History Accordion Drawer */}
                        {isExpanded && (
                          <tr className="bg-surface/30">
                            <td colSpan={7} className="p-0 border-b border-border/80">
                              <div className="p-3 sm:p-4 sm:pl-12 space-y-2.5 animate-in fade-in duration-100">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                                  <span className="text-xs font-bold text-heading flex items-center gap-1.5 min-w-0">
                                    <Clock size={14} className="text-text-muted shrink-0" />
                                    <span className="truncate">Version History for "{doc.documentTitle}"</span>
                                  </span>
                                  <span className="text-2xs text-text-muted shrink-0">
                                    Newest revisions listed first
                                  </span>
                                </div>

                                <div className="bg-bg border border-border rounded-lg overflow-x-auto shadow-2xs">
                                  <table className="w-full min-w-[720px] text-xs text-left border-collapse">
                                    <thead>
                                      <tr className="bg-surface/60 border-b border-border text-2xs font-semibold text-text-muted">
                                        <th className="py-2.5 px-3 w-24">REVISION</th>
                                        <th className="py-2.5 px-3 min-w-[200px]">FILE NAME</th>
                                        <th className="py-2.5 px-3 w-20">SIZE</th>
                                        <th className="py-2.5 px-3 w-40">UPLOADED BY / DATE</th>
                                        <th className="py-2.5 px-3 min-w-[220px]">CHANGE REMARKS</th>
                                        <th className="py-2.5 px-3 w-48 text-right">ACTION</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                      {versions.map((ver) => (
                                        <tr key={ver.versionId} className="hover:bg-surface/40 transition-colors">
                                          <td className="py-2.5 px-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-bold text-heading">
                                                v{ver.versionNo}
                                              </span>
                                              {ver.isCurrent && (
                                                <Badge variant="success" className="text-2xs px-1.5 py-0">
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
                                                className="truncate max-w-[200px] sm:max-w-[240px] group-hover/verfile:underline"
                                                title={ver.fileName}
                                              >
                                                {ver.fileName}
                                              </span>
                                              <Eye size={12} className="text-text-muted/50 group-hover/verfile:text-primary shrink-0 opacity-0 group-hover/verfile:opacity-100 transition-opacity" />
                                            </button>
                                          </td>

                                          <td className="py-2.5 px-3 font-mono tabular-nums text-text-muted whitespace-nowrap">
                                            {formatFileSizeKB(ver.fileSizeKB)}
                                          </td>

                                          <td className="py-2.5 px-3 font-mono text-2xs text-text-muted tabular-nums whitespace-nowrap">
                                            <div className="font-medium text-heading/90">{ver.uploadedBy}</div>
                                            <div>{formatDate(ver.uploadedOn)}</div>
                                          </td>

                                          <td className="py-2.5 px-3 text-text">
                                            {ver.changeRemarks || '—'}
                                          </td>

                                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                  setPreviewItem({
                                                    ...ver,
                                                    documentTitle: doc.documentTitle,
                                                    documentTypeId: doc.documentTypeId,
                                                  })
                                                }
                                                title="View / Preview attachment"
                                                className="text-xs font-semibold text-text hover:text-primary hover:border-primary/40 bg-surface border border-border shadow-2xs h-7 px-2.5 inline-flex items-center gap-1 cursor-pointer"
                                              >
                                                <Eye size={13} className="text-text-muted shrink-0" />
                                                <span>View</span>
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                  handleDownloadAttachment({
                                                    ...ver,
                                                    documentTitle: doc.documentTitle,
                                                    documentTypeId: doc.documentTypeId,
                                                  })
                                                }
                                                title="Download attachment"
                                                className="text-xs font-semibold text-text hover:text-primary hover:border-primary/40 bg-surface border border-border shadow-2xs h-7 px-2.5 inline-flex items-center gap-1 cursor-pointer"
                                              >
                                                <Download size={13} className="text-text-muted shrink-0" />
                                                <span>Download</span>
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
                  className="text-2xs font-mono px-2 py-0.5"
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
                  Uploaded: <strong className="text-heading font-mono">{formatDate(previewItem.uploadedOn)}</strong> by{' '}
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
                  <Layers size={32} className="text-primary" />
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
                  <span className="text-2xs font-semibold text-text-muted block">Revision Remarks:</span>
                  <p className="text-heading italic">{previewItem.changeRemarks}</p>
                </div>
              )}

              {/* Document Information Sheet */}
              <div className="w-full max-w-lg bg-surface/30 rounded-xl p-3.5 border border-border text-left grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-muted block text-2xs">Inquiry No</span>
                  <span className="font-mono font-medium text-heading">{inquiry.InquiryNo}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-2xs">Customer</span>
                  <span className="font-medium text-heading truncate block">{inquiry.CustomerName}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-2xs">File Format</span>
                  <span className="font-mono uppercase font-semibold text-primary">
                    {previewItem.fileExtension?.replace('.', '') || 'FILE'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-2xs">Version Status</span>
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
              <CancelButton
                variant="ghost"
                size="sm"
                onClick={() => setPreviewItem(null)}
              >
                Close Preview
              </CancelButton>

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
