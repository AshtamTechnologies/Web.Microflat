import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  Button,
  CancelButton,
  Input,
  SearchableSelect,
  DocumentUploader,
} from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { IconUploadCloud } from '../../../constants/icons';

export default function UploadDocumentModal({ isOpen, onClose, quotation }) {
  const { uploadDocument } = useQuotationsContext();
  const [fileData, setFileData] = useState(null);
  const [fileError, setFileError] = useState('');
  const [revisionNo, setRevisionNo] = useState(
    quotation?.currentRevision !== undefined ? String(quotation.currentRevision) : '0'
  );
  const [stage, setStage] = useState('—');
  const [remarks, setRemarks] = useState('');

  const revisionOptions = (quotation?.revisions || []).map((r) => ({
    value: String(r.revisionNo),
    label: `Revision ${r.revisionNo}`,
  }));

  const stageOptions = [
    { value: '—', label: 'None / General' },
    ...(quotation?.negotiations || []).map((n) => ({
      value: `Stage ${n.stageNo}`,
      label: `Stage ${n.stageNo} · ${n.mode}`,
    })),
  ];

  function handleUpload() {
    if (!quotation) return;
    if (!fileData) {
      setFileError('Please select or upload a document file.');
      toast.error('Please select a file to upload.');
      return;
    }

    uploadDocument(quotation.id, {
      fileName: fileData.fileName,
      documentTypeId: fileData.documentTypeId || null,
      documentType: fileData.documentTypeName || 'Quotation Document',
      documentTypeName: fileData.documentTypeName || 'Quotation Document',
      revisionNo: Number(revisionNo),
      linkedStage: stage,
      fileSize: fileData.fileSize || '320 KB',
      file: fileData.file || null,
      remarks,
    });
    setFileData(null);
    setRemarks('');
    setFileError('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Quotation Document"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <DocumentUploader
          label="Document Attachment"
          showDocTypeSelect={true}
          moduleFilter="QUOTATION"
          defaultDocTypeKeyword="Quotation"
          value={fileData}
          onChange={(val) => {
            setFileData(val);
            if (val) setFileError('');
          }}
          error={fileError}
          compact={false}
        />

        <div className="grid grid-cols-2 gap-3">
          <SearchableSelect
            label="Linked Revision"
            options={revisionOptions}
            value={revisionNo}
            onChange={(e) => setRevisionNo(e.target.value)}
          />
          <SearchableSelect
            label="Negotiation Stage"
            options={stageOptions}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          />
        </div>

        <Input
          label="Remarks / Description (Optional)"
          placeholder="Brief notes about this attachment"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!fileData}
            icon={<IconUploadCloud size={15} />}
          >
            Upload Document
          </Button>
        </div>
      </div>
    </Modal>
  );
}
