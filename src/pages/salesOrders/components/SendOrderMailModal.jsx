import { useState, useEffect } from 'react';
import { Modal, Button, CancelButton, Input, Textarea, Badge } from '../../../components/ui';
import { useSalesOrdersContext } from '../../../context/SalesOrdersContext';
import { IconSend, IconAttachment } from '../../../constants/icons';

export default function SendOrderMailModal({ isOpen, onClose, order, onSuccess }) {
  const { sendSalesOrderMail } = useSalesOrdersContext();

  const [to, setTo] = useState(order?.contactEmail || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(
    `Order Confirmation ${order?.orderConfirmationNo || ''}${
      order?.clientPoNo ? ` · Against PO ${order.clientPoNo}` : ''
    } · MicroFlat ERP`
  );
  const [body, setBody] = useState(
    `Dear ${order?.contactPerson || 'Sir/Madam'},\n\nThank you for your purchase order${
      order?.clientPoNo ? ` (${order.clientPoNo})` : ''
    }. Please find attached our formal Order Confirmation ${
      order?.orderConfirmationNo || ''
    }${order?.quotationNo ? ` against quotation ${order.quotationNo}` : ''}.\n\nBest Regards,\nMicroFlat Sales & Order Processing Team`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      setIsSubmitting(false);
      setTo(order.contactEmail || '');
      setCc('');
      setSubject(
        `Order Confirmation ${order.orderConfirmationNo || ''}${
          order.clientPoNo ? ` · Against PO ${order.clientPoNo}` : ''
        } · MicroFlat ERP`
      );
      setBody(
        `Dear ${order.contactPerson || 'Sir/Madam'},\n\nThank you for your purchase order${
          order.clientPoNo ? ` (${order.clientPoNo})` : ''
        }. Please find attached our formal Order Confirmation ${
          order.orderConfirmationNo || ''
        }${order.quotationNo ? ` against quotation ${order.quotationNo}` : ''}.\n\nBest Regards,\nMicroFlat Sales & Order Processing Team`
      );
    }
  }, [isOpen, order]);

  async function handleSend() {
    if (!order || !to.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await sendSalesOrderMail(order.id, {
        to: to.trim(),
        cc: cc.trim(),
        subject: subject.trim(),
        body,
      });
      if (res) {
        onSuccess?.();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Order Confirmation by Email"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <Input label="From" disabled value="orders@microflat.in" />

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

        <div className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <IconAttachment size={16} className="text-primary" />
            <span className="font-semibold text-heading">
              {order?.orderConfirmationNo}.pdf
            </span>
            <span className="text-text-muted">(System-generated Order Confirmation PDF)</span>
          </div>
          <Badge variant="info">Ready to Attach</Badge>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose} disabled={isSubmitting}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleSend} disabled={isSubmitting} icon={<IconSend size={15} />}>
            {isSubmitting ? 'Sending...' : 'Send Order Confirmation Email'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

