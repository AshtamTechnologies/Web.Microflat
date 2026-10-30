/**
 * CancelDelegationModal.jsx — Confirmation modal to cancel an active or scheduled delegation.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  Textarea,
  Button,
  CancelButton,
} from '../../../components/ui';
import { cancelDelegation } from '../../../services/delegation/delegationService';
import { getUserName } from '../../../context/UsersContext';
import { useAuthContext } from '../../../context/AuthContext';
import { IconWarning, IconTrash } from '../../../constants/icons';

export default function CancelDelegationModal({
  isOpen,
  onClose,
  delegation,
  onSuccess,
}) {
  const { user } = useAuthContext();
  const currentUserId = user?.id || user?.userId || 'u1';
  const currentUserRoles = user?.roles || ['Super Admin'];

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !delegation) return null;

  const delegateName = getUserName(delegation.delegateId);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await cancelDelegation(delegation.id, reason, currentUserId, currentUserRoles);
      toast.success('Delegation cancelled');
      setReason('');
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
            icon={IconTrash}
            loading={submitting}
            onClick={handleConfirm}
          >
            Cancel Delegation
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Warning callout */}
        <div className="flex items-start gap-3 p-3.5 rounded-control bg-warning-bg border border-warning-border text-warning leading-relaxed">
          <IconWarning size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-heading">Are you sure?</p>
            <p className="mt-0.5 text-text-muted">
              <strong className="text-heading">{delegateName}</strong> will lose access to your work immediately. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Optional reason */}
        <div>
          <Textarea
            id="cancelReason"
            name="cancelReason"
            label="Reason for cancellation (optional)"
            placeholder="e.g. Leave cancelled, returned early, or work completed..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}

