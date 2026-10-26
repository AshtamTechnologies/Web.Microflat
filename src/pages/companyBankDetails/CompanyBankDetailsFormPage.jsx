/**
 * CompanyBankDetailsFormPage.jsx — Add / Edit page for Company Bank Details.
 *
 * Implements:
 *   - Company selector in Add mode / Read-only detail in Edit mode
 *   - Form above, grid below pattern via useRowsEditor
 *   - Security credentials confirmation (AuthVerificationModal) before updating or deleting accounts
 *   - Consistent SearchableSelect for all dropdowns (Company, Account Type, Document Type)
 *   - Optional Attachment uploader (Cancelled cheque, passbook, bank letter) with preview/remove
 *   - Duplicate account guards and inline validation
 *   - Eye icon toggle per row to reveal/hide masked account number
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  IconFileText,
  IconImage,
  IconLock,
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
  StatusSwitch,
  Badge,
  DetailField,
  Modal,
  TableContainer,
  Th,
  PageHeader,
  IconButton,
} from '../../components/ui';

import { useCompanyContext } from '../../context/CompanyContext';
import { useCompanyBankDetails } from '../../context/CompanyBankDetailsContext';
import { useRowsEditor } from '../../hooks/useRowsEditor';
import AuthVerificationModal from './components/AuthVerificationModal';
import {
  ACCOUNT_TYPE_OPTIONS,
  BANK_DOCUMENT_TYPE_OPTIONS,
} from '../../mocks/companyBankDetails';
import { getCountryName, getStateName } from '../../mocks/vendors';
import { formatDate } from '../../utils/dateUtils';

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

function getFileIcon(fileName = '', fileType = '') {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <IconFileText size={18} className="text-danger" />;
  }
  if (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    type.includes('image')
  ) {
    return <IconImage size={18} className="text-info" />;
  }
  return <IconAttachment size={18} className="text-primary" />;
}

export default function CompanyBankDetailsFormPage() {
  const navigate = useNavigate();
  const { companyId: routeCompanyId } = useParams();
  const [searchParams] = useSearchParams();
  const queryBankId = searchParams.get('bank');

  const { companies = [], getCompanyById } = useCompanyContext();
  const {
    getBanksForCompany,
    saveCompanyBanks,
    deleteBankDetail,
    updateBankDetail,
  } = useCompanyBankDetails();

  const isEditMode = Boolean(routeCompanyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company Selection — Bound to the single registered company
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    routeCompanyId || companies[0]?.id || 'COMP-001'
  );

  useEffect(() => {
    if (routeCompanyId) {
      setSelectedCompanyId(routeCompanyId);
    } else if (companies[0]?.id) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [routeCompanyId, companies]);

  const currentCompany = useMemo(() => {
    if (!selectedCompanyId) return companies[0] || null;
    return (
      (getCompanyById && getCompanyById(selectedCompanyId)) ||
      companies.find((c) => String(c.id) === String(selectedCompanyId)) ||
      companies[0] ||
      null
    );
  }, [selectedCompanyId, getCompanyById, companies]);



  // Draft rows for the selected company
  const [draftRows, setDraftRows] = useState([]);
  const [revealedAccounts, setRevealedAccounts] = useState({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showConfirmAccountNumber, setShowConfirmAccountNumber] = useState(false);

  // Security Auth Verification Modal State
  const [authModalState, setAuthModalState] = useState({
    isOpen: false,
    action: 'update', // 'update' | 'delete'
    targetData: null,
  });

  // Attachments modal
  const [viewingAttachmentsRow, setViewingAttachmentsRow] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);

  // Load existing bank accounts when selectedCompanyId changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setDraftRows([]);
      return;
    }
    const banks = getBanksForCompany(selectedCompanyId) || [];
    setDraftRows(banks);
  }, [selectedCompanyId, getBanksForCompany]);

  // If queryBankId was passed, auto-select it for editing
  useEffect(() => {
    if (queryBankId && draftRows.length > 0) {
      const match = draftRows.find(
        (b) => String(b.bankDetailId) === String(queryBankId) || String(b.id) === String(queryBankId)
      );
      if (match) {
        handleStartEdit({
          ...match,
          confirmAccountNumber: match.confirmAccountNumber || match.accountNumber || '',
        });
      }
    }
  }, [queryBankId, draftRows.length]);

  // Company options for SearchableSelect
  const companyOptions = useMemo(() => {
    return companies.map((c) => ({
      value: String(c.id),
      label: `${c.id} – ${c.companyName}`,
    }));
  }, [companies]);

  // Validation function for a bank account row
  const validateBankRow = useCallback(
    (form) => {
      const errors = {};
      const holder = (form.accountHolderName || '').trim();
      const bank = (form.bankName || '').trim();
      const branch = (form.branchName || '').trim();
      const accNum = String(form.accountNumber || '').trim();
      const confirmAccNum = String(form.confirmAccountNumber || '').trim();
      const ifsc = (form.ifscCode || '').trim().toUpperCase();
      const swift = (form.swiftCode || '').trim().toUpperCase();
      const micr = (form.micrCode || '').trim();
      const iban = (form.iban || '').trim();
      const branchAddr = (form.branchAddress || '').trim();
      const rem = (form.remarks || '').trim();

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

      if (!confirmAccNum) {
        errors.confirmAccountNumber = 'Please confirm account number';
      } else if (accNum && confirmAccNum !== accNum) {
        errors.confirmAccountNumber = 'Account numbers do not match';
      }

      // IFSC validation
      if (!ifsc) {
        errors.ifscCode = 'IFSC code is required (e.g. SBIN0001234)';
      } else if (!IFSC_REGEX.test(ifsc)) {
        errors.ifscCode = 'Invalid IFSC format (e.g. SBIN0001234)';
      }

      // SWIFT validation (optional)
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

      if (branchAddr && branchAddr.length > 250) {
        errors.branchAddress = 'Max 250 characters';
      }

      if (rem && rem.length > 250) {
        errors.remarks = 'Max 250 characters';
      }

      if (!form.accountType) {
        errors.accountType = 'Account type is required';
      }

      // Duplicate guard: same account number + IFSC cannot appear twice for same company
      const currentEditingId = form.bankDetailId || form.id;
      const isDuplicate = draftRows.some((r) => {
        const otherId = r.bankDetailId || r.id;
        if (currentEditingId && otherId === currentEditingId) return false;

        const sameAcc = String(r.accountNumber || '').trim() === accNum;
        const sameIfsc = (r.ifscCode || '').trim().toUpperCase() === ifsc && ifsc.length > 0;
        return sameAcc && sameIfsc;
      });

      if (isDuplicate) {
        errors.accountNumber = 'This account already exists for this company. Edit it instead.';
      }

      return errors;
    },
    [draftRows]
  );

  const {
    formState,
    setFormState,
    handleFieldChange,
    fieldErrors,
    setFieldErrors,
    editingId,
    isEditing,
    handleStartEdit,
    handleCancelEdit,
  } = useRowsEditor({
    rows: draftRows,
    onChange: setDraftRows,
    initialFormValues: INITIAL_BANK_FORM,
    idField: 'bankDetailId',
    rowName: 'Bank Account',
    validateRow: validateBankRow,
  });

  // Auto-fill account holder name with registered company name when form is blank
  useEffect(() => {
    if (!isEditing && currentCompany?.companyName && !formState.accountHolderName) {
      handleFieldChange('accountHolderName', currentCompany.companyName);
    }
  }, [currentCompany, isEditing, formState.accountHolderName, handleFieldChange]);

  // Action Click Handler: Validates and saves bank details
  const handleFormActionClick = () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }

    const errors = validateBankRow(formState);
    if (errors && Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErr = Object.values(errors)[0];
      toast.error(firstErr || 'Please check the form for errors');
      return;
    }
    setFieldErrors({});

    if (!isEditing) {
      // Adding new record: can add to list directly
      const newId = `cbd_${Date.now()}`;
      const { confirmAccountNumber, ...cleanBank } = formState;
      const newRow = {
        ...cleanBank,
        bankDetailId: newId,
        id: newId,
        companyId: selectedCompanyId,
        companyName: currentCompany?.companyName,
        createdAt: new Date().toISOString(),
        createdBy: 'Ian Chesnut',
        updatedAt: null,
      };

      const nextRows = [...draftRows, newRow];
      setDraftRows(nextRows);

      if (saveCompanyBanks) {
        saveCompanyBanks(selectedCompanyId, nextRows);
      }
      handleCancelEdit();
      toast.success(`Bank account for ${formState.bankName || 'company'} added to list`);
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

  // Callback on successful authentication (for Update or Delete)
  const handleAuthSuccess = (authenticatedUser) => {
    if (authModalState.action === 'update') {
      const targetId = editingId;
      const { confirmAccountNumber, ...cleanBank } = formState;

      const nextRows = draftRows.map((r) => {
        if (r.bankDetailId === targetId || r.id === targetId) {
          return {
            ...r,
            ...cleanBank,
            updatedAt: new Date().toISOString(),
            updatedBy: authenticatedUser.name,
          };
        }
        return r;
      });

      setDraftRows(nextRows);
      if (saveCompanyBanks) {
        saveCompanyBanks(selectedCompanyId, nextRows, authenticatedUser);
      }
      handleCancelEdit();
    } else if (authModalState.action === 'delete') {
      const targetId = authModalState.targetData?.bankDetailId || authModalState.targetData?.id;
      const nextRows = draftRows.filter(
        (r) => r.bankDetailId !== targetId && r.id !== targetId
      );
      setDraftRows(nextRows);

      if (deleteBankDetail) {
        deleteBankDetail(targetId, authenticatedUser);
      }
      if (editingId === targetId) {
        handleCancelEdit();
      }
    }

    setAuthModalState({ isOpen: false, action: 'update', targetData: null });
  };

  // Select an account from the grid to edit in the form above
  const handleSelectAccountForEdit = (row) => {
    handleStartEdit({
      ...row,
      confirmAccountNumber: row.confirmAccountNumber || row.accountNumber || '',
    });
    setShowAccountNumber(false);
    setShowConfirmAccountNumber(false);
    const formCard = document.getElementById('company-bank-form-card');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // File upload state for attachments
  const [selectedDocType, setSelectedDocType] = useState('Bank Cancelled Cheque');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAttachments = files.map((file, idx) => ({
      id: `att_${Date.now()}_${idx}`,
      documentName: selectedDocType,
      fileName: file.name,
      fileSize: `${Math.round(file.size / 1024)} KB`,
      fileType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString().split('T')[0],
      file,
    }));

    handleFieldChange('attachments', [...(formState.attachments || []), ...newAttachments]);
    toast.success(`Attached ${files.length} document(s)`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (attId) => {
    const updated = (formState.attachments || []).filter((a) => a.id !== attId);
    handleFieldChange('attachments', updated);
  };

  const toggleRevealGridAccount = (id, e) => {
    if (e) e.stopPropagation();
    setRevealedAccounts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskAccount = (num, revealed) => {
    if (!num) return '—';
    if (revealed) return num;
    const str = String(num);
    return `•••• ${str.slice(-4)}`;
  };

  // Master submit
  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }

    setIsSubmitting(true);
    try {
      if (saveCompanyBanks) {
        await saveCompanyBanks(selectedCompanyId, draftRows);
      }
      toast.success('Bank details saved');
      navigate('/company-bank-details');
    } catch (err) {
      toast.error('Failed to save bank details');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Back / Cancel handler
  const handleCancel = () => {
    navigate('/company-bank-details');
  };

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Page Header ── */}
      <PageHeader
        title={isEditMode ? 'Edit Bank Details' : 'Add Bank Details'}
        subtitle="Manage corporate bank accounts, payment routes, and IFSC codes for company settlements"
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
              disabled={isSubmitting || !selectedCompanyId}
              size="sm"
            >
              {isEditMode ? 'Save Changes' : 'Save Bank Account'}
            </SaveButton>
          </div>
        }
      />

      {/* ── Company Information Card ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IconBuilding2 size={17} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-heading">Company Information</h3>
            <p className="text-2xs text-text-muted">
              Registered corporate profile for which multiple bank accounts and payment routes are configured
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DetailField
            label="Company Name"
            value={
              currentCompany
                ? `${currentCompany.companyName} (${currentCompany.id})`
                : 'Micro-Flat Datasoft Pvt. Ltd. (COMP-001)'
            }
          />
          <DetailField
            label="Authorized Contact Person"
            value={currentCompany?.contactPersonName || 'Krupal Bhoi'}
          />
          <DetailField
            label="Contact Mobile / Email"
            value={
              [currentCompany?.contactPersonMobile, currentCompany?.contactPersonEmail]
                .filter(Boolean)
                .join(' • ') || '—'
            }
          />
          <DetailField
            label="City / State / GST"
            value={
              [
                currentCompany?.city,
                getStateName(currentCompany?.country, currentCompany?.state) || currentCompany?.state,
                currentCompany?.gstNo ? `GST: ${currentCompany.gstNo}` : '',
              ]
                .filter(Boolean)
                .join(', ') || '—'
            }
          />
        </div>
      </Card>

      {/* ── Bank Account Form Card ── */}
      <Card id="company-bank-form-card" padding="md" className="space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconBankDetails size={17} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-heading">
                {isEditing ? 'Edit Bank Account Details' : 'Add New Bank Account'}
              </h3>
              <p className="text-2xs text-text-muted">
                {isEditing
                  ? 'Update banking details and verify authorization before saving'
                  : 'Enter primary account routing and account details'}
              </p>
            </div>
          </div>

          {isEditing && (
            <Badge variant="warning" className="text-xs">
              Editing Mode
            </Badge>
          )}
        </div>

        {/* 1. Primary Banking Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Account Holder Name */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Account Holder Name <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={formState.accountHolderName}
              onChange={(e) => handleFieldChange('accountHolderName', e.target.value)}
              placeholder="e.g. Micro-Flat Datums Pvt. Ltd."
              className="w-full text-xs"
            />
            {fieldErrors.accountHolderName && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.accountHolderName}</p>
            )}
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Bank Name <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={formState.bankName}
              onChange={(e) => handleFieldChange('bankName', e.target.value)}
              placeholder="e.g. State Bank of India"
              className="w-full text-xs"
            />
            {fieldErrors.bankName && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.bankName}</p>
            )}
          </div>

          {/* Branch Name */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Branch Name <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={formState.branchName}
              onChange={(e) => handleFieldChange('branchName', e.target.value)}
              placeholder="e.g. Industrial Estate, Vadodara"
              className="w-full text-xs"
            />
            {fieldErrors.branchName && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.branchName}</p>
            )}
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Account Type <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              id="account-type-select"
              value={formState.accountType}
              onChange={(e) => handleFieldChange('accountType', e.target.value)}
              options={ACCOUNT_TYPE_OPTIONS}
              placeholder="Select account type"
              className="w-full"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Account Number <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Input
                type={showAccountNumber ? 'text' : 'password'}
                value={formState.accountNumber}
                onChange={(e) => handleFieldChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6 to 20 digit account number"
                className="w-full font-mono text-xs pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAccountNumber((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-heading"
                tabIndex={-1}
              >
                {showAccountNumber ? <IconEyeOff size={15} /> : <IconView size={15} />}
              </button>
            </div>
            {fieldErrors.accountNumber && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.accountNumber}</p>
            )}
          </div>

          {/* Confirm Account Number */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Confirm Account Number <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Input
                type={showConfirmAccountNumber ? 'text' : 'password'}
                value={formState.confirmAccountNumber}
                onChange={(e) =>
                  handleFieldChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))
                }
                placeholder="Re-enter account number"
                className="w-full font-mono text-xs pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmAccountNumber((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-heading"
                tabIndex={-1}
              >
                {showConfirmAccountNumber ? <IconEyeOff size={15} /> : <IconView size={15} />}
              </button>
            </div>
            {fieldErrors.confirmAccountNumber && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.confirmAccountNumber}</p>
            )}
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              IFSC Code <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={formState.ifscCode}
              onChange={(e) =>
                handleFieldChange('ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              maxLength={11}
              placeholder="e.g. SBIN0001234"
              className="w-full font-mono text-xs uppercase"
            />
            {fieldErrors.ifscCode && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.ifscCode}</p>
            )}
          </div>

          {/* SWIFT Code */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              SWIFT / BIC Code (Optional)
            </label>
            <Input
              type="text"
              value={formState.swiftCode}
              onChange={(e) =>
                handleFieldChange('swiftCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              maxLength={11}
              placeholder="e.g. SBININBB012"
              className="w-full font-mono text-xs uppercase"
            />
            {fieldErrors.swiftCode && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.swiftCode}</p>
            )}
          </div>

          {/* MICR Code */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              MICR Code (Optional)
            </label>
            <Input
              type="text"
              value={formState.micrCode}
              onChange={(e) => handleFieldChange('micrCode', e.target.value.replace(/\D/g, ''))}
              maxLength={9}
              placeholder="e.g. 390002005"
              className="w-full font-mono text-xs"
            />
            {fieldErrors.micrCode && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.micrCode}</p>
            )}
          </div>

          {/* IBAN */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              IBAN (Optional)
            </label>
            <Input
              type="text"
              value={formState.iban}
              onChange={(e) =>
                handleFieldChange('iban', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              maxLength={34}
              placeholder="e.g. GB29NWBK60161331926819"
              className="w-full font-mono text-xs uppercase"
            />
            {fieldErrors.iban && (
              <p className="text-2xs text-danger mt-1">{fieldErrors.iban}</p>
            )}
          </div>

          {/* Active Status */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1" htmlFor="bank-active-switch">
              Account Status
            </label>
            <div className="pt-1.5 flex items-center">
              <StatusSwitch
                id="bank-active-switch"
                checked={Boolean(formState.isActive)}
                onChange={(checked) => handleFieldChange('isActive', Boolean(checked))}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* 2. Branch Address & Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Branch Address
            </label>
            <textarea
              rows={2}
              value={formState.branchAddress}
              onChange={(e) => handleFieldChange('branchAddress', e.target.value)}
              placeholder="e.g. GIDC Industrial Estate, Makarpura, Vadodara 390010"
              className="w-full p-2.5 rounded-lg border border-border bg-bg text-xs text-heading focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Remarks / Purpose
            </label>
            <textarea
              rows={2}
              value={formState.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              placeholder="e.g. Primary operational account for vendor disbursements"
              className="w-full p-2.5 rounded-lg border border-border bg-bg text-xs text-heading focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* 3. Supporting Banking Documents / Attachments */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-heading flex items-center gap-1.5">
                <IconAttachment size={14} className="text-primary" />
                Supporting Banking Documents
              </h4>
              <p className="text-3xs text-text-muted">
                Upload cancelled cheque, bank confirmation letter, or mandate form (PDF, PNG, JPG)
              </p>
            </div>
          </div>

          {/* Upload Controls */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-surface/50 rounded-xl border border-border">
            <div className="w-56">
              <SearchableSelect
                id="doc-type-select"
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                options={BANK_DOCUMENT_TYPE_OPTIONS}
                placeholder="Select document type"
                className="w-full"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              multiple
              className="hidden"
              id="bank-file-upload-input"
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={IconUpload}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              Choose Document
            </Button>
            <span className="text-3xs text-text-muted">Max file size 10 MB per document</span>
          </div>

          {/* List of Attached Files */}
          {Array.isArray(formState.attachments) && formState.attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {formState.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface border border-border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(att.fileName, att.fileType)}
                    <div className="min-w-0">
                      <p className="font-medium text-heading text-2xs truncate" title={att.fileName}>
                        {att.fileName}
                      </p>
                      <p className="text-3xs text-text-muted">
                        {att.documentName} • {att.fileSize}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="text-text-muted hover:text-danger p-1 rounded transition-colors shrink-0"
                    title="Remove attachment"
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
          <CancelButton
            size="sm"
            onClick={isEditing ? handleCancelEdit : handleCancel}
            className="text-xs shadow-2xs"
          />
          <SaveButton
            type="button"
            size="sm"
            onClick={handleFormActionClick}
            disabled={isSubmitting || !selectedCompanyId}
            loading={isSubmitting}
            loadingText="Saving..."
            title={!selectedCompanyId ? 'Please select a company first' : undefined}
            className="text-xs font-semibold shadow-2xs"
          >
            {isEditing ? 'Save Changes' : 'Save Changes'}
          </SaveButton>
        </div>
      </Card>

      {/* ── Configured Accounts Table for Company ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconBankDetails size={17} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-heading">
                Configured Bank Accounts for {currentCompany?.companyName || 'Company'}
              </h3>
              <p className="text-2xs text-text-muted">
                {draftRows.length} account(s) registered for this company
              </p>
            </div>
          </div>
        </div>

        {draftRows.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            No bank accounts configured for this company yet. Fill out the form above to add an account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <Th className="text-2xs uppercase">Bank & Branch</Th>
                  <Th className="text-2xs uppercase">Account No.</Th>
                  <Th className="text-2xs uppercase">IFSC / SWIFT</Th>
                  <Th className="text-2xs uppercase">Type</Th>
                  <Th className="text-2xs uppercase">Status</Th>
                  <Th className="text-2xs uppercase">Attachments</Th>
                  <Th className="text-2xs uppercase text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {draftRows.map((row) => {
                  const rowId = row.bankDetailId || row.id;
                  const isRevealed = Boolean(revealedAccounts[rowId]);
                  const attCount = Array.isArray(row.attachments) ? row.attachments.length : 0;
                  const isCurEditing = editingId === rowId;

                  return (
                    <tr
                      key={rowId}
                      className={`hover:bg-surface/40 transition-colors ${
                        isCurEditing ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 text-xs">
                        <span className="font-semibold text-heading block">{row.bankName}</span>
                        <span className="text-2xs text-text-muted block">{row.branchName || '—'}</span>
                      </td>

                      <td className="px-3 py-2.5 text-xs">
                        <div className="flex items-center gap-1.5 font-mono font-medium text-heading">
                          <span>{maskAccount(row.accountNumber, isRevealed)}</span>
                          <button
                            type="button"
                            onClick={(e) => toggleRevealGridAccount(rowId, e)}
                            className="text-text-muted hover:text-heading p-0.5 rounded transition-colors"
                            title={isRevealed ? 'Hide account number' : 'Reveal account number'}
                          >
                            {isRevealed ? <IconEyeOff size={13} /> : <IconView size={13} />}
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-xs font-mono">
                        {row.ifscCode ? (
                          <span className="px-2 py-0.5 rounded bg-surface border border-border text-heading text-2xs font-semibold">
                            {row.ifscCode}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-xs">
                        <Badge variant="neutral" size="sm">
                          {row.accountType || 'Current'}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5 text-xs">
                        <Badge variant={row.isActive ? 'active' : 'inactive'} size="sm">
                          {row.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5 text-xs">
                        {attCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setViewingAttachmentsRow(row)}
                            className="inline-flex items-center gap-1 text-2xs text-primary hover:underline font-medium"
                          >
                            <IconAttachment size={13} />
                            {attCount} file(s)
                          </button>
                        ) : (
                          <span className="text-text-muted text-2xs">0 files</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-xs text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSelectAccountForEdit(row)}
                            title="Edit this account"
                            className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface"
                          >
                            <IconEdit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePromptDeleteAccount(row)}
                            title="Delete this account (requires login)"
                            className="h-7 w-7 text-text-muted hover:text-danger hover:bg-danger/10"
                          >
                            <IconDelete size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>



      {/* ── View Attachments Modal ── */}
      <Modal
        isOpen={Boolean(viewingAttachmentsRow)}
        onClose={() => {
          setViewingAttachmentsRow(null);
          setPreviewingFile(null);
        }}
        title={`Supporting Documents — ${viewingAttachmentsRow?.bankName || 'Bank Account'}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {Array.isArray(viewingAttachmentsRow?.attachments) &&
          viewingAttachmentsRow.attachments.length > 0 ? (
            <div className="space-y-2">
              {viewingAttachmentsRow.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(att.fileName, att.fileType)}
                    <div className="min-w-0">
                      <p className="font-semibold text-heading text-xs truncate">
                        {att.fileName}
                      </p>
                      <p className="text-2xs text-text-muted">
                        {att.documentName} • {att.fileSize}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary"
                      onClick={() => setPreviewingFile(att)}
                      title="Preview document"
                    >
                      <IconView size={15} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-6">
              No documents attached to this account.
            </p>
          )}

          {previewingFile && (
            <div className="p-4 bg-bg rounded-lg border border-border text-center">
              <p className="text-xs font-semibold text-heading mb-2">
                Preview: {previewingFile.fileName}
              </p>
              <div className="w-16 h-16 mx-auto mb-2 text-primary flex items-center justify-center bg-primary/10 rounded-full">
                {getFileIcon(previewingFile.fileName, previewingFile.fileType)}
              </div>
              <p className="text-2xs text-text-muted">
                {previewingFile.documentName} • {previewingFile.fileSize}
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
        companyName={currentCompany?.companyName}
      />
    </div>
  );
}
