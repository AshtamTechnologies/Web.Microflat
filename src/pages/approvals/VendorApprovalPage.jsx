/**
 * VendorApprovalPage — Dedicated review and approval queue for pending vendors & approval history.
 *
 * Implements Vendor Approval APIs Guide (Oct 29, 2026):
 *   - Tab 1: Pending Approvals (To-do queue via GET /api/approval-requests/pending)
 *   - Tab 2: Approval History (Decided requests via GET /api/approval-requests/history)
 *   - Summary counters (GET /api/approval-requests/summary)
 *   - Request Timeline modal (GET /api/approval-requests/{id}/history)
 *   - Document Verification step (POST /api/approval-requests/{id}/verify-documents)
 *   - Approve (POST /api/approval-requests/{id}/approve)
 *   - Reject (POST /api/approval-requests/{id}/reject with mandatory comments)
 *   - Cancel / Withdraw (POST /api/approval-requests/{id}/cancel)
 *   - RBAC & self-approval check
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconCheck,
  IconClock,
  IconClose,
  IconDownload,
  IconFileText,
  IconLocation,
  IconSuccess,
  IconBuilding,
  IconError,
  IconUser,
  IconVendorApproval,
  IconView,
  IconHistory,
  IconShieldCheck,
  IconRefresh,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Modal,
  Badge,
  PageHeader,
  Textarea,
  DataTable,
  TableToolbar,
  Checkbox,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { useAuthContext } from '../../context/AuthContext';
import { approvalsService, vendorService } from '../../services';
import { getStateName } from '../../mocks/vendors';
import { formatDate } from '../../utils/dateUtils';
import {
  ApprovalStatus,
  ApprovalStatusLabel,
  getApprovalBadgeVariant,
  getApprovalStatusLabel,
  normalizeApprovalStatus,
} from '../../constants/approvalStatus';

const columnHelper = createColumnHelper();

function formatAuditTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formattedHours}:${minutes} ${ampm}`;
}

export default function VendorApprovalPage() {
  const navigate = useNavigate();
  const { allVendors, refreshVendors } = useVendorsContext();
  const { user } = useAuthContext();

  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'HISTORY'
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Approvals Data
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [summaryCounts, setSummaryCounts] = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Modal States - Approve
  const [vendorToApprove, setVendorToApprove] = useState(null);
  const [approveComments, setApproveComments] = useState('');
  const [isDocVerified, setIsDocVerified] = useState(false);
  const [vendorHasDocs, setVendorHasDocs] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Modal States - Reject
  const [vendorToReject, setVendorToReject] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Modal States - Verify Documents
  const [reqToVerifyDocs, setReqToVerifyDocs] = useState(null);
  const [verifyDocsComments, setVerifyDocsComments] = useState('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // Modal States - Timeline
  const [timelineReq, setTimelineReq] = useState(null);
  const [timelineSteps, setTimelineSteps] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // User Role Checks
  const userRole = (user?.role || user?.roleName || user?.roles?.[0]?.name || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const isSuperAdmin = userRole.includes('super');

  /* ── Load Summary Counters ── */
  const fetchSummary = useCallback(async () => {
    try {
      const summary = await approvalsService.getApprovalSummary({ mine: false });
      if (summary) {
        setSummaryCounts(summary);
      }
    } catch (err) {
      console.warn('Could not load approval summary:', err);
    }
  }, []);

  /* ── Load Queue Data ── */
  const loadApprovalsData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'PENDING') {
        const res = await approvalsService.getPendingApprovals({ moduleCode: 'vendor', mine: true });
        if (res && Array.isArray(res.items)) {
          setPendingRequests(res.items);
        }
      } else {
        const res = await approvalsService.getApprovalHistory({ moduleCode: 'vendor', mine: true });
        if (res && Array.isArray(res.items)) {
          setHistoryRequests(res.items);
        }
      }
      fetchSummary();
    } catch (err) {
      console.warn('Could not fetch approvals data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, fetchSummary]);

  useEffect(() => {
    loadApprovalsData();
  }, [loadApprovalsData]);

  // Reset pagination when tab or search changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [activeTab, search]);

  /* ── Augment requests with vendor context details ── */
  const activeRequests = useMemo(() => {
    const rawList = activeTab === 'PENDING' ? pendingRequests : historyRequests;

    return rawList.map((req) => {
      const vMatch = allVendors.find(
        (v) =>
          String(v.id) === String(req.referenceId) ||
          String(v.vendorId) === String(req.referenceId) ||
          (v.vendorName && req.referenceTitle && v.vendorName.toLowerCase() === req.referenceTitle.toLowerCase())
      );

      const numericStatus = normalizeApprovalStatus(req.status ?? req.approvalStatus);

      let vendorCode = vMatch?.vendorCode || req.vendorCode || '';
      let vendorName = vMatch?.vendorName || req.referenceTitle || 'Unknown Vendor';
      if ((!vendorCode || vendorCode === '—') && req.referenceTitle && req.referenceTitle.includes(' - ')) {
        const parts = req.referenceTitle.split(' - ');
        vendorCode = parts[0].trim();
        vendorName = parts.slice(1).join(' - ').trim();
      }

      return {
        ...req,
        id: req.id || req.approvalRequestId,
        approvalRequestId: req.id || req.approvalRequestId,
        referenceId: req.referenceId || vMatch?.id,
        vendorId: req.referenceId || vMatch?.id,
        vendorName,
        vendorCode: vendorCode || '—',
        contactPersonName: vMatch?.contactPersonName || req.contactPersonName || '',
        city: vMatch?.city || req.city || '',
        countryId: vMatch?.countryId || 2,
        stateId: vMatch?.stateId || '',
        effectiveDate: req.initiatedOn || vMatch?.effectiveDate || '',
        status: numericStatus,
        approvalStatus: numericStatus,
      };
    });
  }, [activeTab, pendingRequests, historyRequests, allVendors]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeRequests;

    return activeRequests.filter((v) => {
      return (
        v.vendorName?.toLowerCase().includes(q) ||
        v.vendorCode?.toLowerCase().includes(q) ||
        v.contactPersonName?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.actionedByName?.toLowerCase().includes(q)
      );
    });
  }, [activeRequests, search]);

  /* ── Open & Close Modals ── */
  async function handleOpenApprove(row) {
    setVendorToApprove(row);
    setApproveComments('');
    setIsDocVerified(false);
    setVendorHasDocs(false);

    const reqId = row.approvalRequestId || row.id;
    if (Array.isArray(row.attachments) && row.attachments.length > 0) {
      setVendorHasDocs(true);
    } else if (reqId) {
      try {
        const detail = await approvalsService.getApprovalRequest(reqId);
        const atts = detail?.vendorDetail?.attachments || [];
        setVendorHasDocs(atts.length > 0);
      } catch (err) {
        console.warn('Could not inspect attachments for approval:', err);
      }
    }
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setVendorToApprove(null);
    setApproveComments('');
    setVendorHasDocs(false);
  }

  function handleOpenReject(row) {
    setVendorToReject(row);
    setRejectComments('');
  }

  function handleCloseReject() {
    if (isSubmittingReject) return;
    setVendorToReject(null);
    setRejectComments('');
  }

  function handleOpenVerifyDocs(row) {
    setReqToVerifyDocs(row);
    setVerifyDocsComments('');
  }

  function handleCloseVerifyDocs() {
    if (isSubmittingVerify) return;
    setReqToVerifyDocs(null);
    setVerifyDocsComments('');
  }

  async function handleOpenTimeline(row) {
    setTimelineReq(row);
    setIsLoadingTimeline(true);
    setTimelineSteps([]);
    try {
      const steps = await approvalsService.getRequestTimeline(row.approvalRequestId || row.id);
      setTimelineSteps(Array.isArray(steps) ? steps : []);
    } catch (err) {
      console.warn('Could not fetch request timeline:', err);
      toast.error('Failed to load request timeline.');
    } finally {
      setIsLoadingTimeline(false);
    }
  }

  /* ── Confirm Approve ── */
  async function handleConfirmApprove(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!vendorToApprove) return;

    try {
      setIsSubmittingApprove(true);
      const reqId = vendorToApprove.approvalRequestId || vendorToApprove.id;

      await approvalsService.approveRequest(reqId, {
        comments: approveComments.trim(),
        // Send true only if documents were present and verified; otherwise send false
        isDocumentVerified: vendorHasDocs ? Boolean(isDocVerified) : false,
      });

      toast.success(`${vendorToApprove.vendorName} approved successfully.`);
      handleCloseApprove();
      loadApprovalsData();
      refreshVendors?.();
    } catch (err) {
      if (err?.status === 403) {
        toast.error('You are not allowed to approve this request.');
      } else if (err?.status === 409) {
        toast.error('Someone else already decided or cancelled this request.');
        handleCloseApprove();
        loadApprovalsData();
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
    if (!vendorToReject || !rejectComments.trim()) {
      toast.error('Rejection reason comments are required.');
      return;
    }

    try {
      setIsSubmittingReject(true);
      const reqId = vendorToReject.approvalRequestId || vendorToReject.id;

      await approvalsService.rejectRequest(reqId, {
        comments: rejectComments.trim(),
      });

      toast.success(`${vendorToReject.vendorName} rejected.`);
      handleCloseReject();
      loadApprovalsData();
      refreshVendors?.();
    } catch (err) {
      if (err?.status === 403) {
        toast.error('You are not allowed to reject this request.');
      } else if (err?.status === 409) {
        toast.error('Someone else already decided or cancelled this request.');
        handleCloseReject();
        loadApprovalsData();
      } else {
        toast.error(err?.detail || err?.message || 'Failed to reject vendor.');
      }
    } finally {
      setIsSubmittingReject(false);
    }
  }

  /* ── Confirm Verify Documents ── */
  async function handleConfirmVerifyDocs(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!reqToVerifyDocs) return;

    try {
      setIsSubmittingVerify(true);
      const reqId = reqToVerifyDocs.approvalRequestId || reqToVerifyDocs.id;

      await approvalsService.verifyDocuments(reqId, verifyDocsComments.trim());

      toast.success('Documents marked as verified.');
      handleCloseVerifyDocs();
      loadApprovalsData();
    } catch (err) {
      if (err?.status === 403) {
        toast.error('Only Admin users can verify documents.');
      } else {
        toast.error(err?.detail || err?.message || 'Failed to verify documents.');
      }
    } finally {
      setIsSubmittingVerify(false);
    }
  }

  /* ── Download Attachments for Approval Request ── */
  async function handleDownloadAttachments(row) {
    const reqId = row.approvalRequestId || row.id;
    try {
      const fullReq = await approvalsService.getApprovalRequest(reqId);
      const attachments = fullReq?.attachments || fullReq?.vendorDetail?.attachments || [];
      if (!attachments || attachments.length === 0) {
        toast.info('No documents attached for this vendor.');
        return;
      }
      for (const att of attachments) {
        await vendorService.downloadAttachment(att.id, att.fileName || 'document');
      }
      toast.success(`Downloaded ${attachments.length} document(s).`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download documents.');
    }
  }

  /* ── Table Columns ── */
  const columns = useMemo(() => {
    const isHistory = activeTab === 'HISTORY';

    return [
      /* 1. VENDOR CODE */
      columnHelper.accessor('vendorCode', {
        header: 'VENDOR CODE',
        minSize: 130,
        size: 140,
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {info.getValue() || '—'}
          </span>
        ),
      }),

      /* 2. VENDOR NAME & CONTACT PERSON */
      columnHelper.accessor('vendorName', {
        header: 'VENDOR & CONTACT',
        minSize: 260,
        size: 320,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <button
                type="button"
                onClick={() => {
                  const reqId = row.approvalRequestId || row.id;
                  navigate(`/approvals/vendors/${reqId}`);
                }}
                className="font-semibold text-heading text-sm leading-snug text-left hover:text-primary transition-colors cursor-pointer"
                title={`View ${row.vendorName} details`}
              >
                {row.vendorName}
              </button>
              {/* OLD_NAME */}
              <span className="hidden" style={{ display: 'none' }}>
                {row.vendorName}
              </span>
              <span className="text-text-muted text-xs leading-normal">
                {row.contactPersonName ? `Contact: ${row.contactPersonName}` : 'No contact person'}
              </span>
            </div>
          );
        },
      }),

      /* 4. STATUS (Especially on History) */
      columnHelper.accessor('status', {
        header: 'STATUS',
        minSize: 110,
        size: 120,
        cell: (info) => {
          const st = info.getValue();
          return (
            <Badge variant={getApprovalBadgeVariant(st)} size="sm">
              {getApprovalStatusLabel(st)}
            </Badge>
          );
        },
      }),

      /* 5. SUBMITTED BY / ON */
      columnHelper.accessor((row) => row.effectiveDate || row.initiatedOn, {
        id: 'submittedOn',
        header: isHistory ? 'DECISION / DATE' : 'SUBMITTED ON',
        minSize: 150,
        size: 170,
        cell: (info) => {
          const row = info.row.original;
          if (isHistory && row.actionedOn) {
            return (
              <div className="flex flex-col text-xs text-text-muted">
                <span className="font-medium text-heading truncate">
                  {row.actionedByName || 'Reviewer'}
                </span>
                <span className="font-mono text-2xs tabular-nums">
                  {formatDate(row.actionedOn)}
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono tabular-nums">
              <IconClock size={13} className="text-text-muted/70 shrink-0" aria-hidden="true" />
              <span>{formatDate(info.getValue())}</span>
            </div>
          );
        },
      }),

      /* 6. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 220,
        size: 260,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const isOwnRequest = user?.id && String(row.initiatedBy) === String(user.id);
          const canApprove = isAdmin && (!isOwnRequest || isSuperAdmin);

          return (
            <div
              className="flex items-center justify-end gap-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Timeline Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenTimeline(row)}
                className="text-xs h-8 px-2 flex items-center gap-1 cursor-pointer"
                title="View audit timeline"
              >
                <IconHistory size={14} className="text-text-muted" />
              </Button>

              {/* View Approval Request Detail */}
              <Button
                type="button"
                variant="primary-soft"
                size="sm"
                onClick={() => {
                  const reqId = row.approvalRequestId || row.id;
                  navigate(`/approvals/vendors/${reqId}`);
                }}
                className="text-xs font-semibold h-8 px-2.5 shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                title={`View ${row.vendorName}`}
              >
                <IconView size={13} />
                View
              </Button>
              {/* REMOVE_OLD_DOWNLOAD
              <Button
                type="button"
                variant="primary-soft"
                size="sm"
                onClick={() => handleDownloadAttachments(row)}
                className="text-xs font-semibold h-8 px-2.5 shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                title={`Download documents for ${row.vendorName}`}
              >
                <IconDownload size={13} />
                Download
              </Button>
              {/* COMMENT_CONTINUE
              <div className="hidden" style={{ display: 'none' }}>
              <Button
                type="button"
                variant="primary-soft"
                size="sm"
                onClick={() => {
                  const reqId = row.approvalRequestId || row.id;
                  navigate(`/approvals/vendors/${reqId}`);
                }}
                className="text-xs font-semibold h-8 px-2.5 shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                title={`View ${row.vendorName}`}
              >
                <IconView size={13} />
                View
              </Button>

              </div>
              */}
              {/* Approve & Reject buttons for Pending tab only */}
              {!isHistory && (
                <>
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    disabled={!canApprove}
                    onClick={() => handleOpenApprove(row)}
                    className="text-xs font-semibold h-8 px-2.5 shadow-2xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40"
                    title={
                      !isAdmin
                        ? 'Admin permissions required'
                        : isOwnRequest && !isSuperAdmin
                        ? 'You cannot approve a request you raised'
                        : `Approve ${row.vendorName}`
                    }
                  >
                    <IconCheck size={13} />
                    Approve
                  </Button>

                  <Button
                    type="button"
                    variant="danger-soft"
                    size="sm"
                    disabled={!canApprove}
                    onClick={() => handleOpenReject(row)}
                    className="text-xs font-semibold h-8 px-2.5 shadow-2xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40"
                    title={
                      !isAdmin
                        ? 'Admin permissions required'
                        : isOwnRequest && !isSuperAdmin
                        ? 'You cannot reject a request you raised'
                        : `Reject ${row.vendorName}`
                    }
                  >
                    <IconClose size={13} />
                    Reject
                  </Button>
                </>
              )}
            </div>
          );
        },
      }),
    ];
  }, [activeTab, isAdmin, isSuperAdmin, user?.id, navigate]);

  const table = useReactTable({
    data: filteredRequests,
    columns,
    state: { sorting, columnSizing, pagination },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Vendor Approvals"
        subtitle="Review, audit, and approve new vendor registrations and revisions."
        icon={<IconVendorApproval className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={loadApprovalsData}
            loading={isLoading}
            className="text-xs"
          >
            <IconRefresh size={14} className="mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* ── Tabs & Summary Cards Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="inline-flex rounded-xl bg-surface border border-border p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-heading'
            }`}
          >
            <IconClock size={14} />
            Pending To-Do Queue
            <span
              className={`font-mono text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'PENDING' ? 'bg-white/20 text-white' : 'bg-border text-heading'
              }`}
            >
              {summaryCounts.pending || pendingRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-muted hover:text-heading'
            }`}
          >
            <IconHistory size={14} />
            Approval History
            <span
              className={`font-mono text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'HISTORY' ? 'bg-white/20 text-white' : 'bg-border text-heading'
              }`}
            >
              {(summaryCounts.approved || 0) + (summaryCounts.rejected || 0)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            Approved: <strong className="text-heading font-mono">{summaryCounts.approved}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger inline-block" />
            Rejected: <strong className="text-heading font-mono">{summaryCounts.rejected}</strong>
          </span>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by vendor name, code, contact person, or reviewer..."
        hasActiveFilters={Boolean(search.trim())}
        onReset={() => setSearch('')}
      >
        <div className="text-xs text-text-muted flex items-center gap-1.5 self-end sm:self-center">
          <IconFileText size={13} className="text-primary" />
          <span>
            {activeTab === 'PENDING'
              ? 'Showing waiting submissions'
              : 'Showing completed decisions history'}
          </span>
        </div>
      </TableToolbar>

      {/* ── TanStack DataTable & Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        totalCount={filteredRequests.length}
        loading={isLoading}
        entityName={activeTab === 'PENDING' ? 'pending requests' : 'history records'}
        emptyTitle={
          search.trim()
            ? 'No matching requests'
            : activeTab === 'PENDING'
            ? 'All vendor submissions reviewed'
            : 'No approval history available yet'
        }
        emptyDescription={
          search.trim()
            ? `No records match "${search}". Try adjusting your query.`
            : activeTab === 'PENDING'
            ? 'There are currently no vendors awaiting approval in the queue.'
            : 'Approved and rejected requests will appear here once decided.'
        }
      />

      {/* ── 1. APPROVE CONFIRMATION MODAL ── */}
      <Modal
        isOpen={Boolean(vendorToApprove)}
        onClose={handleCloseApprove}
        title="Approve Vendor Application"
        maxWidth="max-w-xl"
      >
        {vendorToApprove && (
          <form onSubmit={handleConfirmApprove} className="space-y-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-success/5 border border-success/20">
              <div className="w-11 h-11 rounded-xl bg-success/15 border border-success/30 text-success flex items-center justify-center shrink-0">
                <IconSuccess size={22} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendorToApprove.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendorToApprove.vendorCode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                  {vendorToApprove.contactPersonName && (
                    <span className="flex items-center gap-1">
                      <IconUser size={12} className="text-text-muted/70" />
                      {vendorToApprove.contactPersonName}
                    </span>
                  )}
                  {vendorToApprove.city && (
                    <span className="flex items-center gap-1">
                      <IconLocation size={12} className="text-text-muted/70" />
                      {vendorToApprove.city}, {getStateName(vendorToApprove.countryId, vendorToApprove.stateId)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Approving will set status to <strong>Approved (3)</strong> and activate this vendor version for procurement workflows.
            </p>

            {/* Conditional Checkbox: ONLY if vendor has documents */}
            {vendorHasDocs && (
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
                onClick={handleCloseApprove}
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
        )}
      </Modal>

      {/* ── 2. REJECT FEEDBACK MODAL ── */}
      <Modal
        isOpen={Boolean(vendorToReject)}
        onClose={handleCloseReject}
        title="Reject Vendor Application"
        maxWidth="max-w-xl"
      >
        {vendorToReject && (
          <form onSubmit={handleConfirmReject} className="space-y-5">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-surface/70 border border-border">
              <div className="w-11 h-11 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center shrink-0">
                <IconBuilding size={20} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendorToReject.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendorToReject.vendorCode}
                  </span>
                </div>
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
                onClick={handleCloseReject}
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
        )}
      </Modal>

      {/* ── 3. TIMELINE AUDIT MODAL ── */}
      <Modal
        isOpen={Boolean(timelineReq)}
        onClose={() => setTimelineReq(null)}
        title={`Approval Timeline: ${timelineReq?.vendorName || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 py-1">
          {isLoadingTimeline ? (
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
            <Button variant="secondary" size="sm" onClick={() => setTimelineReq(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
