/**
 * src/pages/deals/DealStatusModal.jsx — Modal for transitioning deal status.
 * Handles validation rules: On Hold & Lost require statusRemarks; Won requires negotiatedValue.
 */

import { useState, useEffect } from 'react';
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
  const isMissingNegotiatedValue = isWon && (deal?.negotiatedValue === null || deal?.negotiatedValue === undefined || deal?.negotiatedValue === '');

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Move Deal to "${statusName}"`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isWon && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-lg text-xs space-y-1.5 text-emerald-800 dark:text-emerald-300">
            <p className="font-semibold">Confirming Deal as Won</p>
            <p>
              Marking this deal as Won is final and locks editing. You can subsequently generate a formal quotation for the agreed amount (
              <span className="font-mono font-bold">
                {deal?.currencySymbol || '₹'}{Number(deal?.negotiatedValue || 0).toLocaleString('en-IN')}
              </span>
              ).
            </p>
          </div>
        )}

        {isHoldOrLost && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3.5 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Status Remarks Required</p>
            <p className="mt-1">
              Please enter the specific reason why this deal is being marked as {statusName} (e.g. competitor pricing, budget postponed, etc.).
            </p>
          </div>
        )}

        {isMissingNegotiatedValue && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger font-medium">
            Negotiated value is missing! Please edit the deal first to set the finalized negotiated amount before marking as Won.
          </div>
        )}

        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-heading mb-1.5">
            Status Remarks / Reason {isHoldOrLost && <span className="text-danger">*</span>}
          </label>
          <Textarea
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
            className="w-full text-xs"
          />
          <p className="text-3xs text-text-muted text-right mt-1">
            {remarks.length} / 500
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <CancelButton onClick={onClose} size="sm" disabled={isSubmitting} />
          <Button
            type="submit"
            variant={isWon ? 'primary' : statusName === 'Lost' ? 'danger' : 'secondary'}
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
