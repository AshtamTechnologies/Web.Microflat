/**
 * useInquiryDocuments.js — State management and CRUD logic for inquiry document attachments and versioning.
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  mockInquiryDocuments,
  DOCUMENT_TYPE_OPTIONS,
} from '../../mocks/inquiryDocuments';

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

  /* ── Get documents for a specific inquiry ── */
  const getDocumentsByInquiryId = useCallback(
    (inquiryId) => {
      if (!inquiryId) return [];
      return documents.filter(
        (doc) => doc.inquiryId === inquiryId || doc.InquiryId === inquiryId
      );
    },
    [documents]
  );

  /* ── Get missing mandatory document types for an inquiry ── */
  const getMissingMandatoryDocumentTypes = useCallback(
    (inquiryId) => {
      const inqDocs = getDocumentsByInquiryId(inquiryId);
      const attachedTypeIds = new Set(inqDocs.map((d) => d.documentTypeId));

      return DOCUMENT_TYPE_OPTIONS.filter(
        (dt) => dt.isMandatory && !attachedTypeIds.has(dt.id)
      );
    },
    [getDocumentsByInquiryId]
  );

  /* ── Add New Document (Version 1) ── */
  const addDocument = useCallback(
    async (inquiryId, { documentTypeId, documentTitle, file, remarks }) => {
      await new Promise((r) => setTimeout(r, 600));

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
        documentId: docId,
        inquiryId,
        documentTypeId,
        documentTitle: documentTitle.trim(),
        currentVersionNo: 1,
        createdBy: 'Ian Chesnut',
        createdOn: now,
        versions: [initialVersion],
      };

      setDocuments((prev) => [newDoc, ...prev]);
      toast.success('Document uploaded');
      return { ok: true, document: newDoc };
    },
    []
  );

  /* ── Add New Document Version ── */
  const addDocumentVersion = useCallback(
    async (inquiryId, documentId, { file, remarks }) => {
      await new Promise((r) => setTimeout(r, 600));

      const now = formatAuditTimestamp();
      const fileName = file?.name || 'document_rev.pdf';
      const extIndex = fileName.lastIndexOf('.');
      const fileExtension = extIndex >= 0 ? fileName.slice(extIndex).toLowerCase() : '.pdf';
      const fileSizeKB = file?.size ? Math.max(1, Math.round(file.size / 1024)) : 500;

      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.documentId !== documentId) return doc;

          const nextVersionNo = (doc.currentVersionNo || doc.versions?.length || 1) + 1;

          // Flip existing versions to isCurrent: false
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

      toast.success('New version uploaded');
      return { ok: true };
    },
    []
  );

  /* ── Delete Document ── */
  const deleteDocument = useCallback((documentId) => {
    setDocuments((prev) => prev.filter((doc) => doc.documentId !== documentId));
    toast.success('Document deleted');
  }, []);

  return {
    documents,
    getDocumentsByInquiryId,
    getMissingMandatoryDocumentTypes,
    addDocument,
    addDocumentVersion,
    deleteDocument,
  };
}
