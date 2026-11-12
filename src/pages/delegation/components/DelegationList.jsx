/**
 * DelegationList.jsx — DataTable view for active/historical delegations with responsive mobile cards.
 */

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  DataTable,
  Badge,
  IconButton,
  Button,
  Card,
} from '../../../components/ui';
import {
  IconView,
  IconEdit,
  IconClose,
  IconAdd,
  IconWarning,
  IconRefresh,
} from '../../../constants/icons';
import { formatDate, getTodayISO } from '../../../utils/dateUtils';
import { getDelegationStatus } from '../../../utils/delegationUtils';
import {
  DELEGATION_STATUS,
  ALLOW_ADMIN_MANAGE_RECEIVED_DELEGATIONS,
} from '../../../constants/delegation';
import { useAuthContext } from '../../../context/AuthContext';

function getAssignmentSummary(delegation, activeTab) {
  const assignments = Array.isArray(delegation?.assignments) ? delegation.assignments : [];

  if (activeTab === 'received') {
    return {
      primaryName: delegation?.delegatorName || `User #${delegation?.delegatorUserId || ''}`,
      secondaryText: delegation?.delegatorEmail || '',
    };
  }

  const uniqueDelegates = [...new Set(assignments.map((a) => a.delegateName).filter(Boolean))];
  const uniqueEmails = [...new Set(assignments.map((a) => a.delegateEmail).filter(Boolean))];

  return {
    primaryName: uniqueDelegates.length > 0 ? uniqueDelegates.join(', ') : 'Assigned Delegate',
    secondaryText:
      uniqueDelegates.length === 1 && uniqueEmails[0]
        ? uniqueEmails[0]
        : `${assignments.length} assignment${assignments.length === 1 ? '' : 's'}`,
  };
}

function getModuleLabels(delegation) {
  const assignments = Array.isArray(delegation?.assignments) ? delegation.assignments : [];
  const labels = [...new Set(assignments.map((a) => a.moduleName || a.moduleCode).filter(Boolean))];
  return labels.length > 0 ? labels : ['Approval Access'];
}

