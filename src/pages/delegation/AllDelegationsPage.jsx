/**
 * AllDelegationsPage.jsx — System-wide view of all delegations for Administrators and Managers.
 *
 * Route: /delegation/all
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  PageHeader,
  Button,
  DataTable,
  Badge,
  IconButton,
  TableToolbar,
  SearchableSelect,
  Card,
} from '../../components/ui';
import {
  IconDelegation,
  IconView,
  IconClose,
  IconWarning,
  IconRefresh,
} from '../../constants/icons';
import { listAllDelegations } from '../../services/delegation/delegationService';
import { formatDate, getTodayISO } from '../../utils/dateUtils';
import { getDelegationStatus } from '../../utils/delegationUtils';
import {
  DELEGATION_STATUS,
  getApprovalPageLabel,
} from '../../constants/delegation';
import { useUserOptions, getUserName } from '../../context/UsersContext';
import { useAuthContext } from '../../context/AuthContext';
import CancelDelegationModal from './components/CancelDelegationModal';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Ended', label: 'Ended' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function AllDelegationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const today = getTodayISO();
  const { options: userOptions } = useUserOptions();

  const [delegations, setDelegations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [fromUser, setFromUser] = useState('ALL');
  const [toUser, setToUser] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedForCancel, setSelectedForCancel] = useState(null);

  // Filter options for Delegator (From) and Delegate (To)
  const fromOptions = useMemo(
    () => [{ value: 'ALL', label: 'From (All Users)' }, ...(userOptions || [])],
    [userOptions]
  );

  const toOptions = useMemo(
    () => [{ value: 'ALL', label: 'To (All Users)' }, ...(userOptions || [])],
    [userOptions]
  );

  const hasActiveFilters = Boolean(
    search.trim() || fromUser !== 'ALL' || toUser !== 'ALL' || statusFilter !== 'ALL'
  );

  const resetFilters = () => {
    setSearch('');
    setFromUser('ALL');
    setToUser('ALL');
    setStatusFilter('ALL');
  };

  // Check if current user is admin/super admin
  const isAdmin = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles : [user?.roles];
    return roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.roleName || r?.name || '';
      const norm = name.trim().toLowerCase();
      return norm === 'admin' || norm === 'super admin';
    });
  }, [user]);

  // Load all system delegations
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAllDelegations({
        includeEnded: true,
        search,
        delegatorId: fromUser,
        delegateId: toUser,
        status: statusFilter,
      });
      setDelegations(res);
    } catch (err) {
      setError(err?.message || 'Failed to load delegations.');
    } finally {
      setLoading(false);
    }
  }, [search, fromUser, toUser, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Table Columns Definition
  const columns = useMemo(() => {
    return [
      {
        id: 'delegator',
        header: 'DELEGATING USER',
        accessorFn: (row) => getUserName(row.delegatorId),
        cell: ({ getValue, row }) => {
          const name = getValue();
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-heading truncate block" title={name}>
                  {name}
                </span>
                <span className="text-2xs text-text-muted font-mono block">
                  ID: {row.original.delegatorId}
                </span>
              </div>
            </div>
          );
        },
        size: 190,
      },
      {
        id: 'delegate',
        header: 'DELEGATE (TO)',
        accessorFn: (row) => getUserName(row.delegateId),
        cell: ({ getValue, row }) => {
          const name = getValue();
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-surface text-heading border border-border flex items-center justify-center font-bold text-xs shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-heading truncate block" title={name}>
                  {name}
                </span>
                <span className="text-2xs text-text-muted font-mono block">
                  ID: {row.original.delegateId}
                </span>
              </div>
            </div>
          );
        },
        size: 190,
      },
      {
        id: 'approvalPage',
        header: 'APPROVAL PAGE',
        cell: ({ row }) => {
          const label =
            row.original.approvalPageLabel ||
            (row.original.approvalPageKey
              ? getApprovalPageLabel(row.original.approvalPageKey)
              : 'Approval Access');
          return (
            <Badge variant="role" size="sm" className="font-semibold">
              {label}
            </Badge>
          );
        },
        size: 190,
      },
      {
        id: 'period',
        header: 'PERIOD',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-heading whitespace-nowrap">
            {formatDate(row.original.fromDate)} to {formatDate(row.original.toDate)}
          </span>
        ),
        size: 190,
      },
      {
        id: 'reason',
        header: 'REASON',
        accessorKey: 'reason',
        cell: ({ getValue }) => (
          <span className="text-xs text-text font-medium">{getValue() || '—'}</span>
        ),
        size: 110,
      },
      {
        id: 'status',
        header: 'STATUS',
        cell: ({ row }) => {
          const status = getDelegationStatus(row.original, today);
          const meta = DELEGATION_STATUS[status] || DELEGATION_STATUS.Ended;
          return (
            <Badge variant={meta.variant} size="md">
              {meta.label}
            </Badge>
          );
        },
        size: 110,
      },
      {
        id: 'note',
        header: 'NOTE',
        accessorKey: 'note',
        cell: ({ getValue }) => {
          const noteText = getValue() || '—';
          return (
            <span
              className="text-xs text-text-muted truncate block max-w-xs"
              title={noteText !== '—' ? noteText : undefined}
            >
              {noteText}
            </span>
          );
        },
        size: 160,
      },
      {
        id: 'actions',
        header: 'ACTIONS',
        cell: ({ row }) => {
          const d = row.original;
          const status = getDelegationStatus(d, today);
          const canCancel =
            (String(d.delegatorId) === String(user?.id || user?.userId || 'u1') || isAdmin) &&
            (status === 'Active' || status === 'Scheduled');

          return (
            <div className="flex items-center justify-end gap-1">
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                icon={IconView}
                title="View delegation details"
                aria-label="View delegation details"
                onClick={() => navigate(`/delegation/${d.id}`, { state: { hideEdit: true } })}
                className="text-text-muted hover:text-primary hover:bg-primary/10"
              />
              {canCancel && (
                <IconButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={IconClose}
                  title="Cancel delegation"
                  aria-label="Cancel delegation"
                  onClick={() => setSelectedForCancel(d)}
                  className="text-text-muted hover:text-danger hover:bg-danger/10"
                />
              )}
            </div>
          );
        },
        size: 70,
      },
    ];
  }, [today, user, isAdmin, navigate]);

  const table = useReactTable({
    data: delegations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  // Mobile stacked cards for small screens
  const renderMobileCard = (row) => {
    const d = row.original;
    const delegatorName = getUserName(d.delegatorId);
    const delegateName = getUserName(d.delegateId);
    const status = getDelegationStatus(d, today);
    const meta = DELEGATION_STATUS[status] || DELEGATION_STATUS.Ended;
    const canCancel =
      (String(d.delegatorId) === String(user?.id || user?.userId || 'u1') || isAdmin) &&
      (status === 'Active' || status === 'Scheduled');

    return (
      <Card key={d.id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        {/* Card Header: Delegator -> Delegate, with Status badge */}
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs flex-wrap font-medium">
              <span className="font-bold text-heading">{delegatorName}</span>
              <span className="text-text-muted font-normal">&rarr;</span>
              <span className="font-bold text-heading">{delegateName}</span>
            </div>
            <span className="text-2xs text-text-muted font-mono block mt-0.5">
              ID: {d.id}
            </span>
          </div>
          <Badge variant={meta.variant} size="md" className="shrink-0">
            {meta.label}
          </Badge>
        </div>

        {/* Handover Details */}
        <div className="space-y-2.5 text-xs">
          {/* Approval Page Authority — Dedicated full-width line to prevent overlap */}
          <div>
            <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block mb-1">
              Approval Authority
            </span>
            <Badge variant="role" size="sm" className="font-semibold max-w-full">
              {d.approvalPageLabel || (d.approvalPageKey ? getApprovalPageLabel(d.approvalPageKey) : 'Approval Access')}
            </Badge>
          </div>

          {/* Period & Reason — Clean 2-column layout */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
            <div className="min-w-0">
              <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block mb-0.5">
                Period
              </span>
              <span className="font-mono text-heading text-2xs block truncate" title={`${formatDate(d.fromDate)} – ${formatDate(d.toDate)}`}>
                {formatDate(d.fromDate)} &ndash; {formatDate(d.toDate)}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block mb-0.5">
                Reason
              </span>
              <span className="text-heading text-xs font-medium block truncate" title={d.reason || '—'}>
                {d.reason || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        {d.note && (
          <p className="text-xs text-text-muted bg-surface/50 p-2.5 rounded-control border border-border/60 leading-relaxed break-words">
            {d.note}
          </p>
        )}

        {/* Card Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconView}
            onClick={() => navigate(`/delegation/${d.id}`, { state: { hideEdit: true } })}
            className="text-xs"
          >
            Details
          </Button>
          {canCancel && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={IconClose}
              onClick={() => setSelectedForCancel(d)}
              className="text-xs"
            >
              Cancel
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-16 w-full">
      {/* ── Top Page Header ── */}
      <PageHeader
        title="All Delegations"
        subtitle={<span className="hidden sm:inline">System-wide administration of all employee approval handovers and active delegations.</span>}
        icon={<IconDelegation className="h-6 w-6 text-primary" aria-hidden="true" />}
      />

      {/* ── Standard Table Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by user, page, reason, or note…"
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset Filters"
      >
        {/* From: Delegator Filter */}
        <div className="w-full sm:w-52">
          <SearchableSelect
            id="filter-delegator"
            placeholder="From (All Users)"
            searchPlaceholder="Search delegator…"
            options={fromOptions}
            value={fromUser}
            onChange={(e) => setFromUser(e.target.value)}
          />
        </div>

        {/* To: Delegate Filter */}
        <div className="w-full sm:w-52">
          <SearchableSelect
            id="filter-delegate"
            placeholder="To (All Users)"
            searchPlaceholder="Search delegate…"
            options={toOptions}
            value={toUser}
            onChange={(e) => setToUser(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="filter-status"
            placeholder="All Statuses"
            searchPlaceholder="Search status…"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Error Banner ── */}
      {error && !loading && (
        <Card padding="lg" className="border border-danger-border bg-danger-bg/20 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconWarning size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-heading">Failed to Load Delegations</h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">{error}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconRefresh}
            onClick={loadData}
            className="mt-2"
          >
            Retry
          </Button>
        </Card>
      )}

      {/* ── Main Data Table ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={loading}
        emptyTitle="No delegations found"
        emptyDescription="There are currently no active or scheduled delegations matching your criteria."
        entityName="delegations"
        renderMobileCard={renderMobileCard}
      />

      {/* ── Cancel Delegation Modal ── */}
      <CancelDelegationModal
        isOpen={Boolean(selectedForCancel)}
        onClose={() => setSelectedForCancel(null)}
        delegation={selectedForCancel}
        onSuccess={loadData}
      />
    </div>
  );
}

