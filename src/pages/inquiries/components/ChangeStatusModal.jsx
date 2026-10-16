/**
 * ChangeStatusModal.jsx — Modal to transition an inquiry's status with optional remarks.
 */

import { useState, useEffect } from 'react';
import {
  IconMessageSquare,
  IconRefresh,
} from '../../../constants/icons';
import { Modal, Button, CancelButton, SearchableSelect, Textarea } from '../../../components/ui';
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
            <span className="view-field-label mf-detail-label">
              Inquiry Reference
            </span>
            <span className="font-mono text-xs font-bold text-primary">
              {inquiry.InquiryNo}
            </span>
          </div>

          <div className="text-right">
            <span className="view-field-label mf-detail-label">
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
        <Textarea
          id="status-remarks"
          label="Reason / Notes for Status Change (Optional)"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Quotation dispatched with 30-day validity, waiting on client purchase order..."
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <CancelButton
            size="md"
            onClick={onClose}
            disabled={submitting}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={submitting}
          >
            <IconRefresh size={15} className="mr-1.5" />
            Update Status
          </Button>
        </div>
      </form>
    </Modal>
  );
}
