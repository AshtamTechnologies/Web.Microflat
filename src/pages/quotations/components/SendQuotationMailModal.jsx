import { useState } from 'react';
import { Modal, Button, CancelButton, Input, Textarea, Badge } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { IconSend, IconAttachment } from '../../../constants/icons';

export default function SendQuotationMailModal({ isOpen, onClose, quotation }) {
  const { sendMailLog } = useQuotationsContext();
  const currentRev = quotation?.currentRevision !== undefined ? quotation.currentRevision : 0;

  const [to, setTo] = useState(quotation?.contactEmail || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(
    `Quotation ${quotation?.quotationNo || ''} (Revision ${currentRev}) · MicroFlat ERP`
  );
  const [body, setBody] = useState(
    `Dear ${quotation?.contactPerson || 'Sir/Madam'},\n\nPlease find attached our official commercial quotation ${quotation?.quotationNo || ''} (Revision ${currentRev}) for your kind consideration.\n\nLooking forward to your valued feedback.\n\nBest Regards,\nMicroFlat Sales & Estimation Team`
  );

  function handleSend() {
    if (!quotation) return;
    sendMailLog(quotation.id, {
      to,
      cc,
      subject,
      body,
      revisionNo: currentRev,
    });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Quotation by Email"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <Input
          label="From"
          disabled
          value="quotes@microflat.in"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="To (Client Recipient)"
            required
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Input
            label="Cc (Optional)"
            type="email"
            placeholder="e.g. accounts@client.com"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
          />
        </div>

        <Input
          label="Subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <Textarea
          label="Email Message Body"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        {/* Attachment preview banner */}
        <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <IconAttachment size={16} className="text-primary" />
            <span className="font-semibold text-heading">
              {quotation?.quotationNo}_Rev{currentRev}.pdf
            </span>
            <span className="text-text-muted">(System-generated PDF)</span>
          </div>
          <Badge variant="info">Ready to Attach</Badge>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleSend} icon={<IconSend size={15} />}>
            Send Quotation Email
          </Button>
        </div>
      </div>
    </Modal>
  );
}

