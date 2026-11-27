/**
 * InquiryFormPage.jsx — Multi-step Add and Edit inquiry form for MicroFlat ERP.
 *
 * Route: /inquiries/new (Add mode) & /inquiries/:id/edit (Edit mode)
 *
 * 2-Step Workflow:
 *   Step 1: Inquiry & Customer Details
 *     - 1. Inquiry Details (InquiryNo, InquiryDate, Description, Source, Priority)
 *     - 2. Customer Information (CustomerName, ContactPerson, Email, Phone, AlternativePhone, AddressLine1, AddressLine2, City, State, Country)
 *     - 3. Classification & Value (RegionId, CategoryId, Quantity, UOM, EstimatedValue, RequiredByDate)
 *
 *   Step 2: Assignment & Documents
 *     - 4. Assignment & Initial Status (AssignedTo without unassigned option, StatusId, Initial Handover Comment)
 *     - 5. Documents & Attachments (RFQ, Drawings, Specs, Quotations with real-time extension & size validation)
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  IconAdd,
  IconArrowRight,
  IconAttachment,
  IconBack,
  IconCheck,
  IconClose,
  IconDelete,
  IconDocumentTypes,
  IconEdit,
  IconError,
  IconExternalLink,
  IconFile,
  IconFileText,
  IconInquiry,
  IconLayers,
  IconPackage,
  IconUpload,
  IconUser,
  IconUserCheck,
  IconView,
} from '../../constants/icons';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  Checkbox,
  DatePicker,
  SearchableSelect,
  Card,
  CollapsibleCard,
  Badge,
  Modal,
  ConfirmModal,
  RichTextEditor,
  TableContainer,
  Th,
  Td,
  PageHeader,
  ScrollableTabs,
  Textarea,
  IconButton,
  TableActions,
  Drawer,
} from '../../components/ui';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';
import { useProductCategoriesContext } from '../../context/ProductCategoriesContext';
import { useRegions } from '../../context/RegionsContext';
import { useClientsContext } from '../../context/ClientsContext';
import { useStandardsContext } from '../../context/StandardsContext';
import { calculateFlatnessTolerance } from '../../utils/flatnessFormula';
import { inquiryService, clientService, geographyService } from '../../services';
import { getCategoryPathName } from '../../utils/treeUtils';
import { getTodayISO } from '../../utils/dateUtils';

const CLIENT_TYPE_OPTIONS = [
  { value: 'New', label: 'New Client' },
  { value: 'Existing', label: 'Existing Client' },
];

function normalizeUom(val) {
  if (!val) return '';
  const upper = String(val).trim().toUpperCase();
  if (upper === 'METER' || upper === 'METERS' || upper === 'M') return 'MTR';
  if (upper === 'NO' || upper === 'NOS' || upper === 'NUMBERS') return 'NOS';
  if (upper === 'PC' || upper === 'PCS' || upper === 'PIECES') return 'PCS';
  if (upper === 'SET' || upper === 'SETS') return 'SETS';
  if (upper === 'UNIT' || upper === 'UNITS') return 'UNITS';
  if (upper === 'KGS' || upper === 'KG' || upper === 'KILOGRAM') return 'KG';
  if (upper === 'BOXES' || upper === 'BOX') return 'BOX';
  return upper;
}

function formatFileSizeKB(kb) {
  if (kb == null || !Number.isFinite(Number(kb))) return '—';
  const size = Number(kb);
  if (size >= 1024) return `${(size / 1024).toFixed(1)} MB`;
  return `${Math.round(size)} KB`;
}

const INITIAL_ITEM_ENTRY = {
  prItemId: null,
  categoryId: '',
  categoryName: '',
  productId: '',
  productName: '',
  variantId: '',
  variantName: '',
  itemCode: '',
  quantity: '',
  material: '',
  finish: '',
  standards: '',
  grade: '',
  flatness: '',
  dimensions: '',
  options: [],
  specification: '',
  notes: '',
};

const INITIAL_FORM = {
  clientType: 'New',
  clientId: '',
  InquiryNo: '',
  InquiryDate: getTodayISO(),
  parentRegionId: '',
  RegionId: '',
  Subject: '',
  Description: '',
  Source: '',
  DistributorName: '',
  Priority: '',
  CustomerName: '',
  ContactPerson: '',
  Email: '',
  Phone: '',
  AlternativePhone: '',
  AddressLine1: '',
  AddressLine2: '',
  City: '',
  State: '',
  Country: '',
  countryId: null,
  CategoryId: '',
  Quantity: '',
  UOM: '',
  EstimatedValue: '',
  RequiredByDate: '',
  items: [],
  AssignedTo: '',
  StatusId: '',
  initialComment: '',
  attachments: [],
};

function validateField(name, value) {
  const str = typeof value === 'string' ? value.trim() : '';

  switch (name) {
    case 'InquiryNo':
      if (!str) return 'Inquiry number is required.';
      return '';
    case 'InquiryDate':
      if (!str) return 'Inquiry date is required.';
      return '';
    case 'CustomerName':
      if (!str) return 'Customer / Company name is required.';
      return '';
    case 'Email':
      if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        return 'Enter a valid email address.';
      }
      return '';
    case 'Phone':
      if (str) {
        if (!/^\+?[\d\s-]+$/.test(str)) return 'Phone number must contain digits only.';
        const digitsOnly = str.replace(/\D/g, '');
        if (digitsOnly.length < 10) return 'Phone number must be at least 10 digits.';
      }
      return '';
    case 'AlternativePhone':
      if (str) {
        if (!/^\+?[\d\s-]+$/.test(str)) return 'Alternative phone must contain digits only.';
        const digitsOnly = str.replace(/\D/g, '');
        if (digitsOnly.length < 10) return 'Alternative phone must be at least 10 digits.';
      }
      return '';
    case 'RegionId':
      if (!value) return 'Sales region is required.';
      return '';
    case 'Source':
      if (!value) return 'Inquiry source is required.';
      return '';
    case 'Priority':
      if (!value) return 'Priority level is required.';
      return '';
    case 'CategoryId':
      if (!value) return 'Product / service category is required.';
      return '';
    case 'DistributorName':
      if (!str) return 'Distributor name is required.';
      return '';
    case 'AssignedTo':
      if (!value) return 'Please select an internal team member to assign.';
      return '';
    default:
      return '';
  }
}

function validateStep1(form) {
  const errors = {};
  const requiredFields = [
    'InquiryNo',
    'InquiryDate',
    'RegionId',
    'Source',
    'Priority',
  ];

  requiredFields.forEach((field) => {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  });

  if (form.clientType === 'Existing') {
    if (!form.clientId && !form.CustomerName?.trim()) {
      errors.CustomerName = 'Please select an existing client.';
    }
  } else {
    if (!form.CustomerName?.trim()) {
      errors.CustomerName = 'Customer / Company name is required.';
    }
  }

  if (form.Email) {
    const err = validateField('Email', form.Email);
    if (err) errors.Email = err;
  }
  if (form.Phone) {
    const err = validateField('Phone', form.Phone);
    if (err) errors.Phone = err;
  }
  if (form.AlternativePhone) {
    const err = validateField('AlternativePhone', form.AlternativePhone);
    if (err) errors.AlternativePhone = err;
  }
  if (form.Source === 'Distributor') {
    const err = validateField('DistributorName', form.DistributorName);
    if (err) errors.DistributorName = err;
  }

  return errors;
}

function validateAll(form) {
  const errors = validateStep1(form);
  const assignErr = validateField('AssignedTo', form.AssignedTo);
  if (assignErr) errors.AssignedTo = assignErr;
  return errors;
}

function getAllowedExtensionsArray(docType) {
  if (!docType) return [];
  if (Array.isArray(docType.allowedExtensionList) && docType.allowedExtensionList.length > 0) {
    return docType.allowedExtensionList;
  }
  if (Array.isArray(docType.allowedExtensions)) {
    return docType.allowedExtensions;
  }
  if (typeof docType.allowedExtensions === 'string' && docType.allowedExtensions.trim()) {
    return docType.allowedExtensions.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function formatAllowedExtensions(docType, sep = ', ') {
  return getAllowedExtensionsArray(docType).join(sep);
}

export default function InquiryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    fetchInquiryById,
    getNextInquiryNo,
    addInquiry,
    updateInquiry,
    addInquiryComment,
    sources = [],
    priorityLevels = [],
    defaultPriorityLevelId = null,
  } = useInquiriesContext();

  const { allUsers = [], users = [], ensureUsersLoaded } = useUsersContext();
  const { addDocument } = useInquiryDocumentsContext();
  const { documentTypes = [] } = useDocumentTypesContext();

  const resolveDocType = (typeId) => {
    return documentTypes.find(
      (docType) => String(docType.documentTypeId ?? docType.id) === String(typeId)
    ) || null;
  };
  const { categories = [] } = useProductCategoriesContext();
  const { regions = [], fetchRegions } = useRegions();
  const { clients = [], ensureClientsLoaded } = useClientsContext();
  const standardsContext = useStandardsContext?.() || {};
  const { standardsList = [], gradeMapping = [], ensureStandardsLoaded } = standardsContext;

  useEffect(() => {
    ensureStandardsLoaded?.();
  }, [ensureStandardsLoaded]);

  useEffect(() => {
    if (clients.length === 0 && ensureClientsLoaded) {
      ensureClientsLoaded();
    }
  }, [clients.length, ensureClientsLoaded]);

  useEffect(() => {
    if (regions.length === 0 && fetchRegions) {
      fetchRegions();
    }
  }, [regions.length, fetchRegions]);

  const userList = allUsers.length > 0 ? allUsers : users;

  useEffect(() => {
    if (userList.length === 0 && ensureUsersLoaded) {
      ensureUsersLoaded();
    }
  }, [userList.length, ensureUsersLoaded]);

  const [fetchedInquiry, setFetchedInquiry] = useState(null);
  const [isLoadingInquiry, setIsLoadingInquiry] = useState(isEdit);
  const [inquiryLoadError, setInquiryLoadError] = useState('');
  const existingInquiry = isEdit ? fetchedInquiry : null;

  useEffect(() => {
    let isMounted = true;
    if (isEdit && id && fetchInquiryById) {
      setIsLoadingInquiry(true);
      setInquiryLoadError('');
      fetchInquiryById(id)
        .then((inq) => {
          if (!inq) throw new Error('The inquiry detail was not returned by the API.');
          if (isMounted) setFetchedInquiry(inq);
        })
        .catch((err) => {
          console.error(`Failed to load inquiry ${id} for editing:`, err);
          if (isMounted) {
            setFetchedInquiry(null);
            setInquiryLoadError(err?.message || 'Failed to load inquiry details.');
            toast.error(err?.message || 'Failed to load inquiry details.');
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingInquiry(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isEdit, id, fetchInquiryById]);

  const dynamicSourceOptions = useMemo(() => sources.map((s) => ({
    value: s.sourceName || s.name || '',
    label: s.sourceName || s.name || '',
    id: s.id,
  })), [sources]);

  const dynamicPriorityOptions = useMemo(() => priorityLevels.map((p) => ({
    value: p.priorityName || p.name || '',
    label: p.priorityName || p.name || '',
    id: p.id,
  })), [priorityLevels]);

  // Client dropdown options for existing client selection
  const clientOptions = useMemo(() => {
    return clients
      .filter((c) => c.isActive !== false)
      .map((c) => ({
        value: c.clientId || c.id,
        label: c.companyName || c.billingName || c.clientId,
      }));
  }, [clients]);

  const [activeTab, setActiveTab] = useState('inquiry_customer');
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleClientTypeChange = (typeOrEvent) => {
    const type = typeOrEvent && typeof typeOrEvent === 'object' && 'target' in typeOrEvent
      ? typeOrEvent.target.value
      : typeOrEvent;

    setForm((prev) => {
      const isNowExisting = type === 'Existing';
      let matchedId = prev.clientId;
      if (isNowExisting && !matchedId && prev.CustomerName) {
        const found = clients.find(
          (c) => (c.companyName || '').toLowerCase() === prev.CustomerName.toLowerCase()
        );
        if (found) matchedId = found.clientId || found.id;
      }
      return {
        ...prev,
        clientType: type,
        clientId: isNowExisting ? matchedId : '',
      };
    });
    if (errors.CustomerName) {
      setErrors((prev) => ({ ...prev, CustomerName: '' }));
    }
  };

  const handleClientSelect = async (selectedVal) => {
    const rawVal = selectedVal && typeof selectedVal === 'object' && 'target' in selectedVal
      ? selectedVal.target.value
      : selectedVal;

    const selected = clients.find((c) => String(c.clientId || c.id) === String(rawVal));
    if (!selected) {
      setForm((prev) => ({
        ...prev,
        clientId: rawVal || '',
        CustomerName: '',
      }));
      return;
    }

    // Immediately pre-populate with available list-item summary fields
    const baseCompanyName = selected.companyName || selected.clientName || selected.billingName || '';
    const baseContactName = selected.primaryContactName || selected.contactPerson || '';
    const baseEmail = selected.email || selected.officialEmail || '';
    const basePhone = selected.primaryContactPhoneNo || selected.phone || '';
    const baseCity = selected.city || '';

    setForm((prev) => ({
      ...prev,
      clientId: selected.clientId || selected.id || rawVal,
      CustomerName: baseCompanyName,
      ContactPerson: baseContactName || prev.ContactPerson,
      Email: baseEmail || prev.Email,
      Phone: basePhone || prev.Phone,
      City: baseCity || prev.City,
      city: baseCity || prev.city,
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next.CustomerName;
      delete next.Email;
      delete next.Phone;
      return next;
    });

    // Fetch full client details (addresses, detailed contacts, state, country) from GET /api/clients/{id}
    const clientIdToFetch = selected.clientId || selected.id || rawVal;
    if (clientIdToFetch) {
      try {
        const fullClient = await clientService.getClientById(clientIdToFetch);
        if (fullClient) {
          const detail = fullClient.currentDetail || fullClient;
          const contacts = detail.contacts || fullClient.contacts || [];
          const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0] || null;

          const fullContactName = primaryContact
            ? `${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`.trim()
            : baseContactName;

          const fullEmail = (primaryContact && primaryContact.email) || detail.officialEmail || detail.email || baseEmail;
          const fullPhone = (primaryContact && (primaryContact.mobile1 || primaryContact.phoneNo)) || detail.phone || basePhone;
          const fullAltPhone = (primaryContact && (primaryContact.mobile2 || primaryContact.alternatePhoneNo)) || detail.alternativePhone || '';

          const addresses = detail.addresses || fullClient.addresses || [];
          const primaryAddress = addresses.find((a) => a.addressType === 'Billing') || addresses[0] || null;

          const resolvedAddr1 = primaryAddress?.address1 || '';
          const resolvedAddr2 = primaryAddress?.address2 || '';
          const resolvedCity = primaryAddress?.city || detail.city || baseCity || '';
          const resolvedCountry = primaryAddress?.countryName || detail.countryName || '';
          const resolvedCountryId = primaryAddress?.countryId || detail.countryId || null;
          const resolvedState = primaryAddress?.stateName || detail.stateName || '';
          const resolvedStateId = primaryAddress?.stateId || detail.stateId || null;

          setForm((prev) => ({
            ...prev,
            CustomerName: detail.clientName || detail.companyName || detail.billingName || baseCompanyName || prev.CustomerName,
            ContactPerson: fullContactName || prev.ContactPerson,
            Email: fullEmail || prev.Email,
            Phone: fullPhone || prev.Phone,
            AlternativePhone: fullAltPhone || prev.AlternativePhone,
            AddressLine1: resolvedAddr1 || prev.AddressLine1,
            address1: resolvedAddr1 || prev.address1,
            AddressLine2: resolvedAddr2 || prev.AddressLine2,
            address2: resolvedAddr2 || prev.address2,
            City: resolvedCity || prev.City,
            city: resolvedCity || prev.city,
            Country: resolvedCountry || prev.Country,
            countryId: resolvedCountryId || prev.countryId,
            State: resolvedState || prev.State,
            stateId: resolvedStateId || prev.stateId,
          }));

          setErrors((prev) => {
            const next = { ...prev };
            delete next.CustomerName;
            delete next.Email;
            delete next.Phone;
            delete next.AlternativePhone;
            delete next.Country;
            delete next.State;
            return next;
          });
        }
      } catch (err) {
        console.warn('Could not fetch full client record for inquiry auto-fill:', err);
      }
    }
  };

  const step1Fields = useMemo(() => [
    'InquiryNo',
    'InquiryDate',
    'Source',
    'Priority',
    'CustomerName',
    'Email',
    'Phone',
    'AlternativePhone',
    'RegionId',
    'CategoryId',
    'DistributorName',
  ], []);
  const hasTab1Errors = useMemo(() => Object.keys(errors).some((k) => step1Fields.includes(k)), [errors, step1Fields]);
  const hasTab2Errors = useMemo(() => Object.keys(errors).some((k) => k === 'AssignedTo'), [errors]);

  // Single Region options from Regions API / RegionsPage
  const regionOptions = useMemo(() => {
    return [
      { value: '', label: '-- Select Region --' },
      ...regions
        .filter((r) => r.isActive || String(r.id) === String(form.RegionId) || String(r.regionId) === String(form.RegionId))
        .map((r) => ({
          value: r.id ?? r.regionId,
          label: r.regionName,
        })),
    ];
  }, [regions, form.RegionId]);

  // Line item adding/editing form state
  const [itemFormState, setItemFormState] = useState({ ...INITIAL_ITEM_ENTRY });
  const [editingItemId, setEditingItemId] = useState(null);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const [itemFieldErrors, setItemFieldErrors] = useState({});
  const inquiryItemErrorCountRef = useRef(0);

  // Dynamic Product Master, Variants & Options State for Section 3 Drawer
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [productVariantsMap, setProductVariantsMap] = useState({});
  const [productOptionsMap, setProductOptionsMap] = useState({});
  const [productDetailsMap, setProductDetailsMap] = useState({});

  // Load the inquiry catalog from the API.
  useEffect(() => {
    let isMounted = true;
    async function loadCatalogProducts() {
      try {
        const catalog = await inquiryService.getCatalog({ pageSize: 100 });
        const products = Array.isArray(catalog)
          ? catalog
          : Array.isArray(catalog?.items)
            ? catalog.items
            : [];
        if (isMounted) setCatalogProducts(products);
      } catch (err) {
        console.error('Could not load inquiry catalog:', err);
        if (isMounted) setCatalogProducts([]);
        toast.error(err?.message || 'Could not load inquiry product catalog.');
      }
    }
    loadCatalogProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load variants, options, and details from the inquiry catalog endpoint.
  useEffect(() => {
    if (!itemFormState.productId) return;
    const prodIdNum = Number(itemFormState.productId);
    if (isNaN(prodIdNum)) return;

    let isMounted = true;
    async function fetchDynamicDetails() {
      try {
        const detail = await inquiryService.getCatalogProduct(prodIdNum);
        if (!detail) throw new Error('The selected catalog product was not returned by the API.');

        if (isMounted) {
          setProductDetailsMap((prev) => ({ ...prev, [itemFormState.productId]: detail }));
          setProductVariantsMap((prev) => ({
            ...prev,
            [itemFormState.productId]: Array.isArray(detail.variants) ? detail.variants : [],
          }));
          setProductOptionsMap((prev) => ({
            ...prev,
            [itemFormState.productId]: Array.isArray(detail.options) ? detail.options : [],
          }));
        }
      } catch (err) {
        console.error('Failed to load inquiry catalog product details:', err);
        if (isMounted) {
          setProductVariantsMap((prev) => ({ ...prev, [itemFormState.productId]: [] }));
          setProductOptionsMap((prev) => ({ ...prev, [itemFormState.productId]: [] }));
        }
        toast.error(err?.message || 'Failed to load product variants and options.');
      }
    }

    if (!Object.prototype.hasOwnProperty.call(productDetailsMap, itemFormState.productId)) {
      fetchDynamicDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [itemFormState.productId, productDetailsMap]);

  // Normalize catalog products without adding local fixture values.
  const mergedCatalogProducts = useMemo(() => {
    return (Array.isArray(catalogProducts) ? catalogProducts : []).map((p) => ({
      ...p,
      id: p.productId ?? p.id,
      productId: p.productId ?? p.id,
      categoryId: p.categoryId ?? '',
      categoryName: p.categoryName || '',
      productName: p.productName || p.name || '',
      productCode: p.productCode || p.code || '',
      description: p.description || '',
      standardInfo: p.suggestedSpecification || p.standardInfo || '',
      materialName: p.materialName || '',
      finishType: p.finishType || '',
      variants: Array.isArray(p.variants) ? p.variants : [],
      options: Array.isArray(p.options) ? p.options : [],
    }));
  }, [catalogProducts]);

  const activeProductObj = useMemo(() => {
    const base = mergedCatalogProducts.find((p) => String(p.id) === String(itemFormState.productId)) || null;
    const details = productDetailsMap[itemFormState.productId];
    if (!base && !details) return null;
    return {
      ...(base || {}),
      ...(details || {}),
    };
  }, [itemFormState.productId, mergedCatalogProducts, productDetailsMap]);

  // Product Catalog Options for Section 3
  const catalogCategoryOptions = useMemo(() => {
    const catMap = new Map();
    // Context categories
    if (Array.isArray(categories)) {
      categories.forEach((c) => {
        const id = String(c.categoryId || c.id);
        const name = c.categoryName || c.name;
        if (id && name) catMap.set(id, name);
      });
    }
    // Categories from merged products
    mergedCatalogProducts.forEach((p) => {
      if (p.categoryId && p.categoryName && !catMap.has(String(p.categoryId))) {
        catMap.set(String(p.categoryId), p.categoryName);
      }
    });

    return [
      { value: '', label: 'All Categories' },
      ...Array.from(catMap.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [categories, mergedCatalogProducts]);

  const catalogProductOptions = useMemo(() => {
    let list = mergedCatalogProducts;
    if (itemFormState.categoryId) {
      const selectedCat = catalogCategoryOptions.find((c) => String(c.value) === String(itemFormState.categoryId));
      const selectedLabel = (selectedCat ? selectedCat.label : '').toLowerCase();
      const filterVal = String(itemFormState.categoryId).toLowerCase();

      list = list.filter((p) => {
        const pCatId = String(p.categoryId || '').toLowerCase();
        const pCatName = String(p.categoryName || '').toLowerCase();
        return (
          pCatId === filterVal ||
          (selectedLabel && pCatName === selectedLabel) ||
          (selectedLabel && (pCatName.includes(selectedLabel) || selectedLabel.includes(pCatName)))
        );
      });
    }
    return [
      { value: '', label: 'Select Product...' },
      ...list.map((p) => ({
        value: String(p.id),
        label: `${p.productCode ? p.productCode + ' · ' : ''}${p.productName}`,
      })),
    ];
  }, [itemFormState.categoryId, mergedCatalogProducts, catalogCategoryOptions]);

  // Helper: parse dimensions (length, width) from variant object
  const parseDimensionsFromVariant = useCallback((variant) => {
    if (!variant) return { length: 0, width: 0 };
    if (variant.lengthMm && variant.widthMm) {
      return { length: Number(variant.lengthMm), width: Number(variant.widthMm) };
    }
    const str = variant.size || variant.variantDetails || variant.variantName || variant.dimensions || '';
    const match = String(str).match(/(\d+)\s*[x×*]\s*(\d+)/i);
    if (match) {
      return { length: Number(match[1]), width: Number(match[2]) };
    }
    return { length: 0, width: 0 };
  }, []);

  // Helper: calculate flatness tolerance using metrology formula
  const resolveFlatnessTolerance = useCallback((length, width, standard, grade) => {
    if (!length || !standard || !grade) return '—';
    try {
      const res = calculateFlatnessTolerance(length, width, standard, grade);
      if (res && res.isSupported && res.valueMicrons !== undefined) {
        return `${res.valueMicrons} µm`;
      }
    } catch {
      // ignore
    }
    return '—';
  }, []);

  const standardOptions = useMemo(() => {
    const prod = itemFormState.productId ? activeProductObj : null;

    if (prod?.supportedStandards && Array.isArray(prod.supportedStandards) && prod.supportedStandards.length > 0) {
      return prod.supportedStandards.map((std) => ({
        value: std,
        label: std,
      }));
    }

    return (Array.isArray(standardsList) ? standardsList : [])
      .filter((s) => s.isActive !== false)
      .map((s) => ({
        value: s.standardCode || String(s.id),
        label: s.description ? `${s.standardCode} (${s.description})` : s.standardCode,
      }));
  }, [itemFormState.productId, activeProductObj, standardsList]);

  const gradeOptions = useMemo(() => {
    const curStd = String(itemFormState.standards || '').trim();
    if (!curStd) return [];

    // 1. Try gradeMapping from StandardsContext
    const matchedMapping = (gradeMapping || []).find((m) =>
      String(m.standardCode || '').toLowerCase() === curStd.toLowerCase() ||
      String(m.standardId || '') === curStd
    );
    if (matchedMapping && Array.isArray(matchedMapping.grades) && matchedMapping.grades.length > 0) {
      return matchedMapping.grades
        .filter((g) => g.isGradeActive !== false)
        .map((g) => ({
          value: g.gradeCode,
          label: `${g.gradeCode}${g.description ? ` · ${g.description}` : ''}`,
        }));
    }
    return [];
  }, [itemFormState.standards, gradeMapping]);

  const catalogVariantOptions = useMemo(() => {
    if (!itemFormState.productId) return [];
    const dynamicVars = productVariantsMap[itemFormState.productId];
    if (Array.isArray(dynamicVars) && dynamicVars.length > 0) {
      return [
        { value: '', label: 'Select Size / Variant...' },
        ...dynamicVars.map((v) => {
          const sizePart = v.variantDetails || v.variantName || v.name || v.size || '';
          const codePart = v.variantCode || v.itemCode ? ` (${v.variantCode || v.itemCode})` : '';
          return {
            value: String(v.productVariantId ?? v.id),
            label: `${sizePart}${codePart}`,
            variantObj: v,
          };
        }),
      ];
    }
    const prod = mergedCatalogProducts.find((p) => String(p.id) === String(itemFormState.productId));
    if (!prod || !Array.isArray(prod.variants)) return [];
    return [
      { value: '', label: 'Select Size / Variant...' },
      ...prod.variants.map((v) => ({
        value: String(v.productVariantId ?? v.id),
        label: `${v.variantDetails || v.variantName || v.size || ''}${v.itemCode || v.variantCode ? ` (${v.itemCode || v.variantCode})` : ''}`,
        variantObj: v,
      })),
    ];
  }, [itemFormState.productId, productVariantsMap, mergedCatalogProducts]);

  const availableDrawerOptions = useMemo(() => {
    const dynamicOpts = productOptionsMap[itemFormState.productId];
    return (Array.isArray(dynamicOpts) ? dynamicOpts : []).map((opt) => ({
      id: opt.productOptionId ?? opt.id,
      name: opt.optionName || opt.name || '',
      isStandard: Boolean(opt.isStandard),
      unitPrice: Number(opt.unitPrice || 0),
    }));
  }, [itemFormState.productId, productOptionsMap]);
  const editingItemIndex = editingItemId !== null
    ? (form.items || []).findIndex((it, idx) => {
      const id = it.prItemId !== undefined && it.prItemId !== null
        ? it.prItemId
        : it.id !== undefined && it.id !== null
          ? it.id
          : idx;
      return String(id) === String(editingItemId);
    })
    : -1;

  const isEditingItem = editingItemIndex !== -1;

  // Line item multi-select and delete confirmation state
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Selected Inquiry Products grid column widths and resizing
  const MIN_ITEM_COL_WIDTHS = useMemo(() => ({
    select: 40,
    index: 40,
    itemCode: 110,
    product: 180,
    materialFinish: 160,
    options: 130,
    quantity: 60,
    actions: 84,
  }), []);

  const [colWidths, setColWidths] = useState({
    select: 44,
    index: 44,
    itemCode: 150,
    product: 220,
    materialFinish: 180,
    options: 160,
    quantity: 80,
    actions: 96,
  });

  const [resizingCol, setResizingCol] = useState(null);

  const handleStartResize = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();

    const thElement = e.currentTarget.closest('th');
    const startWidth = thElement
      ? Math.round(thElement.getBoundingClientRect().width)
      : (colWidths[colKey] || 100);

    const startX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);

    setResizingCol(colKey);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      const currentX =
        moveEvent.clientX ??
        (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : startX);
      const delta = currentX - startX;
      const minW = MIN_ITEM_COL_WIDTHS[colKey] || 50;
      const newWidth = Math.max(minW, Math.round(startWidth + delta));

      setColWidths((prev) => ({
        ...prev,
        [colKey]: newWidth,
      }));
    };

    const onMouseUp = () => {
      setResizingCol(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);
  };

  const totalTableWidth = useMemo(() => {
    return Object.values(colWidths).reduce((sum, w) => sum + (Number(w) || 0), 0);
  }, [colWidths]);

  const handleToggleOption = (optionObjOrName) => {
    const optName = typeof optionObjOrName === 'object' && optionObjOrName !== null ? optionObjOrName.name : optionObjOrName;
    const optId = typeof optionObjOrName === 'object' && optionObjOrName !== null ? optionObjOrName.id : null;
    const currentOptions = itemFormState.options || [];
    const currentOptionIds = itemFormState.selectedOptionIds || [];

    const isChecked = currentOptions.includes(optName);
    const nextOptions = isChecked
      ? currentOptions.filter((o) => o !== optName)
      : [...currentOptions, optName];

    const isValidDbId = typeof optId === 'number' && !isNaN(optId) && optId > 0;
    const nextOptionIds = isChecked
      ? (isValidDbId ? currentOptionIds.filter((id) => id !== optId) : currentOptionIds)
      : (isValidDbId && !currentOptionIds.includes(optId) ? [...currentOptionIds, optId] : currentOptionIds);

    setItemFormState((prev) => ({
      ...prev,
      selectedOptionIds: nextOptionIds,
    }));
    handleItemFieldChange('options', nextOptions);
  };

  const handleOpenAddItemDrawer = () => {
    resetItemForm();
    setIsItemDrawerOpen(true);
  };

  const handleItemFieldChange = (field, value) => {
    if (field === 'categoryId') {
      const catObj = categories.find((c) => String(c.categoryId || c.id) === String(value));
      setItemFormState((prev) => ({
        ...prev,
        categoryId: value ? Number(value) : '',
        categoryName: catObj?.categoryName || catObj?.name || '',
        productId: '',
        productName: '',
        variantId: '',
        variantName: '',
        itemCode: '',
        dimensions: '',
        grade: '',
        flatness: '',
        material: '',
        finish: '',
        standards: '',
        options: [],
        selectedOptionIds: [],
        specification: '',
      }));
    } else if (field === 'productId') {
      const prod = mergedCatalogProducts.find((p) => String(p.id) === String(value));
      const catObj = prod
        ? (catalogCategoryOptions.find((c) => String(c.value) === String(prod.categoryId)) || null)
        : null;

      setItemFormState((prev) => ({
        ...prev,
        productId: prod?.productId ?? null,
        productName: prod?.productName || '',
        categoryId: prod?.categoryId ?? prev.categoryId,
        categoryName: catObj?.label || prod?.categoryName || prev.categoryName,
        standards: prod?.standardCode || '',
        grade: '',
        variantId: '',
        variantName: '',
        dimensions: '',
        flatness: '',
        itemCode: prod?.productCode || '',
        material: prod?.materialName || '',
        finish: prod?.finishType || '',
        options: [],
        selectedOptionIds: [],
        technicalDetails: prod?.description || prod?.standardInfo || '',
        specification: prod?.suggestedSpecification || '',
      }));
    } else if (field === 'standards') {
      setItemFormState((prev) => ({
        ...prev,
        standards: value || '',
        grade: '',
        flatness: '',
      }));
    } else if (field === 'grade') {
      setItemFormState((prev) => ({
        ...prev,
        grade: value || '',
        flatness: '',
      }));
    } else if (field === 'variantId') {
      const prod = mergedCatalogProducts.find((p) => String(p.id) === String(itemFormState.productId));
      const dynamicVars = productVariantsMap[itemFormState.productId] || [];
      const variant =
        dynamicVars.find((v) => String(v.productVariantId ?? v.id) === String(value)) ||
        prod?.variants?.find((v) => String(v.productVariantId ?? v.id) === String(value)) ||
        null;

      const variantName = variant?.variantDetails || variant?.variantName || variant?.name || variant?.size || '';
      const dimensions = variant?.dimensions || variant?.size || variantName;
      const standard = variant?.standardCode || variant?.standardName || itemFormState.standards || '';
      const grade = variant?.gradeCode || variant?.gradeName || itemFormState.grade || '';
      const dims = parseDimensionsFromVariant(variant);
      const calculatedFlatness = variant && standard && grade
        ? resolveFlatnessTolerance(dims.length, dims.width, standard, grade)
        : '';

      setItemFormState((prev) => ({
        ...prev,
        variantId: variant?.productVariantId ?? variant?.id ?? null,
        variantName,
        dimensions,
        flatness: calculatedFlatness,
        material: variant?.materialName || prod?.materialName || '',
        finish: variant?.finishType || prod?.finishType || '',
        standards: standard,
        grade,
        technicalDetails: variant?.technicalDetails || variant?.description || prod?.standardInfo || '',
        itemCode: variant?.variantCode || prod?.productCode || '',
        specification: variant?.suggestedSpecification || prod?.suggestedSpecification || '',
      }));
    } else if (field === 'options') {
      setItemFormState((prev) => ({
        ...prev,
        options: value,
      }));
    } else {
      setItemFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    if (itemFieldErrors[field]) {
      setItemFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
    inquiryItemErrorCountRef.current = 0;
  };

  const validateItemForm = () => {
    const errs = {};
    if (!itemFormState.productName || !itemFormState.productName.trim()) {
      errs.productName = 'Please select a product';
    }
    if (!itemFormState.variantId) {
      errs.variantId = 'Please select a size / variant';
    }
    if (
      itemFormState.quantity === '' ||
      itemFormState.quantity === null ||
      itemFormState.quantity === undefined ||
      Number(itemFormState.quantity) <= 0 ||
      isNaN(Number(itemFormState.quantity))
    ) {
      errs.quantity = 'Quantity must be greater than 0';
    }

    setItemFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemFieldErrors({});
    setItemFormState({ ...INITIAL_ITEM_ENTRY });
    setIsItemDrawerOpen(false);
    inquiryItemErrorCountRef.current = 0;
  };

  const handleAddOrUpdateItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateItemForm()) {
      inquiryItemErrorCountRef.current += 1;
      toast.error('Please select product, size/variant and enter valid quantity', {
        id: 'inquiry-item-validation-error',
      });
      return;
    }

    inquiryItemErrorCountRef.current = 0;

    const resolvedQty = Number(itemFormState.quantity);
    const resolvedNotes = itemFormState.notes?.trim() || '';

    const itemPayload = {
      prItemId: isEditingItem
        ? (form.items[editingItemIndex]?.prItemId ?? form.items[editingItemIndex]?.id ?? null)
        : null,
      categoryId: itemFormState.categoryId || null,
      categoryName: itemFormState.categoryName || '',
      productId: itemFormState.productId ? Number(itemFormState.productId) : null,
      productVariantId: itemFormState.variantId ? Number(itemFormState.variantId) : null,
      productOptionIds: (itemFormState.selectedOptionIds || []).map(Number).filter((optionId) => Number.isInteger(optionId) && optionId > 0),
      productName: itemFormState.productName || '',
      itemName: itemFormState.itemName || itemFormState.productName || itemFormState.displayName || '',
      variantId: itemFormState.variantId || null,
      variantName: itemFormState.variantName || '',
      dimensions: itemFormState.dimensions || '',
      material: itemFormState.material || '',
      finish: itemFormState.finish || '',
      standards: itemFormState.standards || '',
      grade: itemFormState.grade || '',
      flatness: itemFormState.flatness || '',
      options: itemFormState.options || [],
      technicalDetails: itemFormState.technicalDetails || '',
      itemCode: itemFormState.itemCode || '',
      quantity: resolvedQty,
      notes: resolvedNotes,
      specification: itemFormState.specification?.trim() || resolvedNotes || itemFormState.technicalDetails || '',
    };

    if (isEditingItem) {
      const updated = (form.items || []).map((it, idx) => {
        if (idx === editingItemIndex) {
          return {
            ...it,
            ...itemPayload,
          };
        }
        return it;
      });
      const totalQty = updated.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      setForm((prev) => ({
        ...prev,
        items: updated,
        Quantity: String(totalQty),
      }));
      toast.success('Item updated');
      resetItemForm();
    } else {
      const nextItems = [...(form.items || []), itemPayload];
      const totalQty = nextItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      setForm((prev) => ({
        ...prev,
        items: nextItems,
        Quantity: String(totalQty),
      }));
      toast.success('Item added to inquiry');
      resetItemForm();
    }
  };

  const handleStartEditItem = (item, index) => {
    const id = item.prItemId !== undefined && item.prItemId !== null
      ? item.prItemId
      : item.id !== undefined && item.id !== null
        ? item.id
        : index;

    setEditingItemId(id);
    setItemFieldErrors({});
    setItemFormState({
      prItemId: item.prItemId ?? item.id ?? null,
      categoryId: item.categoryId || '',
      categoryName: item.categoryName || '',
      productId: item.productId ?? null,
      productName: item.productName || item.itemName || '',
      variantId: item.productVariantId ?? item.variantId ?? null,
      variantName: item.variantName || '',
      dimensions: item.dimensions || '',
      material: item.material || '',
      finish: item.finish || '',
      standards: item.standards || '',
      grade: item.grade || '',
      flatness: item.flatness || '',
      options: Array.isArray(item.options) ? item.options.map((option) => typeof option === 'string' ? option : option.optionName || '') : [],
      selectedOptionIds: Array.isArray(item.options)
        ? item.options.map((option) => Number(typeof option === 'object' ? option.productOptionId ?? option.id : option)).filter((optionId) => Number.isInteger(optionId) && optionId > 0)
        : [],
      technicalDetails: item.technicalDetails || '',
      itemCode: item.itemCode || '',
      quantity: item.quantity !== undefined && item.quantity !== null && item.quantity !== '' ? String(item.quantity) : '',
      notes: item.notes || '',
      specification: item.specification || item.notes || '',
    });
    setIsItemDrawerOpen(true);
  };

  // Toggle single item selection for bulk operations
  const handleToggleSelectItem = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all items in table
  const handleToggleSelectAllItems = () => {
    const allIds = (form.items || []).map((it, idx) => (it.prItemId !== undefined && it.prItemId !== null ? it.prItemId : (it.id !== undefined && it.id !== null ? it.id : idx)));
    if (selectedItemIds.size === allIds.length && allIds.length > 0) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(allIds));
    }
  };

  // Confirm single item deletion
  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    const targetIndex = itemToDelete.index;
    const updated = (form.items || []).filter((_, idx) => idx !== targetIndex);
    const totalQty = updated.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    setForm((prev) => ({
      ...prev,
      items: updated,
      Quantity: String(totalQty),
      CategoryId: updated.length > 0 ? (updated[0].categoryId || prev.CategoryId) : '',
      UOM: updated.length > 0 ? (updated[0].uom || updated[0].uomName || prev.UOM) : '',
    }));

    if (editingItemIndex === targetIndex || (itemToDelete.item && (editingItemId === itemToDelete.item.prItemId || editingItemId === itemToDelete.item.id))) {
      resetItemForm();
    }
    toast.success('Item removed from inquiry');
    setItemToDelete(null);
  };

  // Confirm bulk item deletion
  const handleConfirmBulkDelete = () => {
    const count = selectedItemIds.size;
    const updated = (form.items || []).filter((it, idx) => {
      const id = it.prItemId !== undefined && it.prItemId !== null ? it.prItemId : (it.id !== undefined && it.id !== null ? it.id : idx);
      return !selectedItemIds.has(id);
    });
    const totalQty = updated.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    setForm((prev) => ({
      ...prev,
      items: updated,
      Quantity: String(totalQty),
      CategoryId: updated.length > 0 ? (updated[0].categoryId || prev.CategoryId) : '',
      UOM: updated.length > 0 ? (updated[0].uom || updated[0].uomName || prev.UOM) : '',
    }));

    toast.success(`Removed ${count} item${count === 1 ? '' : 's'} from inquiry`);
    if (editingItemId && selectedItemIds.has(editingItemId)) {
      resetItemForm();
    }
    setSelectedItemIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  // Attachment Staging State
  const [stageDocTypeId, setStageDocTypeId] = useState('');
  const [stageDocTitle, setStageDocTitle] = useState('');
  const [stageDocFile, setStageDocFile] = useState(null);
  const [stageDocRemarks, setStageDocRemarks] = useState('');
  const [stageFileError, setStageFileError] = useState('');
  const [stageTitleError, setStageTitleError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const fileInputRef = useRef(null);
  const initializedIdRef = useRef(null);

  // Active document type metadata for staging
  const activeStagedDocType = useMemo(
    () => documentTypes.find(
      (docType) => String(docType.documentTypeId ?? docType.id) === String(stageDocTypeId)
    ) || null,
    [stageDocTypeId, documentTypes]
  );

  // Ensure stageDocTypeId points to a valid loaded active document type
  useEffect(() => {
    const activeTypes = documentTypes.filter((dt) => dt.isActive !== false);
    if (activeTypes.length > 0) {
      const exists = activeTypes.some(
        (dt) => String(dt.id) === String(stageDocTypeId) || String(dt.documentTypeId) === String(stageDocTypeId)
      );
      if (!exists) {
        const firstId = activeTypes[0].documentTypeId ?? activeTypes[0].id;
        if (firstId) setStageDocTypeId(firstId);
      }
    }
  }, [documentTypes, stageDocTypeId]);


  // Build assignee options from UsersContext (No "Leave unassigned" option)
  const userOptions = useMemo(() => {
    return userList.map((u) => ({
      value: u.id,
      label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User',
    }));
  }, [userList]);

  // Initialize form state
  useEffect(() => {
    if (isEdit) {
      if (existingInquiry) {
        if (initializedIdRef.current !== id) {
          initializedIdRef.current = id;

          const mappedItems = Array.isArray(existingInquiry.items)
            ? existingInquiry.items.map((it) => ({
              ...it,
              uom: normalizeUom(it.uom || it.uomName),
              categoryName: it.categoryName || (it.categoryId ? getCategoryPathName(it.categoryId, categories) : ''),
            }))
            : [];

          const loadedRegionId = existingInquiry.RegionId ?? existingInquiry.regionId ?? '';

          const companyMatchName = String(existingInquiry.CustomerName || existingInquiry.companyName || '').trim().toLowerCase();
          const matchedClient = clients.find((c) =>
            (existingInquiry.clientId && (String(c.clientId || c.id) === String(existingInquiry.clientId))) ||
            (companyMatchName && (c.companyName || c.clientName || '').trim().toLowerCase() === companyMatchName)
          );
          const loadedClientId = existingInquiry.clientId ?? (matchedClient ? (matchedClient.clientId || matchedClient.id) : '');
          const loadedClientType = loadedClientId ? 'Existing' : 'New';

          const resolvedCountry = existingInquiry.Country || existingInquiry.countryName || '';
          const resolvedState = existingInquiry.State || existingInquiry.stateName || '';

          const data = {
            clientType: loadedClientType,
            clientId: loadedClientId,
            InquiryNo: existingInquiry.InquiryNo || '',
            InquiryDate: existingInquiry.InquiryDate || existingInquiry.inquiryDate || '',
            Subject: existingInquiry.Subject || '',
            Description: existingInquiry.Description || existingInquiry.detailedSpecification || '',
            Source: existingInquiry.Source || existingInquiry.sourceName || '',
            inquirySourceId: existingInquiry.inquirySourceId ?? null,
            DistributorName: existingInquiry.DistributorName || '',
            Priority: existingInquiry.Priority || existingInquiry.priorityName || '',
            priorityLevelId: existingInquiry.priorityLevelId ?? null,
            CustomerName: existingInquiry.CustomerName || existingInquiry.companyName || '',
            ContactPerson: existingInquiry.ContactPerson || existingInquiry.contactPersonName || '',
            Email: existingInquiry.Email || existingInquiry.email || '',
            Phone: existingInquiry.Phone || existingInquiry.mobileNo || '',
            AlternativePhone: existingInquiry.AlternativePhone || existingInquiry.alternatePhoneNo || '',
            AddressLine1: existingInquiry.AddressLine1 || existingInquiry.address1 || '',
            address1: existingInquiry.address1 || existingInquiry.AddressLine1 || '',
            AddressLine2: existingInquiry.AddressLine2 || existingInquiry.address2 || '',
            address2: existingInquiry.address2 || existingInquiry.AddressLine2 || '',
            City: existingInquiry.City || existingInquiry.city || '',
            city: existingInquiry.city || existingInquiry.City || '',
            State: resolvedState,
            state: resolvedState,
            Country: resolvedCountry,
            country: resolvedCountry,
            countryId: existingInquiry.countryId ?? null,
            stateId: existingInquiry.stateId ?? null,
            parentRegionId: '',
            RegionId: loadedRegionId,
            CategoryId: existingInquiry.CategoryId || (mappedItems[0]?.categoryId || ''),
            Quantity: existingInquiry.Quantity !== undefined ? String(existingInquiry.Quantity) : '',
            UOM: normalizeUom(existingInquiry.UOM || mappedItems[0]?.uom || ''),
            EstimatedValue: existingInquiry.EstimatedValue !== undefined ? String(existingInquiry.EstimatedValue) : '',
            RequiredByDate: existingInquiry.RequiredByDate || existingInquiry.EstimateDate || existingInquiry.estimateDate || '',
            items: mappedItems,
            AssignedTo: existingInquiry.AssignedTo ?? existingInquiry.assignedToUserId ?? '',
            StatusId: existingInquiry.StatusId || existingInquiry.status || '',
            initialComment: '',
            attachments: [],
          };
          setForm(data);
          setErrors({});

        }
      }
    } else {
      if (initializedIdRef.current !== 'new') {
        initializedIdRef.current = 'new';
        const data = {
          ...INITIAL_FORM,
          clientType: 'New',
          clientId: '',
          attachments: [],
        };
        setForm(data);
        setErrors({});
        getNextInquiryNo(data.InquiryDate)
          .then((generatedNo) => {
            setForm((prev) => ({ ...prev, InquiryNo: generatedNo }));
          })
          .catch((err) => {
            console.error('Failed to load next inquiry number:', err);
            toast.error(err?.message || 'Failed to load next inquiry number.');
          });
      }
    }
  }, [isEdit, id, existingInquiry, getNextInquiryNo, clients, categories]);

  useEffect(() => {
    if (isEdit || !defaultPriorityLevelId || form.priorityLevelId) return;
    const defaultPriority = priorityLevels.find(
      (priority) => String(priority.id) === String(defaultPriorityLevelId)
    );
    if (defaultPriority) {
      setForm((prev) => ({
        ...prev,
        Priority: defaultPriority.priorityName || defaultPriority.name || '',
        priorityLevelId: defaultPriority.id,
      }));
    }
  }, [isEdit, defaultPriorityLevelId, priorityLevels, form.priorityLevelId]);

  // Document type options for Select (active document types only)
  const docTypeOptions = useMemo(() => {
    return documentTypes
      .filter((dt) => dt.isActive !== false)
      .map((dt) => {
        const docId = dt.documentTypeId ?? dt.id;
        const exts = formatAllowedExtensions(dt, ', ');
        return {
          value: docId,
          label: `${dt.documentTypeName || dt.typeName}${dt.isMandatory ? ' (Required)' : ''}${exts ? ` [${exts}]` : ''}`,
        };
      });
  }, [documentTypes]);

  const [countries, setCountries] = useState([]);
  const [statesCache, setStatesCache] = useState({});
  const [loadingStatesMap, setLoadingStatesMap] = useState({});
  useEffect(() => {
    let isMounted = true;
    async function loadCountries() {
      try {
        const result = await geographyService.listCountries({ isActive: true });
        if (isMounted) setCountries(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error('Failed to load countries for inquiry:', err);
        if (isMounted) {
          setCountries([]);
          toast.error(err?.message || 'Failed to load countries.');
        }
      }
    }
    loadCountries();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchStatesForCountry = useCallback(async (countryId) => {
    const numericCountryId = Number(countryId);
    if (!Number.isInteger(numericCountryId) || numericCountryId <= 0) return [];
    const key = String(numericCountryId);
    if (Object.prototype.hasOwnProperty.call(statesCache, key)) return statesCache[key];

    setLoadingStatesMap((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await geographyService.listStates(numericCountryId, { isActive: true });
      const states = Array.isArray(result) ? result : [];
      setStatesCache((prev) => ({ ...prev, [key]: states }));
      return states;
    } catch (err) {
      console.error(`Failed to load states for country ${numericCountryId}:`, err);
      toast.error(err?.message || 'Failed to load states.');
      return [];
    } finally {
      setLoadingStatesMap((prev) => ({ ...prev, [key]: false }));
    }
  }, [statesCache]);

  // Find selected country object
  const selectedCountryObj = useMemo(() => {
    return countries.find(
      (country) =>
        (form.countryId && Number(country.id) === Number(form.countryId)) ||
        (form.Country && country.countryName?.toLowerCase() === form.Country.toLowerCase())
    ) || null;
  }, [form.Country, form.countryId, countries]);

  // Formatted options for Country SearchableSelect
  const countryDropdownOptions = useMemo(() => {
    return countries.map((c) => ({
      value: c.countryName,
      label: c.countryName,
    }));
  }, [countries]);

  // Fetch states on demand when a country is selected
  useEffect(() => {
    if (selectedCountryObj?.id) fetchStatesForCountry(selectedCountryObj.id);
  }, [selectedCountryObj, fetchStatesForCountry]);

  // Formatted options for State SearchableSelect
  const stateDropdownOptions = useMemo(() => {
    const list = selectedCountryObj ? statesCache[String(selectedCountryObj.id)] || [] : [];
    return list.map((s) => ({
      value: s.stateName,
      label: s.stateName,
    }));
  }, [selectedCountryObj, statesCache]);

  const handleCountrySelect = (e) => {
    const val = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const nextVal = typeof val === 'object' && val !== null ? val.value || '' : String(val || '');
    const matchedCountry = countries.find(
      (c) => String(c.id) === String(nextVal) || c.countryName?.toLowerCase() === nextVal.toLowerCase()
    );
    if (nextVal && !matchedCountry) {
      toast.error('Select a country returned by the API.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      Country: matchedCountry?.countryName || '',
      countryId: matchedCountry?.id ?? null,
      State: '',
      stateId: null,
    }));
    if (errors.Country || errors.State) {
      setErrors((prev) => ({ ...prev, Country: '', State: '' }));
    }
  };

  const handleStateSelect = (e) => {
    const val = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const nextVal = typeof val === 'object' && val !== null ? val.value || '' : String(val || '');
    const currentStates = selectedCountryObj ? statesCache[String(selectedCountryObj.id)] || [] : [];
    const matchedState = currentStates.find(
      (s) => String(s.id) === String(nextVal) || s.stateName?.toLowerCase() === nextVal.toLowerCase()
    );
    if (nextVal && !matchedState) {
      toast.error('Select a state returned by the API.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      State: matchedState?.stateName || '',
      stateId: matchedState?.id ?? null,
    }));
    if (errors.State) {
      setErrors((prev) => ({ ...prev, State: '' }));
    }
  };

  function handleChange(e) {
    const { name, value } = e.target;
    let extra = {};
    if (name === 'Source') {
      const match = dynamicSourceOptions.find((s) => s.value === value);
      extra.inquirySourceId = match?.id ?? null;
    } else if (name === 'Priority') {
      const match = dynamicPriorityOptions.find((p) => p.value === value);
      extra.priorityLevelId = match?.id ?? null;
    }
    setForm((prev) => ({ ...prev, [name]: value, ...extra }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (name === 'Source' && value !== 'Distributor' && errors.DistributorName) {
      setErrors((prev) => ({ ...prev, DistributorName: '' }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    const err = validateField(name, value);
    if (err) setErrors((prev) => ({ ...prev, [name]: err }));
  }

  function handleCancel() {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/inquiries');
    }
  }

  function handleNextTab() {
    if (isItemDrawerOpen) {
      toast.error('You have the product drawer open. Please save or close it before continuing.');
      return;
    }
    setActiveTab('assignment_documents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePrevTab() {
    setActiveTab('inquiry_customer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Attachment Validation & Addition ──
  function validateFile(file, docType) {
    if (!file) return 'Please select a file.';

    const fileName = file.name || '';
    const extIndex = fileName.lastIndexOf('.');
    const ext = extIndex >= 0 ? fileName.slice(extIndex).toLowerCase() : '';

    const allowed = getAllowedExtensionsArray(docType).map((e) => e.toLowerCase());
    if (allowed.length > 0 && !allowed.includes(ext)) {
      return `Only ${allowed.join(', ')} files allowed for ${docType?.documentTypeName || docType?.typeName || 'this document type'}.`;
    }

    const maxSizeMB = Number(docType?.maxFileSizeMB ?? docType?.maxSizeMB);
    if (!Number.isFinite(maxSizeMB) || maxSizeMB <= 0) {
      return 'Upload size limit is unavailable for this document type.';
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File exceeds ${maxSizeMB}MB limit.`;
    }

    return '';
  }

  function handleFileSelected(file) {
    if (!file) return;
    const err = validateFile(file, activeStagedDocType);
    setStageDocFile(file);
    setStageFileError(err);

    if (!stageDocTitle.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setStageDocTitle(baseName);
      setStageTitleError('');
    }
  }

  function handleAddAttachment() {
    if (!stageDocTitle.trim()) {
      setStageTitleError('Please enter a document title.');
      return;
    }
    if (!stageDocFile) {
      setStageFileError('Please select a file to attach.');
      return;
    }
    const err = validateFile(stageDocFile, activeStagedDocType);
    if (err) {
      setStageFileError(err);
      return;
    }

    const newAtt = {
      documentTypeId: stageDocTypeId,
      documentTitle: stageDocTitle.trim(),
      file: stageDocFile,
      fileName: stageDocFile.name,
      fileSizeKB: Math.round(stageDocFile.size / 1024),
      remarks: stageDocRemarks.trim(),
    };

    setForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAtt],
    }));

    // Reset staging
    setStageDocFile(null);
    setStageDocTitle('');
    setStageDocRemarks('');
    setStageFileError('');
    setStageTitleError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleRemoveAttachment(indexToRemove) {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, index) => index !== indexToRemove),
    }));
  }

  const renderFileExtIcon = (fileName = '') => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return <IconFileText size={16} className="text-danger shrink-0" />;
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return <IconFileText size={16} className="text-primary shrink-0" />;
    if (lower.endsWith('.dwg') || lower.endsWith('.dxf')) return <IconLayers size={16} className="text-primary shrink-0" />;
    return <IconFile size={16} className="text-text-muted shrink-0" />;
  };

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      const hasStep1Err = Object.keys(fieldErrors).some((k) => step1Fields.includes(k));
      if (hasStep1Err) {
        setActiveTab('inquiry_customer');
        toast.error('Please complete all required fields in Inquiry & Customer Details.');
      } else if (fieldErrors.AssignedTo) {
        setActiveTab('assignment_documents');
        toast.error('Please select an assignee in Assignment & Documents.');
      } else {
        toast.error('Please complete all required fields before saving.');
      }
      setTimeout(() => {
        const firstErrorField = Object.keys(fieldErrors)[0];
        const el = document.getElementById(firstErrorField);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus?.();
        }
      }, 50);
      return;
    }

    if (isItemDrawerOpen) {
      toast.error('You have the product drawer open. Please save or close it before continuing.');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && existingInquiry) {
        const inquiryId = existingInquiry.id || existingInquiry.InquiryId;
        const res = await updateInquiry(inquiryId, form);
        if (res.ok) {
          if (form.initialComment?.trim()) {
            addInquiryComment(inquiryId, form.initialComment.trim());
          }
          // Add any newly staged attachments
          if (form.attachments && form.attachments.length > 0) {
            for (const att of form.attachments) {
              await addDocument(inquiryId, {
                documentTypeId: att.documentTypeId,
                documentTitle: att.documentTitle,
                file: att.file,
                remarks: att.remarks,
              });
            }
          }
          navigate(`/inquiries/${inquiryId}`, { replace: true });
        }
      } else {
        const res = await addInquiry(form);
        if (res.ok && res.inquiry) {
          const newInquiryId = res.inquiry.id || res.inquiry.InquiryId;
          // Add attached documents to new inquiry
          if (form.attachments && form.attachments.length > 0) {
            for (const att of form.attachments) {
              await addDocument(newInquiryId, {
                documentTypeId: att.documentTypeId,
                documentTitle: att.documentTitle,
                file: att.file,
                remarks: att.remarks,
              });
            }
          }
          navigate(`/inquiries/${newInquiryId}`, { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && !existingInquiry) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">
            {isLoadingInquiry ? 'Loading Inquiry' : 'Unable to Load Inquiry'}
          </h2>
          <p className="text-sm text-text-muted">
            {isLoadingInquiry
              ? 'Loading the complete inquiry record from the API.'
              : inquiryLoadError || `The complete inquiry record with ID "${id}" is unavailable.`}
          </p>
          <Button variant="primary" onClick={() => navigate('/inquiries')}>
            Back to Inquiries
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-20">
      {/* ── Top Page Header & Navigation ── */}
      <PageHeader
        title={isEdit ? `Edit Inquiry: ${existingInquiry?.InquiryNo}` : 'Create Inquiry'}
        icon={<IconInquiry className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={handleCancel}
          >
            Back to Inquiries
          </Button>
        }
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
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
              {isEdit ? 'Save Changes' : 'Save Inquiry'}
            </SaveButton>
          </div>
        }
      />

      {/* ── TABS NAVIGATION BAR (Scrollable and consistent with ClientFormPage) ── */}
      <ScrollableTabs
        variant="pills"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'inquiry_customer',
            label: 'Inquiry & Customer Details',
            icon: IconInquiry,
            badge: form.items?.length > 0 ? form.items.length : undefined,
            hasError: hasTab1Errors,
          },
          {
            id: 'assignment_documents',
            label: 'Assignment & Documents',
            icon: IconUserCheck,
            badge: (form.attachments?.length || 0) > 0 ? form.attachments.length : undefined,
            hasError: hasTab2Errors,
          },
        ]}
      />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1 CONTENT: INQUIRY & CUSTOMER DETAILS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inquiry_customer' && (
        <div className="space-y-6">
          {/* ── SECTION 1: INQUIRY DETAILS ── */}
          <CollapsibleCard
            title="1. Inquiry Details"
            subtitle="Reference code, date, estimate date & priority"
            icon={<IconFileText size={18} />}
            className="bg-bg"
            defaultOpen={true}
            hasError={Boolean(errors.InquiryDate || errors.RegionId || errors.DistributorName)}
            badge={
              form.InquiryNo ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center font-mono font-bold text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                    {form.InquiryNo}
                  </span>
                  <Badge variant="neutral" size="sm" className="font-medium text-2xs">
                    System Generated
                  </Badge>
                </div>
              ) : null
            }
          >

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* Inquiry Date */}
                <DatePicker
                  id="InquiryDate"
                  name="InquiryDate"
                  label="Inquiry Date"
                  required
                  value={form.InquiryDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.InquiryDate}
                  hint="Date request received"
                />

                {/* Estimate Date */}
                <DatePicker
                  id="RequiredByDate"
                  name="RequiredByDate"
                  label="Estimate Date"
                  value={form.RequiredByDate}
                  onChange={handleChange}
                  hint="Target estimated delivery date"
                />

                {/* Sales Region */}
                <SearchableSelect
                  id="RegionId"
                  name="RegionId"
                  label="Region"
                  placeholder="-- Select Region --"
                  searchPlaceholder="Search regions..."
                  required
                  options={regionOptions}
                  value={form.RegionId}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.RegionId}
                />

                {/* Source */}
                <SearchableSelect
                  id="Source"
                  name="Source"
                  label="Inquiry Source"
                  options={dynamicSourceOptions}
                  value={form.Source}
                  onChange={handleChange}
                  required
                  error={errors.Source}
                />

                {/* Distributor Name */}
                {form.Source === 'Distributor' && (
                  <Input
                    id="DistributorName"
                    name="DistributorName"
                    type="text"
                    label="Distributor Name"
                    placeholder="e.g. Apex Industrial Solutions"
                    required
                    value={form.DistributorName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.DistributorName}
                    hint="Associated distributor"
                  />
                )}

                {/* Priority */}
                <SearchableSelect
                  id="Priority"
                  name="Priority"
                  label="Priority Level"
                  options={dynamicPriorityOptions}
                  value={form.Priority}
                  onChange={handleChange}
                  required
                  error={errors.Priority}
                />
              </div>

              {/* Description (Rich Text Editor) */}
              <RichTextEditor
                id="Description"
                name="Description"
                label="Detailed Specifications"
                value={form.Description}
                onChange={handleChange}
                placeholder="Provide technical specifications, tolerances, material grade, delivery expectations, drawing numbers, or testing requirements..."
                hint="Use the formatting toolbar for lists, bold specifications, headings, and quotes."
              />
            </div>
          </CollapsibleCard>

          {/* ── SECTION 2: CUSTOMER INFORMATION ── */}
          <CollapsibleCard
            title="2. Customer Information"
            subtitle="Company profile, contact persons & address details"
            icon={<IconUser size={18} />}
            className="bg-bg"
            defaultOpen={true}
            hasError={Boolean(errors.CustomerName || errors.ContactPerson || errors.Email || errors.Phone)}
          >

            <div className="space-y-4 sm:space-y-5">
              {/* 3-Column Grid for All Customer Information Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* 1. Client Type Dropdown (SearchableSelect) */}
                <SearchableSelect
                  id="clientType"
                  name="clientType"
                  label="Client Type"
                  options={CLIENT_TYPE_OPTIONS}
                  value={form.clientType}
                  onChange={handleClientTypeChange}
                  placeholder="Select client type..."
                  searchPlaceholder="Search client type..."
                  hint="Choose whether inquiry is from a new or existing client"
                />

                {/* 2. Customer / Company Name */}
                {form.clientType === 'Existing' ? (
                  <SearchableSelect
                    id="CustomerName"
                    name="CustomerName"
                    label="Company Name"
                    placeholder="Select an existing client..."
                    searchPlaceholder="Search clients by company name..."
                    required
                    options={clientOptions}
                    value={form.clientId}
                    onChange={(val) => handleClientSelect(val)}
                    onBlur={handleBlur}
                    error={errors.CustomerName}
                    hint={
                      form.clientId
                        ? 'Client selected. Contact person, email, and phone auto-filled.'
                        : 'Select an existing registered client from the master list.'
                    }
                  />
                ) : (
                  <Input
                    id="CustomerName"
                    name="CustomerName"
                    type="text"
                    label="Company Name"
                    placeholder="e.g. Precision AutoWorks India Ltd"
                    required
                    value={form.CustomerName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.CustomerName}
                    autoComplete="organization"
                    hint="Enter the company name for this new customer."
                  />
                )}

                {/* 3. Contact Person Name */}
                <Input
                  id="ContactPerson"
                  name="ContactPerson"
                  type="text"
                  label="Contact Person Name"
                  placeholder="e.g. Rajesh Nair"
                  value={form.ContactPerson}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="name"
                />

                {/* 4. Email Address */}
                <Input
                  id="Email"
                  name="Email"
                  type="email"
                  label="Email Address"
                  placeholder="contact@customer.com"
                  value={form.Email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.Email}
                  autoComplete="email"
                />

                {/* 5. Phone / Mobile Number */}
                <Input
                  id="Phone"
                  name="Phone"
                  type="tel"
                  label="Mobile Number"
                  placeholder="9823012345"
                  value={form.Phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.Phone}
                  className="font-mono tabular-nums"
                  autoComplete="tel"
                />

                {/* 6. Alternative Phone */}
                <Input
                  id="AlternativePhone"
                  name="AlternativePhone"
                  type="tel"
                  label="Alternative Phone"
                  placeholder="9823098765"
                  value={form.AlternativePhone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.AlternativePhone}
                  className="font-mono tabular-nums"
                  autoComplete="tel"
                />

                {/* 7. City */}
                <Input
                  id="City"
                  name="City"
                  type="text"
                  label="City"
                  placeholder="e.g. Vadodara"
                  value={form.City}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="address-level2"
                />

                {/* 8. State / Province (SearchableSelect) */}
                <SearchableSelect
                  id="State"
                  name="State"
                  label="State / Province"
                  placeholder={
                    selectedCountryObj && loadingStatesMap[selectedCountryObj.id]
                      ? 'Loading states...'
                      : stateDropdownOptions.length === 0
                        ? 'No states available'
                        : 'Select state...'
                  }
                  searchPlaceholder="Search states..."
                  emptyText="No states found"
                  options={stateDropdownOptions}
                  value={form.State || ''}
                  onChange={handleStateSelect}
                  error={errors.State}
                  disabled={stateDropdownOptions.length === 0}
                />

                {/* 9. Country (SearchableSelect) */}
                <SearchableSelect
                  id="Country"
                  name="Country"
                  label="Country"
                  placeholder="Select country..."
                  searchPlaceholder="Search countries..."
                  emptyText="No countries found"
                  options={countryDropdownOptions}
                  value={form.Country}
                  onChange={handleCountrySelect}
                  error={errors.Country}
                />

                {/* 10. Address Line 1 */}
                <Input
                  id="AddressLine1"
                  name="AddressLine1"
                  type="text"
                  label="Address Line 1"
                  placeholder="e.g. Plot No. 42, GIDC Industrial Estate"
                  value={form.AddressLine1}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="address-line1"
                />

                {/* 11. Address Line 2 */}
                <Input
                  id="AddressLine2"
                  name="AddressLine2"
                  type="text"
                  label="Address Line 2"
                  placeholder="e.g. Phase II, Near Express Highway"
                  value={form.AddressLine2}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="address-line2"
                />
              </div>
            </div>
          </CollapsibleCard>

          {/* ── SECTION 3: PRODUCT SELECTION ── */}
          <CollapsibleCard
            title="3. Product Selection"
            subtitle="Pick a product and size, enter the quantity. Can be specified later."
            icon={<IconPackage size={18} />}
            className="bg-bg"
            bodyClassName="space-y-5"
            defaultOpen={true}
            badge={
              <span className="text-2xs font-medium text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
                Optional
              </span>
            }
          >
            {/* Selected Inquiry Products Grid Table */}
            <div className="rounded-xl border border-border overflow-hidden bg-bg">
              <div className="p-3.5 bg-surface/80 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-heading uppercase tracking-wider">
                    Selected Inquiry Products
                  </span>
                  <Badge variant="role" className="text-2xs px-2 py-0.5 font-mono">
                    {(form.items || []).length} {(form.items || []).length === 1 ? 'Item' : 'Items'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  {selectedItemIds.size > 0 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      className="text-xs h-7 px-2.5 shadow-xs cursor-pointer"
                    >
                      <IconDelete size={13} className="mr-1.5" />
                      Delete Selected ({selectedItemIds.size})
                    </Button>
                  )}

                  {(form.items || []).length > 0 && (
                    <div className="text-xs text-text-muted font-mono flex items-center gap-1.5">
                      <span>Total Qty:</span>
                      <strong className="text-heading font-semibold">
                        {(form.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)}
                      </strong>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={IconAdd}
                    onClick={handleOpenAddItemDrawer}
                    className="text-xs h-7 px-3 font-semibold shadow-xs cursor-pointer"
                  >
                    Add Product
                  </Button>
                </div>
              </div>

              {(form.items || []).length > 0 ? (
                <>
                  {/* Desktop / Tablet Table View (md+) */}
                  <div className="hidden md:block">
                    <TableContainer
                      tableStyle={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
                      tableClassName="w-full text-left border-collapse text-xs table-fixed"
                    >
                      <colgroup>
                        <col style={{ width: `${colWidths.select}px` }} />
                        <col style={{ width: `${colWidths.index}px` }} />
                        <col style={{ width: `${colWidths.itemCode}px` }} />
                        <col style={{ width: `${colWidths.product}px` }} />
                        <col style={{ width: `${colWidths.materialFinish}px` }} />
                        <col style={{ width: `${colWidths.options}px` }} />
                        <col style={{ width: `${colWidths.quantity}px` }} />
                        <col style={{ width: `${colWidths.actions}px` }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <Th style={{ width: `${colWidths.select}px` }} className="text-center px-2">
                            <Checkbox
                              checked={
                                (form.items || []).length > 0 &&
                                selectedItemIds.size === (form.items || []).length
                              }
                              onChange={handleToggleSelectAllItems}
                              aria-label="Select all products"
                            />
                          </Th>
                          <Th style={{ width: `${colWidths.index}px` }} className="text-center px-2">#</Th>
                          <Th
                            style={{ width: `${colWidths.itemCode}px` }}
                            isResizing={resizingCol === 'itemCode'}
                            resizeHandler={(e) => handleStartResize(e, 'itemCode')}
                          >
                            ITEM CODE
                          </Th>
                          <Th
                            style={{ width: `${colWidths.product}px` }}
                            isResizing={resizingCol === 'product'}
                            resizeHandler={(e) => handleStartResize(e, 'product')}
                          >
                            PRODUCT / VARIANT
                          </Th>
                          <Th
                            style={{ width: `${colWidths.materialFinish}px` }}
                            isResizing={resizingCol === 'materialFinish'}
                            resizeHandler={(e) => handleStartResize(e, 'materialFinish')}
                          >
                            MATERIAL · FINISH
                          </Th>
                          <Th
                            style={{ width: `${colWidths.options}px` }}
                            isResizing={resizingCol === 'options'}
                            resizeHandler={(e) => handleStartResize(e, 'options')}
                          >
                            OPTIONS
                          </Th>
                          <Th
                            style={{ width: `${colWidths.quantity}px` }}
                            isResizing={resizingCol === 'quantity'}
                            resizeHandler={(e) => handleStartResize(e, 'quantity')}
                            className="text-center"
                          >
                            QTY
                          </Th>
                          <Th
                            style={{ width: `${colWidths.actions}px` }}
                            isResizing={resizingCol === 'actions'}
                            resizeHandler={(e) => handleStartResize(e, 'actions')}
                            className="text-right"
                          >
                            ACTIONS
                          </Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(form.items || []).map((item, idx) => {
                          const itemId = item.prItemId !== undefined && item.prItemId !== null ? item.prItemId : (item.id !== undefined && item.id !== null ? item.id : idx);
                          const isRowSelected = selectedItemIds.has(itemId);
                          return (
                            <tr
                              key={itemId}
                              className={`hover:bg-surface/50 transition-colors ${isRowSelected ? 'bg-primary/[0.04]' : ''
                                }`}
                            >
                              <Td className="text-center">
                                <Checkbox
                                  checked={isRowSelected}
                                  onChange={() => handleToggleSelectItem(itemId)}
                                  aria-label={`Select item ${idx + 1}`}
                                />
                              </Td>
                              <Td className="text-center font-mono text-xs text-text-muted">
                                {idx + 1}
                              </Td>
                              <Td className="text-xs font-mono font-medium text-primary truncate" title={item.itemCode || '—'}>
                                {item.itemCode || '—'}
                              </Td>
                              <Td className="text-xs">
                                <div className="font-bold text-heading truncate" title={item.productName || item.itemName || ''}>
                                  {item.productName || item.itemName || '—'}
                                </div>
                                <div className="text-2xs text-text-muted truncate" title={item.variantName || ''}>
                                  {item.variantName || '—'}
                                </div>
                              </Td>
                              <Td className="text-xs">
                                <div className="font-medium text-text truncate" title={item.material || ''}>
                                  {item.material || '—'}
                                </div>
                                <div className="text-2xs text-text-muted truncate">
                                  {[item.finish, item.standards].filter(Boolean).join(' · ') || '—'}
                                </div>
                              </Td>
                              <Td className="text-xs">
                                {Array.isArray(item.options) && item.options.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-full">
                                    {item.options.map((opt, oIdx) => (
                                      <span
                                        key={oIdx}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-medium bg-surface-hover text-text-muted border border-border truncate max-w-[130px]"
                                        title={opt}
                                      >
                                        {opt.replace(' (Standard)', '')}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-text-muted/60 text-2xs italic">None</span>
                                )}
                              </Td>
                              <Td className="text-center font-mono tabular-nums text-xs font-bold text-heading">
                                {item.quantity}
                              </Td>
                              <Td className="text-right whitespace-nowrap">
                                <TableActions
                                  onEdit={() => handleStartEditItem(item, idx)}
                                  onDelete={() => setItemToDelete({ item, index: idx })}
                                  editTooltip="Edit Product"
                                  deleteTooltip="Remove Product"
                                  className="justify-end shrink-0"
                                />
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </TableContainer>
                  </div>

                  {/* Mobile Stacked Card View (< md) */}
                  <div className="block md:hidden divide-y divide-border">
                    {(form.items || []).map((item, idx) => {
                      const itemId = item.prItemId !== undefined && item.prItemId !== null ? item.prItemId : (item.id !== undefined && item.id !== null ? item.id : idx);
                      const isRowSelected = selectedItemIds.has(itemId);
                      return (
                        <div
                          key={itemId}
                          className={`p-3.5 space-y-2.5 transition-colors ${isRowSelected ? 'bg-primary/[0.04]' : 'hover:bg-surface/40'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Checkbox
                                checked={isRowSelected}
                                onChange={() => handleToggleSelectItem(itemId)}
                                aria-label={`Select item ${idx + 1}`}
                              />
                              <span className="font-mono text-2xs text-text-muted">#{idx + 1}</span>
                              <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md truncate">
                                {item.itemCode || '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <IconButton
                                icon={IconEdit}
                                size="sm"
                                variant="ghost"
                                title="Edit Item"
                                aria-label="Edit Item"
                                onClick={() => handleStartEditItem(item, idx)}
                              />
                              <IconButton
                                icon={IconDelete}
                                size="sm"
                                variant="ghost"
                                title="Remove Item"
                                aria-label="Remove Item"
                                onClick={() => setItemToDelete({ item, index: idx })}
                                className="hover:text-danger hover:bg-danger/10"
                              />
                            </div>
                          </div>

                          <div className="text-xs space-y-1">
                            <div className="font-bold text-heading text-sm">
                              {item.productName || item.itemName || '—'}
                            </div>
                            <div className="text-text-muted">
                              Size / Variant: <span className="font-medium text-heading">{item.variantName || '—'}</span>
                            </div>
                            <div className="text-text-muted text-2xs">
                              Material: {item.material || '—'} · {[item.finish, item.standards].filter(Boolean).join(' · ') || '—'}
                            </div>
                            {Array.isArray(item.options) && item.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {item.options.map((opt, oIdx) => (
                                  <span
                                    key={oIdx}
                                    className="px-1.5 py-0.5 rounded text-3xs font-medium bg-surface text-text-muted border border-border"
                                  >
                                    {opt.replace(' (Standard)', '')}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.specification && (
                              <div className="text-text-muted text-2xs bg-surface/60 p-2 rounded border border-border/60 break-words mt-1">
                                Spec: {item.specification}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60 font-mono">
                            <span className="text-text-muted">Quantity:</span>
                            <span className="font-bold text-heading text-sm">
                              {item.quantity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-10 px-4 text-center text-text-muted text-xs space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <IconPackage size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-heading">No items added to inquiry yet</p>
                    <p className="text-text-muted max-w-sm mx-auto">
                      Add products from the catalog to build this inquiry's product list.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={IconAdd}
                    onClick={handleOpenAddItemDrawer}
                    className="font-semibold shadow-xs text-xs cursor-pointer"
                  >
                    Add First Product
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleCard>

          {/* ── DRAWER: ADD / EDIT PRODUCT ── */}
          <Drawer
            isOpen={isItemDrawerOpen}
            onClose={resetItemForm}
            title={editingItemId ? 'Edit Inquiry Item' : 'Add Item to Inquiry'}
            subtitle="Select a catalog product, size variant, options, and enter quantity."
            icon={IconPackage}
            size="xl"
            footer={
              <div className="flex items-center justify-between w-full gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={resetItemForm}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={editingItemId ? IconCheck : IconAdd}
                  onClick={handleAddOrUpdateItem}
                  className="font-semibold shadow-xs cursor-pointer"
                >
                  {editingItemId ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            }
          >
            <div className="space-y-5 p-1 sm:p-2">
              {/* Product Selection Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <SearchableSelect
                  id="drawer-item-category"
                  label="Category"
                  options={catalogCategoryOptions}
                  value={itemFormState.categoryId || ''}
                  placeholder="Select category..."
                  searchPlaceholder="Search categories..."
                  onChange={(e) => handleItemFieldChange('categoryId', e.target.value)}
                />

                {/* Product Name */}
                <SearchableSelect
                  id="drawer-item-product"
                  label="Product Name"
                  required
                  options={catalogProductOptions}
                  value={itemFormState.productId || ''}
                  placeholder="Select product..."
                  searchPlaceholder="Search products..."
                  error={itemFieldErrors.productName}
                  onChange={(e) => handleItemFieldChange('productId', e.target.value)}
                />

                {/* Manufacturing Standard */}
                <SearchableSelect
                  id="drawer-item-standard"
                  label="Manufacturing Standard"
                  options={standardOptions}
                  value={itemFormState.standards || ''}
                  placeholder={!itemFormState.productId ? 'Select product first' : 'Select standard...'}
                  searchPlaceholder="Search standard..."
                  disabled={!itemFormState.productId}
                  onChange={(e) => handleItemFieldChange('standards', e.target.value)}
                />

                {/* Grade / Accuracy */}
                <SearchableSelect
                  id="drawer-item-grade"
                  label="Grade / Accuracy"
                  options={gradeOptions}
                  value={itemFormState.grade || ''}
                  placeholder={!itemFormState.productId ? 'Select product first' : !itemFormState.standards ? 'Select standard first' : 'Select grade...'}
                  searchPlaceholder="Search grade..."
                  disabled={!itemFormState.productId || !itemFormState.standards}
                  onChange={(e) => handleItemFieldChange('grade', e.target.value)}
                />

                {/* Size / Variant */}
                <SearchableSelect
                  id="drawer-item-variant"
                  label="Size / Variant"
                  required
                  options={catalogVariantOptions}
                  value={itemFormState.variantId || ''}
                  placeholder={!itemFormState.productId ? 'Select product first' : 'Select size / variant...'}
                  searchPlaceholder="Search size / variant..."
                  disabled={!itemFormState.productId}
                  error={itemFieldErrors.variantId}
                  onChange={(e) => handleItemFieldChange('variantId', e.target.value)}
                />

                {/* Quantity */}
                <div>
                  <Input
                    id="drawer-item-qty"
                    label="Quantity"
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={itemFormState.quantity !== undefined && itemFormState.quantity !== null ? itemFormState.quantity : '1'}
                    error={itemFieldErrors.quantity}
                    onChange={(e) => handleItemFieldChange('quantity', e.target.value)}
                  />
                </div>

                {/* Item Code (Auto-populated, Read Only) */}
                <div className="sm:col-span-2">
                  <Input
                    id="drawer-item-code"
                    label="Item Code"
                    readOnly
                    disabled
                    value={itemFormState.itemCode || ''}
                    className="font-mono text-xs bg-surface/70 text-text-muted cursor-not-allowed select-none"
                    hint="Automatically assigned from catalog variant"
                  />
                </div>
              </div>

              {/* Read-only Variant Details Card */}
              {itemFormState.productId && (
                <div className="rounded-xl border border-border bg-surface/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/70 pb-2">
                    <span className="text-xs font-bold text-heading uppercase tracking-wider">
                      Technical Details
                    </span>
                    <span className="text-2xs text-text-muted/70 italic">(Auto-populated)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-2xs text-text-muted">Material</div>
                      <div className="font-semibold text-heading truncate">{itemFormState.material || '—'}</div>
                    </div>
                    <div>
                      <div className="text-2xs text-text-muted">Finish</div>
                      <div className="font-semibold text-heading truncate">{itemFormState.finish || '—'}</div>
                    </div>
                    <div>
                      <div className="text-2xs text-text-muted">Standard</div>
                      <div className="font-semibold text-heading truncate">{itemFormState.standards || '—'}</div>
                    </div>
                    <div>
                      <div className="text-2xs text-text-muted">Grade</div>
                      <div className="font-semibold text-heading truncate">{itemFormState.grade || '—'}</div>
                    </div>
                    <div>
                      <div className="text-2xs text-text-muted">Flatness / Tolerance</div>
                      <div className="font-semibold text-heading truncate">{itemFormState.flatness || '—'}</div>
                    </div>
                    <div>
                      <div className="text-2xs text-text-muted">Dimensions</div>
                      <div className="font-semibold text-heading truncate">{itemFormState.dimensions || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Catalog Options */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-heading uppercase tracking-wider">
                    Catalog Options
                  </label>
                  <span className="text-2xs text-text-muted">Select all applicable accessories / machining</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl border border-border bg-surface/30">
                  {availableDrawerOptions.map((opt) => {
                    const optName = typeof opt === 'object' && opt !== null ? opt.name : opt;
                    const optId = typeof opt === 'object' && opt !== null ? (opt.id || optName) : optName;
                    const isChecked = (itemFormState.options || []).includes(optName);
                    return (
                      <label
                        key={optId}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer text-xs select-none ${isChecked
                            ? 'border-primary/50 bg-primary/5 text-heading font-medium'
                            : 'border-border/60 hover:bg-surface/80 text-text-muted'
                          }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggleOption(opt)}
                          aria-label={optName}
                        />
                        <span className="truncate">{optName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specification Textarea */}
              <Textarea
                id="drawer-item-spec"
                label="Specification Summary"
                rows={3}
                value={itemFormState.specification || ''}
                onChange={(e) => handleItemFieldChange('specification', e.target.value)}
                placeholder="Specifications auto-generate as you pick options, or type custom requirements..."
                hint="Can be edited to include customized notes or customer-specific callouts."
              />

              {/* Remarks / Notes Textarea */}
              <Textarea
                id="drawer-item-notes"
                label="Remarks & Special Requirements"
                rows={2}
                value={itemFormState.notes || ''}
                onChange={(e) => handleItemFieldChange('notes', e.target.value)}
                placeholder="e.g. Drawing ref #DWG-8812, calibration certificate required, wooden box packing..."
              />
            </div>
          </Drawer>


          {/* ── Tab 1 Bottom Action Controls ── */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto justify-center"
            >
              <IconClose size={16} className="mr-1.5" aria-hidden="true" />
              Cancel
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleNextTab}
                className="w-full sm:w-auto justify-center"
              >
                <span>Next: Assignment & Documents</span>
                <IconArrowRight size={16} className="ml-1.5 shrink-0" aria-hidden="true" />
              </Button>

              <SaveButton
                type="submit"
                size="md"
                loading={loading}
                disabled={loading}
                className="w-full sm:w-auto justify-center font-semibold shadow-xs"
              >
                {isEdit ? 'Save Changes' : 'Save Inquiry'}
              </SaveButton>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2 CONTENT: ASSIGNMENT, NOTES & DOCUMENTS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'assignment_documents' && (
        <div className="space-y-6">
          {/* ── SECTION 4: ASSIGNMENT & INITIAL STATUS ── */}
          <CollapsibleCard
            title="4. Assignment & Initial Status"
            subtitle="Assign internal owner & add handover remarks"
            icon={<IconUserCheck size={18} />}
            className="bg-bg"
            defaultOpen={true}
            hasError={Boolean(errors.AssignedTo)}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
              {/* Left Column: Assignment (and Status if editing) */}
              <div className="lg:col-span-5 space-y-4">
                <SearchableSelect
                  id="AssignedTo"
                  name="AssignedTo"
                  label="Assign To Team Member"
                  placeholder="Select a team member..."
                  searchPlaceholder="Search team members by name..."
                  required
                  options={userOptions}
                  value={form.AssignedTo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.AssignedTo}
                  hint="Select an internal team member responsible for technical review and quotation."
                />

                {isEdit && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-text-muted">Inquiry Status</span>
                    <div className="text-sm font-semibold text-heading">{form.StatusId || '—'}</div>
                    <p className="text-xs text-text-muted">Change status from the inquiry details page.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Initial Comment / Handover Note (placed where Initial Pipeline Stage was) */}
              <div className="lg:col-span-7">
                <Textarea
                  id="initialComment"
                  name="initialComment"
                  label="Initial Comment / Handover Note (Optional)"
                  rows={isEdit ? 5 : 3}
                  value={form.initialComment}
                  onChange={handleChange}
                  placeholder="Add internal notes, customer communication summary, or handover instructions for the assigned team member..."
                  hint="Automatically logged into inquiry activity upon saving"
                />
              </div>
            </div>
          </CollapsibleCard>

          {/* ── SECTION 5: DOCUMENTS & ATTACHMENTS ── */}
          <CollapsibleCard
            title="5. Documents & Attachments"
            subtitle="Attach RFQs, 2D/3D blueprints, specifications or client PO files"
            icon={<IconAttachment size={18} />}
            className="bg-bg"
            defaultOpen={true}
            badge={
              (form.attachments?.length || 0) > 0 ? (
                <Badge variant="role" className="text-xs">
                  {form.attachments.length} {form.attachments.length === 1 ? 'File' : 'Files'}
                </Badge>
              ) : null
            }
          >

            <div className="space-y-5">
              {/* Staging Form Controls */}
              <div className="p-3.5 sm:p-4 bg-surface/50 border border-border rounded-xl space-y-4">
                <span className="text-xs font-bold text-heading block">
                  Add New Document Attachment
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Type */}
                  <div className="space-y-1">
                    <SearchableSelect
                      id="stageDocTypeId"
                      name="stageDocTypeId"
                      label="Document Type"
                      options={docTypeOptions}
                      value={stageDocTypeId}
                      onChange={(e) => {
                        setStageDocTypeId(e.target.value);
                        if (stageDocFile) {
                          const err = validateFile(stageDocFile, resolveDocType(e.target.value));
                          setStageFileError(err);
                        }
                      }}
                    />
                    {activeStagedDocType && (
                      <p className="text-2xs text-text-muted pt-0.5">
                        Allowed: <strong className="font-mono text-heading">{formatAllowedExtensions(activeStagedDocType, ', ')}</strong> • Max: <strong className="font-mono text-heading">{activeStagedDocType.maxFileSizeMB || activeStagedDocType.maxSizeMB || 25}MB</strong>
                      </p>
                    )}
                  </div>

                  {/* Document Title */}
                  <Input
                    id="stageDocTitle"
                    name="stageDocTitle"
                    type="text"
                    label="Document Title"
                    placeholder="e.g. Customer Drawing Rev 0"
                    value={stageDocTitle}
                    onChange={(e) => {
                      setStageDocTitle(e.target.value);
                      if (stageTitleError) setStageTitleError('');
                    }}
                    error={stageTitleError}
                  />
                </div>

                {/* File Drag & Drop Box */}
                <div className="space-y-1.5">
                  <span className="mf-label block">Select File</span>

                  {/* Native file input hidden for custom drag-drop styling */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                    accept={formatAllowedExtensions(activeStagedDocType, ',') || undefined}
                    className="hidden"
                    id="inquiry-form-file-picker"
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
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
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={[
                      'border-2 border-dashed rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all',
                      isDragging
                        ? 'border-primary bg-primary/10'
                        : stageFileError
                          ? 'border-danger/60 bg-danger/5'
                          : stageDocFile
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border hover:border-primary/50 bg-bg',
                    ].join(' ')}
                  >
                    {stageDocFile ? (
                      <div className="flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <IconDocumentTypes size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-heading font-mono truncate">
                              {stageDocFile.name}
                            </p>
                            <p className="text-2xs text-text-muted font-mono tabular-nums">
                              {formatFileSizeKB(Math.round(stageDocFile.size / 1024))}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStageDocFile(null);
                            setStageFileError('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs text-danger hover:bg-danger/10 h-7 px-2 shrink-0"
                        >
                          <IconClose size={13} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-1">
                        <IconUpload size={24} className="text-primary/70 mb-1" />
                        <p className="text-xs font-semibold text-heading">
                          Click to choose file or drag & drop here
                        </p>
                        <p className="text-2xs text-text-muted mt-0.5">
                          {activeStagedDocType
                            ? `Allowed formats: ${formatAllowedExtensions(activeStagedDocType, ', ')} (Max ${activeStagedDocType.maxFileSizeMB || activeStagedDocType.maxSizeMB || 25}MB)`
                            : 'Select document type above'}
                        </p>
                      </div>
                    )}
                  </div>

                  {stageFileError && (
                    <p className="text-xs text-danger flex items-center gap-1 mt-0.5">
                      <IconError size={13} />
                      <span>{stageFileError}</span>
                    </p>
                  )}
                </div>

                {/* Remarks and Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
                  <div className="flex-1">
                    <Input
                      id="stageDocRemarks"
                      name="stageDocRemarks"
                      label="Remarks / Description (Optional)"
                      value={stageDocRemarks}
                      onChange={(e) => setStageDocRemarks(e.target.value)}
                      placeholder="e.g. Revised tolerance drawings per client call, stamped QA report..."
                    />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleAddAttachment}
                    className="text-xs font-semibold shrink-0 h-9 w-full sm:w-auto justify-center"
                  >
                    <IconAdd size={15} className="mr-1.5 text-primary shrink-0" />
                    Add to Attachments List
                  </Button>
                </div>
              </div>

              {/* List of Attached Documents */}
              {form.attachments && form.attachments.length > 0 ? (
                <div className="border border-border rounded-xl overflow-x-auto bg-bg">
                  <div className="px-4 py-2.5 bg-surface/60 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-heading">
                      Queued Attachments ({form.attachments.length})
                    </span>
                    <span className="text-2xs text-text-muted">
                      Will be uploaded upon inquiry creation
                    </span>
                  </div>

                  <table className="w-full min-w-[700px] text-xs text-left">
                    <thead>
                      <tr className="bg-surface/30 border-b border-border/70 text-2xs font-semibold text-text-muted">
                        <th className="py-2.5 px-4 min-w-[170px] whitespace-nowrap">DOCUMENT TYPE</th>
                        <th className="py-2.5 px-4 min-w-[150px]">DOCUMENT TITLE</th>
                        <th className="py-2.5 px-4 min-w-[180px]">FILE NAME</th>
                        <th className="py-2.5 px-4 w-24 whitespace-nowrap">SIZE</th>
                        <th className="py-2.5 px-4 min-w-[140px]">REMARKS</th>
                        <th className="py-2.5 px-4 w-24 text-center whitespace-nowrap">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {form.attachments.map((att, index) => {
                        const docType = resolveDocType(att.documentTypeId);
                        return (
                          <tr key={`${att.fileName}-${index}`} className="hover:bg-surface/30 transition-colors">
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                                {docType?.documentTypeName || docType?.typeName || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-heading">
                              {att.documentTitle}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-heading">
                              <div className="flex items-center gap-1.5">
                                {renderFileExtIcon(att.fileName)}
                                <span className="truncate max-w-[200px]" title={att.fileName}>{att.fileName}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono tabular-nums text-text-muted">
                              {formatFileSizeKB(att.fileSizeKB)}
                            </td>
                            <td className="py-2.5 px-4 text-text">
                              {att.remarks || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <IconButton
                                  icon={IconView}
                                  size="sm"
                                  variant="ghost"
                                  title="Preview attachment"
                                  aria-label="Preview attachment"
                                  onClick={() => setPreviewAttachment(att)}
                                />
                                <IconButton
                                  icon={IconDelete}
                                  size="sm"
                                  variant="ghost"
                                  title="Remove attachment"
                                  aria-label="Remove attachment"
                                  onClick={() => handleRemoveAttachment(index)}
                                  className="hover:text-danger hover:bg-danger/10"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-5 text-center text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/10">
                  No attachments queued yet. Use the selector above to attach RFQs, drawings, or specifications.
                </div>
              )}
            </div>
          </CollapsibleCard>

          {/* ── Tab 2 Bottom Action Controls ── */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handlePrevTab}
                disabled={loading}
                className="w-full sm:w-auto justify-center"
              >
                <IconBack size={16} className="mr-1.5 shrink-0" />
                <span>Back to Inquiry Details</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCancel}
                disabled={loading}
                className="w-full sm:w-auto justify-center"
              >
                <IconClose size={16} className="mr-1.5" aria-hidden="true" />
                Cancel
              </Button>
            </div>

            <SaveButton
              type="submit"
              size="md"
              loading={loading}
              disabled={loading}
              className="w-full sm:w-auto justify-center font-semibold shadow-xs"
            >
              {isEdit ? 'Save Changes' : 'Save Inquiry'}
            </SaveButton>
          </div>
        </div>
      )}

      {/* ── Document Preview Modal ── */}
      {previewAttachment && (
        <Modal
          isOpen={Boolean(previewAttachment)}
          onClose={() => setPreviewAttachment(null)}
          title={`Attachment Preview: ${previewAttachment.documentTitle}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-surface rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                  Document Type
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${resolveDocType(previewAttachment.documentTypeId)?.badgeClass || 'bg-surface text-text-muted border-border'}`}>
                  {resolveDocType(previewAttachment.documentTypeId)?.typeName || resolveDocType(previewAttachment.documentTypeId)?.documentTypeName || '—'}
                </span>
              </div>
              <p className="text-sm font-bold text-heading">
                {previewAttachment.documentTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-muted pt-1 border-t border-border/60 font-mono">
                {renderFileExtIcon(previewAttachment.fileName)}
                <span className="truncate">{previewAttachment.fileName}</span>
                <span>•</span>
                <span>{formatFileSizeKB(previewAttachment.fileSizeKB)}</span>
              </div>
            </div>

            {previewAttachment.remarks && (
              <div className="p-3 bg-bg rounded-lg border border-border text-xs text-text">
                <span className="text-text-muted block text-2xs font-medium mb-0.5">Remarks</span>
                <p className="text-heading">{previewAttachment.remarks}</p>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              {previewAttachment.file && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    const url = URL.createObjectURL(previewAttachment.file);
                    window.open(url, '_blank');
                  }}
                  className="text-xs"
                >
                  <IconExternalLink size={14} className="mr-1.5" />
                  Open in New Tab
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setPreviewAttachment(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Single Product Item Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDeleteItem}
        title="Delete Inquiry Product Item?"
        message={`Are you sure you want to remove "${itemToDelete?.item?.itemName || itemToDelete?.item?.itemCode || 'this product item'}" from this inquiry?`}
        confirmText="Delete Item"
        cancelText="Cancel"
        variant="danger"
      />

      {/* ── Bulk Product Items Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleConfirmBulkDelete}
        title={`Delete ${selectedItemIds.size} Selected Items?`}
        message={`Are you sure you want to remove ${selectedItemIds.size} selected item(s) from this inquiry? This action cannot be undone.`}
        confirmText={`Delete ${selectedItemIds.size} Items`}
        cancelText="Cancel"
        variant="danger"
      />

    </form>
  );
}
