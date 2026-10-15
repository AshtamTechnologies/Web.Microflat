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
 *            - "Edit this version" button in header
 *       2. EDIT MODE: In-line editable form where:
 *            - Effective Date DatePicker is DISABLED (cannot change date of existing revision)
 *            - Tabbed editor: Company Details & Terms (with RichTextEditor for Delivery Terms & Comments),
 *              AddressesEditor, ContactsEditor
 *            - Save Changes & Cancel buttons
 *       3. ADD MODE: In-line editable form where:
 *            - Effective Date DatePicker is ENABLED for picking a new future/past date
 *            - Clones forward from current active revision
 *            - Save Changes & Cancel buttons
 */

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Eye,
  Pencil,
  Save,
  X,
  Building2,
  FileText,
  MapPin,
  Users,
  Clock,
  ChevronUp,
  ChevronDown,
  Mail,
  Phone,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { IconClient } from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  Checkbox,
  DatePicker,
  Badge,
  Card,
  DetailField,
  TableContainer,
  Th,
  Td,
  PageHeader,
  SearchableSelect,
  SearchableMultiSelect,
  ScrollableTabs,
} from '../../components/ui';
import StatusSwitch from '../../components/ui/StatusSwitch';
import RichTextEditor from '../../components/ui/RichTextEditor';
import AddressesEditor from './components/AddressesEditor';
import ContactsEditor from './components/ContactsEditor';
import { useClientsContext } from '../../context/ClientsContext';
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import {
  CONTACT_TYPE_OPTIONS,
  getContactTypeBadgeVariant,
  getCountryName,
  getStateName,
  getAddressTypeBadgeVariant,
} from '../../mocks/clients';
import { getClientRevisions, getActiveClientVersion } from '../../utils/clientVersions';
import {
  formatDateDisplay,
  getTodayIsoDate,
  getEffectiveDateStatus,
} from '../../utils/effectiveDateUtils';

const columnHelper = createColumnHelper();

