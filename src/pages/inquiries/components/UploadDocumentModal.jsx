/**
 * UploadDocumentModal.jsx — Modal for uploading new documents or new versions of existing documents.
 *
 * Sourced with real browser file picker for authentic file name, extension & size validation.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Layers,
  AlertCircle,
  FileCode,
  X,
  Plus,
  FileCheck,
} from 'lucide-react';
import { Modal, Button, Input, SearchableSelect } from '../../../components/ui';
import { useInquiryDocumentsContext } from '../../../context/InquiryDocumentsContext';
import {
  DOCUMENT_TYPE_OPTIONS,
  getDocumentType,
  formatFileSizeKB,
} from '../../../mocks/inquiryDocuments';

export default function UploadDocumentModal({
  isOpen,
  onClose,
  inquiryId,
  mode = 'add', // 'add' | 'new_version'
  document: targetDocument = null,
  defaultDocumentTypeId = '',
}) {
  const { addDocument, addDocumentVersion } = useInquiryDocumentsContext();

  const isNewVersion = mode === 'new_version' && Boolean(targetDocument);

  const [documentTypeId, setDocumentTypeId] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [fileError, setFileError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [typeError, setTypeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // Active document type metadata
  const activeDocType = useMemo(() => {
    const typeId = isNewVersion ? targetDocument?.documentTypeId : documentTypeId;
    return typeId ? getDocumentType(typeId) : null;
  }, [isNewVersion, targetDocument, documentTypeId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isNewVersion && targetDocument) {
        setDocumentTypeId(targetDocument.documentTypeId);
        setDocumentTitle(targetDocument.documentTitle);
      } else {
        setDocumentTypeId(defaultDocumentTypeId || '');
        setDocumentTitle('');
      }
      setSelectedFile(null);
      setRemarks('');
      setFileError('');
      setTitleError('');
      setTypeError('');
      setSubmitting(false);
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, isNewVersion, targetDocument, defaultDocumentTypeId]);

  // Document type options for Select
  const typeOptions = useMemo(() => {
    return DOCUMENT_TYPE_OPTIONS.map((dt) => ({
      value: dt.id,
      label: `${dt.typeName}${dt.isMandatory ? ' (Required)' : ''} [${dt.allowedExtensions.join(', ')}]`,
    }));
  }, []);

  // Validate selected file against active DocumentType
  function validateSelectedFile(file, docType) {
    if (!file) {
      return 'Please select a file to upload.';
    }

    if (!docType) {
      return '';
    }

    // 1. Extension check (case-insensitive)
    const fileName = file.name || '';
    const extIndex = fileName.lastIndexOf('.');
    const ext = extIndex >= 0 ? fileName.slice(extIndex).toLowerCase() : '';

    const allowed = (docType.allowedExtensions || []).map((e) => e.toLowerCase());
    if (allowed.length > 0 && !allowed.includes(ext)) {
      return `Only ${allowed.join(', ')} files allowed for ${docType.typeName}.`;
    }

    // 2. Size check (<= maxSizeMB)
    const maxBytes = (docType.maxSizeMB || 25) * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File exceeds ${docType.maxSizeMB}MB limit.`;
    }

    return '';
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const errorMsg = validateSelectedFile(file, activeDocType);
    setSelectedFile(file);
    setFileError(errorMsg);

    // Auto-fill title if empty and in add mode
    if (!isNewVersion && !documentTitle.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setDocumentTitle(baseName);
      setTitleError('');
    }
  }

  function handleDocTypeChange(e) {
    const newTypeId = e.target.value;
    setDocumentTypeId(newTypeId);
    setTypeError('');

    const newDocType = getDocumentType(newTypeId);
    if (selectedFile) {
      const errorMsg = validateSelectedFile(selectedFile, newDocType);
      setFileError(errorMsg);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const errorMsg = validateSelectedFile(file, activeDocType);
      setSelectedFile(file);
      setFileError(errorMsg);

      if (!isNewVersion && !documentTitle.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setDocumentTitle(baseName);
        setTitleError('');
      }
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    // Validation
    let hasErr = false;

    if (!isNewVersion && !documentTypeId) {
      setTypeError('Please select a document type.');
      hasErr = true;
    }

    if (!isNewVersion && !documentTitle.trim()) {
      setTitleError('Document title is required.');
      hasErr = true;
    }

    const fileValidation = validateSelectedFile(selectedFile, activeDocType);
    if (fileValidation) {
      setFileError(fileValidation);
      hasErr = true;
    }

    if (hasErr) return;

    setSubmitting(true);
    try {
      if (isNewVersion && targetDocument) {
        const res = await addDocumentVersion(
          inquiryId,
          targetDocument.documentId,
          {
            file: selectedFile,
            remarks,
          }
        );
        if (res.ok) {
          onClose();
        }
      } else {
        const res = await addDocument(inquiryId, {
          documentTypeId,
          documentTitle,
          file: selectedFile,
          remarks,
        });
        if (res.ok) {
          onClose();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isSubmitDisabled =
    submitting ||
    !selectedFile ||
    Boolean(fileError) ||
    (!isNewVersion && (!documentTypeId || !documentTitle.trim()));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNewVersion ? 'Upload New Document Version' : 'Upload Document Attachment'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* NEW VERSION MODE: Read-only context banner */}
        {isNewVersion && targetDocument && (
          <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Document Target
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${activeDocType?.badgeClass}`}>
                {activeDocType?.typeName}
              </span>
            </div>
            <p className="text-sm font-bold text-heading">
              {targetDocument.documentTitle}
            </p>
            <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border/60">
              <span>Current Revision: <strong className="text-heading font-mono">v{targetDocument.currentVersionNo}</strong></span>
              <span>Target Revision: <strong className="text-primary font-mono font-bold">v{(targetDocument.currentVersionNo || 1) + 1}</strong></span>
            </div>
          </div>
        )}

        {/* ADD MODE: Document Type Select */}
        {!isNewVersion && (
          <div className="space-y-1.5">
            <SearchableSelect
              id="doc-type-select"
              name="documentTypeId"
              label="Document Type"
              placeholder="Select document category..."
              required
              options={typeOptions}
              value={documentTypeId}
              onChange={handleDocTypeChange}
              error={typeError}
            />

            {activeDocType && (
              <p className="text-xs text-text-muted flex items-center gap-1.5 pt-0.5">
                <span>Allowed:</span>
                <span className="font-mono text-heading font-semibold">
                  {activeDocType.allowedExtensions.join(', ')}
                </span>
                <span>• Max:</span>
                <span className="font-mono text-heading font-semibold">
                  {activeDocType.maxSizeMB} MB
                </span>
                {activeDocType.isMandatory && (
                  <span className="text-warning font-semibold ml-1">(Mandatory for RFQ)</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* ADD MODE: Document Title */}
        {!isNewVersion && (
          <Input
            id="doc-title-input"
            name="documentTitle"
            type="text"
            label="Document Title"
            placeholder="e.g. Precision Valve Spindle RFQ Specification"
            required
            value={documentTitle}
            onChange={(e) => {
              setDocumentTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            error={titleError}
          />
        )}

        {/* File Picker Drag & Drop Area */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-heading leading-none">
            Attachment File <span className="text-danger" aria-hidden="true">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept={activeDocType?.allowedExtensions?.join(',') || undefined}
            className="hidden"
            id="inquiry-file-upload-input"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150',
              isDragging
                ? 'border-primary bg-primary/10'
                : fileError
                ? 'border-danger/60 bg-danger/5'
                : selectedFile
                ? 'border-primary/50 bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-surface/50 bg-bg',
            ].join(' ')}
          >
            {selectedFile ? (
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileCheck size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-heading font-mono truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-text-muted font-mono tabular-nums">
                      {formatFileSizeKB(Math.round(selectedFile.size / 1024))}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setFileError('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-text-muted hover:text-danger hover:bg-surface text-xs h-8 px-2"
                >
                  <X size={15} className="mr-1" />
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <UploadCloud size={32} className="text-primary/70 mb-2" />
                <p className="text-sm font-semibold text-heading">
                  Click to select file or drag & drop here
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {activeDocType
                    ? `Supported: ${activeDocType.allowedExtensions.join(', ')} • Max: ${activeDocType.maxSizeMB}MB`
                    : 'Select a document type to view allowed file formats'}
                </p>
              </div>
            )}
          </div>

          {/* Inline File Validation Error */}
          {fileError && (
            <p className="text-xs text-danger flex items-center gap-1 mt-0.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{fileError}</span>
            </p>
          )}
        </div>

        {/* Remarks / Change Notes */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="upload-remarks"
            className="text-sm font-medium text-heading leading-none"
          >
            {isNewVersion ? 'Version Change Remarks (Optional)' : 'Remarks / Notes (Optional)'}
          </label>
          <textarea
            id="upload-remarks"
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={
              isNewVersion
                ? 'e.g. Revised dimensional drawing per client feedback on bore size...'
                : 'e.g. Initial customer RFQ document with scope requirements...'
            }
            className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/60"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={isSubmitDisabled}
          >
            {isNewVersion ? (
              <>
                <UploadCloud size={16} className="mr-1.5" />
                Upload Revision
              </>
            ) : (
              <>
                <Plus size={16} className="mr-1.5" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