export default function DelegationList({
  delegations = [],
  activeTab = 'given',
  loading = false,
  error = null,
  onRetry,
  onView,
  onEdit,
  onCancel,
  onReinstate,
  onNewDelegation,
}) {
  const { user } = useAuthContext();
  const today = getTodayISO();

  const isAdmin = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user?.roles : [user?.roles];
    return roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.roleName || r?.name || '';
      const norm = name.trim().toLowerCase();
      return norm === 'admin' || norm === 'super admin';
    });
  }, [user]);

  const columns = useMemo(() => {
    const userHeader = activeTab === 'given' ? 'DELEGATE(S)' : 'DELEGATED BY';

    return [
      {
        id: 'user',
        header: userHeader,
        accessorFn: (row) => getAssignmentSummary(row, activeTab).primaryName,
        cell: ({ row }) => {
          const { primaryName, secondaryText } = getAssignmentSummary(row.original, activeTab);
          return (
            <div className="min-w-0">
              <span className="font-semibold text-heading truncate block" title={primaryName}>
                {primaryName}
              </span>
              {secondaryText && (
                <span className="text-2xs text-text-muted truncate block" title={secondaryText}>
                  {secondaryText}
                </span>
              )}
            </div>
          );
        },
        size: 175,
      },
      {
        id: 'scope',
        header: 'APPROVAL PAGES',
        cell: ({ row }) => {
          const labels = getModuleLabels(row.original);
          return (
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <Badge key={label} variant="role" size="sm" className="font-semibold">
                  {label}
                </Badge>
              ))}
            </div>
          );
        },
        size: 175,
      },
      {
        id: 'period',
        header: 'PERIOD',
        accessorFn: (row) => `${row.startDate} to ${row.endDate}`,
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
        size: 175,
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
            activeTab === 'given' || (ALLOW_ADMIN_MANAGE_RECEIVED_DELEGATIONS && isAdmin);
          const canEdit = canManage && (d.canEdit || status === 'InForce' || status === 'Upcoming');
          const canCancel = canManage && (status === 'InForce' || status === 'Upcoming');
          const canReinstate =
            canManage &&
            status === 'Cancelled' &&
            (!d.endDate || d.endDate >= today) &&
            Boolean(onReinstate);

          return (
            <div className="flex items-center justify-end gap-1 pr-2">
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                icon={IconView}
                title="View delegation details"
                aria-label="View delegation details"
                onClick={() => onView?.(d)}
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
                  onClick={() => onEdit?.(d)}
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
                  onClick={() => onCancel?.(d)}
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
                  onClick={() => onReinstate?.(d)}
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
  }, [activeTab, today, isAdmin, onView, onEdit, onCancel, onReinstate]);

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

  const renderMobileCard = (row) => {
    const d = row.original;
    const { primaryName } = getAssignmentSummary(d, activeTab);
    const moduleLabels = getModuleLabels(d);
    const status = getDelegationStatus(d, today);
    const meta = DELEGATION_STATUS[status] || DELEGATION_STATUS.Expired;
    const canManage =
      activeTab === 'given' || (ALLOW_ADMIN_MANAGE_RECEIVED_DELEGATIONS && isAdmin);
    const canEdit = canManage && (d.canEdit || status === 'InForce' || status === 'Upcoming');
    const canCancel = canManage && (status === 'InForce' || status === 'Upcoming');
    const canReinstate =
      canManage &&
      status === 'Cancelled' &&
      (!d.endDate || d.endDate >= today) &&
      Boolean(onReinstate);

    return (
      <Card key={d.id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {primaryName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-2xs uppercase text-text-muted font-semibold block">
                {activeTab === 'given' ? 'Delegate(s)' : 'Delegated by'}
              </span>
              <span className="font-bold text-sm text-heading truncate block">
                {primaryName}
              </span>
            </div>
          </div>
          <Badge variant={meta.variant} size="md">
            {meta.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-2xs text-text-muted block">Period</span>
            <span className="font-mono text-heading font-medium text-2xs sm:text-xs">
              {formatDate(d.startDate)} – {formatDate(d.endDate)}
            </span>
          </div>
          <div>
            <span className="text-2xs text-text-muted block">Reason</span>
            <span className="text-heading font-medium">{d.reason}</span>
          </div>
        </div>

        <div>
          <span className="text-2xs text-text-muted block mb-1">Approval Pages</span>
          <div className="flex flex-wrap gap-1">
            {moduleLabels.map((label) => (
              <Badge key={label} variant="role" size="sm" className="font-semibold">
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconView}
            onClick={() => onView?.(d)}
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
              onClick={() => onEdit?.(d)}
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
              onClick={() => onCancel?.(d)}
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
              onClick={() => onReinstate?.(d)}
              className="text-xs"
            >
              Reinstate
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (error && !loading) {
    return (
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
          onClick={onRetry}
          className="mt-2"
        >
          Retry
        </Button>
      </Card>
    );
  }

  const emptyTitle =
    activeTab === 'given'
      ? 'You have no delegations'
      : 'Nobody has delegated work to you';

  const emptyDescription =
    activeTab === 'given'
      ? 'Click New Delegation before you go on leave.'
      : 'When colleagues delegate their approvals to you, they will appear here.';

  const emptyAction =
    activeTab === 'given' ? (
      <Button
        type="button"
        variant="primary"
        size="sm"
        icon={IconAdd}
        onClick={onNewDelegation}
        className="text-xs"
      >
        New Delegation
      </Button>
    ) : null;

  return (
    <DataTable
      table={table}
      columns={columns}
      isLoading={loading}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
      entityName="delegations"
      renderMobileCard={renderMobileCard}
    />
  );
}
