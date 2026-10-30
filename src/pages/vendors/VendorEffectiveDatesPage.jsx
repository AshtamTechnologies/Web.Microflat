/**
 * VendorEffectiveDatesPage — Effective-dated version history & master management for vendors.
 * Route: /vendors/:id/effective-dates
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconAttachment,
  IconBack,
  IconBuilding2,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconClose,
  IconContact,
  IconDelete,
  IconDocumentTypes,
  IconDownload,
  IconEdit,
  IconError,
  IconExternalLink,
  IconFileText,
  IconGlobe,
  IconImage,
  IconLocation,
  IconMail,
  IconMaximize2,
  IconPhone,
  IconSave,
  IconShieldCheck,
  IconSuccess,
  IconUpload,
  IconUser,
  IconVendor,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  SaveButton,
  CancelButton,
  Input,
  DatePicker,
  SearchableSelect,
  Badge,
  Card,
  CollapsibleCard,
  DetailField,
  TableContainer,
  Th,
  Td,
  Modal,
  ConfirmModal,
  PageHeader,
  Textarea,
  StatusBadge,
  Checkbox,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import { vendorService, approvalsService } from '../../services';
import {
  COUNTRY_OPTIONS,
  STATE_OPTIONS,
  getCountryName,
  getStateName,
} from '../../mocks/vendors';
import { useCountryState } from '../../context/CountryStateContext';
import { getActiveVendorVersion } from '../../utils/vendorVersions';
import { formatDateDisplay, getTodayIsoDate } from '../../utils/effectiveDateUtils';
import { formatDate, getTodayISO } from '../../utils/dateUtils';
import { countryIdToCode, stateIdToCode } from '../../models/vendors/vendorModel';
import {
  ApprovalStatus,
  ApprovalStatusLabel,
  getApprovalStatusLabel,
  getApprovalBadgeVariant,
  normalizeApprovalStatus,
} from '../../constants/approvalStatus';

const columnHelper = createColumnHelper();

const formatApprovedOrDate = (val, row) => {
  if (!val) return 'Not approved yet';
  if (row?.approvedByName && val === row.approvedByName) {
    return row.approvedOn ? `${val} (${formatDateDisplay(row.approvedOn)})` : val;
  }
  return formatDateDisplay(val);
};



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
  const type = (fileType || '').toLowerCase();

  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <IconFileText size={18} className="text-danger shrink-0" />;
  }
  return <IconImage size={18} className="text-primary shrink-0" />;
}

function formatAuditTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${formattedHours}:${minutes} ${ampm}`;
}

function legacyApprovalBadgeVariant(status) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'pending':
    default:
      return 'pending';
  }
}

export default function VendorEffectiveDatesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getVendorById, updateVendorVersions, updateVendor, toggleStatus, fetchVendorDetail } = useVendorsContext();

  const [fetchedVendor, setFetchedVendor] = useState(null);
  const [fetchingVendor, setFetchingVendor] = useState(Boolean(id && !getVendorById(id)));
  const [apiVersions, setApiVersions] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const loadVendorVersions = useCallback(async (vendorId) => {
    if (!vendorId) return;
    setLoadingVersions(true);
    try {
      // 1. GET /api/vendors/{vendorId}/versions
      const list = await vendorService.getVendorVersions(vendorId);
      if (Array.isArray(list)) {
        setApiVersions(list);
      }
    } catch (err) {
      console.warn('Failed to load /api/vendors/{id}/versions:', err);
      setApiVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      // Clear previous vendor's versions & selected version state immediately
      setSelectedVersionId(null);
      setApiVersions(null);
      setVersionDetailsMap({});
      modeInitializedRef.current = false;
      setPendingDeleteAttachmentIds([]);
      setAttachmentToDelete(null);

      const cached = getVendorById(id);
      if (cached) {
        setFetchedVendor(cached);
      }
      if (fetchVendorDetail) {
        if (!cached?.versions || cached.versions.length === 0) {
          setFetchingVendor(true);
        }
        fetchVendorDetail(id)
          .then((v) => {
            if (isMounted && v) {
              setFetchedVendor(v);
            }
          })
          .catch((err) => console.warn('Could not fetch vendor:', err))
          .finally(() => {
            if (isMounted) setFetchingVendor(false);
          });
      }
      loadVendorVersions(id);
    }
    return () => {
      isMounted = false;
    };
  }, [id, getVendorById, fetchVendorDetail, loadVendorVersions]);

  const vendor = fetchedVendor || getVendorById(id);

  const backPath = location.state?.from || '/vendors';
  const backLabel = location.state?.backLabel || 'Vendors';
  const isFromApproval = Boolean(
    location.state?.from === '/approvals/vendors' ||
    location.state?.isApprovalView
  );
  const isReadOnly = Boolean(
    location.state?.readOnly ||
    isFromApproval ||
    location.state?.from === '/vendors/dashboard'
  );

  // Approval Modal States
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveComments, setApproveComments] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  function handleOpenApprove() {
    setApproveComments('');
    setIsApproveModalOpen(true);
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setIsApproveModalOpen(false);
    setApproveComments('');
  }

  async function handleConfirmApprove(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!vendor) return;

    try {
      setIsSubmittingApprove(true);
      const now = formatAuditTimestamp();
      const targetReqId =
        location.state?.approvalRequestId ||
        selectedVersion?.latestApprovalRequest?.approvalRequestId ||
        selectedVersion?.latestApprovalRequest?.id ||
        vendor?.latestApprovalRequest?.approvalRequestId;

      if (targetReqId) {
        try {
          await approvalsService.approveRequest(targetReqId, {
            comments: approveComments.trim(),
            isDocumentVerified: true,
          });
        } catch (apiErr) {
          console.warn('POST /api/approval-requests/{id}/approve error:', apiErr);
        }
      }

      await updateVendor(vendor.id, {
        approvalStatus: ApprovalStatus.Approved,
        approvedOn: now,
        approvedBy: 'Current User',
        approvedByComments: approveComments.trim(),
      });
      toast.success(`${vendor.vendorName} approved successfully`);
      setIsApproveModalOpen(false);
    } catch {
      toast.error('Failed to approve vendor. Please try again.');
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  function handleOpenReject() {
    setRejectComments('');
    setIsRejectModalOpen(true);
  }

  function handleCloseReject() {
    if (isSubmittingReject) return;
    setIsRejectModalOpen(false);
    setRejectComments('');
  }

  async function handleConfirmReject(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!vendor || !rejectComments.trim()) return;

    try {
      setIsSubmittingReject(true);
      const now = formatAuditTimestamp();
      const targetReqId =
        location.state?.approvalRequestId ||
        selectedVersion?.latestApprovalRequest?.approvalRequestId ||
        selectedVersion?.latestApprovalRequest?.id ||
        vendor?.latestApprovalRequest?.approvalRequestId;

      if (targetReqId) {
        try {
          await approvalsService.rejectRequest(targetReqId, {
            comments: rejectComments.trim(),
          });
        } catch (apiErr) {
          console.warn('POST /api/approval-requests/{id}/reject error:', apiErr);
        }
      }

      await updateVendor(vendor.id, {
        approvalStatus: ApprovalStatus.Rejected,
        approvedOn: now,
        approvedBy: 'Current User',
        approvedByComments: rejectComments.trim(),
      });
      toast.success(`${vendor.vendorName} rejected`);
      setIsRejectModalOpen(false);
    } catch {
      toast.error('Failed to reject vendor. Please try again.');
    } finally {
      setIsSubmittingReject(false);
    }
  }

  // Deactivate Modal States
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivateComment, setDeactivateComment] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  function handleOpenDeactivate() {
    setDeactivateComment('');
    setDeactivateError('');
    setIsDeactivateModalOpen(true);
  }

  function handleCloseDeactivate() {
    if (isSubmittingDeactivate) return;
    setIsDeactivateModalOpen(false);
    setDeactivateComment('');
    setDeactivateError('');
  }

  async function handleConfirmDeactivate(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!vendor) return;

    if (!deactivateComment.trim()) {
      setDeactivateError('Inactive comment is compulsory when deactivating a vendor.');
      return;
    }

    try {
      setIsSubmittingDeactivate(true);
      const today = getTodayIsoDate();
      await updateVendor(vendor.id, {
        isActive: false,
        inactiveComment: deactivateComment.trim(),
        inactiveDate: today,
      });
      setIsDeactivateModalOpen(false);
    } catch {
      toast.error('Failed to update vendor status.');
    } finally {
      setIsSubmittingDeactivate(false);
    }
  }

  // Activate Modal States
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isSubmittingActivate, setIsSubmittingActivate] = useState(false);

  function handleOpenActivate() {
    setIsActivateModalOpen(true);
  }

  function handleCloseActivate() {
    if (isSubmittingActivate) return;
    setIsActivateModalOpen(false);
  }

  async function handleConfirmActivate() {
    if (!vendor) return;
    try {
      setIsSubmittingActivate(true);
      await updateVendor(vendor.id, {
        isActive: true,
        inactiveComment: '',
        inactiveDate: null,
      });
      setIsActivateModalOpen(false);
    } catch {
      toast.error('Failed to activate vendor.');
    } finally {
      setIsSubmittingActivate(false);
    }
  }

  // Versions array from API (GET /api/vendors/{vendorId}/versions)
  const versions = useMemo(() => {
    if (!Array.isArray(apiVersions)) return [];
    return [...apiVersions]
      .map((v) => ({
        id: v.vendorDetailId || v.id,
        vendorDetailId: v.vendorDetailId || v.id,
        effectiveDate: v.effectiveDate ? String(v.effectiveDate).slice(0, 10) : '',
        approvalStatus: normalizeApprovalStatus(v.approvalStatus),
        versionState: v.versionState || 'History',
        isActive: v.isActive !== false,
        attachmentCount: Number(v.attachmentCount) || 0,
        createdOn: v.createdOn || '',
        lastUpdatedOn: v.lastUpdatedOn || '',
      }))
      .sort((a, b) =>
        (b.effectiveDate || '').localeCompare(a.effectiveDate || '')
      );
  }, [apiVersions]);

  // Current active version (versionState === 'Current' or first in versions array)
  const activeVersion = useMemo(() => {
    if (versions.length === 0) return null;
    const current = versions.find((v) => (v.versionState || '').toLowerCase() === 'current');
    if (current) return current;
    return versions[0] || null;
  }, [versions]);

  // UI state: mode is 'VIEW' | 'EDIT' | 'ADD'
  const [mode, setMode] = useState(() => (location.state?.mode === 'EDIT' ? 'EDIT' : 'VIEW'));
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  useEffect(() => {
    if (false && location.state?.mode === 'EDIT') {
      setMode('EDIT');
    } else if (location.state?.readOnly) {
      setMode('VIEW');
    }
  }, [location.state?.mode, location.state?.readOnly]);

  // TanStack table state for resizable column grid
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Latest previous effective date that new revisions cannot precede
  const minAllowedEffectiveDate = useMemo(() => {
    const dates = versions
      .map((v) => (v.effectiveDate || '').slice(0, 10))
      .filter(Boolean);
    if (dates.length === 0) return null;
    return [...dates].sort().reverse()[0];
  }, [versions]);

  // Form state for ADD or EDIT
  const [formData, setFormData] = useState({
    effectiveDate: '',
    contactPersonName: '',
    phoneNo: '',
    alternatePhoneNo: '',
    email: '',
    gstNo: '',
    website: '',
    countryId: '',
    stateId: '',
    city: '',
    zipCode: '',
    address1: '',
    address2: '',
    notes: '',
  });

  // Attachments state for active/edit mode
  const [attachments, setAttachments] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const fileInputRef = useRef(null);

  // Deletion confirmation and deferred deletion on Save
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [versionToDelete, setVersionToDelete] = useState(null);
  const [pendingDeleteAttachmentIds, setPendingDeleteAttachmentIds] = useState([]);

  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [copyAttachments, setCopyAttachments] = useState(true);
  const [submitForApproval, setSubmitForApproval] = useState(true);
  const [apiDocTypes, setApiDocTypes] = useState([]);

  // Fetch active Document Types from GET /api/vendors/lookups
  useEffect(() => {
    let isMounted = true;
    vendorService
      .getVendorLookups()
      .then((data) => {
        if (isMounted && data?.documentTypes && Array.isArray(data.documentTypes)) {
          // Show only active document types
          const activeOnly = data.documentTypes.filter(
            (dt) => dt.isActive === true || dt.isActive === 'true'
          );
          setApiDocTypes(activeOnly);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch vendor lookups:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Default selection on mount or versions change
  useEffect(() => {
    if (versions.length > 0) {
      const isSelectedValid =
        selectedVersionId &&
        versions.some(
          (v) => String(v.vendorDetailId || v.id) === String(selectedVersionId)
        );
      if (!isSelectedValid) {
        const target =
          activeVersion?.vendorDetailId ||
          activeVersion?.id ||
          versions[0]?.vendorDetailId ||
          versions[0]?.id;
        if (target) {
          setSelectedVersionId(target);
        }
      }
    }
  }, [versions, activeVersion, selectedVersionId]);

  // Version details cache for GET /api/vendor-versions/{vendorDetailId}
  const [versionDetailsMap, setVersionDetailsMap] = useState({});
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);

  // Pre-seed version details cache with currentDetail from GET /api/vendors/{id}
  useEffect(() => {
    if (vendor?.currentDetail?.vendorDetailId) {
      const cur = vendor.currentDetail;
      const curId = cur.vendorDetailId;
      setVersionDetailsMap((prev) => {
        if (!prev[curId]) {
          return {
            ...prev,
            [curId]: {
              ...cur,
              id: curId,
              vendorDetailId: curId,
              effectiveDate: cur.effectiveDate ? cur.effectiveDate.slice(0, 10) : '',
              countryId: countryIdToCode(cur.countryId),
              stateId: stateIdToCode(cur.stateId),
              attachments: Array.isArray(cur.attachments) ? cur.attachments : [],
            },
          };
        }
        return prev;
      });
    }
  }, [vendor]);

  // Fetch version detail from GET /api/vendor-versions/{vendorDetailId} whenever selected version changes
  useEffect(() => {
    let isMounted = true;
    const targetVerId =
      selectedVersionId ||
      activeVersion?.vendorDetailId ||
      activeVersion?.id ||
      versions[0]?.vendorDetailId ||
      versions[0]?.id;
    if (targetVerId) {
      if (!versionDetailsMap[targetVerId]) {
        setIsLoadingVersion(true);
        vendorService
          .getVendorVersion(targetVerId)
          .then((verDetail) => {
            if (isMounted && verDetail) {
              setVersionDetailsMap((prev) => ({
                ...prev,
                [targetVerId]: verDetail,
              }));
            }
          })
          .catch((err) => {
            console.warn('Could not fetch vendor version details:', err);
          })
          .finally(() => {
            if (isMounted) setIsLoadingVersion(false);
          });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [selectedVersionId, activeVersion?.vendorDetailId, activeVersion?.id, versions, versionDetailsMap]);

  // The currently viewed/selected version object merged with rich version details
  const selectedVersion = useMemo(() => {
    const targetId = selectedVersionId || activeVersion?.vendorDetailId || activeVersion?.id || versions[0]?.vendorDetailId || versions[0]?.id;
    const baseSummary =
      versions.find((v) => String(v.vendorDetailId || v.id) === String(targetId)) ||
      activeVersion ||
      versions[0] ||
      null;
    const fullDetail = targetId ? versionDetailsMap[targetId] : null;

    if (!baseSummary && !fullDetail) return null;

    return {
      ...(baseSummary || {}),
      ...(fullDetail || {}),
      id: fullDetail?.vendorDetailId || baseSummary?.vendorDetailId || baseSummary?.id || targetId,
      vendorDetailId: fullDetail?.vendorDetailId || baseSummary?.vendorDetailId || targetId,
      effectiveDate: fullDetail?.effectiveDate || baseSummary?.effectiveDate || '',
      attachments: fullDetail?.attachments || baseSummary?.attachments || vendor?.attachments || [],
    };
  }, [versions, selectedVersionId, activeVersion, versionDetailsMap, vendor]);

  // Attachments for the currently viewed version (version-scoped)
  const currentViewAttachments = useMemo(() => {
    if (!selectedVersion) return [];
    if (Array.isArray(selectedVersion.attachments)) {
      return selectedVersion.attachments;
    }
    // Fallback if top-level vendor has attachments
    return vendor?.attachments || [];
  }, [selectedVersion, vendor]);

  const isDraftOrRejected = useMemo(() => {
    if (!selectedVersion) return false;
    const numSt = normalizeApprovalStatus(selectedVersion.approvalStatus);
    const verState = String(selectedVersion.versionState || '').toLowerCase();
    // Safely computed without calling .toLowerCase() on numeric status
    return numSt === ApprovalStatus.Draft || numSt === ApprovalStatus.Rejected || verState === 'draft' || verState === 'rejected';
  }, [selectedVersion]);

  // Synchronize attachments when entering EDIT or ADD mode or switching view
  useEffect(() => {
    if (mode === 'VIEW') {
      setAttachments(currentViewAttachments);
    }
  }, [mode, currentViewAttachments]);

  const {
    countryOptions,
    getStateOptions,
    fetchStatesForCountry,
  } = useCountryState();

  useEffect(() => {
    if (formData.countryId) {
      fetchStatesForCountry(formData.countryId);
    }
  }, [formData.countryId, fetchStatesForCountry]);

  // Cascading state options
  const stateOptions = useMemo(() => {
    if (!formData.countryId) return [];
    return getStateOptions(formData.countryId);
  }, [formData.countryId, getStateOptions]);

  /* ── Handlers for switching modes ── */
  async function handleSelectView(ver) {
    const verId = ver.vendorDetailId || ver.id;
    setSelectedVersionId(verId);
    setMode('VIEW');
    setFormErrors({});

    // If already in cache, display immediately for instant UI response
    if (versionDetailsMap[verId]) {
      setAttachments(versionDetailsMap[verId].attachments || []);
    } else {
      setIsLoadingVersion(true);
    }

    // Always fetch fresh version details from GET /api/vendor-versions/{vendorDetailId}
    try {
      const fetched = await vendorService.getVendorVersion(verId);
      if (fetched) {
        setVersionDetailsMap((prev) => ({ ...prev, [verId]: fetched }));
        setAttachments(fetched.attachments || []);
      }
    } catch (err) {
      console.warn('Could not fetch vendor version details:', err);
    } finally {
      setIsLoadingVersion(false);
    }
  }

  async function handleStartEdit(ver) {
    if (!ver) return;
    const numSt = normalizeApprovalStatus(ver.approvalStatus);
    const verState = String(ver.versionState || '').toLowerCase();
    const canEdit =
      numSt === ApprovalStatus.Draft ||
      numSt === ApprovalStatus.Rejected ||
      verState === 'draft' ||
      verState === 'rejected';

    if (!canEdit) {
      return;
    }
    const verId = ver.vendorDetailId || ver.id;
    setSelectedVersionId(verId);
    setMode('EDIT');
    setFormErrors({});
    setPendingDeleteAttachmentIds([]);
    setAttachmentToDelete(null);

    let full = versionDetailsMap[verId] || ver;
    // Set immediate form values from cache
    setFormData({
      effectiveDate: full.effectiveDate || ver.effectiveDate || '',
      contactPersonName: full.contactPersonName || ver.contactPersonName || '',
      phoneNo: full.phoneNo || ver.phoneNo || '',
      alternatePhoneNo: full.alternatePhoneNo || ver.alternatePhoneNo || '',
      email: full.email || ver.email || '',
      gstNo: full.gstNo || ver.gstNo || '',
      website: full.website || ver.website || '',
      countryId: full.countryId || ver.countryId || 2,
      stateId: full.stateId || ver.stateId || '',
      city: full.city || ver.city || '',
      zipCode: full.zipCode || ver.zipCode || '',
      address1: full.address1 || ver.address1 || '',
      address2: full.address2 || ver.address2 || '',
      notes: full.notes || ver.notes || '',
    });
    setAttachments(Array.isArray(full.attachments) ? full.attachments : []);

    // Always fetch latest fresh data from GET /api/vendor-versions/{vendorDetailId} for editing
    try {
      setIsLoadingVersion(true);
      const fetched = await vendorService.getVendorVersion(verId);
      if (fetched) {
        setVersionDetailsMap((prev) => ({ ...prev, [verId]: fetched }));
        setFormData({
          effectiveDate: fetched.effectiveDate || '',
          contactPersonName: fetched.contactPersonName || '',
          phoneNo: fetched.phoneNo || '',
          alternatePhoneNo: fetched.alternatePhoneNo || '',
          email: fetched.email || '',
          gstNo: fetched.gstNo || '',
          website: fetched.website || '',
          countryId: fetched.countryId || 2,
          stateId: fetched.stateId || '',
          city: fetched.city || '',
          zipCode: fetched.zipCode || '',
          address1: fetched.address1 || '',
          address2: fetched.address2 || '',
          notes: fetched.notes || '',
        });
        setAttachments(Array.isArray(fetched.attachments) ? fetched.attachments : []);
      }
    } catch (err) {
      console.warn('Could not fetch version detail for edit:', err);
    } finally {
      setIsLoadingVersion(false);
    }
  }

  // Handle incoming edit mode from navigation
  const modeInitializedRef = useRef(false);
  useEffect(() => {
    if (
      !modeInitializedRef.current &&
      false && location.state?.mode === 'EDIT' &&
      Array.isArray(apiVersions) &&
      versions.length > 0
    ) {
      const target = activeVersion || versions[0];
      if (target) {
        modeInitializedRef.current = true;
        const draftOrRejectedVer = versions.find((v) => {
          const numSt = normalizeApprovalStatus(v.approvalStatus);
          const verState = String(v.versionState || '').toLowerCase();
          return (
            numSt === ApprovalStatus.Draft ||
            numSt === ApprovalStatus.Rejected ||
            verState === 'draft' ||
            verState === 'rejected'
          );
        });
        if (draftOrRejectedVer) {
          handleStartEdit(draftOrRejectedVer);
        } else {
          handleStartAdd();
        }
      }
    }
  }, [location.state?.mode, apiVersions, versions, activeVersion]);

  // Synchronize formData with loaded version details in EDIT mode
  useEffect(() => {
    if (mode === 'EDIT' && selectedVersionId && versionDetailsMap[selectedVersionId]) {
      const detail = versionDetailsMap[selectedVersionId];
      if (!formData.contactPersonName && detail.contactPersonName) {
        setFormData({
          effectiveDate: detail.effectiveDate || '',
          contactPersonName: detail.contactPersonName || '',
          phoneNo: detail.phoneNo || '',
          alternatePhoneNo: detail.alternatePhoneNo || '',
          email: detail.email || '',
          gstNo: detail.gstNo || '',
          website: detail.website || '',
          countryId: detail.countryId || 'IN',
          stateId: detail.stateId || '',
          city: detail.city || '',
          zipCode: detail.zipCode || '',
          address1: detail.address1 || '',
          address2: detail.address2 || '',
          notes: detail.notes || '',
        });
        setAttachments(Array.isArray(detail.attachments) ? detail.attachments : []);
      }
    }
  }, [mode, selectedVersionId, versionDetailsMap, formData.contactPersonName]);

  async function handleStartAdd() {
    setCopyAttachments(true);
    setSubmitForApproval(true);
    setPendingDeleteAttachmentIds([]);
    setAttachmentToDelete(null);

    // Identify the latest version record (newest version at versions[0] or activeVersion)
    const latestVersionRecord = versions[0] || activeVersion || selectedVersion || null;
    const latestVerId = latestVersionRecord?.vendorDetailId || latestVersionRecord?.id;

    let base = latestVerId ? versionDetailsMap[latestVerId] : null;

    const today = getTodayIsoDate();
    const initialDate = minAllowedEffectiveDate && minAllowedEffectiveDate > today
      ? minAllowedEffectiveDate
      : today;

    const applyPrefill = (src) => {
      if (!src) return;
      setFormData({
        effectiveDate: initialDate,
        contactPersonName: src.contactPersonName || '',
        phoneNo: src.phoneNo || '',
        alternatePhoneNo: src.alternatePhoneNo || '',
        email: src.email || '',
        gstNo: src.gstNo || '',
        website: src.website || '',
        countryId: src.countryId || 2,
        stateId: src.stateId || '',
        city: src.city || '',
        zipCode: src.zipCode || '',
        address1: src.address1 || '',
        address2: src.address2 || '',
        notes: src.notes || '',
      });
      const baseAtts = Array.isArray(src.attachments)
        ? src.attachments
        : vendor?.attachments || [];
      setAttachments([...baseAtts]);
    };

    // Pre-fill immediately with cached data or available summary
    if (base) {
      applyPrefill(base);
    } else {
      setFormData({
        effectiveDate: initialDate,
        contactPersonName: latestVersionRecord?.contactPersonName || '',
        phoneNo: latestVersionRecord?.phoneNo || '',
        alternatePhoneNo: latestVersionRecord?.alternatePhoneNo || '',
        email: latestVersionRecord?.email || '',
        gstNo: latestVersionRecord?.gstNo || '',
        website: latestVersionRecord?.website || '',
        countryId: latestVersionRecord?.countryId || '',
        stateId: latestVersionRecord?.stateId || '',
        city: latestVersionRecord?.city || '',
        zipCode: latestVersionRecord?.zipCode || '',
        address1: latestVersionRecord?.address1 || '',
        address2: latestVersionRecord?.address2 || '',
        notes: latestVersionRecord?.notes || '',
      });
      setAttachments([]);
    }

    setMode('ADD');
    setFormErrors({});

    // Fetch fresh details of the latest version to ensure all fields are completely pre-filled
    if (latestVerId) {
      if (!base?.contactPersonName) {
        setIsLoadingVersion(true);
      }
      try {
        const fresh = await vendorService.getVendorVersion(latestVerId);
        if (fresh) {
          setVersionDetailsMap((prev) => ({ ...prev, [latestVerId]: fresh }));
          applyPrefill(fresh);
        }
      } catch (err) {
        console.warn('Could not fetch last version for pre-fill:', err);
      } finally {
        setIsLoadingVersion(false);
      }
    }
  }

  function handleCancel() {
    setMode('VIEW');
    setFormErrors({});
    setPendingDeleteAttachmentIds([]);
    setAttachmentToDelete(null);
    setAttachments(currentViewAttachments);
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleCountryChange(e) {
    const nextCountryId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      countryId: nextCountryId,
      stateId: '', // reset state on country change
    }));
    if (formErrors.countryId || formErrors.stateId) {
      setFormErrors((prev) => ({ ...prev, countryId: '', stateId: '' }));
    }
  }

  /* ── Attachment Handlers ── */
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

    setAttachments((prev) => [...prev, ...newAttachments]);

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

  function handleRequestDeleteAttachment(att) {
    setAttachmentToDelete(att);
  }

  function handleConfirmDeleteAttachment() {
    if (!attachmentToDelete) return;
    const id = attachmentToDelete.id;

    // Record server-persisted attachment ID to be deleted when clicking Save Changes
    const serverId =
      attachmentToDelete.attachmentId ||
      (typeof id === 'number' ? id : null);
    if (serverId) {
      setPendingDeleteAttachmentIds((prev) => {
        if (!prev.includes(serverId)) {
          return [...prev, serverId];
        }
        return prev;
      });
    }

    // Remove from local attachments list
    setAttachments((prev) => prev.filter((att) => att.id !== id));
    setAttachmentToDelete(null);
  }

  async function handleDownloadAttachment(att, e) {
    if (e) e.stopPropagation();
    if (att.id && typeof att.id === 'number') {
      try {
        await vendorService.downloadVendorAttachment(att.id, att.fileName);
        return;
      } catch (err) {
        toast.error('Failed to download document from server');
      }
    }
    if (att.fileUrl) {
      const a = document.createElement('a');
      a.href = att.fileUrl;
      a.download = att.fileName || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob(
        [`MicroFlat ERP Document: ${att.documentName}\nFile: ${att.fileName}`],
        { type: 'text/plain;charset=utf-8' }
      );
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

  /* ── Form Validation ── */
  function validateForm() {
    const errors = {};

    // 1. Effective Date validation
    if (!formData.effectiveDate?.trim()) {
      errors.effectiveDate = 'Effective date is required.';
    } else {
      const enteredDate = formData.effectiveDate.trim();
      // Check collision with other versions
      const collision = versions.find((v) => {
        if (mode === 'EDIT' && v.id === selectedVersionId) return false;
        return v.effectiveDate === enteredDate;
      });
      if (collision) {
        errors.effectiveDate = 'Another version with this effective date already exists for this vendor.';
      } else if (mode === 'ADD' && minAllowedEffectiveDate && enteredDate < minAllowedEffectiveDate) {
        errors.effectiveDate = `Effective date cannot be earlier than previous effective date (${formatDateDisplay(minAllowedEffectiveDate)}).`;
      }
    }

    // 2. Contact Person Name
    if (!formData.contactPersonName?.trim()) {
      errors.contactPersonName = 'Contact person name is required.';
    }

    // 3. Phone Number
    if (!formData.phoneNo?.trim()) {
      errors.phoneNo = 'Phone number is required.';
    }

    // 4. Email
    if (!formData.email?.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // 5. City
    if (!formData.city?.trim()) {
      errors.city = 'City is required.';
    }

    // 6. State
    if (!formData.stateId) {
      errors.stateId = 'Please select a state.';
    }

    // 7. Zip Code
    if (!formData.zipCode?.trim()) {
      errors.zipCode = 'ZIP / Postal code is required.';
    }

    // 8. Address 1
    if (!formData.address1?.trim()) {
      errors.address1 = 'Address line 1 is required.';
    }

    return errors;
  }

  /* ── Form Submit ── */
  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setIsSaving(true);
    const now = formatAuditTimestamp();

    try {
      if (mode === 'EDIT') {
        const targetVerId =
          selectedVersionId ||
          activeVersion?.vendorDetailId ||
          activeVersion?.id ||
          versions[0]?.vendorDetailId ||
          versions[0]?.id;

        try {
          if (targetVerId) {
            await vendorService.editVendorVersion(targetVerId, formData);

            // 1. Delete attachments marked for deletion on server
            if (pendingDeleteAttachmentIds.length > 0) {
              for (const delId of pendingDeleteAttachmentIds) {
                try {
                  await vendorService.deleteVendorAttachment(delId);
                } catch (delErr) {
                  console.warn(`Failed to delete attachment ${delId} on server:`, delErr);
                }
              }
              setPendingDeleteAttachmentIds([]);
            }

            // 2. Upload newly added local files
            const rawFiles = attachments.filter((a) => a.file);
            for (const att of rawFiles) {
              await vendorService.uploadVersionAttachment(targetVerId, {
                documentTypeId: att.documentTypeId || 1,
                documentName: att.documentName || att.fileName,
                file: att.file,
              });
            }
          }
        } catch (apiErr) {
          console.warn('PUT /api/vendor-versions/{id} failed:', apiErr);
          if (apiErr?.status === 400 || apiErr?.status === 422) {
            toast.error(apiErr.detail || apiErr.message || 'Validation error updating version.');
            return;
          }
        }

        // Invalidate cache for this version
        setVersionDetailsMap((prev) => {
          const next = { ...prev };
          delete next[targetVerId];
          return next;
        });

        // Re-fetch fresh version list and version details
        if (id) {
          await loadVendorVersions(id);
          try {
            const fresh = await vendorService.getVendorVersion(targetVerId);
            if (fresh) {
              setVersionDetailsMap((prev) => ({ ...prev, [targetVerId]: fresh }));
            }
          } catch (e) {
            console.warn('Could not refresh version detail:', e);
          }
        }

        // Update existing version entry in vendor context
        if (updateVendorVersions && vendor?.id) {
          const updatedVersions = (vendor.effectiveVersions || []).map((v) => {
            if (String(v.vendorDetailId || v.id) !== String(targetVerId)) return v;
            return {
              ...v,
              effectiveDate: formData.effectiveDate.trim(),
              contactPersonName: formData.contactPersonName.trim(),
              phoneNo: formData.phoneNo.trim(),
              alternatePhoneNo: formData.alternatePhoneNo?.trim() || '',
              gstNo: formData.gstNo?.trim().toUpperCase() || '',
              website: formData.website?.trim() || '',
              email: formData.email.trim(),
              countryId: formData.countryId,
              stateId: formData.stateId,
              city: formData.city.trim(),
              zipCode: formData.zipCode.trim(),
              address1: formData.address1.trim(),
              address2: formData.address2?.trim() || '',
              notes: formData.notes?.trim() || '',
              attachments: [...attachments],
            };
          });
          updateVendorVersions(vendor.id, updatedVersions);
        }

        toast.success('Effective date updated');
        setMode('VIEW');
      } else if (mode === 'ADD') {
        const rawFiles = attachments.filter((a) => a.file || a.rawFile);
        const hasNewRawAttachments = rawFiles.length > 0;
        let createdVersionId = null;

        try {
          // If uploading brand new local files, keep Draft first (initialSubmit = false)
          // so version accepts uploads, then submit afterwards.
          // Otherwise, submit directly according to submitForApproval.
          const initialSubmit = hasNewRawAttachments ? false : submitForApproval;

          const createdVer = await vendorService.createVendorVersion(
            vendor?.id || id,
            formData,
            copyAttachments,
            initialSubmit
          );
          createdVersionId = createdVer?.vendorDetailId || createdVer?.id;

          if (createdVersionId && hasNewRawAttachments) {
            for (const att of rawFiles) {
              await vendorService.uploadVersionAttachment(createdVersionId, {
                documentTypeId: att.documentTypeId || 1,
                documentName: att.documentName || att.fileName,
                file: att.file || att.rawFile,
              });
            }
            if (submitForApproval) {
              await vendorService.submitVendorVersion(createdVersionId);
            }
          }
        } catch (apiErr) {
          console.warn('POST /api/vendors/{id}/versions failed:', apiErr);
          if (apiErr?.status === 400 || apiErr?.status === 422) {
            toast.error(apiErr.detail || apiErr.message || 'Validation error adding version.');
            return;
          }
        }

        // Re-fetch fresh version list from API (GET /api/vendors/{vendorId}/versions)
        if (vendor?.id || id) {
          await loadVendorVersions(vendor?.id || id);
        }

        const newVersionId = createdVersionId || `ver_${Date.now()}`;

        // Fetch fresh details for this created version to populate versionDetailsMap
        if (createdVersionId) {
          try {
            const fresh = await vendorService.getVendorVersion(createdVersionId);
            if (fresh) {
              setVersionDetailsMap((prev) => ({ ...prev, [createdVersionId]: fresh }));
            }
          } catch (e) {
            console.warn('Could not load new version detail:', e);
          }
        }

        // Also keep local fallback context in sync if available
        if (updateVendorVersions && vendor?.id) {
          const newVersion = {
            id: newVersionId,
            vendorDetailId: createdVersionId,
            effectiveDate: formData.effectiveDate.trim(),
            contactPersonName: formData.contactPersonName.trim(),
            phoneNo: formData.phoneNo.trim(),
            alternatePhoneNo: formData.alternatePhoneNo?.trim() || '',
            gstNo: formData.gstNo?.trim().toUpperCase() || '',
            website: formData.website?.trim() || '',
            email: formData.email.trim(),
            countryId: formData.countryId,
            stateId: formData.stateId,
            city: formData.city.trim(),
            zipCode: formData.zipCode.trim(),
            address1: formData.address1.trim(),
            address2: formData.address2?.trim() || '',
            notes: formData.notes?.trim() || '',
            attachments: [...attachments],
            createdOn: now,
            createdBy: 'Current User',
          };
          const updatedVersions = [...(vendor.effectiveVersions || []), newVersion];
          await updateVendorVersions(vendor.id, updatedVersions);
        }

        toast.success(
          submitForApproval
            ? 'New effective date added and submitted for approval'
            : 'New effective date draft added'
        );
        setSelectedVersionId(newVersionId);
        setMode('VIEW');
      }
    } catch {
      toast.error('Failed to save vendor version.');
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Submit Draft Version For Approval ── */
  async function handleSubmitVersionForApproval() {
    const targetVerId = selectedVersionId || activeVersion?.id || versions[0]?.id;
    if (!targetVerId) return;
    try {
      setIsSaving(true);
      await vendorService.submitVendorVersion(targetVerId);
      toast.success('Version submitted for approval.');
      setVersionDetailsMap((prev) => {
        const next = { ...prev };
        delete next[targetVerId];
        return next;
      });
      if (getVendorById) {
        getVendorById(vendor.id);
      }
    } catch (err) {
      toast.error(err?.detail || err?.message || 'Failed to submit version for approval.');
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Delete Draft or Rejected Version ── */
  function handleRequestDeleteVersion(ver) {
    if (!ver) return;
    if (versions.length <= 1) {
      toast.error("Cannot delete the vendor's only version.");
      return;
    }
    setVersionToDelete(ver);
  }

  async function handleConfirmDeleteVersion() {
    if (!versionToDelete) return;
    const verId = versionToDelete.vendorDetailId || versionToDelete.id;
    if (!verId) return;
    if (versions.length <= 1) {
      toast.error("Cannot delete the vendor's only version.");
      return;
    }


    try {
      setIsSaving(true);
      await vendorService.deleteVendorVersion(verId);
      toast.success('Version deleted successfully.');
      const remaining = (vendor.effectiveVersions || []).filter(
        (v) => String(v.id) !== String(verId) && String(v.vendorDetailId) !== String(verId)
      );
      await updateVendorVersions(vendor.id, remaining);
      setSelectedVersionId(remaining[0]?.id || null);
      if (vendor?.id || id) {
        await loadVendorVersions(vendor?.id || id);
      }
      setVersionToDelete(null);
    } catch (err) {
      toast.error(err?.detail || err?.message || 'Failed to delete version.');
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Column Definitions for Resizable TanStack Table Grid ── */
  const allColumns = useMemo(
    () => [
      /* 1. EFFECTIVE DATE */
      columnHelper.accessor('effectiveDate', {
        header: 'EFFECTIVE DATE',
        minSize: 140,
        size: 160,
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-heading py-0.5 block">
            {formatApprovedOrDate(info.getValue(), info.row.original)}
          </span>
        ),
      }),

      /* 2. VERSION STATE */
      columnHelper.accessor('versionState', {
        header: 'VERSION STATE',
        minSize: 130,
        size: 140,
        cell: (info) => {
          const state = info.getValue() || 'History';
          const s = String(state).toLowerCase();
          let badgeCls = 'bg-muted/30 text-text-muted border-border';
          if (s === 'current') {
            badgeCls = 'bg-success/15 text-success border-success/30 font-bold';
          } else if (s === 'scheduled') {
            badgeCls = 'bg-sky-500/15 text-sky-600 border-sky-500/30 font-semibold';
          }
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs border select-none ${badgeCls}`}
            >
              {state}
            </span>
          );
        },
      }),

      /* 3. APPROVAL STATUS */
      columnHelper.accessor('approvalStatus', {
        header: 'APPROVAL STATUS',
        minSize: 130,
        size: 140,
        cell: (info) => {
          const status = info.getValue() || 'Pending';
          return (
            <Badge variant={getApprovalBadgeVariant(status)}>
              {getApprovalStatusLabel(status)}
            </Badge>
          );
        },
      }),

      /* 4. STATUS */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 100,
        size: 110,
        cell: (info) => <StatusBadge status={info.getValue()} size="sm" />,
      }),


      columnHelper.accessor('attachmentCount', {
        header: 'ATTACHMENTS',
        minSize: 110,
        size: 120,
        cell: (info) => {
          const count = Number(info.getValue()) || 0;
          return (
            <div className="flex items-center gap-1.5 py-0.5 text-xs">
              <IconAttachment
                size={13}
                className={count > 0 ? 'text-primary' : 'text-text-muted/60'}
              />
              <span className="font-mono text-xs text-text font-medium">{count}</span>
            </div>
          );
        },
      }),

      // 6. APPROVED BY
      columnHelper.accessor('approvedByName', {
        header: 'APPROVED BY',
        minSize: 140,
        size: 160,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted py-0.5 block">
            {formatApprovedOrDate(info.getValue(), info.row.original)}
          </span>
        ),
      }),

      /* 7. LAST UPDATED ON */
      columnHelper.accessor('lastUpdatedOn', {
        header: 'LAST UPDATED ON',
        minSize: 140,
        size: 160,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted py-0.5 block">
            {formatApprovedOrDate(info.getValue(), info.row.original)}
          </span>
        ),
      }),

      /* 8. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 80,
        size: 90,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const rowId = row.vendorDetailId || row.id;
          const isSelected =
            String(selectedVersion?.vendorDetailId || selectedVersion?.id) ===
            String(rowId);

          return (
            <div
              className="flex items-center justify-end gap-1 py-0.5 pr-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSelectView(row)}
                title="View this version"
                className={
                  isSelected && mode === 'VIEW'
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-muted hover:text-primary hover:bg-surface'
                }
              >
                <IconView size={15} />
              </Button>
            </div>
          );
        },
      }),
    ],
    [selectedVersion, mode]
  );

  // Filter out Attachment and Approved By columns as requested
  const columns = useMemo(
    () =>
      allColumns.filter(
        (col) =>
          col.accessorKey !== 'attachmentCount' &&
          col.id !== 'attachmentCount' &&
          col.accessorKey !== 'approvedByName' &&
          col.id !== 'approvedByName'
      ),
    [allColumns]
  );

  /* ── React Table Instance with Column Resizing Enabled ── */
  const table = useReactTable({
    data: versions,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (fetchingVendor) {
    return (
      <div className="w-full py-12 px-4 sm:px-6">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
          <p className="text-sm text-text-muted">Loading vendor effective dates...</p>
        </div>
      </div>
    );
  }

  // Not found fallback
  if (!vendor) {
    return (
      <div className="w-full py-12 px-4 sm:px-6">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
          <IconError size={40} className="text-warning mx-auto" />
          <h2 className="text-xl font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The vendor you are trying to edit does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/vendors')}>
            <IconBack size={16} className="mr-2" />
            Back to Vendors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── 1. HEADER (FULL SCREEN WIDTH) ── */}
      <PageHeader
        title={vendor.vendorName}
        subtitle="Effective-dated version history, master details, and supporting documents"
        icon={<IconVendor className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
            {vendor.vendorCode}
          </span>
        }
        backButton={{
          onClick: () => navigate(backPath),
          label: backLabel,
        }}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {normalizeApprovalStatus(vendor.approvalStatus) === ApprovalStatus.Approved && (
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium select-none',
                  vendor.isActive
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20',
                ].join(' ')}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${vendor.isActive ? 'bg-success' : 'bg-danger'
                    }`}
                  aria-hidden="true"
                />
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
            )}

            <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
              {getApprovalStatusLabel(vendor.approvalStatus)}
            </Badge>

            {!isReadOnly && mode === 'VIEW' && selectedVersion && isDraftOrRejected && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleStartEdit(selectedVersion)} disabled={!vendor.isActive} icon={IconEdit} className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title={!vendor.isActive ? 'Vendor is inactive. Activate vendor to edit version.' : `Edit ${vendor.vendorName} effective date details`}
              >
                Edit Vendor
              </Button>
            )}

            {!isReadOnly && normalizeApprovalStatus(vendor.approvalStatus) === ApprovalStatus.Approved && (
              vendor.isActive ? (
                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={handleOpenDeactivate} icon={IconClose} className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Mark vendor inactive"
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleOpenActivate} icon={IconCheck} className="text-xs font-semibold transition-all h-8 px-3.5 shadow-2xs flex items-center gap-1.5 cursor-pointer bg-success hover:bg-success/90 text-white border-transparent"
                  title="Re-activate vendor"
                >
                  Activate
                </Button>
              )
            )}

            {isFromApproval && normalizeApprovalStatus(vendor.approvalStatus) === ApprovalStatus.Pending && (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={handleOpenApprove}
                  className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title={`Approve ${vendor.vendorName}`}
                >
                  <IconCheck size={14} className="" aria-hidden="true" />
                  Approve
                </Button>

                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={handleOpenReject}
                  className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title={`Reject ${vendor.vendorName}`}
                >
                  <IconClose size={14} className="" aria-hidden="true" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* ── INACTIVE VENDOR NOTICE (SIMPLE & SINGLE) ── */}
      {!vendor.isActive && (
        <div className="rounded-xl border border-danger/30 bg-danger/[0.04] p-3.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-danger/10 text-danger shrink-0 mt-0.5 sm:mt-0">
              <IconError size={16} className="" />
            </div>
            <div className="text-xs text-heading flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-danger">Inactive Reason:</span>
              <span className="font-medium text-heading">
                {vendor.inactiveComment || 'No inactive reason specified.'}
              </span>
              {vendor.inactiveDate && (
                <span className="text-2xs font-mono text-text-muted ml-1">
                  ({formatDate(vendor.inactiveDate)})</span>

              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. EFFECTIVE DATES GRID / CARDS (CARD WITH RESIZABLE COLUMNS) ── */}
      <CollapsibleCard
        title="Effective Dates"
        subtitle="Timeline of version records for this vendor. Drag column borders to resize columns."
        icon={<IconCalendar size={17} />}
        defaultOpen={true}
        className="overflow-hidden shadow-xs border-border"
        actions={
          !isReadOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartAdd}
              disabled={!vendor.isActive}
              className="text-xs shrink-0 w-full sm:w-auto justify-center"
              title={
                !vendor.isActive
                  ? 'Vendor is inactive. Activate vendor to add new effective dates.'
                  : 'Add new effective date'
              }
            >
              <IconAdd size={14} className="mr-1.5" />
              Add New Effective Date
            </Button>
          )
        }
      >

        {/* ── MOBILE VIEW (< md): Card List for Small Screens ── */}
        <div className="block md:hidden p-3 space-y-2.5 bg-bg/50 max-h-[260px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          {loadingVersions ? (
            <div className="py-8 text-center text-xs text-text-muted flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span>Loading versions...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No effective date records found for this vendor.
            </div>
          ) : (
            versions.map((ver) => {
              const isSelected =
                String(selectedVersion?.vendorDetailId || selectedVersion?.id) ===
                String(ver.vendorDetailId || ver.id);
              const attCount = Number(ver.attachmentCount) || 0;
              const state = ver.versionState || 'History';
              const s = String(state).toLowerCase();
              let stateBadgeCls = 'bg-muted/30 text-text-muted border-border';
              if (s === 'current') {
                stateBadgeCls = 'bg-success/15 text-success border-success/30 font-bold';
              } else if (s === 'scheduled') {
                stateBadgeCls = 'bg-sky-500/15 text-sky-600 border-sky-500/30 font-semibold';
              }

              return (
                <div
                  key={ver.vendorDetailId || ver.id}
                  onClick={() => handleSelectView(ver)}
                  className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left relative ${isSelected
                    ? 'bg-primary/[0.06] border-primary ring-2 ring-primary/20 shadow-xs'
                    : 'bg-surface border-border hover:border-primary/40'
                    }`}
                >
                  {/* Top line: Date + Badges + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-heading">
                          {formatDateDisplay(ver.effectiveDate)}</span>
        
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs border select-none ${stateBadgeCls}`}>
                          {state}</span>
        
                        <Badge variant={getApprovalBadgeVariant(ver.approvalStatus)}>
                          {getApprovalStatusLabel(ver.approvalStatus)}
                        </Badge>
                        <StatusBadge status={ver.isActive} size="sm" />
                      </div>
                    </div>

                    {/* Mobile Card Actions */}
                    <div
                      className="flex items-center gap-1 shrink-0 -mt-1 -mr-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSelectView(ver)}
                        title="View this version"
                        className={`h-7 w-7 ${isSelected && mode === 'VIEW'
                          ? 'bg-primary/15 text-primary'
                          : 'text-text-muted hover:text-primary hover:bg-surface'
                          }`}
                      >
                        <IconView size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Middle / Bottom line: Context info */}
                  <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-2xs text-text-muted">
                    <div className="flex items-center gap-1.5 font-mono">
                      <IconClock size={11} className="shrink-0 text-text-muted/70" />
                      <span>{ver.approvedByName ? `Approved by: ${ver.approvedByName}` : 'Not approved yet'}</span>
                    </div>

                    {ver.lastUpdatedOn && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <IconClock size={11} className="shrink-0 text-text-muted/70" />
                        <span>Updated: {formatDateDisplay(ver.lastUpdatedOn)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-2xs font-medium">
                      <IconAttachment size={11} className={attCount > 0 ? 'text-primary' : 'text-text-muted/60'} />
                      <span>{attCount} attachment{attCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── DESKTOP & TABLET VIEW (md+): Resizable TanStack Table Grid with Scroll & Sticky Header ── */}
        <div className="hidden md:block max-h-[230px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          <TableContainer>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-surface border-b border-border sticky top-0 z-10 shadow-2xs">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={
                          header.column.getCanResize()
                            ? header.getResizeHandler()
                            : undefined
                        }
                        className={`relative py-3.5 px-6 select-none bg-surface ${canSort ? 'cursor-pointer hover:bg-surface/80' : ''
                          }`}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="group/th-btn flex items-center gap-1.5 w-full text-left select-none cursor-pointer hover:text-heading transition-colors"
                          >
                            <span className="truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                            {/* REMOVE_OLD_HEADER
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                              )}
            

                            REMOVE_OLD_HEADER */}
                            <span className="shrink-0 ml-1 inline-flex items-center">
                              {sorted === 'asc' ? (
                                <IconChevronUp
                                  size={14}
                                  className="text-primary"
                                  aria-hidden="true"
                                />
                              ) : sorted === 'desc' ? (
                                <IconChevronDown
                                  size={14}
                                  className="text-primary"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <IconChevronUp size={11} />
                                  <IconChevronDown size={11} />
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div
                            style={{/*
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div

                                </span>
                
                              )}
            
                          </button>
                        ) : (
                          <div

                            */}}
                            className={`select-none ${header.id === 'actions' ? 'text-right w-full pr-1' : ''
                              }`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </Th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border bg-bg">
              {loadingVersions ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-xs text-text-muted"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      <span>Loading versions...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-xs text-text-muted"
                  >
                    No effective date records found for this vendor.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSelected =
                    String(selectedVersion?.vendorDetailId || selectedVersion?.id) ===
                    String(row.original.vendorDetailId || row.original.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectView(row.original)}
                      className={`cursor-pointer transition-colors duration-120 ${isSelected
                        ? 'bg-primary/[0.06]'
                        : 'hover:bg-surface/50'
                        }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className="py-3.5 px-6"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </Td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableContainer>
        </div>
      </CollapsibleCard>

      {/* ── 3. DETAIL / FORM PANEL (CARD) ── */}
      <CollapsibleCard
        title={
          mode === 'VIEW' ? (
            <>
              Viewing version — Effective{' '}
              <span className="font-mono text-primary">
                {formatDateDisplay(selectedVersion?.effectiveDate)}
              </span>
            </>
          ) : mode === 'EDIT' ? (
            <>
              Editing version — Effective{' '}
              <span className="font-mono text-primary">
                {formatDateDisplay(formData.effectiveDate || selectedVersion?.effectiveDate)}
              </span>
            </>
          ) : (
            'Add new effective date'
          )
        }
        subtitle={
          mode === 'VIEW'
            ? 'Read-only view of fields and attachments effective from this date.'
            : mode === 'EDIT'
              ? 'Modify versioned vendor information, address, and attachments.'
              : 'Clone-forward from current active version with a new unique effective date.'
        }
        icon={<IconVendor size={17} />}
        defaultOpen={true}
        className="overflow-hidden shadow-xs border-border"
        actions={
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-end">
            {!isReadOnly && mode === 'VIEW' && selectedVersion && isDraftOrRejected && (
              <>
                {isDraftOrRejected && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitVersionForApproval}
                    disabled={isSaving || !vendor.isActive}
                    className="text-xs w-full sm:w-auto justify-center bg-primary text-white"
                    title="Submit this draft version for approval"
                  >
                    <IconShieldCheck size={13} className="mr-1.5" />
                    Submit for Approval
                  </Button>
                )}
                {isDraftOrRejected && versions.length > 1 && (
                  <Button
                    variant="danger-soft"
                    size="sm"
                    onClick={() => handleRequestDeleteVersion(selectedVersion)}
                    disabled={isSaving}
                    className="text-xs w-full sm:w-auto justify-center text-danger hover:bg-danger/10"
                    title="Delete this draft version"
                  >
                    <IconDelete size={13} className="mr-1.5" />
                    Delete Version
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStartEdit(selectedVersion)}
                  disabled={!vendor.isActive}
                  className="text-xs w-full sm:w-auto justify-center"
                  title={
                    !vendor.isActive
                      ? 'Vendor is inactive. Activate vendor to edit version.'
                      : 'Edit this version'
                  }
                >
                  <IconEdit size={13} className="mr-1.5" />
                  Edit this version
                </Button>
              </>
            )}

            {(mode === 'EDIT' || mode === 'ADD') && (
              <>
                <CancelButton
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-xs shadow-2xs"
                />
                <SaveButton
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  loading={isSaving}
                  loadingText="Saving..."
                  disabled={isSaving}
                  className="text-xs"
                >
                  Save Changes
                </SaveButton>
              </>
            )}
          </div>
        }
      >

        {/* Loading spinner while versions or version details are loading */}
        {loadingVersions ||
        (isLoadingVersion && !selectedVersion && mode === 'VIEW') ||
        (mode === 'EDIT' && (loadingVersions || (isLoadingVersion && !formData.effectiveDate))) ? (
          <div className="py-12 text-center text-xs text-text-muted flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <span>Loading version details...</span>
          </div>
        ) : null}

        {!loadingVersions && versions.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            No effective date records found for this vendor.
          </div>
        ) : null}

        {/* ── Mode 1: VIEW MODE ── */}
        {!loadingVersions && mode === 'VIEW' && selectedVersion && (
          <div className="p-4 sm:p-6 space-y-6 divide-y divide-border/60">
            {/* 1. Contact Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <IconContact size={15} className="text-primary" />
                Contact Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                <DetailField
                  label="Effective Date"
                  value={formatDateDisplay(selectedVersion.effectiveDate)}
                  mono
                />
                <DetailField
                  label="Contact Person Name"
                  value={selectedVersion.contactPersonName}
                />
                <DetailField
                  label="Phone Number"
                  value={selectedVersion.phoneNo}
                  mono
                />
                <DetailField
                  label="Alternate Phone"
                  value={selectedVersion.alternatePhoneNo}
                  mono
                />
                <DetailField
                  label="Email Address"
                  value={selectedVersion.email}
                />
                <DetailField
                  label="GST / Tax Identification"
                  value={selectedVersion.gstNo}
                  mono
                />
                <DetailField
                  label="Website URL"
                  value={selectedVersion.website}
                  isLink
                  href={selectedVersion.website}
                />
              </div>
            </div>

            {/* 2. Address Details */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <IconLocation size={15} className="text-primary" />
                Address Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                <DetailField
                  label="Country"
                  value={getCountryName(selectedVersion.countryId)}
                />
                <DetailField
                  label="State"
                  value={getStateName(selectedVersion.countryId, selectedVersion.stateId)}
                />
                <DetailField
                  label="City"
                  value={selectedVersion.city}
                />
                <DetailField
                  label="ZIP / Postal Code"
                  value={selectedVersion.zipCode}
                  mono
                />
                <DetailField
                  label="Address Line 1"
                  value={selectedVersion.address1}
                />
                <DetailField
                  label="Address Line 2"
                  value={selectedVersion.address2}
                />
              </div>
            </div>

            {/* 3. Procurement Notes & Version Audit */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <IconFileText size={15} className="text-primary" />
                Procurement & Quality Notes
              </div>
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  {/* <span className="text-2xs font-semibold  tracking-wider text-text-muted block"> */}
                  <span className="view-field-label mf-detail-label">
                    Notes & Terms
                  </span>
  
                  <div className="text-xs text-heading font-medium bg-surface/50 rounded-lg p-3.5 border border-border/60 whitespace-pre-line leading-relaxed">
                    {selectedVersion.notes || 'No specific notes recorded for this effective date.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <DetailField
                    label="Approved On"
                    value={selectedVersion.approvedOn ? formatDateDisplay(selectedVersion.approvedOn) : 'Not approved yet'}
                    mono
                  />
                  <DetailField
                    label="Approved By"
                    value={selectedVersion.approvedByName || 'Not approved yet'}
                  />
                </div>
              </div>
            </div>

            {/* 4. Attachments & Supporting Documents (VIEW MODE — Click opens Screen Popup) */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                  <IconAttachment size={15} className="text-primary" />
                  Attachments & Supporting Documents
                  <span className="text-2xs font-normal text-text-muted ml-1">
                    ({currentViewAttachments.length})
                  </span>
  
                </div>



              </div>

              {currentViewAttachments.length === 0 ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No documents or certificates attached for this effective date.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {currentViewAttachments.map((att) => (
                    <div
                      key={att.id}

                      className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface hover:border-primary/40 transition-all select-none"

                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-surface border border-border group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors shrink-0">
                          {getFileIcon(att.fileName, att.fileType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                            {att.documentName || att.fileName}
                          </p>
                          <p className="text-2xs text-text-muted truncate mt-0.5">
                            {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            /* no-op */
                          }}
                          className="!hidden hidden" style={{ display: 'none' }}

                        >
                          {null}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDownloadAttachment(att, e)}
                          title="Download document"
                          className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/10"
                        >
                          <IconDownload size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Mode 2 & 3: EDIT & ADD FORM ── */}
        {!loadingVersions && (mode === 'EDIT' || mode === 'ADD') && (!isLoadingVersion || formData.effectiveDate || mode === 'ADD') && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {/* Section 1: Effective Date & Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <IconContact size={15} className="text-primary" />
                Contact Information
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Effective Date */}
                <div>
                  <DatePicker
                    id="effectiveDate"
                    name="effectiveDate"
                    label="Effective Date"
                    min={mode === 'ADD' ? (minAllowedEffectiveDate || undefined) : undefined}
                    value={formData.effectiveDate}
                    onChange={handleInputChange}
                    error={formErrors.effectiveDate}
                    disabled={mode === 'EDIT'}
                    hint={
                      mode === 'EDIT'
                        ? 'Effective date cannot be changed for an existing revision.'
                        : (minAllowedEffectiveDate ? `Must be on or after ${formatDateDisplay(minAllowedEffectiveDate)}` : undefined)
                    }
                    required
                  />
                </div>

                {/* Contact Person Name */}
                <div>
                  <Input
                    id="contactPersonName"
                    name="contactPersonName"
                    label="Contact Person Name"
                    placeholder="e.g. Rajesh Patel"
                    value={formData.contactPersonName}
                    onChange={handleInputChange}
                    error={formErrors.contactPersonName}
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <Input
                    id="phoneNo"
                    name="phoneNo"
                    label="Phone Number"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.phoneNo}
                    onChange={handleInputChange}
                    error={formErrors.phoneNo}
                    required
                  />
                </div>

                {/* Alternate Phone */}
                <div>
                  <Input
                    id="alternatePhoneNo"
                    name="alternatePhoneNo"
                    label="Alternate Phone"
                    type="tel"
                    placeholder="e.g. 9823456781"
                    value={formData.alternatePhoneNo}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <Input
                    id="email"
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="e.g. rajesh.patel@apexcastings.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={formErrors.email}
                    required
                  />
                </div>

                {/* GST Number */}
                <div>
                  <Input
                    id="gstNo"
                    name="gstNo"
                    label="GST / Tax ID"
                    placeholder="e.g. 24AABCA1234F1Z5"
                    value={formData.gstNo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        gstNo: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>

                {/* Website */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <Input
                    id="website"
                    name="website"
                    label="Website URL"
                    type="url"
                    placeholder="e.g. https://www.apexcastings.com"
                    value={formData.website}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Address Details */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <IconLocation size={15} className="text-primary" />
                Address Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Country */}
                <div>
                  <SearchableSelect
                    id="countryId"
                    name="countryId"
                    label="Country"
                    required
                    options={countryOptions}
                    value={formData.countryId}
                    onChange={handleCountryChange}
                    placeholder="Select Country..."
                    searchPlaceholder="Search country..."
                    error={formErrors.countryId}
                  />
                </div>

                {/* State */}
                <div>
                  <SearchableSelect
                    id="stateId"
                    name="stateId"
                    label="State"
                    required
                    options={stateOptions}
                    value={formData.stateId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, stateId: e.target.value }));
                      if (formErrors.stateId) {
                        setFormErrors((prev) => ({ ...prev, stateId: '' }));
                      }
                    }}
                    placeholder="Select State..."
                    searchPlaceholder="Search state..."
                    disabled={!formData.countryId}
                    error={formErrors.stateId}
                  />
                </div>

                {/* City */}
                <div>
                  <Input
                    id="city"
                    name="city"
                    label="City"
                    placeholder="e.g. Vallabh Vidyanagar"
                    value={formData.city}
                    onChange={handleInputChange}
                    error={formErrors.city}
                    required
                  />
                </div>

                {/* Address Line 1 */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <Input
                    id="address1"
                    name="address1"
                    label="Address Line 1"
                    placeholder="e.g. Plot 45, GIDC Industrial Estate Phase II"
                    value={formData.address1}
                    onChange={handleInputChange}
                    error={formErrors.address1}
                    required
                  />
                </div>

                {/* Address Line 2 */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <Input
                    id="address2"
                    name="address2"
                    label="Address Line 2"
                    placeholder="e.g. Near Anand Cross Road"
                    value={formData.address2}
                    onChange={handleInputChange}
                  />
                </div>

                {/* ZIP / Postal Code */}
                <div>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    label="ZIP / Postal Code"
                    placeholder="e.g. 388120"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    error={formErrors.zipCode}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Notes & Instructions */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <IconFileText size={15} className="text-primary" />
                Procurement & Quality Notes
              </div>

              <div>
                <Textarea
                  id="notes"
                  name="notes"
                  label="Notes & Terms"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Summarize reasons for this effective date update or revision..."
                />
              </div>
            </div>

            {/* Section 4: Attachments & Supporting Documents (EDIT/ADD MODE — Version-Scoped) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider pb-2 border-b border-border/60">
                <IconAttachment size={15} className="text-primary" />
                Attachments & Supporting Documents for this Version
                <span className="text-2xs font-normal text-text-muted ml-1">
                  ({attachments.length})
                </span>

              </div>

              {/* Copy Attachments Option for ADD Mode */}
              {mode === 'ADD' && (
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/[0.04] flex items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-heading flex items-center gap-2">
                      <IconAttachment size={14} className="text-primary" />
                      Copy attachments from previous version
                    </p>
                    <p className="text-2xs text-text-muted">
                      Include all documents and attachments from the older version in this new effective date revision.
                    </p>
                  </div>
                  <Checkbox
                    id="copyAttachments"
                    name="copyAttachments"
                    checked={copyAttachments}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCopyAttachments(checked);
                      if (!checked) {
                        setAttachments((prev) => prev.filter((a) => a.file || a.rawFile));
                      } else {
                        const latest = versions[0] || activeVersion || selectedVersion;
                        const prevDetail = latest ? versionDetailsMap[latest.vendorDetailId || latest.id] : null;
                        const baseAtts = prevDetail?.attachments || latest?.attachments || vendor?.attachments || [];
                        setAttachments((prev) => {
                          const rawOnly = prev.filter((a) => a.file || a.rawFile);
                          return [...baseAtts, ...rawOnly];
                        });
                      }
                    }}
                    className="shrink-0 pt-0.5 sm:pt-0"
                  />
                </div>
              )}

              {/* Upload Header Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <SearchableSelect
                    id="docTypeSelector"
                    label="Document Name / Type"
                    placeholder="Select Document Name / Type..."
                    searchPlaceholder="Search document types..."
                    emptyText="No matching document types found"
                    options={documentTypeOptions}
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                  />
                </div>

                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 text-xs"
                  >
                    <IconUpload size={15} className="mr-1.5" />
                    Browse Files
                  </Button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 ${isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-surface/50'
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
                <IconUpload
                  size={28}
                  className={`mx-auto mb-2 ${isDragging ? 'text-primary' : 'text-text-muted'
                    }`}
                />
                <p className="text-xs font-semibold text-heading">
                  Drag and drop files here, or <span className="text-primary">browse</span>
                </p>
                <p className="text-2xs text-text-muted mt-1">
                  Supported formats: {acceptExtensions.replace(/,/g, ', ')} (Up to {maxFileSizeMB} MB per file)
                </p>
              </div>

              {attachmentError && (
                <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center gap-2">
                  <IconError size={14} className="shrink-0" />
                  <span>{attachmentError}</span>
                </div>
              )}

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg hover:border-primary/40 transition-colors"
                    >
                      <div
  

                        className="flex items-center gap-2.5 min-w-0 flex-1"
                      >
                        {getFileIcon(att.fileName, att.fileType)}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-heading truncate hover:text-primary transition-colors">
                            {att.documentName || att.fileName}
                          </p>
                          <p className="text-2xs text-text-muted truncate">
                            {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
    
                          style={{ display: 'none' }} className="hidden"

                        >
                          {null}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDownloadAttachment(att, e)}
                          className="h-7 w-7 text-text-muted hover:text-primary"

                        >
                          <IconDownload size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRequestDeleteAttachment(att)}
                          style={{ display: 'none' }} className="hidden"

                        >
                          {null}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission Option for ADD Mode */}
            {mode === 'ADD' && (
              <div className="p-3.5 rounded-xl border border-border bg-surface/70 flex items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-heading flex items-center gap-2">
                    <IconShieldCheck size={14} className="text-primary" />
                    Submit for approval immediately
                  </p>
                  <p className="text-2xs text-text-muted">
                    Submit this new revision directly for approval upon saving (uncheck to save as draft).
                  </p>
                </div>
                <Checkbox
                  id="submitForApproval"
                  name="submitForApproval"
                  checked={submitForApproval}
                  onChange={(e) => setSubmitForApproval(e.target.checked)}
                  className="shrink-0 pt-0.5 sm:pt-0"
                />
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
              <CancelButton
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="shadow-2xs"
              />
              <SaveButton
                type="submit"
                size="sm"
                loading={isSaving}
                loadingText="Saving..."
                disabled={isSaving}
              >
                {mode === 'ADD' ? 'Add Effective Date' : 'Save Changes'}
              </SaveButton>
            </div>
          </form>
        )}
      </CollapsibleCard>

      {/* ── Document Screen Popup (Modal) ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.documentName || previewItem.fileName}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-surface/50 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="text-2xs font-mono">
                  {previewItem.fileName.split('.').pop()?.toUpperCase() || 'DOC'}
                </Badge>
                <span className="text-heading font-medium truncate max-w-xs sm:max-w-md">
                  {previewItem.fileName}
                </span>
              </div>
              {/* REMOVE_DUPE
                  {previewItem.fileName}

              </div>
              REMOVE_DUPE */}
              <div className="flex items-center gap-3 text-text-muted">
                {previewItem.fileSize && (
                  <span>Size: <strong className="text-heading">{previewItem.fileSize}</strong></span>
                )}
                {previewItem.uploadedAt && (
                  <span>Uploaded: <strong className="text-heading font-mono">{formatDate(previewItem.uploadedAt)}</strong></span>
                )}
              </div>
            </div>

            {/* Screen Popup Preview Content */}
            <div className="bg-bg rounded-2xl border border-border p-4 sm:p-6 flex items-center justify-center min-h-[320px] max-h-[65vh] overflow-auto shadow-inner">
              {previewItem.fileUrl ? (
                previewItem.fileType?.startsWith('image/') ? (
                  <img
                    src={previewItem.fileUrl}
                    alt={previewItem.documentName}
                    className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <iframe
                    src={previewItem.fileUrl}
                    title={previewItem.documentName}
                    className="w-full h-[55vh] rounded-xl border border-border shadow-xs"
                  />
                )
              ) : (
                /* Enhanced visual certificate / document card presentation for mock documents */
                <div className="w-full max-w-lg bg-surface border-2 border-border/80 rounded-2xl p-6 shadow-sm text-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                    <IconShieldCheck size={180} />
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                    {previewItem.fileName?.toLowerCase().endsWith('.pdf') ? (
                      <IconFileText size={28} className="text-danger" />
                    ) : (
                      <IconDocumentTypes size={28} className="text-primary" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-bold bg-success/10 text-success border border-success/20">
                      <IconShieldCheck size={12} /> Verified Document
                    </span>
    
                    <h4 className="text-base font-bold text-heading mt-2">
                      {previewItem.documentName || previewItem.fileName}
                    </h4>
                    <p className="text-xs text-text-muted font-mono">
                      {previewItem.fileName}
                    </p>
                  </div>

                  <div className="bg-bg rounded-xl p-3 border border-border text-left space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Vendor:</span>
                      <span className="font-semibold text-heading">{vendor.vendorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Document Type:</span>
                      <span className="font-semibold text-heading">{previewItem.documentName || 'General Attachment'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">File Size:</span>
                      <span className="font-mono text-heading">{previewItem.fileSize || 'Standard Document'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Effective Scope:</span>
                      <span className="font-mono text-heading">{selectedVersion?.effectiveDate ? formatDateDisplay(selectedVersion.effectiveDate) : 'Master'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Popup Action Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewItem(null)}
              >
                Close
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={(e) => handleDownloadAttachment(previewItem, e)}
              >
                <IconDownload size={14} className="mr-1.5" />
                Download Document
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Approve Modal (With Approval Comments) ── */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={handleCloseApprove}
        title="Approve Vendor Application"
        maxWidth="max-w-xl"
      >
        {vendor && (
          <form onSubmit={handleConfirmApprove} className="space-y-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-success/5 border border-success/20">
              <div className="w-11 h-11 rounded-xl bg-success/15 border border-success/30 text-success flex items-center justify-center shrink-0">
                <IconSuccess size={22} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendor.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendor.vendorCode}
                  </span>
  
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                  {vendor.contactPersonName && (
                    <span className="flex items-center gap-1">
                      <IconUser size={12} className="text-text-muted/70" />
                      {vendor.contactPersonName}
                    </span>
    
                  )}
                  {vendor.city && (
                    <span className="flex items-center gap-1">
                      <IconLocation size={12} className="text-text-muted/70" />
                      {vendor.city}, {getStateName(vendor.countryId, vendor.stateId)}
                    </span>
    
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Approving will activate this vendor for purchase orders and procurement workflows.
            </p>

            {/* Approval Comments Field */}
            <div className="space-y-1.5">
              <Textarea
                id="page-approve-comments"
                label="Approval Remarks / Notes (Optional)"
                rows={3}
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                placeholder="Add optional notes or compliance remarks..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <CancelButton
                size="md"
                onClick={handleCloseApprove}
                disabled={isSubmittingApprove}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmittingApprove}
                className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-white border-transparent"
              >
                <IconCheck size={15} />
                Confirm Approval
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Reject Modal (With Reason for Rejection) ── */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={handleCloseReject}
        title="Reject Vendor Application"
        maxWidth="max-w-xl"
      >
        {vendor && (
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-surface/70 border border-border">
              <div className="w-11 h-11 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center shrink-0">
                <IconBuilding2 size={20} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendor.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendor.vendorCode}
                  </span>
  
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                  {vendor.contactPersonName && (
                    <span className="flex items-center gap-1">
                      <IconUser size={12} className="text-text-muted/70" />
                      {vendor.contactPersonName}
                    </span>
    
                  )}
                  {vendor.city && (
                    <span className="flex items-center gap-1">
                      <IconLocation size={12} className="text-text-muted/70" />
                      {vendor.city}, {getStateName(vendor.countryId, vendor.stateId)}
                    </span>
    
                  )}
                </div>
              </div>
            </div>

            {/* Rejection Comments Field */}
            <div className="space-y-1.5">
              <Textarea
                id="page-reject-comments"
                label="Rejection Reason"
                required
                rows={3}
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Please state reasons for rejection..."
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/15 text-xs text-text-muted">
              <IconError size={15} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Rejecting will mark this vendor as <strong>Rejected</strong>.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <CancelButton
                size="md"
                onClick={handleCloseReject}
                disabled={isSubmittingReject}
              />
              <Button
                type="submit"
                variant="danger"
                size="md"
                disabled={!rejectComments.trim() || isSubmittingReject}
                loading={isSubmittingReject}
                className="flex items-center gap-1.5"
              >
                <IconClose size={15} />
                Reject Vendor
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Deactivate Modal (With Compulsory Inactive Comment) ── */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={handleCloseDeactivate}
        title="Deactivate Vendor Account"
        maxWidth="max-w-xl"
      >
        {vendor && (
          <form onSubmit={handleConfirmDeactivate} className="space-y-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-surface/70 border border-border">
              <div className="w-11 h-11 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center shrink-0">
                <IconBuilding2 size={20} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendor.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendor.vendorCode}
                  </span>
  
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Deactivating this vendor will block purchase requisition and purchase order creation.
                </p>
              </div>
            </div>

            {/* Inactive Comment Field */}
            <div className="space-y-1.5">
              <Textarea
                id="page-deactivate-comment"
                label="Reason for Inactivating"
                required
                rows={3}
                value={deactivateComment}
                onChange={(e) => setDeactivateComment(e.target.value)}
                placeholder="Explain why this vendor is being marked inactive..."
              />
              {deactivateError && (
                <span className="text-xs font-medium text-danger block">
                  {deactivateError}
                </span>

              )}
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/15 text-xs text-text-muted">
              <IconError size={15} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                An Inactive reason is <strong>compulsory</strong>. It will be recorded and prominently shown on the vendor profile.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <CancelButton
                size="md"
                onClick={handleCloseDeactivate}
                disabled={isSubmittingDeactivate}
              />
              <Button
                type="submit"
                variant="danger"
                size="md"
                disabled={!deactivateComment.trim() || isSubmittingDeactivate}
                loading={isSubmittingDeactivate}
                className="flex items-center gap-1.5"
              >
                <IconClose size={15} />
                Confirm Deactivation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Activate Confirmation Modal ── */}
      <Modal
        isOpen={isActivateModalOpen}
        onClose={handleCloseActivate}
        title="Activate Vendor Account"
        maxWidth="max-w-md"
      >
        {vendor && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-surface/70 border border-border">
              <div className="w-11 h-11 rounded-xl bg-success/10 border border-success/20 text-success flex items-center justify-center shrink-0">
                <IconSuccess size={22} className="" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-heading truncate">
                    {vendor.vendorName}
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                    {vendor.vendorCode}
                  </span>
  
                </div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Are you sure you want to mark this vendor as <strong>Active</strong>? This will re-enable purchase order creation and new effective date revisions.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <CancelButton
                size="md"
                onClick={handleCloseActivate}
                disabled={isSubmittingActivate}
              />
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmActivate}
                loading={isSubmittingActivate}
                className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-white border-transparent"
              >
                <IconCheck size={15} />
                Confirm Activation
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Attachment Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => setAttachmentToDelete(null)}
        title="Delete Attachment"
        confirmText="Delete"
        variant="danger"
        message={
          attachmentToDelete ? (
            <p>
              Are you sure you want to delete{' '}
              <strong className="text-heading font-semibold">
                {attachmentToDelete.documentName || attachmentToDelete.fileName}
              </strong>
              ? This document will be permanently deleted when you click Save Changes.
            </p>
          ) : null
        }
        onConfirm={handleConfirmDeleteAttachment}
      />

      {/* ── Delete Version Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(versionToDelete)}
        onClose={() => setVersionToDelete(null)}
        onConfirm={handleConfirmDeleteVersion}
        title="Delete Version"
        message={
          <span>
            Are you sure you want to delete the version effective on{' '}
            <strong className="text-heading font-semibold">
              {formatDateDisplay(versionToDelete?.effectiveDate)}
            </strong>?
            This will permanently remove this version and all associated information and attachments. This action cannot be undone.
          </span>
        }
        confirmText="Delete Version"
        cancelText="Cancel"
        variant="danger"
        loading={isSaving}
      />
    </div>
  );
}
