/**
 * DelegationViewPage.jsx — Full-page 360-degree view for a Delegation record.
 *
 * Route: /delegation/:id
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  DetailField,
} from '../../components/ui';
import {
  IconDelegation,
  IconBack,
  IconEdit,
  IconClose,
  IconUserCheck,
  IconClock,
  IconError,
} from '../../constants/icons';
import { getDelegation } from '../../services/delegation/delegationService';
import { formatDate, formatDateTime, getTodayISO } from '../../utils/dateUtils';
import { getDelegationStatus } from '../../utils/delegationUtils';
import {
  DELEGATION_STATUS,
  getApprovalPageLabel,
} from '../../constants/delegation';
import { getUserName } from '../../context/UsersContext';
import { useAuthContext } from '../../context/AuthContext';
import CancelDelegationModal from './components/CancelDelegationModal';

export default function DelegationViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const today = getTodayISO();

  const [delegation, setDelegation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Check admin role
  const isAdmin = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user?.roles : [user?.roles];
    return roles.some((r) => {
      const name = typeof r === 'string' ? r : r?.roleName || r?.name || '';
      const norm = name.trim().toLowerCase();
      return norm === 'admin' || norm === 'super admin';
    });
  }, [user]);

  const loadDelegation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDelegation(id);
      setDelegation(res);
    } catch (err) {
      setError(err?.message || `Delegation record "${id}" was not found.`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDelegation();
  }, [loadDelegation]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-xs text-text-muted">Loading delegation details…</p>
      </div>
    );
  }

  if (error || !delegation) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4 bg-bg border border-border shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Delegation Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested delegation record with ID "{id}" does not exist or has been removed.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/delegation')}>
            Back to Delegations
          </Button>
        </Card>
      </div>
    );
  }

  const statusKey = getDelegationStatus(delegation, today);
  const statusMeta = DELEGATION_STATUS[statusKey] || DELEGATION_STATUS.Ended;

  const delegatorName = getUserName(delegation.delegatorId);
  const delegateName = getUserName(delegation.delegateId);

  const isGivenByMe = String(delegation.delegatorId) === String(user?.id || user?.userId || 'u1');
  const isReceivedByMe = String(delegation.delegateId) === String(user?.id || user?.userId || 'u1');

  const pageTitle = isGivenByMe
    ? `Delegation to ${delegateName}`
    : isReceivedByMe
    ? `Delegation from ${delegatorName}`
    : `Delegation: ${delegatorName} → ${delegateName}`;

  const pageSubtitle = `From: ${delegatorName} • To: ${delegateName} • Period: ${formatDate(delegation.fromDate)} to ${formatDate(delegation.toDate)} (Inclusive)`;

  const hideEdit = Boolean(location.state?.hideEdit);
  const returnPath = location.state?.from || '/delegation';
  const backLabel = returnPath.startsWith('/delegation/all')
    ? 'Back to All Delegations'
    : 'Back to Delegations';

  const canEdit =
    !hideEdit &&
    isGivenByMe &&
    (statusKey === 'Active' || statusKey === 'Scheduled');

  const canCancel =
    (isGivenByMe || isAdmin) &&
    (statusKey === 'Active' || statusKey === 'Scheduled');

  const handleBack = () => {
    navigate(returnPath);
  };

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* ── Top Header & Actions ── */}
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={<IconDelegation className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleBack}
          >
            {backLabel}
          </Button>
        }
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={statusMeta.variant} size="md" className="font-semibold">
              {statusMeta.label}
            </Badge>
            <span className="font-mono text-2xs text-text-muted bg-surface border border-border px-2 py-0.5 rounded-md">
              ID: {delegation.id}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={IconEdit}
                onClick={() =>
                  navigate(`/delegation/${id}/edit`, {
                    state: { from: returnPath },
                  })
                }
                className="text-xs"
              >
                Edit Delegation
              </Button>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={IconClose}
                onClick={() => setIsCancelModalOpen(true)}
                className="text-xs shadow-2xs"
              >
                Cancel Delegation
              </Button>
            )}
          </div>
        }
      />

      {/* ── 2-Column Responsive Workspace Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (xl:col-span-7): Core Parameters & Handover Scope ── */}
        <div className="xl:col-span-7 space-y-6">
          {/* Core Parameters Card */}
          <Card padding="md" className="bg-bg shadow-2xs space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconUserCheck size={17} className="text-primary shrink-0" />
                <span>Delegation Assignment</span>
              </div>
              <span className="text-xs text-text-muted">Handover Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField
                label="Whose Work (From Delegator)"
                value={delegatorName}
                valueClassName="text-sm font-bold text-heading"
              />

              <DetailField
                label="Delegated To (Colleague)"
                value={delegateName}
                valueClassName="text-sm font-bold text-heading"
              />

              <div>
                <span className="view-field-label">Approval Page</span>
                <div className="mt-1">
                  <Badge variant="role" size="md" className="font-semibold">
                    {delegation.approvalPageLabel || getApprovalPageLabel(delegation.approvalPageKey || 'PR_APPROVAL')}
                  </Badge>
                </div>
              </div>

              <DetailField
                label="Reason"
                value={delegation.reason || '—'}
              />

              <DetailField
                label="Start Date (From)"
                value={formatDate(delegation.fromDate)}
                mono
              />

              <DetailField
                label="End Date (To, inclusive)"
                value={formatDate(delegation.toDate)}
                mono
              />

              {delegation.note && (
                <div className="sm:col-span-2 pt-2 border-t border-border/60">
                  <span className="view-field-label">Note for Delegate</span>
                  <p className="mt-1 text-xs text-heading bg-surface/50 p-3 rounded-control border border-border leading-relaxed break-words">
                    {delegation.note}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN (xl:col-span-5): Audit & Lifecycle ── */}
        <div className="xl:col-span-5 space-y-6">
          <Card padding="md" className="bg-bg shadow-2xs space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconClock size={17} className="text-primary shrink-0" />
                <span>Audit & Lifecycle</span>
              </div>
              <span className="text-xs text-text-muted">Timestamps & History</span>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 bg-surface rounded-control border border-border flex items-center justify-between">
                <div>
                  <span className="view-field-label">Current Status</span>
                  <span className="font-bold text-sm text-heading block mt-0.5">
                    {statusMeta.label}
                  </span>
                </div>
                <Badge variant={statusMeta.variant} size="md">
                  {statusMeta.label}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
                <DetailField
                  label="Created By"
                  value={getUserName(delegation.createdBy)}
                />
                <DetailField
                  label="Created On"
                  value={formatDateTime(delegation.createdAt)}
                  mono
                />
              </div>

              {delegation.cancelledAt && (
                <div className="space-y-3 pt-3 border-t border-danger/20 bg-danger/5 p-3 rounded-control border">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-danger">
                    <IconClose size={14} />
                    <span>Cancellation Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField
                      label="Cancelled By"
                      value={getUserName(delegation.cancelledBy)}
                      valueClassName="text-danger font-semibold"
                    />
                    <DetailField
                      label="Cancelled On"
                      value={formatDateTime(delegation.cancelledAt)}
                      mono
                      valueClassName="text-danger font-mono"
                    />
                    {delegation.cancelReason && (
                      <DetailField
                        label="Cancellation Reason"
                        value={delegation.cancelReason}
                        className="sm:col-span-2"
                        valueClassName="text-danger italic"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Cancel Delegation Modal ── */}
      <CancelDelegationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        delegation={delegation}
        onSuccess={() => {
          loadDelegation();
        }}
      />
    </div>
  );
}

