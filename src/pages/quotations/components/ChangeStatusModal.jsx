import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, CancelButton, SearchableSelect, DatePicker } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { QUOTATION_STATUSES } from '../../../mocks/quotations';
import { IconRefresh } from '../../../constants/icons';
import toast from 'react-hot-toast';

function getStatusName(status) {
  if (typeof status === 'string') return status.trim();
  if (!status || typeof status !== 'object') return '';
  return String(
    status.statusName ||
    status.value ||
    status.name ||
    status.status ||
    status.label ||
    status.id ||
    ''
  ).trim();
}

export default function ChangeStatusModal({ isOpen, onClose, quotation }) {
  const { updateQuotationStatus, lookups } = useQuotationsContext();
  const [status, setStatus] = useState('');
  const [confirmedOn, setConfirmedOn] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStatus = String(quotation?.status || '').trim();
  const currentStatusLower = currentStatus.toLowerCase();

  // Compute available next status options
  const statusOptions = useMemo(() => {
    // 1. Check if backend provided specific nextStatuses
    if (Array.isArray(quotation?.nextStatuses) && quotation.nextStatuses.length > 0) {
      const parsed = quotation.nextStatuses
        .map((s) => {
          const val = getStatusName(s);
          if (!val) return null;
          const label = typeof s === 'object'
            ? String(s.label || s.name || s.statusName || s.value || val)
            : val;
          return { value: val, label };
        })
        .filter(Boolean)
        .filter((opt) => opt.value.toLowerCase() !== currentStatusLower);

      if (parsed.length > 0) return parsed;
    }

    // 2. Fallback transitions based on standard quotation lifecycle
    // Draft -> Sent, In Negotiation, Confirmed, Lost
    // Sent -> In Negotiation, Confirmed, Lost
    // In Negotiation -> Confirmed, Lost
    // Confirmed -> Lost
    let allowedValues = [];
    if (currentStatusLower === 'draft') {
      allowedValues = ['Sent', 'In Negotiation', 'Confirmed', 'Lost'];
    } else if (currentStatusLower === 'sent') {
      allowedValues = ['In Negotiation', 'Confirmed', 'Lost'];
    } else if (currentStatusLower === 'in negotiation') {
      allowedValues = ['Confirmed', 'Lost'];
    } else if (currentStatusLower === 'confirmed') {
      allowedValues = ['Lost'];
    } else {
      allowedValues = ['Sent', 'In Negotiation', 'Confirmed', 'Lost'].filter(
        (s) => s.toLowerCase() !== currentStatusLower
      );
    }

    // Map through lookups if present, otherwise default to QUOTATION_STATUSES
    const pool = Array.isArray(lookups?.statuses) && lookups.statuses.length > 0
      ? lookups.statuses.map((s) => ({ value: getStatusName(s), label: getStatusName(s) }))
      : QUOTATION_STATUSES.map((s) => ({ value: s.id, label: s.name }));

    return allowedValues.map((val) => {
      const match = pool.find((p) => p.value.toLowerCase() === val.toLowerCase());
      return {
        value: match?.value || val,
        label: match?.label || val,
      };
    });
  }, [quotation?.nextStatuses, lookups?.statuses, currentStatusLower]);

  // Keep selected status in sync when modal opens or options change
  useEffect(() => {
    if (isOpen && statusOptions.length > 0) {
      if (!status || !statusOptions.some((opt) => opt.value === status)) {
        setStatus(statusOptions[0]?.value || '');
      }
      setConfirmedOn(quotation?.confirmedOn || new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, statusOptions, status, quotation]);

  const selectedStatus = statusOptions.some((opt) => opt.value === status)
    ? status
    : statusOptions[0]?.value || '';

  async function handleSave() {
    if (!quotation || !selectedStatus) return;
    setIsSubmitting(true);
    try {
      await updateQuotationStatus(
        quotation.id,
        selectedStatus,
        selectedStatus === 'Confirmed' ? confirmedOn : null
      );
      onClose();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error(err?.message || 'Failed to update quotation status.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Quotation Status"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface rounded-xl border border-border text-xs">
          <div className="text-text-muted">Quotation Reference</div>
          <div className="font-bold text-heading font-mono text-sm">{quotation?.quotationNo}</div>
          <div className="flex items-center justify-between text-text-muted mt-1">
            <span>{quotation?.clientName}</span>
            <span className="font-medium text-heading">Current: <span className="font-semibold text-primary">{quotation?.status || 'Draft'}</span></span>
          </div>
        </div>

        {statusOptions.length > 0 ? (
          <SearchableSelect
            label="New Status"
            required
            options={statusOptions}
            value={selectedStatus}
            onChange={(e) => setStatus(e.target.value)}
          />
        ) : (
          <p className="text-xs text-text-muted">No further status transitions are available for this quotation.</p>
        )}

        {selectedStatus === 'Confirmed' && (
          <DatePicker
            label="Confirmed On"
            required
            value={confirmedOn}
            onChange={(e) => setConfirmedOn(e.target.value)}
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose} disabled={isSubmitting}>Cancel</CancelButton>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedStatus || isSubmitting}
            icon={<IconRefresh size={15} className={isSubmitting ? 'animate-spin' : ''} />}
          >
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
