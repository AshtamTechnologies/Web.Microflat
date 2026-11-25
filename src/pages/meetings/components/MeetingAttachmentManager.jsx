/**
 * MeetingAttachmentManager.jsx — Reusable attachments list and uploader for Meetings.
 *
 * Conforms to Swagger POST /api/meetings/{id}/attachments:
 * - DocumentTypeId (number, required)
 * - DocumentTitle / DocumentName (string, optional)
 * - Remarks (string, optional)
 * - File (binary, required)
 *
 * Supported on both MeetingFormPage (queue or direct) and MeetingViewPage (live).
 */

import { useState, useMemo } from 'react';
import {
  Button,
  Badge,
  Modal,
  Input,
  Textarea,
  ConfirmModal,
  DocumentUploader,
} from '../../../components/ui';
import {
  IconAttachment,
  IconDownload,
  IconDelete,
  IconUpload,
  IconFileText,
  IconSuccess,
  IconError,
} from '../../../constants/icons';

export default function MeetingAttachmentManager({
  attachments = [],
  queuedAttachments = [],
  onAddQueued,
  onRemoveQueued,
  onUploadDirect,
  onDelete,
  onDownload,
  documentTypes = [],
  readOnly = false,
  canUpload = true,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function handleOpenUploadModal() {
    const firstId = documentTypes?.[0]?.id || documentTypes?.[0]?.documentTypeId;
    setSelectedTypeId(firstId ? String(firstId) : '');
    setDocumentTitle('');
    setRemarks('');
    setSelectedFile(null);
    setUploadError('');
    setIsModalOpen(true);
  }

  function handleUploaderChange(val) {
    if (val?.file) {
      setSelectedFile(val.file);
      setUploadError('');
      if (!documentTitle) {
        setDocumentTitle(val.file.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      setSelectedFile(null);
    }
  }

  async function handleConfirmUpload(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!selectedTypeId) {
      setUploadError('Please select a document type.');
      return;
    }

    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    const typeObj = (documentTypes || []).find(
      (dt) => String(dt.id || dt.documentTypeId) === String(selectedTypeId)
    );
    const typeName = typeObj?.documentTypeName || typeObj?.name || 'Document';

    // If direct upload callback is provided (e.g. in View page only)
    if (onUploadDirect) {
      setUploading(true);
      setUploadError('');
      try {
        await onUploadDirect({
          documentTypeId: selectedTypeId,
          documentTypeName: typeName,
          documentTitle: documentTitle.trim() || selectedFile.name,
          documentName: documentTitle.trim() || selectedFile.name,
          remarks: remarks.trim(),
          file: selectedFile,
        });
        setIsModalOpen(false);
      } catch (uploadErr) {
        setUploadError(uploadErr?.message || 'Failed to upload document.');
      } finally {
        setUploading(false);
      }
      return;
    }

    // In Form Page (both Create and Edit): queue locally so nothing touches API until Save Changes is clicked!
    if (onAddQueued) {
      onAddQueued({
        documentTypeId: selectedTypeId,
        documentTypeName: typeName,
        documentTitle: documentTitle.trim() || selectedFile.name,
        documentName: documentTitle.trim() || selectedFile.name,
        remarks: remarks.trim(),
        file: selectedFile,
        fileName: selectedFile.name,
        fileSizeMB: (selectedFile.size / (1024 * 1024)).toFixed(2),
      });
      setIsModalOpen(false);
    }
  }

  async function handleConfirmDelete(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!attachmentToDelete) return;

    if (attachmentToDelete.tempId && onRemoveQueued) {
      onRemoveQueued(attachmentToDelete.tempId);
      setAttachmentToDelete(null);
      return;
    }

    if (onDelete && attachmentToDelete.id) {
      setDeleting(true);
      try {
        await onDelete(attachmentToDelete.id);
        setAttachmentToDelete(null);
      } catch (err) {
        console.error('Delete failed:', err);
      } finally {
        setDeleting(false);
      }
    }
  }

  const allItems = useMemo(() => {
    const list = [...(attachments || [])];
    (queuedAttachments || []).forEach((q) => {
      list.push({ ...q, isQueued: true });
    });
    return list;
  }, [attachments, queuedAttachments]);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <IconAttachment className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-heading">Meeting Attachments & Documents</h3>
          <Badge variant="neutral" size="sm" className="text-2xs px-2 py-0.5">
            {allItems.length}
          </Badge>
        </div>

        {!readOnly && canUpload && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleOpenUploadModal}
            className="gap-1.5 text-xs h-8"
          >
            <IconUpload className="w-3.5 h-3.5 text-primary" />
            <span>Upload Document</span>
          </Button>
        )}
      </div>

      {/* Attachment List */}
      {allItems.length === 0 ? (
        <div className="p-5 text-center rounded-xl border border-dashed border-border bg-surface/50 space-y-1.5">
          <IconAttachment className="w-6 h-6 text-text-muted/40 mx-auto" />
          <p className="text-xs font-medium text-text">No documents attached yet</p>
          <p className="text-2xs text-text-muted max-w-xs mx-auto">
            Upload MoM, Agenda, presentation decks, or technical reference documents.
          </p>
          {!readOnly && canUpload && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenUploadModal}
                className="gap-1.5 text-xs h-7"
              >
                <IconUpload className="w-3 h-3 text-primary" />
                <span>Upload First Document</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1.5">
          {allItems.map((item, idx) => {
            const displayName = item.documentTitle || item.documentName || item.fileName || 'Attachment';
            const typeLabel = item.documentTypeName || 'Document';

            return (
              <div
                key={item.id || item.tempId || idx}
                className="p-3 rounded-xl border border-border bg-surface hover:border-primary/30 transition-all flex flex-col justify-between space-y-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {typeLabel}
                    </span>
                    {item.isQueued && (
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Queued for save
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <IconFileText className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-text truncate" title={displayName}>
                      {displayName}
                    </p>
                  </div>

                  {item.fileName && item.fileName !== displayName && (
                    <p className="text-2xs text-text-muted truncate font-mono pl-6" title={item.fileName}>
                      {item.fileName}
                    </p>
                  )}

                  {/* Remarks Field (from Swagger) */}
                  {item.remarks && (
                    <div className="p-2 rounded-lg bg-surface-hover/70 border border-border/60 text-2xs text-text-muted space-y-0.5 mt-1 overflow-hidden">
                      <span className="font-semibold text-text-muted/90 block">Remarks / Notes:</span>
                      <p className="text-text whitespace-pre-wrap break-words leading-relaxed">{item.remarks}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-2xs text-text-muted">
                  <span>
                    {item.fileSizeMB ? `${item.fileSizeMB} MB` : ''}
                    {item.uploadedByName ? ` • ${item.uploadedByName}` : ''}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!item.isQueued && onDownload && (
                      <button
                        type="button"
                        onClick={() => onDownload(item)}
                        className="p-1.5 rounded-md hover:bg-surface-hover text-text-muted hover:text-primary transition-colors"
                        title="Download attachment"
                      >
                        <IconDownload className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setAttachmentToDelete(item)}
                        className="p-1.5 rounded-md hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                        title="Delete attachment"
                      >
                        <IconDelete className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !uploading && setIsModalOpen(false)}
        title="Upload Meeting Document"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleConfirmUpload} className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger flex items-center gap-2">
              <IconError className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Document Title (1st Field) */}
          <div>
            <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
              Document Title
            </label>
            <Input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="e.g., Client Minutes of Meeting - Signed"
              disabled={uploading}
            />
          </div>

          <DocumentUploader
            required
            docTypeLabel="Document Type"
            options={documentTypes?.length > 0 ? documentTypes : null}
            moduleFilter="MEETING"
            selectedDocTypeId={selectedTypeId}
            onDocTypeChange={(val) => {
              setSelectedTypeId(val);
              setUploadError('');
            }}
            value={
              selectedFile
                ? {
                    fileName: selectedFile.name,
                    fileSize: selectedFile.size,
                    file: selectedFile,
                  }
                : null
            }
            onChange={handleUploaderChange}
            error={uploadError}
            disabled={uploading}
          />

          {/* Remarks (Matches Swagger) */}
          <div>
            <label className="block text-2xs font-semibold text-text-muted mb-1 uppercase tracking-wide">
              Remarks / Description
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add optional notes, version details, or context regarding this file..."
              rows={2}
              disabled={uploading}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !selectedFile || !selectedTypeId}
              className="gap-2"
            >
              <IconUpload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Attach Document'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => !deleting && setAttachmentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Attachment"
        message={`Are you sure you want to remove "${attachmentToDelete?.documentTitle || attachmentToDelete?.fileName || 'this file'}"? This action cannot be undone.`}
        confirmText="Delete Attachment"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

