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
  IconRefresh,
} from '../../constants/icons';
import { getDelegation } from '../../services/delegation/delegationService';
import { formatDate, formatDateTime, getTodayISO } from '../../utils/dateUtils';
import { getDelegationStatus } from '../../utils/delegationUtils';
import {
  DELEGATION_STATUS,
  ALLOW_ADMIN_MANAGE_RECEIVED_DELEGATIONS,
} from '../../constants/delegation';
import { useAuthContext } from '../../context/AuthContext';
import CancelDelegationModal from './components/CancelDelegationModal';
import ReinstateDelegationModal from './components/ReinstateDelegationModal';

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
  const [isReinstateModalOpen, setIsReinstateModalOpen] = useState(false);

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
    let active = true;
    async function fetchRecord() {
      setLoading(true);
      setError(null);
      try {
        const res = await getDelegation(id);
        if (active) setDelegation(res);
      } catch (err) {
        if (active) setError(err?.message || `Delegation record "${id}" was not found.`);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchRecord();
    return () => {
      active = false;
    };
  }, [id]);

  const returnPath = location.state?.from || '/delegation';

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
            {error || `The requested delegation record with ID "${id}" does not exist or has been removed.`}
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/delegation')}>
            Back to Delegations
          </Button>
        </Card>
      </div>
    );
  }

  const statusKey = getDelegationStatus(delegation, today);
  const statusMeta = DELEGATION_STATUS[statusKey] || DELEGATION_STATUS.Expired;

  const delegatorName = delegation.delegatorName || `User #${delegation.delegatorUserId}`;
  const assignments = Array.isArray(delegation.assignments) ? delegation.assignments : [];
  const delegateNames = [...new Set(assignments.map((a) => a.delegateName).filter(Boolean))];
  const delegateSummary =
    delegateNames.length > 0 ? delegateNames.join(', ') : 'Assigned Delegate(s)';

  const currentUserId = String(user?.id || user?.userId || '');
  const isGivenByMe = currentUserId && String(delegation.delegatorUserId) === currentUserId;
  const isReceivedByMe =
    currentUserId && assignments.some((a) => String(a.delegateUserId) === currentUserId);

  const pageTitle = isGivenByMe
    ? `Delegation to ${delegateSummary}`
    : isReceivedByMe
    ? `Delegation from ${delegatorName}`
    : `Delegation: ${delegatorName} → ${delegateSummary}`;

  const pageSubtitle = `From: ${delegatorName} • Period: ${formatDate(delegation.startDate)} to ${formatDate(delegation.endDate)}${
    delegation.dayCount > 0 ? ` (${delegation.dayCount} day${delegation.dayCount === 1 ? '' : 's'})` : ''
  }`;

  const hideEdit = Boolean(location.state?.hideEdit);
  const backLabel = returnPath.startsWith('/delegation/all')
    ? 'Back to All Delegations'
    : 'Back to Delegations';

  const isFromReceivedTab = Boolean(location.state?.from?.includes('tab=received'));
  const isFromAllDelegations = returnPath.startsWith('/delegation/all');
  const isReceivedContext =
    isFromReceivedTab || (!isFromAllDelegations && isReceivedByMe && !isGivenByMe);
  const canManage =
    isGivenByMe || (isAdmin && (!isReceivedContext || ALLOW_ADMIN_MANAGE_RECEIVED_DELEGATIONS));
  const canEdit =
    !hideEdit &&
    canManage &&
    (delegation.canEdit || statusKey === 'InForce' || statusKey === 'Upcoming');
  const canCancel = canManage && (statusKey === 'InForce' || statusKey === 'Upcoming');
  const canReinstate =
    canManage &&
    statusKey === 'Cancelled' &&
    (!delegation.endDate || delegation.endDate >= today);

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
          <Badge variant={statusMeta.variant} size="md" className="font-semibold">
            {statusMeta.label}
          </Badge>
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
            {canReinstate && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={IconRefresh}
                onClick={() => setIsReinstateModalOpen(true)}
                className="text-xs"
              >
                Reinstate
              </Button>
            )}
          </div>
        }
      />

      {/* ── 2-Column Responsive Workspace Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (xl:col-span-7): Core Parameters & Assignments ── */}
        <div className="xl:col-span-7 space-y-6">
          {/* Core Parameters Card */}
          <Card padding="md" className="bg-bg shadow-2xs space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-sm">
                <IconUserCheck size={17} className="text-primary shrink-0" />
                <span>Delegation Parameters</span>
              </div>
              <span className="text-xs text-text-muted">Handover Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField
                label="Whose Work (From Delegator)"
                value={
                  delegation.delegatorEmail
                    ? `${delegatorName} (${delegation.delegatorEmail})`
                    : delegatorName
                }
                valueClassName="text-sm font-bold text-heading"
              />

              <DetailField
                label="Reason"
                value={delegation.reason || '—'}
              />

              <DetailField
                label="Start Date (From)"
                value={formatDate(delegation.startDate)}
                mono
              />

              <DetailField
                label="End Date (To, inclusive)"
                value={formatDate(delegation.endDate)}
                mono
              />
            </div>

            {/* Approval Page Assignments */}
            <div className="pt-3 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="view-field-label">
                  Approval Page Assignments ({assignments.length})
                </span>
              </div>

              {assignments.length > 0 ? (
                <div className="space-y-2.5">
                  {assignments.map((a, idx) => (
                    <div
                      key={a.delegationAssignmentId || `${a.moduleId}-${idx}`}
                      className="p-3 rounded-control border border-border bg-surface/40 space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant="role" size="sm" className="font-semibold">
                          {a.moduleName || a.moduleCode || `Module #${a.moduleId}`}
                        </Badge>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-heading block">
                            {a.delegateName || `User #${a.delegateUserId}`}
                          </span>
                          {a.delegateEmail && (
                            <span className="text-2xs text-text-muted block">
                              {a.delegateEmail}
                            </span>
                          )}
                        </div>
                      </div>
                      {a.note && (
                        <p className="text-xs text-text-muted bg-bg p-2 rounded border border-border/60 break-words">
                          {a.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">No assignments recorded.</p>
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
              <span className="text-xs text-text-muted">Status & Duration</span>
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
                  label="Duration"
                  value={
                    delegation.dayCount > 0
                      ? `${delegation.dayCount} day${delegation.dayCount === 1 ? '' : 's'}`
                      : '—'
                  }
                />
                {delegation.createdAt && (
                  <DetailField
                    label="Created On"
                    value={formatDateTime(delegation.createdAt)}
                    mono
                  />
                )}
              </div>

              {statusKey === 'Cancelled' && (
                <div className="p-3 rounded-control border border-danger/20 bg-danger/5 text-xs text-danger">
                  This delegation is currently cancelled.
                  {canReinstate && ' You can reinstate it using the Reinstate button above.'}
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

      {/* ── Reinstate Delegation Modal ── */}
      <ReinstateDelegationModal
        isOpen={isReinstateModalOpen}
        onClose={() => setIsReinstateModalOpen(false)}
        delegation={delegation}
        onSuccess={() => {
          loadDelegation();
        }}
      />
    </div>
  );
}
