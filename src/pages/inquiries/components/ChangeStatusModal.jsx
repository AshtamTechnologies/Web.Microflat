/**
 * ChangeStatusModal.jsx — Modal to transition an inquiry's status with optional remarks.
 */

import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { Modal, Button, SearchableSelect } from '../../../components/ui';
import { useInquiriesContext } from '../../../context/InquiriesContext';
import { STATUS_OPTIONS, getStatusOption } from '../../../mocks/inquiries';

export default function ChangeStatusModal({ isOpen, onClose, inquiry }) {
  const { changeInquiryStatus } = useInquiriesContext();

  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && inquiry) {
      setSelectedStatusId(inquiry.StatusId || STATUS_OPTIONS[0].id);
      setRemarks('');
      setSubmitting(false);
    }
  }, [isOpen, inquiry]);

  const statusOptions = STATUS_OPTIONS.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!selectedStatusId) return;

    setSubmitting(true);
    try {
      const res = changeInquiryStatus(
        inquiry.id || inquiry.InquiryId,
        selectedStatusId,
        remarks
      );
      if (res.ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!inquiry) return null;

  const currentStatusInfo = getStatusOption(inquiry.StatusId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Inquiry Status"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Inquiry reference info */}
        <div className="p-3.5 bg-surface rounded-xl border border-border flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Inquiry Reference
            </span>
            <span className="font-mono text-xs font-bold text-primary">
              {inquiry.InquiryNo}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Current Status
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatusInfo.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentStatusInfo.dotClass}`} />
              {currentStatusInfo.name}
            </span>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="space-y-1.5">
          <SearchableSelect
            id="status-select"
            name="newStatus"
            label="New Status"
            placeholder="Select target status..."
            required
            options={statusOptions}
            value={selectedStatusId}
            onChange={(e) => setSelectedStatusId(e.target.value)}
          />
        </div>

        {/* Remarks / Notes */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="status-remarks"
            className="text-sm font-medium text-heading leading-none flex items-center gap-1.5"
          >
            <MessageSquare size={14} className="text-text-muted" />
            <span>Reason / Notes for Status Change (Optional)</span>
          </label>
          <textarea
            id="status-remarks"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Quotation dispatched with 30-day validity, waiting on client purchase order..."
            className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/60"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting}
          >
            <RefreshCw size={15} className="mr-1.5" />
            Update Status
          </Button>
        </div>
      </form>
    </Modal>
  );
}
