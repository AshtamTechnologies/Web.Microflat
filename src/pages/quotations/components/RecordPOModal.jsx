import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Modal,
  SaveButton,
  CancelButton,
  Input,
  DatePicker,
  Textarea,
  DocumentUploader,
} from '../../../components/ui';
import { useQuotationsContext } from '../../../context/QuotationsContext';
import { quotationService } from '../../../services';
import { IconInfo } from '../../../constants/icons';

export default function RecordPOModal({ isOpen, onClose, quotation }) {
  const { recordClientPO, lookups } = useQuotationsContext();

  const [poNumber, setPoNumber] = useState('');
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [selectedDocTypeId, setSelectedDocTypeId] = useState('');
  const [docTypeObj, setDocTypeObj] = useState(null);
  const [clientPoDocTypeId, setClientPoDocTypeId] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Dynamically resolve documentTypeId for CLIENT_PO from lookups
  useEffect(() => {
    let isMounted = true;

    async function resolveClientPoDocType() {
      let docTypes = lookups?.documentTypes;
      if (!docTypes || docTypes.length === 0) {
        try {
          const freshLookups = await quotationService.getQuotationLookups();
          docTypes = freshLookups?.documentTypes;
        } catch (e) {
          // ignore lookup fetch errors
        }
      }

      if (Array.isArray(docTypes)) {
        const clientPoType = docTypes.find(
          (dt) => (dt.documentTypeCode || dt.code) === 'CLIENT_PO'
        );
        if (clientPoType && isMounted) {
          setClientPoDocTypeId(clientPoType.id);
          if (!selectedDocTypeId) {
            setSelectedDocTypeId(String(clientPoType.id));
          }
        }
      }
    }

    if (isOpen) {
      resolveClientPoDocType();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, lookups, selectedDocTypeId]);

  // Initialize or reset form state when modal opens or quotation changes
  useEffect(() => {
    if (quotation && isOpen) {
      setPoNumber(quotation.poDetails?.poNumber || '');
      setReceivedOn(
        quotation.poDetails?.receivedOn ||
        quotation.confirmedOn ||
        new Date().toISOString().split('T')[0]
      );
      setExpectedDeliveryDate(quotation.poDetails?.expectedDeliveryDate || '');
      setRemarks(quotation.poDetails?.remarks || '');
      setError('');

      if (quotation.poDetails?.fileName) {
        setFileData({
          fileName: quotation.poDetails.fileName,
          fileSize: quotation.poDetails.fileSize || '350 KB',
          documentTypeName: quotation.poDetails.documentTypeName || 'PO Document',
          file: quotation.poDetails.file || null,
        });
      } else {
        setFileData(null);
      }

      const existingDocTypeId = quotation.poDetails?.documentTypeId;
      if (existingDocTypeId) {
        setSelectedDocTypeId(String(existingDocTypeId));
      }
    }
  }, [quotation, isOpen]);

  async function handleSave() {
    if (!quotation) return;
    if (!poNumber.trim()) {
      setError('Client PO number is required.');
      toast.error('Please enter the Client PO number.');
      return;
    }

    const resolvedDocTypeId =
      docTypeObj?.id ||
      (selectedDocTypeId ? Number(selectedDocTypeId) : null) ||
      clientPoDocTypeId ||
      null;

    try {
      setIsSaving(true);
      await recordClientPO(quotation.id, {
        poNumber: poNumber.trim(),
        receivedOn,
        poReceivedDate: receivedOn,
        expectedDeliveryDate: expectedDeliveryDate || null,
        documentTypeId: resolvedDocTypeId,
        documentTypeName: docTypeObj?.label || 'Client PO',
        fileName: fileData?.fileName || `Client-PO-${quotation.quotationNo}.pdf`,
        fileSize: fileData?.fileSize || '350 KB',
        file: fileData?.file || null,
        remarks: remarks.trim(),
        poRemarks: remarks.trim(),
      });
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to record customer PO.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Customer Purchase Order (PO)"
      maxWidth="max-w-lg"
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

        {/* Reusable Document Uploader linked to Document Types Master (Strict PO Module Filter) */}
        <DocumentUploader
          label="Customer PO Attachment"
          showDocTypeSelect={true}
          docTypeLabel="Document Type"
          moduleFilter="PO"
          defaultDocTypeKeyword="PO"
          selectedDocTypeId={selectedDocTypeId}
          onDocTypeChange={(typeId, obj) => {
            setSelectedDocTypeId(typeId);
            setDocTypeObj(obj);
          }}
          value={fileData}
          onChange={(data) => setFileData(data)}
        />

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
          <CancelButton onClick={onClose} disabled={isSaving}>Cancel</CancelButton>
          <SaveButton onClick={handleSave} loading={isSaving}>
            Save Customer PO
          </SaveButton>
        </div>
      </div>
    </Modal>
  );
}
