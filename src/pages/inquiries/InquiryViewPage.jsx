/**
 * InquiryViewPage.jsx — Full-page read-only view for an Inquiry record.
 *
 * Route: /inquiries/:id
 */

import { useState, useMemo, useCallback, Fragment } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconActivity,
  IconAdd,
  IconAttachment,
  IconBack,
  IconBuilding2,
  IconCalendar,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconDocumentTypes,
  IconDownload,
  IconEdit,
  IconError,
  IconFile,
  IconFileCode,
  IconFileText,
  IconIndianRupee,
  IconInquiry,
  IconLayers,
  IconLocation,
  IconMail,
  IconMessageSquare,
  IconPackage,
  IconPhone,
  IconRefresh,
  IconSend,
  IconShieldCheck,
  IconSuccess,
  IconTags,
  IconUpload,
  IconUser,
  IconUserCheck,
  IconUserPlus,
  IconView,
} from '../../constants/icons';

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
  Textarea,
  IconButton,
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

const INITIAL_ITEM_WIDTHS = {
  index: 50,
  category: 220,
  itemCode: 140,
  specification: 260,
  quantity: 85,
  uom: 85,
};

const MIN_ITEM_WIDTHS = {
  index: 40,
  category: 120,
  itemCode: 100,
  specification: 120,
  quantity: 60,
  uom: 60,
};

const INITIAL_DOC_WIDTHS = {
  expander: 48,
  docType: 170,
  docTitle: 240,
  revision: 240,
  fileSize: 90,
  uploadedBy: 170,
  actions: 130,
};

const MIN_DOC_WIDTHS = {
  expander: 40,
  docType: 120,
  docTitle: 140,
  revision: 140,
  fileSize: 75,
  uploadedBy: 120,
  actions: 115,
};

const INITIAL_VER_WIDTHS = {
  revision: 110,
  fileName: 240,
  fileSize: 85,
  uploadedBy: 160,
  remarks: 240,
  actions: 195,
};

const MIN_VER_WIDTHS = {
  revision: 80,
  fileName: 140,
  fileSize: 70,
  uploadedBy: 120,
  remarks: 140,
  actions: 180,
};

