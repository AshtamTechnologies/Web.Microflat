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
import * as companyService from '../../services/companies/companyService';
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
    routeCompanyId || companies[0]?.id || ''
  );
  const [loadedCompany, setLoadedCompany] = useState(null);
  const [pendingDeleteAttachmentIds, setPendingDeleteAttachmentIds] = useState([]);
  const [lookups, setLookups] = useState({ bankAccountTypes: [], documentTypes: [], countries: [] });

  useEffect(() => {
    if (routeCompanyId) {
      setSelectedCompanyId(routeCompanyId);
    } else if (companies[0]?.id) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [routeCompanyId, companies]);

  const currentCompany = useMemo(() => {
    if (loadedCompany) return loadedCompany;
    if (!selectedCompanyId) return companies[0] || null;
    return (
      (getCompanyById && getCompanyById(selectedCompanyId)) ||
      companies.find((c) => String(c.id) === String(selectedCompanyId)) ||
      companies[0] ||
      null
    );
  }, [loadedCompany, selectedCompanyId, getCompanyById, companies]);

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

  // Attachments modal & upload state
  const [viewingAttachmentsRow, setViewingAttachmentsRow] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('Bank Cancelled Cheque');
  const fileInputRef = useRef(null);

  // Load existing bank accounts and company profile via API on mount / change
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        let comp = null;
        let compId = routeCompanyId || selectedCompanyId;

        // 1. If routeCompanyId or selectedCompanyId is provided, fetch that company: GET /api/companies/{id}
        if (compId) {
          try {
            comp = await companyService.getCompanyById(compId);
          } catch (e) {
            console.warn('Failed to load company profile by ID:', e);
          }
        }

        // 2. If no company loaded yet (e.g. user clicked "Add Bank Details"), call company API and pick first company
        if (!comp) {
          try {
            const res = await companyService.listCompanies({ pageNumber: 1, pageSize: 20 });
            if (res?.items && res.items.length > 0) {
              const firstComp = res.items[0];
              const firstId = firstComp.companyId || firstComp.id;
              try {
                // Fetch full company details
                comp = await companyService.getCompanyById(firstId);
              } catch (e) {
                comp = firstComp;
              }
            }
          } catch (e) {
            console.warn('Failed to fetch companies list:', e);
          }
        }

        if (comp && isMounted) {
          setLoadedCompany(comp);
          setSelectedCompanyId(String(comp.companyId || comp.id));
        }

        // 3. If editing a specific bank account via queryBankId:
        let currentBank = null;
        if (queryBankId) {
          try {
            currentBank = await companyService.getCompanyBankDetailById(queryBankId);
            if (currentBank && isMounted) {
              handleStartEdit({
                ...currentBank,
                confirmAccountNumber: currentBank.accountNumber || '',
              });
              // Also load attachments via GET /api/company-bank-details/{id}/attachments if needed
              let atts = currentBank.attachments || [];
              if (!atts.length) {
                try {
                  const fetchedAtts = await companyService.getBankAttachments(queryBankId);
                  if (fetchedAtts?.length) atts = fetchedAtts;
                } catch (e) {
                  // ignore
                }
              }
              handleFieldChange('attachments', atts);

              // If bank belongs to a specific company, ensure that company is loaded
              if (currentBank.companyId && (!comp || String(comp.companyId || comp.id) !== String(currentBank.companyId))) {
                try {
                  const bankComp = await companyService.getCompanyById(currentBank.companyId);
                  if (bankComp && isMounted) {
                    setLoadedCompany(bankComp);
                    setSelectedCompanyId(String(bankComp.companyId || bankComp.id));
                    comp = bankComp;
                  }
                } catch (e) {}
              }
            }
          } catch (e) {
            console.warn('Failed to fetch bank detail by ID:', e);
          }
        }

        // 4. Fetch the banks according to the company: GET /api/companies/{companyid}/bank-details
        const activeCompId = currentBank?.companyId || comp?.companyId || comp?.id || compId;
        if (activeCompId) {
          try {
            const banks = await companyService.getCompanyBankDetails(activeCompId);
            if (Array.isArray(banks) && isMounted) {
              setDraftRows(banks);
            }
          } catch (e) {
            console.warn('Failed to fetch company bank details:', e);
          }
        }

        // 5. Fetch lookups for Document Types & Account Types: GET /api/companies/lookups
        try {
          const lk = await companyService.getCompanyLookups();
          if (lk && isMounted) {
            setLookups(lk);
          }
        } catch (e) {
          console.warn('Failed to load company lookups:', e);
        }
      } catch (err) {
        console.warn('Failed in initial bank form load:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [queryBankId, routeCompanyId]);

  // Document types for SearchableSelect
  const documentTypeOptions = useMemo(() => {
    if (lookups.documentTypes && lookups.documentTypes.length > 0) {
      return lookups.documentTypes.map((dt) => ({
        value: String(dt.id),
        label: dt.documentTypeName,
      }));
    }
    return BANK_DOCUMENT_TYPE_OPTIONS;
  }, [lookups.documentTypes]);

  // Config for currently selected document type
  const currentDocTypeConfig = useMemo(() => {
    return (lookups.documentTypes || []).find(
      (d) =>
        String(d.id) === String(selectedDocType) ||
        d.documentTypeName?.toLowerCase() === String(selectedDocType).toLowerCase()
    );
  }, [lookups.documentTypes, selectedDocType]);

  // Account types for SearchableSelect
  const accountTypeOptions = useMemo(() => {
    if (lookups.bankAccountTypes && lookups.bankAccountTypes.length > 0) {
      return lookups.bankAccountTypes.map((t) => ({ value: t, label: t }));
    }
    return ACCOUNT_TYPE_OPTIONS;
  }, [lookups.bankAccountTypes]);

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

  // Helper: Upload attachments for a bank account (POST /api/company-bank-details/{id}/attachments)
  const uploadPendingAttachments = async (bankId, attachments) => {
    if (!bankId || !Array.isArray(attachments)) return;
    const newFiles = attachments.filter((a) => a.file);
    for (const newAtt of newFiles) {
      try {
        await companyService.uploadBankAttachment(bankId, {
          documentTypeId: newAtt.documentTypeId || 21,
          documentName: newAtt.documentName,
          documentTitle: newAtt.fileName,
          remarks: newAtt.remarks || '',
          file: newAtt.file,
        });
      } catch (upErr) {
        console.warn('Failed to upload attachment:', upErr);
        toast.error(`Failed to upload ${newAtt.fileName}: ${upErr.message || 'Error'}`);
      }
    }
  };

  // Helper: Delete staged removed attachments (DELETE /api/company-bank-attachments/{id})
  const deletePendingAttachments = async () => {
    if (pendingDeleteAttachmentIds.length > 0) {
      for (const attId of pendingDeleteAttachmentIds) {
        try {
          await companyService.deleteBankAttachment(attId);
        } catch (delErr) {
          console.warn(`Failed to delete attachment ${attId}:`, delErr);
        }
      }
      setPendingDeleteAttachmentIds([]);
    }
  };

  // Action Click Handler: Validates and saves bank details
  const handleFormActionClick = async () => {
    const effectiveCompId = selectedCompanyId || loadedCompany?.companyId || loadedCompany?.id;
    if (!effectiveCompId) {
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
      // ── CREATE NEW BANK ACCOUNT DIRECTLY VIA API ──
      setIsSubmitting(true);
      try {
        const { confirmAccountNumber, ...cleanBank } = formState;

        // 1. POST /api/companies/{companyId}/bank-details
        const created = await companyService.createCompanyBankDetail(effectiveCompId, cleanBank);
        const targetBankId = created?.companyBankDetailId || created?.id;

        // 2. POST /api/company-bank-details/{id}/attachments
        if (targetBankId && formState.attachments?.length) {
          await uploadPendingAttachments(targetBankId, formState.attachments);
        }

        // 3. Refresh bank list: GET /api/companies/{companyid}/bank-details
        const banks = await companyService.getCompanyBankDetails(effectiveCompId);
        if (Array.isArray(banks)) {
          setDraftRows(banks);
        }

        handleCancelEdit();
        toast.success(`Bank account and attachments saved successfully`);
      } catch (err) {
        toast.error(err.message || 'Failed to create bank account');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ── EDIT EXISTING BANK ACCOUNT ──
    // Require security credentials authorization
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
  const handleAuthSuccess = async (authenticatedUser) => {
    const effectiveCompId = selectedCompanyId || loadedCompany?.companyId || loadedCompany?.id;
    if (authModalState.action === 'update') {
      const targetId = editingId || queryBankId;
      const { confirmAccountNumber, ...cleanBank } = formState;

      setIsSubmitting(true);
      try {
        // 1. PUT /api/company-bank-details/{id}
        if (targetId) {
          await companyService.updateCompanyBankDetail(targetId, cleanBank);

          // 2. DELETE staged attachments: DELETE /api/company-bank-attachments/{id}
          await deletePendingAttachments();

          // 3. POST /api/company-bank-details/{id}/attachments
          if (formState.attachments?.length) {
            await uploadPendingAttachments(targetId, formState.attachments);
          }
        }

        // 4. Refresh banks: GET /api/companies/{companyid}/bank-details
        if (effectiveCompId) {
          const banks = await companyService.getCompanyBankDetails(effectiveCompId);
          if (Array.isArray(banks)) {
            setDraftRows(banks);
          }
        }

        handleCancelEdit();
        toast.success(`Bank account and attachments updated successfully`);
      } catch (err) {
        toast.error(err.message || 'Failed to update bank details');
      } finally {
        setIsSubmitting(false);
        setAuthModalState({ isOpen: false, action: 'update', targetData: null });
      }
    } else if (authModalState.action === 'delete') {
      const targetId = authModalState.targetData?.bankDetailId || authModalState.targetData?.id;
      setIsSubmitting(true);
      try {
        if (targetId) {
          await companyService.deleteCompanyBankDetail(targetId);
        }
        if (effectiveCompId) {
          const banks = await companyService.getCompanyBankDetails(effectiveCompId);
          if (Array.isArray(banks)) {
            setDraftRows(banks);
          }
        }
        if (editingId === targetId) {
          handleCancelEdit();
        }
        toast.success(`Bank account deleted successfully`);
      } catch (err) {
        toast.error(err.message || 'Failed to delete bank account');
      } finally {
        setIsSubmitting(false);
        setAuthModalState({ isOpen: false, action: 'delete', targetData: null });
      }
    }
  };

  // Select an account from the grid to edit in the form above
  const handleSelectAccountForEdit = async (row) => {
    const bankId = row.companyBankDetailId || row.bankDetailId || row.id;
    try {
      // Call GET /api/company-bank-details/{id}
      const freshBank = await companyService.getCompanyBankDetailById(bankId);
      let atts = freshBank?.attachments || row.attachments || [];
      if (!atts.length) {
        try {
          const fetchedAtts = await companyService.getBankAttachments(bankId);
          if (fetchedAtts?.length) atts = fetchedAtts;
        } catch (e) {
          // ignore
        }
      }
      handleStartEdit({
        ...(freshBank || row),
        confirmAccountNumber: (freshBank || row).accountNumber || '',
        attachments: atts,
      });
    } catch (e) {
      handleStartEdit({
        ...row,
        confirmAccountNumber: row.accountNumber || '',
      });
    }
    setShowAccountNumber(false);
    setShowConfirmAccountNumber(false);
    const formCard = document.getElementById('company-bank-form-card');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Resolve documentTypeId from lookups
    const matchedDoc = (lookups.documentTypes || []).find(
      (d) =>
        String(d.id) === String(selectedDocType) ||
        d.documentTypeName?.toLowerCase() === String(selectedDocType).toLowerCase()
    );
    const resolvedDocTypeId = matchedDoc?.id || (/^\d+$/.test(String(selectedDocType)) ? Number(selectedDocType) : 21);
    const resolvedDocTypeName = matchedDoc?.documentTypeName || selectedDocType || 'Cancelled Cheque';

    const newAttachments = files.map((file, idx) => ({
      id: `att_${Date.now()}_${idx}`,
      documentTypeId: resolvedDocTypeId,
      documentName: resolvedDocTypeName,
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
    // If it is an existing backend attachment, queue its ID for deletion on save
    const att = (formState.attachments || []).find((a) => a.id === attId || a.companyBankAttachmentId === attId);
    const backendId = att?.companyBankAttachmentId || (typeof att?.id === 'number' ? att.id : (/^\d+$/.test(String(att?.id)) ? Number(att.id) : null));
    if (backendId) {
      setPendingDeleteAttachmentIds((prev) => [...prev, backendId]);
    }
    const updated = (formState.attachments || []).filter((a) => a.id !== attId && a.companyBankAttachmentId !== attId);
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
    const effectiveCompId = selectedCompanyId || loadedCompany?.companyId || loadedCompany?.id;
    if (!effectiveCompId) {
      toast.error('Please select a company first');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeBankId = editingId || queryBankId;
      const hasFormInput = formState.bankName && formState.accountNumber;

      let targetBankId = activeBankId;

      if (hasFormInput) {
        const { confirmAccountNumber, ...cleanBank } = formState;

        if (activeBankId) {
          // PUT /api/company-bank-details/{id}
          await companyService.updateCompanyBankDetail(activeBankId, cleanBank);
          targetBankId = activeBankId;
        } else {
          // POST /api/companies/{companyId}/bank-details
          const created = await companyService.createCompanyBankDetail(effectiveCompId, cleanBank);
          targetBankId = created?.companyBankDetailId || created?.id;
        }

        // 1. Execute DELETE for removed attachments: DELETE /api/company-bank-attachments/{id}
        await deletePendingAttachments();

        // 2. Upload newly added attachments: POST /api/company-bank-details/{id}/attachments
        if (targetBankId && formState.attachments?.length) {
          await uploadPendingAttachments(targetBankId, formState.attachments);
        }
      } else if (draftRows.length > 0 && saveCompanyBanks) {
        await saveCompanyBanks(effectiveCompId, draftRows);
      }

      toast.success('Bank details saved successfully');
      navigate('/company-bank-details');
    } catch (err) {
      toast.error(err.message || 'Failed to save bank details');
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
              disabled={isSubmitting || (!selectedCompanyId && !loadedCompany)}
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
                ? `${currentCompany.companyName} (${currentCompany.companyCode || (currentCompany.companyId ? `COMP-${String(currentCompany.companyId).padStart(3, '0')}` : '') || 'COMP-001'})`
                : '—'
            }
          />
          <DetailField
            label="Authorized Contact Person"
            value={currentCompany?.contactPersonName || '—'}
          />
          <DetailField
            label="Contact Mobile / Email"
            value={
              [
                currentCompany?.contactPersonMobile || currentCompany?.phone1,
                currentCompany?.contactPersonEmail || currentCompany?.companyEmail,
              ]
                .filter(Boolean)
                .join(' • ') || '—'
            }
          />
          <DetailField
            label="City / State / GST"
            value={
              [
                currentCompany?.city,
                currentCompany?.stateName || (getStateName && getStateName(currentCompany?.country, currentCompany?.state)) || currentCompany?.state,
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
              options={accountTypeOptions}
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
            </div>
          </div>

          {/* Upload Controls */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-surface/50 rounded-xl border border-border">
            <div className="w-56">
              <SearchableSelect
                id="doc-type-select"
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                options={documentTypeOptions}
                placeholder="Select document type"
                className="w-full"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept={currentDocTypeConfig?.allowedExtensions || currentDocTypeConfig?.allowedExtensionList?.join(',') || '.pdf,.png,.jpg,.jpeg,.webp'}
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
            <span className="text-3xs text-text-muted">
              Allowed formats:{' '}
              <span className="font-semibold text-heading">
                {currentDocTypeConfig?.allowedExtensions || currentDocTypeConfig?.allowedExtensionList?.join(', ') || '.pdf, .jpg, .jpeg, .png'}
              </span>
              {' '}(Max:{' '}
              <span className="font-semibold text-heading">
                {currentDocTypeConfig?.maxFileSizeMB ? `${currentDocTypeConfig.maxFileSizeMB} MB` : '10 MB'}
              </span>)
            </span>
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
                      <p className="font-semibold text-heading text-xs truncate" title={att.documentTypeName || att.documentName || att.fileName}>
                        {att.documentTypeName || att.documentName || 'Banking Document'}
                      </p>
                      <p className="text-3xs text-text-muted truncate" title={att.fileName}>
                        {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const target = att.downloadUrl || att.companyBankAttachmentId || att.id;
                        if (att.file) {
                          const url = URL.createObjectURL(att.file);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = att.fileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } else if (target) {
                          companyService.downloadBankAttachment(target, att.fileName);
                        }
                      }}
                      className="text-text-muted hover:text-primary p-1 rounded transition-colors"
                      title="Download document"
                    >
                      <IconDownload size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                      title="Remove attachment"
                    >
                      <IconClose size={14} />
                    </button>
                  </div>
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
                  <Th className="text-2xs uppercase text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {draftRows.map((row) => {
                  const rowId = row.bankDetailId || row.id;
                  const isRevealed = Boolean(revealedAccounts[rowId]);
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
                      <p className="font-semibold text-heading text-xs truncate" title={att.documentTypeName || att.documentName || att.fileName}>
                        {att.documentTypeName || att.documentName || 'Banking Document'}
                      </p>
                      <p className="text-2xs text-text-muted truncate" title={att.fileName}>
                        {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
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
