/**
 * src/pages/deals/DealStatusModal.jsx — Modal for transitioning deal status.
 * Handles validation rules: On Hold & Lost require statusRemarks; Won requires negotiatedValue.
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  PauseCircle,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { Modal, Button, Textarea, CancelButton } from '../../components/ui';

export default function DealStatusModal({
  isOpen,
  onClose,
  targetStatus,
  deal,
  onConfirm,
  isSubmitting = false,
}) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const statusName = targetStatus?.statusName || '';
  const isHoldOrLost = statusName === 'On Hold' || statusName === 'Lost';
  const isWon = statusName === 'Won';
  const isMissingNegotiatedValue =
    isWon &&
    (deal?.negotiatedValue === null ||
      deal?.negotiatedValue === undefined ||
      deal?.negotiatedValue === '');

  useEffect(() => {
    if (isOpen) {
      setRemarks('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isMissingNegotiatedValue) {
      setError('A Negotiated Value must be entered on the deal before marking it as Won.');
      return;
    }
    if (isHoldOrLost && !remarks.trim()) {
      setError(`Please provide a reason for marking this deal as ${statusName}.`);
      return;
    }
    onConfirm(targetStatus.id, remarks.trim());
  };

  const modalIcon = isWon ? (
    <div className="w-8 h-8 rounded-control bg-success-bg text-success border border-success-border flex items-center justify-center shrink-0">
      <CheckCircle2 size={18} />
    </div>
  ) : statusName === 'Lost' ? (
    <div className="w-8 h-8 rounded-control bg-danger-bg text-danger border border-danger-border flex items-center justify-center shrink-0">
      <XCircle size={18} />
    </div>
  ) : (
    <div className="w-8 h-8 rounded-control bg-warning-bg text-warning border border-warning-border flex items-center justify-center shrink-0">
      <PauseCircle size={18} />
    </div>
  );

  const subtitle = deal
    ? [deal.dealNo, deal.clientName || deal.customerName].filter(Boolean).join(' • ')
    : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Move Deal to "${statusName}"`}
      subtitle={subtitle}
      icon={modalIcon}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isWon && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-success-bg border border-success-border text-success-text text-xs">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-success" />
            <div className="space-y-1">
              <p className="font-semibold text-success-text">Confirming Deal as Won</p>
              <p className="text-text leading-relaxed">
                Marking this deal as Won is final and locks editing. You can subsequently generate a formal quotation for the agreed amount (
                <span className="font-mono font-bold text-heading">
                  {deal?.currencySymbol || '₹'}{Number(deal?.negotiatedValue || 0).toLocaleString('en-IN')}
                </span>
                ).
              </p>
            </div>
          </div>
        )}

        {isHoldOrLost && (
          <div
            className={`flex items-start gap-3 p-3.5 rounded-lg border text-xs ${
              statusName === 'Lost'
                ? 'bg-danger-bg border-danger-border text-danger-text'
                : 'bg-warning-bg border-warning-border text-warning-text'
            }`}
          >
            {statusName === 'Lost' ? (
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-danger" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-warning" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">Reason Required for {statusName}</p>
              <p className="text-text-muted text-xs leading-relaxed">
                Please provide the reason why this deal is transitioning to {statusName} to maintain accurate pipeline analytics.
              </p>
            </div>
          </div>
        )}

        {isMissingNegotiatedValue && (
          <div className="flex items-start gap-2.5 p-3 bg-danger-bg border border-danger-border rounded-lg text-xs text-danger font-medium">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-danger" />
            <span>Negotiated value is missing! Please edit the deal first to set the finalized negotiated amount before marking as Won.</span>
          </div>
        )}

        <div>
          <Textarea
            id="deal-status-remarks"
            label="Status Remarks / Reason"
            required={isHoldOrLost}
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              if (error) setError('');
            }}
            placeholder={
              isHoldOrLost
                ? `Enter reason for moving deal to ${statusName}...`
                : 'Optional comments or notes...'
            }
            rows={3}
            maxLength={500}
            showCharCount={true}
            error={error}
            className="w-full text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <CancelButton onClick={onClose} size="sm" disabled={isSubmitting} />
          <Button
            type="submit"
            variant={statusName === 'Lost' ? 'danger' : 'primary'}
            size="sm"
            disabled={isSubmitting || isMissingNegotiatedValue}
          >
            {isSubmitting ? 'Updating...' : `Confirm ${statusName}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
