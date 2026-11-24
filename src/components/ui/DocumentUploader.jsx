/**
 * DocumentUploader.jsx — Reusable Enterprise Document & File Uploader.
 *
 * Automatically integrates with Configuration > Document Types master:
 *   - Pulls active document types from DocumentTypesContext
 *   - Dynamically enforces allowed file extensions per document type
 *   - Dynamically enforces max file size limit (MB)
 *   - Supports single-file mode (e.g. PO recording) and multi-file mode (e.g. Sales Order attachments)
 *   - Full drag-and-drop support with accessible file picker
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  IconUpload,
  IconUploadCloud,
  IconFileText,
  IconTrash,
  IconInfo,
} from '../../constants/icons';
import SearchableSelect from './SearchableSelect';
import Badge from './Badge';
import Button from './Button';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';

function formatFileSize(bytes = 0) {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function DocumentUploader({
  label = 'Upload Document',
  required = false,
  showDocTypeSelect = true,
  docTypeLabel = 'Document Type',
  moduleFilter = '', // e.g. 'PO', 'VENDOR', 'INQUIRY', 'SALES_ORDER'
  options = null, // Optional explicit options override (e.g. from lookups)
  selectedDocTypeId,
  onDocTypeChange,
  defaultDocTypeKeyword = '', // e.g. 'PO' or 'Quotation'
  multiple = false,
  value = null, // for single mode: { fileName, fileSize, documentTypeName, file, ... }
  onChange, // for single mode: (fileData | null) => void
  onFilesAdded, // for multi mode: (filesArray) => void
  error = '',
  disabled = false,
  className = '',
  compact = false,
}) {
  const { documentTypes = [], modules = [], ensureDocumentTypesLoaded } = useDocumentTypesContext();
  const [internalDocTypeId, setInternalDocTypeId] = useState('');
  const [localFileError, setLocalFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Preload document types from context
  useEffect(() => {
    ensureDocumentTypesLoaded?.();
  }, [ensureDocumentTypesLoaded]);

  // Options from Document Types master (or explicit options prop, strictly filtered by module)
  const documentTypeOptions = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map((dt) => ({
        value: String(dt.id || dt.documentTypeId || dt.value || dt.documentTypeName || dt.typeName),
        label: dt.documentTypeName || dt.typeName || dt.label,
        id: dt.id || dt.documentTypeId || dt.value,
        moduleId: dt.moduleId,
        moduleCode: dt.moduleCode,
        allowedExtensions: dt.allowedExtensions,
        allowedExtensionList: dt.allowedExtensionList,
        maxFileSizeMB: dt.maxFileSizeMB || dt.maxSizeMB || 10,
      }));
    }

    // 1. Filter only active document types
    const activeList = (documentTypes || []).filter(
      (dt) => dt.isActive === true || dt.isActive === 'true' || dt.isActive === undefined
    );

    // 2. Strict module filtering (e.g. for PO, only show PO module document types)
    let filteredList = activeList;
    if (moduleFilter) {
      const filterLower = String(moduleFilter).toLowerCase().trim();
      filteredList = activeList.filter((dt) => {
        const mCode = String(dt.moduleCode || '').toLowerCase().trim();
        const mId = String(dt.moduleId || '').trim();
        const matchedMod = (modules || []).find(
          (m) => String(m.id || m.moduleId) === mId
        );
        const modName = String(matchedMod?.moduleName || dt.moduleName || '').toLowerCase().trim();
        const modCode = String(matchedMod?.moduleCode || mCode).toLowerCase().trim();

        if (modCode === filterLower || mId === filterLower) return true;
        if (modName.includes(filterLower)) return true;

        // Match strictly for PO / Purchase Order module (NEVER by document name)
        if (filterLower === 'po' || filterLower === 'purchase order' || filterLower === 'purchase_order') {
          return (
            modCode === 'po' ||
            modCode === 'purchase_order' ||
            modName.includes('purchase order')
          );
        }

        return false;
      });
    }

    // 100% Dynamic: Return purely what is configured in Document Types master
    return filteredList.map((dt) => ({
      value: String(dt.id || dt.documentTypeId),
      label: dt.documentTypeName || dt.typeName,
      id: dt.id || dt.documentTypeId,
      moduleId: dt.moduleId,
      moduleCode: dt.moduleCode,
      allowedExtensions: dt.allowedExtensions,
      allowedExtensionList: dt.allowedExtensionList,
      maxFileSizeMB: dt.maxFileSizeMB || dt.maxSizeMB || 5,
    }));
  }, [documentTypes, modules, moduleFilter, options]);

  // Determine active document type
  const activeDocTypeId = selectedDocTypeId !== undefined ? selectedDocTypeId : internalDocTypeId;

  // Auto-select matching document type on mount or when options load
  useEffect(() => {
    if (!activeDocTypeId && documentTypeOptions.length > 0) {
      let matched = null;
      if (defaultDocTypeKeyword) {
        matched = documentTypeOptions.find((opt) =>
          opt.label?.toLowerCase().includes(defaultDocTypeKeyword.toLowerCase())
        );
      }
      const initial = matched || documentTypeOptions[0];
      if (initial) {
        const val = String(initial.value);
        setInternalDocTypeId(val);
        onDocTypeChange?.(val, initial);
      }
    }
  }, [activeDocTypeId, documentTypeOptions, defaultDocTypeKeyword, onDocTypeChange]);

  const currentDocType = useMemo(() => {
    return (
      documentTypeOptions.find((opt) => String(opt.value) === String(activeDocTypeId)) ||
      documentTypeOptions[0] ||
      null
    );
  }, [activeDocTypeId, documentTypeOptions]);

  // Allowed extensions for current document type
  const allowedExts = useMemo(() => {
    if (currentDocType?.allowedExtensionList?.length) {
      return currentDocType.allowedExtensionList.map((e) => e.toLowerCase().trim());
    }
    if (currentDocType?.allowedExtensions) {
      return currentDocType.allowedExtensions
        .split(',')
        .map((e) => e.toLowerCase().trim())
        .filter(Boolean);
    }
    return ['.pdf', '.jpg', '.jpeg', '.png'];
  }, [currentDocType]);

  const acceptString = useMemo(() => allowedExts.join(','), [allowedExts]);
  const maxFileSizeMB = currentDocType?.maxFileSizeMB || 5;
  const maxBytes = maxFileSizeMB * 1024 * 1024;

  function handleDocTypeSelectChange(e) {
    const nextVal = e.target.value;
    setInternalDocTypeId(nextVal);
    const selectedObj = documentTypeOptions.find((opt) => String(opt.value) === String(nextVal));
    onDocTypeChange?.(nextVal, selectedObj);
    setLocalFileError('');
  }

  function validateFile(file) {
    if (!currentDocType) {
      return 'Please select a valid document type configured for this module.';
    }
    const name = (file.name || '').toLowerCase();
    const hasValidExt = allowedExts.some((ext) => name.endsWith(ext));
    if (!hasValidExt) {
      return `"${file.name}" is not an allowed file type. Allowed formats: ${allowedExts.join(', ')}`;
    }
    if (file.size > maxBytes) {
      return `"${file.name}" (${formatFileSize(file.size)}) exceeds maximum allowed file size of ${maxFileSizeMB} MB.`;
    }
    return null;
  }

  function processFiles(files) {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) return;

    for (const file of fileList) {
      const err = validateFile(file);
      if (err) {
        setLocalFileError(err);
        return;
      }
    }

    setLocalFileError('');

    if (multiple) {
      const newItems = fileList.map((file, idx) => ({
        id: `doc-${Date.now()}-${idx}`,
        file,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileSizeBytes: file.size,
        documentTypeId: currentDocType?.id || null,
        documentType: currentDocType?.label || 'General Document',
        documentName: currentDocType?.label || 'General Document',
        uploadedAt: new Date().toISOString().split('T')[0],
      }));
      onFilesAdded?.(newItems);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      const singleFile = fileList[0];
      onChange?.({
        file: singleFile,
        fileName: singleFile.name,
        fileSize: formatFileSize(singleFile.size),
        fileSizeBytes: singleFile.size,
        documentTypeId: currentDocType?.id || null,
        documentTypeName: currentDocType?.label || 'PO Document',
        documentType: currentDocType?.label || 'PO Document',
        uploadedAt: new Date().toISOString().split('T')[0],
      });
    }
  }

  function handleRemoveSingleFile() {
    onChange?.(null);
    setLocalFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showDocTypeSelect && (
        <div className="space-y-1">
          <SearchableSelect
            label={docTypeLabel}
            required={required}
            options={documentTypeOptions}
            value={activeDocTypeId || ''}
            onChange={handleDocTypeSelectChange}
            disabled={disabled}
            placeholder="Select document type..."
            searchPlaceholder="Search configured document types..."
            emptyText="No document types configured for this module. Please add one in Configuration > Document Types."
          />
          {currentDocType ? (
            <div className="flex items-center justify-between text-2xs text-text-muted px-0.5">
              <span>
                Configured Formats:{' '}
                <strong className="text-heading font-medium">{allowedExts.join(', ')}</strong>
              </span>
              <span>
                Max Limit:{' '}
                <strong className="text-heading font-medium">{maxFileSizeMB} MB</strong>
              </span>
            </div>
          ) : (
            <div className="text-2xs text-amber-600 dark:text-amber-400 px-0.5">
              No document types configured for this module. Please add one in Configuration &gt; Document Types.
            </div>
          )}
        </div>
      )}

      {/* Upload Zone or Single File Preview */}
      <div>
        {label && (
          <label className="block text-xs font-semibold text-text-muted mb-1.5">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}

        {!multiple && value?.fileName ? (
          <div className="flex items-center justify-between p-3 bg-surface-subtle border border-border rounded-xl text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconFileText size={18} />
              </div>
              <div className="truncate">
                <div className="font-medium text-heading truncate">{value.fileName}</div>
                <div className="flex items-center gap-2 text-3xs text-text-muted font-mono mt-0.5">
                  <span>{value.fileSize || 'Attached'}</span>
                  <span>·</span>
                  <Badge variant="info" size="xs">
                    {value.documentType || value.documentTypeName || currentDocType?.label || 'Document'}
                  </Badge>
                </div>
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveSingleFile}
                className="!p-1.5 text-danger hover:bg-danger/10 shrink-0"
                title="Remove file"
              >
                <IconTrash size={15} />
              </Button>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!disabled) setIsDragging(true);
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
              if (!disabled && e.dataTransfer.files?.length) {
                processFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl ${
              compact ? 'p-3' : 'p-5'
            } text-center cursor-pointer transition-all duration-200 ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-surface/20 border-border'
                : isDragging
                ? 'border-primary bg-primary/10 scale-[0.99]'
                : 'border-border hover:border-primary/60 bg-surface/30 hover:bg-surface/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={acceptString}
              onChange={(e) => processFiles(e.target.files)}
              className="hidden"
              disabled={disabled}
            />
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1.5">
              {multiple ? <IconUploadCloud size={20} /> : <IconUpload size={18} />}
            </div>
            <div className="text-xs font-medium text-heading">
              {multiple
                ? 'Click to browse or drag & drop files here'
                : 'Click or drag file to attach'}
            </div>
            <div className="text-3xs text-text-muted mt-0.5">
              {currentDocType
                ? `Allowed: ${allowedExts.join(', ').toUpperCase()} (Up to ${maxFileSizeMB} MB per file)`
                : 'Select a configured document type above to see upload rules'}
            </div>
          </div>
        )}

        {(localFileError || error) && (
          <p className="text-2xs text-danger mt-1.5 px-0.5 font-medium">
            {localFileError || error}
          </p>
        )}
      </div>
    </div>
  );
}
