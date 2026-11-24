import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { IconClose, IconError } from '../../constants/icons';

/**
 * RejectApprovalModal — Centralized, reusable rejection modal for approval workflows.
 * Ensures 100% visual and functional consistency across grids and view pages.
 */
export default function RejectApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Reject Vendor Application',
  entityName = '',
  entitySubtitle = '',
  comments: controlledComments,
  onCommentsChange,
  label = 'Reason for Rejection (Required)',
  placeholder = 'Explain why this vendor application is being rejected (required for audit log)...',
  auditNote = 'Rejecting sets status to Rejected (4). The vendor creator can edit and resubmit the version for approval.',
  confirmText = 'Confirm Rejection',
  cancelText = 'Cancel',
  maxWidth = 'max-w-xl',
}) {
  const isControlled = controlledComments !== undefined;
  const [internalComments, setInternalComments] = useState('');

  const currentComments = isControlled ? controlledComments : internalComments;

  useEffect(() => {
    if (!isOpen) {
      if (!isControlled) {
        setInternalComments('');
      }
    }
  }, [isOpen, isControlled]);

  const handleChange = (e) => {
    const val = e.target.value;
    if (isControlled && onCommentsChange) {
      onCommentsChange(val);
    } else {
      setInternalComments(val);
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentComments.trim() || loading) return;
    onConfirm(currentComments.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Entity Info Card */}
        {entityName && (
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-danger/5 border border-danger/20">
            <div className="w-11 h-11 rounded-xl bg-danger/15 border border-danger/30 text-danger flex items-center justify-center shrink-0">
              <IconClose size={22} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                {entityName}
              </h3>
              {entitySubtitle && (
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {entitySubtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reason Textarea */}
        <Textarea
          id="centralized-reject-comments"
          label={label}
          required
          rows={3}
          value={currentComments}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={loading}
        />

        {/* Audit Status Warning Banner */}
        {auditNote && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/15 text-xs text-text-muted">
            <IconError size={15} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
            <span>{auditNote}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="md"
            disabled={!currentComments.trim() || loading}
            loading={loading}
            className="flex items-center gap-1.5"
          >
            <IconClose size={15} />
            {confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
