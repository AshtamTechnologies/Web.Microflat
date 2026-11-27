/**
 * ChangeStatusModal.jsx — Modal to transition an inquiry's status with optional remarks.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  IconMessageSquare,
  IconRefresh,
} from '../../../constants/icons';
import { Modal, Button, CancelButton, SearchableSelect, Textarea } from '../../../components/ui';
import { useInquiriesContext } from '../../../context/InquiriesContext';
import { getInquiryStage, mapStageToApiStatus } from '../inquiryStages';

export default function ChangeStatusModal({ isOpen, onClose, inquiry }) {
  const { changeInquiryStatus, statuses: lookupStatuses = [] } = useInquiriesContext();

  const [selectedStatusId, setSelectedStatusId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentStatus = inquiry?.status || inquiry?.StatusId || '';
  const currentStatusInfo = getInquiryStage(currentStatus);

  const statusOptions = useMemo(() => {
    if (Array.isArray(inquiry?.nextStatuses) && inquiry.nextStatuses.length > 0) {
      return inquiry.nextStatuses.map((s) => ({ value: s, label: s }));
    }
    const allStatuses = lookupStatuses.length > 0
      ? lookupStatuses
      : ['New', 'Deal', 'Quoting', 'Won', 'Lost'];
    return allStatuses
      .filter((s) => s.toLowerCase() !== String(currentStatus).toLowerCase())
      .map((s) => ({ value: s, label: s }));
  }, [inquiry?.nextStatuses, lookupStatuses, currentStatus]);

  useEffect(() => {
    if (isOpen && inquiry) {
      const defaultNext = statusOptions[0]?.value || '';
      setSelectedStatusId(defaultNext);
      setRemarks('');
      setSubmitting(false);
    }
  }, [isOpen, inquiry, statusOptions]);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!selectedStatusId) return;

    setSubmitting(true);
    try {
      const apiStatus = mapStageToApiStatus(selectedStatusId) || selectedStatusId;
      if (!apiStatus) return;
      const res = await changeInquiryStatus(
        inquiry.id || inquiry.InquiryId,
        apiStatus,
        remarks
      );
      if (res?.ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!inquiry) return null;

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
              {inquiry.InquiryNo || inquiry.inquiryNo}
            </span>
          </div>

          <div className="text-right">
            <span className="view-field-label mf-detail-label">
              Current Status
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatusInfo?.badgeClass || 'bg-surface text-text-muted border-border'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentStatusInfo?.dotClass || 'bg-text-muted'}`} />
              {currentStatus || currentStatusInfo?.name || '—'}
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
