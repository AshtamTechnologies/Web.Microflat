import { useState, useEffect } from 'react';
import { Modal, Button, CancelButton, SearchableSelect, DatePicker } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { QUOTATION_STATUSES } from '../../../mocks/quotations';
import { IconRefresh } from '../../../constants/icons';

export default function ChangeStatusModal({ isOpen, onClose, quotation }) {
  const { updateQuotationStatus } = useQuotationsContext();
  const [status, setStatus] = useState('In Negotiation');
  const [confirmedOn, setConfirmedOn] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (quotation) {
      setStatus(quotation.status || 'In Negotiation');
      setConfirmedOn(quotation.confirmedOn || new Date().toISOString().split('T')[0]);
    }
  }, [quotation]);

  const statusOptions = QUOTATION_STATUSES.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  function handleSave() {
    if (!quotation) return;
    updateQuotationStatus(quotation.id, status, status === 'Confirmed' ? confirmedOn : null);
    onClose();
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
          <div className="text-text-muted">{quotation?.clientName}</div>
        </div>

        <SearchableSelect
          label="New Status"
          required
          options={statusOptions}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />

        {status === 'Confirmed' && (
          <DatePicker
            label="Confirmed On"
            required
            value={confirmedOn}
            onChange={(e) => setConfirmedOn(e.target.value)}
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleSave} icon={<IconRefresh size={15} />}>
            Update Status
          </Button>
        </div>
      </div>
    </Modal>
  );
}

