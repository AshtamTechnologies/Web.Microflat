/**
 * InquiryFormPage.jsx — Multi-step Add and Edit inquiry form for MicroFlat ERP.
 *
 * Route: /inquiries/new (Add mode) & /inquiries/:id/edit (Edit mode)
 *
 * 2-Step Workflow:
 *   Step 1: Inquiry & Customer Details
 *     - 1. Inquiry Details (InquiryNo, InquiryDate, Subject, Description, Source, Priority)
 *     - 2. Customer Information (CustomerName, ContactPerson, Email, Phone, AlternativePhone, AddressLine1, AddressLine2, City, State, Country)
 *     - 3. Classification & Value (RegionId, CategoryId, Quantity, UOM, EstimatedValue, RequiredByDate)
 *
 *   Step 2: Assignment & Documents
 *     - 4. Assignment & Initial Status (AssignedTo without unassigned option, StatusId, Initial Handover Comment)
 *     - 5. Documents & Attachments (RFQ, Drawings, Specs, Quotations with real-time extension & size validation)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  X,
  Inbox,
  FileText,
  User,
  Tags,
  UserCheck,
  AlertCircle,
  Clock,
  Paperclip,
  UploadCloud,
  Trash2,
  FileCheck,
  Layers,
  File,
  Plus,
  Pencil,
  Check,
  Package,
  Eye,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

import {
  Button,
  Input,
  Checkbox,
  DatePicker,
  SearchableSelect,
  Card,
  Badge,
  Modal,
  ConfirmModal,
  RichTextEditor,
  TableContainer,
  Th,
  Td,
} from '../../components/ui';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import { useInquiryDocumentsContext } from '../../context/InquiryDocumentsContext';
import { useDocumentTypesContext } from '../../context/DocumentTypesContext';
import { useProductCategoriesContext } from '../../context/ProductCategoriesContext';
import { useRegions } from '../../context/RegionsContext';
import { getCategoryDropdownOptions, getCategoryPathName } from '../../utils/treeUtils';
import {
  SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  UOM_OPTIONS,
} from '../../mocks/inquiries';
import { MOCK_MATERIALS } from '../../mocks/purchaseRequisitions';
import { formatFileSizeKB } from '../../mocks/inquiryDocuments';

const PRODUCT_SELECT_OPTIONS = [
  { value: '', label: '-- Select Product from Catalog --' },
  ...MOCK_MATERIALS.map((m) => ({
    value: String(m.itemId),
    label: `${m.itemName} (${m.itemCode})`,
  })),
];

const INITIAL_ITEM_ENTRY = {
  prItemId: null,
  itemId: '',
  itemCode: '',
  itemName: '',
  specification: '',
  quantity: '',
  uom: 'Nos',
  parentCategoryId: '',
  categoryId: '',
  categoryName: '',
};

const INITIAL_FORM = {
  InquiryNo: '',
  InquiryDate: new Date().toISOString().slice(0, 10),
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
  Country: 'India',
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
    case 'Subject':
      if (!str) return 'Inquiry subject / requirement title is required.';
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
    'Subject',
    'CustomerName',
    'RegionId',
  ];

  requiredFields.forEach((field) => {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  });

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

  const { allUsers = [], users = [] } = useUsersContext();
  const { addDocument } = useInquiryDocumentsContext();
  const { documentTypes = [], getDocumentTypeById } = useDocumentTypesContext();
  const { categories = [] } = useProductCategoriesContext();
  const { regions = [], getRegionOptions } = useRegions();

  const userList = allUsers.length > 0 ? allUsers : users;

  const existingInquiry = useMemo(() => {
    return isEdit ? getInquiryById(id) : null;
  }, [isEdit, id, getInquiryById]);

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // 2-Level Parent and Sub-Region options
  const parentRegionOptions = useMemo(() => {
    const roots = regions.filter((r) => !r.parentRegionId && (r.isActive || r.regionId === form.parentRegionId));
    return [
      { value: '', label: '-- Select Parent Region --' },
      ...roots.map((r) => ({
        value: r.regionId,
        label: `${r.regionName} (${r.regionCode})`,
      })),
    ];
  }, [regions, form.parentRegionId]);

  const subRegionOptions = useMemo(() => {
    if (!form.parentRegionId) return [];
    const subs = regions.filter(
      (r) => r.parentRegionId === form.parentRegionId && (r.isActive || r.regionId === form.RegionId)
    );
    return [
      { value: '', label: '-- Select Sub-Region --' },
      ...subs.map((r) => ({
        value: r.regionId,
        label: `${r.regionName} (${r.regionCode})`,
      })),
    ];
  }, [regions, form.parentRegionId, form.RegionId]);

  const handleParentRegionChange = (parentRegId) => {
    const subs = regions.filter((r) => r.parentRegionId === parentRegId);
    setForm((prev) => ({
      ...prev,
      parentRegionId: parentRegId,
      RegionId: subs.length > 0 ? '' : parentRegId,
    }));
    if (errors.RegionId) {
      setErrors((prev) => ({ ...prev, RegionId: '' }));
    }
  };

  const handleSubRegionChange = (subRegId) => {
    setForm((prev) => ({
      ...prev,
      RegionId: subRegId,
    }));
    if (errors.RegionId) {
      setErrors((prev) => ({ ...prev, RegionId: '' }));
    }
  };

  // Line item adding/editing form state
  const [itemFormState, setItemFormState] = useState({ ...INITIAL_ITEM_ENTRY });
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemFieldErrors, setItemFieldErrors] = useState({});

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
          uom: selectedMat.uom || prev.uom || 'Nos',
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
  };

  const validateItemForm = () => {
    const errs = {};
    if (!itemFormState.itemCode || !itemFormState.itemCode.trim()) {
      errs.itemCode = 'Item code is required';
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
      uom: 'Nos',
      parentCategoryId: '',
      categoryId: '',
      categoryName: '',
    });
  };

  const handleAddOrUpdateItem = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateItemForm()) {
      toast.error('Please enter required item code and a valid quantity (> 0)');
      return;
    }

    const selectedCatId = itemFormState.categoryId || '';
    const currentCatName = selectedCatId ? getCategoryPathName(selectedCatId, categories) : '';
    const selectedMat = MOCK_MATERIALS.find(
      (m) => String(m.itemId) === String(itemFormState.itemId)
    );
    const resolvedItemCode = itemFormState.itemCode?.trim() || (selectedMat ? selectedMat.itemCode : '') || '—';
    const resolvedItemName = itemFormState.itemName?.trim() || (selectedMat ? selectedMat.itemName : '') || resolvedItemCode;
    const resolvedQty = Number(itemFormState.quantity) || 1;
    const resolvedUom = itemFormState.uom || 'Nos';
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
    const parentCatId = foundCat && foundCat.parentCategoryId
      ? foundCat.parentCategoryId
      : (foundCat ? foundCat.categoryId : (item.parentCategoryId || ''));

    setEditingItemId(id);
    setItemFieldErrors({});
    setItemFormState({
      prItemId: id,
      itemId: item.itemId ? String(item.itemId) : '',
      itemCode: item.itemCode && item.itemCode !== '—' ? item.itemCode : '',
      itemName: item.itemName || '',
      specification: item.specification || '',
      quantity: item.quantity !== undefined && item.quantity !== null && item.quantity !== '' ? String(item.quantity) : '1',
      uom: item.uom || 'Nos',
      parentCategoryId: parentCatId,
      categoryId: item.categoryId || '',
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
    const allIds = (form.items || []).map((it, idx) => it.prItemId || it.id || idx);
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
      const id = it.prItemId || it.id || idx;
      return !selectedItemIds.has(id);
    });
    const totalQty = updated.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    setForm((prev) => ({
      ...prev,
      items: updated,
      Quantity: String(totalQty || 1),
    }));

    toast.success(`Removed ${count} item${count === 1 ? '' : 's'} from inquiry`);
    if (editingItemId && selectedItemIds.has(editingItemId)) {
      resetItemForm();
    }
    setSelectedItemIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  // Attachment Staging State
  const [stageDocTypeId, setStageDocTypeId] = useState('dt_rfq');
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
    return getDocumentTypeById(stageDocTypeId);
  }, [stageDocTypeId, getDocumentTypeById]);


  // Build assignee options from UsersContext (No "Leave unassigned" option)
  const userOptions = useMemo(() => {
    return userList.map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName} (${Array.isArray(u.roles) ? u.roles.join(', ') : u.role || 'Staff'})`,
    }));
  }, [userList]);

  // Initialize form state
  useEffect(() => {
    if (isEdit) {
      if (existingInquiry && initializedIdRef.current !== id) {
        initializedIdRef.current = id;
        const mappedItems = Array.isArray(existingInquiry.items)
          ? existingInquiry.items
          : existingInquiry.Quantity
            ? [
              {
                prItemId: 1,
                itemCode: existingInquiry.ItemCode || 'MAT-CAT-001',
                itemName: existingInquiry.Subject || 'Main Product Requirement',
                specification: existingInquiry.Specification || '',
                quantity: Number(existingInquiry.Quantity) || 1,
                uom: existingInquiry.UOM || 'Nos',
              },
            ]
            : [];

        const loadedRegion = existingInquiry.RegionId ? regions.find((r) => r.regionId === existingInquiry.RegionId) : null;
        const resolvedParentRegId = loadedRegion && loadedRegion.parentRegionId
          ? loadedRegion.parentRegionId
          : (loadedRegion ? loadedRegion.regionId : '');

        const data = {
          InquiryNo: existingInquiry.InquiryNo || '',
          InquiryDate: existingInquiry.InquiryDate || new Date().toISOString().slice(0, 10),
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
          Country: existingInquiry.Country || 'India',
          parentRegionId: resolvedParentRegId,
          RegionId: existingInquiry.RegionId || '',
          CategoryId: existingInquiry.CategoryId || '',
          Quantity: existingInquiry.Quantity !== undefined ? String(existingInquiry.Quantity) : '1',
          UOM: existingInquiry.UOM || 'PCS',
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
          InquiryNo: generatedNo,
          AssignedTo: defaultAssignee,
          attachments: [],
        };
        setForm(data);
        setInitialSnapshot(data);
        setErrors({});
      }
    }
  }, [isEdit, id, existingInquiry, getNextInquiryNo, userList, regions]);

  // Document type options for Select
  const docTypeOptions = useMemo(() => {
    return documentTypes.map((dt) => {
      const id = dt.documentTypeId || dt.id;
      const exts = Array.isArray(dt.allowedExtensions) ? dt.allowedExtensions.join(', ') : '';
      return {
        value: id,
        label: `${dt.typeName}${dt.isMandatory ? ' (Required)' : ''} [${exts}]`,
      };
    });
  }, [documentTypes]);

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
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    navigate(isEdit && existingInquiry ? `/inquiries/${existingInquiry.id || existingInquiry.InquiryId}` : '/inquiries');
  }

  function handleConfirmDiscard() {
    setShowDiscardConfirm(false);
    navigate(isEdit && existingInquiry ? `/inquiries/${existingInquiry.id || existingInquiry.InquiryId}` : '/inquiries');
  }

  function handleNextStep() {
    const step1Errors = validateStep1(form);
    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors);
      const firstErrorField = Object.keys(step1Errors)[0];
      const el = document.getElementById(firstErrorField);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }
      return;
    }
    setErrors({});
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePrevStep() {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Attachment Validation & Addition ──
  function validateFile(file, docType) {
    if (!file) return 'Please select a file.';

    const fileName = file.name || '';
    const extIndex = fileName.lastIndexOf('.');
    const ext = extIndex >= 0 ? fileName.slice(extIndex).toLowerCase() : '';

    const allowed = (docType?.allowedExtensions || []).map((e) => e.toLowerCase());
    if (allowed.length > 0 && !allowed.includes(ext)) {
      return `Only ${allowed.join(', ')} files allowed for ${docType?.typeName || 'this document type'}.`;
    }

    const maxBytes = (docType?.maxSizeMB || 25) * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File exceeds ${docType?.maxSizeMB || 25}MB limit.`;
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
    if (lower.endsWith('.pdf')) return <FileText size={16} className="text-danger shrink-0" />;
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return <FileText size={16} className="text-primary shrink-0" />;
    if (lower.endsWith('.dwg') || lower.endsWith('.dxf')) return <Layers size={16} className="text-blue-500 shrink-0" />;
    return <File size={16} className="text-text-muted shrink-0" />;
  };

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const fieldErrors = validateAll(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      const step1Fields = [
        'InquiryNo',
        'InquiryDate',
        'Subject',
        'CustomerName',
        'Email',
        'Phone',
        'AlternativePhone',
        'RegionId',
        'CategoryId',
      ];
      const hasStep1Error = Object.keys(fieldErrors).some((k) => step1Fields.includes(k));
      if (hasStep1Error && currentStep !== 1) {
        setCurrentStep(1);
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
          navigate(`/inquiries/${inquiryId}`);
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
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Inquiry Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested inquiry with ID "{id}" could not be located in the records.
          </p>
          <Button variant="primary" onClick={() => navigate('/inquiries')}>
            Return to Inquiries
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 pb-20">
      {/* ── Top Page Header & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-5">
        <div className="min-w-0">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer mb-2 sm:mb-3"
          >
            <ArrowLeft
              size={14}
              className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform duration-150 shrink-0"
              aria-hidden="true"
            />
            <span>Back to Inquiries</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-heading tracking-tight flex items-center gap-2.5">
            <Inbox className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{isEdit ? `Edit Inquiry: ${existingInquiry?.InquiryNo}` : 'New Inquiry / RFQ Registration'}</span>
          </h1>
        </div>

        {/* Top Action Buttons (Responsive for Steps & Mobile) */}
        <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            <X size={16} className="mr-1.5" aria-hidden="true" />
            Cancel
          </Button>

          {currentStep === 1 ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextStep}
              className="flex-1 sm:flex-initial justify-center"
            >
              <span>Next</span>
              <ArrowRight size={16} className="ml-1.5 shrink-0" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading}
              className="flex-1 sm:flex-initial justify-center"
            >
              <Save size={16} className="mr-1.5 shrink-0" aria-hidden="true" />
              {isEdit ? 'Save Changes' : 'Create Inquiry'}
            </Button>
          )}
        </div>
      </div>

      {/* ── 2-STEP PROGRESS STEPPER ── */}
      <div className="bg-surface/60 border border-border rounded-xl p-2.5 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
          {/* Step 1 Button/Tab */}
          <button
            type="button"
            onClick={() => handlePrevStep()}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${currentStep === 1
                ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/20 shadow-2xs'
                : 'bg-surface border-border hover:bg-surface/80'
              }`}
          >
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors ${currentStep === 1
                  ? 'bg-primary text-white shadow-xs'
                  : currentStep > 1
                    ? 'bg-success/15 text-success border border-success/30'
                    : 'bg-surface text-text-muted border border-border'
                }`}
            >
              {currentStep > 1 ? <CheckCircle2 size={16} /> : '1'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-text-muted">
                  Step 1
                </span>
                {currentStep > 1 && (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5 font-semibold">
                    Completed
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-heading truncate">
                Inquiry & Customer Details
              </p>
              <p className="text-[11px] text-text-muted truncate">
                Inquiry info, Customer profile & Requirements
              </p>
            </div>
          </button>

          {/* Step 2 Button/Tab */}
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1) {
                handleNextStep();
              }
            }}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${currentStep === 2
                ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/20 shadow-2xs'
                : 'bg-surface border-border hover:bg-surface/80'
              }`}
          >
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors ${currentStep === 2
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-muted border border-border'
                }`}
            >
              2
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-text-muted">
                  Step 2
                </span>
                {currentStep === 2 && (
                  <Badge variant="primary" className="text-[10px] py-0 px-1.5 font-semibold">
                    Active Step
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-heading truncate">
                Assignment, Notes & Documents
              </p>
              <p className="text-[11px] text-text-muted truncate">
                Team assignment, Initial comments & Attachments
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 1 CONTENT: INQUIRY & CUSTOMER DETAILS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* ── SECTION 1: INQUIRY DETAILS ── */}
          <Card padding="md" className="bg-bg">
            <div className="border-b border-border pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-base">
                <FileText size={18} className="text-primary shrink-0" aria-hidden="true" />
                <span>1. Inquiry Details</span>
              </div>
              <span className="text-xs text-text-muted font-normal">
                Reference code, date, estimate date, subject title & priority
              </span>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {/* Inquiry No (System Generated & Disabled) */}
                <Input
                  id="InquiryNo"
                  name="InquiryNo"
                  type="text"
                  label="Inquiry Number"
                  placeholder="Auto-generated"
                  value={form.InquiryNo}
                  disabled
                  readOnly
                  hint="System auto-generated"
                  className="font-mono text-sm uppercase bg-surface/70 text-text-muted cursor-not-allowed opacity-90 select-none"
                />

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

                {/* Parent Sales Region */}
                <SearchableSelect
                  id="parentRegionId"
                  name="parentRegionId"
                  label="Parent Region"
                  placeholder="-- Select Parent Region --"
                  searchPlaceholder="Search parent regions..."
                  required
                  options={parentRegionOptions}
                  value={form.parentRegionId}
                  onChange={(e) => handleParentRegionChange(e.target.value)}
                  error={!form.parentRegionId ? errors.RegionId : undefined}
                />

                {/* Sub-Region */}
                <SearchableSelect
                  id="RegionId"
                  name="RegionId"
                  label="Sub-Region"
                  placeholder={
                    !form.parentRegionId
                      ? 'Select parent region first'
                      : subRegionOptions.length <= 1
                      ? 'No sub-regions (Parent selected)'
                      : '-- Select Sub-Region --'
                  }
                  searchPlaceholder="Search sub-regions..."
                  disabled={!form.parentRegionId || subRegionOptions.length <= 1}
                  required={subRegionOptions.length > 1}
                  options={subRegionOptions}
                  value={form.RegionId}
                  onChange={(e) => handleSubRegionChange(e.target.value)}
                  error={form.parentRegionId && subRegionOptions.length > 1 && !form.RegionId ? errors.RegionId : undefined}
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

              {/* Subject */}
              <Input
                id="Subject"
                name="Subject"
                type="text"
                label="Inquiry Subject / Item Description Title"
                placeholder="e.g. Custom Cast Iron Surface Plate 2000x1000mm Grade 0"
                required
                value={form.Subject}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.Subject}
              />

              {/* Description (Rich Text Editor) */}
              <RichTextEditor
                id="Description"
                name="Description"
                label="Detailed Specifications & Requirement Notes"
                value={form.Description}
                onChange={handleChange}
                placeholder="Provide technical specifications, tolerances, material grade, delivery expectations, drawing numbers, or testing requirements..."
                hint="Use the formatting toolbar for lists, bold specifications, headings, and quotes."
              />
            </div>
          </Card>

          {/* ── SECTION 2: CUSTOMER INFORMATION ── */}
          <Card padding="md" className="bg-bg">
            <div className="border-b border-border pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-base">
                <User size={18} className="text-primary shrink-0" aria-hidden="true" />
                <span>2. Customer Information</span>
              </div>
              <span className="text-xs text-text-muted font-normal">
                Company profile, contact persons & address details
              </span>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* 2-Column Grid for All Customer Information Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* 1. Customer / Company Name */}
                <Input
                  id="CustomerName"
                  name="CustomerName"
                  type="text"
                  label="Customer / Company Name"
                  placeholder="e.g. Precision AutoWorks India Ltd"
                  required
                  value={form.CustomerName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.CustomerName}
                  autoComplete="organization"
                />

                {/* 2. Contact Person Name */}
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

                {/* 3. Email Address */}
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

                {/* 4. Phone / Mobile Number */}
                <Input
                  id="Phone"
                  name="Phone"
                  type="tel"
                  label="Phone / Mobile Number"
                  placeholder="9823012345"
                  value={form.Phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.Phone}
                  className="font-mono tabular-nums"
                  autoComplete="tel"
                />

                {/* 5. Alternative Phone */}
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

                {/* 6. City */}
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

                {/* 7. State / Province */}
                <Input
                  id="State"
                  name="State"
                  type="text"
                  label="State / Province"
                  placeholder="e.g. Gujarat"
                  value={form.State}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="address-level1"
                />

                {/* 8. Country */}
                <Input
                  id="Country"
                  name="Country"
                  type="text"
                  label="Country"
                  placeholder="e.g. India"
                  value={form.Country}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="country-name"
                />

                {/* 9. Address Line 1 (After Country) */}
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

                {/* 10. Address Line 2 (After Country) */}
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
          </Card>

          {/* ── SECTION 3: PRODUCT SELECTION ── */}
          <Card padding="md" className="bg-bg space-y-6">
            <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-base">
                <Package size={18} className="text-primary shrink-0" aria-hidden="true" />
                <span>3. Product Selection</span>
              </div>
              <span className="text-xs text-text-muted font-normal">
                Category classification & multiple item specifications
              </span>
            </div>

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
                    {editingItemId ? <Pencil size={15} /> : <Package size={16} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-heading">
                      {editingItemId ? 'Edit Inquiry Product Item' : 'Add Item to Inquiry'}
                    </h4>
                    <p className="text-[11px] text-text-muted">
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
                    <X size={13} className="mr-1" />
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
                      onChange={(e) => handleItemFieldChange('itemId', e.target.value)}
                    />
                  </div>

                  {/* Item Code */}
                  <div>
                    <Input
                      id="item-form-code"
                      label="Item Code"
                      required
                      placeholder="e.g. MAT-FST-M6-125"
                      value={itemFormState.itemCode || ''}
                      error={itemFieldErrors.itemCode}
                      onChange={(e) => handleItemFieldChange('itemCode', e.target.value)}
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
                      <X size={14} className="mr-1" />
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
                        <Check size={14} className="mr-1.5" />
                        Update Item
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="mr-1.5" />
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
                  <Badge variant="role" className="text-[11px] px-2 py-0.5 font-mono">
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
                      <Trash2 size={13} className="mr-1.5" />
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
                <TableContainer>
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
                      <Th>PRODUCT CATEGORY</Th>
                      <Th>ITEM CODE</Th>
                      <Th>SPECIFICATION</Th>
                      <Th className="text-right">QTY</Th>
                      <Th>UOM</Th>
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
                              <button
                                type="button"
                                onClick={() => handleStartEditItem(item, idx)}
                                className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-primary hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                                title="Edit item"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete({ item, index: idx })}
                                className="p-1.5 rounded-lg border border-border bg-surface text-text hover:text-danger hover:border-danger/50 transition-all cursor-pointer shadow-2xs"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableContainer>
              ) : (
                <div className="py-8 text-center text-text-muted text-xs space-y-1">
                  <Package size={24} className="mx-auto text-text-muted/40 mb-1" />
                  <p className="font-medium text-heading">No items added to inquiry yet</p>
                  <p>Fill in the item details above and click &quot;+ Add Item&quot; to include products.</p>
                </div>
              )}
            </div>
          </Card>

          {/* ── Step 1 Bottom Action Controls ── */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <X size={16} className="mr-1.5" aria-hidden="true" />
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextStep}
              className="w-full sm:w-auto justify-center"
            >
              <span>Next</span>
              <ArrowRight size={16} className="ml-1.5 shrink-0" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 2 CONTENT: ASSIGNMENT, NOTES & DOCUMENTS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* ── SECTION 4: ASSIGNMENT & INITIAL STATUS ── */}
          <Card padding="md" className="bg-bg">
            <div className="border-b border-border pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-base">
                <UserCheck size={18} className="text-primary shrink-0" aria-hidden="true" />
                <span>4. Assignment & Initial Status</span>
              </div>
              <span className="text-xs text-text-muted font-normal">
                Assign internal owner & add handover remarks
              </span>
            </div>

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
                      <Clock size={15} className="text-primary shrink-0" />
                      <span>New inquiry will start at stage <strong className="text-heading">"New"</strong> and progress through Quoting and Won/Lost.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Handover Note / Comment Area */}
              <div className="mt-4 pt-4 border-t border-border/70 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label
                    htmlFor="initialComment"
                    className="text-xs font-semibold text-heading flex items-center gap-1.5"
                  >
                    <MessageSquare size={14} className="text-primary shrink-0" />
                    <span>Initial Comment / Handover Note (Optional)</span>
                  </label>
                  <span className="text-[11px] text-text-muted font-normal">
                    Automatically logged into inquiry activity upon saving
                  </span>
                </div>

                <textarea
                  id="initialComment"
                  name="initialComment"
                  rows={3}
                  value={form.initialComment}
                  onChange={handleChange}
                  placeholder="Add internal notes, customer communication summary, or handover instructions for the assigned team member..."
                  className="w-full rounded-lg border border-border bg-bg text-text text-sm p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/60"
                />
              </div>
            </div>
          </Card>

          {/* ── SECTION 5: DOCUMENTS & ATTACHMENTS ── */}
          <Card padding="md" className="bg-bg">
            <div className="border-b border-border pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-base">
                <Paperclip size={18} className="text-primary shrink-0" aria-hidden="true" />
                <span>5. Documents & Attachments</span>
              </div>
              <span className="text-xs text-text-muted font-normal">
                Attach RFQs, 2D/3D blueprints, specifications or client PO files
              </span>
            </div>

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
                          const err = validateFile(stageDocFile, getDocumentType(e.target.value));
                          setStageFileError(err);
                        }
                      }}
                    />
                    {activeStagedDocType && (
                      <p className="text-[11px] text-text-muted pt-0.5">
                        Allowed: <strong className="font-mono text-heading">{activeStagedDocType.allowedExtensions.join(', ')}</strong> • Max: <strong className="font-mono text-heading">{activeStagedDocType.maxSizeMB}MB</strong>
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
                  <label className="text-xs font-medium text-heading block">
                    Select File
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                    accept={activeStagedDocType?.allowedExtensions?.join(',') || undefined}
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
                            <FileCheck size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-heading font-mono truncate">
                              {stageDocFile.name}
                            </p>
                            <p className="text-[11px] text-text-muted font-mono tabular-nums">
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
                          <X size={13} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-1">
                        <UploadCloud size={24} className="text-primary/70 mb-1" />
                        <p className="text-xs font-semibold text-heading">
                          Click to choose file or drag & drop here
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {activeStagedDocType
                            ? `Allowed formats: ${activeStagedDocType.allowedExtensions.join(', ')} (Max ${activeStagedDocType.maxSizeMB}MB)`
                            : 'Select document type above'}
                        </p>
                      </div>
                    )}
                  </div>

                  {stageFileError && (
                    <p className="text-xs text-danger flex items-center gap-1 mt-0.5">
                      <AlertCircle size={13} />
                      <span>{stageFileError}</span>
                    </p>
                  )}
                </div>

                {/* Remarks and Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
                  <div className="flex-1">
                    <label
                      htmlFor="stageDocRemarks"
                      className="text-xs font-medium text-heading block mb-1"
                    >
                      Document Remarks (Optional)
                    </label>
                    <input
                      id="stageDocRemarks"
                      type="text"
                      value={stageDocRemarks}
                      onChange={(e) => setStageDocRemarks(e.target.value)}
                      placeholder="e.g. Initial customer specification copy..."
                      className="w-full rounded-lg border border-border bg-bg text-text text-xs px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleAddAttachment}
                    className="text-xs font-semibold shrink-0 h-9 w-full sm:w-auto justify-center"
                  >
                    <Plus size={15} className="mr-1.5 text-primary shrink-0" />
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
                    <span className="text-[11px] text-text-muted">
                      Will be uploaded upon inquiry creation
                    </span>
                  </div>

                  <table className="w-full min-w-[540px] text-xs text-left">
                    <thead>
                      <tr className="bg-surface/30 border-b border-border/70 text-[11px] font-semibold text-text-muted">
                        <th className="py-2.5 px-4 w-28">TYPE</th>
                        <th className="py-2.5 px-4 min-w-[140px]">DOCUMENT TITLE</th>
                        <th className="py-2.5 px-4 min-w-[180px]">FILE NAME</th>
                        <th className="py-2.5 px-4 w-24">SIZE</th>
                        <th className="py-2.5 px-4 min-w-[140px]">REMARKS</th>
                        <th className="py-2.5 px-4 w-24 text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {form.attachments.map((att) => {
                        const docType = getDocumentType(att.documentTypeId);
                        return (
                          <tr key={att.id} className="hover:bg-surface/30 transition-colors">
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${docType.badgeClass}`}
                              >
                                {docType.typeName}
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
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                                  title="View attachment details"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(att.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 border border-border/50 hover:border-danger/30 transition-all cursor-pointer"
                                  title="Remove attachment"
                                >
                                  <Trash2 size={15} />
                                </button>
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
          </Card>

          {/* ── Step 2 Bottom Action Controls ── */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handlePrevStep}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <ArrowLeft size={16} className="mr-1.5 shrink-0" />
              <span>Back to Inquiry Details</span>
            </Button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 sm:flex-initial"
              >
                <X size={16} className="mr-1.5" aria-hidden="true" />
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={loading}
                className="flex-1 sm:flex-initial justify-center"
              >
                <Save size={16} className="mr-1.5 shrink-0" />
                {isEdit ? 'Save Changes' : 'Create Inquiry'}
              </Button>
            </div>
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
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Document Type
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getDocumentType(previewAttachment.documentTypeId).badgeClass}`}>
                  {getDocumentType(previewAttachment.documentTypeId).typeName}
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
                <span className="text-text-muted block text-[11px] font-medium mb-0.5">Remarks</span>
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
                  <ExternalLink size={14} className="mr-1.5" />
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

      {/* ── Discard Changes Confirmation Modal ── */}
      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this inquiry form. Are you sure you want to discard them? All entered details will be lost."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="danger"
      />

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