export default function ClientEffectiveDatesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { getClientById, updateClientVersions, updateClient } = useClientsContext();
  const { paymentTerms = [] } = usePaymentTermsContext();

  const backPath = location.state?.from || '/clients';
  const backLabel = location.state?.backLabel || 'Clients';

  const isReadOnly = Boolean(location.state?.readOnly);

  const client = getClientById(id);

  // All versions computed with live temporal statuses
  const versions = useMemo(() => {
    return getClientRevisions(client);
  }, [client]);

  // Current active version
  const activeVersion = useMemo(() => {
    return client ? getActiveClientVersion(client) : null;
  }, [client]);

  // UI state: mode is 'VIEW' | 'EDIT' | 'ADD' — defaults to VIEW mode exactly like VendorEffectiveDatesPage
  const [mode, setMode] = useState('VIEW');
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  // Form tab for EDIT / ADD mode: 'company_terms' | 'addresses' | 'contacts'
  const [activeFormTab, setActiveFormTab] = useState('company_terms');

  // TanStack table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Latest previous effective date that new revisions cannot precede (same as VendorEffectiveDatesPage)
  const minAllowedEffectiveDate = useMemo(() => {
    const dates = versions
      .filter((v) => (mode === 'EDIT' ? v.id !== selectedVersionId : true))
      .map((v) => (v.effectiveDate || '').slice(0, 10))
      .filter(Boolean);
    if (dates.length === 0) return null;
    return [...dates].sort().reverse()[0];
  }, [versions, mode, selectedVersionId]);

  // Form State for EDIT or ADD
  const [formData, setFormData] = useState({
    effectiveDate: '',
    companyName: '',
    billingName: '',
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
      const initialVer = activeVersion?.id ? activeVersion : versions[0];
      if (initialVer) {
        setSelectedVersionId(initialVer.id);
      }
    }
  }, [versions, activeVersion, selectedVersionId]);

  // The currently viewed / selected version object
  const selectedVersion = useMemo(() => {
    if (!selectedVersionId && versions.length > 0) {
      return activeVersion || versions[0];
    }
    return versions.find((v) => v.id === selectedVersionId) || activeVersion || versions[0] || null;
  }, [versions, selectedVersionId, activeVersion]);

  // Resolve payment terms for selected version (VIEW mode)
  const selectedPaymentTermsList = useMemo(() => {
    if (!selectedVersion?.paymentTerms) return [];
    const raw = selectedVersion.paymentTerms;
    const items = Array.isArray(raw)
      ? raw
      : typeof raw === 'string' && raw.trim()
      ? raw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    return items.map((val) => {
      const match = paymentTerms.find(
        (pt) =>
          pt.termCode?.toUpperCase() === String(val).toUpperCase() ||
          pt.paymentTermId === val
      );
      if (match) return match;
      return {
        paymentTermId: val,
        termCode: val,
        description: '',
      };
    });
  }, [selectedVersion?.paymentTerms, paymentTerms]);

  // Payment Terms options from Configuration (identical to ClientFormPage)
  const paymentTermOptions = useMemo(() => {
    const stripHtml = (html) => {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    return (paymentTerms || [])
      .filter((pt) => pt.isActive !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((pt) => ({
        value: pt.termCode || pt.paymentTermId,
        label: pt.termCode,
        chipLabel: pt.termCode,
        subtitle: stripHtml(pt.description || ''),
        termCode: pt.termCode,
        description: pt.description || '',
      }));
  }, [paymentTerms]);

  // Resolve selected payment terms objects for preview cards in EDIT/ADD form
  const formSelectedPaymentTermsList = useMemo(() => {
    const selected = Array.isArray(formData.paymentTerms)
      ? formData.paymentTerms
      : formData.paymentTerms
      ? [formData.paymentTerms]
      : [];

    return selected.map((val) => {
      const match = paymentTerms.find(
        (pt) =>
          pt.termCode?.toUpperCase() === String(val).toUpperCase() ||
          pt.paymentTermId === val
      );
      if (match) return match;
      return {
        paymentTermId: val,
        termCode: val,
        description: '',
      };
    });
  }, [formData.paymentTerms, paymentTerms]);

  const handleRemovePaymentTerm = (termValue) => {
    const current = Array.isArray(formData.paymentTerms) ? formData.paymentTerms : [];
    handleFieldChange('paymentTerms', current.filter((t) => t !== termValue));
  };

  /* ── Mode Switching Handlers ── */
  function handleSelectView(ver) {
    setSelectedVersionId(ver.id);
    setMode('VIEW');
    setFormErrors({});
  }

  function handleStartEdit(ver) {
    setSelectedVersionId(ver.id);

    const sourceAddresses = Array.isArray(ver.addresses) && ver.addresses.length > 0
      ? ver.addresses
      : (Array.isArray(client?.addresses) ? client.addresses : []);

    const sourceContacts = Array.isArray(ver.contacts) && ver.contacts.length > 0
      ? ver.contacts
      : (Array.isArray(client?.contacts) ? client.contacts : []);

    const cName = ver.companyName || client?.companyName || '';
    const bName = ver.billingName || client?.billingName || '';
    setSameAsCompany(Boolean(cName && cName === bName));

    setFormData({
      effectiveDate: ver.effectiveDate || '',
      companyName: cName,
      billingName: bName,
      contactTypeId: ver.contactTypeId || client?.contactTypeId || 'Customer',
      email: ver.email || client?.email || '',
      gstNo: ver.gstNo || client?.gstNo || '',
      isActive: ver.isActive !== false,
      paymentTerms: Array.isArray(ver.paymentTerms) ? [...ver.paymentTerms] : (Array.isArray(client?.paymentTerms) ? [...client.paymentTerms] : []),
      deliveryTerms: ver.deliveryTerms || client?.deliveryTerms || '',
      comments: ver.comments || client?.comments || '',
      addresses: sourceAddresses.map((a) => ({ ...a })),
      contacts: sourceContacts.map((c) => ({ ...c })),
    });
    setMode('EDIT');
    setActiveFormTab('company_terms');
    setFormErrors({});
  }

  function handleStartAdd() {
    const base = activeVersion || selectedVersion || client || {};
    const today = getTodayIsoDate();
    const initialDate = minAllowedEffectiveDate && minAllowedEffectiveDate > today
      ? minAllowedEffectiveDate
      : today;

    const sourceAddresses = Array.isArray(base.addresses) && base.addresses.length > 0
      ? base.addresses
      : (Array.isArray(client?.addresses) ? client.addresses : []);

    const sourceContacts = Array.isArray(base.contacts) && base.contacts.length > 0
      ? base.contacts
      : (Array.isArray(client?.contacts) ? client.contacts : []);

    const cName = base.companyName || client?.companyName || '';
    const bName = base.billingName || client?.billingName || '';
    setSameAsCompany(Boolean(cName && cName === bName));

    setFormData({
      effectiveDate: initialDate,
      companyName: cName,
      billingName: bName,
      contactTypeId: base.contactTypeId || client?.contactTypeId || 'Customer',
      email: base.email || client?.email || '',
      gstNo: base.gstNo || client?.gstNo || '',
      isActive: base.isActive !== false,
      paymentTerms: Array.isArray(base.paymentTerms) ? [...base.paymentTerms] : (Array.isArray(client?.paymentTerms) ? [...client.paymentTerms] : []),
      deliveryTerms: base.deliveryTerms || client?.deliveryTerms || '',
      comments: base.comments || client?.comments || '',
      addresses: sourceAddresses.map((a, idx) => ({
        ...a,
        clientAddressId: a.clientAddressId || `addr_${Date.now()}_${idx}`,
      })),
      contacts: sourceContacts.map((c, idx) => ({
        ...c,
        clientContactPersonId: c.clientContactPersonId || `con_${Date.now()}_${idx}`,
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
    if (checked) {
      setFormData((prev) => ({ ...prev, billingName: prev.companyName }));
    }
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
    } else {
      const enteredDate = formData.effectiveDate.trim();
      const collision = versions.find((v) => {
        if (mode === 'EDIT' && v.id === selectedVersionId) return false;
        return (v.effectiveDate || '').slice(0, 10) === enteredDate;
      });
      if (collision) {
        errors.effectiveDate = `A revision with effective date ${formatDateDisplay(enteredDate)} already exists.`;
      } else if (minAllowedEffectiveDate && enteredDate < minAllowedEffectiveDate) {
        errors.effectiveDate = `Effective date cannot be earlier than previous effective date (${formatDateDisplay(minAllowedEffectiveDate)}).`;
      }
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
    const now = new Date().toISOString();

    try {
      const existingVersions = (Array.isArray(client.effectiveVersions) && client.effectiveVersions.length > 0)
        ? client.effectiveVersions
        : versions.map((v) => ({
            id: v.id,
            effectiveDate: v.effectiveDate,
            companyName: v.companyName,
            billingName: v.billingName,
            contactTypeId: v.contactTypeId,
            email: v.email,
            gstNo: v.gstNo,
            isActive: v.isActive,
            paymentTerms: v.paymentTerms,
            deliveryTerms: v.deliveryTerms,
            comments: v.comments,
            addresses: Array.isArray(v.addresses) ? [...v.addresses] : [],
            contacts: Array.isArray(v.contacts) ? [...v.contacts] : [],
            createdOn: v.createdOn || v.createdAt,
            createdBy: v.createdBy || 'System',
          }));

      if (mode === 'EDIT') {
        // Update existing version entry
        const updatedVersions = existingVersions.map((v) => {
          if (v.id !== selectedVersionId) return v;
          return {
            ...v,
            effectiveDate: formData.effectiveDate.trim(),
            companyName: formData.companyName.trim(),
            billingName: formData.billingName?.trim() || '',
            contactTypeId: formData.contactTypeId,
            email: formData.email?.trim() || '',
            gstNo: formData.gstNo?.trim().toUpperCase() || '',
            isActive: formData.isActive,
            paymentTerms: formData.paymentTerms,
            deliveryTerms: formData.deliveryTerms,
            comments: formData.comments,
            addresses: [...formData.addresses],
            contacts: [...formData.contacts],
          };
        });

        await updateClientVersions(client.clientId || id, updatedVersions);

        // If the edited version is the active version, synchronize client master
        if (selectedVersionId === activeVersion?.id) {
          await updateClient(client.clientId || id, {
            companyName: formData.companyName.trim(),
            billingName: formData.billingName?.trim() || '',
            contactTypeId: formData.contactTypeId,
            email: formData.email?.trim() || '',
            gstNo: formData.gstNo?.trim().toUpperCase() || '',
            isActive: formData.isActive,
            paymentTerms: formData.paymentTerms,
            deliveryTerms: formData.deliveryTerms,
            comments: formData.comments,
            addresses: [...formData.addresses],
            contacts: [...formData.contacts],
          });
        }

        toast.success('Effective date revision updated');
        setMode('VIEW');
      } else if (mode === 'ADD') {
        // Create new version entry
        const newVersionId = `ver_${client.clientId || id}_${Date.now()}`;
        const newVersion = {
          id: newVersionId,
          effectiveDate: formData.effectiveDate.trim(),
          companyName: formData.companyName.trim(),
          billingName: formData.billingName?.trim() || '',
          contactTypeId: formData.contactTypeId,
          email: formData.email?.trim() || '',
          gstNo: formData.gstNo?.trim().toUpperCase() || '',
          isActive: formData.isActive,
          paymentTerms: formData.paymentTerms,
          deliveryTerms: formData.deliveryTerms,
          comments: formData.comments,
          addresses: [...formData.addresses],
          contacts: [...formData.contacts],
          createdOn: now,
          createdBy: 'Ian Chesnut',
        };

        const updatedVersions = [newVersion, ...existingVersions];
        await updateClientVersions(client.clientId || id, updatedVersions);

        toast.success('New effective date added');
        setSelectedVersionId(newVersionId);
        setMode('VIEW');
      }
    } catch {
      toast.error('Failed to save client revision.');
    } finally {
      setIsSaving(false);
    }
  }

  /* ── TanStack Table Columns with Resizing and Badges ── */
  const columns = useMemo(
    () => [
      /* 1. EFFECTIVE DATE */
      columnHelper.accessor('effectiveDate', {
        header: 'EFFECTIVE DATE',
        minSize: 180,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          const isCurrent = activeVersion?.id === row.id;
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
          const type = info.getValue() || 'Customer';
          return (
            <Badge variant={getContactTypeBadgeVariant(type)} className="text-2xs px-2 py-0.5">
              {type}
            </Badge>
          );
        },
      }),

      /* 3. PRIMARY CONTACT */
      columnHelper.accessor((row) => row.contacts, {
        id: 'primaryContact',
        header: 'PRIMARY CONTACT',
        minSize: 180,
        size: 240,
        cell: (info) => {
          const contacts = info.getValue() || [];
          const primary = contacts.find((c) => c.isPrimary) || contacts[0];
          if (!primary) return <span className="text-text-muted text-xs">—</span>;
          const name = `${primary.firstName || ''} ${primary.lastName || ''}`.trim();
          return (
            <div className="flex flex-col py-0.5 max-w-[220px]">
              <span className="font-medium text-heading text-xs truncate">{name || '—'}</span>
              <span className="font-mono text-2xs text-text-muted truncate">
                {primary.mobile1 || primary.email || '—'}
              </span>
            </div>
          );
        },
      }),

      /* 4. ADDRESSES */
      columnHelper.accessor((row) => row.addresses, {
        id: 'addressesCount',
        header: 'ADDRESSES',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const addrs = info.getValue() || [];
          return (
            <span className="font-mono text-xs text-text-muted">
              {addrs.length} {addrs.length === 1 ? 'address' : 'addresses'}
            </span>
          );
        },
      }),

      /* 5. CREATED ON */
      columnHelper.accessor('createdOn', {
        header: 'CREATED ON',
        minSize: 150,
        size: 180,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted py-0.5 block">
            {formatDateDisplay(info.getValue())}
          </span>
        ),
      }),

      /* 6. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 110,
        size: 120,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const isSelected = selectedVersion?.id === row.id;

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
                <Eye size={15} />
              </Button>

              {!isReadOnly && (
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
                  <Pencil size={15} />
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

  // Client not found fallback
  if (!client) {
    return (
      <div className="w-full py-12 px-4 sm:px-6">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <AlertCircle size={40} className="text-warning mx-auto" />
          <h2 className="text-xl font-bold text-heading">Client Not Found</h2>
          <p className="text-sm text-text-muted">
            The client record you are trying to view does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/clients')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Clients List
          </Button>
        </div>
      </div>
    );
  }

  const selectedStatus = getEffectiveDateStatus(selectedVersion?.effectiveDate);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── 1. PAGE HEADER (MATCHES VENDOR EFFECTIVE DATES PAGE) ── */}
      <PageHeader
        title={client?.companyName || 'Client Master'}
        subtitle="Effective-dated version history, master details, addresses, and commercial terms"
        icon={<IconClient className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
            {client.clientId || id}
          </span>
        }
        backButton={{
          onClick: () => navigate(backPath),
          label: backLabel,
        }}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium select-none',
                client.isActive
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  client.isActive ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {client.isActive ? 'Active' : 'Inactive'}
            </span>

            <Badge variant={getContactTypeBadgeVariant(client.contactTypeId)}>
              {client.contactTypeId || 'Customer'}
            </Badge>

            {!isReadOnly && mode === 'VIEW' && selectedVersion && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleStartEdit(selectedVersion)}
                className="text-xs font-semibold shadow-2xs"
              >
                <Pencil size={13} className="mr-1.5" />
                Edit Client
              </Button>
            )}
          </div>
        }
      />

      {/* ── 2. EFFECTIVE DATES GRID (TOP CARD WITH RESIZABLE COLUMNS) ── */}
      <Card className="overflow-hidden shadow-xs border-border">
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-heading flex items-center gap-2">
              <Calendar size={17} className="text-primary shrink-0" />
              Effective Dates
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Timeline of version records for this client. Drag column borders to resize columns.
            </p>
          </div>

          {!isReadOnly && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartAdd}
              className="text-xs shrink-0 w-full sm:w-auto justify-center"
            >
              <Plus size={14} className="mr-1.5" />
              Add New Effective Date
            </Button>
          )}
        </div>

        {/* ── Mobile Card List (< md) ── */}
        <div className="block md:hidden p-3 space-y-2.5 bg-bg/50 max-h-[260px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          {versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No effective date records found for this client.
            </div>
          ) : (
            versions.map((ver) => {
              const isCurrent = activeVersion?.id === ver.id;
              const isSelected = selectedVersion?.id === ver.id;
              const contacts = ver.contacts || [];
              const primary = contacts.find((c) => c.isPrimary) || contacts[0];
              const primaryName = primary ? `${primary.firstName || ''} ${primary.lastName || ''}`.trim() : '';

              return (
                <div
                  key={ver.id}
                  onClick={() => handleSelectView(ver)}
                  className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left relative ${
                    isSelected
                      ? 'bg-primary/[0.06] border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'bg-surface border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-heading">
                          {formatDateDisplay(ver.effectiveDate)}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold bg-success/15 text-success border border-success/30">
                            Current
                          </span>
                        )}
                        {isSelected && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-semibold bg-primary/15 text-primary">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0 -mt-1 -mr-1"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                        <Eye size={14} />
                      </Button>

                      {!isReadOnly && (
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
                          <Pencil size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-2xs text-text-muted">
                    <div className="truncate">
                      <span className="font-medium text-heading">{primaryName || 'No contact'}</span>
                      {ver.contactTypeId && ` • ${ver.contactTypeId}`}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 font-mono">
                      <span>{(ver.addresses || []).length} addrs</span>
                      <span>{formatDateDisplay(ver.createdOn)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Desktop TanStack Table Grid (md+) ── */}
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
                        className={`relative py-3.5 px-6 select-none bg-surface ${
                          canSort ? 'cursor-pointer hover:bg-surface/80' : ''
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

                            <span className="shrink-0 ml-1 inline-flex items-center">
                              {sorted === 'asc' ? (
                                <ChevronUp
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : sorted === 'desc' ? (
                                <ChevronDown
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <ChevronUp size={11} strokeWidth={2.5} />
                                  <ChevronDown size={11} strokeWidth={2.5} />
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div
                            className={`select-none ${
                              header.id === 'actions' ? 'text-right w-full pr-1' : ''
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-xs text-text-muted"
                  >
                    No effective date records found for this client.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isSelected = selectedVersion?.id === row.original.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectView(row.original)}
                      className={`cursor-pointer transition-colors duration-120 ${
                        isSelected
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
      </Card>

      {/* ── 3. DETAIL / FORM PANEL (CARD MATCHING VENDOR PAGE) ── */}
      <Card padding="none" className="overflow-hidden shadow-xs border-border">
        {/* Panel Header */}
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-heading break-words flex items-center gap-2 flex-wrap">
              {mode === 'VIEW' && (
                <>
                  Viewing version — Effective{' '}
                  <span className="font-mono text-primary">
                    {formatDateDisplay(selectedVersion?.effectiveDate)}
                  </span>
                  {selectedStatus && (
                    <Badge variant={selectedStatus.badgeVariant} className="text-2xs px-2 py-0.5">
                      {selectedStatus.label}
                    </Badge>
                  )}
                </>
              )}
              {mode === 'EDIT' && (
                <>
                  Editing version — Effective{' '}
                  <span className="font-mono text-primary">
                    {formatDateDisplay(formData.effectiveDate || selectedVersion?.effectiveDate)}
                  </span>
                </>
              )}
              {mode === 'ADD' && 'Add new effective date'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {mode === 'VIEW' &&
                'Read-only view of client profile, commercial terms, addresses, and contacts effective from this date.'}
              {mode === 'EDIT' &&
                'Modify versioned client profile, terms, addresses, and contacts.'}
              {mode === 'ADD' &&
                'Clone-forward from current active version with a new unique effective date.'}
            </p>
          </div>

          {/* Panel Top Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-end">
            {!isReadOnly && mode === 'VIEW' && selectedVersion && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleStartEdit(selectedVersion)}
                className="text-xs w-full sm:w-auto justify-center"
              >
                <Pencil size={13} className="mr-1.5" />
                Edit this version
              </Button>
            )}

            {(mode === 'EDIT' || mode === 'ADD') && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-xs shadow-2xs"
                >
                  <X size={13} className="mr-1.5" />
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="text-xs"
                >
                  <Save size={13} className="mr-1.5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── MODE 1: VIEW MODE (MATCHING VENDOR VIEW PAGE ARCHITECTURE) ── */}
        {mode === 'VIEW' && selectedVersion && (
          <div className="p-4 sm:p-6 space-y-6 divide-y divide-border/60">
            {/* Section 1: Company & Contact Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <Building2 size={15} className="text-primary" />
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
                  value={selectedVersion.companyName}
                />
                <DetailField
                  label="Billing Name"
                  value={selectedVersion.billingName}
                />
                <DetailField
                  label="Contact Type"
                  value={selectedVersion.contactTypeId || 'Customer'}
                />
                <DetailField
                  label="Email Address"
                  value={selectedVersion.email}
                  isLink={Boolean(selectedVersion.email)}
                  href={selectedVersion.email ? `mailto:${selectedVersion.email}` : undefined}
                />
                <DetailField
                  label="GST / Tax ID"
                  value={selectedVersion.gstNo}
                  mono
                />
                <DetailField
                  label="Record Status"
                  value={selectedVersion.isActive !== false ? 'Active' : 'Inactive'}
                />
              </div>
            </div>

            {/* Section 2: Terms & Commercial Notes */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <FileText size={15} className="text-primary" />
                Terms & Operational Notes
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
                {/* Payment Terms */}
                <div className="space-y-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                    Payment Terms
                  </span>
                  {selectedPaymentTermsList.length === 0 ? (
                    <div className="p-3 rounded-lg bg-surface/50 border border-border/60 text-xs text-text-muted italic">
                      No payment terms recorded for this revision.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPaymentTermsList.map((term) => {
                        const desc = term.description || '';
                        const isHtml = /<[a-z][\s\S]*>/i.test(desc);

                        return (
                          <div
                            key={term.paymentTermId || term.termCode}
                            className="p-3 rounded-lg bg-surface/50 border border-border/60 space-y-1 text-xs shadow-2xs"
                          >
                            <Badge variant="role" className="font-mono text-2xs px-1.5 py-0.5">
                              {term.termCode}
                            </Badge>
                            {desc ? (
                              isHtml ? (
                                <div
                                  className="text-2xs text-text leading-relaxed prose prose-xs max-w-none"
                                  dangerouslySetInnerHTML={{ __html: desc }}
                                />
                              ) : (
                                <p className="text-2xs text-text whitespace-pre-line leading-relaxed">{desc}</p>
                              )
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Delivery Terms */}
                <div className="space-y-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                    Delivery Terms
                  </span>
                  {selectedVersion.deliveryTerms ? (
                    /<[a-z][\s\S]*>/i.test(selectedVersion.deliveryTerms) ? (
                      <div
                        className="p-3.5 rounded-lg bg-surface/50 border border-border/60 text-xs text-text leading-relaxed prose prose-xs max-w-none shadow-2xs"
                        dangerouslySetInnerHTML={{ __html: selectedVersion.deliveryTerms }}
                      />
                    ) : (
                      <p className="text-xs text-heading font-medium whitespace-pre-line leading-relaxed p-3.5 rounded-lg bg-surface/50 border border-border/60 shadow-2xs">
                        {selectedVersion.deliveryTerms}
                      </p>
                    )
                  ) : (
                    <div className="p-3.5 rounded-lg bg-surface/50 border border-border/60 text-xs text-text-muted italic">
                      No delivery terms recorded for this revision.
                    </div>
                  )}
                </div>

                {/* Internal Comments */}
                <div className="space-y-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                    Internal Comments
                  </span>
                  {selectedVersion.comments ? (
                    /<[a-z][\s\S]*>/i.test(selectedVersion.comments) ? (
                      <div
                        className="p-3.5 rounded-lg bg-surface/50 border border-border/60 text-xs text-text leading-relaxed prose prose-xs max-w-none shadow-2xs"
                        dangerouslySetInnerHTML={{ __html: selectedVersion.comments }}
                      />
                    ) : (
                      <p className="text-xs text-heading font-medium whitespace-pre-line leading-relaxed p-3.5 rounded-lg bg-surface/50 border border-border/60 shadow-2xs">
                        {selectedVersion.comments}
                      </p>
                    )
                  ) : (
                    <div className="p-3.5 rounded-lg bg-surface/50 border border-border/60 text-xs text-text-muted italic">
                      No internal comments recorded for this revision.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Client Addresses */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                  <MapPin size={15} className="text-primary" />
                  Client Addresses
                  <span className="text-2xs font-normal text-text-muted ml-1">
                    ({(selectedVersion.addresses || []).length})
                  </span>
                </div>
              </div>

              {(selectedVersion.addresses || []).length === 0 ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No address records registered under this effective date revision.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                  {(selectedVersion.addresses || []).map((addr, idx) => {
                    const countryName = getCountryName(addr.countryId);
                    const stateName = getStateName(addr.countryId, addr.stateId);

                    return (
                      <div
                        key={addr.clientAddressId || idx}
                        className="p-4 rounded-xl border border-border bg-bg hover:border-primary/40 hover:shadow-xs transition-all duration-150 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={getAddressTypeBadgeVariant(addr.addressType)} className="text-2xs px-2 py-0.5">
                              {addr.addressType}
                            </Badge>
                            {addr.addressLabel && (
                              <span className="text-xs font-bold text-heading">
                                {addr.addressLabel}
                              </span>
                            )}
                            {addr.isDefaultBilling && (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                Default Bill
                              </span>
                            )}
                            {addr.isDefaultShipping && (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-semibold bg-success/10 text-success border border-success/20">
                                Default Ship
                              </span>
                            )}
                          </div>
                          <Badge variant={addr.isActive !== false ? 'active' : 'inactive'} className="text-2xs px-1.5 py-0.2">
                            {addr.isActive !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div>
                          <p className="font-semibold text-heading text-xs">{addr.address1}</p>
                          {addr.address2 && <p className="text-2xs text-text-muted mt-0.5">{addr.address2}</p>}
                        </div>

                        <div className="text-2xs text-text-muted pt-2 border-t border-border/60 space-y-0.5">
                          <div>
                            <span className="font-medium text-heading">{addr.city}</span>
                            {stateName && <span>, {stateName}</span>}
                            {addr.zipCode && <span className="font-mono ml-1.5">({addr.zipCode})</span>}
                          </div>
                          <div>{countryName}</div>
                          {addr.gstNo && (
                            <div className="font-mono text-2xs pt-0.5 text-heading font-medium">
                              GSTIN: {addr.gstNo}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 4: Contact Persons */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                  <Users size={15} className="text-primary" />
                  Contact Persons
                  <span className="text-2xs font-normal text-text-muted ml-1">
                    ({(selectedVersion.contacts || []).length})
                  </span>
                </div>
              </div>

              {(selectedVersion.contacts || []).length === 0 ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No contact persons registered under this effective date revision.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                  {(selectedVersion.contacts || []).map((con, idx) => {
                    const fullName = `${con.firstName || ''} ${con.lastName || ''}`.trim() || '—';

                    return (
                      <div
                        key={con.clientContactPersonId || idx}
                        className="p-4 rounded-xl border border-border bg-bg hover:border-primary/40 hover:shadow-xs transition-all duration-150 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {con.firstName ? con.firstName[0].toUpperCase() : 'C'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-heading text-xs block truncate">{fullName}</span>
                              {con.designation && (
                                <span className="text-2xs text-text-muted block truncate">{con.designation}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {con.isPrimary && (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-bold bg-primary/15 text-primary">
                                Primary
                              </span>
                            )}
                            <Badge variant={con.isActive !== false ? 'active' : 'inactive'} className="text-2xs px-1.5 py-0.2">
                              {con.isActive !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-2xs text-text space-y-1.5 pt-2 border-t border-border/60">
                          {con.mobile1 && (
                            <div className="flex items-center gap-2">
                              <Phone size={12} className="text-text-muted shrink-0" />
                              <a href={`tel:${con.mobile1}`} className="font-mono text-heading hover:text-primary">
                                {con.mobile1}
                              </a>
                              {con.mobile2 && (
                                <span className="font-mono text-text-muted text-2xs truncate">/ {con.mobile2}</span>
                              )}
                            </div>
                          )}
                          {con.email && (
                            <div className="flex items-center gap-2">
                              <Mail size={12} className="text-text-muted shrink-0" />
                              <a href={`mailto:${con.email}`} className="text-primary truncate hover:underline">
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

            {/* Section 5: Version Audit */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <Clock size={15} className="text-primary" />
                Version Audit & Timeline
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                <DetailField
                  label="Version Created On"
                  value={formatDateDisplay(selectedVersion.createdOn)}
                  mono
                />
                <DetailField
                  label="Version Created By"
                  value={selectedVersion.createdBy || 'Ian Chesnut'}
                />
                <DetailField
                  label="Current ERP Status"
                  value={selectedVersion.id === activeVersion?.id ? 'Active Version' : 'Historical Snapshot'}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── MODE 2 & 3: EDIT & ADD FORM ── */}
        {(mode === 'EDIT' || mode === 'ADD') && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {/* Common Effective Date Field */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-surface/60 border border-border shadow-2xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                <label htmlFor="effectiveDate" className="text-xs font-semibold text-heading flex items-center gap-1.5">
                  <Calendar size={15} className="text-primary shrink-0" />
                  <span>Effective Date</span>
                  <span className="text-danger">*</span>
                </label>
                {mode === 'EDIT' && (
                  <span className="text-2xs text-text-muted font-medium">
                    Effective date cannot be altered for an existing revision.
                  </span>
                )}
              </div>

              <div className="w-full sm:max-w-md">
                <DatePicker
                  id="effectiveDate"
                  name="effectiveDate"
                  min={minAllowedEffectiveDate || undefined}
                  value={formData.effectiveDate}
                  onChange={(e) => handleFieldChange('effectiveDate', e.target ? e.target.value : e)}
                  error={formErrors.effectiveDate}
                  disabled={mode === 'EDIT'}
                  hint={
                    mode === 'EDIT'
                      ? 'Effective date cannot be changed for an existing revision.'
                      : (minAllowedEffectiveDate ? `Must be on or after ${formatDateDisplay(minAllowedEffectiveDate)}` : 'The date from which this new client version becomes active.')
                  }
                  required
                />
              </div>
            </div>

            {/* Sub-Navigation Tabs within Form (Fully touch & mouse scrollable on mobile) */}
            <ScrollableTabs
              variant="underline"
              activeTab={activeFormTab}
              onChange={setActiveFormTab}
              tabs={[
                {
                  id: 'company_terms',
                  label: 'Client Details & Terms',
                  icon: Building2,
                },
                {
                  id: 'addresses',
                  label: 'Client Addresses',
                  icon: MapPin,
                  badge: formData.addresses.length,
                },
                {
                  id: 'contacts',
                  label: 'Contact Persons',
                  icon: Users,
                  badge: formData.contacts.length,
                },
              ]}
            />

            {/* ── Form Tab 1: Client Details & Terms ── */}
            {activeFormTab === 'company_terms' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Company Name */}
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

                  {/* Billing Name with Same as company name toggle */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="billingName" className="text-xs font-semibold text-heading cursor-pointer">
                        Billing Name
                      </label>
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
                      hint="Official registered name for invoices"
                      error={formErrors.billingName}
                    />
                  </div>

                  {/* Contact Type */}
                  <SearchableSelect
                    id="contactTypeId"
                    name="contactTypeId"
                    label="Contact Type"
                    required
                    options={CONTACT_TYPE_OPTIONS}
                    value={formData.contactTypeId}
                    onChange={(e) => handleFieldChange('contactTypeId', e.target.value)}
                    placeholder="Select Type..."
                  />

                  {/* Email */}
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label="Email Address"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    error={formErrors.email}
                    placeholder="e.g. billing@acme.com"
                  />

                  {/* GST No */}
                  <Input
                    id="gstNo"
                    name="gstNo"
                    label="GST / Tax ID"
                    value={formData.gstNo}
                    onChange={(e) => handleFieldChange('gstNo', e.target.value.toUpperCase())}
                    placeholder="e.g. 24AABCA1234F1Z5"
                  />

                  {/* Status Switch */}
                  <div className="flex flex-col justify-between pt-1">
                    <label className="text-xs font-semibold text-heading block mb-2">
                      Account Status
                    </label>
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

                {/* Terms & Notes Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                    <FileText size={15} className="text-primary" />
                    Commercial Terms & Notes
                  </div>

                  {/* Payment Terms Multi-Select Dropdown */}
                  <div className="space-y-2.5">
                    <SearchableMultiSelect
                      label="Payment Terms"
                      id="paymentTerms"
                      name="paymentTerms"
                      options={paymentTermOptions}
                      value={Array.isArray(formData.paymentTerms) ? formData.paymentTerms : formData.paymentTerms ? [formData.paymentTerms] : []}
                      onChange={(e) => handleFieldChange('paymentTerms', e.target.value)}
                      placeholder="Select payment terms..."
                      searchPlaceholder="Search payment terms..."
                      emptyText="No payment terms found in Configuration"
                      hint="Multiple terms can be selected from Configuration"
                    />

                    {/* Selected Terms Cards */}
                    {formSelectedPaymentTermsList.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-2xs font-semibold text-text-muted uppercase tracking-wider">
                          <span>Selected Terms ({formSelectedPaymentTermsList.length})</span>
                          <button
                            type="button"
                            onClick={() => handleFieldChange('paymentTerms', [])}
                            className="text-text-muted hover:text-danger cursor-pointer transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {formSelectedPaymentTermsList.map((term) => {
                            const desc = term.description || '';
                            const isHtml = /<[a-z][\s\S]*>/i.test(desc);

                            return (
                              <div
                                key={term.paymentTermId || term.termCode}
                                className="p-3 rounded-lg bg-surface/70 border border-border space-y-1.5 text-xs group hover:border-primary/30 transition-colors shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <Badge variant="role" className="font-mono text-xs px-2 py-0.5 shrink-0">
                                    {term.termCode}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePaymentTerm(term.termCode || term.paymentTermId)}
                                    className="text-text-muted hover:text-danger p-0.5 rounded cursor-pointer transition-colors shrink-0"
                                    title={`Remove ${term.termCode}`}
                                    aria-label={`Remove ${term.termCode}`}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                {desc ? (
                                  isHtml ? (
                                    <div
                                      className="text-xs text-text leading-relaxed prose prose-xs max-w-none [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5"
                                      dangerouslySetInnerHTML={{ __html: desc }}
                                    />
                                  ) : (
                                    <p className="text-xs text-text whitespace-pre-line leading-relaxed">
                                      {desc}
                                    </p>
                                  )
                                ) : (
                                  <p className="text-2xs text-text-muted italic">No terms description specified</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delivery Terms Rich Text */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-heading block">
                      Delivery Terms
                    </label>
                    <RichTextEditor
                      id="deliveryTerms"
                      name="deliveryTerms"
                      value={formData.deliveryTerms}
                      onChange={(e) => handleFieldChange('deliveryTerms', e.target ? e.target.value : e)}
                      placeholder="Specify logistics, incoterms, freight & delivery conditions..."
                      minHeight="140px"
                    />
                  </div>

                  {/* Internal Comments Rich Text */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-heading block">
                      Internal Comments
                    </label>
                    <RichTextEditor
                      id="comments"
                      name="comments"
                      value={formData.comments}
                      onChange={(e) => handleFieldChange('comments', e.target ? e.target.value : e)}
                      placeholder="Add confidential notes or account background..."
                      minHeight="140px"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Form Tab 2: Addresses ── */}
            {activeFormTab === 'addresses' && (
              <div className="space-y-4">
                <AddressesEditor
                  rows={formData.addresses}
                  addresses={formData.addresses}
                  onChange={(addrs) => handleFieldChange('addresses', addrs)}
                />
              </div>
            )}

            {/* ── Form Tab 3: Contacts ── */}
            {activeFormTab === 'contacts' && (
              <div className="space-y-4">
                <ContactsEditor
                  rows={formData.contacts}
                  contacts={formData.contacts}
                  onChange={(cons) => handleFieldChange('contacts', cons)}
                />
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="text-xs flex-1 sm:flex-none justify-center shadow-2xs font-medium"
              >
                <X size={14} className="mr-1.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSaving}
                className="text-xs flex-1 sm:flex-none justify-center font-semibold shadow-2xs"
              >
                <Save size={14} className="mr-1.5" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
