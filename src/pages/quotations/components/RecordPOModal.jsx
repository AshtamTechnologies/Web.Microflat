import { useState } from 'react';
import { Modal, Button, CancelButton, Input, DatePicker } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { IconCheck, IconUpload, IconInfo } from '../../../constants/icons';

export default function RecordPOModal({ isOpen, onClose, quotation }) {
  const { recordClientPO } = useQuotationsContext();
  const [poNumber, setPoNumber] = useState('');
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState('');

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  }

  function handleSave() {
    if (!quotation) return;
    recordClientPO(quotation.id, {
      poNumber: poNumber || 'PO-CLIENT',
      receivedOn,
      fileName: fileName || `Client-PO-${quotation.quotationNo}.pdf`,
      fileSize: '450 KB',
    });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Client Purchase Order (PO)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface rounded-xl border border-border text-xs">
          <div className="text-text-muted">Quotation Reference</div>
          <div className="font-bold text-heading font-mono text-sm">{quotation?.quotationNo}</div>
          <div className="text-text-muted">{quotation?.clientName}</div>
        </div>

        <Input
          label="Client PO Number"
          required
          placeholder="e.g. PO-2026-9811"
          value={poNumber}
          onChange={(e) => setPoNumber(e.target.value)}
        />

        <DatePicker
          label="PO Received On"
          required
          value={receivedOn}
          onChange={(e) => setReceivedOn(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">
            PO Document (PDF) <span className="text-danger">*</span>
          </label>
          <div className="border border-dashed border-border rounded-xl p-4 text-center bg-surface/50 hover:bg-surface transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <IconUpload className="mx-auto text-primary mb-1" size={24} />
            <div className="text-xs font-medium text-heading">
              {fileName || 'Click or drag PO file to attach'}
            </div>
            <div className="text-3xs text-text-muted mt-0.5">PDF or scanned image up to 10MB</div>
          </div>
        </div>

        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20 flex items-start gap-2 text-2xs text-primary dark:text-primary-light">
          <IconInfo size={14} className="shrink-0 mt-0.5" />
          <span>Recording a PO sets the PO Received flag and archives the document under the Documents tab.</span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleSave} icon={<IconCheck size={15} />}>
            Save PO Record
          </Button>
        </div>
      </div>
    </Modal>
  );
}

