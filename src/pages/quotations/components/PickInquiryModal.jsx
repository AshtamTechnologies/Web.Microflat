import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, CancelButton, SearchableSelect } from '../../../components/ui';
import { useInquiriesContext } from '../../../context/InquiriesContext';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { IconInquiry, IconArrowRight, IconInfo } from '../../../constants/icons';

export default function PickInquiryModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { inquiries = [] } = useInquiriesContext();
  const { quotations = [] } = useQuotationsContext();

  const [selectedInquiryId, setSelectedInquiryId] = useState('');

  // Filter inquiries that do not already have a quotation
  const availableInquiries = useMemo(() => {
    const quotedInquiryIds = new Set(
      quotations.map((q) => String(q.inquiryId || q.inquiryNo).toLowerCase())
    );

    return inquiries.filter((inq) => {
      const id1 = String(inq.id || inq.InquiryId || '').toLowerCase();
      const id2 = String(inq.InquiryNo || '').toLowerCase();
      return !quotedInquiryIds.has(id1) && !quotedInquiryIds.has(id2);
    });
  }, [inquiries, quotations]);

  const inquiryOptions = useMemo(() => {
    if (availableInquiries.length === 0) return [];
    return availableInquiries.map((inq) => {
      const itemCount = (inq.items || []).length;
      return {
        value: inq.id || inq.InquiryId || inq.InquiryNo,
        label: `${inq.InquiryNo} · ${inq.CustomerName || inq.clientName || 'Client'} (${itemCount} item${itemCount === 1 ? '' : 's'})`,
      };
    });
  }, [availableInquiries]);

  function handleContinue() {
    if (!selectedInquiryId) return;
    onClose();
    navigate(`/quotations/new?inquiryId=${encodeURIComponent(selectedInquiryId)}`);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Quotation · Choose an Inquiry"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-start gap-2.5 text-xs text-primary dark:text-primary-light">
          <IconInfo size={16} className="shrink-0 mt-0.5" />
          <span>
            Each inquiry can have one active quotation lifecycle. Older revisions remain preserved for auditing.
          </span>
        </div>

        <div>
          <SearchableSelect
            label="Select Inquiry"
            required
            options={inquiryOptions}
            value={selectedInquiryId}
            placeholder={
              availableInquiries.length > 0
                ? '-- Choose an unquoted inquiry --'
                : 'No pending inquiries available'
            }
            onChange={(e) => setSelectedInquiryId(e.target.value)}
          />
          {availableInquiries.length === 0 && (
            <p className="mt-2 text-2xs text-text-muted">
              All currently active inquiries have existing quotations. You can create a new revision from an existing quotation or create a new inquiry first.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button
            variant="primary"
            disabled={!selectedInquiryId}
            onClick={handleContinue}
            icon={<IconArrowRight size={15} />}
          >
            Continue to Quotation Form
          </Button>
        </div>
      </div>
    </Modal>
  );
}

