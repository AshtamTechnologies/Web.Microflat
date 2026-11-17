import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  Button,
  SaveButton,
  CancelButton,
  Input,
  DatePicker,
  Textarea,
} from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { IconCheck, IconUpload, IconInfo, IconFileText, IconTrash } from '../../../constants/icons';

export default function RecordPOModal({ isOpen, onClose, quotation }) {
  const { recordClientPO } = useQuotationsContext();
  const [poNumber, setPoNumber] = useState('');
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (quotation) {
      setPoNumber(quotation.poDetails?.poNumber || '');
      setReceivedOn(
        quotation.poDetails?.receivedOn ||
        quotation.confirmedOn ||
        new Date().toISOString().split('T')[0]
      );
      setExpectedDeliveryDate(quotation.poDetails?.expectedDeliveryDate || '');
      setFileName(quotation.poDetails?.fileName || '');
      setFileSize(quotation.poDetails?.fileSize || '');
      setRemarks(quotation.poDetails?.remarks || '');
      setError('');
    }
  }, [quotation, isOpen]);

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      const kb = Math.round(file.size / 1024);
      setFileSize(kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
    }
  }

  function handleRemoveFile() {
    setFileName('');
    setFileSize('');
  }

  function handleSave() {
    if (!quotation) return;
    if (!poNumber.trim()) {
      setError('Client PO number is required.');
      toast.error('Please enter the Client PO number.');
      return;
    }

    recordClientPO(quotation.id, {
      poNumber: poNumber.trim(),
      receivedOn,
      expectedDeliveryDate: expectedDeliveryDate || null,
      fileName: fileName || `Client-PO-${quotation.quotationNo}.pdf`,
      fileSize: fileSize || '350 KB',
      remarks: remarks.trim(),
    });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Customer Purchase Order (PO)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Quotation Details Chip */}
        <div className="p-3 bg-surface rounded-xl border border-border text-xs flex items-center justify-between">
          <div>
            <div className="text-2xs text-text-muted uppercase tracking-wider font-semibold">
              Quotation Reference
            </div>
            <div className="font-bold text-heading font-mono text-sm">{quotation?.quotationNo}</div>
            <div className="text-text-muted">{quotation?.clientName}</div>
          </div>
          <div className="text-right">
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Rev {quotation?.currentRevision ?? 0}
            </span>
          </div>
        </div>

        {/* PO Number */}
        <Input
          label="Customer PO Number"
          required
          placeholder="e.g. PO-TATAMOTORS-2026-9811"
          value={poNumber}
          onChange={(e) => {
            setPoNumber(e.target.value);
            if (error) setError('');
          }}
          error={error}
        />

        {/* PO Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePicker
            label="PO Received On"
            required
            value={receivedOn}
            onChange={(e) => setReceivedOn(e.target.value)}
          />
          <DatePicker
            label="Req. Delivery Date"
            placeholder="Optional delivery date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
          />
        </div>

        {/* PO Attachment */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">
            Customer PO Document (PDF / Scan)
          </label>
          {fileName ? (
            <div className="flex items-center justify-between p-3 bg-surface-subtle border border-border rounded-xl text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <IconFileText className="text-primary shrink-0" size={18} />
                <div className="truncate">
                  <div className="font-medium text-heading truncate">{fileName}</div>
                  <div className="text-3xs text-text-muted font-mono">{fileSize || 'Attached'}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="!p-1 text-danger hover:bg-danger/10 shrink-0"
                title="Remove file"
              >
                <IconTrash size={14} />
              </Button>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-xl p-4 text-center bg-surface/50 hover:bg-surface transition-colors cursor-pointer relative group">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <IconUpload
                className="mx-auto text-primary/70 group-hover:text-primary transition-colors mb-1"
                size={22}
              />
              <div className="text-xs font-medium text-heading">
                Click or drag customer PO file to attach
              </div>
              <div className="text-3xs text-text-muted mt-0.5">PDF or image file up to 10MB</div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <Textarea
          label="Special Client Instructions / Remarks"
          placeholder="Any delivery, inspection, or packing notes mentioned on the PO..."
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20 flex items-start gap-2 text-2xs text-primary dark:text-primary-light">
          <IconInfo size={14} className="shrink-0 mt-0.5" />
          <span>
            Recording this PO confirms the quotation and links the PO details to the Sales Order creation workflow.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <SaveButton onClick={handleSave}>
            Save Customer PO
          </SaveButton>
        </div>
      </div>
    </Modal>
  );
}
