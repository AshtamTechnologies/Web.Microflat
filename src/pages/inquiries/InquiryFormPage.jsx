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

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  IconAdd,
  IconArrowRight,
  IconAttachment,
  IconBack,
  IconCheck,
  IconClock,
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
  IconMessageSquare,
  IconPackage,
  IconSave,
  IconSuccess,
  IconTags,
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
  FormActionsBar,
} from '../../components/ui';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';
import { useProductCategoriesContext } from '../../context/ProductCategoriesContext';
import { useRegions } from '../../context/RegionsContext';
import { useClientsContext } from '../../context/ClientsContext';
import { useCountryState } from '../../context/CountryStateContext';
import { getCategoryDropdownOptions, getCategoryPathName } from '../../utils/treeUtils';
import { getTodayISO } from '../../utils/dateUtils';
import {
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  UOM_OPTIONS,
} from '../../mocks/inquiries';
import { MOCK_MATERIALS } from '../../mocks/purchaseRequisitions';
import { formatFileSizeKB, getDocumentType } from '../../mocks/inquiryDocuments';

const CLIENT_TYPE_OPTIONS = [
  { value: 'New', label: 'New Client' },
  { value: 'Existing', label: 'Existing Client' },
];

const PRODUCT_SELECT_OPTIONS = [
  { value: '', label: '-- Select Product from Catalog --' },
  ...MOCK_MATERIALS.map((m) => ({
    value: String(m.itemId),
    label: `${m.itemName} (${m.itemCode})`,
  })),
];

function normalizeUom(val) {
  if (!val) return 'NOS';
  const upper = String(val).trim().toUpperCase();
  if (upper === 'METER' || upper === 'METERS' || upper === 'M') return 'MTR';
  if (upper === 'NO' || upper === 'NOS' || upper === 'NUMBERS') return 'NOS';
  if (upper === 'PC' || upper === 'PCS' || upper === 'PIECES') return 'PCS';
  if (upper === 'SET' || upper === 'SETS') return 'SETS';
  if (upper === 'UNIT' || upper === 'UNITS') return 'UNITS';
  if (upper === 'KGS' || upper === 'KG' || upper === 'KILOGRAM') return 'KG';
  if (upper === 'BOXES' || upper === 'BOX') return 'BOX';
  const match = UOM_OPTIONS.find((o) => o.value === upper);
  return match ? match.value : 'NOS';
}

