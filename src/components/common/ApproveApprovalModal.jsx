import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Checkbox from '../ui/Checkbox';
import { IconCheck, IconSuccess, IconFileText, IconRefresh } from '../../constants/icons';

/**
 * ApproveApprovalModal — Centralized, reusable approval modal.
 * Ensures 100% visual and functional consistency across grids and view pages.
 */
export default function ApproveApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Approve Vendor Application',
  entityName = '',
  entitySubtitle = '',
  hasDocuments = false,
  docVerificationLoading = false,
  showDocVerification = true,
  comments: controlledComments,
  onCommentsChange,
  isDocVerified: controlledDocVerified,
  onDocVerifiedChange,
  auditNote = 'Approving sets status to Approved (3) and activates this vendor version for procurement workflows.',
  confirmText = 'Confirm Approval',
  cancelText = 'Cancel',
  maxWidth = 'max-w-xl',
}) {
  const isCommentsControlled = controlledComments !== undefined;
  const isDocVerifiedControlled = controlledDocVerified !== undefined;

  const [internalComments, setInternalComments] = useState('');
  const [internalDocVerified, setInternalDocVerified] = useState(false);

  const currentComments = isCommentsControlled ? controlledComments : internalComments;
  const currentDocVerified = isDocVerifiedControlled ? controlledDocVerified : internalDocVerified;

  useEffect(() => {
    if (!isOpen) {
      if (!isCommentsControlled) setInternalComments('');
      if (!isDocVerifiedControlled) setInternalDocVerified(false);
    }
  }, [isOpen, isCommentsControlled, isDocVerifiedControlled]);

  const handleCommentsChange = (e) => {
    const val = e.target.value;
    if (isCommentsControlled && onCommentsChange) {
      onCommentsChange(val);
    } else {
      setInternalComments(val);
    }
  };

  const handleDocVerifiedChange = (checked) => {
    if (isDocVerifiedControlled && onDocVerifiedChange) {
      onDocVerifiedChange(checked);
    } else {
      setInternalDocVerified(checked);
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;
    onConfirm({
      comments: currentComments.trim(),
      isDocVerified: Boolean(hasDocuments && currentDocVerified),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={maxWidth}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Entity Info Card with Green Success Accent */}
        {entityName && (
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-success/5 border border-success/20">
            <div className="w-11 h-11 rounded-xl bg-success/15 border border-success/30 text-success flex items-center justify-center shrink-0">
              <IconSuccess size={22} aria-hidden="true" />
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

        {/* Audit Status Note */}
        {auditNote && (
          <p className="text-xs text-text-muted">
            {auditNote}
          </p>
        )}

        {/* Document Verification Checkbox (Conditional) */}
        {showDocVerification && (
          docVerificationLoading ? (
            <div className="p-3 rounded-lg border border-border bg-surface-subtle text-xs text-text-muted flex items-center gap-2">
              <IconRefresh size={14} className="animate-spin text-primary shrink-0" />
              <span>Checking attached documents...</span>
            </div>
          ) : hasDocuments ? (
            <div className="p-3 bg-surface border border-primary/20 rounded-xl">
              <Checkbox
                id="centralized-verify-docs"
                checked={currentDocVerified}
                onChange={(e) => handleDocVerifiedChange(e.target.checked)}
                label={
                  <div className="text-xs">
                    <span className="font-semibold text-heading block">
                      Verify Supporting Documents <span className="text-danger">*</span>
                    </span>
                    <span className="text-text-muted">
                      Confirm that all uploaded registration and compliance documents have been checked.
                    </span>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="p-3 bg-surface border border-border rounded-xl text-xs text-text-muted flex items-center gap-2">
              <IconFileText size={15} className="text-text-muted shrink-0" />
              <span>No compliance documents were attached with this registration.</span>
            </div>
          )
        )}

        {/* Approval Comments Textarea */}
        <Textarea
          id="centralized-approve-comments"
          label="Approval Comments / Remarks (Optional)"
          rows={3}
          value={currentComments}
          onChange={handleCommentsChange}
          placeholder="Enter approval remarks or internal audit notes..."
          disabled={loading}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
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
            variant="primary"
            size="md"
            loading={loading}
            className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-white border-transparent"
          >
            <IconCheck size={15} />
            {confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
