/**
 * VendorFormPage — Full-page Add and Edit vendor form for MicroFlat ERP.
 *
 * Route: /vendors/new (Add mode) & /vendors/:id/edit (Edit mode)
 * Grouped sections inside Cards:
 *   1. Vendor Master Details (VendorCode, VendorName, EffectiveDate, Account Status)
 *   2. Contact Information (ContactPersonName, Email, PhoneNo, AlternatePhoneNo, GSTIN, Website)
 *   3. Address & Location (CountryId, StateId [cascading], City, ZipCode, Address1, Address2)
 *   4. Procurement & Quality Notes
 *   5. Attachments & Supporting Documents
 *   6. [Edit Mode Only] System-Managed Approval & Audit Info
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  IconAttachment,
  IconBack,
  IconBankDetails,
  IconBuilding2,
  IconClose,
  IconContact,
  IconDelete,
  IconDownload,
  IconError,
  IconExternalLink,
  IconFileText,
  IconImage,
  IconLocation,
  IconSave,
  IconShieldCheck,
  IconUpload,
  IconVendor,
  IconView,
} from '../../constants/icons';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  DatePicker,
  SearchableSelect,
  StatusSwitch,
  Badge,
  Card,
  CollapsibleCard,
  Modal,
  PageHeader,
  Textarea,
  IconButton,
  FormActionsBar,
  PaymentTermsSelect,
  DeliveryTermsSelect,
} from '../../components/ui';
import { formatDate, getTodayISO } from '../../utils/dateUtils';
import { useVendorsContext } from '../../context/VendorsContext';
import { ApprovalStatus, ApprovalStatusLabel, getApprovalStatusLabel, getApprovalBadgeVariant, normalizeApprovalStatus } from '../../constants/approvalStatus';
import { vendorService } from '../../services';
import { useCountryState } from '../../context/CountryStateContext';
import {
  getTodayIsoDate,
} from '../../utils/effectiveDateUtils';
import { isHtmlMarkup } from '../../utils/htmlUtils';
import VendorBankDetailsFormPage from '../vendorBankDetails/VendorBankDetailsFormPage';



const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

function isAllowedFile(file) {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();
  const hasValidExt = ALLOWED_FILE_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidMime = type === 'application/pdf' || type.startsWith('image/');
  return hasValidExt || hasValidMime;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileName = '', fileType = '') {
  const name = fileName.toLowerCase();
  const type = fileType.toLowerCase();

  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <IconFileText size={18} className="text-danger shrink-0" />;
  }
  return <IconImage size={18} className="text-primary shrink-0" />;
}

const INITIAL_FORM = {
  vendorCode: '',
  effectiveDate: getTodayISO(),
  vendorName: '',
  vendorCategory: '',
  ledgerName: '',
  group: '',
  subGroup: '',
  contactPersonName: '',
  phoneNo: '',
  alternatePhoneNo: '',
  email: '',
  ccEmail: '',
  gstNo: '',
  panNo: '',
  cin: '',
  udhyamNo: '',
  msmeType: '',
  msmeActivity: '',
  website: '',
  countryId: '',
  stateId: '',
  city: '',
  zipCode: '',
  address1: '',
  address2: '',
  paymentTerms: [],
  deliveryTerms: [],
  notes: '',
  attachments: [],
  isActive: true,
  inactiveComment: '',
};

export const ACCOUNTING_GROUP_OPTIONS = [
  { value: '', label: 'Select Group...' },
  { value: 'Sundry Creditors', label: 'Sundry Creditors' },
  { value: 'Sundry Debtors', label: 'Sundry Debtors' },
];

export const SUB_GROUP_OPTIONS_MAP = {
  'Sundry Creditors': [
    { value: '', label: 'Select Sub-Group...' },
    { value: 'SUNDRY CREDITORS GOODS', label: 'SUNDRY CREDITORS GOODS' },
    { value: 'SUNDRY CREDITORS SERVICES', label: 'SUNDRY CREDITORS SERVICES' },
    { value: 'SUNDRY CREDITORS EXPENSES', label: 'SUNDRY CREDITORS EXPENSES' },
    { value: 'SUNDRY CREDITORS - DOMESTIC', label: 'SUNDRY CREDITORS - DOMESTIC' },
    { value: 'SUNDRY CREDITORS - IMPORT', label: 'SUNDRY CREDITORS - IMPORT' },
  ],
  'Sundry Debtors': [
    { value: '', label: 'Select Sub-Group...' },
    { value: 'SUNDRY DEBTORS - DOMESTIC', label: 'SUNDRY DEBTORS - DOMESTIC' },
    { value: 'SUNDRY DEBTORS - EXPORT', label: 'SUNDRY DEBTORS - EXPORT' },
    { value: 'SUNDRY DEBTORS GOODS', label: 'SUNDRY DEBTORS GOODS' },
    { value: 'SUNDRY DEBTORS SERVICES', label: 'SUNDRY DEBTORS SERVICES' },
  ],
};

export const DEFAULT_SUB_GROUP_OPTIONS = [
  { value: '', label: 'Select Sub-Group...' },
  { value: 'SUNDRY CREDITORS GOODS', label: 'SUNDRY CREDITORS GOODS' },
  { value: 'SUNDRY CREDITORS SERVICES', label: 'SUNDRY CREDITORS SERVICES' },
  { value: 'SUNDRY DEBTORS - DOMESTIC', label: 'SUNDRY DEBTORS - DOMESTIC' },
  { value: 'SUNDRY DEBTORS - EXPORT', label: 'SUNDRY DEBTORS - EXPORT' },
];

const NA_PLACEHOLDER = 'Not Available';
const cleanPlaceholder = (v) => (v === NA_PLACEHOLDER ? '' : (v ?? ''));

function validateField(name, value, currentForm = {}) {
  const str = typeof value === 'string' ? value.trim() : '';

  switch (name) {
    case 'vendorCode':
      // Backend automatically assigns sequential codes like VEN-0001
      return '';
    case 'vendorName':
      if (!str) return 'Vendor name is required.';
      return '';
    case 'vendorCategory':
      return '';
    case 'ledgerName':
      if (str && str.length > 200) return 'Ledger name must be at most 200 characters.';
      return '';
    case 'group':
      if (str && str.length > 50) return 'Group must be at most 50 characters.';
      return '';
    case 'subGroup':
      if (str && str.length > 50) return 'Sub-group must be at most 50 characters.';
      return '';
    case 'effectiveDate':
      if (!str) return 'Effective date is required.';
      return '';
    case 'contactPersonName':
      if (!str) return 'Contact person name is required.';
      return '';
    case 'phoneNo':
      if (!str) return 'Phone number is required.';
      if (!/^\d+$/.test(str)) return 'Phone number must contain digits only.';
      if (str.length < 10) return 'Phone number must be at least 10 digits.';
      return '';
    case 'alternatePhoneNo':
      if (str) {
        if (!/^\d+$/.test(str)) return 'Alternate phone must contain digits only.';
        if (str.length < 10) return 'Alternate phone must be at least 10 digits.';
      }
      return '';
    case 'email':
      if (!str) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
        return 'Enter a valid email address.';
      return '';
    case 'ccEmail':
      if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
        return 'Enter a valid CC email address.';
      return '';
    case 'gstNo':
      if (str && str.length > 0 && str.length !== 15) {
        return 'GST number must be 15 alphanumeric characters.';
      }
      return '';
    case 'panNo':
      if (str && str.length > 0 && str.length !== 10) {
        return 'PAN must be 10 alphanumeric characters.';
      }
      return '';
    case 'cin':
      if (str && str.length > 0 && str.length !== 21) {
        return 'CIN must be 21 characters.';
      }
      return '';
    case 'website':
      if (str && !/^https?:\/\/.+/i.test(str) && !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(str)) {
        return 'Enter a valid URL (e.g. https://www.company.com).';
      }
      return '';
    case 'countryId':
      if (!value) return 'Country is required.';
      return '';
    case 'stateId':
      if (!value) return 'State is required.';
      return '';
    case 'city':
      if (!str) return 'City is required.';
      return '';
    case 'zipCode':
      if (!str) return 'Postal / Zip code is required.';
      if (!/^\d+$/.test(str)) return 'Zip code must contain digits only.';
      return '';
    case 'address1':
      if (!str) return 'Address Line 1 is required.';
      return '';
    case 'inactiveComment':
      if (currentForm.isActive === false && !str) {
        return 'Inactive comment is compulsory when vendor is marked inactive.';
      }
      return '';
    default:
      return '';
  }
}

function validateAll(form) {
  const errors = {};
  const requiredFields = [
    'vendorName',
    'effectiveDate',
    'contactPersonName',
    'phoneNo',
    'email',
    'countryId',
    'stateId',
    'city',
    'zipCode',
    'address1',
  ];

  requiredFields.forEach((field) => {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  });

  if (form.alternatePhoneNo) {
    const err = validateField('alternatePhoneNo', form.alternatePhoneNo);
    if (err) errors.alternatePhoneNo = err;
  }
  if (form.ccEmail) {
    const err = validateField('ccEmail', form.ccEmail);
    if (err) errors.ccEmail = err;
  }
  if (form.gstNo) {
    const err = validateField('gstNo', form.gstNo);
    if (err) errors.gstNo = err;
  }
  if (form.panNo) {
    const err = validateField('panNo', form.panNo);
    if (err) errors.panNo = err;
  }
  if (form.cin) {
    const err = validateField('cin', form.cin);
    if (err) errors.cin = err;
  }
  if (form.website) {
    const err = validateField('website', form.website, form);
    if (err) errors.website = err;
  }

  if (!form.isActive) {
    if (!form.inactiveComment || !form.inactiveComment.trim()) {
      errors.inactiveComment = 'Inactive comment is compulsory when vendor is marked inactive.';
    }
  }

  return errors;
}

export default function VendorFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'bank' ? 'bank' : 'details';

  const {
    getVendorById,
    getNextVendorCode,
    createVendor,
    updateVendor,
    fetchVendorDetail,
  } = useVendorsContext();

  const [fetchedVendor, setFetchedVendor] = useState(null);
  const [fetchingVendor, setFetchingVendor] = useState(Boolean(isEdit));

  useEffect(() => {
    let isMounted = true;
    if (isEdit && id) {
      const cached = getVendorById(id);
      if (cached) {
        setFetchedVendor(cached);
      }
      if (fetchVendorDetail) {
        setFetchingVendor(true);
        fetchVendorDetail(id)
          .then((v) => {
            if (isMounted && v) {
              setFetchedVendor(v);
            }
          })
          .catch((err) => console.warn('Could not fetch full vendor details:', err))
          .finally(() => {
            if (isMounted) setFetchingVendor(false);
          });
      } else {
        setFetchingVendor(false);
      }
    } else {
      setFetchingVendor(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isEdit, id, fetchVendorDetail, getVendorById]);

  const existingVendor = useMemo(() => {
    return isEdit ? (fetchedVendor || getVendorById(id)) : null;
  }, [isEdit, id, fetchedVendor, getVendorById]);

  const [form, setForm] = useState(INITIAL_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAuditCollapsed, setIsAuditCollapsed] = useState(true);

  // Attachment upload helper state
  const [selectedDocType, setSelectedDocType] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);
  const [apiDocTypes, setApiDocTypes] = useState([]);
  const [vendorCategories, setVendorCategories] = useState(['Goods', 'Services', 'Others']);
  const [msmeTypes, setMsmeTypes] = useState(['Micro', 'Small', 'Medium']);
  const [msmeActivities, setMsmeActivities] = useState(['Manufacturing', 'Traders', 'Services']);

  // Fetch active Document Types and lookups from GET /api/vendors/lookups
  useEffect(() => {
    let isMounted = true;
    vendorService
      .getVendorLookups()
      .then((data) => {
        if (isMounted) {
          if (data?.documentTypes && Array.isArray(data.documentTypes)) {
            const activeOnly = data.documentTypes.filter(
              (dt) => dt.isActive === true || dt.isActive === 'true'
            );
            setApiDocTypes(activeOnly);
          }
          if (data?.vendorCategories && Array.isArray(data.vendorCategories)) {
            setVendorCategories(data.vendorCategories);
          }
          if (data?.msmeTypes && Array.isArray(data.msmeTypes)) {
            setMsmeTypes(data.msmeTypes);
          }
          if (data?.msmeActivities && Array.isArray(data.msmeActivities)) {
            setMsmeActivities(data.msmeActivities);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch vendor lookups:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const vendorCategoryOptions = useMemo(() => [
    { value: '', label: 'Select Category...' },
    ...vendorCategories.map((c) => ({ value: c, label: c })),
  ], [vendorCategories]);

  const msmeTypeOptions = useMemo(() => [
    { value: '', label: 'Select MSME Type (Optional)...' },
    ...msmeTypes.map((t) => ({ value: t, label: t })),
  ], [msmeTypes]);

  const msmeActivityOptions = useMemo(() => [
    { value: '', label: 'Select MSME Activity (Optional)...' },
    ...msmeActivities.map((a) => ({ value: a, label: a })),
  ], [msmeActivities]);

  const subGroupOptions = useMemo(() => {
    if (form.group && SUB_GROUP_OPTIONS_MAP[form.group]) {
      return SUB_GROUP_OPTIONS_MAP[form.group];
    }
    return [];
  }, [form.group]);

  const documentTypeOptions = useMemo(() => {
    if (apiDocTypes && apiDocTypes.length > 0) {
      return apiDocTypes.map((dt) => ({
        value: dt.documentTypeName || dt.typeName,
        label: dt.documentTypeName || dt.typeName,
        id: dt.id || dt.documentTypeId,
        allowedExtensions: dt.allowedExtensions,
        allowedExtensionList: dt.allowedExtensionList,
        maxFileSizeMB: dt.maxFileSizeMB,
      }));
    }
    return [];
  }, [apiDocTypes]);

  const currentDocTypeConfig = useMemo(() => {
    if (!selectedDocType) return null;
    return (
      apiDocTypes.find(
        (dt) => (dt.documentTypeName || dt.typeName) === selectedDocType
      ) || null
    );
  }, [selectedDocType, apiDocTypes]);

  const acceptExtensions = useMemo(() => {
    if (currentDocTypeConfig?.allowedExtensions) {
      return currentDocTypeConfig.allowedExtensions;
    }
    if (
      Array.isArray(currentDocTypeConfig?.allowedExtensionList) &&
      currentDocTypeConfig.allowedExtensionList.length > 0
    ) {
      return currentDocTypeConfig.allowedExtensionList.join(',');
    }
    return '.pdf,.png,.jpg,.jpeg,.webp';
  }, [currentDocTypeConfig]);

  const maxFileSizeMB = currentDocTypeConfig?.maxFileSizeMB || 10;

  const initializedIdRef = useRef(null);

  // Initialize form state once per record / route
  useEffect(() => {
    if (isEdit) {
      if (existingVendor && initializedIdRef.current !== id) {
        initializedIdRef.current = id;
        const data = {
          vendorCode: existingVendor.vendorCode || '',
          effectiveDate: existingVendor.effectiveDate || getTodayIsoDate(),
          vendorName: existingVendor.vendorName || '',
          vendorCategory: existingVendor.vendorCategory || '',
          ledgerName: existingVendor.ledgerName || existingVendor.tallyLedgerName || '',
          group: existingVendor.group || existingVendor.tallyGroup || '',
          subGroup: existingVendor.subGroup || existingVendor.tallySubGroup || '',
          contactPersonName: cleanPlaceholder(existingVendor.contactPersonName),
          phoneNo: existingVendor.phoneNo || '',
          alternatePhoneNo: existingVendor.alternatePhoneNo || '',
          email: existingVendor.email || '',
          ccEmail: existingVendor.ccEmail || '',
          gstNo: existingVendor.gstNo || '',
          panNo: existingVendor.panNo || '',
          cin: existingVendor.cin || '',
          udhyamNo: existingVendor.udhyamNo || '',
          msmeType: existingVendor.msmeType || '',
          msmeActivity: existingVendor.msmeActivity || '',
          website: existingVendor.website || '',
          countryId: existingVendor.countryId || '',
          stateId: existingVendor.stateId || '',
          city: cleanPlaceholder(existingVendor.city),
          zipCode: existingVendor.zipCode || '',
          address1: cleanPlaceholder(existingVendor.address1),
          address2: existingVendor.address2 || '',
          paymentTerms: (Array.isArray(existingVendor.paymentTerms) ? existingVendor.paymentTerms : (existingVendor.paymentTerms ? [existingVendor.paymentTerms] : [])).filter((t) => typeof t !== 'string' || !isHtmlMarkup(t)),
          deliveryTerms: (Array.isArray(existingVendor.deliveryTerms) ? existingVendor.deliveryTerms : (existingVendor.deliveryTerms ? [existingVendor.deliveryTerms] : [])).filter((t) => typeof t !== 'string' || !isHtmlMarkup(t)),
          notes: existingVendor.notes || '',
          attachments: existingVendor.attachments ? [...existingVendor.attachments] : [],
          isActive: existingVendor.isActive !== undefined ? existingVendor.isActive : true,
          inactiveComment: existingVendor.inactiveComment || '',
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    } else {
      if (initializedIdRef.current !== 'new') {
        initializedIdRef.current = 'new';
        const generatedCode = getNextVendorCode();
        const today = getTodayIsoDate();
        const data = {
          ...INITIAL_FORM,
          vendorCode: '',
          effectiveDate: today,
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    }
  }, [isEdit, id, existingVendor, getNextVendorCode]);

  const {
    countryOptions,
    getStateOptions,
    fetchStatesForCountry,
    loadingStatesMap,
  } = useCountryState();

  // Fetch states whenever selected country changes
  useEffect(() => {
    if (form.countryId) {
      fetchStatesForCountry(form.countryId);
    }
  }, [form.countryId, fetchStatesForCountry]);

  // Cascading state options based on selected country from API
  const stateOptions = useMemo(() => {
    if (!form.countryId) return [];
    return getStateOptions(form.countryId);
  }, [form.countryId, getStateOptions]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === 'vendorName') {
      const trimmedOrRaw = value || '';
      setForm((prev) => {
        const next = { ...prev, vendorName: value };
        const currentLedger = prev.ledgerName || '';
        const currentVendor = prev.vendorName || '';
        if (
          !currentLedger ||
          currentLedger === currentVendor ||
          currentLedger === currentVendor.toUpperCase()
        ) {
          next.ledgerName = trimmedOrRaw.toUpperCase();
        }
        return next;
      });
      if (errors.vendorName) {
        setErrors((prev) => ({ ...prev, vendorName: '' }));
      }
      return;
    }

    if (name === 'gstNo') {
      const upper = typeof value === 'string' ? value.toUpperCase() : value;
      setForm((prev) => {
        const next = { ...prev, gstNo: upper };
        // Auto-extract PAN from GSTIN if PAN is empty
        if (upper.length >= 12 && !prev.panNo) {
          const panCandidate = upper.slice(2, 12);
          if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panCandidate)) {
            next.panNo = panCandidate;
          }
        }
        return next;
      });
      if (errors.gstNo) {
        setErrors((prev) => ({ ...prev, gstNo: '' }));
      }
      return;
    }

    if (name === 'group') {
      setForm((prev) => ({ ...prev, group: value, subGroup: '' }));
      if (errors.group || errors.subGroup) {
        setErrors((prev) => ({ ...prev, group: '', subGroup: '' }));
      }
      return;
    }

    if (name === 'panNo' || name === 'cin' || name === 'udhyamNo') {
      const upper = typeof value === 'string' ? value.toUpperCase() : value;
      setForm((prev) => ({ ...prev, [name]: upper }));
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: '' }));
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleCountryChange(e) {
    const nextCountryId = e.target.value;
    setForm((prev) => ({
      ...prev,
      countryId: nextCountryId,
      stateId: '', // Reset state when country changes
    }));
    if (errors.countryId || errors.stateId) {
      setErrors((prev) => ({ ...prev, countryId: '', stateId: '' }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    // Auto-uppercase GST number on blur
    if (name === 'gstNo' && typeof value === 'string') {
      const upper = value.toUpperCase();
      setForm((prev) => ({ ...prev, gstNo: upper }));
      const err = validateField(name, upper, form);
      if (err) setErrors((prev) => ({ ...prev, [name]: err }));
      return;
    }
    const err = validateField(name, value, form);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  }

  // ── Attachment handling ──
  function handleFilesAdded(files) {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    // Allowed extensions from selected document type or default
    const allowedExts =
      currentDocTypeConfig?.allowedExtensionList &&
      currentDocTypeConfig.allowedExtensionList.length > 0
        ? currentDocTypeConfig.allowedExtensionList.map((e) => e.toLowerCase().trim())
        : (currentDocTypeConfig?.allowedExtensions
            ? currentDocTypeConfig.allowedExtensions.split(',').map((e) => e.toLowerCase().trim())
            : ALLOWED_FILE_EXTENSIONS);

    const maxMb = currentDocTypeConfig?.maxFileSizeMB || 10;
    const maxBytes = maxMb * 1024 * 1024;

    for (const file of fileList) {
      const name = (file.name || '').toLowerCase();
      const hasValidExt = allowedExts.some((ext) => name.endsWith(ext));
      if (!hasValidExt) {
        setAttachmentError(
          `"${file.name}" is not an allowed file type. Allowed formats: ${allowedExts.join(', ')}`
        );
        return;
      }
      if (file.size > maxBytes) {
        setAttachmentError(
          `"${file.name}" exceeds the maximum allowed file size of ${maxMb} MB.`
        );
        return;
      }
    }

    setAttachmentError('');

    const matchedDocType = currentDocTypeConfig;
    const docTypeId = matchedDocType?.id || matchedDocType?.documentTypeId || 1;

    const newAttachments = fileList.map((file, idx) => {
      const docName =
        selectedDocType ||
        file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') ||
        'Vendor Document';
      const fileUrl = file.type?.startsWith('image/')
        ? URL.createObjectURL(file)
        : null;

      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${idx}`,
        documentTypeId: docTypeId,
        documentName: docName,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileSizeBytes: file.size,
        fileType: file.type || 'application/octet-stream',
        fileUrl,
        uploadedAt: getTodayISO(),
        file,
      };
    });

    setForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...newAttachments],
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedDocType('');
  }

  function handleFileInputChange(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesAdded(files);
    }
  }

  function handleRemoveAttachment(id) {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((att) => att.id !== id),
    }));
  }

  function handleDownloadAttachment(att) {
    if (att.id && typeof att.id === 'number') {
      vendorService.downloadVendorAttachment(att.id, att.fileName).catch(() => {
        toast.error('Failed to download attachment');
      });
      return;
    }
    if (att.fileUrl) {
      const a = document.createElement('a');
      a.href = att.fileUrl;
      a.download = att.fileName || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob([`MicroFlat ERP Document: ${att.documentName}\nFile: ${att.fileName}`], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.fileName || 'document.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesAdded(files);
    }
  }

  function handleCancel() {
    if (isEdit && id) {
      navigate(`/vendors/${id}`);
    } else {
      navigate('/vendors');
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Scroll to first error
      const firstErrorField = Object.keys(fieldErrors)[0];
      const el = document.getElementById(firstErrorField);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }
      return;
    }

    setLoading(true);
    try {
      if (isEdit && existingVendor) {
        const payload = {
          ...form,
          ledgerName: form.ledgerName.trim() === '' ? '' : form.ledgerName.trim(),
          group: form.group.trim() === '' ? '' : form.group.trim(),
          subGroup: form.subGroup.trim() === '' ? '' : form.subGroup.trim(),
        };
        const res = await updateVendor(existingVendor.id, payload);
        if (res?.ok) {
          navigate(`/vendors/${existingVendor?.id || id}`);
        } else {
          // Server returned an error - stay on page and map field errors
          if (res?.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...res.fieldErrors }));
          }
          if (res?.error) {
            if (/ledger/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, ledgerName: res.error }));
              document.getElementById('ledgerName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (/gst/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, gstNo: res.error }));
              document.getElementById('gstNo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (/vendor\s*code/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, vendorCode: res.error }));
              document.getElementById('vendorCode')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (/vendor\s*name/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, vendorName: res.error }));
              document.getElementById('vendorName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      } else {
        const res = await createVendor(form);
        if (res?.ok && res.vendor) {
          navigate(`/vendors/${res.vendor.id || res.vendor.vendorId || ''}`);
        } else {
          // Server returned an error - stay on page and map field errors
          if (res?.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...res.fieldErrors }));
          }
          if (res?.error) {
            if (/ledger/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, ledgerName: res.error }));
              document.getElementById('ledgerName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (/gst/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, gstNo: res.error }));
              document.getElementById('gstNo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (/vendor\s*code/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, vendorCode: res.error }));
              document.getElementById('vendorCode')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (/vendor\s*name/i.test(res.error)) {
              setErrors((prev) => ({ ...prev, vendorName: res.error }));
              document.getElementById('vendorName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }
    } catch (err) {
      const msg = err?.message || err?.detail || 'An error occurred while saving vendor.';
      toast.error(msg);
      if (/ledger/i.test(msg) || err?.status === 409 || err?.response?.status === 409) {
        setErrors((prev) => ({ ...prev, ledgerName: msg }));
        document.getElementById('ledgerName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (/gst/i.test(msg)) {
        setErrors((prev) => ({ ...prev, gstNo: msg }));
        document.getElementById('gstNo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && fetchingVendor) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
          <p className="text-sm text-text-muted">Loading vendor details...</p>
        </Card>
      </div>
    );
  }

  if (isEdit && !existingVendor) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested vendor with ID "{id}" could not be located in the database.
          </p>
          <Button variant="primary" onClick={() => navigate('/vendors')}>
            Back to Vendors
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* ── Top Page Header & Navigation ── */}
      <PageHeader
        title={isEdit ? `Edit Vendor: ${existingVendor?.vendorName || ''}` : 'Add Vendor'}
        icon={<IconVendor className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle={
          isEdit
            ? `Modify corporate profile, contact details, and registered address for ${form.vendorName || existingVendor?.vendorName || 'vendor'}`
            : 'Register your organization master profile, contact details, and registered address'
        }
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleCancel}
          >
            {isEdit ? 'Back to Vendor' : 'Back to Vendors'}
          </Button>
        }
      />

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => {
            if (isEdit && id) {
              navigate(`/vendors/${id}`);
            } else {
              setSearchParams({ tab: 'details' });
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'details'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-heading'
          }`}
        >
          <IconVendor size={15} />
          <span>{isEdit ? 'Vendor Profile & Versions' : 'Vendor Master Details'}</span>
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'bank' })}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'bank'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-heading'
          }`}
        >
          <IconBankDetails size={15} />
          <span>Bank Accounts</span>
        </button>
      </div>

      {/* ── Tab 1: Vendor Master Details Content ── */}
      {activeTab === 'details' && (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Sub-Header matching Bank Accounts tab */}
          <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-heading">Vendor Master Details</h3>
              <p className="text-2xs text-text-muted">
                {isEdit
                  ? `Modify corporate profile, contact details, and registered address for ${form.vendorName || existingVendor?.vendorName || 'vendor'}`
                  : 'Register your organization master profile, contact details, and registered address'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CancelButton
                onClick={handleCancel}
                disabled={loading}
                size="sm"
              />
              <SaveButton
                type="submit"
                loading={loading}
                disabled={loading}
                size="sm"
              >
                {isEdit ? 'Save Changes' : 'Save Vendor'}
              </SaveButton>
            </div>
          </div>

      {/* ── SECTION 1: VENDOR MASTER DETAILS ── */}
      <CollapsibleCard
        title="1. Vendor Master Details"
        subtitle="Basic classification, effective date & active account status"
        icon={<IconVendor size={18} />}
        className="bg-bg"
        defaultOpen={true}
        hasError={Boolean(errors.vendorCode || errors.vendorName || errors.effectiveDate || errors.inactiveComment)}
        badge={
          form.vendorCode ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center font-mono font-bold text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                {form.vendorCode}
              </span>
              <Badge variant="neutral" size="sm" className="font-medium text-2xs">
                System Generated
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center font-mono text-xs text-text-muted bg-surface border border-border px-2.5 py-1 rounded-lg">
                Auto Generated
              </span>
              <Badge variant="neutral" size="sm" className="font-medium text-2xs">
                Assigned on Save
              </Badge>
            </div>
          )
        }
      >

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Vendor Name */}
            <div>
              <Input
                id="vendorName"
                name="vendorName"
                type="text"
                label="Vendor Name"
                placeholder="e.g. Apex Precision Castings Pvt Ltd"
                required
                value={form.vendorName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.vendorName}
                autoComplete="organization"
              />
            </div>

            {/* Vendor Category */}
            <div>
              <SearchableSelect
                id="vendorCategory"
                name="vendorCategory"
                label="Vendor Category"
                placeholder="Select category..."
                searchPlaceholder="Search categories..."
                options={vendorCategoryOptions}
                value={form.vendorCategory}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.vendorCategory}
              />
            </div>

            {/* Effective Date */}
            <div>
              <DatePicker
                id="effectiveDate"
                name="effectiveDate"
                label="Effective Date"
                required
                value={form.effectiveDate}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.effectiveDate}
                disabled={isEdit}
                hint={
                  isEdit
                    ? 'Effective date cannot be changed for an existing vendor. Use Effective Dates page to add a new version.'
                    : 'Initial effective start date'
                }
              />
            </div>
          </div>

          {/* Row 2: Ledger Name, Accounting Group (Dropdown), Sub-Group (Dropdown) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
            <div>
              <Input
                id="ledgerName"
                name="ledgerName"
                type="text"
                label="Ledger Name"
                placeholder="e.g. APEX PRECISION CASTINGS PVT LTD"
                value={form.ledgerName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.ledgerName}
                maxLength={200}
                hint="Unique accounting ledger name (max 200 chars)"
              />
            </div>

            <div>
              <SearchableSelect
                id="group"
                name="group"
                label="Accounting Group"
                placeholder="Select group..."
                searchPlaceholder="Search group..."
                options={ACCOUNTING_GROUP_OPTIONS}
                value={form.group}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.group}
              />
            </div>

            <div>
              <SearchableSelect
                id="subGroup"
                name="subGroup"
                label="Sub-Group"
                placeholder={!form.group ? 'Select Accounting Group first...' : 'Select sub-group...'}
                searchPlaceholder="Search sub-group..."
                options={form.group ? subGroupOptions : []}
                value={form.subGroup}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={!form.group}
                error={errors.subGroup}
                hint={!form.group ? 'Requires Accounting Group selection' : undefined}
              />
            </div>
          </div>

          {/* Status Switch */}
          <div className="flex flex-col justify-between pt-2 border-t border-border/70">
            <span className="mf-label block mb-2">Account Status <span className="mf-required" aria-hidden="true">*</span></span>
            <div className="flex items-center gap-3 h-[42px]">
              <StatusSwitch
                id="vendor-status-switch"
                checked={form.isActive}
                onChange={(checked) => {
                  setForm((prev) => ({ ...prev, isActive: checked }));
                  if (checked) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.inactiveComment;
                      return next;
                    });
                  }
                }}
              />
              <span className="text-xs text-text-muted">
                {form.isActive
                  ? 'Vendor is active and eligible for new purchase orders and quotes.'
                  : 'Vendor is inactive and temporarily blocked from PO creation.'}
              </span>
            </div>

            {/* Inactive Comment (Compulsory when Inactive) */}
            {!form.isActive && (
              <div className="mt-4 p-4 rounded-xl border border-danger/30 bg-danger/[0.04] space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-danger font-semibold text-xs uppercase tracking-wider">
                  <IconError size={15} className="shrink-0" />
                  <span>Reason for Inactivation (Compulsory)</span>
                  <span className="text-danger" aria-hidden="true">*</span>
                </div>
                <p className="text-2xs text-text-muted">
                  Please provide a detailed comment or reason why this vendor is being deactivated. This will be visible on the vendor's profile and audit logs.
                </p>
                <div className="flex flex-col gap-1 pt-1">
                  <Textarea
                    id="inactiveComment"
                    name="inactiveComment"
                    label="Inactive Comment"
                    required
                    rows={3}
                    placeholder="e.g. Disqualified due to repeated quality rejections on batch #4810; vendor placed on hold until audit clearance..."
                    value={form.inactiveComment || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.inactiveComment}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* ── SECTION 2: CONTACT INFORMATION ── */}
      <CollapsibleCard
        title="2. Contact Information"
        subtitle="Primary communication channel & key contacts"
        icon={<IconContact size={18} />}
        className="bg-bg"
        defaultOpen={true}
        hasError={Boolean(errors.contactPersonName || errors.email || errors.ccEmail || errors.phoneNo || errors.alternatePhoneNo || errors.website)}
      >

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Contact Person Name */}
          <Input
            id="contactPersonName"
            name="contactPersonName"
            type="text"
            label="Contact Person Name"
            placeholder="e.g. Rajesh Patel"
            required
            value={form.contactPersonName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.contactPersonName}
            autoComplete="name"
          />

          {/* Email */}
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="contact@company.com"
            required
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            autoComplete="email"
          />

          {/* CC Email */}
          <Input
            id="ccEmail"
            name="ccEmail"
            type="email"
            label="CC Email Address"
            placeholder="accounts@company.com (optional)"
            value={form.ccEmail}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.ccEmail}
            hint="Optional CC address for notifications"
          />

          {/* Phone Number */}
          <Input
            id="phoneNo"
            name="phoneNo"
            type="tel"
            label="Primary Phone Number"
            placeholder="9876543210"
            required
            maxLength={10}
            value={form.phoneNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.phoneNo}
            hint="10-digit primary mobile or landline"
            className="font-mono tabular-nums"
            autoComplete="tel"
          />

          {/* Alternate Phone Number */}
          <Input
            id="alternatePhoneNo"
            name="alternatePhoneNo"
            type="tel"
            label="Alternate Phone Number"
            placeholder="9823456781 (optional)"
            maxLength={10}
            value={form.alternatePhoneNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.alternatePhoneNo}
            hint="Optional secondary contact number"
            className="font-mono tabular-nums"
          />

          {/* Website Link (Optional) */}
          <Input
            id="website"
            name="website"
            type="url"
            label="Company Website URL"
            placeholder="https://www.company.com (optional)"
            value={form.website}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.website}
            hint="Optional company website or vendor portal link"
          />
        </div>
      </CollapsibleCard>

      {/* ── SECTION 3: STATUTORY & MSME REGISTRATIONS ── */}
      <CollapsibleCard
        title="3. Statutory & MSME Registrations"
        subtitle="GSTIN, PAN, CIN, and MSME/Udyam statutory compliance classification"
        icon={<IconShieldCheck size={18} />}
        className="bg-bg"
        defaultOpen={true}
        hasError={Boolean(errors.gstNo || errors.panNo || errors.cin || errors.udhyamNo || errors.msmeType || errors.msmeActivity)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* GST Number */}
          <Input
            id="gstNo"
            name="gstNo"
            type="text"
            label="GST Identification Number (GSTIN)"
            placeholder="e.g. 24AABCA1234F1Z5"
            maxLength={15}
            value={form.gstNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.gstNo}
            hint="15-character alphanumeric tax identifier"
            className="font-mono uppercase"
          />

          {/* PAN Number */}
          <Input
            id="panNo"
            name="panNo"
            type="text"
            label="Permanent Account Number (PAN)"
            placeholder="e.g. AABCA1234F"
            maxLength={10}
            value={form.panNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.panNo}
            hint="10-character alphanumeric PAN"
            className="font-mono uppercase"
          />

          {/* CIN */}
          <Input
            id="cin"
            name="cin"
            type="text"
            label="Corporate Identification Number (CIN)"
            placeholder="e.g. U74999GJ2020PTC118123"
            maxLength={21}
            value={form.cin}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.cin}
            hint="21-character corporate identifier"
            className="font-mono uppercase"
          />

          {/* Udyam Registration Number */}
          <Input
            id="udhyamNo"
            name="udhyamNo"
            type="text"
            label="Udyam Registration Number"
            placeholder="e.g. UDYAM-GJ-01-0012345"
            value={form.udhyamNo}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.udhyamNo}
            hint="MSME Udyam certificate registration"
            className="font-mono uppercase"
          />

          {/* MSME Type */}
          <SearchableSelect
            id="msmeType"
            name="msmeType"
            label="MSME Enterprise Type"
            placeholder="Select MSME Type..."
            searchPlaceholder="Search types..."
            options={msmeTypeOptions}
            value={form.msmeType}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.msmeType}
          />

          {/* MSME Activity */}
          <SearchableSelect
            id="msmeActivity"
            name="msmeActivity"
            label="MSME Primary Activity"
            placeholder="Select MSME Activity..."
            searchPlaceholder="Search activities..."
            options={msmeActivityOptions}
            value={form.msmeActivity}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.msmeActivity}
          />
        </div>
      </CollapsibleCard>

      {/* ── SECTION 4: ADDRESS & LOCATION ── */}
      <CollapsibleCard
        title="4. Address & Location"
        subtitle="Billing & dispatch registered location"
        icon={<IconLocation size={18} />}
        className="bg-bg"
        defaultOpen={true}
        hasError={Boolean(errors.countryId || errors.stateId || errors.city || errors.zipCode || errors.address1)}
      >

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Country (SearchableSelect) */}
          <SearchableSelect
            id="countryId"
            name="countryId"
            label="Country"
            placeholder="Select country..."
            searchPlaceholder="Search countries..."
            emptyText="No countries found"
            required
            options={countryOptions}
            value={form.countryId}
            onChange={handleCountryChange}
            onBlur={handleBlur}
            error={errors.countryId}
          />

          {/* State (Cascading SearchableSelect) */}
          <SearchableSelect
            id="stateId"
            name="stateId"
            label="State"
            placeholder={
              !form.countryId
                ? 'Select country first...'
                : loadingStatesMap[form.countryId]
                ? 'Loading states...'
                : stateOptions.length === 0
                ? 'No states available'
                : 'Select state...'
            }
            searchPlaceholder="Search states..."
            emptyText="No states found"
            required
            options={stateOptions}
            value={form.stateId}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.stateId}
            disabled={!form.countryId || stateOptions.length === 0}
          />

          {/* City */}
          <Input
            id="city"
            name="city"
            type="text"
            label="City"
            placeholder="e.g. Ahmedabad"
            required
            value={form.city}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.city}
            autoComplete="address-level2"
          />

          {/* Address Line 1 */}
          <div className="md:col-span-3">
            <Input
              id="address1"
              name="address1"
              type="text"
              label="Address Line 1"
              placeholder="e.g. Plot No. 42, GIDC Phase II"
              required
              value={form.address1}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.address1}
              autoComplete="address-line1"
            />
          </div>

          {/* Address Line 2 */}
          <div className="md:col-span-2">
            <Input
              id="address2"
              name="address2"
              type="text"
              label="Address Line 2 (Optional)"
              placeholder="e.g. Near ABC Circle, Vatva Industrial Estate"
              value={form.address2}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.address2}
              autoComplete="address-line2"
            />
          </div>

          {/* Postal / Zip Code */}
          <Input
            id="zipCode"
            name="zipCode"
            type="text"
            label="Postal / Zip Code"
            placeholder="e.g. 380015"
            required
            maxLength={6}
            value={form.zipCode}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.zipCode}
            className="font-mono tabular-nums"
            autoComplete="postal-code"
          />
        </div>
      </CollapsibleCard>

      {/* ── SECTION 5: COMMERCIAL TERMS & PROCUREMENT NOTES ── */}
      <CollapsibleCard
        title="5. Commercial Terms & Procurement Notes"
        subtitle="Agreed payment terms, delivery terms, and operational remarks"
        icon={<IconFileText size={18} />}
        className="bg-bg"
        defaultOpen={true}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PaymentTermsSelect
              id="vendor-paymentTerms"
              name="paymentTerms"
              value={Array.isArray(form.paymentTerms) ? form.paymentTerms : (form.paymentTerms ? [form.paymentTerms] : [])}
              onChange={(e) => {
                const val = e?.target ? e.target.value : e;
                setForm((prev) => ({ ...prev, paymentTerms: val }));
              }}
              hint="Multiple payment terms can be selected from Configuration"
            />

            <DeliveryTermsSelect
              id="vendor-deliveryTerms"
              name="deliveryTerms"
              value={Array.isArray(form.deliveryTerms) ? form.deliveryTerms : (form.deliveryTerms ? [form.deliveryTerms] : [])}
              onChange={(e) => {
                const val = Array.isArray(e) ? e : e?.target?.value || [];
                setForm((prev) => ({ ...prev, deliveryTerms: val }));
              }}
              hint="Multiple delivery terms can be selected from Configuration"
            />
          </div>

          <Textarea
            id="notes"
            name="notes"
            label="Procurement & Quality Notes"
            rows={4}
            placeholder="Add any internal remarks, capability notes, tooling standards, or ISO certification references..."
            value={form.notes}
            onChange={handleChange}
          />
        </div>
      </CollapsibleCard>

      {/* ── SECTION 6: ATTACHMENTS & SUPPORTING DOCUMENTS ── */}
      <CollapsibleCard
        title="6. Attachments & Supporting Documents"
        subtitle="Upload commercial, tax, and quality compliance files"
        icon={<IconAttachment size={18} />}
        className="bg-bg"
        defaultOpen={true}
        badge={
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {form.attachments?.length || 0} {form.attachments?.length === 1 ? 'file' : 'files'}
          </span>
        }
      >

        <div className="space-y-6">
          {/* Uploader Control Box */}
          <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface/40 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Add New Attachment
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document Name / Category Selection */}
              <div className="space-y-2">
                <SearchableSelect
                  id="attachmentDocType"
                  name="attachmentDocType"
                  label="Document Name / Type"
                  placeholder="Select document name / type..."
                  searchPlaceholder="Search document types..."
                  emptyText="No matching document types found"
                  options={documentTypeOptions}
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                />
              </div>

              {/* Drag & Drop Zone and File Browser */}
              <div className="flex flex-col justify-between">
                <span className="mf-label block mb-2">Select File(s)</span>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${isDragging
                    ? 'border-primary bg-primary/10 scale-[0.99]'
                    : 'border-border hover:border-primary/60 bg-bg hover:bg-surface/60'
                    }`}
                >
                  {/* Native file input hidden for custom drag-drop styling */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={acceptExtensions}
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <IconUpload size={20} />
                  </div>
                  <p className="text-xs font-medium text-heading">
                    <span className="text-primary hover:underline font-semibold">Click to choose files</span> or drag & drop here
                  </p>
                  <p className="text-2xs text-text-muted mt-1">
                    Allowed formats: <strong className="text-heading font-medium">{acceptExtensions.replace(/,/g, ', ')}</strong> (Up to {maxFileSizeMB} MB per file)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* List of Attached Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Attached Documents ({form.attachments?.length || 0})
              </h4>
            </div>

            {(!form.attachments || form.attachments.length === 0) ? (
              <div className="border border-border/80 rounded-xl p-8 text-center bg-surface/20">
                <div className="w-10 h-10 rounded-full bg-border/50 text-text-muted flex items-center justify-center mx-auto mb-2.5">
                  <IconAttachment size={18} />
                </div>
                <p className="text-xs font-medium text-heading">No documents attached yet</p>
                <p className="text-2xs text-text-muted mt-0.5 max-w-sm mx-auto">
                  Select a document name above and upload vendor credentials, GST certificates, MSME documents, or bank details.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-bg">
                {form.attachments.map((att, index) => (
                  <div
                    key={att.id || index}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/40 transition-colors"
                  >
                    {/* Left: Icon and Document / File Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2.5 rounded-lg bg-surface border border-border shrink-0 mt-0.5">
                        {getFileIcon(att.fileName, att.fileType)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-heading break-words">
                          {att.documentName}
                        </h4>
                        <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-2xs text-text break-all">{att.fileName}</span>
                          <span>•</span>
                          <span className="font-mono text-2xs">{att.fileSize || 'Unknown size'}</span>
                          {att.uploadedAt && (
                            <>
                              <span>•</span>
                              <span className="text-2xs font-mono text-text-muted">Added: {formatDate(att.uploadedAt)}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions (Preview, IconDownload, Delete) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <IconButton
                        icon={IconView}
                        size="sm"
                        variant="ghost"
                        title="Preview attachment"
                        aria-label="Preview attachment"
                        onClick={() => setPreviewItem(att)}
                      />

                      <IconButton
                        icon={IconDownload}
                        size="sm"
                        variant="ghost"
                        title="Download attachment"
                        aria-label="Download attachment"
                        onClick={() => handleDownloadAttachment(att)}
                        className="hover:text-success"
                      />

                      <IconButton
                        icon={IconDelete}
                        size="sm"
                        variant="ghost"
                        title="Remove attachment"
                        aria-label="Remove attachment"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="hover:text-danger hover:bg-danger/10"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* ── SECTION 7 (EDIT MODE ONLY): READ-ONLY APPROVAL & AUDIT PANEL ── */}
      {isEdit && existingVendor && (
        <CollapsibleCard
          title="7. System-Managed Approval & Audit Info"
          subtitle="Read-only system metadata and approval records"
          icon={<IconShieldCheck size={18} />}
          className="bg-surface/50 border-border/80"
          defaultOpen={false}
          badge={
            <span className="text-xs text-text-muted bg-border/60 px-2 py-0.5 rounded">
              Read-only
            </span>
          }
        >
          <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Approval Status */}
                <div className="space-y-1">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                    Approval Status
                  </span>
                  <Badge variant={getApprovalBadgeVariant(existingVendor.approvalStatus)}>
                    {getApprovalStatusLabel(existingVendor.approvalStatus)}
                  </Badge>
                </div>

                {/* Approver Name */}
                {getApprovalStatusLabel(existingVendor.approvalStatus) !== 'Pending' && (
                  <div className="space-y-1">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                      Approved / Reviewed By
                    </span>
                    <span className="text-xs font-medium text-heading">
                      {existingVendor.approvedByName || existingVendor.approvedBy || 'Not approved yet'}
                    </span>
                  </div>
                )}

                {/* Approval Date */}
                {getApprovalStatusLabel(existingVendor.approvalStatus) !== 'Pending' && (
                  <div className="space-y-1">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                      Approved Date
                    </span>
                    <span className="text-xs font-mono tabular-nums text-text">
                      {existingVendor.approvedOn || '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Approval Comments */}
              {getApprovalStatusLabel(existingVendor.approvalStatus) !== 'Pending' && existingVendor.approvedByComments && (
                <div className="bg-bg/80 p-3 rounded-lg border border-border text-xs space-y-1">
                  <span className="font-semibold text-text-muted">Reviewer Comments:</span>
                  <p className="text-text">{existingVendor.approvedByComments}</p>
                </div>
              )}

              {/* Metadata strip */}
              <div className="text-xs text-text-muted pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  Created by <strong className="text-heading font-medium">{existingVendor.createdBy || 'Ian Chesnut'}</strong> on{' '}
                  <span className="font-mono tabular-nums">{formatDate(existingVendor.createdOn)}</span>
                </span>
                <span>
                  Last updated by <strong className="text-heading font-medium">{existingVendor.lastUpdatedBy || 'Ian Chesnut'}</strong> on{' '}
                  <span className="font-mono tabular-nums">{formatDate(existingVendor.lastUpdatedOn)}</span>
                </span>
              </div>
            </div>
        </CollapsibleCard>
      )}

      {/* ── STICKY FOOTER SAVE BAR ── */}
      <div className="sticky bottom-0 z-20 bg-bg/95 backdrop-blur-md border-t border-border py-3.5 px-4 sm:px-6 rounded-xl shadow-lg flex items-center justify-between gap-4">
        <div className="text-xs text-text-muted hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>
            {isDirty ? (
              <span className="text-warning font-medium">Unsaved modifications</span>
            ) : isEdit ? (
              `Editing ${existingVendor?.vendorCode}`
            ) : (
              'Ready to create vendor record'
            )}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <CancelButton
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          />
          <SaveButton
            type="submit"
            loading={loading}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            {isEdit ? 'Save Changes' : 'Save Vendor'}
          </SaveButton>
        </div>
      </div>
        </form>
      )}

      {/* ── Tab 2: Bank Accounts Content ── */}
      {activeTab === 'bank' && (
        isEdit ? (
          <VendorBankDetailsFormPage vendorId={id} vendor={existingVendor} embedded />
        ) : (
          <Card padding="lg" className="text-center py-12 space-y-4 max-w-xl mx-auto border-dashed my-6 bg-surface/30">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <IconBankDetails size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-heading">Save Vendor to Configure Bank Details</h3>
              <p className="text-xs text-text-muted leading-relaxed max-w-md mx-auto">
                Commercial bank accounts, payment routes, and cheque documents can be added once the vendor is created.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              loading={loading}
              disabled={loading}
              icon={<IconSave size={14} />}
            >
              Save Vendor First
            </Button>
          </Card>
        )
      )}

      {/* ── Document Preview Modal ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.documentName || 'Document Preview'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-text-muted bg-surface/50 p-3 rounded-lg border border-border">
              <div>
                <span className="font-medium text-heading">Filename:</span>{' '}
                <span className="font-mono">{previewItem.fileName}</span>
              </div>
              <div>
                <span className="font-medium text-heading">Size:</span>{' '}
                <span className="font-mono">{previewItem.fileSize}</span>
              </div>
            </div>

            {previewItem.fileType?.includes('image') && previewItem.fileUrl ? (
              <div className="max-h-[420px] overflow-auto rounded-lg border border-border bg-surface/30 flex items-center justify-center p-4">
                <img
                  src={previewItem.fileUrl}
                  alt={previewItem.documentName}
                  className="max-h-[380px] max-w-full rounded object-contain"
                />
              </div>
            ) : (
              <div className="py-10 px-4 text-center rounded-lg border border-dashed border-border bg-surface/20 space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  {getFileIcon(previewItem.fileName, previewItem.fileType)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-heading">{previewItem.documentName}</h4>
                  <p className="text-xs text-text-muted mt-1 font-mono">{previewItem.fileName}</p>
                </div>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  This document format is ready for download or viewing via your device's default reader.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              {previewItem.fileUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={IconExternalLink}
                  onClick={() => window.open(previewItem.fileUrl, '_blank')}
                >
                  Open in Tab
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={IconDownload}
                onClick={() => handleDownloadAttachment(previewItem)}
              >
                Download
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
