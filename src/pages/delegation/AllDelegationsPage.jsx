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
  IconAdd,
  IconEdit,
  IconView,
  IconClose,
  IconWarning,
  IconRefresh,
} from '../../constants/icons';
import { listDelegations } from '../../services/delegation/delegationService';
import { formatDate, getTodayISO } from '../../utils/dateUtils';
import { getDelegationStatus } from '../../utils/delegationUtils';
import {
  DELEGATION_STATUS,
  DELEGATION_STATUS_OPTIONS,
} from '../../constants/delegation';
import { useUserOptions } from '../../context/UsersContext';
import { useAuthContext } from '../../context/AuthContext';
import CancelDelegationModal from './components/CancelDelegationModal';
import ReinstateDelegationModal from './components/ReinstateDelegationModal';

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
  const [selectedForReinstate, setSelectedForReinstate] = useState(null);

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
      const res = await listDelegations({
        search: search.trim() || undefined,
        delegatorUserId: fromUser !== 'ALL' ? fromUser : undefined,
        delegateUserId: toUser !== 'ALL' ? toUser : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        pageNumber: 1,
        pageSize: 50,
      });
      setDelegations(res.items || []);
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
        accessorFn: (row) => row.delegatorName || `User #${row.delegatorUserId}`,
        cell: ({ getValue, row }) => {
          const name = getValue();
          return (
            <div className="min-w-0">
              <span className="font-semibold text-heading truncate block" title={name}>
                {name}
              </span>
              {row.original.delegatorEmail && (
                <span className="text-2xs text-text-muted truncate block" title={row.original.delegatorEmail}>
                  {row.original.delegatorEmail}
                </span>
              )}
            </div>
          );
        },
        size: 165,
      },
      {
        id: 'delegate',
        header: 'DELEGATE(S)',
        accessorFn: (row) => {
          const names = [...new Set((row.assignments || []).map((a) => a.delegateName).filter(Boolean))];
          return names.length > 0 ? names.join(', ') : 'Assigned Delegate';
        },
        cell: ({ getValue, row }) => {
          const names = getValue();
          const count = row.original.assignments?.length || 0;
          return (
            <div className="min-w-0">
              <span className="font-semibold text-heading truncate block" title={names}>
                {names}
              </span>
              <span className="text-2xs text-text-muted block">
                {count} assignment{count === 1 ? '' : 's'}
              </span>
            </div>
          );
        },
        size: 165,
      },
      {
        id: 'approvalPage',
        header: 'APPROVAL PAGES',
        cell: ({ row }) => {
          const labels = [
            ...new Set(
              (row.original.assignments || [])
                .map((a) => a.moduleName || a.moduleCode)
                .filter(Boolean)
            ),
          ];
          const display = labels.length > 0 ? labels : ['Approval Access'];
          return (
            <div className="flex flex-wrap gap-1">
              {display.map((label) => (
                <Badge key={label} variant="role" size="sm" className="font-semibold">
                  {label}
                </Badge>
              ))}
            </div>
          );
        },
        size: 170,
      },
      {
        id: 'period',
        header: 'PERIOD',
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <span className="font-mono text-xs text-heading block">
              {formatDate(row.original.startDate)} to {formatDate(row.original.endDate)}
            </span>
            {row.original.dayCount > 0 && (
              <span className="text-2xs text-text-muted">
                {row.original.dayCount} day{row.original.dayCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        ),
        size: 170,
      },
      {
        id: 'status',
        header: 'STATUS',
        cell: ({ row }) => {
          const status = getDelegationStatus(row.original, today);
          const meta = DELEGATION_STATUS[status] || DELEGATION_STATUS.Expired;
          return (
            <Badge variant={meta.variant} size="md">
              {meta.label}
            </Badge>
          );
        },
        size: 100,
      },
      {
        id: 'actions',
        header: () => <div className="text-right pr-2">ACTIONS</div>,
        cell: ({ row }) => {
          const d = row.original;
          const status = getDelegationStatus(d, today);
          const canManage =
            String(d.delegatorUserId) === String(user?.id || user?.userId || '') || isAdmin;
          const canEdit = canManage && (d.canEdit || status === 'InForce' || status === 'Upcoming');
          const canCancel = canManage && (status === 'InForce' || status === 'Upcoming');
          const canReinstate =
            canManage && status === 'Cancelled' && (!d.endDate || d.endDate >= today);

          return (
            <div className="flex items-center justify-end gap-1 pr-2">
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                icon={IconView}
                title="View delegation details"
                aria-label="View delegation details"
                onClick={() => navigate(`/delegation/${d.id}`, { state: { from: '/delegation/all' } })}
                className="text-text-muted hover:text-primary hover:bg-primary/10"
              />
              {canEdit && (
                <IconButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={IconEdit}
                  title="Edit delegation"
                  aria-label="Edit delegation"
                  onClick={() => navigate(`/delegation/${d.id}/edit`, { state: { from: '/delegation/all' } })}
                  className="text-text-muted hover:text-primary hover:bg-primary/10"
                />
              )}
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
              {canReinstate && (
                <IconButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={IconRefresh}
                  title="Reinstate delegation"
                  aria-label="Reinstate delegation"
                  onClick={() => setSelectedForReinstate(d)}
                  className="text-text-muted hover:text-success hover:bg-success/10"
                />
              )}
            </div>
          );
        },
        size: 145,
        minSize: 130,
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
    const delegatorName = d.delegatorName || `User #${d.delegatorUserId}`;
    const delegateNames =
      [...new Set((d.assignments || []).map((a) => a.delegateName).filter(Boolean))].join(', ') ||
      'Assigned Delegate';
    const moduleLabels = [
      ...new Set((d.assignments || []).map((a) => a.moduleName || a.moduleCode).filter(Boolean)),
    ];
    const displayLabels = moduleLabels.length > 0 ? moduleLabels : ['Approval Access'];
    const status = getDelegationStatus(d, today);
    const meta = DELEGATION_STATUS[status] || DELEGATION_STATUS.Expired;
    const canManage =
      String(d.delegatorUserId) === String(user?.id || user?.userId || '') || isAdmin;
    const canEdit = canManage && (d.canEdit || status === 'InForce' || status === 'Upcoming');
    const canCancel = canManage && (status === 'InForce' || status === 'Upcoming');
    const canReinstate =
      canManage && status === 'Cancelled' && (!d.endDate || d.endDate >= today);

    return (
      <Card key={d.id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        {/* Card Header: Delegator -> Delegate, with Status badge */}
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs flex-wrap font-medium">
              <span className="font-bold text-heading">{delegatorName}</span>
              <span className="text-text-muted font-normal">&rarr;</span>
              <span className="font-bold text-heading">{delegateNames}</span>
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
          {/* Approval Page Authority */}
          <div>
            <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block mb-1">
              Approval Authority
            </span>
            <div className="flex flex-wrap gap-1">
              {displayLabels.map((label) => (
                <Badge key={label} variant="role" size="sm" className="font-semibold max-w-full">
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Period & Reason — Clean 2-column layout */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
            <div className="min-w-0">
              <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block mb-0.5">
                Period
              </span>
              <span className="font-mono text-heading text-2xs block truncate" title={`${formatDate(d.startDate)} – ${formatDate(d.endDate)}`}>
                {formatDate(d.startDate)} &ndash; {formatDate(d.endDate)}
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

        {/* Card Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconView}
            onClick={() => navigate(`/delegation/${d.id}`, { state: { from: '/delegation/all' } })}
            className="text-xs"
          >
            Details
          </Button>
          {canEdit && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={IconEdit}
              onClick={() => navigate(`/delegation/${d.id}/edit`, { state: { from: '/delegation/all' } })}
              className="text-xs"
            >
              Edit
            </Button>
          )}
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
          {canReinstate && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={IconRefresh}
              onClick={() => setSelectedForReinstate(d)}
              className="text-xs"
            >
              Reinstate
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
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconAdd}
            onClick={() => navigate('/delegation/new', { state: { from: '/delegation/all' } })}
            className="shadow-2xs text-xs font-semibold"
          >
            Add New Delegation
          </Button>
        }
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
            options={DELEGATION_STATUS_OPTIONS}
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

      {/* ── Reinstate Delegation Modal ── */}
      <ReinstateDelegationModal
        isOpen={Boolean(selectedForReinstate)}
        onClose={() => setSelectedForReinstate(null)}
        delegation={selectedForReinstate}
        onSuccess={loadData}
      />
    </div>
  );
}

