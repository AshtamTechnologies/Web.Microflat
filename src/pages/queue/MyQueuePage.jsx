/**
 * MyQueuePage.jsx — Unified "My Work Center" Page for MicroFlat ERP.
 *
 * Implements:
 *   - Clean PageHeader directly connecting to Tabs.
 *   - ScrollableTabs for "Action Queue (My Tasks)" & "Notification History".
 *   - TableToolbar housing Search bar and SearchableSelect filters in one unified row (matching All Delegations).
 *   - TanStack DataTable on desktop with two-line clean typography.
 *   - Responsive mobile stacked cards on small screens (< md) via renderMobileCard.
 *   - No KPI cards.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Calendar,
  CheckSquare,
  Clock,
  ExternalLink,
  Check,
  CheckCheck,
  Eye,
  Loader2,
  RotateCcw,
  Bell,
  ListTodo,
} from 'lucide-react';

import {
  PageHeader,
  ScrollableTabs,
  Card,
  Badge,
  StatusBadge,
  Button,
  IconButton,
  TableToolbar,
  SearchableSelect,
  DataTable,
  Modal,
  ConfirmModal,
  Textarea,
} from '../../components/ui';

import { myQueueService, notificationsService } from '../../services';
import { useNotifications } from '../../context/NotificationsContext';

const queueColumnHelper = createColumnHelper();
const notifColumnHelper = createColumnHelper();

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyQueuePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'notifications' ? 'notifications' : 'queue';

  const {
    unreadCount,
    refreshNotifications,
    refreshQueueSummary,
  } = useNotifications();

  // ── Tab 1: Queue State ──
  const [queueItems, setQueueItems] = useState([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueSummary, setQueueSummary] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    meetingsPending: 0,
    approvalsPending: 0,
  });
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatus, setQueueStatus] = useState('ALL');
  const [queueType, setQueueType] = useState('ALL');
  const [queuePagination, setQueuePagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [queueSorting, setQueueSorting] = useState([]);

  // Queue Action Modals
  const [completeModalItem, setCompleteModalItem] = useState(null);
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Tab 2: Notifications State ──
  const [notifications, setNotifications] = useState([]);
  const [notifTotal, setNotifTotal] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifReadFilter, setNotifReadFilter] = useState('ALL');
  const [notifTypeFilter, setNotifTypeFilter] = useState('ALL');
  const [notifPagination, setNotifPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [notifSorting, setNotifSorting] = useState([]);

  // ── Active Filters Checks ──
  const hasQueueActiveFilters = Boolean(
    queueSearch.trim() || queueType !== 'ALL' || queueStatus !== 'ALL'
  );

  const resetQueueFilters = () => {
    setQueueSearch('');
    setQueueType('ALL');
    setQueueStatus('ALL');
    setQueuePagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const hasNotifActiveFilters = Boolean(
    notifSearch.trim() || notifReadFilter !== 'ALL' || notifTypeFilter !== 'ALL'
  );

  const resetNotifFilters = () => {
    setNotifSearch('');
    setNotifReadFilter('ALL');
    setNotifTypeFilter('ALL');
    setNotifPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  // ── Load Queue Data ──
  const loadQueueData = useCallback(async () => {
    try {
      setQueueLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        myQueueService.listQueue({
          search: queueSearch,
          status: queueStatus,
          itemType: queueType,
          pageNumber: queuePagination.pageIndex + 1,
          pageSize: queuePagination.pageSize,
        }),
        myQueueService.getQueueSummary(),
      ]);

      if (listRes) {
        setQueueItems(listRes.items || []);
        setQueueTotal(listRes.totalCount ?? (listRes.items || []).length);
      }
      if (summaryRes) {
        setQueueSummary(summaryRes);
      }
    } catch (err) {
      console.error('Failed to load queue data:', err);
    } finally {
      setQueueLoading(false);
    }
  }, [queueSearch, queueStatus, queueType, queuePagination]);

  // ── Load Notifications Data ──
  const loadNotificationsData = useCallback(async () => {
    try {
      setNotifLoading(true);
      const res = await notificationsService.listNotifications({
        search: notifSearch,
        isRead: notifReadFilter === 'ALL' ? '' : notifReadFilter,
        notificationType: notifTypeFilter === 'ALL' ? '' : notifTypeFilter,
        pageNumber: notifPagination.pageIndex + 1,
        pageSize: notifPagination.pageSize,
      });

      if (res) {
        setNotifications(res.items || []);
        setNotifTotal(res.totalCount ?? (res.items || []).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, [notifSearch, notifReadFilter, notifTypeFilter, notifPagination]);

  // Automatically fetch fresh data when switching to the Action Queue tab
  useEffect(() => {
    if (activeTab === 'queue') {
      loadQueueData();
      refreshQueueSummary?.();
    }
  }, [activeTab, loadQueueData, refreshQueueSummary]);

  // Automatically fetch fresh data when switching to the Notifications tab
  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotificationsData();
      refreshNotifications?.();
    }
  }, [activeTab, loadNotificationsData, refreshNotifications]);

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  const handleConfirmComplete = async () => {
    if (!completeModalItem) return;
    try {
      setCompleteSubmitting(true);
      await myQueueService.completeQueueItem(completeModalItem.id, { remarks: completeRemarks });
      setCompleteModalItem(null);
      setCompleteRemarks('');
      await loadQueueData();
      refreshQueueSummary?.();
    } catch (err) {
      console.error('Failed to complete queue item:', err);
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readOn: new Date().toISOString() } : n))
      );
      refreshNotifications?.();
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      setNotifLoading(true);
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readOn: n.readOn || new Date().toISOString() }))
      );
      refreshNotifications?.();
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleOpenDetail = useCallback(async (item) => {
    if (!item?.id) return;
    setDetailModalItem(item);
    setDetailLoading(true);
    try {
      const detail = await myQueueService.getQueueItem(item.id);
      if (detail) {
        setDetailModalItem((prev) => ({ ...prev, ...detail }));
      }
    } catch (err) {
      console.error('Failed to fetch queue item detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Tab 1: TanStack Table Columns (Matching Image 2 Style) ──
  const queueColumns = useMemo(
    () => [
      queueColumnHelper.accessor('itemType', {
        header: 'TYPE',
        size: 110,
        cell: (info) => {
          const type = info.getValue();
          return (
            <Badge
              variant={type === 'Meeting' ? 'primary' : 'warning'}
              size="xs"
              className="font-medium"
            >
              {type === 'Meeting' ? (
                <Calendar size={12} className="mr-1 shrink-0" />
              ) : (
                <CheckSquare size={12} className="mr-1 shrink-0" />
              )}
              {type}
            </Badge>
          );
        },
      }),
      queueColumnHelper.accessor('title', {
        header: 'TASK & CONTEXT',
        size: 320,
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="space-y-0.5 py-1">
              <div className="flex items-center gap-2">
                <span
                  className="font-semibold text-heading text-xs hover:text-primary transition-colors cursor-pointer"
                  onClick={() => handleOpenDetail(item)}
                >
                  {item.title}
                </span>
                {item.metadata?.documentCode && (
                  <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                    {item.metadata.documentCode}
                  </span>
                )}
              </div>
              <p className="text-2xs text-text-muted line-clamp-1">
                {item.description}
              </p>
              {item.metadata?.organizerName && (
                <p className="text-3xs text-text-muted">
                  Organizer: <span className="font-medium text-text">{item.metadata.organizerName}</span>
                  {item.metadata.location && ` • ${item.metadata.location}`}
                </p>
              )}
              {item.metadata?.requesterName && (
                <p className="text-3xs text-text-muted">
                  Requested by: <span className="font-medium text-text">{item.metadata.requesterName}</span>
                  {item.metadata.amount && ` • Amount: ${item.metadata.amount}`}
                </p>
              )}
              {item.assignedToName && (
                <p className="text-3xs text-text-muted">
                  Assigned to: <span className="font-medium text-text">{item.assignedToName}</span>
                </p>
              )}
            </div>
          );
        },
      }),
      queueColumnHelper.accessor((row) => row.dueDate || row.showFromDate, {
        id: 'dueDate',
        header: 'DUE / SCHEDULED',
        size: 160,
        cell: (info) => {
          const due = info.getValue();
          const item = info.row.original;
          const isOverdue = due && new Date(due) < new Date() && item.status === 'Pending';
          return (
            <div className="text-xs space-y-0.5">
              <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-danger font-medium' : 'text-text'}`}>
                <Clock size={13} className="shrink-0 text-text-muted" />
                <span>{formatDateTime(due)}</span>
              </div>
              {isOverdue && (
                <span className="inline-block text-3xs text-danger font-semibold">Overdue</span>
              )}
            </div>
          );
        },
      }),
      queueColumnHelper.accessor('priority', {
        header: 'PRIORITY',
        size: 100,
        cell: (info) => {
          const priority = info.getValue() || 'Medium';
          const variantMap = {
            Urgent: 'danger',
            High: 'warning',
            Medium: 'primary',
            Low: 'outline',
          };
          return (
            <Badge variant={variantMap[priority] || 'outline'} size="xs">
              {priority}
            </Badge>
          );
        },
      }),
      queueColumnHelper.accessor('status', {
        header: 'STATUS',
        size: 110,
        cell: (info) => {
          const status = info.getValue();
          return <StatusBadge status={status} size="xs" />;
        },
      }),
      queueColumnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 150,
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5 w-full">
              {item.itemType === 'Meeting' && item.status === 'Pending' && (
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => {
                    setCompleteModalItem(item);
                    setCompleteRemarks('');
                  }}
                  icon={<Check size={13} />}
                >
                  Mark Done
                </Button>
              )}

              {item.itemType === 'Approval' && item.status === 'Pending' && (
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => navigate(item.actionUrl || '/approvals')}
                  iconRight={<ExternalLink size={12} />}
                >
                  Review
                </Button>
              )}

              <IconButton
                size="sm"
                variant="ghost"
                icon={<Eye size={15} />}
                aria-label="View task details"
                onClick={() => handleOpenDetail(item)}
                title="View full task details"
              />
            </div>
          );
        },
      }),
    ],
    [navigate]
  );

  const queueTable = useReactTable({
    data: queueItems,
    columns: queueColumns,
    state: {
      pagination: queuePagination,
      sorting: queueSorting,
    },
    onPaginationChange: setQueuePagination,
    onSortingChange: setQueueSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(queueTotal / queuePagination.pageSize) || 1,
  });

  // ── Tab 2: TanStack Table Columns ──
  const notifColumns = useMemo(
    () => [
      notifColumnHelper.accessor('isRead', {
        header: 'STATE',
        size: 90,
        cell: (info) => {
          const isRead = info.getValue();
          return isRead ? (
            <span className="inline-flex items-center gap-1 text-3xs font-medium text-text-muted px-2 py-0.5 rounded bg-surface border border-border">
              Read
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-3xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Unread
            </span>
          );
        },
      }),
      notifColumnHelper.accessor('notificationType', {
        header: 'CATEGORY',
        size: 110,
        cell: (info) => (
          <Badge variant="outline" size="xs">
            {info.getValue()}
          </Badge>
        ),
      }),
      notifColumnHelper.accessor('title', {
        header: 'NOTIFICATION',
        size: 380,
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="space-y-0.5 py-1">
              <p
                className={`text-xs ${
                  item.isRead ? 'font-medium text-heading' : 'font-semibold text-primary'
                } hover:underline cursor-pointer`}
                onClick={() => {
                  if (!item.isRead) handleMarkNotificationRead(item.id);
                  if (item.actionUrl) navigate(item.actionUrl);
                }}
              >
                {item.title}
              </p>
              <p className="text-2xs text-text-muted line-clamp-2">
                {item.message}
              </p>
            </div>
          );
        },
      }),
      notifColumnHelper.accessor('createdOn', {
        header: 'RECEIVED',
        size: 140,
        cell: (info) => (
          <div className="text-2xs text-text-muted space-y-0.5">
            <p className="font-medium text-text">{formatRelativeTime(info.getValue())}</p>
            <p className="text-3xs text-text-muted">{formatDateTime(info.getValue())}</p>
          </div>
        ),
      }),
      notifColumnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 140,
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1.5 w-full">
              {!item.isRead && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleMarkNotificationRead(item.id)}
                  icon={<Check size={13} />}
                >
                  Mark Read
                </Button>
              )}
              {item.actionUrl && (
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    if (!item.isRead) handleMarkNotificationRead(item.id);
                    navigate(item.actionUrl);
                  }}
                  iconRight={<ExternalLink size={12} />}
                >
                  Open
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [navigate]
  );

  const notifTable = useReactTable({
    data: notifications,
    columns: notifColumns,
    state: {
      pagination: notifPagination,
      sorting: notifSorting,
    },
    onPaginationChange: setNotifPagination,
    onSortingChange: setNotifSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(notifTotal / notifPagination.pageSize) || 1,
  });

  // ── Mobile Responsive Stacked Cards (renderMobileCard) ──
  const renderQueueMobileCard = (row) => {
    const item = row.original;
    return (
      <Card key={item.id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        {/* Card Header: Type + Priority badges on left, Status badge on right */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={item.itemType === 'Meeting' ? 'primary' : 'warning'} size="xs">
              {item.itemType}
            </Badge>
            {item.priority && (
              <Badge variant="outline" size="xs">
                {item.priority}
              </Badge>
            )}
            {item.referenceType && item.referenceId ? (
              <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                {item.referenceType} #{item.referenceId}
              </span>
            ) : item.metadata?.documentCode ? (
              <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                {item.metadata.documentCode}
              </span>
            ) : null}
          </div>
          <StatusBadge status={item.status} size="xs" />
        </div>

        {/* Task Title & Description */}
        <div className="space-y-1">
          <h4
            className="text-xs font-semibold text-heading hover:text-primary cursor-pointer transition-colors"
            onClick={() => handleOpenDetail(item)}
          >
            {item.title}
          </h4>
          {item.description && (
            <p className="text-2xs text-text-muted line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Detail Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-2xs">
          <div>
            <span className="text-3xs uppercase tracking-wider text-text-muted font-semibold block">Scheduled</span>
            <span className="text-text font-medium flex items-center gap-1 mt-0.5">
              <Clock size={11} className="text-text-muted shrink-0" />
              {formatDateTime(item.dueDate || item.showFromDate)}
            </span>
          </div>

          <div>
            <span className="text-3xs uppercase tracking-wider text-text-muted font-semibold block">Contact</span>
            <span className="text-text font-medium truncate block mt-0.5">
              {item.assignedToName || item.assignedToUserName || item.metadata?.organizerName || item.metadata?.requesterName || '—'}
            </span>
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => handleOpenDetail(item)}
            icon={<Eye size={13} />}
          >
            Details
          </Button>

          {item.itemType === 'Meeting' && item.status === 'Pending' && (
            <Button
              size="xs"
              variant="primary"
              onClick={() => {
                setCompleteModalItem(item);
                setCompleteRemarks('');
              }}
              icon={<Check size={13} />}
            >
              Mark Done
            </Button>
          )}

          {item.itemType === 'Approval' && item.status === 'Pending' && (
            <Button
              size="xs"
              variant="primary"
              onClick={() => navigate(item.actionUrl || '/approvals')}
              iconRight={<ExternalLink size={12} />}
            >
              Review
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const renderNotifMobileCard = (row) => {
    const item = row.original;
    return (
      <Card
        key={item.id}
        padding="md"
        className={`space-y-2.5 border border-border shadow-2xs ${
          item.isRead ? 'bg-bg' : 'bg-primary/5'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" size="xs">
              {item.notificationType}
            </Badge>
            {!item.isRead && (
              <span className="inline-flex items-center gap-1 text-3xs font-bold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Unread
              </span>
            )}
          </div>
          <span className="text-3xs text-text-muted">{formatRelativeTime(item.createdOn)}</span>
        </div>

        <div>
          <h4
            className={`text-xs ${
              item.isRead ? 'font-medium text-heading' : 'font-semibold text-primary'
            } cursor-pointer hover:underline`}
            onClick={() => {
              if (!item.isRead) handleMarkNotificationRead(item.id);
              if (item.actionUrl) navigate(item.actionUrl);
            }}
          >
            {item.title}
          </h4>
          <p className="text-2xs text-text-muted mt-1 leading-relaxed">{item.message}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          {!item.isRead && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => handleMarkNotificationRead(item.id)}
              icon={<Check size={13} />}
            >
              Mark Read
            </Button>
          )}
          {item.actionUrl && (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                if (!item.isRead) handleMarkNotificationRead(item.id);
                navigate(item.actionUrl);
              }}
              iconRight={<ExternalLink size={12} />}
            >
              Open Record
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header (No KPI Cards) ── */}
      <PageHeader
        title="My Work Center"
        subtitle="Manage pending approval tasks, scheduled meetings, and track real-time system alerts"
        icon={<ListTodo className="text-primary" />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              loadQueueData();
              loadNotificationsData();
            }}
            icon={<RotateCcw size={14} />}
          >
            Refresh
          </Button>
        }
      />

      {/* ── Tabs Bar ── */}
      <ScrollableTabs
        variant="pills"
        activeTab={activeTab}
        onChange={handleTabChange}
        tabs={[
          {
            id: 'queue',
            label: 'Action Queue (My Tasks)',
            icon: ListTodo,
            badge: queueSummary.pending > 0 ? queueSummary.pending : undefined,
          },
          {
            id: 'notifications',
            label: 'Notification History',
            icon: Bell,
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
        ]}
      />

      {/* ── TAB 1: ACTION QUEUE ── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* TableToolbar — Search & Filters in one unified section */}
          <TableToolbar
            searchValue={queueSearch}
            onSearchChange={(val) => {
              setQueueSearch(val);
              setQueuePagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            searchPlaceholder="Search tasks, reference codes, descriptions…"
            hasActiveFilters={hasQueueActiveFilters}
            onReset={resetQueueFilters}
            resetLabel="Reset Filters"
          >
            <div className="w-full sm:w-44">
              <SearchableSelect
                id="filter-queue-type"
                placeholder="All Types"
                searchPlaceholder="Search type…"
                value={queueType}
                onChange={(e) => {
                  setQueueType(e.target.value);
                  setQueuePagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                options={[
                  { value: 'ALL', label: 'All Types' },
                  { value: 'Meeting', label: 'Meetings' },
                  { value: 'Approval', label: 'Approvals' },
                ]}
              />
            </div>

            <div className="w-full sm:w-44">
              <SearchableSelect
                id="filter-queue-status"
                placeholder="All Statuses"
                searchPlaceholder="Search status…"
                value={queueStatus}
                onChange={(e) => {
                  setQueueStatus(e.target.value);
                  setQueuePagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'Pending', label: 'Pending Only' },
                  { value: 'Completed', label: 'Completed' },
                ]}
              />
            </div>
          </TableToolbar>

          {/* DataTable — Table on Desktop, Cards on Mobile */}
          <DataTable
            table={queueTable}
            columns={queueColumns}
            isLoading={queueLoading}
            totalCount={queueTotal}
            entityName="queue tasks"
            emptyTitle="No tasks found in your queue"
            emptyDescription="You're completely up to date. New meeting invitations and approval requests will appear here."
            renderMobileCard={renderQueueMobileCard}
          />
        </div>
      )}

      {/* ── TAB 2: NOTIFICATIONS ── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* TableToolbar — Search, Filters & Bulk Action */}
          <TableToolbar
            searchValue={notifSearch}
            onSearchChange={(val) => {
              setNotifSearch(val);
              setNotifPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            searchPlaceholder="Search notifications, messages…"
            hasActiveFilters={hasNotifActiveFilters}
            onReset={resetNotifFilters}
            resetLabel="Reset Filters"
          >
            <div className="w-full sm:w-44">
              <SearchableSelect
                id="filter-notif-status"
                placeholder="All Status"
                searchPlaceholder="Search status…"
                value={notifReadFilter}
                onChange={(e) => {
                  setNotifReadFilter(e.target.value);
                  setNotifPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'false', label: 'Unread Only' },
                  { value: 'true', label: 'Read Only' },
                ]}
              />
            </div>

            <div className="w-full sm:w-44">
              <SearchableSelect
                id="filter-notif-type"
                placeholder="All Categories"
                searchPlaceholder="Search category…"
                value={notifTypeFilter}
                onChange={(e) => {
                  setNotifTypeFilter(e.target.value);
                  setNotifPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  { value: 'Meeting', label: 'Meetings' },
                  { value: 'Approval', label: 'Approvals' },
                  { value: 'System', label: 'System' },
                ]}
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllNotificationsRead}
              disabled={unreadCount === 0 || notifLoading}
              icon={<CheckCheck size={14} />}
            >
              Mark All Read
            </Button>
          </TableToolbar>

          {/* DataTable — Table on Desktop, Cards on Mobile */}
          <DataTable
            table={notifTable}
            columns={notifColumns}
            isLoading={notifLoading}
            totalCount={notifTotal}
            entityName="notifications"
            emptyTitle="No notifications found"
            emptyDescription="No system notifications match your search or filter criteria."
            renderMobileCard={renderNotifMobileCard}
          />
        </div>
      )}

      {/* ── Complete Meeting Task Modal ── */}
      <ConfirmModal
        isOpen={Boolean(completeModalItem)}
        onClose={() => setCompleteModalItem(null)}
        onConfirm={handleConfirmComplete}
        title="Complete Meeting Task"
        confirmText="Mark as Complete"
        confirmVariant="primary"
        loading={completeSubmitting}
      >
        <div className="space-y-3 py-2 text-left">
          <p className="text-xs text-text-muted">
            Are you sure you want to mark this scheduled meeting task as completed?
          </p>
          <div className="p-3 rounded-lg bg-surface border border-border">
            <p className="text-xs font-semibold text-heading">{completeModalItem?.title}</p>
            <p className="text-2xs text-text-muted mt-1">{completeModalItem?.description}</p>
          </div>

          <Textarea
            label="Completion Remarks / Minutes of Meeting Summary (Optional)"
            placeholder="Enter outcome, key decisions, or attendance remarks…"
            rows={3}
            value={completeRemarks}
            onChange={(e) => setCompleteRemarks(e.target.value)}
          />
        </div>
      </ConfirmModal>

      {/* ── Task Details Modal ── */}
      <Modal
        isOpen={Boolean(detailModalItem)}
        onClose={() => setDetailModalItem(null)}
        title={
          <div className="flex items-center gap-2">
            <Badge
              variant={detailModalItem?.itemType === 'Meeting' ? 'primary' : 'warning'}
              size="xs"
            >
              {detailModalItem?.itemType}
            </Badge>
            <span>Task Details</span>
            {detailLoading && (
              <Loader2 size={13} className="animate-spin text-primary ml-1" />
            )}
          </div>
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setDetailModalItem(null)}>
              Close
            </Button>
            {detailModalItem?.actionUrl && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const url = detailModalItem.actionUrl;
                  setDetailModalItem(null);
                  navigate(url);
                }}
                iconRight={<ExternalLink size={13} />}
              >
                Go to Record
              </Button>
            )}
          </div>
        }
      >
        {detailModalItem && (
          <div className="space-y-4 py-2 text-left">
            <div>
              <h4 className="text-sm font-semibold text-heading">{detailModalItem.title}</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {detailModalItem.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-surface border border-border text-xs">
              <div>
                <span className="text-3xs font-semibold uppercase text-text-muted">Due / Scheduled</span>
                <p className="font-medium text-text mt-0.5">
                  {formatDateTime(detailModalItem.dueDate || detailModalItem.showFromDate)}
                </p>
              </div>

              <div>
                <span className="text-3xs font-semibold uppercase text-text-muted">Priority</span>
                <div className="mt-0.5">
                  <Badge variant="outline" size="xs">
                    {detailModalItem.priority || 'Medium'}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-3xs font-semibold uppercase text-text-muted">Status</span>
                <div className="mt-0.5">
                  <StatusBadge status={detailModalItem.status} size="xs" />
                </div>
              </div>

              <div>
                <span className="text-3xs font-semibold uppercase text-text-muted">Assigned To</span>
                <p className="font-medium text-text mt-0.5">
                  {detailModalItem.assignedToName || detailModalItem.assignedToUserName || '—'}
                </p>
              </div>
            </div>

            {/* Reference Context */}
            {(detailModalItem.referenceType || detailModalItem.referenceId || detailModalItem.createdOn || (detailModalItem.metadata && Object.keys(detailModalItem.metadata).length > 0)) && (
              <div className="p-3.5 rounded-lg bg-surface/50 border border-border text-xs space-y-2">
                <span className="text-3xs font-semibold uppercase text-text-muted tracking-wider block">
                  Reference Context
                </span>
                {detailModalItem.referenceType && (
                  <div className="flex justify-between items-center text-2xs">
                    <span className="text-text-muted">Reference Type:</span>
                    <span className="font-medium text-heading">{detailModalItem.referenceType}</span>
                  </div>
                )}
                {detailModalItem.referenceId && (
                  <div className="flex justify-between items-center text-2xs">
                    <span className="text-text-muted">Reference ID:</span>
                    <span className="font-mono font-semibold text-primary">{detailModalItem.referenceId}</span>
                  </div>
                )}
                {detailModalItem.showFromDate && (
                  <div className="flex justify-between items-center text-2xs">
                    <span className="text-text-muted">Show From Date:</span>
                    <span className="font-medium text-heading">{detailModalItem.showFromDate}</span>
                  </div>
                )}
                {detailModalItem.createdOn && (
                  <div className="flex justify-between items-center text-2xs">
                    <span className="text-text-muted">Created On:</span>
                    <span className="font-mono text-heading">{formatDateTime(detailModalItem.createdOn)}</span>
                  </div>
                )}
                {detailModalItem.completedOn && (
                  <div className="flex justify-between items-center text-2xs">
                    <span className="text-text-muted">Completed On:</span>
                    <span className="font-mono text-heading">{formatDateTime(detailModalItem.completedOn)}</span>
                  </div>
                )}
                {detailModalItem.metadata && Object.entries(detailModalItem.metadata).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center text-2xs">
                    <span className="capitalize text-text-muted">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className="font-medium text-heading">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
