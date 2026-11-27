/**
 * useInquiryDocuments.js — State management and CRUD logic for inquiry document attachments and versioning.
 * Integrates with inquiryService for real multipart uploads, authenticated downloads and deletions.
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { inquiryService } from '../../services';

export function useInquiryDocuments() {
  const [documents, setDocuments] = useState([]);

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
      const inquiryDocs = Array.isArray(apiAttachments) ? apiAttachments : [];
      setDocuments((prev) => {
        const otherDocs = prev.filter(
          (d) => String(d.inquiryId) !== String(inquiryId) && String(d.InquiryId) !== String(inquiryId)
        );
        return [...inquiryDocs, ...otherDocs];
      });
      return inquiryDocs;
    } catch (err) {
      console.error(`Failed to fetch attachments for inquiry ${inquiryId}:`, err);
      setDocuments((prev) => prev.filter(
        (doc) => String(doc.inquiryId) !== String(inquiryId) && String(doc.InquiryId) !== String(inquiryId)
      ));
      toast.error(err?.message || 'Failed to load inquiry attachments.');
      return [];
    }
  }, []);

  /* ── Get missing mandatory document types for an inquiry ── */
  const getMissingMandatoryDocumentTypes = useCallback(
    (inquiryId, docTypesList = []) => {
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

        // Refresh documents for this inquiry to ensure fresh state from server
        await fetchDocumentsByInquiryId(inquiryId);
        toast.success('Document uploaded successfully.');
        return { ok: true, document: uploaded };
      } catch (err) {
        console.error('Failed to upload inquiry document:', err);
        const errMsg = err?.message || 'Failed to upload inquiry document.';
        toast.error(errMsg);
        return { ok: false, error: errMsg };
      }
    },
    [fetchDocumentsByInquiryId]
  );

  /* ── Add New Document Version ── */
  const addDocumentVersion = useCallback(
    async (inquiryId, documentId, { file, remarks, documentTypeId, documentTitle }) => {
      try {
        const docRecord = documents.find((d) => d.documentId === documentId || d.id === documentId);
        const resolvedDocTypeId = documentTypeId || docRecord?.documentTypeId;
        const resolvedDocTitle = documentTitle || docRecord?.documentTitle || file?.name;

        // Upload via service
        const uploaded = await inquiryService.uploadInquiryAttachment(inquiryId, {
          documentTypeId: resolvedDocTypeId,
          documentTitle: resolvedDocTitle,
          file,
          remarks,
        });
        setDocuments((prev) => [uploaded, ...prev]);
        toast.success('New version uploaded successfully.');
        return { ok: true, document: uploaded };
      } catch (err) {
        console.error('Failed to upload inquiry document version:', err);
        const errMsg = err?.message || 'Failed to upload inquiry document version.';
        toast.error(errMsg);
        return { ok: false, error: errMsg };
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
      console.error('Failed to delete inquiry document:', err);
      toast.error(err?.message || 'Failed to delete inquiry document.');
      return { ok: false, error: err?.message || 'Failed to delete inquiry document.' };
    }
  }, []);

  /* ── Download Document ── */
  const downloadDocument = useCallback(async (documentId, fileName = '') => {
    try {
      await inquiryService.downloadInquiryAttachment(documentId, fileName);
      return { ok: true };
    } catch (err) {
      console.error('Download error:', err);
      const error = err?.message || 'Failed to download document attachment.';
      toast.error(error);
      return { ok: false, error };
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
