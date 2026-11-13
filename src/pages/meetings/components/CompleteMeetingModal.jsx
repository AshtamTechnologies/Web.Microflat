/**
 * CompleteMeetingModal.jsx — Modal prompt to record meeting outcome / completion remarks.
 */

import { useState } from 'react';
import { Modal, Button, RichTextEditor } from '../../../components/ui';
import { IconCheck, IconSuccess } from '../../../constants/icons';

function isHtmlEmpty(html) {
  if (!html) return true;
  const str = typeof html === 'object' ? html.target?.value || '' : String(html);
  const stripped = str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return stripped.length === 0;
}

export default function CompleteMeetingModal({ isOpen, onClose, onConfirm, meetingTitle, loading }) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (isHtmlEmpty(remarks)) {
      setError('Please provide outcome notes or summary remarks for this meeting.');
      return;
    }
    setError('');
    const finalRemarks = typeof remarks === 'object' ? remarks.target?.value || '' : String(remarks);
    onConfirm(finalRemarks.trim());
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
      title="Complete Meeting"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-success/10 border border-success/20">
          <IconSuccess className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-text">Marking meeting as Completed</p>
            <p className="text-text-muted mt-0.5 line-clamp-2">{meetingTitle}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wide">
            Outcome & Next Steps <span className="text-danger">*</span>
          </label>
          <RichTextEditor
            id="outcome-remarks"
            name="remarks"
            value={remarks}
            onChange={(e) => {
              const val = e?.target?.value !== undefined ? e.target.value : e;
              setRemarks(val);
              if (error) setError('');
            }}
            placeholder="Record key decisions, action items, or discussion highlights..."
            minHeight="150px"
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
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="gap-2"
          >
            <IconCheck className="w-4 h-4" />
            {loading ? 'Completing...' : 'Mark as Completed'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

