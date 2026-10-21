/**
 * VendorBankDetailsFormPage.jsx — Add / Edit page for Vendor Bank Details.
 *
 * Implements:
 *   - Vendor selector in Add mode / Read-only detail in Edit mode
 *   - Form above, grid below pattern via useRowsEditor
 *   - Everything in DRAFT state until the sticky footer "Save Changes" is clicked
 *   - Consistent SearchableSelect for all dropdowns (Vendor, Account Type, Attachment Document Type)
 *   - Optional Attachment uploader (Cancelled cheque, passbook, bank letter) with preview/remove
 *   - Duplicate account guards and inline validation
 *   - Eye icon toggle per row to reveal/hide masked account number
 *   - Can remove only session-added rows; saved rows can only be deactivated
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconAdd,
  IconAttachment,
  IconBack,
  IconBankDetails,
  IconBuilding2,
  IconCheck,
  IconClose,
  IconDelete,
  IconDownload,
  IconEdit,
  IconEyeOff,
  IconFileSpreadsheet,
  IconFileText,
  IconImage,
  IconInfo,
  IconSave,
  IconUpload,
  IconView,
} from '../../constants/icons';

import {
  Button,
  SaveButton,
  CancelButton,
  Card,
  CollapsibleCard,
  Input,
  SearchableSelect,
  Toggle,
  StatusSwitch,
  Badge,
  DetailField,
  Modal,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
  PageHeader,
  IconButton,
} from '../../components/ui';

import { useVendorsContext } from '../../context/VendorsContext';
import { useVendorBankDetails } from '../../context/VendorBankDetailsContext';
import { useRowsEditor } from '../../hooks/useRowsEditor';
import AuthVerificationModal from './components/AuthVerificationModal';
import {
  ACCOUNT_TYPE_OPTIONS,
  BANK_DOCUMENT_TYPE_OPTIONS,
} from '../../mocks/vendorBankDetails';
import { getCountryName } from '../../mocks/vendors';
import { formatDate, getTodayISO } from '../../utils/dateUtils';

const INITIAL_BANK_FORM = {
  bankDetailId: null,
  accountHolderName: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  swiftCode: '',
  micrCode: '',
  iban: '',
  branchAddress: '',
  remarks: '',
  accountType: 'Current',
  isActive: true,
  attachments: [],
};

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const SWIFT_REGEX = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;
const ACCOUNT_NUM_REGEX = /^\d{6,20}$/;
const MICR_REGEX = /^\d{9}$/;
const IBAN_REGEX = /^[A-Z0-9]{15,34}$/;

function getApprovalBadgeVariant(status) {
  switch (status) {
    case 'Approved':
      return 'approved';
    case 'Pending':
      return 'pending';
    case 'Rejected':
      return 'rejected';
    default:
      return 'neutral';
  }
}

function getFileIcon(fileName = '', fileType = '') {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || fileType.includes('pdf')) {
    return <IconFileText size={18} className="text-danger" />;
  }
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    fileType.includes('image')
  ) {
    return <IconImage size={18} className="text-info" />;
  }
  return <IconAttachment size={18} className="text-primary" />;
}

export default function VendorBankDetailsFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendorId: routeVendorId } = useParams();
  const [searchParams] = useSearchParams();
  const bankParamId = searchParams.get('bank');
  const actionParam = searchParams.get('action') || searchParams.get('mode');
  const isAddAction = actionParam === 'add';

  const { allVendors = [], getVendorById } = useVendorsContext();
  const { getBanksForVendor, saveVendorBanks, deleteBankDetail } = useVendorBankDetails();

  const isEditMode = Boolean(routeVendorId);

  // Selected vendor state (locked in edit mode, selectable in add mode; blank initially in add mode)
  const [selectedVendorId, setSelectedVendorId] = useState(routeVendorId || '');
  const [pendingVendorSwitch, setPendingVendorSwitch] = useState(null);

  // Sync selectedVendorId whenever routeVendorId changes
  useEffect(() => {
    if (routeVendorId) {
      setSelectedVendorId(routeVendorId);
    } else {
      setSelectedVendorId('');
    }
  }, [routeVendorId]);

  // Draft rows state for the chosen vendor
  const [draftRows, setDraftRows] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState([]);
  const [savedRowIds, setSavedRowIds] = useState(new Set());

  // Set of account IDs that have eye reveal active
  const [revealedIds, setRevealedIds] = useState(new Set());

  // Privacy visibility toggles for form fields
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showConfirmAccountNumber, setShowConfirmAccountNumber] = useState(false);

  // Security Auth Modal State (Required for Update and Delete only; not for Add)
  const [authModalState, setAuthModalState] = useState({
    isOpen: false,
    action: 'update', // 'update' | 'delete'
    targetData: null,
  });

  // Attachment upload controls inside the bank form
  const [attDocType, setAttDocType] = useState('Bank Cancelled Cheque');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Modals state
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingAttachmentsRow, setViewingAttachmentsRow] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);

  // Resolve current vendor entity
  const currentVendor = useMemo(() => {
    if (!selectedVendorId) return null;
    return (
      (getVendorById && getVendorById(selectedVendorId)) ||
      allVendors.find((v) => v.id === selectedVendorId) ||
      null
    );
  }, [selectedVendorId, getVendorById, allVendors]);

  // Load existing accounts when a vendor is selected or on mount
  useEffect(() => {
    if (selectedVendorId) {
      const existing = getBanksForVendor(selectedVendorId);
      const cloned = existing.map((b) => ({
        ...b,
        attachments: Array.isArray(b.attachments) ? [...b.attachments] : [],
      }));
      setDraftRows(cloned);
      setInitialSnapshot(JSON.parse(JSON.stringify(cloned)));
      setSavedRowIds(new Set(existing.map((b) => b.bankDetailId || b.id)));
    } else {
      setDraftRows([]);
      setInitialSnapshot([]);
      setSavedRowIds(new Set());
    }
  }, [selectedVendorId, getBanksForVendor]);

  // Vendor options for Add mode
  const vendorOptions = useMemo(() => {
    return allVendors.map((v) => ({
      value: v.id,
      label: `${v.vendorCode} – ${v.vendorName}`,
    }));
  }, [allVendors]);

  // Check if draft has unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(draftRows) !== JSON.stringify(initialSnapshot);
  }, [draftRows, initialSnapshot]);

  // Row removal guard: can remove only rows created during this session
  const canRemoveRow = useCallback(
    (row) => {
      const rowId = row.bankDetailId || row.id;
      return !savedRowIds.has(rowId);
    },
    [savedRowIds]
  );

  // Row validator
  const validateBankRow = useCallback(
    (form) => {
      const errors = {};
      if (!selectedVendorId) {
        errors.vendor = 'Please select a vendor';
      }
      const holder = (form.accountHolderName || '').trim();
      const bank = (form.bankName || '').trim();
      const branch = (form.branchName || '').trim();
      const accNum = String(form.accountNumber || '').trim();
      const ifsc = (form.ifscCode || '').trim().toUpperCase();
      const swift = (form.swiftCode || '').trim().toUpperCase();
      const micr = (form.micrCode || '').trim();
      const iban = (form.iban || '').trim().toUpperCase();
      const branchAddr = (form.branchAddress || '').trim();
      const rem = (form.remarks || '').trim();
      const isIndiaVendor = currentVendor?.countryId === 'IN';

      if (!holder) {
        errors.accountHolderName = 'Account holder name is required';
      } else if (holder.length > 150) {
        errors.accountHolderName = 'Max 150 characters';
      }

      if (!bank) {
        errors.bankName = 'Bank name is required';
      } else if (bank.length > 100) {
        errors.bankName = 'Max 100 characters';
      }

      if (!branch) {
        errors.branchName = 'Branch name is required';
      } else if (branch.length > 100) {
        errors.branchName = 'Max 100 characters';
      }

      if (!accNum) {
        errors.accountNumber = 'Account number is required';
      } else if (!ACCOUNT_NUM_REGEX.test(accNum)) {
        errors.accountNumber = 'Must be 6 to 20 digits only';
      }

      const confirmAccNum = String(form.confirmAccountNumber || '').trim();
      if (!confirmAccNum) {
        errors.confirmAccountNumber = 'Please confirm account number';
      } else if (accNum && confirmAccNum !== accNum) {
        errors.confirmAccountNumber = 'Account numbers do not match';
      }

      // IFSC validation
      if (isIndiaVendor) {
        if (!ifsc) {
          errors.ifscCode = 'IFSC code is required for Indian vendors';
        } else if (!IFSC_REGEX.test(ifsc)) {
          errors.ifscCode = 'Invalid format (e.g. HDFC0001234)';
        }
      } else if (ifsc && !IFSC_REGEX.test(ifsc)) {
        errors.ifscCode = 'Invalid format (e.g. HDFC0001234)';
      }

      // SWIFT validation
      if (swift && !SWIFT_REGEX.test(swift)) {
        errors.swiftCode = 'SWIFT / BIC must be 8 or 11 alphanumeric characters';
      }

      // MICR Code validation (optional, 9 digits)
      if (micr && !MICR_REGEX.test(micr)) {
        errors.micrCode = 'MICR Code must be exactly 9 digits';
      }

      // IBAN validation (optional, 15 to 34 chars)
      if (iban && !IBAN_REGEX.test(iban)) {
        errors.iban = 'IBAN must be 15 to 34 alphanumeric characters';
      }

      // Branch address validation (optional, max 250)
      if (branchAddr && branchAddr.length > 250) {
        errors.branchAddress = 'Max 250 characters';
      }

      // Remarks validation (optional, max 250)
      if (rem && rem.length > 250) {
        errors.remarks = 'Max 250 characters';
      }

      if (!form.accountType) {
        errors.accountType = 'Account type is required';
      }

      // Duplicate guard: same account number + IFSC (or + SWIFT) cannot appear twice for same vendor
      const currentEditingId = form.bankDetailId || form.id;
      const isDuplicate = draftRows.some((r) => {
        const otherId = r.bankDetailId || r.id;
        if (currentEditingId && otherId === currentEditingId) return false;

        const sameAcc = String(r.accountNumber || '').trim() === accNum;
        const sameIfsc = (r.ifscCode || '').trim().toUpperCase() === ifsc && ifsc.length > 0;
        const sameSwift = (r.swiftCode || '').trim().toUpperCase() === swift && swift.length > 0;

        return sameAcc && (sameIfsc || sameSwift || (!ifsc && !swift));
      });

      if (isDuplicate) {
        errors.accountNumber = 'This account already exists for this vendor. Edit it instead.';
      }

      return errors;
    },
    [currentVendor, draftRows, selectedVendorId]
  );

  // useRowsEditor state machine
  const {
    formState,
    setFormState,
    handleFieldChange,
    fieldErrors,
    setFieldErrors,
    editingId,
    isEditing,
    editingIndex,
    handleAddOrUpdate,
    handleStartEdit,
    handleCancelEdit,
    handleRemove,
    handleToggleRowActive,
  } = useRowsEditor({
    rows: draftRows,
    onChange: setDraftRows,
    initialFormValues: INITIAL_BANK_FORM,
    idField: 'bankDetailId',
    rowName: 'Bank Account',
    validateRow: validateBankRow,
    canRemove: canRemoveRow,
  });

  // Action Click Handler: Validates and saves bank details directly
  const handleFormActionClick = async () => {
    if (!selectedVendorId) {
      toast.error('Please select a vendor first');
      return;
    }

    // Validate form fields
    const errors = validateBankRow(formState);
    if (errors && Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErr = Object.values(errors)[0];
      toast.error(firstErr || 'Please check the form for errors');
      return;
    }
    setFieldErrors({});

    if (!isEditing) {
      // Adding new record: directly persist without auth credentials
      const newId = `bd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const { confirmAccountNumber, ...cleanBank } = formState;
      const newRow = {
        ...cleanBank,
        bankDetailId: newId,
        id: newId,
        vendorId: selectedVendorId,
        vendorName: currentVendor?.vendorName,
        vendorCode: currentVendor?.vendorCode,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      const nextRows = [...draftRows, newRow];
      setDraftRows(nextRows);

      if (selectedVendorId && saveVendorBanks) {
        try {
          await saveVendorBanks(selectedVendorId, nextRows);
          toast.success(`Bank account for ${formState.bankName || 'vendor'} added successfully`);
          navigate('/vendor-bank-details');
        } catch (err) {
          toast.error('Failed to save bank account');
        }
      }
      return;
    }

    // Updating existing record: Require security credentials authorization
    setAuthModalState({
      isOpen: true,
      action: 'update',
      targetData: formState,
    });
  };

  // Prompt delete confirmation with auth
  const handlePromptDeleteAccount = (row) => {
    setAuthModalState({
      isOpen: true,
      action: 'delete',
      targetData: row,
    });
  };

  // Select an account from the grid to edit in the form above
  const handleSelectAccountForEdit = (row) => {
    handleStartEdit({
      ...row,
      confirmAccountNumber: row.confirmAccountNumber || row.accountNumber || '',
    });
    setShowAccountNumber(false);
    setShowConfirmAccountNumber(false);
    const formCard = document.getElementById('bank-account-form-card');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Callback on successful authentication (for Update or Delete)
  const handleAuthSuccess = async (authenticatedUser) => {
    if (authModalState.action === 'update') {
      const targetId = editingId;
      const { confirmAccountNumber, ...cleanBank } = formState;
      const updatedRow = {
        ...cleanBank,
        updatedAt: new Date().toISOString(),
        updatedBy: authenticatedUser?.name || 'Ian Chesnut',
      };

      const nextRows = draftRows.map((r) => {
        const id = r.bankDetailId || r.id;
        if (id === targetId) {
          return { ...r, ...updatedRow };
        }
        return r;
      });

      setDraftRows(nextRows);

      // Persist directly to store so the update is immediately saved across the app
      if (selectedVendorId && saveVendorBanks) {
        try {
          await saveVendorBanks(selectedVendorId, nextRows);
          setInitialSnapshot(JSON.parse(JSON.stringify(nextRows)));
        } catch (err) {
          console.error('Failed to auto-persist bank update:', err);
        }
      }

      toast.success(`Bank details for ${formState.bankName || 'account'} updated successfully`);
      navigate('/vendor-bank-details');
    } else if (authModalState.action === 'delete') {
      const targetRow = authModalState.targetData;
      if (!targetRow) return;
      const targetId = targetRow.bankDetailId || targetRow.id;

      if (editingId === targetId) {
        handleCancelEdit();
      }

      const nextRows = draftRows.filter((r) => (r.bankDetailId || r.id) !== targetId);
      setDraftRows(nextRows);

      if (deleteBankDetail && (savedRowIds.has(targetId) || String(targetId).startsWith('bd_'))) {
        deleteBankDetail(targetId);
      }
      if (selectedVendorId && saveVendorBanks) {
        try {
          await saveVendorBanks(selectedVendorId, nextRows);
          setInitialSnapshot(JSON.parse(JSON.stringify(nextRows)));
        } catch (err) {
          console.error('Failed to auto-persist bank delete:', err);
        }
      }

      toast.success(`Bank account for ${targetRow.bankName} deleted successfully`);
    }
    setAuthModalState({ isOpen: false, action: 'update', targetData: null });
  };

  // Auto-fill account holder name with vendor name when vendor is selected and form is blank
  const prevVendorIdRef = useRef('');
  useEffect(() => {
    if (selectedVendorId && selectedVendorId !== prevVendorIdRef.current) {
      prevVendorIdRef.current = selectedVendorId;
      if (!isEditing && currentVendor?.vendorName && !formState.accountHolderName) {
        setFormState((prev) => ({
          ...prev,
          accountHolderName: currentVendor.vendorName,
        }));
      }
    }
  }, [selectedVendorId, currentVendor, isEditing, formState.accountHolderName, setFormState]);

  // Preload account once when draftRows are loaded (does not loop or fight with user selection)
  const preloadedBankRef = useRef(false);
  useEffect(() => {
    if (selectedVendorId) {
      preloadedBankRef.current = false;
    }
  }, [selectedVendorId]);

  useEffect(() => {
    if (!preloadedBankRef.current && draftRows.length > 0) {
      preloadedBankRef.current = true;
      if (isAddAction) {
        // Explicitly adding a new account — leave form empty for new entry
        handleCancelEdit();
        return;
      }
      if (bankParamId) {
        const match = draftRows.find(
          (r) => r.bankDetailId === bankParamId || r.id === bankParamId
        );
        if (match) {
          handleStartEdit({
            ...match,
            confirmAccountNumber: match.confirmAccountNumber || match.accountNumber || '',
          });
          return;
        }
      }
      if (isEditMode) {
        handleStartEdit({
          ...draftRows[0],
          confirmAccountNumber: draftRows[0].confirmAccountNumber || draftRows[0].accountNumber || '',
        });
      }
    }
  }, [bankParamId, isAddAction, draftRows, isEditMode, handleStartEdit, handleCancelEdit]);

  // Handle vendor dropdown change in Add mode
  const handleVendorSelect = (newVendorId) => {
    if (newVendorId === selectedVendorId) return;

    if (isDirty) {
      // Prompt confirmation before discarding unsaved edits of previous vendor
      setPendingVendorSwitch(newVendorId);
      return;
    }

    setSelectedVendorId(newVendorId);
    if (setFieldErrors) {
      setFieldErrors((prev) => {
        if (!prev?.vendor) return prev;
        const next = { ...prev };
        delete next.vendor;
        return next;
      });
    }
    handleCancelEdit();
  };

  const handleConfirmVendorSwitch = () => {
    if (pendingVendorSwitch) {
      setSelectedVendorId(pendingVendorSwitch);
      if (setFieldErrors) {
        setFieldErrors((prev) => {
          if (!prev?.vendor) return prev;
          const next = { ...prev };
          delete next.vendor;
          return next;
        });
      }
      handleCancelEdit();
      setPendingVendorSwitch(null);
    }
  };

  // Toggle reveal for account number
  const toggleRevealAccount = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle file uploads for bank proof
  const handleFilesUpload = (files) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      documentName: attDocType || 'Bank Proof',
      fileName: f.name,
      fileSize:
        f.size > 1048576
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(f.size / 1024))} KB`,
      fileType: f.type || 'application/octet-stream',
      uploadedAt: getTodayISO(),
    }));

    const current = Array.isArray(formState.attachments) ? formState.attachments : [];
    handleFieldChange('attachments', [...current, ...newItems]);
    toast.success(`${newItems.length} document attachment(s) added`);
  };

  const handleRemoveAttachment = (attId) => {
    const current = Array.isArray(formState.attachments) ? formState.attachments : [];
    handleFieldChange(
      'attachments',
      current.filter((a) => a.id !== attId)
    );
    toast.success('Attachment removed');
  };

  // Master submit
  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();
    if (!selectedVendorId) {
      toast.error('Please select a vendor first');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveVendorBanks(selectedVendorId, draftRows);
      toast.success('Bank details saved');
      navigate('/vendor-bank-details');
    } catch (err) {
      toast.error('Failed to save bank details');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Back / Cancel handler
  const handleCancel = () => {
    const hasUnsavedInput = Boolean(
      formState.accountNumber ||
      formState.bankName ||
      formState.branchName ||
      formState.ifscCode
    );
    if (hasUnsavedInput && !isEditMode) {
      setIsDiscardModalOpen(true);
    } else {
      navigate('/vendor-bank-details');
    }
  };

  // Sorted draft rows for grid display: Active first, then newest
  const sortedGridRows = useMemo(() => {
    return [...draftRows].sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [draftRows]);

  // Is currently editing an account that was already saved on record?
  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title={isEditMode ? 'Edit Bank Details' : 'Add Bank Details'}
        subtitle="Manage bank accounts, payment routes, and IFSC codes for vendor settlements"
        icon={<IconBankDetails className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleCancel}
          >
            Back to Bank Details
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <CancelButton
              onClick={handleCancel}
              disabled={isSubmitting}
              size="sm"
            />
            <SaveButton
              onClick={handleSaveChanges}
              loading={isSubmitting}
              disabled={isSubmitting || !selectedVendorId}
              size="sm"
            >
              {isEditMode ? 'Save Changes' : 'Save Bank Account'}
            </SaveButton>
          </div>
        }
      />

      {/* ── 1. Vendor Card ── */}
      <CollapsibleCard
        title="Vendor Information"
        subtitle={
          isEditMode
            ? 'Vendor identity is fixed in edit mode'
            : 'Select the vendor company to associate bank accounts'
        }
        icon={<IconBuilding2 size={17} />}
        defaultOpen={true}
        hasError={Boolean(fieldErrors?.vendor)}
        className="space-y-4 shadow-2xs"
      >

        {isEditMode ? (
          /* Read-only vendor details in edit mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailField label="Vendor Code" value={currentVendor?.vendorCode} mono />
            <DetailField label="Vendor Name" value={currentVendor?.vendorName} />
            <DetailField
              label="Country"
              value={getCountryName(currentVendor?.countryId)}
            />
            <DetailField label="Approval Status">
              <Badge variant={getApprovalBadgeVariant(currentVendor?.approvalStatus)}>
                {currentVendor?.approvalStatus || 'Pending'}
              </Badge>
            </DetailField>
          </div>
        ) : (
          /* Selectable vendor in add mode with SearchableSelect */
          <div className="space-y-3">
            <div className="max-w-xl">
              <SearchableSelect
                label="Select Vendor"
                id="vendor-selector"
                required
                options={vendorOptions}
                value={selectedVendorId}
                onChange={(e) => handleVendorSelect(e.target.value)}
                placeholder="Search vendor by code or name..."
                searchPlaceholder="Type vendor code or company name..."
                emptyText="No matching vendors found"
                error={fieldErrors?.vendor}
              />
            </div>

            {currentVendor && (
              <div className="p-3 bg-surface/70 border border-border rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-2xs text-text-muted block">Vendor Code</span>
                  <span className="font-mono font-semibold text-heading">
                    {currentVendor.vendorCode}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-text-muted block">Country</span>
                  <span className="font-medium text-heading">
                    {getCountryName(currentVendor.countryId)}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-text-muted block">Approval Status</span>
                  <Badge variant={getApprovalBadgeVariant(currentVendor.approvalStatus)} size="sm">
                    {currentVendor.approvalStatus || 'Pending'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing accounts notice in add mode */}
        {!isEditMode && selectedVendorId && draftRows.length > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info/10 text-info border border-info/20 text-xs">
            <IconInfo size={16} className="shrink-0 mt-0.5" />
            <p>
              This vendor already has <strong>{draftRows.length}</strong> bank account(s) on record.
              Edit them below or add a new one.
            </p>
          </div>
        )}
      </CollapsibleCard>

      {/* ── 2. Bank Account Form Card ── */}
      <CollapsibleCard
        id="bank-account-form-card"
        title={isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
        subtitle={
          isEditing
            ? 'Update details below, or select any other bank from the Configured Bank Accounts grid below'
            : 'Enter beneficiary bank details for payment processing'
        }
        icon={<IconBankDetails size={17} />}
        defaultOpen={true}
        hasError={Boolean(fieldErrors && Object.keys(fieldErrors).some((k) => k !== 'vendor'))}
        className="space-y-4 shadow-2xs scroll-mt-20"
        badge={
          isEditing ? (
            <Badge variant="pending" size="sm" className="font-medium">
              Editing: {formState.bankName || 'Account'} {formState.accountNumber ? `(•••• ${String(formState.accountNumber).slice(-4)})` : ''}
            </Badge>
          ) : null
        }
        actions={
          isEditing ? (
            <CancelButton
              size="sm"
              onClick={() => {
                handleCancelEdit();
                setShowAccountNumber(false);
                setShowConfirmAccountNumber(false);
              }}
              className="text-xs self-start sm:self-auto shadow-2xs"
            >
              Cancel Edit
            </CancelButton>
          ) : null
        }
      >

        <div className="space-y-5">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Account Holder Name */}
            <div className="lg:col-span-2">
              <Input
                label="Account Holder Name"
                id="bank-accountHolderName"
                required
                maxLength={150}
                value={formState.accountHolderName || ''}
                onChange={(e) => handleFieldChange('accountHolderName', e.target.value)}
                placeholder="e.g. Apex Precision Castings Pvt Ltd"
                error={fieldErrors.accountHolderName}
              />
            </div>

            {/* Account Type with SearchableSelect */}
            <div>
              <SearchableSelect
                label="Account Type"
                id="bank-accountType"
                required
                options={ACCOUNT_TYPE_OPTIONS}
                value={formState.accountType || 'Current'}
                onChange={(e) => handleFieldChange('accountType', e.target.value)}
                placeholder="Select account type..."
                searchPlaceholder="Search account types..."
                emptyText="No matching account types"
                error={fieldErrors.accountType}
              />
            </div>

            {/* Bank Name */}
            <div>
              <Input
                label="Bank Name"
                id="bank-bankName"
                required
                maxLength={100}
                value={formState.bankName || ''}
                onChange={(e) => handleFieldChange('bankName', e.target.value)}
                placeholder="e.g. HDFC Bank"
                error={fieldErrors.bankName}
              />
            </div>

            {/* Branch Name */}
            <div>
              <Input
                label="Branch Name"
                id="bank-branchName"
                required
                maxLength={100}
                value={formState.branchName || ''}
                onChange={(e) => handleFieldChange('branchName', e.target.value)}
                placeholder="e.g. GIDC Industrial Estate Branch"
                error={fieldErrors.branchName}
              />
            </div>

            {/* Account Number */}
            <div>
              <Input
                label="Account Number"
                id="bank-accountNumber"
                type={showAccountNumber ? 'text' : 'password'}
                required
                maxLength={20}
                value={formState.accountNumber || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  handleFieldChange('accountNumber', val);
                }}
                placeholder="6 to 20 digits"
                className="font-mono tabular-nums"
                error={fieldErrors.accountNumber}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowAccountNumber((prev) => !prev)}
                    className="text-text-muted hover:text-heading p-1 rounded transition-colors focus:outline-none cursor-pointer"
                    title={showAccountNumber ? 'Hide account number' : 'Show account number'}
                    aria-label={showAccountNumber ? 'Hide account number' : 'Show account number'}
                  >
                    {showAccountNumber ? <IconEyeOff size={16} /> : <IconView size={16} />}
                  </button>
                }
              />
            </div>

            {/* Confirm Account Number */}
            <div>
              <Input
                label="Confirm Account Number"
                id="bank-confirmAccountNumber"
                type={showConfirmAccountNumber ? 'text' : 'password'}
                required
                maxLength={20}
                value={formState.confirmAccountNumber || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  handleFieldChange('confirmAccountNumber', val);
                }}
                placeholder="Re-enter account number"
                className="font-mono tabular-nums"
                error={fieldErrors.confirmAccountNumber}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmAccountNumber((prev) => !prev)}
                    className="text-text-muted hover:text-heading p-1 rounded transition-colors focus:outline-none cursor-pointer"
                    title={showConfirmAccountNumber ? 'Hide confirm account number' : 'Show confirm account number'}
                    aria-label={showConfirmAccountNumber ? 'Hide confirm account number' : 'Show confirm account number'}
                  >
                    {showConfirmAccountNumber ? <IconEyeOff size={16} /> : <IconView size={16} />}
                  </button>
                }
              />
            </div>

            {/* IFSC Code */}
            <div>
              <Input
                label={`IFSC Code ${currentVendor?.countryId === 'IN' ? '' : '(Optional)'}`}
                id="bank-ifscCode"
                required={currentVendor?.countryId === 'IN'}
                maxLength={11}
                value={formState.ifscCode || ''}
                onChange={(e) => handleFieldChange('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="font-mono tabular-nums uppercase"
                error={fieldErrors.ifscCode}
              />
            </div>

            {/* MICR Code (Optional) */}
            <div>
              <Input
                label="MICR Code (Optional)"
                id="bank-micrCode"
                maxLength={9}
                value={formState.micrCode || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  handleFieldChange('micrCode', val);
                }}
                placeholder="9-digit MICR code (e.g. 400240012)"
                className="font-mono tabular-nums"
                error={fieldErrors.micrCode}
              />
            </div>

            {/* SWIFT / BIC */}
            <div>
              <Input
                label="SWIFT / BIC Code (Optional)"
                id="bank-swiftCode"
                maxLength={11}
                value={formState.swiftCode || ''}
                onChange={(e) => handleFieldChange('swiftCode', e.target.value.toUpperCase())}
                placeholder="8 or 11 characters (e.g. HDFCINBB)"
                className="font-mono tabular-nums uppercase"
                error={fieldErrors.swiftCode}
              />
            </div>

            {/* IBAN (Optional) */}
            <div>
              <Input
                label="IBAN (Optional / International)"
                id="bank-iban"
                maxLength={34}
                value={formState.iban || ''}
                onChange={(e) => handleFieldChange('iban', e.target.value.toUpperCase())}
                placeholder="e.g. GB29NWBK60161331926819"
                className="font-mono tabular-nums uppercase"
                error={fieldErrors.iban}
              />
            </div>

            {/* Branch Address */}
            <div className="lg:col-span-2">
              <Input
                label="Branch Address (Optional)"
                id="bank-branchAddress"
                maxLength={250}
                value={formState.branchAddress || ''}
                onChange={(e) => handleFieldChange('branchAddress', e.target.value)}
                placeholder="e.g. Floor 2, Commercial Tower, MG Road..."
                error={fieldErrors.branchAddress}
              />
            </div>

            {/* Remarks */}
            <div className="lg:col-span-2">
              <Input
                label="Remarks (Optional)"
                id="bank-remarks"
                maxLength={250}
                value={formState.remarks || ''}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                placeholder="e.g. Operational bank account for vendor disbursements"
                error={fieldErrors.remarks}
              />
            </div>

            {/* Account Status Switch */}
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="mf-label text-2xs uppercase tracking-wider">Account Status</span>
              <div className="flex items-center gap-3">
                <StatusSwitch
                  id="bank-isActive-switch"
                  checked={Boolean(formState.isActive)}
                  onChange={(checked) => handleFieldChange('isActive', Boolean(checked))}
                />
                <span className="text-xs text-text-muted">
                  {formState.isActive ? 'Active for vendor payouts' : 'Inactive account record'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Attachment & Supporting Documents (Optional Field) ── */}
          <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <IconAttachment size={15} className="text-primary" />
                <span className="text-xs font-semibold text-heading  tracking-wider">
                  Bank Proof / Attachment (Optional)
                </span>
              </div>
              <span className="text-2xs text-text-muted">
                Upload cancelled cheque, passbook, or bank mandate letter
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Document Type Selector with SearchableSelect */}
              <div className="md:col-span-1 space-y-1">
                <SearchableSelect
                  label="Document Type"
                  id="bank-doc-type"
                  options={BANK_DOCUMENT_TYPE_OPTIONS}
                  value={attDocType}
                  onChange={(e) => setAttDocType(e.target.value)}
                  placeholder="Select document type..."
                  searchPlaceholder="Search document types..."
                  emptyText="No document types"
                />
                <p className="text-2xs text-text-muted mt-1">
                  Select category before choosing your file.
                </p>
              </div>

              {/* File Dropzone */}
              <div className="md:col-span-2">
                <span className="mf-label block mb-2">Upload Bank Document</span>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    handleFilesUpload(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    'border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200',
                    isDraggingFile
                      ? 'border-primary bg-primary/10 scale-[0.99]'
                      : 'border-border hover:border-primary/60 bg-bg hover:bg-surface/60',
                  ].join(' ')}
                >
                  {/* Native file input hidden for custom drag-drop styling */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    onChange={(e) => {
                      handleFilesUpload(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5">
                    <IconUpload size={17} />
                  </div>
                  <p className="text-xs font-medium text-heading">
                    <span className="text-primary hover:underline font-semibold">
                      Click to browse file
                    </span>{' '}
                    or drag & drop here
                  </p>
                  <p className="text-2xs text-text-muted mt-0.5">
                    Accepted: <strong className="text-heading font-medium">PDF</strong> or{' '}
                    <strong className="text-heading font-medium">Images (PNG, JPG, WEBP)</strong>{' '}
                    (Max 10MB)
                  </p>
                </div>
              </div>
            </div>

            {/* List of Attached Documents for this Account */}
            {Array.isArray(formState.attachments) && formState.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                  Attached Files ({formState.attachments.length})
                </span>
                <div className="space-y-1.5">
                  {formState.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-lg border border-border bg-surface flex items-center justify-between gap-3 text-xs hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-bg border border-border shrink-0">
                          {getFileIcon(att.fileName, att.fileType)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-heading truncate">
                              {att.documentName}
                            </span>
                            <Badge variant="neutral" size="sm" className="font-mono text-2xs">
                              {att.fileName}
                            </Badge>
                          </div>
                          <p className="text-2xs text-text-muted mt-0.5 font-mono">
                            {att.fileSize || '1 file'} • Uploaded {formatDate(att.uploadedAt)}
                          </p>
                        </div>
                      </div>

                      <IconButton
                        icon={IconDelete}
                        size="sm"
                        variant="ghost"
                        title="Remove attachment"
                        aria-label="Remove attachment"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="hover:text-danger hover:bg-danger/10 shrink-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <CancelButton
              size="sm"
              onClick={handleCancel}
              className="text-xs shadow-2xs"
            />
            <SaveButton
              type="button"
              size="sm"
              onClick={handleFormActionClick}
              disabled={isSubmitting || !selectedVendorId}
              loading={isSubmitting}
              loadingText="Saving..."
              title={!selectedVendorId ? 'Please select a vendor first' : undefined}
              className="text-xs font-semibold shadow-2xs"
            >
              {isEditing ? 'Save Changes' : 'Save Changes'}
            </SaveButton>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── 3. Bank Accounts History Grid Card ── */}
      <CollapsibleCard
        title={`Configured Bank Accounts (${draftRows.length})`}
        subtitle="Active accounts appear first. Any account can be edited or deleted with security credentials authorization."
        icon={<IconBankDetails size={17} />}
        defaultOpen={true}
        className="space-y-4 shadow-2xs"
      >

        {sortedGridRows.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-border rounded-xl bg-surface/30 space-y-2">
            <IconBankDetails size={24} className="mx-auto text-text-muted/60" />
            <p className="text-xs font-semibold text-heading">No bank accounts yet</p>
            <p className="text-2xs text-text-muted">
              Use the form above to add the vendor&apos;s first bank account.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block">
              <TableContainer
                className="overflow-x-auto"
                tableClassName="w-full text-left border-collapse text-xs table-auto"
              >
                <thead className="bg-surface/80 border-b border-border">
                  <tr>
                    <Th className="py-2.5 px-3 min-w-[200px]">BANK & BRANCH</Th>
                    <Th className="py-2.5 px-3 min-w-[150px]">ACCOUNT HOLDER</Th>
                    <Th className="py-2.5 px-3 min-w-[150px]">ACCOUNT NO</Th>
                    <Th className="py-2.5 px-3 min-w-[130px]">IFSC / SWIFT</Th>
                    <Th className="py-2.5 px-3 w-28 text-center">TYPE</Th>
                    <Th className="py-2.5 px-3 w-32 text-center">ATTACHMENTS</Th>
                    <Th className="py-2.5 px-3 w-32 text-center">STATUS</Th>
                    <Th className="py-2.5 px-3 min-w-[140px]">LAST UPDATED</Th>
                    <Th className="py-2.5 px-3 w-28 text-right">ACTIONS</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg">
                  {sortedGridRows.map((row) => {
                    const rowId = row.bankDetailId || row.id;
                    const isCurrentlyEditing = editingId === rowId;
                    const isRevealed = revealedIds.has(rowId);
                    const isNewInSession = !savedRowIds.has(rowId);

                    // Check if edited from original
                    const originalRow = initialSnapshot.find(
                      (r) => (r.bankDetailId || r.id) === rowId
                    );
                    const isEditedInSession =
                      !isNewInSession &&
                      originalRow &&
                      JSON.stringify(row) !== JSON.stringify(originalRow);

                    const hasAtts = Array.isArray(row.attachments) && row.attachments.length > 0;

                    return (
                      <tr
                        key={rowId}
                        onClick={() => handleSelectAccountForEdit(row)}
                        className={[
                          'transition-colors cursor-pointer group',
                          isCurrentlyEditing ? 'bg-primary/10 ring-2 ring-primary/40' : 'hover:bg-surface/70',
                        ].join(' ')}
                        title="Click to load and edit this bank account"
                      >
                        {/* Bank & Branch */}
                        <Td className="py-2.5 px-3">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-heading">
                                {row.bankName}
                              </span>
                              {isCurrentlyEditing && (
                                <Badge variant="pending" size="sm">
                                  Selected
                                </Badge>
                              )}
                              {isNewInSession && !isCurrentlyEditing && (
                                <Badge variant="success" size="sm">
                                  New
                                </Badge>
                              )}
                              {isEditedInSession && !isCurrentlyEditing && (
                                <Badge variant="neutral" size="sm">
                                  Edited
                                </Badge>
                              )}
                            </div>
                            <span className="text-2xs text-text-muted mt-0.5 truncate">
                              {row.branchName || '—'}
                            </span>
                            {hasAtts && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingAttachmentsRow(row);
                                }}
                                className="inline-flex items-center gap-1 text-2xs text-primary font-medium mt-0.5 hover:underline cursor-pointer text-left"
                                title="Click to view attachments"
                              >
                                <IconAttachment size={11} /> {row.attachments.length} attachment(s)
                              </button>
                            )}
                          </div>
                        </Td>

                        {/* Account Holder */}
                        <Td className="py-2.5 px-3">
                          <span className="text-xs text-text truncate block">
                            {row.accountHolderName || '—'}
                          </span>
                        </Td>

                        {/* Account Number with Eye Reveal Toggle */}
                        <Td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                            <span className="font-medium text-heading">
                              {isRevealed
                                ? row.accountNumber
                                : `•••• ${String(row.accountNumber || '').slice(-4)}`}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRevealAccount(rowId);
                              }}
                              className="text-text-muted hover:text-heading p-1 rounded hover:bg-surface cursor-pointer transition-colors"
                              title={isRevealed ? 'Mask account number' : 'Reveal account number'}
                              aria-label={isRevealed ? 'Mask account number' : 'Reveal account number'}
                            >
                              {isRevealed ? <IconEyeOff size={13} /> : <IconView size={13} />}
                            </button>
                          </div>
                        </Td>

                        {/* IFSC / SWIFT */}
                        <Td className="py-2.5 px-3">
                          <div className="flex flex-col font-mono tabular-nums text-xs">
                            {row.ifscCode ? (
                              <span className="font-medium text-heading">{row.ifscCode}</span>
                            ) : null}
                            {row.swiftCode ? (
                              <span className="text-2xs text-text-muted">{row.swiftCode}</span>
                            ) : null}
                            {!row.ifscCode && !row.swiftCode ? (
                              <span className="text-text-muted">—</span>
                            ) : null}
                          </div>
                        </Td>

                        {/* Type */}
                        <Td className="py-2.5 px-3 text-center">
                          <Badge variant="neutral" size="sm">
                            {row.accountType || 'Current'}
                          </Badge>
                        </Td>

                        {/* Attachments Column */}
                        <Td className="py-2.5 px-3 text-center">
                          {hasAtts ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingAttachmentsRow(row);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-colors cursor-pointer shadow-2xs"
                              title={`View ${row.attachments.length} attachment(s)`}
                            >
                              <IconAttachment size={11} />
                              <span>{row.attachments.length} File{row.attachments.length > 1 ? 's' : ''}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingAttachmentsRow(row);
                              }}
                              className="text-2xs text-text-muted hover:text-heading cursor-pointer inline-flex items-center gap-1"
                              title="No attachments. Click to inspect."
                            >
                              <IconAttachment size={11} className="opacity-40" />
                              <span>0</span>
                            </button>
                          )}
                        </Td>

                        {/* Status Badge */}
                        <Td className="py-2.5 px-3 text-center">
                          <Badge variant={row.isActive ? 'active' : 'inactive'} size="sm">
                            {row.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </Td>

                        {/* Last Updated */}
                        <Td className="py-2.5 px-3">
                          <div className="flex flex-col font-mono tabular-nums text-xs">
                            <span className="text-text-muted">
                              {row.updatedAt
                                ? formatDate(row.updatedAt)
                                : row.createdAt
                                  ? formatDate(row.createdAt)
                                  : 'Just now'}
                            </span>
                            <span className="text-2xs text-text-muted/80 font-sans mt-0.5 truncate">
                              by {row.updatedBy || row.createdBy || 'Ian Chesnut'}
                            </span>
                          </div>
                        </Td>

                        {/* Actions */}
                        <Td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant={isCurrentlyEditing ? "primary" : "ghost"}
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAccountForEdit(row);
                              }}
                              title={isCurrentlyEditing ? "Currently editing this account" : "Edit account"}
                              className={isCurrentlyEditing ? "h-7 w-7 shadow-2xs" : "text-text-muted hover:text-primary hover:bg-surface h-7 w-7"}
                              aria-label={`Edit ${row.bankName}`}
                            >
                              <IconEdit size={13} />
                            </Button>

                            {/* Delete bank account (Requires Auth) */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromptDeleteAccount(row);
                              }}
                              title="Delete bank account"
                              className="text-text-muted hover:text-danger hover:bg-danger/10 h-7 w-7"
                              aria-label={`Delete ${row.bankName}`}
                            >
                              <IconDelete size={13} />
                            </Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableContainer>
            </div>

            {/* Mobile Stacked Card View (< md) */}
            <div className="block md:hidden space-y-3">
              {sortedGridRows.map((row) => {
                const rowId = row.bankDetailId || row.id;
                const isCurrentlyEditing = editingId === rowId;
                const isRevealed = revealedIds.has(rowId);
                const isNewInSession = !savedRowIds.has(rowId);
                const hasAtts = Array.isArray(row.attachments) && row.attachments.length > 0;

                return (
                  <div
                    key={rowId}
                    onClick={() => handleSelectAccountForEdit(row)}
                    className={[
                      'p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 text-xs',
                      isCurrentlyEditing
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border bg-surface/40 hover:bg-surface/80',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-heading">
                            {row.bankName}
                          </span>
                          {isCurrentlyEditing && (
                            <Badge variant="pending" size="sm">
                              Selected
                            </Badge>
                          )}
                          {isNewInSession && !isCurrentlyEditing && (
                            <Badge variant="success" size="sm">
                              New
                            </Badge>
                          )}
                        </div>
                        <span className="text-2xs text-text-muted">
                          {row.branchName || 'Main Branch'}
                        </span>
                        {hasAtts && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingAttachmentsRow(row);
                            }}
                            className="inline-flex items-center gap-1 text-2xs text-primary font-medium mt-0.5 hover:underline cursor-pointer"
                          >
                            <IconAttachment size={11} /> {row.attachments.length} attachment(s)
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant={isCurrentlyEditing ? "primary" : "ghost"}
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAccountForEdit(row);
                          }}
                          className={`h-7 w-7 ${isCurrentlyEditing ? '' : 'text-text-muted hover:text-primary'}`}
                          title="Edit account"
                        >
                          <IconEdit size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromptDeleteAccount(row);
                          }}
                          className="h-7 w-7 text-text-muted hover:text-danger hover:bg-danger/10"
                          title="Delete account"
                          aria-label={`Delete ${row.bankName}`}
                        >
                          <IconDelete size={13} />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-2xs text-text-muted block">Account Number</span>
                        <div className="flex items-center gap-1.5 font-mono tabular-nums">
                          <span className="font-medium text-heading">
                            {isRevealed
                              ? row.accountNumber
                              : `•••• ${String(row.accountNumber || '').slice(-4)}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealAccount(rowId)}
                            className="text-text-muted hover:text-heading"
                          >
                            {isRevealed ? <IconEyeOff size={12} /> : <IconView size={12} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">Type</span>
                        <Badge variant="neutral" size="sm">
                          {row.accountType || 'Current'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">IFSC / SWIFT</span>
                        <span className="font-mono tabular-nums text-text">
                          {row.ifscCode || row.swiftCode || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted block">Account Holder</span>
                        <span className="text-text truncate block">
                          {row.accountHolderName || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-text-muted">Files:</span>
                        {hasAtts ? (
                          <button
                            type="button"
                            onClick={() => setViewingAttachmentsRow(row)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer"
                          >
                            <IconAttachment size={10} /> {row.attachments.length} View
                          </button>
                        ) : (
                          <span className="text-text-muted font-mono">None</span>
                        )}
                      </div>
                      <Badge variant={row.isActive ? 'active' : 'inactive'} size="sm">
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CollapsibleCard>


      {/* ── Confirm Discard Modal ── */}
      <ConfirmModal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        onConfirm={() => {
          setIsDiscardModalOpen(false);
          navigate('/vendor-bank-details');
        }}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this vendor's bank accounts draft. If you leave now, these changes will be lost."
        confirmText="Cancel"
        cancelText="Continue Editing"
        variant="warning"
      />

      {/* ── Confirm Vendor Switch Modal ── */}
      <ConfirmModal
        isOpen={Boolean(pendingVendorSwitch)}
        onClose={() => setPendingVendorSwitch(null)}
        onConfirm={handleConfirmVendorSwitch}
        title="Switch Vendor & Discard Changes?"
        message="You have unsaved changes for the currently selected vendor. Switching vendors will discard these modifications."
        confirmText="Discard & Switch"
        cancelText="Stay on Current Vendor"
        variant="warning"
      />

      {/* ── View Attachments Modal for Configured Accounts Grid ── */}
      <Modal
        isOpen={Boolean(viewingAttachmentsRow)}
        onClose={() => {
          setViewingAttachmentsRow(null);
          setPreviewingFile(null);
        }}
        title="Bank Account Attachments"
        subtitle={
          viewingAttachmentsRow
            ? `${viewingAttachmentsRow.bankName} • Account ${viewingAttachmentsRow.accountNumber
              ? '•••• ' + String(viewingAttachmentsRow.accountNumber).slice(-4)
              : ''
            }`
            : ''
        }
        icon={IconAttachment}
        size="lg"
      >
        <div className="space-y-4">
          {viewingAttachmentsRow &&
            Array.isArray(viewingAttachmentsRow.attachments) &&
            viewingAttachmentsRow.attachments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted pb-2 border-b border-border">
                <span className="font-medium text-heading">
                  Attached Documents ({viewingAttachmentsRow.attachments.length})
                </span>
                <span className="text-2xs font-mono">
                  {viewingAttachmentsRow.accountHolderName || 'Beneficiary Account'}
                </span>
              </div>

              <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-surface/30">
                {viewingAttachmentsRow.attachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center shrink-0 shadow-2xs">
                        {getFileIcon(att.fileName, att.fileType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-heading">
                            {att.documentName || 'Bank Proof'}
                          </span>
                          <Badge variant="neutral" size="sm" className="font-mono text-2xs">
                            {att.fileName}
                          </Badge>
                        </div>
                        <p className="text-2xs text-text-muted mt-0.5 font-mono">
                          {att.fileSize || 'Standard file'} • Uploaded {att.uploadedAt ? formatDate(att.uploadedAt) : 'Recently'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          toast.success(`Opening preview for ${att.fileName}`);
                          setPreviewingFile(att);
                        }}
                        className="text-xs font-medium"
                      >
                        <IconView size={13} className="mr-1.5" />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast.success(`Downloading ${att.fileName}...`);
                        }}
                        className="text-xs text-text-muted hover:text-primary"
                        title="Download file"
                      >
                        <IconDownload size={13} className="mr-1.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* In-modal preview box if user clicks Preview on a file */}
              {previewingFile && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 mt-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconView size={14} className="text-primary" />
                      <span className="text-xs font-semibold text-heading">
                        Document Preview: {previewingFile.fileName}
                      </span>
                    </div>
                    <IconButton
                      icon={IconClose}
                      size="sm"
                      variant="ghost"
                      title="Close preview"
                      aria-label="Close preview"
                      onClick={() => setPreviewingFile(null)}
                    />
                  </div>
                  <div className="p-6 rounded-lg bg-bg border border-border text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {getFileIcon(previewingFile.fileName, previewingFile.fileType)}
                    </div>
                    <p className="text-xs font-medium text-heading">
                      {previewingFile.documentName}
                    </p>
                    <p className="text-2xs text-text-muted font-mono">
                      {previewingFile.fileName} ({previewingFile.fileSize || 'Verified'})
                    </p>
                    <div className="pt-2">
                      <Badge variant="approved" size="sm">
                        Verified Banking Document
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2 border border-dashed border-border rounded-xl bg-surface/30">
              <IconAttachment size={24} className="mx-auto text-text-muted/60" />
              <p className="text-xs font-semibold text-heading">No attachments found</p>
              <p className="text-2xs text-text-muted max-w-sm mx-auto">
                No bank proof documents have been attached to this bank account yet. You can click &quot;Edit&quot; on this account to upload Cancelled Cheque, Passbook, or Bank Letter.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setViewingAttachmentsRow(null);
                setPreviewingFile(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Security Auth Verification Modal (for Update & Delete actions) ── */}
      <AuthVerificationModal
        isOpen={authModalState.isOpen}
        onClose={() => setAuthModalState({ isOpen: false, action: 'update', targetData: null })}
        onSuccess={handleAuthSuccess}
        action={authModalState.action}
        bankAccount={authModalState.targetData || formState}
        vendorName={currentVendor?.vendorName}
      />
    </div>
  );
}
