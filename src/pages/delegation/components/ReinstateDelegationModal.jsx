/**
 * ReinstateDelegationModal.jsx — Confirmation modal to reinstate a cancelled delegation.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  Button,
  CancelButton,
} from '../../../components/ui';
import { updateDelegationStatus } from '../../../services/delegation/delegationService';
import { IconRefresh } from '../../../constants/icons';

export default function ReinstateDelegationModal({
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
      await updateDelegationStatus(delegation.id, true);
      toast.success('Delegation reinstated');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to reinstate delegation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reinstate Delegation"
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
            Keep Cancelled
          </CancelButton>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconRefresh}
            loading={submitting}
            onClick={handleConfirm}
          >
            Reinstate Delegation
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 p-3.5 rounded-control bg-primary/5 border border-primary/20 text-primary leading-relaxed">
          <IconRefresh size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-heading">Reinstate this delegation?</p>
            <p className="mt-0.5 text-text-muted">
              <strong className="text-heading">{targetLabel}</strong> will regain delegated approval access for the remaining delegation period.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

