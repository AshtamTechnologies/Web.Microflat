/**
 * ClientEffectiveDatesPage.jsx — Effective-dated version history & master management for clients.
 * Route: /clients/:id/effective-dates
 *
 * Implements the exact UX pattern from VendorEffectiveDatesPage:
 *   - PageHeader with title, client code/id badge, back button, and status badges.
 *   - Card 1: Effective Dates timeline table with TanStack resizable columns, sorting,
 *             mobile card view (< md), "Current" badge, and "+ Add New Effective Date" action.
 *   - Card 2: Detail / Form Panel with 3 unified modes:
 *       1. VIEW MODE: Complete read-only snapshot displaying:
 *            - Company & Contact Information
 *            - Terms & Notes (with payment term chips, rendered delivery terms, comments)
 *            - Client Addresses (responsive cards)
 *            - Contact Persons (responsive cards)
 *            - Version Audit information
 *            - "Edit this version" button in header (disabled on History versions)
 *            - "Delete Version" button for Scheduled revisions where canDelete is true
 *       2. EDIT MODE: In-line editable form where:
 *            - Effective Date DatePicker is DISABLED for existing revisions
 *            - Tabbed editor: Company Details & Terms, AddressesEditor, ContactsEditor
 *            - Save Changes & Cancel buttons (PUT /api/client-versions/{versionId})
 *       3. ADD MODE: In-line editable form where:
 *            - Effective Date DatePicker is ENABLED for picking a new future date
 *            - Clones forward from current active revision
 *            - Save Changes & Cancel buttons (POST /api/clients/{id}/versions)
 *
 * Integrated with real Client API endpoints per integration guide (Oct 30, 2026).
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconBack,
  IconBuilding2,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClient,
  IconClock,
  IconClose,
  IconDelete,
  IconEdit,
  IconFileText,
  IconInquiry,
  IconLocation,
  IconMail,
  IconPhone,
  IconUsers,
  IconView,
} from '../../constants/icons';
import { formatDateTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

import {
  Button,
  SaveButton,
  CancelButton,
  Badge,
  PageHeader,
  CollapsibleCard,
  Input,
  Checkbox,
  DatePicker,
  DetailField,
  TableContainer,
  Th,
  Td,
  SearchableSelect,
  SearchableMultiSelect,
  ScrollableTabs,
  ConfirmModal,
  StatusSwitch,
} from '../../components/ui';
import RichTextEditor from '../../components/ui/RichTextEditor';
import AddressesEditor from './components/AddressesEditor';
import ContactsEditor from './components/ContactsEditor';
import { useClientsContext } from '../../context/ClientsContext';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import { useAuthContext } from '../../context/AuthContext';
import {
  getContactTypeBadgeVariant,
  getCountryName,
  getStateName,
  getAddressTypeBadgeVariant,
} from '../../mocks/clients';
import { getClientRevisions, getActiveClientVersion, toIntegerVersionId } from '../../utils/clientVersions';
import {
  formatDateDisplay,
  getTodayIsoDate,
  getEffectiveDateStatus,
} from '../../utils/effectiveDateUtils';

const columnHelper = createColumnHelper();

/**
 * Safely decodes HTML entities (e.g. &lt;p&gt; -> <p>, &amp; -> &, &quot; -> ")
 * and cleans up pre-encoded or double-encoded HTML strings from the API.
 */
function decodeHtmlString(str) {
  if (!str || typeof str !== 'string') return '';
  let res = str.trim();

  // If the string starts and ends with JSON quotes
  if (res.startsWith('"') && res.endsWith('"') && res.length >= 2) {
    try {
      res = JSON.parse(res);
    } catch {
      // ignore
    }
  }

  // If the string contains HTML entities (like &lt;, &gt;, &amp;, &quot;, &#39;, &nbsp;)
  if (/&(?:lt|gt|amp|quot|#39|#x27|nbsp);/i.test(res)) {
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = res;
      res = txt.value;
      // Handle potential double-encoding (e.g. &amp;lt;p&amp;gt;)
      if (/&lt;[a-z/!]/i.test(res)) {
        txt.innerHTML = res;
        res = txt.value;
      }
    } catch {
      res = res
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
    }
  }

  return res;
}

/**
 * Renders formatted HTML or fallback plain text cleanly with typography styling.
 */
function FormattedHtmlBlock({ content, emptyText = 'None specified.', className = '' }) {
  const decoded = useMemo(() => decodeHtmlString(content), [content]);

  if (!decoded) {
    return <span className="text-text-muted italic">{emptyText}</span>;
  }

  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(decoded);

  if (hasHtmlTags) {
    return (
      <div
        className={`text-xs text-text leading-relaxed max-w-none prose prose-xs [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1.5 [&_li]:my-0.5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-heading [&_em]:italic [&_a]:text-primary [&_a]:underline ${className}`}
        dangerouslySetInnerHTML={{ __html: decoded }}
      />
    );
  }

  return (
    <p className={`text-xs text-text whitespace-pre-line leading-relaxed ${className}`}>
      {decoded}
    </p>
  );
}