function useColumnResizing(initialWidths, minWidths = {}) {
  const [widths, setWidths] = useState(initialWidths);
  const [resizingCol, setResizingCol] = useState(null);

  const startResize = useCallback(
    (colKey, startX, initialWidth) => {
      setResizingCol(colKey);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const delta = clientX - startX;
        const minW = minWidths[colKey] || 40;
        const newWidth = Math.max(minW, initialWidth + delta);
        setWidths((prev) => ({
          ...prev,
          [colKey]: Math.round(newWidth),
        }));
      };

      const onEnd = () => {
        setResizingCol(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
        window.removeEventListener('touchcancel', onEnd);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
    },
    [minWidths]
  );

  const getResizeProps = useCallback(
    (colKey) => {
      return {
        style: { width: widths[colKey], minWidth: minWidths[colKey] || widths[colKey] },
        isResizing: resizingCol === colKey,
        resizeHandler: (e) => {
          if (e.type !== 'touchstart') {
            e.preventDefault();
          }
          e.stopPropagation();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          startResize(colKey, clientX, widths[colKey]);
        },
      };
    },
    [widths, resizingCol, startResize, minWidths]
  );

  const totalTableWidth = useMemo(() => {
    return Object.values(widths).reduce(
      (sum, w) => sum + (typeof w === 'number' ? w : parseInt(w, 10) || 0),
      0
    );
  }, [widths]);

  return { widths, setWidths, resizingCol, getResizeProps, totalTableWidth };
}

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

  // Resizable table columns
  const {
    widths: itemWidths,
    getResizeProps: getItemResizeProps,
    totalTableWidth: itemTableWidth,
  } = useColumnResizing(INITIAL_ITEM_WIDTHS, MIN_ITEM_WIDTHS);

  const {
    widths: docWidths,
    getResizeProps: getDocResizeProps,
    totalTableWidth: docTableWidth,
  } = useColumnResizing(INITIAL_DOC_WIDTHS, MIN_DOC_WIDTHS);

  const {
    widths: verWidths,
    getResizeProps: getVerResizeProps,
    totalTableWidth: verTableWidth,
  } = useColumnResizing(INITIAL_VER_WIDTHS, MIN_VER_WIDTHS);

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
          `Exported On      : ${formatDateTime(new Date())}`,
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
    if (lower === '.pdf') return <IconFileText size={15} className="text-danger shrink-0" />;
    if (lower === '.docx' || lower === '.doc') return <IconFileText size={15} className="text-primary shrink-0" />;
    if (lower === '.dwg' || lower === '.dxf') return <IconLayers size={15} className="text-primary shrink-0" />;
    return <IconFile size={15} className="text-text-muted shrink-0" />;
  };

  if (!inquiry) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Inquiry Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested inquiry record with ID "{id}" does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/inquiries')}>
            Back to Inquiries
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/inquiries')}
          >
            Back to Inquiries
          </Button>
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
              <IconRefresh size={14} className="mr-1.5" />
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
                  <IconUserCheck size={14} className="mr-1.5 text-primary" />
                  Reassign
                </>
              ) : (
                <>
                  <IconUserPlus size={14} className="mr-1.5" />
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
              <IconEdit size={14} className="mr-1.5" />
              Edit Inquiry
            </Button>
          </div>
        }
      />

      {/* ── 2-Column Responsive Workspace Layout (Main 8 cols / Sidebar 4 cols) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: Core Inquiry Data, Products & Attachments (xl:col-span-8) ── */}
        <div className="xl:col-span-8 space-y-6">
          {/* 1. Combined Customer Profile & Inquiry Master Details Card */}
          <Card padding="md" className="bg-bg shadow-2xs">
            {/* Header */}
            <div className="border-b border-border pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconBuilding2 size={17} className="text-primary shrink-0" />
                <span>1. Customer & Inquiry Details</span>
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

            {/* Sub-grid: Customer Details & Inquiry Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Customer Information Column */}
              <div className="space-y-3 pb-3 md:pb-0 md:pr-4 md:border-r border-border/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-heading uppercase tracking-wider text-text-muted pb-1 border-b border-border/40">
                  <IconUser size={13} className="text-primary" />
                  <span>Customer Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField
                    label="Company Name"
                    value={inquiry.CustomerName}
                    className="sm:col-span-2"
                    valueClassName="text-sm font-bold"
                  />
                  <DetailField
                    label="Contact Person"
                    value={inquiry.ContactPerson}
                    icon={IconUser}
                  />
                  <DetailField
                    label="Contact No"
                    value={inquiry.Phone}
                    icon={IconPhone}
                    isPhone
                    mono
                  />
                  <DetailField
                    label="Email Address"
                    value={inquiry.Email}
                    icon={IconMail}
                    isEmail
                    className="sm:col-span-2"
                  />
                  {inquiry.AlternativePhone ? (
                    <DetailField
                      label="Alternative Phone"
                      value={inquiry.AlternativePhone}
                      icon={IconPhone}
                      isPhone
                      mono
                    />
                  ) : null}
                  {(inquiry.AddressLine1 || inquiry.AddressLine2 || inquiry.City || inquiry.State || inquiry.Country) && (
                    <div className="sm:col-span-2 pt-1.5 border-t border-border/40">
                      <span className="view-field-label">Customer Address</span>
                      <div className="flex items-start gap-1.5 text-heading text-xs mt-0.5">
                        <IconLocation size={14} className="text-primary mt-0.5 shrink-0" />
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
              </div>

              {/* Inquiry Parameters Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-heading uppercase tracking-wider text-text-muted pb-1 border-b border-border/40">
                  <IconFileText size={13} className="text-primary" />
                  <span>Inquiry Parameters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField
                    label="Inquiry Date"
                    value={formatDate(inquiry.InquiryDate)}
                    mono
                  />
                  <DetailField
                    label="Estimate Date"
                    value={inquiry.RequiredByDate || inquiry.EstimateDate ? formatDate(inquiry.RequiredByDate || inquiry.EstimateDate) : 'Not specified'}
                    icon={IconCalendar}
                    mono
                  />
                  <DetailField
                    label="Sales Region / Territory"
                    value={getRegionName(inquiry.RegionId)}
                    className="sm:col-span-2"
                  />
                  <DetailField
                    label="Source Channel"
                    className="sm:col-span-2"
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
                </div>
              </div>

              {/* Detailed Specifications across full width */}
              {inquiry.Description && (
                <div className="md:col-span-2 pt-3 border-t border-border/60">
                  <span className="view-field-label">Detailed Specifications</span>
                  {inquiry.Description.includes('<') ? (
                    <div
                      className="rich-text-content text-text bg-surface/40 p-3.5 rounded-lg border border-border leading-relaxed text-sm overflow-x-auto mt-1"
                      dangerouslySetInnerHTML={{ __html: inquiry.Description }}
                    />
                  ) : (
                    <p className="text-text bg-surface/40 p-3 rounded-lg border border-border leading-relaxed whitespace-pre-line text-sm mt-1">
                      {inquiry.Description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* 2. Product Selection Card */}
          <Card padding="md" className="bg-bg space-y-4 shadow-2xs">
            <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconPackage size={17} className="text-primary shrink-0" />
                <span>2. Product Selection</span>
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
                    className={`px-2 py-0.5 text-2xs font-medium rounded transition-colors ${mobileViewMode === 'cards'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-heading'
                      }`}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('table')}
                    className={`px-2 py-0.5 text-2xs font-medium rounded transition-colors ${mobileViewMode === 'table'
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
                <TableContainer
                  tableStyle={{ width: `${itemTableWidth}px`, minWidth: '100%' }}
                  tableClassName="w-full text-xs text-left border-collapse table-fixed"
                >
                  <colgroup>
                    <col style={{ width: itemWidths.index }} />
                    <col style={{ width: itemWidths.category }} />
                    <col style={{ width: itemWidths.itemCode }} />
                    <col style={{ width: itemWidths.specification }} />
                    <col style={{ width: itemWidths.quantity }} />
                    <col style={{ width: itemWidths.uom }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <Th {...getItemResizeProps('index')} className="text-center text-xs py-2.5">#</Th>
                      <Th {...getItemResizeProps('category')} className="text-xs py-2.5">PRODUCT CATEGORY</Th>
                      <Th {...getItemResizeProps('itemCode')} className="text-xs py-2.5">ITEM CODE</Th>
                      <Th {...getItemResizeProps('specification')} className="text-xs py-2.5">SPECIFICATION</Th>
                      <Th {...getItemResizeProps('quantity')} className="text-right text-xs py-2.5">QTY</Th>
                      <Th {...getItemResizeProps('uom')} className="text-xs py-2.5">UOM</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {inquiryItems.length > 0 ? (
                      inquiryItems.map((item, idx) => (
                        <tr key={item.prItemId || item.id || idx} className="hover:bg-surface/60 transition-colors">
                          <Td style={{ width: itemWidths.index }} className="text-center font-mono text-text-muted py-2.5 whitespace-nowrap">{idx + 1}</Td>
                          <Td style={{ width: itemWidths.category }} className="font-medium text-heading text-xs py-2.5">
                            <span className="block truncate w-full min-w-0" title={item.categoryName || getCategoryPathName(item.categoryId || inquiry.CategoryId, categories)}>
                              {item.categoryName || getCategoryPathName(item.categoryId || inquiry.CategoryId, categories) || '—'}
                            </span>
                          </Td>
                          <Td style={{ width: itemWidths.itemCode }} className="py-2.5 whitespace-nowrap">
                            <span className="font-mono font-semibold text-heading bg-surface border border-border px-2 py-0.5 rounded-md text-xs">
                              {item.itemCode || 'MAT-CAT-001'}
                            </span>
                          </Td>
                          <Td style={{ width: itemWidths.specification }} className="text-text-muted py-2.5">
                            <span className="block truncate w-full min-w-0" title={item.specification || '—'}>
                              {item.specification || '—'}
                            </span>
                          </Td>
                          <Td style={{ width: itemWidths.quantity }} className="text-right font-mono font-bold text-heading text-xs py-2.5 whitespace-nowrap">{item.quantity}</Td>
                          <Td style={{ width: itemWidths.uom }} className="text-text-muted font-mono text-xs py-2.5 whitespace-nowrap">{item.uom}</Td>
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

          {/* 3. Documents & Attachments Card */}
          <div className="space-y-4">
            {/* Missing Mandatory Documents Banner */}
            {missingMandatoryTypes.length > 0 && (
              <ErrorBanner
                variant="warning"
                message={`Missing required documents: ${missingMandatoryTypes.map((t) => t.typeName).join(', ')}`}
              />
            )}

            {/* Documents Card */}
            <Card padding="md" className="bg-bg shadow-2xs">
              <div className="border-b border-border pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <IconAttachment size={18} className="text-primary" />
                  <h3 className="text-heading font-semibold text-base">3. Documents & Attachments</h3>
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
                  <IconAdd size={15} className="mr-1.5" />
                  Upload Document
                </Button>
              </div>

              {/* Document list or empty state */}
              {inquiryDocuments.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/20 space-y-3">
                  <IconAttachment size={24} className="mx-auto text-text-muted/60" />
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
                    <IconAdd size={14} className="mr-1.5" />
                    Upload First Attachment
                  </Button>
                </div>
              ) : (
                <TableContainer
                  className="rounded-xl border border-border overflow-x-auto"
                  tableStyle={{ width: `${docTableWidth}px`, minWidth: '100%' }}
                  tableClassName="w-full text-xs text-left border-collapse table-fixed"
                >
                  <colgroup>
                    <col style={{ width: docWidths.expander }} />
                    <col style={{ width: docWidths.docType }} />
                    <col style={{ width: docWidths.docTitle }} />
                    <col style={{ width: docWidths.revision }} />
                    <col style={{ width: docWidths.fileSize }} />
                    <col style={{ width: docWidths.uploadedBy }} />
                    <col style={{ width: docWidths.actions }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-surface/60 border-b border-border text-left">
                      <Th {...getDocResizeProps('expander')} className="py-3 px-3 text-center"></Th>
                      <Th {...getDocResizeProps('docType')} className="py-3 px-4 whitespace-nowrap">DOCUMENT TYPE</Th>
                      <Th {...getDocResizeProps('docTitle')} className="py-3 px-4">DOCUMENT TITLE</Th>
                      <Th {...getDocResizeProps('revision')} className="py-3 px-4">CURRENT REVISION</Th>
                      <Th {...getDocResizeProps('fileSize')} className="py-3 px-4 whitespace-nowrap">FILE SIZE</Th>
                      <Th {...getDocResizeProps('uploadedBy')} className="py-3 px-4 whitespace-nowrap">UPLOADED BY / DATE</Th>
                      <Th {...getDocResizeProps('actions')} className="py-3 px-4 text-right whitespace-nowrap">ACTIONS</Th>
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
                            <Td style={{ width: docWidths.expander }} className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleDocExpanded(doc.documentId)}
                                className="p-1 rounded-lg text-text-muted hover:text-heading hover:bg-surface transition-colors cursor-pointer inline-flex items-center justify-center"
                                title={isExpanded ? 'Collapse version history' : 'Expand version history'}
                              >
                                {isExpanded ? (
                                  <IconChevronDown size={16} className="text-primary" />
                                ) : (
                                  <IconChevronRight size={16} />
                                )}
                              </button>
                            </Td>

                            {/* Document Type */}
                            <Td style={{ width: docWidths.docType }} className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                                {docType?.documentTypeName || docType?.typeName || 'Document'}
                              </span>
                            </Td>

                            {/* Document Title */}
                            <Td style={{ width: docWidths.docTitle }} className="py-3 px-4">
                              <span className="font-semibold text-heading text-xs block truncate w-full min-w-0" title={doc.documentTitle}>
                                {doc.documentTitle}
                              </span>
                              <span className="text-2xs text-text-muted font-mono block mt-0.5">
                                {versions.length} revision{versions.length > 1 ? 's' : ''} recorded
                              </span>
                            </Td>

                            {/* Current Version File Name (Click to open preview) */}
                            <Td style={{ width: docWidths.revision }} className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewItem({
                                    ...currentVersion,
                                    documentTitle: doc.documentTitle,
                                    documentTypeId: doc.documentTypeId,
                                  })
                                }
                                className="flex items-center gap-2 group/file hover:text-primary transition-colors cursor-pointer text-left w-full min-w-0 focus:outline-none"
                                title={`Click to open preview of ${currentVersion.fileName}`}
                              >
                                {renderFileExtIcon(currentVersion.fileExtension)}
                                <span
                                  className="font-mono text-xs text-heading font-medium truncate w-full min-w-0 group-hover/file:text-primary group-hover/file:underline"
                                  title={currentVersion.fileName}
                                >
                                  {currentVersion.fileName}
                                </span>
                                <IconView size={13} className="text-text-muted/50 group-hover/file:text-primary shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                              </button>
                            </Td>

                            {/* File Size */}
                            <Td style={{ width: docWidths.fileSize }} className="py-3 px-4 font-mono tabular-nums text-text-muted text-xs whitespace-nowrap">
                              {formatFileSizeKB(currentVersion.fileSizeKB)}
                            </Td>

                            {/* Uploaded By & On */}
                            <Td style={{ width: docWidths.uploadedBy }} className="py-3 px-4 whitespace-nowrap">
                              <span className="text-heading font-medium block text-xs truncate w-full min-w-0" title={currentVersion.uploadedBy || doc.createdBy}>
                                {currentVersion.uploadedBy || doc.createdBy || '—'}
                              </span>
                              <span className="font-mono text-2xs text-text-muted tabular-nums block mt-0.5">
                                {formatDate(currentVersion.uploadedOn || doc.createdOn)}
                              </span>
                            </Td>

                            {/* Actions */}
                            <Td style={{ width: docWidths.actions }} className="py-3 px-4 min-w-[110px] text-right whitespace-nowrap">
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
                                <IconUpload size={13} className="shrink-0 text-primary" />
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
                                      <IconClock size={14} className="text-text-muted shrink-0" />
                                      <span className="truncate">Version History for &quot;{doc.documentTitle}&quot;</span>
                                    </span>
                                    <span className="text-2xs text-text-muted shrink-0">
                                      Newest revisions listed first
                                    </span>
                                  </div>

                                  <TableContainer
                                    className="bg-bg border border-border rounded-lg overflow-x-auto shadow-2xs"
                                    tableStyle={{ width: `${verTableWidth}px`, minWidth: '100%' }}
                                    tableClassName="w-full text-xs text-left border-collapse table-fixed"
                                  >
                                    <colgroup>
                                      <col style={{ width: verWidths.revision }} />
                                      <col style={{ width: verWidths.fileName }} />
                                      <col style={{ width: verWidths.fileSize }} />
                                      <col style={{ width: verWidths.uploadedBy }} />
                                      <col style={{ width: verWidths.remarks }} />
                                      <col style={{ width: verWidths.actions }} />
                                    </colgroup>
                                    <thead>
                                      <tr className="bg-surface/60 border-b border-border text-2xs font-semibold text-text-muted">
                                        <Th {...getVerResizeProps('revision')} className="py-2.5 px-3">REVISION</Th>
                                        <Th {...getVerResizeProps('fileName')} className="py-2.5 px-3">FILE NAME</Th>
                                        <Th {...getVerResizeProps('fileSize')} className="py-2.5 px-3">SIZE</Th>
                                        <Th {...getVerResizeProps('uploadedBy')} className="py-2.5 px-3">UPLOADED BY / DATE</Th>
                                        <Th {...getVerResizeProps('remarks')} className="py-2.5 px-3">CHANGE REMARKS</Th>
                                        <Th {...getVerResizeProps('actions')} className="py-2.5 px-3 text-right">ACTION</Th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                      {versions.map((ver) => (
                                        <tr key={ver.versionId} className="hover:bg-surface/40 transition-colors">
                                          <Td style={{ width: verWidths.revision }} className="py-2.5 px-3 whitespace-nowrap">
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
                                          </Td>

                                          <Td style={{ width: verWidths.fileName }} className="py-2.5 px-3 font-mono text-heading">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setPreviewItem({
                                                  ...ver,
                                                  documentTitle: doc.documentTitle,
                                                  documentTypeId: doc.documentTypeId,
                                                })
                                              }
                                              className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-left group/verfile focus:outline-none w-full min-w-0"
                                              title={`Click to view ${ver.fileName}`}
                                            >
                                              {renderFileExtIcon(ver.fileExtension)}
                                              <span
                                                className="truncate w-full min-w-0 group-hover/verfile:underline"
                                                title={ver.fileName}
                                              >
                                                {ver.fileName}
                                              </span>
                                              <IconView size={12} className="text-text-muted/50 group-hover/verfile:text-primary shrink-0 opacity-0 group-hover/verfile:opacity-100 transition-opacity" />
                                            </button>
                                          </Td>

                                          <Td style={{ width: verWidths.fileSize }} className="py-2.5 px-3 font-mono tabular-nums text-text-muted whitespace-nowrap">
                                            {formatFileSizeKB(ver.fileSizeKB)}
                                          </Td>

                                          <Td style={{ width: verWidths.uploadedBy }} className="py-2.5 px-3 font-mono text-2xs text-text-muted tabular-nums whitespace-nowrap">
                                            <div className="font-medium text-heading/90 truncate w-full min-w-0" title={ver.uploadedBy}>{ver.uploadedBy}</div>
                                            <div>{formatDate(ver.uploadedOn)}</div>
                                          </Td>

                                          <Td style={{ width: verWidths.remarks }} className="py-2.5 px-3 text-text overflow-hidden">
                                            <span className="block truncate w-full min-w-0" title={ver.changeRemarks || '—'}>
                                              {ver.changeRemarks || '—'}
                                            </span>
                                          </Td>

                                          <Td
                                            style={{ width: verWidths.actions, minWidth: MIN_VER_WIDTHS.actions }}
                                            className="py-2.5 px-3 text-right whitespace-nowrap overflow-hidden"
                                          >
                                            <div className="flex items-center justify-end gap-1.5 shrink-0">
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
                                                  className="text-xs font-semibold text-text hover:text-primary hover:border-primary/40 bg-surface border border-border shadow-2xs h-7 px-2 inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                  <IconView size={13} className="text-text-muted shrink-0" />
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
                                                  className="text-xs font-semibold text-text hover:text-primary hover:border-primary/40 bg-surface border border-border shadow-2xs h-7 px-2 inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                  <IconDownload size={13} className="text-text-muted shrink-0" />
                                                  <span>Download</span>
                                                </Button>
                                              </div>
                                            </Td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </TableContainer>
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
        </div>

        {/* ── RIGHT COLUMN: Assignment, Lifecycle Audit & Activity Timeline (xl:col-span-4) ── */}
        <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-6">
          {/* Assignment & Lifecycle Card */}
          <Card padding="md" className="bg-bg shadow-2xs">
            <div className="border-b border-border pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconUserCheck size={17} className="text-primary shrink-0" />
                <span>Assignment & Lifecycle</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {isAssigned ? 'Reassign' : 'Assign User'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Assignee Box */}
              <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="view-field-label">Current Assignee</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {assigneeName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-heading truncate">
                      {assigneeName}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="text-xs text-primary hover:bg-primary/10 shrink-0"
                >
                  {isAssigned ? 'Change' : 'Assign'}
                </Button>
              </div>

              {/* Audit Fields 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
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
                  label="Modified By"
                  value={inquiry.ModifiedBy || 'Ian Chesnut'}
                />
                <DetailField
                  label="Modified On"
                  value={formatDateTime(inquiry.ModifiedOn)}
                  mono
                />
              </div>
            </div>
          </Card>

          {/* Activity Timeline & Internal Notes */}
          <Card padding="md" className="bg-bg shadow-2xs flex flex-col">
            <div className="border-b border-border pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <IconActivity size={17} className="text-primary shrink-0" />
                <h3 className="text-heading font-semibold text-sm">Activity & Notes</h3>
                <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
                  {(inquiry.activity || []).length}
                </Badge>
              </div>
              <span className="text-2xs text-text-muted hidden sm:inline">
                Audit Trail
              </span>
            </div>

            {/* Add Comment Section */}
            <div className="mb-4 p-3 rounded-xl bg-surface/50 border border-border space-y-2.5">
              <Textarea
                id="inquiry-comment-input"
                label="Add Comment / Internal Note"
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a client note or update..."
                className="text-xs"
              />

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="font-mono text-2xs text-text-muted tabular-nums">
                  {commentText.length > 0 ? `${commentText.length} chars` : 'Internal only'}
                </span>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="text-xs font-semibold shadow-2xs h-7 px-2.5"
                >
                  <IconSend size={12} className="mr-1" />
                  {isSubmittingComment ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>

            {/* Scrollable Event Feed */}
            <div className="max-h-[460px] overflow-y-auto pr-1 overscroll-contain">
              <ActivityTimeline
                activities={inquiry.activity || []}
                emptyMessage="No activity events or comments logged for this inquiry yet."
              />
            </div>
          </Card>
        </div>
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
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getDocumentTypeById(previewItem.documentTypeId)?.badgeClass ||
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
                  <IconFileText size={32} className="text-danger" />
                ) : previewItem.fileExtension?.toLowerCase() === '.dwg' ||
                  previewItem.fileExtension?.toLowerCase() === '.dxf' ? (
                  <IconLayers size={32} className="text-primary" />
                ) : (
                  <IconDocumentTypes size={32} className="text-primary" />
                )}
              </div>

              <div className="space-y-1 max-w-md">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-success/10 text-success border border-success/20">
                  <IconShieldCheck size={14} /> Verified Document File
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
                <IconDownload size={14} className="mr-1.5" />
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
