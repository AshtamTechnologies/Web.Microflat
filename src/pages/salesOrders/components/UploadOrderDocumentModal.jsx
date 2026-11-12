import { useState } from 'react';
import { Modal, Button, CancelButton, Input, SearchableSelect } from '../../../components/ui';
import { useSalesOrdersContext } from '../../../context/SalesOrdersContext';
import { ORDER_DOCUMENT_TYPES } from '../../../mocks/salesOrders';
import { IconUploadCloud } from '../../../constants/icons';

export default function UploadOrderDocumentModal({ isOpen, onClose, order }) {
  const { uploadSalesOrderDocument } = useSalesOrdersContext();
  const [docType, setDocType] = useState('Client PO');
  const [fileName, setFileName] = useState('');
  const [remarks, setRemarks] = useState('');

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  }

  function handleUpload() {
    if (!order) return;
    uploadSalesOrderDocument(order.id, {
      fileName:
        fileName || `${docType.replace(/\s+/g, '_')}_${order.orderConfirmationNo}.pdf`,
      documentType: docType,
      fileSize: '340 KB',
      remarks,
    });
    setFileName('');
    setRemarks('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Order Confirmation Document"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <SearchableSelect
          label="Document Type"
          required
          options={ORDER_DOCUMENT_TYPES}
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">
            Select File <span className="text-danger">*</span>
          </label>
          <div className="border border-dashed border-border rounded-xl p-4 text-center bg-surface/50 hover:bg-surface transition-colors cursor-pointer relative">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <IconUploadCloud className="mx-auto text-primary mb-1" size={24} />
            <div className="text-xs font-medium text-heading">
              {fileName || 'Click to select or drag file here'}
            </div>
            <div className="text-3xs text-text-muted mt-0.5">
              PDF, DOC, XLS, PNG, JPG up to 15MB
            </div>
          </div>
        </div>

        <Input
          label="Remarks / Description (Optional)"
          placeholder="e.g. Client signed PO copy"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleUpload} icon={<IconUploadCloud size={15} />}>
            Upload Document
          </Button>
        </div>
      </div>
    </Modal>
  );
}

