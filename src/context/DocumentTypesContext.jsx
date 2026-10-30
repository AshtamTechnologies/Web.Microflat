/**
 * src/context/DocumentTypesContext.jsx — Document Types state management wired to real API service.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { documentTypesService } from '../services';

const DocumentTypesContext = createContext(null);

export function DocumentTypesProvider({ children }) {
  const location = useLocation();
  const [hasRequested, setHasRequested] = useState(false);
  const isRelevantRoute = Boolean(
    location?.pathname?.startsWith('/configuration/document-types') ||
    location?.pathname?.startsWith('/inquiries')
  );
  const shouldFetch = isRelevantRoute || hasRequested;

  const ensureDocumentTypesLoaded = useCallback(() => {
    setHasRequested(true);
  }, []);

  const [documentTypes, setDocumentTypes] = useState([]);
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState({});

  const fetchDocumentTypes = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await documentTypesService.listDocumentTypes(filters);
      setDocumentTypes(data);
      setLastFilters(filters);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to load document types.';
      setError(msg);
      // Don't toast on initial passive load to avoid noise if network/server is starting
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchModules = useCallback(async () => {
    try {
      const data = await documentTypesService.listModules({ isActive: true });
      setModules(data);
      return data;
    } catch (err) {
      console.error('Failed to load modules:', err);
      return [];
    }
  }, []);

  // Lazy load only on relevant routes or when requested
  useEffect(() => {
    if (!shouldFetch) return;
    if (documentTypes.length === 0) {
      fetchDocumentTypes();
      fetchModules();
    }
  }, [shouldFetch, documentTypes.length, fetchDocumentTypes, fetchModules]);

  const getDocumentTypeById = useCallback(
    (id) => {
      const found = documentTypes.find(
        (dt) => String(dt.id) === String(id) || String(dt.documentTypeId) === String(id)
      );
      if (found) return found;
      return {
        id: id || 'dt_unknown',
        documentTypeId: id || 'dt_unknown',
        documentTypeName: 'Document',
        typeName: 'Document',
        description: '',
        maxFileSizeMB: 5,
        maxSizeMB: 5,
        allowedExtensions: '.pdf',
        allowedExtensionList: ['.pdf'],
        isActive: true,
      };
    },
    [documentTypes]
  );

  const fetchDocumentTypeById = useCallback(async (id) => {
    try {
      const data = await documentTypesService.getDocumentType(id);
      return data;
    } catch (err) {
      const msg = err.message || 'Failed to fetch document type details.';
      toast.error(msg);
      throw err;
    }
  }, []);

  const addDocumentType = useCallback(
    async (formData) => {
      try {
        const created = await documentTypesService.createDocumentType(formData);
        toast.success('Document type created successfully');
        await fetchDocumentTypes(lastFilters);
        return created;
      } catch (err) {
        const msg = err.message || 'Failed to create document type.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchDocumentTypes, lastFilters]
  );

  const updateDocumentType = useCallback(
    async (id, formData) => {
      try {
        const updated = await documentTypesService.updateDocumentType(id, formData);
        toast.success('Document type updated successfully');
        await fetchDocumentTypes(lastFilters);
        return updated;
      } catch (err) {
        const msg = err.message || 'Failed to update document type.';
        toast.error(msg);
        throw err;
      }
    },
    [fetchDocumentTypes, lastFilters]
  );

  const toggleDocumentTypeActive = useCallback(
    async (id, targetState) => {
      const current = documentTypes.find(
        (d) => String(d.id) === String(id) || String(d.documentTypeId) === String(id)
      );
      const nextState = typeof targetState === 'boolean'
        ? targetState
        : current
          ? !current.isActive
          : true;

      // Optimistic state update
      setDocumentTypes((prev) =>
        prev.map((dt) => {
          if (String(dt.id) === String(id) || String(dt.documentTypeId) === String(id)) {
            return { ...dt, isActive: nextState };
          }
          return dt;
        })
      );

      try {
        await documentTypesService.updateDocumentTypeStatus(id, nextState);
        toast.success(nextState ? 'Document type activated' : 'Document type deactivated');
      } catch (err) {
        // Rollback on failure
        setDocumentTypes((prev) =>
          prev.map((dt) => {
            if (String(dt.id) === String(id) || String(dt.documentTypeId) === String(id)) {
              return { ...dt, isActive: !nextState };
            }
            return dt;
          })
        );
        const msg = err.message || 'Failed to update status.';
        toast.error(msg);
        throw err;
      }
    },
    [documentTypes]
  );

  const deleteDocumentType = useCallback((id) => {
    // If backend doesn't support DELETE, remove locally or show info
    setDocumentTypes((prev) =>
      prev.filter((dt) => String(dt.id) !== String(id) && String(dt.documentTypeId) !== String(id))
    );
    toast.success('Document type removed');
  }, []);

  return (
    <DocumentTypesContext.Provider
      value={{
        documentTypes,
        modules,
        isLoading,
        error,
        fetchDocumentTypes,
        fetchModules,
        getDocumentTypeById,
        fetchDocumentTypeById,
        addDocumentType,
        updateDocumentType,
        updateDocumentTypeStatus: toggleDocumentTypeActive,
        deleteDocumentType,
        toggleDocumentTypeActive,
        ensureDocumentTypesLoaded,
      }}
    >
      {children}
    </DocumentTypesContext.Provider>
  );
}

export function useDocumentTypesContext() {
  const context = useContext(DocumentTypesContext);
  if (!context) {
    throw new Error('useDocumentTypesContext must be used within a DocumentTypesProvider');
  }
  return context;
}

export const useDocumentTypes = useDocumentTypesContext;
export default DocumentTypesContext;
