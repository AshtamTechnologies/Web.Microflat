/**
 * CancelMeetingModal.jsx — Modal prompt to confirm meeting cancellation with a reason.
 */

import { useState } from 'react';
import { Modal, Button, Textarea } from '../../../components/ui';
import { IconError, IconClose } from '../../../constants/icons';

export default function CancelMeetingModal({ isOpen, onClose, onConfirm, meetingTitle, loading }) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!remarks.trim()) {
      setError('Please provide a reason for cancelling this meeting.');
      return;
    }
    setError('');
    onConfirm(remarks.trim());
  }

  function handleClose() {
    setRemarks('');
    setError('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancel Meeting"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-danger/10 border border-danger/20">
          <IconError className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-danger">Are you sure you want to cancel this meeting?</p>
            <p className="text-text-muted mt-0.5 line-clamp-2">{meetingTitle}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
            Cancellation Reason <span className="text-danger">*</span>
          </label>
          <Textarea
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g., Client requested postponement, key attendees unavailable..."
            rows={3}
            autoFocus
          />
          {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Keep Meeting
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={loading}
            className="gap-2"
          >
            <IconClose className="w-4 h-4" />
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

