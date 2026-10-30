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
  CollapsibleCard,
  DetailField,
  ErrorBanner,
  TableContainer,
  Th,
  Td,
  Modal,
  PageHeader,
  RichTextEditor,
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
  product: 220,
  variant: 180,
  quantity: 85,

  notes: 240,
};

const MIN_ITEM_WIDTHS = {
  index: 40,
  product: 120,
  variant: 100,
  quantity: 60,

  notes: 120,
};

const INITIAL_DOC_WIDTHS = {
  expander: 36,
  docType: 100,
  docTitle: 190,
  revision: 160,
  actions: 95,
};

const MIN_DOC_WIDTHS = {
  expander: 36,
  docType: 70,
  docTitle: 110,
  revision: 90,
  actions: 75,
};

const INITIAL_VER_WIDTHS = {
  revision: 80,
  fileName: 150,
  remarks: 160,
  actions: 95,
};

const MIN_VER_WIDTHS = {
  revision: 60,
  fileName: 90,
  remarks: 90,
  actions: 75,
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

  // Comment state (Rich Text)
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

  // Safe string getter for commentText (handles both string and event object)
  const commentString = typeof commentText === 'string' ? commentText : commentText?.target?.value || '';

  // Character count stripping HTML tags
  const commentTextLength = useMemo(() => {
    return (commentString || '').replace(/<[^>]*>/g, '').trim().length;
  }, [commentString]);

  const handleCommentChange = useCallback((e) => {
    const val = typeof e === 'string' ? e : e?.target?.value ?? '';
    setCommentText(val);
  }, []);

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
    const textStr = typeof commentText === 'string' ? commentText : commentText?.target?.value || '';
    const stripped = textStr.replace(/<[^>]*>/g, '').trim();
    if (!stripped || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const result = addInquiryComment(inquiry.id || inquiry.InquiryId, textStr);
      if (result?.ok) {
        setCommentText('');
        toast.success('Internal note posted');
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

  const statusInfo = getStatusOption(inquiry.Status);
  const assigneeName = resolveUserName(inquiry.AssignedTo);
  const isAssigned = Boolean(inquiry.AssignedTo);
  const renderDocumentsSection = () => (
    <div className="space-y-4">
      {/* Missing Mandatory Documents Banner */}
      {missingMandatoryTypes.length > 0 && (
        <ErrorBanner
          variant="warning"
          message={`Missing required documents: ${missingMandatoryTypes.map((t) => t.typeName).join(', ')}`}
        />
      )}

      {/* Documents Card */}
      <Card padding="md" className="bg-bg shadow-2xs space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-heading font-semibold text-sm">
            <IconAttachment size={17} className="text-primary shrink-0" />
            <span>Documents & Attachments</span>
            <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5 ml-1">
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
            className="text-xs font-semibold shadow-2xs h-8 px-2.5"
          >
            <IconAdd size={14} className="mr-1" />
            Upload
          </Button>
        </div>

        {/* Document list or empty state */}
        {inquiryDocuments.length === 0 ? (
          <div className="py-8 px-4 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/20 space-y-2.5">
            <IconAttachment size={22} className="mx-auto text-text-muted/60" />
            <div>
              <p className="font-semibold text-heading text-xs">No documents attached yet</p>
              <p className="mt-0.5 text-2xs">Upload customer RFQs, engineering drawings, or technical specifications.</p>
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
              className="text-xs mt-1"
            >
              <IconAdd size={13} className="mr-1" />
              Upload Attachment
            </Button>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-border overscroll-contain bg-bg">
            <TableContainer
              className="border-0 rounded-none overflow-visible"
              tableStyle={{ width: `${Math.max(docTableWidth, 100)}px`, minWidth: '100%' }}
              tableClassName="w-full text-xs text-left border-collapse table-fixed"
            >
              <colgroup>
                <col style={{ width: docWidths.expander }} />
                <col style={{ width: docWidths.docType }} />
                <col style={{ width: docWidths.docTitle }} />
                <col style={{ width: docWidths.revision }} />
                <col style={{ width: docWidths.actions }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-surface border-b border-border shadow-2xs">
                <tr className="text-left">
                  <Th {...getDocResizeProps('expander')} className="py-2.5 px-2 text-center"></Th>
                  <Th {...getDocResizeProps('docType')} className="py-2.5 px-3 whitespace-nowrap">TYPE</Th>
                  <Th {...getDocResizeProps('docTitle')} className="py-2.5 px-3">DOCUMENT TITLE</Th>
                  <Th {...getDocResizeProps('revision')} className="py-2.5 px-3">CURRENT REVISION</Th>
                  <Th {...getDocResizeProps('actions')} className="py-2.5 px-3 text-right whitespace-nowrap">ACTION</Th>
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
                        <Td style={{ width: docWidths.expander }} className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleDocExpanded(doc.documentId)}
                            className="p-1 rounded-lg text-text-muted hover:text-heading hover:bg-surface transition-colors cursor-pointer inline-flex items-center justify-center"
                            title={isExpanded ? 'Collapse version history' : 'Expand version history'}
                          >
                            {isExpanded ? (
                              <IconChevronDown size={15} className="text-primary" />
                            ) : (
                              <IconChevronRight size={15} />
                            )}
                          </button>
                        </Td>

                        {/* Document Type */}
                        <Td style={{ width: docWidths.docType }} className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                            {docType?.documentTypeName || docType?.typeName || 'Document'}
                          </span>
                        </Td>

                        {/* Document Title */}
                        <Td style={{ width: docWidths.docTitle }} className="py-2.5 px-3">
                          <span className="font-semibold text-heading text-xs block truncate w-full min-w-0" title={doc.documentTitle}>
                            {doc.documentTitle}
                          </span>
                          <span className="text-2xs text-text-muted font-mono block mt-0.5">
                            {versions.length} rev{versions.length > 1 ? 's' : ''}
                          </span>
                        </Td>

                        {/* Current Version File Name (Click to open preview) */}
                        <Td style={{ width: docWidths.revision }} className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewItem({
                                ...currentVersion,
                                documentTitle: doc.documentTitle,
                                documentTypeId: doc.documentTypeId,
                              })
                            }
                            className="flex items-center gap-1.5 group/file hover:text-primary transition-colors cursor-pointer text-left w-full min-w-0 focus:outline-none"
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

                        {/* Actions */}
                        <Td style={{ width: docWidths.actions }} className="py-2.5 px-3 text-right whitespace-nowrap">
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
                            className="text-xs font-semibold text-primary border-primary/30 hover:border-primary hover:bg-primary/10 bg-surface shadow-2xs h-7 px-2 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            <IconUpload size={12} className="shrink-0 text-primary" />
                            <span>New Rev</span>
                          </Button>
                        </Td>
                      </tr>

                      {/* Nested Version History Accordion Drawer */}
                      {isExpanded && (
                        <tr className="bg-surface/30">
                          <td colSpan={5} className="p-0 border-b border-border/80">
                            <div className="p-2.5 sm:p-3 space-y-2 animate-in fade-in duration-100">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                                <span className="text-xs font-bold text-heading flex items-center gap-1.5 min-w-0">
                                  <IconClock size={13} className="text-text-muted shrink-0" />
                                  <span className="truncate">Version History for &quot;{doc.documentTitle}&quot;</span>
                                </span>
                                <span className="text-2xs text-text-muted shrink-0">
                                  Newest revisions first
                                </span>
                              </div>

                              <TableContainer
                                className="bg-bg border border-border rounded-lg shadow-2xs overflow-x-auto"
                                tableStyle={{ width: `${Math.max(verTableWidth, 100)}px`, minWidth: '100%' }}
                                tableClassName="w-full text-xs text-left border-collapse table-fixed"
                              >
                                <colgroup>
                                  <col style={{ width: verWidths.revision }} />
                                  <col style={{ width: verWidths.fileName }} />
                                  <col style={{ width: verWidths.remarks }} />
                                  <col style={{ width: verWidths.actions }} />
                                </colgroup>
                                <thead>
                                  <tr className="bg-surface/60 border-b border-border text-2xs font-semibold text-text-muted">
                                    <Th {...getVerResizeProps('revision')} className="py-2 px-2.5">REVISION</Th>
                                    <Th {...getVerResizeProps('fileName')} className="py-2 px-2.5">FILE NAME</Th>
                                    <Th {...getVerResizeProps('remarks')} className="py-2 px-2.5">CHANGE REMARKS</Th>
                                    <Th {...getVerResizeProps('actions')} className="py-2 px-2.5 text-right">ACTION</Th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {versions.map((ver) => (
                                    <tr key={ver.versionId} className="hover:bg-surface/40 transition-colors">
                                      <Td style={{ width: verWidths.revision }} className="py-2 px-2.5 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono font-bold text-heading text-xs">
                                            v{ver.versionNo}
                                          </span>
                                          {ver.isCurrent && (
                                            <Badge variant="success" className="text-2xs px-1.5 py-0">
                                              Current
                                            </Badge>
                                          )}
                                        </div>
                                      </Td>

                                      <Td style={{ width: verWidths.fileName }} className="py-2 px-2.5 font-mono text-heading">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewItem({
                                              ...ver,
                                              documentTitle: doc.documentTitle,
                                              documentTypeId: doc.documentTypeId,
                                            })
                                          }
                                          className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer text-left group/verfile focus:outline-none w-full min-w-0"
                                          title={`Click to view ${ver.fileName}`}
                                        >
                                          {renderFileExtIcon(ver.fileExtension)}
                                          <span
                                            className="truncate w-full min-w-0 group-hover/verfile:underline text-xs"
                                            title={ver.fileName}
                                          >
                                            {ver.fileName}
                                          </span>
                                          <IconView size={12} className="text-text-muted/50 group-hover/verfile:text-primary shrink-0 opacity-0 group-hover/verfile:opacity-100 transition-opacity" />
                                        </button>
                                      </Td>

                                      <Td style={{ width: verWidths.remarks }} className="py-2 px-2.5 text-text overflow-hidden">
                                        <span className="block truncate w-full min-w-0 text-xs" title={ver.changeRemarks || '—'}>
                                          {ver.changeRemarks || '—'}
                                        </span>
                                      </Td>

                                      <Td
                                        style={{ width: verWidths.actions, minWidth: MIN_VER_WIDTHS.actions }}
                                        className="py-2 px-2.5 text-right whitespace-nowrap overflow-hidden"
                                      >
                                        <div className="flex items-center justify-end gap-1 shrink-0">
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
                                            title="View attachment"
                                            className="text-xs font-semibold text-text hover:text-primary hover:border-primary/40 bg-surface border border-border shadow-2xs h-7 px-2 inline-flex items-center gap-1 cursor-pointer"
                                          >
                                            <IconView size={12} className="text-text-muted shrink-0" />
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
                                            className="text-xs font-semibold text-text hover:text-primary hover:border-primary/40 bg-surface border border-border shadow-2xs h-7 px-1.5 inline-flex items-center cursor-pointer"
                                          >
                                            <IconDownload size={13} className="text-text-muted shrink-0" />
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
          </div>
        )}
      </Card>
    </div>
  );

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
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={statusInfo?.badgeVariant || statusInfo?.variant || 'neutral'}
              size="md"
              className="capitalize font-semibold"
            >
              {statusInfo?.name || inquiry.Status || 'Status'}
            </Badge>

            {inquiry.Priority && (
              <Badge
                variant={getPriorityBadgeVariant(inquiry.Priority)}
                size="md"
                className="font-medium"
              >
                {inquiry.Priority} Priority
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              className="text-xs"
            >
              <IconRefresh size={14} className="mr-1.5" />
              Change Status
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAssignModalOpen(true)}
              className="text-xs"
            >
              <IconUserCheck size={14} className="mr-1.5" />
              {isAssigned ? 'Reassign' : 'Assign'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate(`/inquiries/${id}/edit`)}
              className="text-xs shadow-2xs"
            >
              <IconEdit size={14} className="mr-1.5" />
              Edit Inquiry
            </Button>
          </div>
        }
      />

      {/* ── 2-Column Responsive Workspace Layout (Left: Main Details & Rich Note / Right: Assignment, Documents & Activity) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: Core Inquiry Data, Products & Add Comment (xl:col-span-6) ── */}
        <div className="xl:col-span-6 space-y-6">
          {/* 1. Combined Customer Profile & Inquiry Master Details Card */}
          <Card padding="md" className="bg-bg shadow-2xs">
            {/* Header */}
            <div className="border-b border-border pb-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconBuilding2 size={17} className="text-primary shrink-0" />
                <span>Customer & Inquiry Details</span>
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
                  {inquiry.Address && (
                    <div className="sm:col-span-2">
                      <span className="view-field-label">Customer Address</span>
                      <div className="flex items-start gap-1.5 mt-0.5 text-xs text-text bg-surface/50 p-2.5 rounded-lg border border-border">
                        <IconLocation size={14} className="text-text-muted shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{inquiry.Address}</span>
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
                <span>Product Selection</span>
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
                            <span className="text-2xs uppercase font-semibold text-text-muted block">Product</span>
                            <span className="font-semibold text-xs text-heading leading-snug">
                              {item.productName || item.itemName || '—'}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-semibold text-heading bg-surface border border-border px-2 py-0.5 rounded-md text-2xs shrink-0">
                          {item.isCustomSize ? (item.customSize ? `${item.customSize} (Custom)` : 'Custom Size') : (item.variantName || '—')}
                        </span>
                      </div>

                      {item.specification && item.specification !== '—' && (
                        <div className="text-xs text-text-muted bg-surface/50 p-2.5 rounded-lg border border-border/60 pl-3">
                          <span className="text-2xs uppercase font-semibold text-text-muted block mb-0.5">Notes</span>
                          <span className="leading-relaxed">{item.notes || item.specification}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                        <span className="text-text-muted">Quantity:</span>
                        <span className="font-mono font-bold text-heading bg-surface px-2.5 py-0.5 rounded border border-border">
                          {item.quantity}
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
                    <col style={{ width: itemWidths.product }} />
                    <col style={{ width: itemWidths.variant }} />
                    <col style={{ width: itemWidths.quantity }} />

                    <col style={{ width: itemWidths.notes }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <Th {...getItemResizeProps('index')} className="text-center text-xs py-2.5">#</Th>
                      <Th {...getItemResizeProps('product')} className="text-xs py-2.5">PRODUCT</Th>
                      <Th {...getItemResizeProps('variant')} className="text-xs py-2.5">SIZE / VARIANT</Th>
                      <Th {...getItemResizeProps('quantity')} className="text-center text-xs py-2.5">QTY</Th>

                      <Th {...getItemResizeProps('notes')} className="text-xs py-2.5">NOTES</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {inquiryItems.length > 0 ? (
                      inquiryItems.map((item, idx) => (
                        <tr key={item.prItemId || item.id || idx} className="hover:bg-surface/60 transition-colors">
                          <Td style={{ width: itemWidths.index }} className="text-center font-mono text-text-muted py-2.5 whitespace-nowrap">{idx + 1}</Td>
                          <Td style={{ width: itemWidths.product }} className="font-bold text-heading text-xs py-2.5">
                            <span className="block truncate w-full min-w-0" title={item.productName || item.itemName}>
                              {item.productName || item.itemName || '—'}
                            </span>
                            {item.technicalDetails && (
                              <span className="text-2xs text-text-muted font-normal block truncate" title={item.technicalDetails}>
                                {item.technicalDetails}
                              </span>
                            )}
                          </Td>
                          <Td style={{ width: itemWidths.variant }} className="text-xs text-text py-2.5">
                            <span className="block truncate w-full min-w-0">
                              {item.isCustomSize
                                ? (item.customSize ? `${item.customSize} (Custom)` : 'Custom Size')
                                : (item.variantName || item.size || '—')}
                            </span>
                          </Td>
                          <Td style={{ width: itemWidths.quantity }} className="text-center font-mono font-bold text-heading text-xs py-2.5 whitespace-nowrap">{item.quantity}</Td>

                          <Td style={{ width: itemWidths.notes }} className="text-text-muted py-2.5">
                            <span className="block truncate w-full min-w-0" title={item.notes || item.specification || '—'}>
                              {item.notes || item.specification || '—'}
                            </span>
                          </Td>
                          {false && (<>
                          <Td className="hidden">
                            <span className="block truncate w-full min-w-0" title={item.categoryName || getCategoryPathName(item.categoryId || inquiry.CategoryId, categories)}>
                              {item.productName || item.itemName || '—'}
                            </span>
                          </Td>
                          <Td style={{ width: itemWidths.itemCode }} className="py-2.5 whitespace-nowrap">
                            <span className="font-mono font-semibold text-heading bg-surface border border-border px-2 py-0.5 rounded-md text-xs">
                              {item.isCustomSize ? (item.customSize ? `${item.customSize} (Custom)` : 'Custom Size') : (item.variantName || '—')}
                            </span>
                          </Td>
                          <Td style={{ width: itemWidths.specification }} className="text-text-muted py-2.5">
                            <span className="block truncate w-full min-w-0" title={item.specification || '—'}>
                              {item.specification || '—'}
                            </span>
                          </Td>
                          <Td style={{ width: itemWidths.quantity }} className="text-right font-mono font-bold text-heading text-xs py-2.5 whitespace-nowrap">{item.quantity}</Td>
                          </>)}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <Td colSpan={5} className="text-center py-6 text-text-muted italic">
                          No items added to inquiry yet.
                        </Td>
                      </tr>
                    )}
                  </tbody>
                </TableContainer>
              </div>
            </div>
          </Card>

          {/* Mobile Only: Documents & Attachments (shown right after Product Selection on screens < xl) */}
          <div className="xl:hidden">
            {renderDocumentsSection()}
          </div>

          {/* 3. Add Comment / Internal Note Card (Rich Text Editor) */}
          <Card padding="md" className="bg-bg space-y-4 shadow-2xs">
            <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconMessageSquare size={17} className="text-primary shrink-0" />
                <span>Add Comment / Internal Note</span>
              </div>
              <span className="text-xs text-text-muted">Rich Text Editor &bull; Visible in Audit Trail</span>
            </div>

            <div className="space-y-3">
              <RichTextEditor
                value={commentString}
                onChange={handleCommentChange}
                placeholder="Write detailed notes, customer meeting minutes, technical specifications, or team remarks..."
                minHeight="min-h-[140px]"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="font-mono text-2xs tabular-nums">
                    {commentTextLength > 0 ? `${commentTextLength} characters` : '0 characters'}
                  </span>
                  <span className="text-2xs text-text-muted hidden sm:inline">
                    Notes are logged into the Activity & Notes timeline on the right
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={commentTextLength === 0 || isSubmittingComment}
                    className="text-xs font-semibold shadow-2xs h-8 px-3.5"
                  >
                    <IconSend size={13} className="mr-1.5" />
                    {isSubmittingComment ? 'Posting Note...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* 4. Assignment & Lifecycle Card (Collapsible, collapsed by default) */}
          <CollapsibleCard
            title="Assignment & Lifecycle"
            icon={<IconUserCheck size={17} />}
            defaultOpen={false}
            className="bg-bg shadow-2xs"
            actions={
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                {isAssigned ? 'Reassign' : 'Assign User'}
              </button>
            }
          >
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
          </CollapsibleCard>
        </div>

        {/* ── RIGHT COLUMN: Documents & Attachments, Activity Timeline (xl:col-span-6) ── */}
        <div className="xl:col-span-6 space-y-6">
          {/* Desktop Only: Documents & Attachments (shown here on screens >= xl) */}
          <div className="hidden xl:block">
            {renderDocumentsSection()}
          </div>

          {/* Activity Timeline Card */}
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

            {/* Scrollable Event Feed */}
            <div className="max-h-[500px] overflow-y-auto pr-1 overscroll-contain">
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
