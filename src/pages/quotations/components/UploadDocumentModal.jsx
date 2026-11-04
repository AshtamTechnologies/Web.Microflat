import { useState } from 'react';
import { Modal, Button, CancelButton, Input, SearchableSelect } from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { IconUploadCloud } from '../../../constants/icons';

const DOC_TYPES = [
  { value: 'Signed Quotation', label: 'Signed Quotation' },
  { value: 'Client PO', label: 'Client PO' },
  { value: 'Negotiation attachment', label: 'Negotiation attachment' },
  { value: 'Technical Drawing', label: 'Technical Drawing' },
  { value: 'Other Document', label: 'Other Document' },
];

export default function UploadDocumentModal({ isOpen, onClose, quotation }) {
  const { uploadDocument } = useQuotationsContext();
  const [docType, setDocType] = useState('Signed Quotation');
  const [revisionNo, setRevisionNo] = useState(
    quotation?.currentRevision !== undefined ? String(quotation.currentRevision) : '0'
  );
  const [stage, setStage] = useState('—');
  const [fileName, setFileName] = useState('');
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

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  }

  function handleUpload() {
    if (!quotation) return;
    uploadDocument(quotation.id, {
      fileName: fileName || `${docType.replace(/\s+/g, '_')}_${quotation.quotationNo}.pdf`,
      documentType: docType,
      revisionNo: Number(revisionNo),
      linkedStage: stage,
      fileSize: '320 KB',
      remarks,
    });
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
        <SearchableSelect
          label="Document Type"
          required
          options={DOC_TYPES}
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
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
            <div className="text-3xs text-text-muted mt-0.5">PDF, DOC, XLS, PNG, JPG up to 15MB</div>
          </div>
        </div>

        <Input
          label="Remarks / Description (Optional)"
          placeholder="Brief notes about this attachment"
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

