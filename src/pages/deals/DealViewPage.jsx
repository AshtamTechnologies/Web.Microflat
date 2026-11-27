/**
 * src/pages/deals/DealViewPage.jsx — Detail screen for a single Deal.
 * Displays deal commercial information, workflow action permissions, and negotiation history timeline.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Card,
  StatusBadge,
  Badge,
  DetailField,
  EmptyState,
} from '../../components/ui';
import {
  IconQuotation,
  IconInquiry,
  IconClient,
  IconEdit,
  IconAdd,
  IconBack,
} from '../../constants/icons';
import { useDealsContext } from '../../context/DealsContext';
import DealStatusModal from './DealStatusModal';
import NegotiationModal from './NegotiationModal';
import DealFormModal from './DealFormModal';
import { formatDate } from '../../utils/dateUtils';

function formatCurrency(val, currency = 'INR', symbol = null) {
  if (val === null || val === undefined || val === '') return '—';
  const sym = symbol || (currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹');
  return `${sym}${Number(val).toLocaleString('en-IN')}`;
}

export default function DealViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    fetchDealDetail,
    updateDeal,
    changeDealStatus,
    addNegotiation,
    updateNegotiation,
    lookups,
  } = useDealsContext();

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isEditDealOpen, setIsEditDealOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState(null);
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [negotiationToEdit, setNegotiationToEdit] = useState(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const loadCurrentDeal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchDealDetail(id);
      setDeal(data || null);
    } catch (err) {
      console.error('Failed to load deal:', err);
      setDeal(null);
    } finally {
      setLoading(false);
    }
  }, [id, fetchDealDetail]);

  useEffect(() => {
    loadCurrentDeal();
  }, [loadCurrentDeal]);

  // Status transitions
  const handleStatusChangeClick = (status) => {
    setTargetStatus(status);
    setIsStatusModalOpen(true);
  };

  const handleStatusConfirm = async (statusId, remarks) => {
    setIsActionSubmitting(true);
    try {
      const updated = await changeDealStatus(deal.id, statusId, remarks);
      if (updated) {
        setDeal(updated);
        setIsStatusModalOpen(false);
      }
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Edit deal save
  const handleEditDealSave = async (formData) => {
    setIsActionSubmitting(true);
    try {
      const updated = await updateDeal(deal.id, formData);
      if (updated) {
        setDeal(updated);
        setIsEditDealOpen(false);
      }
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Add / Edit negotiation save
  const handleNegotiationSave = async (formData) => {
    setIsActionSubmitting(true);
    try {
      if (negotiationToEdit) {
        await updateNegotiation(negotiationToEdit.id, formData);
      } else {
        await addNegotiation(deal.id, formData);
      }
      setIsNegotiationModalOpen(false);
      setNegotiationToEdit(null);
      // Reload deal to refresh negotiations and audit state
      await loadCurrentDeal();
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Navigate to Create Quotation with deal pre-population
  const handleCreateQuotation = () => {
    navigate(`/quotations/new?inquiryId=${deal.inquiryId}`, {
      state: {
        fromDeal: true,
        dealId: deal.id,
        dealNo: deal.dealNo,
        inquiryId: deal.inquiryId,
        inquiryNo: deal.inquiryNo,
        clientId: deal.clientId,
        clientName: deal.clientName,
        quotationValue: deal.negotiatedValue ?? deal.expectedValue,
        currencyId: deal.currencyId,
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-surface rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-surface rounded col-span-2" />
          <div className="h-48 bg-surface rounded" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="py-12 text-center">
        <EmptyState
          title="Deal Not Found"
          description="The requested deal could not be located or has been archived."
          action={
            <Button variant="secondary" onClick={() => navigate('/deals')}>
              Back to Deals
            </Button>
          }
        />
      </div>
    );
  }

  const getStatusBadge = (statusName) => {
    switch (statusName) {
      case 'Won':
        return <Badge variant="success" size="md">Won</Badge>;
      case 'On Hold':
        return <Badge variant="warning" size="md">On Hold</Badge>;
      case 'Lost':
        return <Badge variant="danger" size="md">Lost</Badge>;
      default:
        return <Badge variant="primary" size="md">Open</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title={deal.dealNo}
        subtitle={
          <span className="flex items-center gap-2 flex-wrap">
            <span>Client: <strong className="text-heading font-medium">{deal.clientName}</strong></span>
            <span>•</span>
            <Link
              to={`/inquiries/${deal.inquiryId}`}
              className="text-primary hover:underline font-mono inline-flex items-center gap-1"
            >
              <IconInquiry size={13} /> {deal.inquiryNo}
            </Link>
          </span>
        }
        badge={getStatusBadge(deal.dealStatus)}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate(location.state?.from || '/deals')}
          >
            {location.state?.fromTitle || 'Back to Deals'}
          </Button>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Create Quotation (when canQuote is true) */}
            {deal.canQuote && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateQuotation}
                className="shadow-2xs text-xs font-semibold"
              >
                <IconQuotation size={15} className="mr-1.5" />
                Create Quotation
              </Button>
            )}

            {/* Edit Deal (when isEditable is true) */}
            {deal.isEditable && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditDealOpen(true)}
                className="text-xs"
              >
                <IconEdit size={14} className="mr-1.5" />
                Edit Deal
              </Button>
            )}

            {/* Status Change Action Buttons (rendered from nextStatuses) */}
            {(deal.nextStatuses || []).map((status) => (
              <Button
                key={status.id}
                variant={status.statusName === 'Won' ? 'primary' : status.statusName === 'Lost' ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => handleStatusChangeClick(status)}
                className="text-xs"
              >
                Mark as {status.statusName}
              </Button>
            ))}
          </div>
        }
      />

      {/* ── Main Commercials & Client Overview ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Commercial Figures Card */}
        <Card padding="md" className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 border-b border-border">
            Commercial Summary
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-text-muted text-2xs block">Expected Deal Value</span>
              <span className="font-mono text-base font-bold text-heading">
                {formatCurrency(deal.expectedValue, deal.currencyCode, deal.currencySymbol)}
              </span>
            </div>

            <div>
              <span className="text-text-muted text-2xs block">Negotiated / Agreed Value</span>
              <span className={`font-mono text-base font-bold ${deal.negotiatedValue ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted font-normal'}`}>
                {deal.negotiatedValue ? formatCurrency(deal.negotiatedValue, deal.currencyCode, deal.currencySymbol) : 'Pending finalization'}
              </span>
            </div>

            <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
              <DetailField label="Currency" value={`${deal.currencyCode}${deal.currencySymbol ? ` (${deal.currencySymbol})` : ''}`} />
              <DetailField label="Deal Date" value={formatDate(deal.dealDate)} />
            </div>

            {deal.remarks && (
              <div className="pt-2 border-t border-border/60">
                <span className="text-text-muted text-2xs block mb-1">Commercial Remarks</span>
                <p className="text-heading text-xs bg-surface p-2.5 rounded-lg border border-border">
                  {deal.remarks}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Client & Inquiry Link Card */}
        <Card padding="md" className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 border-b border-border">
            Customer Information
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-text-muted text-2xs block">Client Account</span>
              <Link
                to={`/clients/${deal.clientId}`}
                className="font-semibold text-primary hover:underline flex items-center gap-1 mt-0.5"
              >
                <IconClient size={14} />
                {deal.clientName} {deal.clientCode ? `(${deal.clientCode})` : ''}
              </Link>
            </div>

            <DetailField
              label="Primary Contact Person"
              value={deal.clientContactName || '—'}
            />

            <DetailField
              label="Contact Email"
              value={deal.clientContactEmail || '—'}
            />

            <div className="pt-2 border-t border-border/60">
              <span className="text-text-muted text-2xs block">Source Inquiry</span>
              <Link
                to={`/inquiries/${deal.inquiryId}`}
                className="font-mono text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
              >
                <IconInquiry size={13} /> {deal.inquiryNo}
              </Link>
            </div>
          </div>
        </Card>

        {/* Status Remarks & Audit Card */}
        <Card padding="md" className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted pb-2 border-b border-border">
            Lifecycle & Audit
          </h3>
          <div className="space-y-3 text-xs">
            <DetailField label="Current Status" value={deal.dealStatus} />

            {deal.statusRemarks && (
              <div>
                <span className="text-text-muted text-2xs block mb-1">Status Reason / Remarks</span>
                <p className="text-xs text-heading bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/30">
                  {deal.statusRemarks}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
              <DetailField label="Created By" value={deal.createdByName || '—'} />
              <DetailField label="Created On" value={formatDate(deal.createdOn)} />
            </div>

            {deal.lastUpdatedOn && (
              <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
                <DetailField label="Last Updated" value={formatDate(deal.lastUpdatedOn)} />
                <DetailField label="Updated By" value={deal.lastUpdatedByName || '—'} />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Negotiation History Timeline & Log ── */}
      <Card padding="none" className="overflow-hidden border border-border">
        <div className="p-4 bg-surface/60 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-heading">Negotiation & Discussion History</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Chronological log of customer talks, discussed valuations, and price concessions.
            </p>
          </div>

          {deal.isEditable && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setNegotiationToEdit(null);
                setIsNegotiationModalOpen(true);
              }}
              className="text-xs font-semibold"
            >
              <IconAdd size={14} className="mr-1.5" />
              Add Discussion Note
            </Button>
          )}
        </div>

        {!deal.negotiations || deal.negotiations.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            No negotiation notes recorded yet.
            {deal.isEditable && ' Click "Add Discussion Note" above to record customer discussions.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(deal.negotiations || []).map((neg) => (
              <div
                key={neg.id}
                className="p-4 sm:px-6 hover:bg-surface/30 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-2xs font-semibold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                      {formatDate(neg.negotiationDate)}
                    </span>
                    {neg.discussedValue !== null && (
                      <span className="font-mono font-bold text-heading">
                        Discussed: {formatCurrency(neg.discussedValue, deal.currencyCode, deal.currencySymbol)}
                      </span>
                    )}
                    <span className="text-2xs text-text-muted">
                      Logged by {neg.createdByName || 'User'}
                    </span>
                  </div>

                  {neg.notes && (
                    <p className="text-heading text-xs whitespace-pre-wrap leading-relaxed mt-1">
                      {neg.notes}
                    </p>
                  )}
                </div>

                {deal.isEditable && (
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setNegotiationToEdit(neg);
                        setIsNegotiationModalOpen(true);
                      }}
                      className="text-text-muted hover:text-heading"
                      title="Edit note"
                    >
                      <IconEdit size={13} className="mr-1" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Status Change Modal ── */}
      {isStatusModalOpen && (
        <DealStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          targetStatus={targetStatus}
          deal={deal}
          onConfirm={handleStatusConfirm}
          isSubmitting={isActionSubmitting}
        />
      )}

      {/* ── Edit Deal Modal ── */}
      {isEditDealOpen && (
        <DealFormModal
          isOpen={isEditDealOpen}
          onClose={() => setIsEditDealOpen(false)}
          mode="EDIT"
          initialDeal={deal}
          currencies={lookups.currencies}
          onSave={handleEditDealSave}
          isSubmitting={isActionSubmitting}
        />
      )}

      {/* ── Negotiation Add / Edit Modal ── */}
      {isNegotiationModalOpen && (
        <NegotiationModal
          isOpen={isNegotiationModalOpen}
          onClose={() => {
            setIsNegotiationModalOpen(false);
            setNegotiationToEdit(null);
          }}
          initialData={negotiationToEdit}
          currencySymbol={deal.currencySymbol}
          onSave={handleNegotiationSave}
          isSubmitting={isActionSubmitting}
        />
      )}
    </div>
  );
}
