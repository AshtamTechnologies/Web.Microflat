/**
 * QuotationDocumentsSection.jsx — Compact 2-column document staging & attachment section for QuotationFormPage.
 */

import { useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  CollapsibleCard,
  SearchableSelect,
  Input,
  Button,
  Badge,
  TableContainer,
  Th,
  Td,
  IconButton,
} from '../../../components/ui';
import {
  IconAttachment,
  IconUpload,
  IconAdd,
  IconClose,
  IconError,
  IconFileText,
  IconTrash,
} from '../../../constants/icons';
import { QUOTATION_DOC_TYPES, formatDocumentFileSize } from '../../../mocks/quotations';
import useColumnResize from '../../../hooks/useColumnResize';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const INITIAL_COL_WIDTHS = {
  fileName: 200,
  documentType: 140,
  fileSize: 84,
  remarks: 140,
  actions: 84,
};

const MIN_COL_WIDTHS = {
  fileName: 120,
  documentType: 100,
  fileSize: 72,
  remarks: 90,
  actions: 76,
};

export default function QuotationDocumentsSection({
  sectionNumber = 4,
  stagedDocuments = [],
  onAddDocument,
  onRemoveDocument,
  revisionNo = 0,
  isRevisionMode = false,
  existingDocuments = [],
}) {
  const fileInputRef = useRef(null);
  const [docType, setDocType] = useState('Signed Quotation');
  const [selectedFile, setSelectedFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');

  const { colWidths, resizingCol, handleStartResize } = useColumnResize(
    INITIAL_COL_WIDTHS,
    MIN_COL_WIDTHS
  );

  const totalTableWidth = useMemo(
    () => Object.values(colWidths).reduce((sum, w) => sum + w, 0),
    [colWidths]
  );

  const handleFileSelected = (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('File exceeds maximum allowed size of 15 MB.');
      setSelectedFile(null);
      return;
    }
    setFileError('');
    setSelectedFile(file);
  };

  const handleStageDocument = () => {
    if (!selectedFile) {
      setFileError('Please select or drop a file before adding.');
      toast.error('Please select a file to attach.');
      return;
    }

    const newDoc = {
      id: `doc-staged-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: selectedFile.name,
      documentType: docType,
      revisionNo,
      linkedStage: '—',
      fileSize: formatDocumentFileSize(selectedFile.size),
      remarks: remarks.trim(),
      uploadedAt: new Date().toISOString().split('T')[0],
    };

    onAddDocument(newDoc);
    setSelectedFile(null);
    setRemarks('');
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Document queued for upload');
  };

  return (
    <CollapsibleCard
      title={`${sectionNumber}. Documents & Attachments`}
      subtitle="Attach signed quotations, technical drawings, client POs, or supporting files"
      icon={<IconAttachment size={18} className="text-primary" />}
      defaultOpen={true}
      badge={
        stagedDocuments.length > 0 ? (
          <Badge variant="role" size="sm">
            {stagedDocuments.length} Queued
          </Badge>
        ) : existingDocuments.length > 0 ? (
          <Badge variant="neutral" size="sm">
            {existingDocuments.length} Existing
          </Badge>
        ) : null
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT (5 Cols): Compact Uploader ── */}
        <div className="lg:col-span-5 p-3.5 bg-surface/50 border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-heading">Add Attachment</span>
            <span className="text-3xs text-text-muted">
              Linked to <strong className="font-mono text-heading">Rev {revisionNo}</strong>
            </span>
          </div>

          <SearchableSelect
            label="Document Type"
            required
            options={QUOTATION_DOC_TYPES}
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          />

          {/* Compact 1-Line Horizontal Drop Strip */}
          <div className="space-y-1">
            <span className="mf-label block">
              Select File <span className="text-danger">*</span>
            </span>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'border border-dashed rounded-lg px-3 py-2.5 cursor-pointer transition-all',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : fileError
                    ? 'border-danger/60 bg-danger/5'
                    : selectedFile
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-bg',
              ].join(' ')}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <IconFileText size={16} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-heading font-mono truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-3xs text-text-muted font-mono tabular-nums">
                        {formatDocumentFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setFileError('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-3xs font-medium text-danger hover:bg-danger/10 shrink-0 cursor-pointer"
                  >
                    <IconClose size={12} />
                    Clear
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconUpload size={18} className="text-primary/80 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-heading truncate">
                        Drop file or click to browse
                      </p>
                      <p className="text-3xs text-text-muted truncate">
                        PDF, DOC, XLS, DWG, PNG, JPG · Max 15 MB
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-border bg-surface text-3xs font-semibold text-heading shrink-0">
                    Browse
                  </span>
                </div>
              )}
            </div>

            {fileError && (
              <p className="text-2xs text-danger flex items-center gap-1 mt-0.5">
                <IconError size={12} />
                <span>{fileError}</span>
              </p>
            )}
          </div>

          {/* Remarks & Add Button on Same Row */}
          <div className="flex items-end gap-2 pt-0.5">
            <div className="flex-1 min-w-0">
              <Input
                label="Remarks (Optional)"
                placeholder="Brief notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleStageDocument}
              className="text-xs font-semibold shrink-0 h-9"
              icon={IconAdd}
            >
              Add
            </Button>
          </div>
        </div>

        {/* ── RIGHT (7 Cols): Queued Attachments & Existing Docs ── */}
        <div className="lg:col-span-7 space-y-3">
          {stagedDocuments.length > 0 ? (
            <div className="border border-border rounded-xl overflow-hidden bg-bg">
              <div className="px-3.5 py-2 bg-surface/60 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-heading">
                  Queued Attachments ({stagedDocuments.length})
                </span>
                <span className="text-3xs text-text-muted">
                  Saved with Rev {revisionNo}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto scrollbar-thin">
                <TableContainer
                  className="border-0 rounded-none"
                  tableStyle={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
                >
                  <colgroup>
                    <col style={{ width: `${colWidths.fileName}px` }} />
                    <col style={{ width: `${colWidths.documentType}px` }} />
                    <col style={{ width: `${colWidths.fileSize}px` }} />
                    <col style={{ width: `${colWidths.remarks}px` }} />
                    <col style={{ width: `${colWidths.actions}px` }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <Th
                        className="px-3 sm:px-3"
                        style={{ width: `${colWidths.fileName}px` }}
                        isResizing={resizingCol === 'fileName'}
                        resizeHandler={(e) => handleStartResize(e, 'fileName')}
                      >
                        FILE NAME
                      </Th>
                      <Th
                        className="px-3 sm:px-3"
                        style={{ width: `${colWidths.documentType}px` }}
                        isResizing={resizingCol === 'documentType'}
                        resizeHandler={(e) => handleStartResize(e, 'documentType')}
                      >
                        TYPE
                      </Th>
                      <Th
                        className="px-3 sm:px-3 text-right"
                        style={{ width: `${colWidths.fileSize}px` }}
                        isResizing={resizingCol === 'fileSize'}
                        resizeHandler={(e) => handleStartResize(e, 'fileSize')}
                      >
                        SIZE
                      </Th>
                      <Th
                        className="px-3 sm:px-3"
                        style={{ width: `${colWidths.remarks}px` }}
                        isResizing={resizingCol === 'remarks'}
                        resizeHandler={(e) => handleStartResize(e, 'remarks')}
                      >
                        REMARKS
                      </Th>
                      <Th
                        className="px-3 sm:px-3 text-center"
                        style={{ width: `${colWidths.actions}px` }}
                      >
                        ACTION
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stagedDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-surface/40 transition-colors">
                        <Td className="px-3 sm:px-3 text-xs font-semibold text-primary">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <IconFileText size={14} className="text-text-muted shrink-0" />
                            <span className="truncate" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                          </div>
                        </Td>
                        <Td className="px-3 sm:px-3 text-xs text-heading truncate" title={doc.documentType}>
                          {doc.documentType}
                        </Td>
                        <Td className="px-3 sm:px-3 text-right font-mono text-2xs text-text-muted whitespace-nowrap">
                          {doc.fileSize}
                        </Td>
                        <Td className="px-3 sm:px-3 text-xs text-text-muted truncate" title={doc.remarks}>
                          {doc.remarks || '—'}
                        </Td>
                        <Td className="px-3 sm:px-3 text-center">
                          <IconButton
                            icon={IconTrash}
                            variant="danger"
                            size="sm"
                            title="Remove queued attachment"
                            onClick={() => onRemoveDocument(doc.id)}
                          />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableContainer>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[168px] flex flex-col items-center justify-center p-5 text-center border border-dashed border-border rounded-xl bg-surface/10">
              <IconAttachment size={22} className="text-text-muted/60 mb-1.5" />
              <p className="text-xs font-medium text-heading">No new attachments queued</p>
              <p className="text-2xs text-text-muted mt-0.5">
                Select a document type and drop a file on the left to queue it for Rev {revisionNo}.
              </p>
            </div>
          )}

          {/* Existing Documents Reference in Revision Mode */}
          {isRevisionMode && existingDocuments.length > 0 && (
            <div className="pt-2 border-t border-border/70">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xs font-bold text-text-muted uppercase tracking-wider">
                  Previously Uploaded ({existingDocuments.length})
                </span>
                <span className="text-3xs text-text-muted">Carried forward</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                {existingDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface/30 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconFileText size={13} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-heading truncate text-2xs" title={doc.fileName}>
                          {doc.fileName}
                        </div>
                        <div className="text-3xs text-text-muted">
                          {doc.documentType} · Rev {doc.revisionNo}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-3xs text-text-muted shrink-0">{doc.fileSize}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}
