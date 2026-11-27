import { useState, useEffect, useRef } from 'react';
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

  const isExistingPo = Boolean(
    quotation?.poReceived ||
    quotation?.status === 'PO Received' ||
    quotation?.poDetails?.poNumber ||
    quotation?.poNumber
  );

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

  const initializedQuotationIdRef = useRef(null);

  // Initialize or reset form state only once when modal opens (or when switching quotations)
  useEffect(() => {
    if (quotation && isOpen) {
      if (initializedQuotationIdRef.current !== quotation.id) {
        initializedQuotationIdRef.current = quotation.id;
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
    } else if (!isOpen) {
      initializedQuotationIdRef.current = null;
    }
  }, [isOpen, quotation?.id]);

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
      title={isExistingPo ? "Customer Purchase Order Details" : "Record Customer Purchase Order (PO)"}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Existing PO Info Banner */}
        {isExistingPo && (
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <IconInfo size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              Customer PO <strong>{poNumber || quotation?.poDetails?.poNumber || 'on file'}</strong> has already been recorded. You can update delivery dates, client instructions, or upload new attachments below.
            </div>
          </div>
        )}

        {/* Quotation Details Chip */}
        <div className="p-3 bg-surface rounded-xl border border-border text-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-2xs text-text-muted uppercase tracking-wider font-semibold">
              Quotation Reference
            </div>
            <div className="font-bold text-heading font-mono text-sm truncate">{quotation?.quotationNo}</div>
            <div className="text-text-muted truncate">{quotation?.clientName}</div>
          </div>
          <div className="text-right flex flex-col items-end gap-1.5 shrink-0 ml-auto">
            <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              Rev {quotation?.currentRevision ?? (quotation?.revisions?.length ? quotation.revisions.length - 1 : 0)} (Latest Agreed)
            </span>
            {Number(quotation?.grandTotal || quotation?.totalAmount || 0) > 0 && (
              <div className="font-mono font-bold text-xs text-heading whitespace-nowrap mt-0.5">
                {quotation?.currency || 'INR'} {Number(quotation?.grandTotal || quotation?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            )}
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

        <div className="p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/20 flex items-start gap-2 text-2xs text-emerald-800 dark:text-emerald-300">
          <IconInfo size={14} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>
            Recording this PO will confirm <strong>Revision {quotation?.currentRevision ?? 0}</strong> as the final contract version, lock the commercial negotiation timeline, and automatically link to the Sales Order workflow.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <CancelButton onClick={onClose} disabled={isSaving}>Cancel</CancelButton>
          <SaveButton onClick={handleSave} loading={isSaving}>
            {isExistingPo ? "Update Customer PO" : "Save Customer PO"}
          </SaveButton>
        </div>
      </div>
    </Modal>
  );
}