export default function ClientEffectiveDatesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuthContext();
  const isAdmin = user?.role === 'Admin' || user?.roles?.includes('Admin') || user?.isAdmin;

  const {
    getClientById,
    fetchClientDetail,
    fetchVersionDetail,
    addClientVersion,
    updateClientVersion,
    deleteClientVersion,
    deleteClient,
    toggleClientActive,
    lookups,
  } = useClientsContext();

  const { paymentTerms = [] } = usePaymentTermsContext();

  const backPath = location.state?.from || '/clients';
  const backLabel = location.state?.backLabel || 'Clients';
  const isReadOnly = Boolean(location.state?.readOnly);

  const [client, setClient] = useState(() => getClientById(id));
  const [isLoadingClient, setIsLoadingClient] = useState(!client);
  const [versionToDelete, setVersionToDelete] = useState(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);

  // Dynamic Contact Type options from Lookups
  const contactTypeOptions = useMemo(() => {
    const list = Array.isArray(lookups?.contactTypes) && lookups.contactTypes.length > 0
      ? lookups.contactTypes
      : ['Customer', 'Distributor', 'Dealer', 'Agency'];

    return list.map((t) => ({ value: t, label: t }));
  }, [lookups]);

  // Load client from API on mount
  const refreshClient = useCallback(async () => {
    if (!id) return null;
    try {
      const data = await fetchClientDetail(id);
      if (data) {
        setClient(data);
      }
      return data;
    } catch (err) {
      console.warn('Could not fetch client detail from API:', err);
      return null;
    } finally {
      setIsLoadingClient(false);
    }
  }, [id, fetchClientDetail]);

  useEffect(() => {
    refreshClient();
  }, [refreshClient]);

  // All versions computed with live temporal statuses
  const versions = useMemo(() => {
    return getClientRevisions(client);
  }, [client]);

  // Current active version
  const activeVersion = useMemo(() => {
    return client ? getActiveClientVersion(client) : null;
  }, [client]);

  // UI state: mode is 'VIEW' | 'EDIT' | 'ADD'
  const [mode, setMode] = useState('VIEW');
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [detailedVersion, setDetailedVersion] = useState(null);

  // Form tab for EDIT / ADD mode: 'company_terms' | 'addresses' | 'contacts'
  const [activeFormTab, setActiveFormTab] = useState('company_terms');
  // View tab for VIEW mode: 'all' | 'company_terms' | 'addresses' | 'contacts'
  const [activeViewTab, setActiveViewTab] = useState('all');

  // TanStack table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Form State for EDIT or ADD
  const [formData, setFormData] = useState({
    effectiveDate: '',
    companyName: '',
    billingName: '',
    billingNameSameAsClientName: false,
    contactTypeId: 'Customer',
    email: '',
    gstNo: '',
    isActive: true,
    paymentTerms: [],
    deliveryTerms: '',
    comments: '',
    addresses: [],
    contacts: [],
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [sameAsCompany, setSameAsCompany] = useState(false);

  // Default selection on mount: select active version or first version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      const initialVer = activeVersion || versions[0];
      const rawId = initialVer?.clientDetailId ?? initialVer?.id;
      const numId = toIntegerVersionId(rawId, null);
      if (numId !== null) {
        setSelectedVersionId(numId);
      }
    }
  }, [versions, activeVersion, selectedVersionId]);

  // Load detailed version data whenever selectedVersionId changes
  useEffect(() => {
    let isMounted = true;
    async function loadVersion() {
      if (!selectedVersionId) return;
      try {
        const fullVer = await fetchVersionDetail(selectedVersionId);
        if (isMounted && fullVer) {
          setDetailedVersion(fullVer);
        }
      } catch (err) {
        console.warn('Could not load version details:', err);
      }
    }

    loadVersion();
    return () => { isMounted = false; };
  }, [selectedVersionId, fetchVersionDetail]);

  // The currently viewed / selected version object
  const selectedVersion = useMemo(() => {
    if (
      detailedVersion &&
      (String(detailedVersion.id) === String(selectedVersionId) ||
        String(detailedVersion.clientDetailId) === String(selectedVersionId))
    ) {
      return detailedVersion;
    }
    if (!selectedVersionId && versions.length > 0) {
      return activeVersion || versions[0];
    }
    return (
      versions.find(
        (v) =>
          String(v.id) === String(selectedVersionId) ||
          String(v.clientDetailId) === String(selectedVersionId)
      ) ||
      activeVersion ||
      versions[0] ||
      null
    );
  }, [detailedVersion, versions, selectedVersionId, activeVersion]);

  // Resolve payment terms for selected version (VIEW mode)
  const selectedPaymentTermsList = useMemo(() => {
    if (!selectedVersion?.paymentTerms) return [];
    const raw = selectedVersion.paymentTerms;
    const items = Array.isArray(raw)
      ? raw
      : typeof raw === 'string' && raw.trim()
        ? raw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const source = (lookups?.paymentTerms && lookups.paymentTerms.length > 0)
      ? lookups.paymentTerms
      : paymentTerms;

    return items.map((val) => {
      const termIdOrCode = typeof val === 'object' && val !== null
        ? (val.paymentTermId ?? val.id ?? val.termCode)
        : val;

      const match = source.find(
        (pt) =>
          pt.id === termIdOrCode ||
          pt.paymentTermId === termIdOrCode ||
          String(pt.id) === String(termIdOrCode) ||
          String(pt.paymentTermId) === String(termIdOrCode) ||
          pt.termCode?.toUpperCase() === String(termIdOrCode).toUpperCase()
      );

      if (typeof val === 'object' && val !== null) {
        return {
          ...val,
          termCode: val.termCode || match?.termCode || String(termIdOrCode),
          termName: val.termName || match?.termName || match?.name || match?.description || '',
          description: val.description || match?.description || '',
        };
      }

      if (match) {
        return {
          ...match,
          termCode: match.termCode || match.code || String(termIdOrCode),
          termName: match.termName || match.name || match.description || String(termIdOrCode),
          description: match.description || '',
        };
      }

      return {
        paymentTermId: val,
        termCode: String(val),
        termName: String(val),
        description: '',
      };
    });
  }, [selectedVersion?.paymentTerms, paymentTerms, lookups?.paymentTerms]);

  // Payment Terms options from Configuration or lookups
  const paymentTermOptions = useMemo(() => {
    const stripHtml = (html) => {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const source = (lookups?.paymentTerms && lookups.paymentTerms.length > 0)
      ? lookups.paymentTerms
      : paymentTerms;

    return (source || [])
      .filter((pt) => pt.isActive !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((pt) => ({
        value: pt.id || pt.paymentTermId || pt.termCode,
        label: pt.termCode || pt.termName,
        chipLabel: pt.termCode || pt.termName,
        subtitle: stripHtml(pt.description || pt.termName || ''),
        termCode: pt.termCode,
        description: pt.description || pt.termName || '',
      }));
  }, [paymentTerms, lookups]);

  // Resolve selected payment terms objects for preview cards in EDIT/ADD form
  const formSelectedPaymentTermsList = useMemo(() => {
    const selected = Array.isArray(formData.paymentTerms)
      ? formData.paymentTerms
      : formData.paymentTerms
        ? [formData.paymentTerms]
        : [];

    const source = (lookups?.paymentTerms && lookups.paymentTerms.length > 0)
      ? lookups.paymentTerms
      : paymentTerms;

    return selected.map((val) => {
      const termIdOrCode = typeof val === 'object' && val !== null ? (val.paymentTermId ?? val.id ?? val.termCode) : val;
      const match = source.find(
        (pt) =>
          pt.id === termIdOrCode ||
          pt.paymentTermId === termIdOrCode ||
          String(pt.id) === String(termIdOrCode) ||
          String(pt.paymentTermId) === String(termIdOrCode) ||
          pt.termCode?.toUpperCase() === String(termIdOrCode).toUpperCase()
      );
      if (match) return match;
      if (typeof val === 'object' && val !== null) return val;
      return {
        paymentTermId: termIdOrCode,
        termCode: String(termIdOrCode),
        termName: String(termIdOrCode),
        description: '',
      };
    });
  }, [formData.paymentTerms, paymentTerms, lookups]);

  const handleRemovePaymentTerm = (termValue) => {
    const current = Array.isArray(formData.paymentTerms) ? formData.paymentTerms : [];
    handleFieldChange(
      'paymentTerms',
      current.filter((t) => {
        const val = typeof t === 'object' && t !== null ? (t.paymentTermId ?? t.id ?? t.termCode) : t;
        return val !== termValue && String(val) !== String(termValue);
      })
    );
  };

  /* ── Mode Transitions ── */
  function handleSelectView(ver) {
    const rawId = ver.clientDetailId ?? ver.id;
    const numId = toIntegerVersionId(rawId, 1);
    if (numId !== selectedVersionId) {
      setSelectedVersionId(numId);
    } else {
      fetchVersionDetail(numId).then((fullVer) => {
        if (fullVer) setDetailedVersion(fullVer);
      });
    }
    setMode('VIEW');
  }

  async function handleStartEdit(ver) {
    if (ver.isEditable === false || ver.versionState === 'History') {
      toast.error('This version is History and read-only. Add a new version instead.');
      return;
    }

    const rawId = ver.clientDetailId ?? ver.id;
    const numId = toIntegerVersionId(rawId, 1);
    setSelectedVersionId(numId);

    // Ensure we have full version detail including addresses and contacts
    let detailSource = ver;
    if (detailedVersion && (detailedVersion.id === numId || detailedVersion.clientDetailId === numId)) {
      detailSource = detailedVersion;
    } else {
      const fetched = await fetchVersionDetail(numId);
      if (fetched) {
        detailSource = fetched;
        setDetailedVersion(fetched);
      }
    }

    const sourceAddresses = Array.isArray(detailSource.addresses) ? detailSource.addresses : (Array.isArray(ver.addresses) ? ver.addresses : []);
    const sourceContacts = Array.isArray(detailSource.contacts) ? detailSource.contacts : (Array.isArray(ver.contacts) ? ver.contacts : []);

    const cName = detailSource.clientName || detailSource.companyName || client?.companyName || '';
    const bName = detailSource.billingName || client?.billingName || '';
    const isSame = Boolean(detailSource.billingNameSameAsClientName || (cName && cName === bName));
    setSameAsCompany(isSame);

    const rawTerms = Array.isArray(detailSource.paymentTerms) ? detailSource.paymentTerms : (Array.isArray(ver.paymentTerms) ? ver.paymentTerms : []);
    const normalizedPaymentTerms = rawTerms.map((pt) =>
      typeof pt === 'object' && pt !== null ? (pt.paymentTermId ?? pt.id ?? pt.termCode) : pt
    );

    setFormData({
      clientDetailId: detailSource.clientDetailId || detailSource.id || numId,
      effectiveDate: detailSource.effectiveDate ? String(detailSource.effectiveDate).slice(0, 10) : '',
      companyName: cName,
      billingName: isSame ? cName : bName,
      billingNameSameAsClientName: isSame,
      contactTypeId: detailSource.contactType || detailSource.contactTypeId || client?.contactTypeId || 'Customer',
      email: detailSource.officialEmail || detailSource.email || client?.email || '',
      gstNo: detailSource.gstNo || client?.gstNo || '',
      isActive: detailSource.isActive !== false,
      paymentTerms: normalizedPaymentTerms,
      deliveryTerms: decodeHtmlString(detailSource.deliveryTerms || client?.deliveryTerms || ''),
      comments: decodeHtmlString(detailSource.internalComments || detailSource.comments || client?.comments || ''),
      addresses: sourceAddresses.map((a) => ({ ...a })),
      contacts: sourceContacts.map((c) => ({ ...c })),
    });
    setMode('EDIT');
    setActiveFormTab('company_terms');
    setFormErrors({});
  }

  function handleStartAdd() {
    const base = detailedVersion || activeVersion || selectedVersion || client || {};
    const today = getTodayIsoDate();

    const sourceAddresses = Array.isArray(base.addresses) ? base.addresses : [];
    const sourceContacts = Array.isArray(base.contacts) ? base.contacts : [];

    const cName = base.clientName || base.companyName || client?.companyName || '';
    const bName = base.billingName || client?.billingName || '';
    const isSame = Boolean(base.billingNameSameAsClientName || (cName && cName === bName));
    setSameAsCompany(isSame);

    const rawTerms = Array.isArray(base.paymentTerms) ? base.paymentTerms : [];
    const normalizedPaymentTerms = rawTerms.map((pt) =>
      typeof pt === 'object' && pt !== null ? (pt.paymentTermId ?? pt.id ?? pt.termCode) : pt
    );

    setFormData({
      effectiveDate: today,
      companyName: cName,
      billingName: isSame ? cName : bName,
      billingNameSameAsClientName: isSame,
      contactTypeId: base.contactType || base.contactTypeId || client?.contactTypeId || 'Customer',
      email: base.officialEmail || base.email || client?.email || '',
      gstNo: base.gstNo || client?.gstNo || '',
      isActive: base.isActive !== false,
      paymentTerms: normalizedPaymentTerms,
      deliveryTerms: decodeHtmlString(base.deliveryTerms || client?.deliveryTerms || ''),
      comments: decodeHtmlString(base.internalComments || base.comments || client?.comments || ''),
      addresses: sourceAddresses.map((a) => ({
        ...a,
        clientAddressId: null,
        id: null,
      })),
      contacts: sourceContacts.map((c) => ({
        ...c,
        clientContactId: null,
        id: null,
      })),
    });

    setMode('ADD');
    setActiveFormTab('company_terms');
    setFormErrors({});
  }

  function handleCancel() {
    setMode('VIEW');
    setFormErrors({});
  }

  const handleCompanyNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => {
      const next = { ...prev, companyName: val };
      if (sameAsCompany) {
        next.billingName = val;
      }
      return next;
    });
    if (formErrors.companyName) {
      setFormErrors((prev) => ({ ...prev, companyName: '' }));
    }
  };

  const handleSameAsCompanyToggle = (e) => {
    const checked = typeof e === 'boolean' ? e : Boolean(e?.target?.checked);
    setSameAsCompany(checked);
    setFormData((prev) => ({
      ...prev,
      billingNameSameAsClientName: checked,
      billingName: checked ? prev.companyName : '',
    }));
  };

  function handleFieldChange(name, value) {
    const rawValue =
      value && typeof value === 'object' && 'target' in value
        ? (value.target?.value !== undefined ? value.target.value : value)
        : value;
    setFormData((prev) => ({ ...prev, [name]: rawValue }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  /* ── Form Validation ── */
  function validateForm() {
    const errors = {};

    if (!formData.effectiveDate?.trim()) {
      errors.effectiveDate = 'Effective date is required.';
    }

    if (!formData.companyName?.trim()) {
      errors.companyName = 'Company name is required.';
    }

    if (formData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    return errors;
  }

  /* ── Form Submit ── */
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.companyName || errors.effectiveDate || errors.email) {
        setActiveFormTab('company_terms');
      }
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    setIsSaving(true);
    try {
      if (mode === 'EDIT') {
        const rawVerId = selectedVersion?.clientDetailId || selectedVersion?.id || selectedVersionId;
        const verId = toIntegerVersionId(rawVerId, 1);
        const updatedVer = await updateClientVersion(verId, formData);
        await refreshClient();

        if (updatedVer) {
          setDetailedVersion(updatedVer);
        }
        const freshVer = await fetchVersionDetail(verId);
        if (freshVer) {
          setDetailedVersion(freshVer);
        }
        setMode('VIEW');
      } else if (mode === 'ADD') {
        const newVer = await addClientVersion(id, formData);
        await refreshClient();
        const newId = newVer?.clientDetailId ? toIntegerVersionId(newVer.clientDetailId, 1) : null;
        if (newId) {
          setSelectedVersionId(newId);
          if (newVer) {
            setDetailedVersion(newVer);
          }
          const freshVer = await fetchVersionDetail(newId);
          if (freshVer) {
            setDetailedVersion(freshVer);
          }
        }
        setMode('VIEW');
      }
    } catch (err) {
      if (err?.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFormErrors(err.fieldErrors);
      }
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Delete Scheduled Revision ── */
  async function handleConfirmDeleteVersion() {
    if (!versionToDelete) return;
    try {
      const rawVerId = versionToDelete.clientDetailId || versionToDelete.id;
      const verId = toIntegerVersionId(rawVerId, 1);
      await deleteClientVersion(verId);
      setVersionToDelete(null);
      setDetailedVersion(null);
      setSelectedVersionId(null);
      await refreshClient();
      setMode('VIEW');
    } catch (err) {
      console.error(err);
    }
  }

  /* ── Delete Entire Client ── */
  async function handleConfirmDeleteClient() {
    try {
      await deleteClient(id);
      setShowDeleteClientModal(false);
      navigate('/clients');
    } catch (err) {
      console.error(err);
    }
  }

  /* ── Client Status (Active / Inactive) with Confirmation Modal ── */
  const [statusConfirmModal, setStatusConfirmModal] = useState({
    isOpen: false,
    nextStatus: null,
  });

  function handleOpenDeactivate() {
    setStatusConfirmModal({ isOpen: true, nextStatus: false });
  }

  function handleOpenActivate() {
    setStatusConfirmModal({ isOpen: true, nextStatus: true });
  }

  async function handleConfirmStatusChange() {
    if (!client) return;
    try {
      setIsSaving(true);
      await toggleClientActive(id, client.isActive);
      await refreshClient();
      if (selectedVersionId) {
        const freshVer = await fetchVersionDetail(selectedVersionId);
        if (freshVer) setDetailedVersion(freshVer);
      }
      setStatusConfirmModal({ isOpen: false, nextStatus: null });
    } catch (err) {
      console.error('Failed to change client status:', err);
    } finally {
      setIsSaving(false);
    }
  }

  /* ── TanStack Table Columns ── */
  const columns = useMemo(
    () => [
      /* 1. EFFECTIVE DATE */
      columnHelper.accessor('effectiveDate', {
        header: 'EFFECTIVE DATE',
        minSize: 180,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          const isCurrent = activeVersion?.id === row.id || row.versionState === 'Current';
          const liveStatus = row.liveStatusInfo || getEffectiveDateStatus(row.effectiveDate);

          return (
            <div className="flex items-center gap-2 flex-wrap py-0.5">
              <span className="font-mono text-xs font-semibold text-heading">
                {formatDateDisplay(row.effectiveDate)}
              </span>
              {isCurrent && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold bg-success/15 text-success border border-success/30 select-none">
                  Current
                </span>
              )}
              {!isCurrent && liveStatus && (
                <Badge variant={liveStatus.badgeVariant} className="text-2xs px-2 py-0.2 select-none">
                  {liveStatus.label}
                </Badge>
              )}
            </div>
          );
        },
      }),

      /* 2. CONTACT TYPE */
      columnHelper.accessor('contactTypeId', {
        header: 'CONTACT TYPE',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const type = info.getValue() || info.row.original.contactType || 'Customer';
          return (
            <Badge variant={getContactTypeBadgeVariant(type)} className="text-2xs px-2 py-0.5">
              {type}
            </Badge>
          );
        },
      }),

      /* 3. PRIMARY CONTACT */
      columnHelper.accessor((row) => row.contacts || row.primaryContactName, {
        id: 'primaryContact',
        header: 'PRIMARY CONTACT',
        minSize: 180,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          const name = row.primaryContactName || (Array.isArray(row.contacts) && row.contacts[0] ? `${row.contacts[0].firstName || ''} ${row.contacts[0].lastName || ''}`.trim() : '');
          const phone = row.primaryContactPhoneNo || (Array.isArray(row.contacts) && row.contacts[0] ? (row.contacts[0].phoneNo || row.contacts[0].mobile1) : '');

          if (!name) return <span className="text-text-muted text-xs">—</span>;
          return (
            <div className="flex flex-col py-0.5 max-w-[220px]">
              <span className="font-medium text-heading text-xs truncate">{name}</span>
              {phone && <span className="font-mono text-2xs text-text-muted truncate">{phone}</span>}
            </div>
          );
        },
      }),

      /* 4. STATUS */
      columnHelper.accessor('isActive', {
        id: 'status',
        header: 'STATUS',
        minSize: 110,
        size: 130,
        cell: (info) => {
          const isActive = info.getValue() !== false;
          return (
            <Badge variant={isActive ? 'active' : 'inactive'} className="text-2xs px-2 py-0.5">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      }),

      /* 5. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 110,
        size: 120,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const isSelected = selectedVersion?.id === row.id || selectedVersion?.clientDetailId === row.clientDetailId;
          const isEditable = row.isEditable !== false && row.versionState !== 'History';

          return (
            <div
              className="flex items-center justify-end gap-1 py-0.5"
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

              {!isReadOnly && isEditable && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStartEdit(row)}
                  title="Edit this version"
                  className={
                    isSelected && mode === 'EDIT'
                      ? 'bg-primary/15 text-primary'
                      : 'text-text-muted hover:text-primary hover:bg-surface'
                  }
                >
                  <IconEdit size={15} />
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [activeVersion, selectedVersion, mode, isReadOnly]
  );

  const table = useReactTable({
    data: versions,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });

  if (isLoadingClient && !client) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Loading client details...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-text-muted">Client record not found</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/clients')}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const clientCode = client.clientCode || (typeof client.clientId === 'number' ? `CLI-${String(client.clientId).padStart(3, '0')}` : client.clientId || id);

  return (
    <div className="space-y-6 pb-16">
      {/* ── 1. PAGE HEADER ── */}
      <PageHeader
        title={client.companyName || client.clientName || 'Client Details'}
        subtitle={`Client Code: ${clientCode} • Master profile with revision lifecycle`}
        icon={<IconClient className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={{
          onClick: () => navigate(backPath),
          label: backLabel,
        }}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Pill Indicator */}
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium select-none',
                client.isActive !== false
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  client.isActive !== false ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {client.isActive !== false ? 'Active' : 'Inactive'}
            </span>

            <Badge variant={getContactTypeBadgeVariant(client.contactTypeId || client.contactType)}>
              {client.contactTypeId || client.contactType || 'Customer'}
            </Badge>

            {/* Linked Inquiries Pill */}
            {client.inquiryCount !== undefined && client.inquiryCount !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <IconInquiry size={13} className="shrink-0" />
                <span>{client.inquiryCount} {client.inquiryCount === 1 ? 'Inquiry' : 'Inquiries'}</span>
              </span>
            )}

            {!isReadOnly && mode === 'VIEW' && selectedVersion && selectedVersion.isEditable !== false && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleStartEdit(selectedVersion)}
                className="text-xs font-semibold shadow-2xs"
              >
                <IconEdit size={13} className="mr-1.5" />
                Edit Revision
              </Button>
            )}

            {!isReadOnly && (
              client.isActive !== false ? (
                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={handleOpenDeactivate}
                  disabled={isSaving}
                  icon={IconClose}
                  className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer text-danger hover:bg-danger/10"
                  title="Mark client inactive"
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleOpenActivate}
                  disabled={isSaving}
                  icon={IconCheck}
                  className="text-xs font-semibold transition-all h-8 px-3.5 shadow-2xs flex items-center gap-1.5 cursor-pointer bg-success hover:bg-success/90 text-white border-transparent"
                  title="Re-activate client"
                >
                  Activate
                </Button>
              )
            )}

            {/* Admin Delete Client Button */}
            {isAdmin && (
              <Button
                type="button"
                variant="danger-soft"
                size="sm"
                onClick={() => setShowDeleteClientModal(true)}
                className="text-xs font-semibold text-danger"
              >
                <IconDelete size={13} className="mr-1.5" />
                Delete Client
              </Button>
            )}
          </div>
        }
      />

      {/* ── 2. EFFECTIVE DATES TIMELINE CARD ── */}
      <CollapsibleCard
        title="Effective Dates"
        subtitle="Timeline of version records for this client. Click a row to view its full snapshot."
        icon={<IconCalendar size={17} />}
        defaultOpen={true}
        className="overflow-hidden shadow-xs border-border"
        actions={
          !isReadOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartAdd}
              className="text-xs shrink-0 w-full sm:w-auto justify-center"
            >
              <IconAdd size={14} className="mr-1.5" />
              Add New Effective Date
            </Button>
          )
        }
      >
        {/* Mobile Card List (< md) */}
        <div className="block md:hidden p-3 space-y-2.5 bg-bg/50 max-h-[260px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          {versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No effective date records found for this client.
            </div>
          ) : (
            versions.map((ver) => {
              const isSelected = selectedVersion?.id === ver.id;
              const isCurrent = activeVersion?.id === ver.id || ver.versionState === 'Current';
              const liveStatus = ver.liveStatusInfo || getEffectiveDateStatus(ver.effectiveDate);

              return (
                <div
                  key={ver.id || ver.clientDetailId}
                  onClick={() => handleSelectView(ver)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                      : 'border-border bg-surface hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-heading">
                          {formatDateDisplay(ver.effectiveDate)}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold bg-success/15 text-success border border-success/30">
                            Current
                          </span>
                        )}
                        {!isCurrent && liveStatus && (
                          <Badge variant={liveStatus.badgeVariant} className="text-2xs px-1.5 py-0.2">
                            {liveStatus.label}
                          </Badge>
                        )}
                        <Badge variant={ver.isActive !== false ? 'active' : 'inactive'} className="text-2xs px-1.5 py-0.2">
                          {ver.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-2xs text-text-muted">
                        {ver.clientName || ver.companyName || '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSelectView(ver)}
                        title="View this version"
                        className={`h-7 w-7 ${
                          isSelected && mode === 'VIEW'
                            ? 'bg-primary/15 text-primary'
                            : 'text-text-muted hover:text-primary hover:bg-surface'
                        }`}
                      >
                        <IconView size={14} />
                      </Button>
                      {!isReadOnly && ver.isEditable !== false && ver.versionState !== 'History' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(ver)}
                          title="Edit this version"
                          className={`h-7 w-7 ${
                            isSelected && mode === 'EDIT'
                              ? 'bg-primary/15 text-primary'
                              : 'text-text-muted hover:text-primary hover:bg-surface'
                          }`}
                        >
                          <IconEdit size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table */}
        <div className="hidden md:block">
          <div className="max-h-[280px] overflow-y-auto overscroll-y-contain border-t border-border/60">
            <TableContainer
              className="border-none rounded-none"
              tableClassName="min-w-full divide-y divide-border text-left text-xs table-auto"
            >
              <thead className="bg-surface/95 sticky top-0 z-10 backdrop-blur-xs shadow-2xs">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="relative group select-none py-2.5 px-3.5"
                    >
                      <div
                        className={`flex items-center gap-1.5 ${header.column.getCanSort() ? 'cursor-pointer' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          header.column.getIsSorted() === 'asc' ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />
                        )}
                      </div>
                    </Th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border bg-bg">
              {table.getRowModel().rows.map((row) => {
                const isSelected = selectedVersion?.id === row.original.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => handleSelectView(row.original)}
                    className={`cursor-pointer transition-colors hover:bg-surface/60 ${
                      isSelected ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td key={cell.id} className="py-2.5 px-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </TableContainer>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── 3. DETAIL / FORM PANEL (CARD 2) ── */}
      <CollapsibleCard
        title={
          mode === 'VIEW' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span>Version: {formatDateDisplay(selectedVersion?.effectiveDate)}</span>
              {selectedVersion?.versionState && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold border ${
                    selectedVersion.versionState === 'Current'
                      ? 'bg-success/15 text-success border-success/30'
                      : selectedVersion.versionState === 'Scheduled'
                        ? 'bg-warning/15 text-warning border-warning/30'
                        : 'bg-surface border-border text-text-muted'
                  }`}
                >
                  {selectedVersion.versionState}
                </span>
              )}
            </div>
          ) : mode === 'EDIT' ? (
            `Editing Revision: ${formatDateDisplay(selectedVersion?.effectiveDate)}`
          ) : (
            'Add New Client Revision'
          )
        }
        subtitle={
          mode === 'VIEW'
            ? 'Complete snapshot of client profile, operational terms, addresses, and contacts.'
            : mode === 'EDIT'
              ? 'Update details for this version. Changes take effect on the specified date.'
              : 'Specify an effective date to schedule upcoming company changes forward.'
        }
        icon={mode === 'VIEW' ? <IconBuilding2 size={17} /> : <IconEdit size={17} />}
        defaultOpen={true}
        className="overflow-hidden shadow-xs border-border"
        actions={
          <div className="flex items-center gap-2">
            {mode === 'VIEW' && selectedVersion?.canDelete && !isReadOnly && (
              <Button
                type="button"
                variant="danger-soft"
                size="sm"
                onClick={() => setVersionToDelete(selectedVersion)}
                className="text-xs text-danger"
              >
                <IconDelete size={13} className="mr-1.5" />
                Delete Revision
              </Button>
            )}
            {mode === 'VIEW' && selectedVersion?.isEditable !== false && !isReadOnly && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleStartEdit(selectedVersion)}
                className="text-xs font-semibold shadow-2xs"
              >
                <IconEdit size={13} className="mr-1.5" />
                Edit This Version
              </Button>
            )}
            {(mode === 'EDIT' || mode === 'ADD') && (
              <CancelButton size="sm" onClick={handleCancel} className="text-xs shadow-2xs" />
            )}
          </div>
        }
      >
        {/* ── MODE 1: VIEW SNAPSHOT ── */}
        {mode === 'VIEW' && selectedVersion && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Section 1: Company Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <IconBuilding2 size={15} className="text-primary" />
                Company Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                <DetailField
                  label="Effective Date"
                  value={formatDateDisplay(selectedVersion.effectiveDate)}
                  mono
                />
                <DetailField
                  label="Company Name"
                  value={selectedVersion.clientName || selectedVersion.companyName}
                />
                <div className="space-y-1">
                  <span className="view-field-label mf-detail-label">Billing Name</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-heading">
                      {selectedVersion.billingName || selectedVersion.clientName || selectedVersion.companyName || '—'}
                    </span>
                    {Boolean(selectedVersion.billingNameSameAsClientName) && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.2 text-2xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        Same as Company
                      </span>
                    )}
                  </div>
                </div>
                <DetailField
                  label="Contact Type"
                  value={selectedVersion.contactType || selectedVersion.contactTypeId || 'Customer'}
                />
                <DetailField
                  label="Official Email"
                  value={selectedVersion.officialEmail || selectedVersion.email}
                  isLink={Boolean(selectedVersion.officialEmail || selectedVersion.email)}
                  href={`mailto:${selectedVersion.officialEmail || selectedVersion.email}`}
                />
                <DetailField
                  label="GST / Tax ID"
                  value={selectedVersion.gstNo}
                  mono
                />
                <div className="space-y-1">
                  <span className="view-field-label mf-detail-label">Record Status</span>
                  <div>
                    <Badge
                      variant={selectedVersion.isActive !== false ? 'active' : 'inactive'}
                      className="text-2xs px-2 py-0.5 font-bold"
                    >
                      {selectedVersion.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="view-field-label mf-detail-label">Revision State</span>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold border ${
                        selectedVersion.versionState === 'Current'
                          ? 'bg-success/15 text-success border-success/30'
                          : selectedVersion.versionState === 'Scheduled'
                            ? 'bg-warning/15 text-warning border-warning/30'
                            : 'bg-surface border-border text-text-muted'
                      }`}
                    >
                      {selectedVersion.versionState || 'Current'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Terms & Notes */}
            <div className="space-y-3 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <IconFileText size={15} className="text-primary" />
                Terms & Operational Notes
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1.5">
                  <span className="view-field-label mf-detail-label">Payment Terms</span>
                  {selectedPaymentTermsList.length === 0 ? (
                    <div className="p-3 rounded-lg bg-surface/50 border border-border/60 text-xs text-text-muted italic">
                      No payment terms recorded for this revision.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPaymentTermsList.map((term, idx) => {
                        const code = term.termCode || term.code || 'TERM';
                        const name = term.termName || term.name || '';
                        return (
                          <div
                            key={term.paymentTermId || term.clientPaymentTermId || term.termCode || idx}
                            className="p-3 rounded-lg bg-surface/50 border border-border/60 space-y-1.5 text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="role" className="font-mono text-2xs px-1.5 py-0.5 font-bold">
                                {code}
                              </Badge>
                              {name && (
                                <span className="font-medium text-heading text-xs">
                                  {name}
                                </span>
                              )}
                            </div>
                            {term.description && term.description !== name && (
                              <FormattedHtmlBlock
                                content={term.description}
                                className="text-2xs text-text-muted mt-0.5"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="view-field-label mf-detail-label">Delivery Terms</span>
                  <div className="p-3 rounded-lg bg-surface/50 border border-border/60 min-h-[50px] text-xs">
                    <FormattedHtmlBlock
                      content={selectedVersion.deliveryTerms}
                      emptyText="No delivery terms specified."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="view-field-label mf-detail-label">Internal Comments & Remarks</span>
                  <div className="p-3 rounded-lg bg-surface/50 border border-border/60 min-h-[50px] text-xs">
                    <FormattedHtmlBlock
                      content={selectedVersion.internalComments || selectedVersion.comments}
                      emptyText="No internal comments recorded."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Addresses Cards */}
            <div className="space-y-3 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <IconLocation size={15} className="text-primary" />
                Client Addresses ({(selectedVersion.addresses || []).length})
              </div>

              {(selectedVersion.addresses || []).length === 0 ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No addresses registered under this effective date revision.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                  {(selectedVersion.addresses || []).map((addr, idx) => (
                    <div
                      key={addr.clientAddressId || idx}
                      className="p-4 rounded-xl border border-border bg-bg space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <Badge variant={getAddressTypeBadgeVariant(addr.addressType)}>
                            {addr.addressType}
                          </Badge>
                          {addr.addressLabel && (
                            <span className="text-xs font-semibold text-heading truncate" title={addr.addressLabel}>
                              {addr.addressLabel}
                            </span>
                          )}
                        </div>
                        <Badge variant={addr.isActive !== false ? 'active' : 'inactive'} className="text-2xs shrink-0">
                          {addr.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-heading font-medium">
                        {addr.address1}
                        {addr.address2 ? `, ${addr.address2}` : ''}
                      </p>
                      <p className="text-2xs text-text-muted">
                        {[addr.city, addr.stateName || addr.stateId, addr.countryName || addr.countryId, addr.zipCode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Contact Persons Cards */}
            <div className="space-y-3 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <IconUsers size={15} className="text-primary" />
                Contact Persons ({(selectedVersion.contacts || []).length})
              </div>

              {(selectedVersion.contacts || []).length === 0 ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No contact persons registered under this effective date revision.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                  {(selectedVersion.contacts || []).map((con, idx) => {
                    const fullName = con.fullName || `${con.firstName || ''} ${con.lastName || ''}`.trim() || '—';
                    const phone = con.phoneNo || con.mobile1;
                    const altPhone = con.alternatePhoneNo || con.mobile2;

                    return (
                      <div
                        key={con.clientContactId || con.clientContactPersonId || idx}
                        className="p-4 rounded-xl border border-border bg-bg space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-heading text-xs truncate">{fullName}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {con.isPrimary && (
                              <span className="rounded-full px-1.5 py-0.5 text-2xs font-bold bg-primary/15 text-primary">
                                Primary
                              </span>
                            )}
                            <Badge variant={con.isActive !== false ? 'active' : 'inactive'} className="text-2xs">
                              {con.isActive !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-2xs text-text space-y-1 pt-1 border-t border-border/60">
                          {phone && (
                            <div className="flex items-center gap-1.5 font-mono">
                              <IconPhone size={11} className="text-text-muted shrink-0" />
                              <a href={`tel:${phone}`} className="text-heading hover:text-primary">
                                {phone}
                              </a>
                            </div>
                          )}
                          {altPhone && (
                            <div className="flex items-center gap-1.5 font-mono">
                              <IconPhone size={11} className="text-text-muted shrink-0" />
                              <a href={`tel:${altPhone}`} className="text-heading hover:text-primary">
                                {altPhone}
                              </a>
                              <span className="text-text-muted text-2xs">(Alt)</span>
                            </div>
                          )}
                          {con.email && (
                            <div className="flex items-center gap-1.5">
                              <IconMail size={11} className="text-text-muted shrink-0" />
                              <a href={`mailto:${con.email}`} className="text-primary hover:underline truncate">
                                {con.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 5: Revision Metadata & Audit */}
            {(selectedVersion.createdOn || selectedVersion.lastUpdatedOn || selectedVersion.lastUpdatedByName) && (
              <div className="pt-4 border-t border-border flex items-center justify-between gap-3 flex-wrap text-2xs text-text-muted">
                <div className="flex items-center gap-3.5 flex-wrap">
                  {selectedVersion.createdOn && (
                    <div className="flex items-center gap-1">
                      <IconCalendar size={12} className="text-text-muted" />
                      <span>Created: {formatDateTime(selectedVersion.createdOn)}</span>
                    </div>
                  )}
                  {selectedVersion.lastUpdatedOn && (
                    <div className="flex items-center gap-1">
                      <IconClock size={12} className="text-text-muted" />
                      <span>
                        Last updated:{' '}
                        {selectedVersion.lastUpdatedByName ? (
                          <strong className="text-heading font-medium">{selectedVersion.lastUpdatedByName}</strong>
                        ) : null}{' '}
                        on {formatDateTime(selectedVersion.lastUpdatedOn)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-2xs font-mono text-text-muted">
                  Revision ID: #{selectedVersion.clientDetailId || selectedVersion.id}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODE 2 & 3: EDIT & ADD FORM ── */}
        {(mode === 'EDIT' || mode === 'ADD') && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            <div className="p-3.5 sm:p-4 rounded-xl bg-surface/60 border border-border shadow-2xs space-y-2">
              <div className="w-full sm:max-w-md">
                <DatePicker
                  id="effectiveDate"
                  label="Effective Date"
                  required
                  name="effectiveDate"
                  value={formData.effectiveDate}
                  onChange={(val) => handleFieldChange('effectiveDate', val)}
                  error={formErrors.effectiveDate}
                  disabled={mode === 'EDIT'}
                  hint={
                    mode === 'EDIT'
                      ? 'Effective date cannot be changed for an existing revision.'
                      : 'The date from which this new client version becomes active (today or later).'
                  }
                />
              </div>
            </div>

            <ScrollableTabs
              variant="underline"
              activeTab={activeFormTab}
              onChange={setActiveFormTab}
              tabs={[
                {
                  id: 'company_terms',
                  label: 'Client Details & Terms',
                  icon: IconBuilding2,
                },
                {
                  id: 'addresses',
                  label: 'Client Addresses',
                  icon: IconLocation,
                  badge: formData.addresses.length,
                },
                {
                  id: 'contacts',
                  label: 'Contact Persons',
                  icon: IconUsers,
                  badge: formData.contacts.length,
                },
              ]}
            />

            {/* Form Tab 1: Company Details & Terms */}
            {activeFormTab === 'company_terms' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    id="companyName"
                    name="companyName"
                    label="Company Name"
                    required
                    value={formData.companyName}
                    onChange={handleCompanyNameChange}
                    error={formErrors.companyName}
                    placeholder="e.g. Acme Industrial Solutions"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="mf-label text-xs">Billing Name</span>
                      <Checkbox
                        id="same-as-company"
                        checked={sameAsCompany}
                        onChange={handleSameAsCompanyToggle}
                        label="Same as company name"
                      />
                    </div>
                    <Input
                      id="billingName"
                      name="billingName"
                      value={formData.billingName}
                      disabled={sameAsCompany}
                      onChange={(e) => handleFieldChange('billingName', e.target.value)}
                      placeholder="e.g. Acme Solutions Pvt Ltd"
                      error={formErrors.billingName}
                    />
                  </div>

                  <SearchableSelect
                    id="contactTypeId"
                    name="contactTypeId"
                    label="Contact Type"
                    required
                    options={contactTypeOptions}
                    value={formData.contactTypeId}
                    onChange={(e) => handleFieldChange('contactTypeId', e.target.value)}
                    placeholder="Select Type..."
                  />

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label="Official Email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    error={formErrors.email}
                    placeholder="e.g. billing@acme.com"
                  />

                  <Input
                    id="gstNo"
                    name="gstNo"
                    label="GST / Tax ID"
                    value={formData.gstNo}
                    onChange={(e) => handleFieldChange('gstNo', e.target.value.toUpperCase())}
                    placeholder="e.g. 24AABCA1234F1Z5"
                  />

                  <div className="flex flex-col justify-between pt-1">
                    <span className="mf-label block mb-2">Account Status</span>
                    <div className="flex items-center gap-3 h-10">
                      <StatusSwitch
                        checked={formData.isActive}
                        onChange={(checked) => handleFieldChange('isActive', checked)}
                      />
                      <span className="text-xs font-medium text-text">
                        {formData.isActive ? 'Active Client' : 'Inactive Client'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <SearchableMultiSelect
                    label="Payment Terms"
                    id="paymentTerms"
                    name="paymentTerms"
                    options={paymentTermOptions}
                    value={Array.isArray(formData.paymentTerms) ? formData.paymentTerms : []}
                    onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                    placeholder="Select payment terms..."
                    searchPlaceholder="Search payment terms..."
                  />

                  {formSelectedPaymentTermsList.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formSelectedPaymentTermsList.map((term, idx) => {
                        const code = term.termCode || term.code || 'TERM';
                        const name = term.termName || term.name || '';
                        return (
                          <div
                            key={term.paymentTermId || term.termCode || idx}
                            className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface/50 text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-heading font-mono">{code}</span>
                              {name && (
                                <span className="text-text-muted text-2xs truncate">
                                  — {name}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentTerm(term.id || term.paymentTermId || term.termCode)}
                              className="text-text-muted hover:text-danger cursor-pointer ml-1 p-0.5"
                              title="Remove term"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <RichTextEditor
                      id="deliveryTerms"
                      name="deliveryTerms"
                      label="Delivery Terms"
                      value={formData.deliveryTerms}
                      onChange={(e) => handleFieldChange('deliveryTerms', e.target ? e.target.value : e)}
                      placeholder="Specify shipping and freight clauses..."
                    />

                    <RichTextEditor
                      id="comments"
                      name="comments"
                      label="Internal Comments"
                      value={formData.comments}
                      onChange={(e) => handleFieldChange('comments', e.target ? e.target.value : e)}
                      placeholder="Add internal notes..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form Tab 2: Addresses */}
            {activeFormTab === 'addresses' && (
              <AddressesEditor
                rows={formData.addresses}
                addresses={formData.addresses}
                onChange={(addrs) => handleFieldChange('addresses', addrs)}
              />
            )}

            {/* Form Tab 3: Contacts */}
            {activeFormTab === 'contacts' && (
              <ContactsEditor
                rows={formData.contacts}
                contacts={formData.contacts}
                onChange={(cons) => handleFieldChange('contacts', cons)}
              />
            )}

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
              <CancelButton
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="text-xs font-medium"
              />
              <SaveButton
                type="submit"
                size="sm"
                loading={isSaving}
                loadingText="Saving..."
                disabled={isSaving}
                className="text-xs font-semibold shadow-2xs"
              >
                {mode === 'EDIT' ? 'Save Changes' : 'Create Revision'}
              </SaveButton>
            </div>
          </form>
        )}
      </CollapsibleCard>

      {/* ── Single Version Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(versionToDelete)}
        onClose={() => setVersionToDelete(null)}
        onConfirm={handleConfirmDeleteVersion}
        title="Delete Scheduled Revision"
        message={
          <span>
            Are you sure you want to delete the scheduled revision effective on{' '}
            <strong>{formatDateDisplay(versionToDelete?.effectiveDate)}</strong>?
            This will permanently remove all associated addresses and contact records for this version.
          </span>
        }
        confirmText="Delete Revision"
        cancelText="Cancel"
        variant="danger"
      />

      {/* ── Delete Client Confirmation Modal ── */}
      <ConfirmModal
        isOpen={showDeleteClientModal}
        onClose={() => setShowDeleteClientModal(false)}
        onConfirm={handleConfirmDeleteClient}
        title="Delete Client"
        message={
          <span>
            Are you sure you want to delete client{' '}
            <strong>&quot;{client.companyName || client.clientName}&quot;</strong>?
            This will permanently delete the client and all its versions. If inquiries reference this client, the server will reject deletion.
          </span>
        }
        confirmText="Delete Client"
        cancelText="Cancel"
        variant="danger"
      />

      {/* ── Status Change (Activate / Deactivate) Confirmation Modal ── */}
      <ConfirmModal
        isOpen={statusConfirmModal.isOpen}
        onClose={() => setStatusConfirmModal({ isOpen: false, nextStatus: null })}
        onConfirm={handleConfirmStatusChange}
        title={statusConfirmModal.nextStatus ? 'Activate Client Account' : 'Deactivate Client Account'}
        message={
          statusConfirmModal.nextStatus ? (
            <span>
              Are you sure you want to mark client{' '}
              <strong>&quot;{client.companyName || client.clientName}&quot;</strong> as{' '}
              <strong className="text-success">Active</strong>? This will re-enable inquiries and order processing.
            </span>
          ) : (
            <span>
              Are you sure you want to mark client{' '}
              <strong>&quot;{client.companyName || client.clientName}&quot;</strong> as{' '}
              <strong className="text-danger">Inactive</strong>? This will block inquiry creation and transactions for this client.
            </span>
          )
        }
        confirmText={statusConfirmModal.nextStatus ? 'Confirm Activation' : 'Confirm Deactivation'}
        cancelText="Cancel"
        variant={statusConfirmModal.nextStatus ? 'primary' : 'danger'}
        loading={isSaving}
      />
    </div>
  );
}
