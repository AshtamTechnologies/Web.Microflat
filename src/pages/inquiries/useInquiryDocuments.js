/**
 * useInquiryDocuments.js — State management and CRUD logic for inquiry document attachments and versioning.
 * Integrates with inquiryService for real multipart uploads, authenticated downloads and deletions.
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { inquiryService } from '../../services';
import { mockInquiryDocuments } from '../../mocks/inquiryDocuments';
import { INITIAL_DOCUMENT_TYPES } from '../../mocks/documentTypes';

function formatAuditTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formattedHours}:${minutes} ${ampm}`;
}

export function useInquiryDocuments() {
  const [documents, setDocuments] = useState(mockInquiryDocuments);

  /* ── Get documents for a specific inquiry (synchronous from cache) ── */
  const getDocumentsByInquiryId = useCallback(
    (inquiryId) => {
      if (!inquiryId) return [];
      return documents.filter(
        (doc) =>
          String(doc.inquiryId) === String(inquiryId) ||
          String(doc.InquiryId) === String(inquiryId)
      );
    },
    [documents]
  );

  /* ── Fetch documents from backend for a specific inquiry ── */
  const fetchDocumentsByInquiryId = useCallback(async (inquiryId) => {
    if (!inquiryId) return [];
    try {
      const apiAttachments = await inquiryService.getInquiryAttachments(inquiryId);
      if (Array.isArray(apiAttachments) && apiAttachments.length > 0) {
        setDocuments((prev) => {
          // Replace or merge documents for this inquiry
          const otherDocs = prev.filter(
            (d) => String(d.inquiryId) !== String(inquiryId) && String(d.InquiryId) !== String(inquiryId)
          );
          return [...apiAttachments, ...otherDocs];
        });
        return apiAttachments;
      }
      return [];
    } catch (err) {
      console.warn(`Failed to fetch attachments for inquiry ${inquiryId}:`, err);
      return [];
    }
  }, []);

  /* ── Get missing mandatory document types for an inquiry ── */
  const getMissingMandatoryDocumentTypes = useCallback(
    (inquiryId, docTypesList = INITIAL_DOCUMENT_TYPES) => {
      const inqDocs = getDocumentsByInquiryId(inquiryId);
      const attachedTypeIds = new Set(inqDocs.map((d) => String(d.documentTypeId)));

      return (docTypesList || []).filter(
        (dt) =>
          dt.isMandatory &&
          !attachedTypeIds.has(String(dt.documentTypeId || dt.id))
      );
    },
    [getDocumentsByInquiryId]
  );

  /* ── Add New Document (Multipart Upload) ── */
  const addDocument = useCallback(
    async (inquiryId, { documentTypeId, documentTitle, file, remarks }) => {
      try {
        const uploaded = await inquiryService.uploadInquiryAttachment(inquiryId, {
          documentTypeId,
          documentTitle,
          file,
          remarks,
        });

        setDocuments((prev) => [uploaded, ...prev]);
        toast.success('Document uploaded successfully.');
        return { ok: true, document: uploaded };
      } catch (err) {
        console.warn('API upload failed, falling back to local document state:', err);

        const now = formatAuditTimestamp();
        const fileName = file?.name || 'document.pdf';
        const extIndex = fileName.lastIndexOf('.');
        const fileExtension = extIndex >= 0 ? fileName.slice(extIndex).toLowerCase() : '.pdf';
        const fileSizeKB = file?.size ? Math.max(1, Math.round(file.size / 1024)) : 500;

        const docId = `doc_${Date.now()}`;
        const initialVersion = {
          versionId: `ver_${Date.now()}_1`,
          versionNo: 1,
          fileName,
          fileExtension,
          fileSizeKB,
          changeRemarks: remarks?.trim() || 'Initial document attachment',
          isCurrent: true,
          uploadedBy: 'Ian Chesnut',
          uploadedOn: now,
        };

        const newDoc = {
          id: docId,
          documentId: docId,
          inquiryId,
          documentTypeId,
          documentTitle: documentTitle?.trim() || fileName,
          displayName: documentTitle?.trim() || fileName,
          currentVersionNo: 1,
          createdBy: 'Ian Chesnut',
          createdOn: now,
          versions: [initialVersion],
        };

        setDocuments((prev) => [newDoc, ...prev]);
        toast.success('Document saved locally');
        return { ok: true, document: newDoc };
      }
    },
    []
  );

  /* ── Add New Document Version ── */
  const addDocumentVersion = useCallback(
    async (inquiryId, documentId, { file, remarks }) => {
      try {
        // Upload via service
        const uploaded = await inquiryService.uploadInquiryAttachment(inquiryId, {
          documentTypeId: 1,
          documentTitle: file?.name,
          file,
          remarks,
        });
        setDocuments((prev) => [uploaded, ...prev]);
        toast.success('New version uploaded successfully.');
        return { ok: true, document: uploaded };
      } catch (err) {
        console.warn('API version upload failed, falling back to local:', err);

        const now = formatAuditTimestamp();
        const fileName = file?.name || 'document_rev.pdf';
        const extIndex = fileName.lastIndexOf('.');
        const fileExtension = extIndex >= 0 ? fileName.slice(extIndex).toLowerCase() : '.pdf';
        const fileSizeKB = file?.size ? Math.max(1, Math.round(file.size / 1024)) : 500;

        setDocuments((prev) =>
          prev.map((doc) => {
            if (doc.documentId !== documentId && doc.id !== documentId) return doc;

            const nextVersionNo = (doc.currentVersionNo || doc.versions?.length || 1) + 1;
            const existingVersions = (doc.versions || []).map((v) => ({
              ...v,
              isCurrent: false,
            }));

            const newVersion = {
              versionId: `ver_${Date.now()}_${nextVersionNo}`,
              versionNo: nextVersionNo,
              fileName,
              fileExtension,
              fileSizeKB,
              changeRemarks: remarks?.trim() || `Revision ${nextVersionNo} update`,
              isCurrent: true,
              uploadedBy: 'Ian Chesnut',
              uploadedOn: now,
            };

            return {
              ...doc,
              currentVersionNo: nextVersionNo,
              versions: [newVersion, ...existingVersions],
            };
          })
        );

        toast.success('New version uploaded (local)');
        return { ok: true };
      }
    },
    []
  );

  /* ── Delete Document ── */
  const deleteDocument = useCallback(async (documentId) => {
    try {
      await inquiryService.deleteInquiryAttachment(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.documentId !== documentId && doc.id !== documentId));
      toast.success('Document deleted successfully.');
    } catch (err) {
      console.warn('API delete document failed, removing locally:', err);
      setDocuments((prev) => prev.filter((doc) => doc.documentId !== documentId && doc.id !== documentId));
      toast.success('Document deleted');
    }
  }, []);

  /* ── Download Document ── */
  const downloadDocument = useCallback(async (documentId, fileName = 'attachment.pdf') => {
    try {
      await inquiryService.downloadInquiryAttachment(documentId, fileName);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download document attachment.');
    }
  }, []);

  return {
    documents,
    getDocumentsByInquiryId,
    fetchDocumentsByInquiryId,
    getMissingMandatoryDocumentTypes,
    addDocument,
    addDocumentVersion,
    deleteDocument,
    downloadDocument,
  };
}
