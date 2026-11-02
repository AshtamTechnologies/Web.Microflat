/**
 * ProductAttachmentsTab.jsx — Tab for displaying and uploading Product Attachments (Image 2).
 */

import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  SearchableSelect,
  Textarea,
  Modal,
  Badge,
  TableContainer,
  Th,
} from '../../../components/ui';
import {
  IconAttachment,
  IconDownload,
  IconFileText,
  IconImage,
  IconUpload,
} from '../../../constants/icons';
import { productService } from '../../../services';

function getFileIcon(fileName = '', mimeType = '') {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (name.endsWith('.pdf') || mime.includes('pdf')) {
    return <IconFileText size={18} className="text-danger shrink-0" />;
  }
  return <IconImage size={18} className="text-primary shrink-0" />;
}

export default function ProductAttachmentsTab({
  productId,
  attachments = [],
  documentTypes = [],
  onAttachmentUploaded,
  readOnly = false,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    documentTypeId: '',
    documentName: '',
    documentTitle: '',
    remarks: '',
    file: null,
  });

  const docTypeOptions = (documentTypes || []).map((d) => ({
    value: Number(d.id),
    label: d.typeName || d.name || `Type #${d.id}`,
  }));

  const handleOpenModal = () => {
    setForm({
      documentTypeId: '',
      documentName: '',
      documentTitle: '',
      remarks: '',
      file: null,
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({
        ...prev,
        file,
        documentName: prev.documentName || file.name.replace(/\.[^/.]+$/, ''),
      }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file) {
      toast.error('Please choose a file to upload');
      return;
    }
    if (!form.documentTypeId) {
      toast.error('Document Type is required');
      return;
    }

    const formData = new FormData();
    formData.append('DocumentTypeId', Number(form.documentTypeId));
    if (form.documentName?.trim()) {
      formData.append('DocumentName', form.documentName.trim());
    }
    if (form.documentTitle?.trim()) {
      formData.append('DocumentTitle', form.documentTitle.trim());
    }
    if (form.remarks?.trim()) {
      formData.append('Remarks', form.remarks.trim());
    }
    formData.append('File', form.file);

    setIsUploading(true);
    try {
      await productService.uploadAttachment(productId, formData);
      toast.success('Document uploaded successfully');
      setIsModalOpen(false);
      onAttachmentUploaded?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Product Documents & Attachments</h3>
          <p className="text-xs text-muted-foreground">
            Technical drawings, calibration procedures, brochures, and inspection sheets.
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenModal}
            className="flex items-center gap-1.5"
          >
            <IconUpload size={14} />
            <span>Upload Document</span>
          </Button>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-dashed border-border bg-card text-muted-foreground">
          <IconAttachment size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No documents attached</p>
          <p className="text-xs text-muted-foreground mt-1">
            Uploaded files will appear here with preview and download options.
          </p>
        </div>
      ) : (
        <TableContainer
          className="border border-border rounded-lg overflow-hidden bg-card"
          tableClassName="w-full text-xs table-auto"
        >
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <Th className="w-10"></Th>
              <Th>Document Name</Th>
              <Th>Document Type</Th>
              <Th>Title / Remarks</Th>
              <Th>Uploaded On</Th>
              <Th className="w-20 text-center">Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
              {attachments.map((att, idx) => (
                <tr key={att.id || idx} className="hover:bg-muted/20">
                  <td className="p-2.5 text-center">
                    {getFileIcon(att.fileName || att.documentName, att.mimeType)}
                  </td>
                  <td className="p-2.5 font-medium text-foreground">
                    {att.documentName || att.fileName || 'Attachment'}
                  </td>
                  <td className="p-2.5">
                    <Badge variant="neutral">{att.documentTypeName || att.documentType || 'General'}</Badge>
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {att.documentTitle || att.remarks || '-'}
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {att.createdOn ? new Date(att.createdOn).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-2.5 text-center">
                    {att.fileUrl || att.downloadUrl ? (
                      <a
                        href={att.fileUrl || att.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <IconDownload size={14} />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
        </TableContainer>
      )}

      {/* Upload Modal (Swagger Image 2) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isUploading && setIsModalOpen(false)}
        title="Upload Product Attachment"
        size="md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Document Type <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                id="attachmentDocumentTypeId"
                name="documentTypeId"
                value={form.documentTypeId || ''}
                onChange={(e) => {
                  const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e;
                  setForm({ ...form, documentTypeId: val ? Number(val) : '' });
                }}
                options={docTypeOptions}
                placeholder="Select Document Type"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Document Name
              </label>
              <Input
                value={form.documentName}
                onChange={(e) => setForm({ ...form, documentName: e.target.value })}
                placeholder="Defaults to document type name or file name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Document Title
              </label>
              <Input
                value={form.documentTitle}
                onChange={(e) => setForm({ ...form, documentTitle: e.target.value })}
                placeholder="Optional title of document"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Remarks
              </label>
              <Textarea
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Optional description / remarks"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                File <span className="text-danger">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                required
                className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {form.file && (
                <p className="mt-1 text-2xs text-muted-foreground font-mono">
                  Selected: {form.file.name} ({(form.file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <CancelButton
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isUploading}
            />
            <SaveButton
              size="sm"
              label="Upload File"
              loading={isUploading}
              icon={IconUpload}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

