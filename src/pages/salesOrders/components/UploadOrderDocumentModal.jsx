import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button, CancelButton, Input, DocumentUploader } from '../../../components/ui';
import { useSalesOrdersContext } from '../../../context/SalesOrdersContext';
import { IconUploadCloud } from '../../../constants/icons';

export default function UploadOrderDocumentModal({ isOpen, onClose, order }) {
  const { uploadSalesOrderDocument } = useSalesOrdersContext();
  const [selectedDocTypeId, setSelectedDocTypeId] = useState('');
  const [docTypeObj, setDocTypeObj] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  function handleUpload() {
    if (!order) return;
    if (!fileData) {
      setError('Please select or attach a file to upload.');
      toast.error('Please select a file to upload.');
      return;
    }

    const docTypeName = docTypeObj?.label || fileData.documentTypeName || 'Client PO';
    uploadSalesOrderDocument(order.id, {
      fileName: fileData.fileName || `${docTypeName.replace(/\s+/g, '_')}_${order.orderConfirmationNo}.pdf`,
      documentType: docTypeName,
      documentTypeId: docTypeObj?.id || selectedDocTypeId || null,
      fileSize: fileData.fileSize || '340 KB',
      file: fileData.file || null,
      remarks,
    });

    setFileData(null);
    setRemarks('');
    setError('');
    onClose();
  }

  function handleClose() {
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
          <CancelButton onClick={handleClose}>Cancel</CancelButton>
          <Button variant="primary" onClick={handleUpload} icon={<IconUploadCloud size={15} />}>
            Upload Document
          </Button>
        </div>
      </div>
    </Modal>
  );
}
