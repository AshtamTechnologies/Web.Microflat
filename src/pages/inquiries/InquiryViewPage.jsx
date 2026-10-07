/**
 * InquiryViewPage.jsx — Full-page read-only view for an Inquiry record.
 *
 * Route: /inquiries/:id
 */

import { useState, useMemo } from 'react';
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
} from 'lucide-react';

import {
  Button,
  Badge,
  Card,
  ErrorBanner,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import ActivityTimeline from '../../components/ActivityTimeline';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';
import {
  getRegionName,
  getCategoryName,
  getStatusOption,
  getPriorityBadgeVariant,
  formatCurrencyINR,
} from '../../mocks/inquiries';
import {
  getDocumentType,
  formatFileSizeKB,
} from '../../mocks/inquiryDocuments';
import AssignInquiryModal from './components/AssignInquiryModal';
import ChangeStatusModal from './components/ChangeStatusModal';
import UploadDocumentModal from './components/UploadDocumentModal';

export default function InquiryViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const { getInquiryById } = useInquiriesContext();
  const { allUsers = [], users = [] } = useUsersContext();
  const { getDocumentsByInquiryId, getMissingMandatoryDocumentTypes } = useInquiryDocumentsContext();

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

  // Accordion state for document version history
  const [expandedDocIds, setExpandedDocIds] = useState(new Set());

  // Documents attached to this inquiry
  const inquiryDocuments = useMemo(() => {
    return inquiry ? getDocumentsByInquiryId(inquiry.id || inquiry.InquiryId) : [];
  }, [inquiry, getDocumentsByInquiryId]);

  // Missing mandatory document types
  const missingMandatoryTypes = useMemo(() => {
    return inquiry ? getMissingMandatoryDocumentTypes(inquiry.id || inquiry.InquiryId) : [];
  }, [inquiry, getMissingMandatoryDocumentTypes]);

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
              <span className="text-text-muted block mb-0.5">Source Channel</span>
              <span className="font-medium text-heading text-sm">
                {inquiry.Source || 'Website'}
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
                <p className="text-text bg-surface/40 p-3 rounded-lg border border-border leading-relaxed whitespace-pre-line">
                  {inquiry.Description}
                </p>
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

            <div>
              <span className="text-text-muted block mb-0.5">Sales Territory</span>
              <span className="font-medium text-heading text-sm">
                {getRegionName(inquiry.RegionId)}
              </span>
            </div>
          </div>
        </Card>

        {/* 3. Classification & Commercials */}
        <Card padding="md" className="bg-bg">
          <div className="border-b border-border pb-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-heading font-semibold text-sm">
              <Tags size={17} className="text-primary" />
              <span>3. Classification & Commercial Scope</span>
            </div>
            <span className="text-xs text-text-muted">Manufacturing Specs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <span className="text-text-muted block mb-0.5">Product Category</span>
              <span className="font-medium text-heading text-sm">
                {getCategoryName(inquiry.CategoryId)}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Quantity & UOM</span>
              <span className="font-mono tabular-nums font-bold text-heading text-sm">
                {inquiry.Quantity} {inquiry.UOM}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Estimated Commercial Value</span>
              <span className="font-mono tabular-nums font-bold text-primary text-sm flex items-center gap-0.5">
                {formatCurrencyINR(inquiry.EstimatedValue)}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Required By Date</span>
              <span className="font-mono tabular-nums font-medium text-heading text-sm flex items-center gap-1.5">
                <Calendar size={14} className="text-text-muted" />
                {inquiry.RequiredByDate || 'Not specified'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block mb-0.5">Priority Classification</span>
              <Badge variant={getPriorityBadgeVariant(inquiry.Priority)} className="text-[11px] px-2 py-0.5">
                {inquiry.Priority}
              </Badge>
            </div>
          </div>
        </Card>

        {/* 4. Assignment & Audit Card */}
        <Card padding="md" className="bg-bg">
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

      {/* ── SECTION 5: ACTIVITY TIMELINE HISTORY ── */}
      <Card padding="md" className="bg-bg">
        <div className="border-b border-border pb-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-heading font-semibold text-base">
            <ActivityIcon size={18} className="text-primary" />
            <span>Activity & Audit Trail</span>
          </div>
          <span className="text-xs text-text-muted">
            Chronological history of status shifts, reassignments & remarks
          </span>
        </div>

        <ActivityTimeline
          activities={inquiry.activity || []}
          emptyMessage="No activity events logged for this inquiry yet."
        />
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
                    <Th className="py-3 px-4 w-10 text-center"></Th>
                    <Th className="py-3 px-4">DOCUMENT TYPE</Th>
                    <Th className="py-3 px-4">DOCUMENT TITLE</Th>
                    <Th className="py-3 px-4">CURRENT REVISION</Th>
                    <Th className="py-3 px-4">FILE SIZE</Th>
                    <Th className="py-3 px-4">UPLOADED BY / DATE</Th>
                    <Th className="py-3 px-4 text-right">ACTIONS</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border bg-bg">
                  {inquiryDocuments.map((doc) => {
                    const docType = getDocumentType(doc.documentTypeId);
                    const isExpanded = expandedDocIds.has(doc.documentId);
                    const versions = doc.versions || [];
                    const currentVersion = versions.find((v) => v.isCurrent) || versions[0] || {};

                    return (
                      <tr key={doc.documentId} className="group">
                        <td colSpan={7} className="p-0">
                          {/* Main Row */}
                          <div className="flex items-center hover:bg-surface/50 transition-colors py-3 px-4 border-b border-border/50 text-xs">
                            {/* Expand / Collapse Button */}
                            <div className="w-10 flex justify-center shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleDocExpanded(doc.documentId)}
                                className="p-1 rounded-lg text-text-muted hover:text-heading hover:bg-surface transition-colors cursor-pointer"
                                title={isExpanded ? 'Collapse version history' : 'Expand version history'}
                              >
                                {isExpanded ? (
                                  <ChevronDown size={16} className="text-primary" />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                              </button>
                            </div>

                            {/* Document Type */}
                            <div className="w-36 shrink-0 px-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${docType.badgeClass}`}
                              >
                                {docType.typeName}
                              </span>
                            </div>

                            {/* Document Title */}
                            <div className="flex-1 min-w-[180px] px-2">
                              <span className="font-semibold text-heading text-sm block truncate">
                                {doc.documentTitle}
                              </span>
                              <span className="text-[11px] text-text-muted font-mono">
                                {versions.length} revision{versions.length > 1 ? 's' : ''} recorded
                              </span>
                            </div>

                            {/* Current Version File Name */}
                            <div className="w-56 shrink-0 px-2 flex items-center gap-2">
                              {renderFileExtIcon(currentVersion.fileExtension)}
                              <span className="font-mono text-xs text-heading font-medium truncate" title={currentVersion.fileName}>
                                {currentVersion.fileName}
                              </span>
                            </div>

                            {/* File Size */}
                            <div className="w-24 shrink-0 px-2 font-mono tabular-nums text-text-muted">
                              {formatFileSizeKB(currentVersion.fileSizeKB)}
                            </div>

                            {/* Uploaded By & On */}
                            <div className="w-48 shrink-0 px-2">
                              <span className="text-heading font-medium block truncate">
                                {currentVersion.uploadedBy || doc.createdBy}
                              </span>
                              <span className="font-mono text-[11px] text-text-muted tabular-nums">
                                {currentVersion.uploadedOn || doc.createdOn}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="w-28 shrink-0 px-2 flex items-center justify-end gap-1">
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
                            </div>
                          </div>

                          {/* Nested Version History Accordion Drawer */}
                          {isExpanded && (
                            <div className="bg-surface/30 p-4 border-b border-border/80 pl-14 space-y-2 animate-in fade-in duration-100">
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
                                          <div className="flex items-center gap-1.5">
                                            {renderFileExtIcon(ver.fileExtension)}
                                            <span className="truncate max-w-[220px]" title={ver.fileName}>
                                              {ver.fileName}
                                            </span>
                                          </div>
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
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toast('This is a mock — no file is actually stored.')}
                                            title="Download attachment (Mock)"
                                            className="text-xs text-text-muted hover:text-primary h-7 px-2"
                                          >
                                            <Download size={13} className="mr-1" />
                                            Download
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableContainer>
            </div>
          )}
        </Card>
      </div>

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
