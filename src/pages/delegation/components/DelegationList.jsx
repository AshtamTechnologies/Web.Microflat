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
  getApprovalPageLabel,
} from '../../../constants/delegation';
import { getUserName } from '../../../context/UsersContext';
import { useAuthContext } from '../../../context/AuthContext';

export default function DelegationList({
  delegations = [],
  activeTab = 'given',
  loading = false,
  error = null,
  onRetry,
  onView,
  onEdit,
  onCancel,
  onNewDelegation,
}) {
  const { user } = useAuthContext();
  const today = getTodayISO();

  // Check admin role
  const isAdmin = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user?.roles : [user?.roles];
    return roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.roleName || r?.name || '';
      const norm = name.trim().toLowerCase();
      return norm === 'admin' || norm === 'super admin';
    });
  }, [user]);

  // Table Column Definitions
  const columns = useMemo(() => {
    const userHeader = activeTab === 'given' ? 'DELEGATE' : 'DELEGATED BY';

    return [
      {
        id: 'user',
        header: userHeader,
        accessorFn: (row) =>
          activeTab === 'given'
            ? getUserName(row.delegateId)
            : getUserName(row.delegatorId),
        cell: ({ getValue, row }) => {
          const name = getValue();
          const targetId =
            activeTab === 'given' ? row.original.delegateId : row.original.delegatorId;
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
                  ID: {targetId}
                </span>
              </div>
            </div>
          );
        },
        size: 190,
      },
      {
        id: 'period',
        header: 'PERIOD',
        accessorFn: (row) => `${row.fromDate} to ${row.toDate}`,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-heading whitespace-nowrap">
            {formatDate(row.original.fromDate)} to {formatDate(row.original.toDate)}
          </span>
        ),
        size: 200,
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
        id: 'scope',
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
        size: 100,
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
            (activeTab === 'given' || isAdmin) &&
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
                onClick={() => onView?.(d)}
                className="text-text-muted hover:text-primary hover:bg-primary/10"
              />
              {canCancel && (
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
            </div>
          );
        },
        size: 85,
      },
    ];
  }, [activeTab, today, isAdmin, onView, onCancel]);

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

  // Mobile Stacked Card Renderer (for screens < md)
  const renderMobileCard = (row) => {
    const d = row.original;
    const targetName =
      activeTab === 'given' ? getUserName(d.delegateId) : getUserName(d.delegatorId);
    const status = getDelegationStatus(d, today);
    const meta = DELEGATION_STATUS[status] || DELEGATION_STATUS.Ended;
    const canCancel =
      (activeTab === 'given' || isAdmin) &&
      (status === 'Active' || status === 'Scheduled');

    return (
      <Card key={d.id} padding="md" className="space-y-3 bg-bg border border-border shadow-2xs">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {targetName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-2xs uppercase text-text-muted font-semibold block">
                {activeTab === 'given' ? 'Delegate' : 'Delegated by'}
              </span>
              <span className="font-bold text-sm text-heading truncate block">
                {targetName}
              </span>
            </div>
          </div>
          <Badge variant={meta.variant} size="md">
            {meta.label}
          </Badge>
        </div>

        {/* Period & Reason */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-2xs text-text-muted block">Period</span>
            <span className="font-mono text-heading font-medium text-2xs sm:text-xs">
              {formatDate(d.fromDate)} – {formatDate(d.toDate)}
            </span>
          </div>
          <div>
            <span className="text-2xs text-text-muted block">Reason</span>
            <span className="text-heading font-medium">{d.reason}</span>
          </div>
        </div>

        {/* Approval Page Authority */}
        <div>
          <span className="text-2xs text-text-muted block mb-1">Approval Authority</span>
          <Badge variant="role" size="sm" className="font-semibold">
            {d.approvalPageLabel || (d.approvalPageKey ? getApprovalPageLabel(d.approvalPageKey) : 'Approval Access')}
          </Badge>
        </div>

        {/* Note */}
        {d.note && (
          <p className="text-xs text-text-muted bg-surface/50 p-2 rounded-control border border-border/60">
            {d.note}
          </p>
        )}

        {/* Card Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
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
          {canCancel && (
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
        </div>
      </Card>
    );
  };

  // Error State Display
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

  // Empty state configuration based on active tab
  const emptyTitle =
    activeTab === 'given'
      ? 'You have no delegations'
      : 'Nobody has delegated work to you';

  const emptyDescription =
    activeTab === 'given'
      ? 'Click New Delegation before you go on leave.'
      : 'When colleagues delegate their inquiries, requisitions, or approvals to you, they will appear here.';

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

