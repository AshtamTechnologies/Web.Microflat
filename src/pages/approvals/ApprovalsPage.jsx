/**
 * src/pages/approvals/ApprovalsPage.jsx
 * Unified Global Approvals Page for MicroFlat ERP.
 *
 * Replaces fragmented per-module queues with a single centralized inbox:
 *   - Tab 1: "Awaiting My Action" (GET /api/approval-requests/awaiting-me)
 *   - Tab 2: "All Pending"        (GET /api/approval-requests/pending?mine=false)
 *   - Tab 3: "History"            (GET /api/approval-requests/history)
 *
 * Features:
 *   - Summary counter cards (Awaiting Me, Approved, Rejected, Cancelled)
 *   - Module filter (All, Vendor, PR, Quotation, Product)
 *   - Status filter (for History tab)
 *   - Real-time text search across reference title, submitter, reviewer, type
 *   - TanStack Table v8 with custom column rendering and pagination
 *   - Action modals: Approve, Reject, Cancel/Withdraw, Audit Timeline
 *   - Module-aware detail navigation:
 *       • VENDOR               → /approvals/vendors/:id
 *       • PURCHASE_REQUISITION → /purchase-requisition/:referenceId
 *       • QUOTATION            → /quotations/:referenceId
 *       • PRODUCT              → /products/:referenceId
 *   - Full RBAC & self-approval prevention enforcement
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  IconFileText,
  IconHistory,
  IconRefresh,
  IconView,
  IconBuilding,
  IconUser,
  IconShieldCheck,
  IconError,
  IconSuccess,
  IconApproval,
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
  Select,
  SearchableSelect,
  RejectApprovalModal,
  ApproveApprovalModal,
} from '../../components/ui';
import { useAuthContext } from '../../context/AuthContext';
import { approvalsService } from '../../services';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import {
  ApprovalStatus,
  getApprovalBadgeVariant,
  getApprovalStatusLabel,
} from '../../constants/approvalStatus';
import { APPROVALS_NAV_MODE } from '../../config/navigation';

const columnHelper = createColumnHelper();

// Module visual theme pills
const MODULE_THEMES = {
  VENDOR: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  PURCHASE_REQUISITION: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  PR: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  QUOTATION: {
    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  PRODUCT: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  DEFAULT: {
    bg: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    dot: 'bg-gray-500',
  },
};

const MODULE_CONFIG = {
  ALL: {
    title: 'Global Approvals',
    subtitle: 'Centralized review, audit timeline, and decision hub across all system modules.',
    pendingLabel: 'Awaiting Action',
  },
  VENDOR: {
    title: 'Vendor Approvals',
    subtitle: 'Review, audit, and approve new vendor registrations and revisions.',
    pendingLabel: 'Vendor Pending',
  },
  PURCHASE_REQUISITION: {
    title: 'Purchase Requisition Approvals',
    subtitle: 'Review, audit, and approve material and tooling purchase requisitions.',
    pendingLabel: 'PR Pending',
  },
  PR: {
    title: 'Purchase Requisition Approvals',
    subtitle: 'Review, audit, and approve material and tooling purchase requisitions.',
    pendingLabel: 'PR Pending',
  },
  QUOTATION: {
    title: 'Quotation Approvals',
    subtitle: 'Review, audit, and approve customer sales quotations and pricing revisions.',
    pendingLabel: 'Quotation Pending',
  },
  PRODUCT: {
    title: 'Product Approvals',
    subtitle: 'Review, audit, and approve product engineering specifications and catalog additions.',
    pendingLabel: 'Product Pending',
  },
};

function getModuleTheme(code = '') {
  const normalized = String(code).toUpperCase().trim();
  return MODULE_THEMES[normalized] || MODULE_THEMES.DEFAULT;
}

function getDetailRoute(row) {
  if (!row) return '/approvals';
  const { moduleCode, referenceId, id, approvalRequestId } = row;
  const targetId = id || approvalRequestId;
  switch (String(moduleCode).toUpperCase().trim()) {
    case 'VENDOR':
      return `/approvals/vendors/${targetId}`;
    case 'PURCHASE_REQUISITION':
    case 'PR':
      return `/purchase-requisition/${referenceId || targetId}`;
    case 'QUOTATION':
      return `/quotations/${referenceId || targetId}`;
    case 'PRODUCT':
      return `/products/${referenceId || targetId}`;
    default:
      return `/approvals/vendors/${targetId}`;
  }
}

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthContext();

  // Tab State: 'PENDING' | 'HISTORY'
  const [activeTab, setActiveTab] = useState('PENDING');

  // Filters & Search (initialized from URL param ?module= if present)
  const [search, setSearch] = useState('');
  const initialModule = searchParams.get('module') || 'ALL';
  const [moduleFilter, setModuleFilter] = useState(initialModule);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Synchronize with URL search parameter changes
  useEffect(() => {
    const urlMod = searchParams.get('module');
    if (urlMod && urlMod !== moduleFilter) {
      setModuleFilter(urlMod);
    } else if (!urlMod && moduleFilter !== 'ALL' && !searchParams.has('module')) {
      setModuleFilter('ALL');
    }
  }, [searchParams]);

  const handleModuleChange = (newModule) => {
    setModuleFilter(newModule);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newModule && newModule !== 'ALL') {
        next.set('module', newModule);
      } else {
        next.delete('module');
      }
      return next;
    });
  };

  // Data states
  const [items, setItems] = useState([]);
  const [summaryCounts, setSummaryCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // TanStack Table states
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Active Module Setting Rule
  const [moduleSetting, setModuleSetting] = useState(null);

  // Modal States - Approve
  const [itemToApprove, setItemToApprove] = useState(null);
  const [approveComments, setApproveComments] = useState('');
  const [isDocVerified, setIsDocVerified] = useState(false);
  const [hasVendorDocs, setHasVendorDocs] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Modal States - Reject
  const [itemToReject, setItemToReject] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Modal States - Cancel / Withdraw
  const [itemToCancel, setItemToCancel] = useState(null);
  const [cancelComments, setCancelComments] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Modal States - Timeline
  const [timelineItem, setTimelineItem] = useState(null);
  const [timelineSteps, setTimelineSteps] = useState([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // RBAC Checks
  const userRole = (user?.role || user?.roleName || user?.roles?.[0]?.name || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const isSuperAdmin = userRole.includes('super');

  const isOwnRequest = useCallback(
    (row) => String(row?.initiatedBy) === String(user?.id),
    [user?.id]
  );

  const canAction = useCallback(
    (row) => {
      if (!row) return false;
      // Super admin can action anything
      if (isSuperAdmin) return true;
      // Requester cannot approve their own request
      if (isOwnRequest(row)) return false;
      // Admin or explicitly designated approver user
      const isDesignatedUser = row?.approverUserId && user?.id && String(row.approverUserId) === String(user.id);
      return isAdmin || Boolean(isDesignatedUser);
    },
    [isAdmin, isSuperAdmin, isOwnRequest, user?.id]
  );

  /* ── 1. Load Summary Counters ── */
  const fetchSummary = useCallback(
    async (targetModule = moduleFilter) => {
      try {
        if (!targetModule || targetModule === 'ALL') {
          const [summaryRes, pendingRes] = await Promise.allSettled([
            approvalsService.getApprovalSummary({ mine: false }),
            approvalsService.getAllApprovalPages(
              (params) => approvalsService.getPendingApprovals(params),
              { mine: false }
            ),
          ]);
          const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
          const pendingCount =
            pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value?.items)
              ? pendingRes.value.items.length
              : (summary?.pending || 0);

          setSummaryCounts({
            pending: Math.max(summary?.pending || 0, pendingCount),
            approved: summary?.approved || 0,
            rejected: summary?.rejected || 0,
            cancelled: summary?.cancelled || 0,
          });
        } else {
          // Module-specific counts for targetModule
          const [pendingRes, listPendingRes, historyRes] = await Promise.allSettled([
            approvalsService.getAllApprovalPages(
              (params) => approvalsService.getPendingApprovals(params),
              { moduleCode: targetModule, mine: false }
            ),
            approvalsService.getAllApprovalPages(
              (params) => approvalsService.listApprovalRequests(params),
              { moduleCode: targetModule, status: 2, mine: false }
            ),
            approvalsService.getAllApprovalPages(
              (params) => approvalsService.getApprovalHistory(params),
              { moduleCode: targetModule, mine: false }
            ),
          ]);

          const pendingItems =
            (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value?.items) && pendingRes.value.items.length > 0)
              ? pendingRes.value.items
              : (listPendingRes.status === 'fulfilled' && Array.isArray(listPendingRes.value?.items))
              ? listPendingRes.value.items
              : [];
          const historyItems =
            historyRes.status === 'fulfilled' && Array.isArray(historyRes.value?.items)
              ? historyRes.value.items
              : [];

          const approved = historyItems.filter((i) => i.status === ApprovalStatus.Approved).length;
          const rejected = historyItems.filter((i) => i.status === ApprovalStatus.Rejected).length;
          const cancelled = historyItems.filter((i) => i.status === ApprovalStatus.Cancelled).length;

          setSummaryCounts({
            pending: pendingItems.length,
            approved,
            rejected,
            cancelled,
          });
        }
      } catch (err) {
        console.warn('Could not load approval summary:', err);
      }
    },
    [moduleFilter]
  );

  /* ── 2. Load Approvals Queue ── */
  const loadApprovalsData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    console.log('[APPROVALS_PAGE] Loading approvals queue. activeTab:', activeTab, 'moduleFilter:', moduleFilter);

    try {
      // If module is specific, check its backend configuration rule
      if (moduleFilter && moduleFilter !== 'ALL') {
        try {
          const setting = await approvalsService.getApprovalSettingByModule(moduleFilter);
          setModuleSetting(setting);
          console.log(`[APPROVALS_PAGE] Backend setting for ${moduleFilter}:`, setting);
        } catch (sErr) {
          console.warn('[APPROVALS_PAGE] Failed to get module setting:', sErr);
          setModuleSetting(null);
        }
      } else {
        setModuleSetting(null);
      }

      const params = {};
      if (moduleFilter && moduleFilter !== 'ALL') {
        params.moduleCode = moduleFilter;
      }

      let res;
      if (activeTab === 'PENDING') {
        const combinedItems = [];
        let endpointSucceeded = false;

        // 1. Try GET /api/approval-requests/pending?Mine=false
        try {
          const pendingRes = await approvalsService.getAllApprovalPages(
            (pageParams) => approvalsService.getPendingApprovals(pageParams),
            { ...params, mine: false }
          );
          endpointSucceeded = true;
          if (Array.isArray(pendingRes?.items)) {
            combinedItems.push(...pendingRes.items);
          }
          console.log('[APPROVALS_PAGE] Pending approvals result:', pendingRes);
        } catch (pendingErr) {
          console.warn('[APPROVALS_PAGE] getPendingApprovals threw, falling back:', pendingErr);
        }

        // 2. Try full list endpoint GET /api/approval-requests?Status=2 (includes self-submitted records for auditing)
        try {
          const listRes = await approvalsService.getAllApprovalPages(
            (pageParams) => approvalsService.listApprovalRequests(pageParams),
            { ...params, status: 2 }
          );
          endpointSucceeded = true;
          console.log('[APPROVALS_PAGE] listApprovalRequests (Status=2) result:', listRes);
          if (Array.isArray(listRes?.items)) {
            for (const item of listRes.items) {
              const itemId = item.id || item.approvalRequestId;
              if (!combinedItems.some((existing) => (existing.id || existing.approvalRequestId) === itemId)) {
                combinedItems.push(item);
              }
            }
          }
        } catch (listErr) {
          console.warn('[APPROVALS_PAGE] listApprovalRequests threw:', listErr);
        }

        // 3. Fallback: check awaiting-me
        try {
          const awaitingRes = await approvalsService.getAllApprovalPages(
            (pageParams) => approvalsService.getAwaitingMeApprovals(pageParams),
            params
          );
          endpointSucceeded = true;
          console.log('[APPROVALS_PAGE] awaiting-me result:', awaitingRes);
          if (Array.isArray(awaitingRes?.items)) {
            for (const item of awaitingRes.items) {
              const itemId = item.id || item.approvalRequestId;
              if (!combinedItems.some((existing) => (existing.id || existing.approvalRequestId) === itemId)) {
                combinedItems.push(item);
              }
            }
          }
        } catch (awaitingErr) {
          console.warn('[APPROVALS_PAGE] awaiting-me threw:', awaitingErr);
        }

        if (!endpointSucceeded) {
          throw new Error('Approval queue endpoints are unavailable.');
        }
        res = { items: combinedItems };
      } else {
        if (historyStatusFilter !== 'ALL') {
          params.status = historyStatusFilter;
        }
        res = await approvalsService.getAllApprovalPages(
          (pageParams) => approvalsService.getApprovalHistory(pageParams),
          { ...params, mine: false }
        );
        console.log('[APPROVALS_PAGE] History approvals result:', res);
      }

      const finalItems = (res && Array.isArray(res.items)) ? res.items : [];
      console.log(`[APPROVALS_PAGE] Setting ${finalItems.length} items to table for module ${moduleFilter}`);
      setItems(finalItems);
      fetchSummary(moduleFilter);
    } catch (err) {
      console.error('[APPROVALS_PAGE] Failed to fetch approval requests:', err);
      toast.error(err?.detail || err?.message || 'Failed to load approvals queue.');
      setItems([]);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, moduleFilter, historyStatusFilter, fetchSummary]);

  // Initial and reactive load
  useEffect(() => {
    loadApprovalsData();
  }, [loadApprovalsData]);

  // Reset pagination on tab or filter change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [activeTab, moduleFilter, historyStatusFilter, search]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadApprovalsData();
    setIsRefreshing(false);
  };

  /* ── 3. Client-side Search Filtering ── */
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      return (
        item.referenceTitle?.toLowerCase().includes(q) ||
        item.moduleName?.toLowerCase().includes(q) ||
        item.moduleCode?.toLowerCase().includes(q) ||
        item.typeName?.toLowerCase().includes(q) ||
        item.initiatedByName?.toLowerCase().includes(q) ||
        item.approverRoleName?.toLowerCase().includes(q) ||
        item.approverUserName?.toLowerCase().includes(q) ||
        item.actionedByName?.toLowerCase().includes(q) ||
        item.comments?.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  /* ── 4. Action Handlers: Approve ── */
  async function handleOpenApprove(row) {
    setItemToApprove(row);
    setApproveComments('');
    setHasVendorDocs(false);

    const isVendor = row.moduleCode?.toUpperCase() === 'VENDOR';
    if (isVendor) {
      const reqId = row.approvalRequestId || row.id;
      try {
        setIsLoadingDocs(true);
        const detail = await approvalsService.getApprovalRequest(reqId);
        const docs = detail?.vendorDetail?.attachments || [];
        const hasDocs = Array.isArray(docs) && docs.length > 0;
        setHasVendorDocs(hasDocs);
        setIsDocVerified(hasDocs ? Boolean(row.isDocumentVerified) : true);
      } catch (err) {
        console.warn('Could not verify vendor attachments:', err);
        setHasVendorDocs(false);
        setIsDocVerified(true);
      } finally {
        setIsLoadingDocs(false);
      }
    } else {
      setIsDocVerified(true);
    }
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setItemToApprove(null);
    setApproveComments('');
    setIsDocVerified(false);
    setHasVendorDocs(false);
    setIsLoadingDocs(false);
  }

  async function handleConfirmApprove(payload) {
    if (!itemToApprove) return;
    const isVendor = itemToApprove.moduleCode?.toUpperCase() === 'VENDOR';

    const commentsToUse = payload?.comments !== undefined ? payload.comments : approveComments;
    const docVerifiedToUse = payload?.isDocVerified !== undefined ? payload.isDocVerified : isDocVerified;

    // If documents are attached, user MUST select that option!
    if (isVendor && hasVendorDocs && !docVerifiedToUse) {
      toast.error('Please verify the attached compliance documents before approving.');
      return;
    }

    const reqId = itemToApprove.approvalRequestId || itemToApprove.id;

    try {
      setIsSubmittingApprove(true);
      await approvalsService.approveRequest(reqId, {
        comments: commentsToUse.trim() || undefined,
        // Send true if documents were attached and verified; otherwise false; for other modules: undefined
        isDocumentVerified: isVendor ? (hasVendorDocs ? Boolean(docVerifiedToUse) : false) : undefined,
      });

      toast.success(
        `${itemToApprove.moduleName || 'Request'} "${itemToApprove.referenceTitle || reqId}" approved successfully.`
      );
      handleCloseApprove();
      loadApprovalsData();
    } catch (err) {
      console.error('Approval failed:', err);
      let msg = err?.message || err?.detail || 'Failed to approve request. Please try again.';
      if (msg.includes('isDocumentVerified')) {
        msg = 'Please confirm that the supporting documents have been verified before approving.';
      }
      toast.error(msg);
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  /* ── 5. Action Handlers: Reject ── */
  function handleOpenReject(row) {
    setItemToReject(row);
    setRejectComments('');
  }

  function handleCloseReject() {
    if (isSubmittingReject) return;
    setItemToReject(null);
    setRejectComments('');
  }

  async function handleConfirmReject() {
    if (!itemToReject) return;
    const trimmed = rejectComments.trim();
    if (!trimmed) {
      toast.error('Rejection remarks are required.');
      return;
    }

    const reqId = itemToReject.approvalRequestId || itemToReject.id;

    try {
      setIsSubmittingReject(true);
      await approvalsService.rejectRequest(reqId, {
        comments: trimmed,
      });

      toast.success(
        `${itemToReject.moduleName || 'Request'} "${itemToReject.referenceTitle || reqId}" has been rejected.`
      );
      handleCloseReject();
      loadApprovalsData();
    } catch (err) {
      console.error('Rejection failed:', err);
      toast.error(err?.detail || err?.message || 'Failed to reject request. Please try again.');
    } finally {
      setIsSubmittingReject(false);
    }
  }

  /* ── 6. Action Handlers: Cancel / Withdraw ── */
  function handleOpenCancel(row) {
    setItemToCancel(row);
    setCancelComments('');
  }

  function handleCloseCancel() {
    if (isSubmittingCancel) return;
    setItemToCancel(null);
    setCancelComments('');
  }

  async function handleConfirmCancel() {
    if (!itemToCancel) return;
    const reqId = itemToCancel.approvalRequestId || itemToCancel.id;

    try {
      setIsSubmittingCancel(true);
      await approvalsService.cancelRequest(reqId, {
        comments: cancelComments.trim() || undefined,
      });

      toast.success(
        `Request "${itemToCancel.referenceTitle || reqId}" has been withdrawn.`
      );
      handleCloseCancel();
      loadApprovalsData();
    } catch (err) {
      console.error('Cancellation failed:', err);
      toast.error(err?.detail || err?.message || 'Failed to cancel request.');
    } finally {
      setIsSubmittingCancel(false);
    }
  }

  /* ── 7. Action Handlers: Timeline ── */
  async function handleOpenTimeline(row) {
    setItemToApprove(null);
    setItemToReject(null);
    setItemToCancel(null);
    setTimelineItem(row);
    setIsLoadingTimeline(true);

    const reqId = row.approvalRequestId || row.id;
    try {
      const steps = await approvalsService.getRequestTimeline(reqId);
      setTimelineSteps(Array.isArray(steps) ? steps : []);
    } catch (err) {
      console.warn('Could not load audit timeline:', err);
      toast.error('Could not load timeline details.');
      setTimelineSteps([]);
    } finally {
      setIsLoadingTimeline(false);
    }
  }

  function handleCloseTimeline() {
    setTimelineItem(null);
    setTimelineSteps([]);
  }

  /* ── 8. Table Columns Configuration ── */
  const columns = useMemo(() => {
    return [
      // Module Column
      columnHelper.accessor('moduleName', {
        id: 'module',
        header: 'Module',
        size: 140,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Badge variant="role" size="sm">
              {item.moduleName || item.moduleCode || 'General'}
            </Badge>
          );
        },
      }),

      // Reference / Subject Column
      columnHelper.accessor('referenceTitle', {
        id: 'reference',
        header: 'Reference',
        size: 260,
        cell: ({ row }) => {
          const item = row.original;
          const route = getDetailRoute(item);
          return (
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() =>
                  navigate(route, {
                    state: { from: location.pathname + location.search },
                  })
                }
                className="text-left text-sm font-semibold text-primary hover:underline hover:text-primary-hover flex items-center gap-1.5 group cursor-pointer"
                title="Click to view full details"
              >
                <span>{item.referenceTitle || `Request #${item.id}`}</span>
              </button>
              <span className="text-2xs text-text-muted mt-0.5">
                Ref ID: #{item.referenceId || item.id}
              </span>
            </div>
          );
        },
      }),

      // Approval Type Column
      columnHelper.accessor('typeName', {
        id: 'type',
        header: 'Type',
        size: 150,
        cell: ({ getValue }) => (
          <span className="text-xs text-heading font-medium">
            {getValue() || 'Standard Approval'}
          </span>
        ),
      }),

      // Initiated By Column
      columnHelper.accessor('initiatedByName', {
        id: 'initiatedBy',
        header: 'Submitted By',
        size: 180,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-col text-xs">
              <div className="flex items-center gap-1 text-heading font-medium">
                <IconUser size={13} className="text-text-muted shrink-0" />
                <span className="truncate">{item.initiatedByName || 'System'}</span>
              </div>
              <span className="text-2xs text-text-muted mt-0.5">
                {item.initiatedOn ? formatDateTime(item.initiatedOn) : '—'}
              </span>
            </div>
          );
        },
      }),

      // Status Column
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        size: 120,
        cell: ({ getValue }) => {
          const status = getValue();
          const label = getApprovalStatusLabel(status);
          const variant = getApprovalBadgeVariant(status);
          return <Badge variant={variant}>{label}</Badge>;
        },
      }),

      // Designated Approver Column
      columnHelper.accessor((row) => (row.approverType === 2 ? row.approverUserName : row.approverRoleName), {
        id: 'approver',
        header: 'Designated Approver',
        size: 170,
        cell: ({ row }) => {
          const item = row.original;
          const isUser = item.approverType === 2 || (!item.approverRoleName && item.approverUserName);
          if (isUser) {
            return (
              <span
                className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded inline-flex items-center gap-1.5 max-w-[160px] truncate"
                title={item.approverUserName || `User #${item.approverUserId}`}
              >
                <IconUser size={12} className="shrink-0" />
                <span className="truncate">{item.approverUserName || (item.approverUserId ? `User #${item.approverUserId}` : 'Assigned User')}</span>
              </span>
            );
          }
          return (
            <span
              className="text-xs font-mono bg-surface-subtle px-2 py-0.5 rounded text-text-muted border border-border inline-flex items-center gap-1 max-w-[160px] truncate"
              title={item.approverRoleName || 'Admin'}
            >
              <IconShieldCheck size={12} className="shrink-0 text-primary" />
              <span className="truncate">{item.approverRoleName || 'Admin'}</span>
            </span>
          );
        },
      }),

      // Decision Column (History Tab Only)
      ...(activeTab === 'HISTORY'
        ? [
            columnHelper.accessor('actionedByName', {
              id: 'decision',
              header: 'Decision By',
              size: 180,
              cell: ({ row }) => {
                const item = row.original;
                return (
                  <div className="flex flex-col text-xs">
                    <span className="text-heading font-medium">
                      {item.actionedByName || '—'}
                    </span>
                    <span className="text-2xs text-text-muted mt-0.5">
                      {item.actionedOn ? formatDateTime(item.actionedOn) : '—'}
                    </span>
                  </div>
                );
              },
            }),
          ]
        : []),

      // Action Buttons Column
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        size: 270,
        cell: ({ row }) => {
          const item = row.original;
          const isPending = item.status === ApprovalStatus.Pending;
          const canUserAction = canAction(item);
          const canUserCancel =
            isPending && (isOwnRequest(item) || isAdmin);
          const detailRoute = getDetailRoute(item);

          return (
            <div className="flex items-center gap-1.5 justify-end">
              {/* Timeline Button */}
              <Button
                variant="ghost"
                size="sm"
                className="!p-1.5 text-text-muted hover:text-primary shrink-0"
                onClick={() => handleOpenTimeline(item)}
                title="View Audit Timeline"
              >
                <IconHistory size={14} />
              </Button>

              {/* View Detail Link */}
              <Button
                variant="secondary"
                size="sm"
                className="px-2.5 py-1 text-xs flex items-center gap-1.5 shrink-0"
                onClick={() =>
                  navigate(detailRoute, {
                    state: { from: location.pathname + location.search },
                  })
                }
                title="Inspect Record Details"
              >
                <IconView size={14} className="shrink-0" />
                <span>View</span>
              </Button>

              {/* Actions for Pending Requests */}
              {isPending && activeTab !== 'HISTORY' && (
                <>
                  {canUserAction && (
                    <>
                      {/* Approve Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 py-1 text-xs text-success hover:bg-success/10 font-medium flex items-center gap-1 shrink-0"
                        onClick={() => handleOpenApprove(item)}
                        title="Approve Request"
                      >
                        <IconCheck size={13} className="shrink-0" />
                        <span>Approve</span>
                      </Button>

                      {/* Reject Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 py-1 text-xs text-danger hover:bg-danger/10 font-medium flex items-center gap-1 shrink-0"
                        onClick={() => handleOpenReject(item)}
                        title="Reject Request"
                      >
                        <IconClose size={13} className="shrink-0" />
                        <span>Reject</span>
                      </Button>
                    </>
                  )}

                  {/* Cancel / Withdraw Button */}
                  {canUserCancel && !canUserAction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 shrink-0"
                      onClick={() => handleOpenCancel(item)}
                      title="Withdraw Submission"
                    >
                      Withdraw
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        },
      }),
    ];
  }, [activeTab, canAction, isOwnRequest, isAdmin, navigate]);

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const currentModuleConfig = MODULE_CONFIG[moduleFilter] || MODULE_CONFIG.ALL;

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-8 sm:pb-12">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title={currentModuleConfig.title}
        subtitle={currentModuleConfig.subtitle}
        icon={<IconApproval className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" aria-hidden="true" />}
        moduleCode={
          moduleFilter && moduleFilter !== 'ALL'
            ? (moduleFilter === 'PURCHASE_REQUISITION' ? 'PURCHASE' : moduleFilter)
            : undefined
        }
        showProcessFlow={Boolean(moduleFilter && moduleFilter !== 'ALL')}
        processFlowMode="overview"
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isLoading || isRefreshing}
            className="text-xs shadow-xs"
          >
            <IconRefresh size={14} className="mr-1.5 shrink-0" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {/* ── 2. Summary KPI Metric Chips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Awaiting Action / Pending */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
              {currentModuleConfig.pendingLabel}
            </p>
            <p className="text-2xl font-bold font-mono text-heading mt-1">
              {summaryCounts.pending || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <IconClock size={20} />
          </div>
        </div>

        {/* Approved */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Approved
            </p>
            <p className="text-2xl font-bold font-mono text-success mt-1">
              {summaryCounts.approved || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <IconCheck size={20} />
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Rejected
            </p>
            <p className="text-2xl font-bold font-mono text-danger mt-1">
              {summaryCounts.rejected || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
            <IconClose size={20} />
          </div>
        </div>

        {/* Cancelled / Withdrawn */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Withdrawn
            </p>
            <p className="text-2xl font-bold font-mono text-text-muted mt-1">
              {summaryCounts.cancelled || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-surface-subtle text-text-muted flex items-center justify-center border border-border">
            <IconHistory size={20} />
          </div>
        </div>
      </div>

      {/* ── 3. Queue Tabs Header ── */}
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
            <span>Pending Approvals</span>
            <span
              className={`font-mono text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'PENDING'
                  ? 'bg-white/20 text-white'
                  : 'bg-border text-heading'
              }`}
            >
              {summaryCounts.pending || 0}
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
            <span>Approval History</span>
            <span
              className={`font-mono text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'HISTORY'
                  ? 'bg-white/20 text-white'
                  : 'bg-border text-heading'
              }`}
            >
              {(summaryCounts.approved || 0) + (summaryCounts.rejected || 0) + (summaryCounts.cancelled || 0)}
            </span>
          </button>
        </div>

        {/* Quick Informational Label */}
        <div className="text-xs text-text-muted flex items-center gap-1.5 self-end sm:self-center">
          <IconShieldCheck size={14} className="text-primary shrink-0" />
          <span>
            {activeTab === 'PENDING' && 'Pending requests waiting for an approval decision'}
            {activeTab === 'HISTORY' && 'Completed decisions history (Approved, Rejected, Cancelled)'}
          </span>
        </div>
      </div>

      {/* ── 4. Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference title, submitter, reviewer, or comments..."
        hasActiveFilters={Boolean(
          search.trim() ||
          historyStatusFilter !== 'ALL' ||
          moduleFilter !== 'ALL'
        )}
        onReset={() => {
          setSearch('');
          setHistoryStatusFilter('ALL');
          handleModuleChange('ALL');
        }}
      >
        {/* Module Filter Dropdown */}
        <div className="w-full sm:w-48">
          <SearchableSelect
            id="filter-approval-module"
            value={moduleFilter}
            onChange={(e) => handleModuleChange(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Modules' },
              { value: 'VENDOR', label: 'Vendors' },
              { value: 'PURCHASE_REQUISITION', label: 'Purchase Requisitions' },
              { value: 'QUOTATION', label: 'Quotations' },
              { value: 'PRODUCT', label: 'Products' },
            ]}
            placeholder="All Modules"
            searchPlaceholder="Filter module..."
            size="sm"
          />
        </div>

        {/* Status Filter Dropdown (History tab only) */}
        {activeTab === 'HISTORY' && (
          <div className="w-full sm:w-44">
            <SearchableSelect
              id="filter-approval-status"
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Decided' },
                { value: String(ApprovalStatus.Approved), label: 'Approved' },
                { value: String(ApprovalStatus.Rejected), label: 'Rejected' },
                { value: String(ApprovalStatus.Cancelled), label: 'Cancelled' },
              ]}
              placeholder="All Decided"
              searchPlaceholder="Filter status..."
              size="sm"
            />
          </div>
        )}
      </TableToolbar>

      {/* ── Quotation Approval Disabled Warning Banner (Only displayed if disabled) ── */}
      {moduleSetting && !moduleSetting.isApprovalRequired && moduleFilter === 'QUOTATION' && (
        <div className="p-3.5 text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs leading-relaxed">
          ⚠️ <strong>Quotation Approval is DISABLED on Backend:</strong> In the database, <code>isApprovalRequired</code> is currently <code>false</code> for Quotations. Per the Swagger API specification, submitting a quotation automatically marks it as <code>NotRequired</code> and does not create an approval request in this queue. You can turn Quotation approvals ON anytime in <button type="button" onClick={() => navigate('/approvals/settings')} className="underline font-bold hover:text-amber-800">Approval Settings (/approvals/settings)</button>.
        </div>
      )}

      {/* ── 5. Main TanStack DataTable ── */}
      <DataTable
        table={table}
        columns={columns}
        totalCount={filteredData.length}
        isLoading={isLoading}
        entityName="approvals"
        emptyTitle={
          loadError
            ? 'Approval queue unavailable'
            : activeTab === 'PENDING'
            ? 'Your approval queue is completely clear!'
            : 'No approval history records found'
        }
        emptyDescription={
          loadError
            ? 'Could not load approval requests. Refresh to try again.'
            : activeTab === 'PENDING'
            ? 'No actions are currently waiting for your decision.'
            : 'Try adjusting your search criteria or clearing filters.'
        }
      />

      {/* ── CENTRALIZED MODAL: APPROVE ── */}
      <ApproveApprovalModal
        isOpen={Boolean(itemToApprove)}
        onClose={handleCloseApprove}
        onConfirm={handleConfirmApprove}
        loading={isSubmittingApprove}
        title={
          itemToApprove?.moduleCode === 'VENDOR' || itemToApprove?.moduleName?.toLowerCase().includes('vendor')
            ? 'Approve Vendor Application'
            : `Approve ${itemToApprove?.moduleName || 'Request'}`
        }
        entityName={itemToApprove?.referenceTitle || itemToApprove?.entityName || 'Approval Request'}
        entitySubtitle={
          itemToApprove?.referenceNo
            ? `${itemToApprove.referenceNo} • ${itemToApprove.moduleName || ''}`
            : itemToApprove?.moduleName || ''
        }
        showDocVerification={itemToApprove?.moduleCode?.toUpperCase() === 'VENDOR'}
        docVerificationLoading={isLoadingDocs}
        hasDocuments={hasVendorDocs}
        isDocVerified={isDocVerified}
        onDocVerifiedChange={setIsDocVerified}
        comments={approveComments}
        onCommentsChange={setApproveComments}
        auditNote={
          itemToApprove?.moduleCode === 'VENDOR'
            ? 'Approving sets status to Approved (3) and activates this vendor version for procurement workflows.'
            : 'Approving advances the request to approved status and completes the workflow.'
        }
      />

      {/* ── CENTRALIZED MODAL: REJECT ── */}
      <RejectApprovalModal
        isOpen={Boolean(itemToReject)}
        onClose={handleCloseReject}
        onConfirm={handleConfirmReject}
        loading={isSubmittingReject}
        title={
          itemToReject?.moduleCode === 'VENDOR' || itemToReject?.moduleName?.toLowerCase().includes('vendor')
            ? 'Reject Vendor Application'
            : `Reject ${itemToReject?.moduleName || 'Request'}`
        }
        entityName={itemToReject?.referenceTitle || itemToReject?.entityName || 'Approval Request'}
        entitySubtitle={
          itemToReject?.referenceNo
            ? `${itemToReject.referenceNo} • ${itemToReject.moduleName || ''}`
            : itemToReject?.moduleName || ''
        }
        comments={rejectComments}
        onCommentsChange={setRejectComments}
        auditNote="Rejecting sets status to Rejected (4). The vendor creator can edit and resubmit the version for approval."
      />

      {/* ── MODAL: CANCEL / WITHDRAW ── */}
      <Modal
        isOpen={Boolean(itemToCancel)}
        onClose={handleCloseCancel}
        title="Withdraw Approval Request"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={handleCloseCancel}
              disabled={isSubmittingCancel}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={handleConfirmCancel}
              loading={isSubmittingCancel}
              className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700"
            >
              <span>Confirm Withdrawal</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-text-muted">
            Are you sure you want to withdraw the request for{' '}
            <strong className="text-heading">{itemToCancel?.referenceTitle}</strong>? The document will return to editable draft state.
          </p>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Withdrawal Reason (Optional)
            </label>
            <Textarea
              rows={3}
              value={cancelComments}
              onChange={(e) => setCancelComments(e.target.value)}
              placeholder="Add optional reason for withdrawing..."
            />
          </div>
        </div>
      </Modal>

      {/* ── MODAL: AUDIT TIMELINE ── */}
      <Modal
        isOpen={Boolean(timelineItem)}
        onClose={handleCloseTimeline}
        title={`Audit Timeline — ${timelineItem?.referenceTitle || ''}`}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleCloseTimeline}>
              Close
            </Button>
          </div>
        }
      >
        <div className="py-2">
          {isLoadingTimeline ? (
            <div className="flex flex-col items-center justify-center py-8 text-text-muted text-xs gap-2">
              <IconRefresh className="animate-spin text-primary" size={24} />
              <span>Loading audit steps...</span>
            </div>
          ) : timelineSteps.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-xs">
              No audit timeline records found for this request.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {timelineSteps.map((step, idx) => {
                const action = String(step.action || '').toLowerCase();
                const isApproved = action.includes('approved') || step.status === 3;
                const isRejected = action.includes('rejected') || step.status === 4;
                const isCancelled = action.includes('cancel') || step.status === 5;
                const isVerified = action.includes('document') || action.includes('verify');

                let dotColor = 'bg-primary border-primary';
                let Icon = IconClock;
                if (isApproved) {
                  dotColor = 'bg-success border-success';
                  Icon = IconCheck;
                } else if (isRejected) {
                  dotColor = 'bg-danger border-danger';
                  Icon = IconClose;
                } else if (isCancelled) {
                  dotColor = 'bg-gray-400 border-gray-400';
                  Icon = IconHistory;
                } else if (isVerified) {
                  dotColor = 'bg-blue-600 border-blue-600';
                  Icon = IconShieldCheck;
                }

                return (
                  <div key={idx} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 bg-surface flex items-center justify-center ${dotColor} text-white`}
                    >
                      <Icon size={11} className="stroke-[2.5]" />
                    </div>

                    <div className="bg-surface-subtle border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-heading">
                          {step.action || 'Updated'}
                        </span>
                        <span className="text-2xs text-text-muted font-mono">
                          {step.on ? formatDateTime(step.on) : '—'}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-1">
                        <IconUser size={12} />
                        <span>{step.userName || 'System'}</span>
                        {(step.actionedOnBehalfOfName || step.onBehalfOfUserName) && (
                          <span className="text-2xs italic">
                            (on behalf of {step.actionedOnBehalfOfName || step.onBehalfOfUserName})
                          </span>
                        )}
                      </div>
                      {step.comments && (
                        <div className="mt-1 pt-1 border-t border-border/50 text-xs text-heading italic bg-surface/50 p-1.5 rounded">
                          "{step.comments}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

