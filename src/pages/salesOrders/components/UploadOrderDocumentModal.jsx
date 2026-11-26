import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button, CancelButton, Input, DocumentUploader } from '../../../components/ui';
import { useSalesOrdersContext } from '../../../context/SalesOrdersContext';
import { IconUploadCloud } from '../../../constants/icons';

export default function UploadOrderDocumentModal({ isOpen, onClose, order, onSuccess }) {
  const { uploadSalesOrderDocument } = useSalesOrdersContext();
  const [selectedDocTypeId, setSelectedDocTypeId] = useState('');
  const [docTypeObj, setDocTypeObj] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload() {
    if (!order || isUploading) return;
    if (!fileData) {
      setError('Please select or attach a file to upload.');
      toast.error('Please select a file to upload.');
      return;
    }

    const docTypeName = docTypeObj?.label || fileData.documentTypeName || 'Client PO';
    try {
      setIsUploading(true);
      const res = await uploadSalesOrderDocument(order.id, {
        fileName: fileData.fileName || `${docTypeName.replace(/\s+/g, '_')}_${order.orderConfirmationNo}.pdf`,
        documentType: docTypeName,
        documentTypeId: docTypeObj?.id || selectedDocTypeId || null,
        fileSize: fileData.fileSize || '340 KB',
        file: fileData.file || null,
        remarks,
      });

      if (res) {
        setFileData(null);
        setRemarks('');
        setError('');
        onSuccess?.();
        onClose();
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleClose() {
    if (isUploading) return;
    setFileData(null);
    setRemarks('');
    setError('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Order Confirmation Document"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Reusable Document Uploader linked to Document Types Master */}
        <DocumentUploader
          label="Select File"
          required
          moduleFilter="ORDER_CONFIRMATION"
          showDocTypeSelect={true}
          docTypeLabel="Document Type"
          defaultDocTypeKeyword="Order"
          selectedDocTypeId={selectedDocTypeId}
          onDocTypeChange={(typeId, obj) => {
            setSelectedDocTypeId(typeId);
            setDocTypeObj(obj);
          }}
          value={fileData}
          onChange={(data) => {
            setFileData(data);
            if (error) setError('');
          }}
          error={error}
        />

        <Input
          label="Remarks / Description (Optional)"
          placeholder="e.g. Client signed PO copy"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={handleClose} disabled={isUploading}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleUpload} disabled={isUploading} icon={<IconUploadCloud size={15} />}>
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