const INITIAL_ITEM_ENTRY = {
  prItemId: null,
  itemId: '',
  itemCode: '',
  itemName: '',
  specification: '',
  quantity: '',
  uom: 'NOS',
  parentCategoryId: '',
  categoryId: '',
  categoryName: '',
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
  Source: 'Website',
  DistributorName: '',
  Priority: 'Medium',
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
  CategoryId: '',
  Quantity: '1',
  UOM: 'PCS',
  EstimatedValue: '',
  RequiredByDate: '',
  items: [],
  AssignedTo: '',
  StatusId: 'New',
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
    getInquiryById,
    getNextInquiryNo,
    addInquiry,
    updateInquiry,
    addInquiryComment,
  } = useInquiriesContext();

  const { allUsers = [], users = [], ensureUsersLoaded } = useUsersContext();
  const { addDocument } = useInquiryDocumentsContext();
  const { documentTypes = [], getDocumentTypeById } = useDocumentTypesContext();

  const resolveDocType = (typeId) => {
    return getDocumentTypeById(typeId) || getDocumentType(typeId);
  };
  const { categories = [] } = useProductCategoriesContext();
  const { regions = [], fetchRegions } = useRegions();
  const { clients = [] } = useClientsContext();

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

  const existingInquiry = useMemo(() => {
    return isEdit ? getInquiryById(id) : null;
  }, [isEdit, id, getInquiryById]);

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
  const [initialSnapshot, setInitialSnapshot] = useState(INITIAL_FORM);
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

  const handleClientSelect = (selectedVal) => {
    const rawVal = selectedVal && typeof selectedVal === 'object' && 'target' in selectedVal
      ? selectedVal.target.value
      : selectedVal;

    const selected = clients.find((c) => (c.clientId || c.id) === rawVal);
    if (!selected) {
      setForm((prev) => ({
        ...prev,
        clientId: rawVal || '',
        CustomerName: '',
      }));
      return;
    }

    const contacts = selected.contacts || selected.activeVersion?.contacts || [];
    const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0] || null;

    const resolvedContactName = primaryContact
      ? `${primaryContact.firstName || ''} ${primaryContact.lastName || ''}`.trim()
      : (selected.contactPerson || '');

    const resolvedEmail = (primaryContact && primaryContact.email) || selected.email || '';
    const resolvedPhone = (primaryContact && primaryContact.mobile1) || selected.phone || '';
    const resolvedAltPhone = (primaryContact && primaryContact.mobile2) || selected.alternativePhone || '';

    setForm((prev) => ({
      ...prev,
      clientId: rawVal,
      CustomerName: selected.companyName || selected.billingName || '',
      ContactPerson: resolvedContactName || prev.ContactPerson,
      Email: resolvedEmail || prev.Email,
      Phone: resolvedPhone || prev.Phone,
      AlternativePhone: resolvedAltPhone || prev.AlternativePhone,
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next.CustomerName;
      delete next.Email;
      delete next.Phone;
      delete next.AlternativePhone;
      return next;
    });
  };

  const step1Fields = useMemo(() => [
    'InquiryNo',
    'InquiryDate',
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
  const [itemFieldErrors, setItemFieldErrors] = useState({});
  const inquiryItemErrorCountRef = useRef(0);

  // 2-Level Parent and Sub-Category options
  const parentCategoryOptions = useMemo(() => {
    const roots = categories.filter(
      (c) => !c.parentCategoryId && (c.isActive || c.categoryId === itemFormState.parentCategoryId)
    );
    return [
      { value: '', label: '-- Select Parent Category --' },
      ...roots.map((c) => ({
        value: c.categoryId,
        label: `${c.categoryName} (${c.categoryCode})`,
      })),
    ];
  }, [categories, itemFormState.parentCategoryId]);

  const subCategoryOptions = useMemo(() => {
    if (!itemFormState.parentCategoryId) return [];
    const subs = categories.filter(
      (c) =>
        c.parentCategoryId === itemFormState.parentCategoryId &&
        (c.isActive || c.categoryId === itemFormState.categoryId)
    );
    return [
      { value: '', label: '-- Select Sub-Category --' },
      ...subs.map((c) => ({
        value: c.categoryId,
        label: `${c.categoryName} (${c.categoryCode})`,
      })),
    ];
  }, [categories, itemFormState.parentCategoryId, itemFormState.categoryId]);

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

  const handleItemFieldChange = (field, value) => {
    if (field === 'parentCategoryId') {
      const subs = categories.filter((c) => c.parentCategoryId === value);
      setItemFormState((prev) => ({
        ...prev,
        parentCategoryId: value,
        categoryId: subs.length > 0 ? '' : value,
      }));
    } else if (field === 'itemId') {
      const selectedMat = MOCK_MATERIALS.find(
        (m) => String(m.itemId) === String(value)
      );
      if (selectedMat) {
        setItemFormState((prev) => ({
          ...prev,
          itemId: String(selectedMat.itemId),
          itemCode: selectedMat.itemCode,
          itemName: selectedMat.itemName,
          specification: selectedMat.specification,
          uom: normalizeUom(selectedMat.uom || prev.uom),
        }));
      } else {
        setItemFormState((prev) => ({
          ...prev,
          itemId: '',
          itemCode: '',
          itemName: '',
          specification: '',
        }));
      }
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
    if (!itemFormState.itemCode || !itemFormState.itemCode.trim()) {
      errs.itemCode = 'Please select a product from the catalog';
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
    setItemFormState({
      prItemId: null,
      itemId: '',
      itemCode: '',
      itemName: '',
      specification: '',
      quantity: '',
      uom: 'NOS',
      parentCategoryId: '',
      categoryId: '',
      categoryName: '',
    });
    inquiryItemErrorCountRef.current = 0;
  };

  const handleAddOrUpdateItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateItemForm()) {
      inquiryItemErrorCountRef.current += 1;
      const count = inquiryItemErrorCountRef.current;
      toast.error(
        `Please select a product and enter a valid quantity (${count})`,
        { id: 'inquiry-item-validation-error' }
      );
      return;
    }

    inquiryItemErrorCountRef.current = 0;

    const selectedCatId = itemFormState.categoryId || itemFormState.parentCategoryId || '';
    const currentCatName = selectedCatId ? getCategoryPathName(selectedCatId, categories) : '';
    const selectedMat = MOCK_MATERIALS.find(
      (m) => String(m.itemId) === String(itemFormState.itemId)
    );
    const resolvedItemCode = itemFormState.itemCode?.trim() || (selectedMat ? selectedMat.itemCode : '') || '—';
    const resolvedItemName = itemFormState.itemName?.trim() || (selectedMat ? selectedMat.itemName : '') || resolvedItemCode;
    const resolvedQty = Number(itemFormState.quantity) || 1;
    const resolvedUom = normalizeUom(itemFormState.uom);
    const resolvedSpec = itemFormState.specification?.trim() || (selectedMat ? selectedMat.specification : '') || '';

    if (isEditingItem) {
      const updated = (form.items || []).map((it, idx) => {
        if (idx === editingItemIndex) {
          return {
            ...it,
            itemId: itemFormState.itemId ? String(itemFormState.itemId) : '',
            itemCode: resolvedItemCode,
            itemName: resolvedItemName,
            specification: resolvedSpec,
            quantity: resolvedQty,
            uom: resolvedUom,
            categoryId: selectedCatId || it.categoryId || '',
            categoryName: currentCatName && currentCatName !== '—' ? currentCatName : (it.categoryName || '—'),
          };
        }
        return it;
      });
      const totalQty = updated.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      setForm((prev) => ({
        ...prev,
        items: updated,
        CategoryId: selectedCatId || prev.CategoryId,
        Quantity: String(totalQty || 1),
        UOM: updated[0]?.uom || prev.UOM || 'PCS',
      }));
      toast.success('Item updated');
      resetItemForm();
    } else {
      const newItem = {
        prItemId: Date.now() + Math.floor(Math.random() * 1000),
        itemId: itemFormState.itemId ? String(itemFormState.itemId) : '',
        itemCode: resolvedItemCode,
        itemName: resolvedItemName,
        specification: resolvedSpec,
        quantity: resolvedQty,
        uom: resolvedUom,
        categoryId: selectedCatId,
        categoryName: currentCatName && currentCatName !== '—' ? currentCatName : '—',
      };
      const nextItems = [...(form.items || []), newItem];
      const totalQty = nextItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      setForm((prev) => ({
        ...prev,
        items: nextItems,
        CategoryId: selectedCatId || prev.CategoryId,
        Quantity: String(totalQty || 1),
        UOM: nextItems[0]?.uom || prev.UOM || 'PCS',
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

    const foundCat = item.categoryId ? categories.find((c) => c.categoryId === item.categoryId) : null;
    let parentCatId = '';
    let subCatId = '';

    if (foundCat) {
      if (foundCat.parentCategoryId) {
        parentCatId = foundCat.parentCategoryId;
        subCatId = foundCat.categoryId;
      } else {
        parentCatId = foundCat.categoryId;
        subCatId = '';
      }
    } else {
      parentCatId = item.parentCategoryId || '';
      subCatId = item.categoryId || '';
    }

    setEditingItemId(id);
    setItemFieldErrors({});
    setItemFormState({
      prItemId: id,
      itemId: item.itemId ? String(item.itemId) : '',
      itemCode: item.itemCode && item.itemCode !== '—' ? item.itemCode : '',
      itemName: item.itemName || '',
      specification: item.specification || '',
      quantity: item.quantity !== undefined && item.quantity !== null && item.quantity !== '' ? String(item.quantity) : '1',
      uom: normalizeUom(item.uom),
      parentCategoryId: parentCatId,
      categoryId: subCatId,
      categoryName: item.categoryName || (item.categoryId ? getCategoryPathName(item.categoryId, categories) : '') || '—',
    });
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
      Quantity: String(totalQty || 1),
      CategoryId: updated.length > 0 ? (updated[0].categoryId || prev.CategoryId) : '',
      UOM: updated.length > 0 ? (updated[0].uom || prev.UOM) : 'PCS',
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
      Quantity: String(totalQty || 1),
      CategoryId: updated.length > 0 ? (updated[0].categoryId || prev.CategoryId) : '',
      UOM: updated.length > 0 ? (updated[0].uom || prev.UOM) : 'PCS',
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
  const activeStagedDocType = useMemo(() => {
    return resolveDocType(stageDocTypeId) || getDocumentTypeById(stageDocTypeId);
  }, [stageDocTypeId, getDocumentTypeById]);

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
      if (existingInquiry && initializedIdRef.current !== id) {
        initializedIdRef.current = id;
        const mappedItems = Array.isArray(existingInquiry.items)
          ? existingInquiry.items.map((it) => ({
            ...it,
            uom: normalizeUom(it.uom),
            categoryName: it.categoryName || (it.categoryId ? getCategoryPathName(it.categoryId, categories) : '—'),
          }))
          : existingInquiry.Quantity
            ? [
              {
                prItemId: 1,
                itemCode: existingInquiry.ItemCode || 'MAT-CAT-001',
                itemName: existingInquiry.Subject || 'Main Product Requirement',
                specification: existingInquiry.Specification || '',
                quantity: Number(existingInquiry.Quantity) || 1,
                uom: normalizeUom(existingInquiry.UOM),
                categoryId: existingInquiry.CategoryId || '',
                categoryName: existingInquiry.CategoryId ? getCategoryPathName(existingInquiry.CategoryId, categories) : '—',
              },
            ]
            : [];

        const loadedRegionId = existingInquiry.RegionId ?? existingInquiry.regionId ?? '';

        const matchedClient = clients.find((c) =>
          (existingInquiry.clientId && (c.clientId === existingInquiry.clientId || c.id === existingInquiry.clientId)) ||
          ((c.companyName || '').toLowerCase() === (existingInquiry.CustomerName || '').toLowerCase())
        );
        const loadedClientId = existingInquiry.clientId || (matchedClient ? (matchedClient.clientId || matchedClient.id) : '');
        const loadedClientType = existingInquiry.clientType
          ? existingInquiry.clientType
          : loadedClientId
            ? 'Existing'
            : 'New';

        const data = {
          clientType: loadedClientType,
          clientId: loadedClientId,
          InquiryNo: existingInquiry.InquiryNo || '',
          InquiryDate: existingInquiry.InquiryDate || getTodayISO(),
          Subject: existingInquiry.Subject || '',
          Description: existingInquiry.Description || '',
          Source: existingInquiry.Source || 'Website',
          DistributorName: existingInquiry.DistributorName || '',
          Priority: existingInquiry.Priority || 'Medium',
          CustomerName: existingInquiry.CustomerName || '',
          ContactPerson: existingInquiry.ContactPerson || '',
          Email: existingInquiry.Email || '',
          Phone: existingInquiry.Phone || '',
          AlternativePhone: existingInquiry.AlternativePhone || '',
          AddressLine1: existingInquiry.AddressLine1 || '',
          AddressLine2: existingInquiry.AddressLine2 || '',
          City: existingInquiry.City || '',
          State: existingInquiry.State || '',
          Country: existingInquiry.Country || '',
          parentRegionId: '',
          RegionId: loadedRegionId,
          CategoryId: existingInquiry.CategoryId || (mappedItems[0]?.categoryId || ''),
          Quantity: existingInquiry.Quantity !== undefined ? String(existingInquiry.Quantity) : '1',
          UOM: normalizeUom(existingInquiry.UOM || mappedItems[0]?.uom || 'PCS'),
          EstimatedValue: existingInquiry.EstimatedValue !== undefined ? String(existingInquiry.EstimatedValue) : '',
          RequiredByDate: existingInquiry.RequiredByDate || existingInquiry.EstimateDate || '',
          items: mappedItems,
          AssignedTo: existingInquiry.AssignedTo || (userList.length > 0 ? userList[0].id : ''),
          StatusId: existingInquiry.StatusId || 'New',
          initialComment: '',
          attachments: [],
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    } else {
      if (initializedIdRef.current !== 'new') {
        initializedIdRef.current = 'new';
        const generatedNo = getNextInquiryNo();
        const defaultAssignee = userList.length > 0 ? userList[0].id : '';
        const data = {
          ...INITIAL_FORM,
          clientType: 'New',
          clientId: '',
          InquiryNo: generatedNo,
          AssignedTo: defaultAssignee,
          attachments: [],
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    }
  }, [isEdit, id, existingInquiry, getNextInquiryNo, userList, regions, clients]);

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

  const {
    countries,
    fetchStatesForCountry,
    statesCache,
    loadingStatesMap,
  } = useCountryState();

  // Find selected country object
  const selectedCountryObj = useMemo(() => {
    if (!form.Country) return null;
    return (
      countries.find(
        (c) =>
          String(c.id) === String(form.Country) ||
          c.countryName?.toLowerCase() === String(form.Country).toLowerCase()
      ) || null
    );
  }, [form.Country, countries]);

  // Formatted options for Country SearchableSelect
  const countryDropdownOptions = useMemo(() => {
    return countries.map((c) => ({
      value: c.countryName,
      label: c.countryName,
    }));
  }, [countries]);

  // Fetch states on demand when a country is selected
  useEffect(() => {
    if (selectedCountryObj?.id) {
      fetchStatesForCountry(selectedCountryObj.id);
    }
  }, [selectedCountryObj, fetchStatesForCountry]);

  // Formatted options for State SearchableSelect
  const stateDropdownOptions = useMemo(() => {
    if (!selectedCountryObj?.id) return [];
    const list = statesCache[String(selectedCountryObj.id)] || [];
    return list.map((s) => ({
      value: s.stateName,
      label: s.stateName,
    }));
  }, [selectedCountryObj, statesCache]);

  const handleCountrySelect = (e) => {
    const val = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const nextVal = typeof val === 'object' && val !== null ? val.value || '' : String(val || '');
    setForm((prev) => ({
      ...prev,
      Country: nextVal,
      State: '', // reset state on country change
    }));
    if (errors.Country || errors.State) {
      setErrors((prev) => ({ ...prev, Country: '', State: '' }));
    }
  };

  const handleStateSelect = (e) => {
    const val = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    const nextVal = typeof val === 'object' && val !== null ? val.value || '' : String(val || '');
    setForm((prev) => ({ ...prev, State: nextVal }));
    if (errors.State) {
      setErrors((prev) => ({ ...prev, State: '' }));
    }
  };

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialSnapshot);
  }, [form, initialSnapshot]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
    navigate(isEdit && existingInquiry ? `/inquiries/${existingInquiry.id || existingInquiry.InquiryId}` : '/inquiries');
  }

  function handleNextTab() {
    if (itemFormState.itemId || itemFormState.itemCode?.trim()) {
      toast.error('You have an unadded product item in progress. Please click "+ Add Item" or Cancel before continuing.');
      const el = document.getElementById('item-catalog-preset');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }
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

    const maxBytes = (docType?.maxFileSizeMB || docType?.maxSizeMB || 25) * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File exceeds ${docType?.maxFileSizeMB || docType?.maxSizeMB || 25}MB limit.`;
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
      id: `att_${Date.now()}`,
      documentTypeId: stageDocTypeId,
      documentTitle: stageDocTitle.trim(),
      file: stageDocFile,
      fileName: stageDocFile.name,
      fileSizeKB: Math.max(1, Math.round(stageDocFile.size / 1024)),
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

  function handleRemoveAttachment(idToRemove) {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.id !== idToRemove),
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

    if (itemFormState.itemId || itemFormState.itemCode?.trim()) {
      toast.error('You have an unadded product item in progress. Please click "+ Add Item" or Cancel before submitting.');
      setActiveTab('inquiry_customer');
      const el = document.getElementById('item-catalog-preset');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }
      return;
    }

    const resolvedSubject = form.Subject?.trim() || form.items?.[0]?.itemName || form.items?.[0]?.itemCode || form.CustomerName || 'Inquiry';
    const submissionForm = {
      ...form,
      Subject: resolvedSubject,
    };

    setLoading(true);
    try {
      if (isEdit && existingInquiry) {
        const inquiryId = existingInquiry.id || existingInquiry.InquiryId;
        const res = await updateInquiry(inquiryId, submissionForm);
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
          navigate(`/inquiries/${inquiryId}`);
        }
      } else {
        const res = await addInquiry(submissionForm);
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
          navigate(`/inquiries/${newInquiryId}`);
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
          <h2 className="text-lg font-bold text-heading">Inquiry Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested inquiry with ID "{id}" could not be located in the records.
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
                  options={SOURCE_OPTIONS}
                  value={form.Source}
                  onChange={handleChange}
                />

                {/* Priority */}
                <SearchableSelect
                  id="Priority"
                  name="Priority"
                  label="Priority Level"
                  options={PRIORITY_OPTIONS}
                  value={form.Priority}
                  onChange={handleChange}
                />

                {/* Distributor Name (conditionally shown when Source is Distributor) */}
                {form.Source === 'Distributor' && (
                  <div className="md:col-span-3">
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
                  </div>
                )}
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

                {/* 8. Country (SearchableSelect) */}
                <SearchableSelect
                  id="Country"
                  name="Country"
                  label="Country"
                  placeholder="Select country..."
                  searchPlaceholder="Search countries..."
                  emptyText="No countries found"
                  options={countryDropdownOptions}
                  value={form.Country || ''}
                  onChange={handleCountrySelect}
                  error={errors.Country}
                />

                {/* 9. State / Province (Cascading SearchableSelect) */}
                <SearchableSelect
                  id="State"
                  name="State"
                  label="State"
                  placeholder={
                    !form.Country
                      ? 'Select country first...'
                      : selectedCountryObj && loadingStatesMap[selectedCountryObj.id]
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
                  disabled={!form.Country || stateDropdownOptions.length === 0}
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
            subtitle="Category classification & optional item specifications (can be specified later)"
            icon={<IconPackage size={18} />}
            className="bg-bg"
            bodyClassName="space-y-6"
            defaultOpen={true}
            badge={
              <span className="text-2xs font-medium text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
                {form.items?.length > 0 ? `${form.items.length} ${form.items.length === 1 ? 'Item' : 'Items'}` : 'Optional'}
              </span>
            }
          >

            {/* ── Sub-Card: Add Item to Inquiry ── */}
            <div
              className={`p-4 sm:p-5 rounded-xl border bg-surface/50 space-y-4 transition-all duration-200 ${editingItemId
                ? 'border-primary/60 ring-2 ring-primary/20 bg-primary/[0.02]'
                : 'border-border'
                }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border/70">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${editingItemId
                      ? 'bg-primary text-white'
                      : 'bg-primary/10 text-primary'
                      }`}
                  >
                    {editingItemId ? <IconEdit size={15} /> : <IconPackage size={16} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-heading">
                      {editingItemId ? 'Edit Inquiry Product Item' : 'Add Item to Inquiry'}
                    </h4>
                    <p className="text-2xs text-text-muted">
                      Select product category, catalog item or enter specifications, quantity and unit below.
                    </p>
                  </div>
                </div>

                {editingItemId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={resetItemForm}
                    className="text-xs self-start sm:self-auto h-7 px-2"
                  >
                    <IconClose size={13} className="mr-1" />
                    Cancel
                  </Button>
                )}
              </div>

              {/* 3 columns per row layout */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Parent Category */}
                  <div>
                    <SearchableSelect
                      id="item-form-parent-category"
                      label="Parent Category"
                      options={parentCategoryOptions}
                      value={itemFormState.parentCategoryId || ''}
                      placeholder="-- Select Parent Category --"
                      searchPlaceholder="Search parent categories..."
                      onChange={(e) => handleItemFieldChange('parentCategoryId', e.target.value)}
                    />
                  </div>

                  {/* Sub-Category */}
                  <div>
                    <SearchableSelect
                      id="item-form-category"
                      label="Sub-Category"
                      options={subCategoryOptions}
                      value={itemFormState.categoryId || ''}
                      placeholder={
                        !itemFormState.parentCategoryId
                          ? 'Select parent category first'
                          : subCategoryOptions.length <= 1
                            ? 'No sub-categories (Parent selected)'
                            : '-- Select Sub-Category --'
                      }
                      searchPlaceholder="Search sub-categories..."
                      disabled={!itemFormState.parentCategoryId || subCategoryOptions.length <= 1}
                      onChange={(e) => handleItemFieldChange('categoryId', e.target.value)}
                    />
                  </div>

                  {/* Product (was Material Catalog Preset) */}
                  <div>
                    <SearchableSelect
                      id="item-catalog-preset"
                      label="Product"
                      options={PRODUCT_SELECT_OPTIONS}
                      value={itemFormState.itemId ? String(itemFormState.itemId) : ''}
                      placeholder="-- Select Product from Catalog --"
                      searchPlaceholder="Search catalog..."
                      error={itemFieldErrors.itemCode}
                      onChange={(e) => handleItemFieldChange('itemId', e.target.value)}
                    />
                  </div>

                  {/* Item Code (Disabled: Auto-populated from Catalog) */}
                  <div>
                    <Input
                      id="item-form-code"
                      label="Item Code"
                      placeholder="Auto-populated from Product Catalog"
                      value={itemFormState.itemCode || ''}
                      error={itemFieldErrors.itemCode}
                      disabled
                      readOnly
                      className="font-mono text-xs bg-surface/70 text-text-muted cursor-not-allowed opacity-90 select-none placeholder:text-text-muted/50"
                      hint="Auto-assigned when selecting a product above"
                    />
                  </div>

                  {/* Specification */}
                  <div>
                    <Input
                      id="item-form-spec"
                      label="Specification"
                      placeholder="e.g. M6 × 125 MM High Tensile Zinc Plated"
                      value={itemFormState.specification || ''}
                      error={itemFieldErrors.specification}
                      onChange={(e) => handleItemFieldChange('specification', e.target.value)}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <Input
                      id="item-form-qty"
                      label="Quantity"
                      type="number"
                      min="1"
                      required
                      placeholder="1"
                      value={itemFormState.quantity !== undefined && itemFormState.quantity !== null ? itemFormState.quantity : ''}
                      error={itemFieldErrors.quantity}
                      onChange={(e) => handleItemFieldChange('quantity', e.target.value)}
                    />
                  </div>

                  {/* UOM */}
                  <div>
                    <SearchableSelect
                      id="item-form-uom"
                      label="UOM"
                      options={UOM_OPTIONS}
                      value={itemFormState.uom || 'Nos'}
                      placeholder="Select UOM..."
                      searchPlaceholder="Search unit of measure..."
                      onChange={(e) => handleItemFieldChange('uom', e.target.value)}
                    />
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  {editingItemId && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={resetItemForm}
                      className="cursor-pointer text-xs"
                    >
                      <IconClose size={14} className="mr-1" />
                      Cancel
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddOrUpdateItem}
                    className="font-semibold shadow-xs cursor-pointer text-xs"
                  >
                    {editingItemId ? (
                      <>
                        <IconCheck size={14} className="mr-1.5" />
                        Update Item
                      </>
                    ) : (
                      <>
                        <IconAdd size={14} className="mr-1.5" />
                        Add Item
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Sub-Card: Items Grid Table ── */}
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
                </div>
              </div>

              {(form.items || []).length > 0 ? (
                <>
                  {/* Desktop / Tablet Table View (md+) */}
                  <div className="hidden md:block">
                    <TableContainer tableClassName="w-full min-w-[760px] text-left border-collapse text-xs">
                      <thead>
                        <tr>
                          <Th className="w-10 text-center">
                            <Checkbox
                              checked={
                                (form.items || []).length > 0 &&
                                selectedItemIds.size === (form.items || []).length
                              }
                              onChange={handleToggleSelectAllItems}
                              aria-label="Select all products"
                            />
                          </Th>
                          <Th className="w-10 text-center">#</Th>
                          <Th className="min-w-[140px]">PRODUCT CATEGORY</Th>
                          <Th className="w-32">ITEM CODE</Th>
                          <Th className="min-w-[160px]">SPECIFICATION</Th>
                          <Th className="text-right w-20">QTY</Th>
                          <Th className="w-20">UOM</Th>
                          <Th className="text-right w-24">ACTIONS</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(form.items || []).map((item, idx) => {
                          const itemId = item.prItemId || item.id || idx;
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
                              <Td className="text-xs font-medium text-heading">
                                {item.categoryName || getCategoryPathName(item.categoryId || form.CategoryId, categories) || '—'}
                              </Td>
                              <Td>
                                <span className="font-mono text-xs font-semibold text-heading bg-surface border border-border px-2 py-0.5 rounded-md">
                                  {item.itemCode || '—'}
                                </span>
                              </Td>
                              <Td className="text-xs text-text-muted max-w-xs truncate" title={item.specification}>
                                {item.specification || '—'}
                              </Td>
                              <Td className="text-right font-mono tabular-nums text-xs font-bold text-heading">
                                {item.quantity}
                              </Td>
                              <Td className="text-xs text-text-muted font-mono">
                                {item.uom}
                              </Td>
                              <Td className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
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
                      const itemId = item.prItemId || item.id || idx;
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
                              <span className="font-mono text-xs font-bold text-heading bg-surface border border-border px-2 py-0.5 rounded-md truncate">
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
                            <div className="text-text-muted">
                              Category: <span className="font-medium text-heading">{item.categoryName || getCategoryPathName(item.categoryId || form.CategoryId, categories) || '—'}</span>
                            </div>
                            {item.specification && (
                              <div className="text-text-muted text-2xs bg-surface/60 p-2 rounded border border-border/60 break-words">
                                {item.specification}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60 font-mono">
                            <span className="text-text-muted">Quantity:</span>
                            <span className="font-bold text-heading text-sm">
                              {item.quantity} <span className="text-xs font-normal text-text-muted">{item.uom}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-text-muted text-xs space-y-1">
                  <IconPackage size={24} className="mx-auto text-text-muted/40 mb-1" />
                  <p className="font-medium text-heading">No items added to inquiry yet</p>
                  <p>Fill in the item details above and click &quot;+ Add Item&quot; to include products.</p>
                </div>
              )}
            </div>
          </CollapsibleCard>

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

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Assigned To (SearchableSelect without "Leave unassigned") */}
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

                {/* Status */}
                {isEdit ? (
                  <SearchableSelect
                    id="StatusId"
                    name="StatusId"
                    label="Inquiry Status"
                    options={STATUS_OPTIONS.map((s) => ({ value: s.id, label: s.name }))}
                    value={form.StatusId}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="flex flex-col justify-center pt-2">
                    <span className="text-xs font-medium text-text-muted block mb-1">
                      Initial Pipeline Stage
                    </span>
                    <div className="p-2.5 rounded-lg border border-border bg-surface flex items-center gap-2 text-xs text-text">
                      <IconClock size={15} className="text-primary shrink-0" />
                      <span>New inquiry will start at stage <strong className="text-heading">"New"</strong> and progress through Quoting and Won/Lost.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Handover Note / Comment Area */}
              <div className="mt-4 pt-4 border-t border-border/70">
                <Textarea
                  id="initialComment"
                  name="initialComment"
                  label="Initial Comment / Handover Note (Optional)"
                  rows={3}
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
                      {form.attachments.map((att) => {
                        const docType = resolveDocType(att.documentTypeId);
                        return (
                          <tr key={att.id} className="hover:bg-surface/30 transition-colors">
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                                {docType?.documentTypeName || docType?.typeName || 'Document'}
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
                                  onClick={() => handleRemoveAttachment(att.id)}
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
                  {resolveDocType(previewAttachment.documentTypeId)?.typeName || 'Document'}
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
