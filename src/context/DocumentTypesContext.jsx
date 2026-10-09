import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_DOCUMENT_TYPES } from '../mocks/documentTypes';

const DocumentTypesContext = createContext(null);

export function DocumentTypesProvider({ children }) {
  const [documentTypes, setDocumentTypes] = useState(INITIAL_DOCUMENT_TYPES);

  const getDocumentTypeById = useCallback(
    (id) => {
      const found = documentTypes.find(
        (dt) => dt.documentTypeId === id || dt.id === id
      );
      if (found) return found;
      return {
        documentTypeId: id || 'dt_unknown',
        id: id || 'dt_unknown',
        typeName: id || 'Document',
        allowedExtensions: ['.pdf'],
        maxSizeMB: 25,
        isMandatory: false,
        isActive: true,
      };
    },
    [documentTypes]
  );

  const addDocumentType = useCallback(async (data) => {
    // Simulated mock network delay
    await new Promise((r) => setTimeout(r, 500));

    const newId = `dt_${Date.now()}`;
    const newDocType = {
      documentTypeId: newId,
      id: newId,
      typeName: data.typeName.trim(),
      allowedExtensions: Array.isArray(data.allowedExtensions)
        ? data.allowedExtensions
        : ['.pdf'],
      maxSizeMB: Number(data.maxSizeMB) || 25,
      isMandatory: Boolean(data.isMandatory),
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    };

    setDocumentTypes((prev) => [...prev, newDocType]);
    toast.success('Document type added');
    return newDocType;
  }, []);

  const updateDocumentType = useCallback(async (id, data) => {
    // Simulated mock network delay
    await new Promise((r) => setTimeout(r, 500));

    setDocumentTypes((prev) =>
      prev.map((dt) => {
        if (dt.documentTypeId === id || dt.id === id) {
          return {
            ...dt,
            typeName: data.typeName ? data.typeName.trim() : dt.typeName,
            allowedExtensions: Array.isArray(data.allowedExtensions)
              ? data.allowedExtensions
              : dt.allowedExtensions,
            maxSizeMB: data.maxSizeMB !== undefined ? Number(data.maxSizeMB) : dt.maxSizeMB,
            isMandatory: data.isMandatory !== undefined ? Boolean(data.isMandatory) : dt.isMandatory,
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : (dt.isActive !== undefined ? dt.isActive : true),
          };
        }
        return dt;
      })
    );
    toast.success('Document type updated');
    return { ok: true };
  }, []);

  const toggleDocumentTypeActive = useCallback((id) => {
    setDocumentTypes((prev) =>
      prev.map((dt) => {
        if (dt.documentTypeId === id || dt.id === id) {
          const nextState = !(dt.isActive !== undefined ? dt.isActive : true);
          toast.success(
            nextState ? 'Document type activated' : 'Document type deactivated'
          );
          return {
            ...dt,
            isActive: nextState,
          };
        }
        return dt;
      })
    );
  }, []);

  const deleteDocumentType = useCallback((id) => {
    setDocumentTypes((prev) =>
      prev.filter((dt) => dt.documentTypeId !== id && dt.id !== id)
    );
    toast.success('Document type deleted');
  }, []);

  return (
    <DocumentTypesContext.Provider
      value={{
        documentTypes,
        getDocumentTypeById,
        addDocumentType,
        updateDocumentType,
        deleteDocumentType,
        toggleDocumentTypeActive,
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
