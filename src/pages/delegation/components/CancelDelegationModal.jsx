/**
 * CancelDelegationModal.jsx — Confirmation modal to cancel an Upcoming or InForce delegation.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  Button,
  CancelButton,
} from '../../../components/ui';
import { updateDelegationStatus } from '../../../services/delegation/delegationService';
import { IconWarning, IconClose } from '../../../constants/icons';

export default function CancelDelegationModal({
  isOpen,
  onClose,
  delegation,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !delegation) return null;

  const delegateNames = Array.isArray(delegation.assignments)
    ? [...new Set(delegation.assignments.map((a) => a.delegateName).filter(Boolean))].join(', ')
    : '';
  const targetLabel = delegateNames || delegation.delegatorName || 'the assigned delegate(s)';

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await updateDelegationStatus(delegation.id, false);
      toast.success('Delegation cancelled');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel delegation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Delegation"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <CancelButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Keep Delegation
          </CancelButton>
          <Button
            type="button"
            variant="danger"
            size="sm"
            icon={IconClose}
            loading={submitting}
            onClick={handleConfirm}
          >
            Cancel Delegation
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 p-3.5 rounded-control bg-warning-bg border border-warning-border text-warning leading-relaxed">
          <IconWarning size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-heading">Cancel this delegation?</p>
            <p className="mt-0.5 text-text-muted">
              <strong className="text-heading">{targetLabel}</strong> will lose delegated approval access immediately. You can reinstate it later if the end date has not passed.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
