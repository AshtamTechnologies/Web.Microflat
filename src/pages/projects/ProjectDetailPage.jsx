/**
 * ProjectDetailPage.jsx — Project 360° Detail & Management Console for MicroFlat ERP.
 * Features:
 *   - Full-width layout (w-full)
 *   - Live status workflow progression from nextStatuses
 *   - TanStack DataTable with resizable columns for Phases, Milestones, and Costings
 *   - Full CRUD actions (Edit, Status Change, Delete) across all tabs
 *   - Document management with Upload, Download, and Delete
 * Aligned with Swagger API schemas, ProjectCreation.md, and MicroFlat ERP Design System.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  DetailField,
  ConfirmModal,
  Modal,
  Input,
  DatePicker,
  SearchableSelect,
  Textarea,
  SaveButton,
  CancelButton,
  DataTable,
  TableActions,
} from '../../components/ui';
import {
  IconProject,
  IconEdit,
  IconAdd,
  IconClock,
  IconView,
  IconDelete,
  IconCheck,
  IconBack,
} from '../../constants/icons';
import {
  Briefcase,
  Wrench,
  Layers,
  Calendar,
  IndianRupee,
  FileText,
  Upload,
  Download,
  ExternalLink,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Trash2,
  Check,
  Clock,
} from 'lucide-react';
import { projectService } from '../../services';
import { listCurrencies } from '../../services/currencies/currencyService';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

const phaseColumnHelper = createColumnHelper();
const milestoneColumnHelper = createColumnHelper();
const costingColumnHelper = createColumnHelper();

const CURRENCY_SYMBOL_MAP = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
};

function getCurrencySymbol(c, currencies = []) {
  if (c?.currencySymbol && String(c.currencySymbol).trim()) return c.currencySymbol;
  if (c?.currencyId) {
    const found = currencies.find((cur) => String(cur.id) === String(c.currencyId));
    if (found?.currencySymbol || found?.symbol) return found.currencySymbol || found.symbol;
  }
  const code = (c?.currencyCode || '').toUpperCase();
  return CURRENCY_SYMBOL_MAP[code] || c?.currencyCode || '₹';
}

const PHASE_STATUS_OPTIONS = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const MILESTONE_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Completed', label: 'Completed' },
];

const COST_TYPE_OPTIONS = [
  { value: 'Estimated', label: 'Estimated' },
  { value: 'Actual', label: 'Actual' },
];

const DEFAULT_COST_CATEGORIES = ['Material', 'Labour', 'Machine', 'Outsourcing', 'Other'];

function getStatusBadgeVariant(status = '') {
  switch (status?.toLowerCase()) {
    case 'created':
      return 'neutral';
    case 'in progress':
      return 'active';
    case 'on hold':
      return 'warning';
    case 'completed':
      return 'approved';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getPhaseStatusBadgeVariant(status = '') {
  switch (status?.toLowerCase()) {
    case 'not started':
      return 'neutral';
    case 'in progress':
      return 'active';
    case 'on hold':
      return 'warning';
    case 'completed':
      return 'approved';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Project state
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Status transition state
  const [statusToChange, setStatusToChange] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Lookups (for child modals)
  const [lookups, setLookups] = useState({
    documentTypes: [],
    currencies: [],
    costCategories: DEFAULT_COST_CATEGORIES,
  });

  // ── Child Modals State ──

  // 1. Phase Modal
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [viewingPhase, setViewingPhase] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);
  const [phaseForm, setPhaseForm] = useState({
    phaseName: '',
    sequenceNo: '',
    plannedStartDate: '',
    plannedEndDate: '',
    actualEndDate: '',
    status: 'Not Started',
    remarks: '',
  });

  // 2. Milestone Modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [viewingMilestone, setViewingMilestone] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    milestoneName: '',
    projectPhaseId: '',
    dueDate: '',
    status: 'Pending',
    remarks: '',
  });

  // 3. Costing Modal
  const [isCostingModalOpen, setIsCostingModalOpen] = useState(false);
  const [viewingCosting, setViewingCosting] = useState(null);
  const [editingCosting, setEditingCosting] = useState(null);
  const [costingForm, setCostingForm] = useState({
    description: '',
    costType: 'Estimated',
    costCategory: 'Material',
    costDate: new Date().toISOString().slice(0, 10),
    amount: '',
    projectPhaseId: '',
    currencyId: '',
  });

  // 4. Document Upload Modal
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docForm, setDocForm] = useState({
    documentTypeId: '',
    documentName: '',
    documentTitle: '',
    remarks: '',
  });

  // 5. Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'phase'|'milestone'|'costing'|'document', id, name }
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const [isSubmittingChild, setIsSubmittingChild] = useState(false);

  // ── Load Project Data ──
  const loadProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectService.getProjectById(id);
      setProject(data);
    } catch (err) {
      toast.error(err?.message || 'Failed to load project details');
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadProject();
    Promise.allSettled([
      projectService.getLookups(),
      listCurrencies({ isActive: true }),
    ]).then(([lookupsRes, currRes]) => {
      const lk = lookupsRes.status === 'fulfilled' ? lookupsRes.value : {};
      const curr = currRes.status === 'fulfilled' && Array.isArray(currRes.value) && currRes.value.length
        ? currRes.value
        : (lk?.currencies || []);

      setLookups((prev) => ({
        ...prev,
        documentTypes: lk?.documentTypes || prev.documentTypes,
        currencies: curr,
        costCategories: lk?.costCategories || DEFAULT_COST_CATEGORIES,
      }));
    }).catch(() => {});
  }, [loadProject]);

  const isEditable = project?.isEditable ?? true;
  const isCustomerOrder = project?.projectTypeName?.toLowerCase() === 'customer order';

  // ── Status Transition Handler ──
  const handleConfirmStatusChange = async () => {
    if (!statusToChange) return;
    setIsUpdatingStatus(true);
    try {
      await projectService.updateStatus(id, statusToChange);
      toast.success(`Project status updated to "${statusToChange}"`);
      setStatusToChange(null);
      loadProject();
    } catch (err) {
      toast.error(err?.message || 'Failed to update project status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PHASE ACTIONS
  // ─────────────────────────────────────────────────────────────
  const handleOpenAddPhase = () => {
    setEditingPhase(null);
    const nextSeq = (project?.phases?.length || 0) + 1;
    setPhaseForm({
      phaseName: '',
      sequenceNo: String(nextSeq),
      plannedStartDate: '',
      plannedEndDate: '',
      actualEndDate: '',
      status: 'Not Started',
      remarks: '',
    });
    setIsPhaseModalOpen(true);
  };

  const handleOpenEditPhase = (ph) => {
    setEditingPhase(ph);
    setPhaseForm({
      phaseName: ph.phaseName || '',
      sequenceNo: ph.sequenceNo ? String(ph.sequenceNo) : '',
      plannedStartDate: ph.plannedStartDate || '',
      plannedEndDate: ph.plannedEndDate || '',
      actualEndDate: ph.actualEndDate || '',
      status: ph.status || 'Not Started',
      remarks: ph.remarks || '',
    });
    setIsPhaseModalOpen(true);
  };

  const handleSavePhase = async (e) => {
    e.preventDefault();
    if (!phaseForm.phaseName?.trim()) {
      toast.error('Phase name is required');
      return;
    }
    setIsSubmittingChild(true);
    try {
      const payload = {
        phaseName: phaseForm.phaseName.trim(),
        sequenceNo: phaseForm.sequenceNo ? Number(phaseForm.sequenceNo) : 1,
        plannedStartDate: phaseForm.plannedStartDate || null,
        plannedEndDate: phaseForm.plannedEndDate || null,
        actualEndDate: phaseForm.actualEndDate || null,
        status: phaseForm.status || 'Not Started',
        remarks: phaseForm.remarks || null,
      };

      if (editingPhase) {
        await projectService.updatePhase(editingPhase.id, payload);
        toast.success(`Phase "${payload.phaseName}" updated successfully`);
      } else {
        await projectService.addPhase(id, payload);
        toast.success(`Phase "${payload.phaseName}" added successfully`);
      }

      setIsPhaseModalOpen(false);
      setEditingPhase(null);
      loadProject();
    } catch (err) {
      toast.error(err?.message || 'Failed to save phase');
    } finally {
      setIsSubmittingChild(false);
    }
  };

  const handleQuickChangePhaseStatus = async (ph, newStatus) => {
    try {
      const payload = {
        phaseName: ph.phaseName,
        sequenceNo: ph.sequenceNo,
        plannedStartDate: ph.plannedStartDate,
        plannedEndDate: ph.plannedEndDate,
        actualEndDate: newStatus === 'Completed'
          ? (ph.actualEndDate || new Date().toISOString().slice(0, 10))
          : (newStatus === 'Not Started' ? null : ph.actualEndDate),
        status: newStatus,
        remarks: ph.remarks,
      };
      await projectService.updatePhase(ph.id, payload);
      toast.success(`Phase "${ph.phaseName}" status updated to ${newStatus}`);
      loadProject();
    } catch (err) {
      toast.error(err?.message || 'Failed to update phase status');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MILESTONE ACTIONS
  // ─────────────────────────────────────────────────────────────
  const handleOpenAddMilestone = () => {
    setEditingMilestone(null);
    setMilestoneForm({
      milestoneName: '',
      projectPhaseId: '',
      dueDate: '',
      status: 'Pending',
      remarks: '',
    });
    setIsMilestoneModalOpen(true);
  };

  const handleOpenEditMilestone = (ms) => {
    setEditingMilestone(ms);
    setMilestoneForm({
      milestoneName: ms.milestoneName || '',
      projectPhaseId: ms.projectPhaseId ? String(ms.projectPhaseId) : '',
      dueDate: ms.dueDate || '',
      status: ms.status || 'Pending',
      remarks: ms.remarks || '',
    });
    setIsMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.milestoneName?.trim() || !milestoneForm.dueDate) {
      toast.error('Milestone title and due date are required');
      return;
    }
    setIsSubmittingChild(true);
    try {
      const payload = {
        milestoneName: milestoneForm.milestoneName.trim(),
        projectPhaseId: milestoneForm.projectPhaseId ? Number(milestoneForm.projectPhaseId) : null,
        dueDate: milestoneForm.dueDate,
        status: milestoneForm.status || 'Pending',
        remarks: milestoneForm.remarks || null,
      };

      if (editingMilestone) {
        await projectService.updateMilestone(editingMilestone.id, payload);
        toast.success(`Milestone "${payload.milestoneName}" updated`);
      } else {
        await projectService.addMilestone(id, payload);
        toast.success(`Milestone "${payload.milestoneName}" added`);
      }

      setIsMilestoneModalOpen(false);
      setEditingMilestone(null);
      loadProject();
    } catch (err) {
      toast.error(err?.message || 'Failed to save milestone');
    } finally {
      setIsSubmittingChild(false);
    }
  };

  const handleToggleMilestoneStatus = async (ms) => {
    const nextStatus = ms.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const payload = {
        milestoneName: ms.milestoneName,
        projectPhaseId: ms.projectPhaseId,
        dueDate: ms.dueDate,
        status: nextStatus,
        remarks: ms.remarks,
      };
      await projectService.updateMilestone(ms.id, payload);
      toast.success(`Milestone marked as ${nextStatus}`);
      loadProject();
    } catch (err) {
      toast.error(err?.message || 'Failed to update milestone status');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // COSTING ACTIONS
  // ─────────────────────────────────────────────────────────────
  const handleOpenAddCosting = () => {
    setEditingCosting(null);
    const inrCurrency = (lookups.currencies || []).find(
      (c) => (c.currencyCode || c.code)?.toUpperCase() === 'INR'
    );
    const defaultCurrId = inrCurrency
      ? String(inrCurrency.id)
      : (lookups.currencies?.[0]?.id ? String(lookups.currencies[0].id) : '');

    setCostingForm({
      description: '',
      costType: 'Estimated',
      costCategory: 'Material',
      costDate: new Date().toISOString().slice(0, 10),
      amount: '',
      projectPhaseId: '',
      currencyId: defaultCurrId,
    });
    setIsCostingModalOpen(true);
  };

  const handleOpenEditCosting = (c) => {
    setEditingCosting(c);
    setCostingForm({
      description: c.description || '',
      costType: c.costType || 'Estimated',
      costCategory: c.costCategory || 'Material',
      costDate: c.costDate || new Date().toISOString().slice(0, 10),
      amount: c.amount !== undefined ? String(c.amount) : '',
      projectPhaseId: c.projectPhaseId ? String(c.projectPhaseId) : '',
      currencyId: c.currencyId ? String(c.currencyId) : '',
    });
    setIsCostingModalOpen(true);
  };

  const handleSaveCosting = async (e) => {
    e.preventDefault();
    if (!costingForm.description?.trim() || !costingForm.amount) {
      toast.error('Description and amount are required');
      return;
    }
    setIsSubmittingChild(true);
    try {
      const payload = {
        description: costingForm.description.trim(),
        costType: costingForm.costType,
        costCategory: costingForm.costCategory,
        costDate: costingForm.costDate,
        amount: Number(costingForm.amount),
        projectPhaseId: costingForm.projectPhaseId ? Number(costingForm.projectPhaseId) : null,
        currencyId: costingForm.currencyId ? Number(costingForm.currencyId) : null,
      };

      if (editingCosting) {
        await projectService.updateCosting(editingCosting.id, payload);
        toast.success('Cost item updated successfully');
      } else {
        await projectService.addCosting(id, payload);
        toast.success('Cost item recorded successfully');
      }

      setIsCostingModalOpen(false);
      setEditingCosting(null);
      loadProject();
    } catch (err) {
      toast.error(err?.message || 'Failed to save cost item');
    } finally {
      setIsSubmittingChild(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // DOCUMENT ACTIONS
  // ─────────────────────────────────────────────────────────────
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile || !docForm.documentTypeId) {
      toast.error('Please choose a file and select a document type');
      return;
    }
    setIsSubmittingChild(true);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('documentTypeId', docForm.documentTypeId);
      if (docForm.documentName) formData.append('documentName', docForm.documentName);
      if (docForm.documentTitle) formData.append('documentTitle', docForm.documentTitle);
      if (docForm.remarks) formData.append('remarks', docForm.remarks);

      await projectService.uploadDocument(id, formData);
      toast.success('Document uploaded successfully');
      setIsDocModalOpen(false);
      setDocFile(null);
      setDocForm({ documentTypeId: '', documentName: '', documentTitle: '', remarks: '' });
      loadProject();
    } catch (err) {
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setIsSubmittingChild(false);
    }
  };

  const [downloadingDocId, setDownloadingDocId] = useState(null);

  const handleDownloadDocument = async (doc) => {
    setDownloadingDocId(doc.id);
    try {
      await projectService.downloadDocument(doc.id, doc.fileName || doc.documentName || 'document');
      toast.success(`Downloaded ${doc.fileName || doc.documentName || 'document'}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to download document');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // GENERIC DELETE CONFIRMATION HANDLER
  // ─────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      if (itemToDelete.type === 'phase') {
        await projectService.deletePhase(itemToDelete.id);
        toast.success(`Phase "${itemToDelete.name}" deleted`);
      } else if (itemToDelete.type === 'milestone') {
        await projectService.deleteMilestone(itemToDelete.id);
        toast.success(`Milestone "${itemToDelete.name}" deleted`);
      } else if (itemToDelete.type === 'costing') {
        await projectService.deleteCosting(itemToDelete.id);
        toast.success('Cost item deleted');
      } else if (itemToDelete.type === 'document') {
        await projectService.deleteDocument(itemToDelete.id);
        toast.success(`Document "${itemToDelete.name}" deleted`);
      }
      setItemToDelete(null);
      loadProject();
    } catch (err) {
      toast.error(err?.message || `Failed to delete ${itemToDelete.type}`);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Phase options for milestones / costings dropdown
  const phaseSelectOptions = useMemo(() => {
    return [
      { value: '', label: '-- General / Project Level --' },
      ...(project?.phases || []).map((p) => ({
        value: String(p.id),
        label: `${p.sequenceNo ? `#${p.sequenceNo} ` : ''}${p.phaseName}`,
      })),
    ];
  }, [project?.phases]);

  // Dynamic currency options from backend
  const currencyOptions = useMemo(() => {
    return (lookups.currencies || []).map((c) => ({
      value: String(c.id),
      label: `${c.currencyCode || c.code} (${c.currencySymbol || c.symbol || ''}) — ${c.currencyName || c.name || ''}`,
    }));
  }, [lookups.currencies]);

  // ─────────────────────────────────────────────────────────────
  // TANSTACK TABLE COLUMNS: PHASES
  // ─────────────────────────────────────────────────────────────
  const phaseColumns = useMemo(() => {
    return [
      phaseColumnHelper.accessor('sequenceNo', {
        header: '#',
        size: 60,
        minSize: 50,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted">
            {info.getValue() || info.row.index + 1}
          </span>
        ),
      }),
      phaseColumnHelper.accessor('phaseName', {
        header: 'PHASE NAME',
        size: 220,
        minSize: 140,
        cell: (info) => {
          const ph = info.row.original;
          return (
            <div>
              <span className="font-medium text-xs text-heading block">{info.getValue()}</span>
              {ph.remarks && (
                <span className="text-3xs text-text-muted block truncate max-w-[260px]" title={ph.remarks}>
                  {ph.remarks}
                </span>
              )}
            </div>
          );
        },
      }),
      phaseColumnHelper.display({
        id: 'plannedDates',
        header: 'PLANNED DATES',
        size: 210,
        minSize: 160,
        cell: (info) => {
          const ph = info.row.original;
          if (!ph.plannedStartDate && !ph.plannedEndDate) {
            return <span className="text-text-muted text-xs">—</span>;
          }
          return (
            <span className="font-mono text-xs text-text-muted">
              {ph.plannedStartDate ? formatDate(ph.plannedStartDate) : '—'} →{' '}
              {ph.plannedEndDate ? formatDate(ph.plannedEndDate) : '—'}
            </span>
          );
        },
      }),
      phaseColumnHelper.accessor('actualEndDate', {
        header: 'ACTUAL END',
        size: 130,
        minSize: 110,
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="font-mono text-xs text-text-muted">{formatDate(val)}</span>
          ) : (
            <span className="text-text-muted text-xs">—</span>
          );
        },
      }),
      phaseColumnHelper.accessor('status', {
        header: 'STATUS',
        size: 140,
        minSize: 110,
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge variant={getPhaseStatusBadgeVariant(status)} size="sm">
              {status}
            </Badge>
          );
        },
      }),
      phaseColumnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 110,
        minSize: 90,
        cell: (info) => {
          const ph = info.row.original;
          return (
            <TableActions
              onView={() => setViewingPhase(ph)}
              viewTooltip="View Phase Details"
              onEdit={isEditable ? () => handleOpenEditPhase(ph) : undefined}
              editTooltip="Edit Phase"
              onDelete={isEditable ? () => setItemToDelete({ type: 'phase', id: ph.id, name: ph.phaseName }) : undefined}
              deleteTooltip="Delete Phase"
            />
          );
        },
      }),
    ];
  }, [isEditable]);

  const phasesTable = useReactTable({
    data: project?.phases || [],
    columns: phaseColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // ─────────────────────────────────────────────────────────────
  // TANSTACK TABLE COLUMNS: MILESTONES
  // ─────────────────────────────────────────────────────────────
  const milestoneColumns = useMemo(() => {
    return [
      milestoneColumnHelper.accessor('milestoneName', {
        header: 'MILESTONE TITLE',
        size: 240,
        minSize: 150,
        cell: (info) => {
          const ms = info.row.original;
          return (
            <div>
              <span className="font-medium text-xs text-heading block">{info.getValue()}</span>
              {ms.remarks && (
                <span className="text-3xs text-text-muted block truncate max-w-[260px]" title={ms.remarks}>
                  {ms.remarks}
                </span>
              )}
            </div>
          );
        },
      }),
      milestoneColumnHelper.accessor('phaseName', {
        header: 'LINKED PHASE',
        size: 180,
        minSize: 120,
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-xs text-text-muted">
              {val || '— (Project Level)'}
            </span>
          );
        },
      }),
      milestoneColumnHelper.accessor('dueDate', {
        header: 'DUE DATE',
        size: 130,
        minSize: 110,
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="font-mono text-xs font-medium text-heading">
              {val ? formatDate(val) : '—'}
            </span>
          );
        },
      }),
      milestoneColumnHelper.accessor('status', {
        header: 'STATUS',
        size: 130,
        minSize: 100,
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge variant={status === 'Completed' ? 'approved' : 'warning'} size="sm">
              {status}
            </Badge>
          );
        },
      }),
      milestoneColumnHelper.accessor('completedOn', {
        header: 'COMPLETED ON',
        size: 130,
        minSize: 110,
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="font-mono text-xs text-text-muted">{formatDate(val)}</span>
          ) : (
            <span className="text-text-muted text-xs">—</span>
          );
        },
      }),
      milestoneColumnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 110,
        minSize: 90,
        cell: (info) => {
          const ms = info.row.original;
          return (
            <TableActions
              onView={() => setViewingMilestone(ms)}
              viewTooltip="View Milestone Details"
              onEdit={isEditable ? () => handleOpenEditMilestone(ms) : undefined}
              editTooltip="Edit Milestone"
              onDelete={isEditable ? () => setItemToDelete({ type: 'milestone', id: ms.id, name: ms.milestoneName }) : undefined}
              deleteTooltip="Delete Milestone"
            />
          );
        },
      }),
    ];
  }, [isEditable]);

  const milestonesTable = useReactTable({
    data: project?.milestones || [],
    columns: milestoneColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // ─────────────────────────────────────────────────────────────
  // TANSTACK TABLE COLUMNS: COSTINGS
  // ─────────────────────────────────────────────────────────────
  const costingColumns = useMemo(() => {
    return [
      costingColumnHelper.accessor('costDate', {
        header: 'DATE',
        size: 120,
        minSize: 100,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      costingColumnHelper.accessor('costCategory', {
        header: 'CATEGORY',
        size: 130,
        minSize: 100,
        cell: (info) => (
          <span className="font-medium text-xs text-heading">
            {info.getValue()}
          </span>
        ),
      }),
      costingColumnHelper.accessor('description', {
        header: 'DESCRIPTION',
        size: 240,
        minSize: 150,
        cell: (info) => (
          <span className="text-xs text-text truncate block max-w-[260px]" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      costingColumnHelper.accessor('costType', {
        header: 'TYPE',
        size: 110,
        minSize: 90,
        cell: (info) => {
          const val = info.getValue();
          return (
            <Badge variant={val === 'Actual' ? 'active' : 'neutral'} size="sm">
              {val}
            </Badge>
          );
        },
      }),
      costingColumnHelper.accessor('amount', {
        header: 'AMOUNT',
        size: 140,
        minSize: 110,
        cell: (info) => {
          const c = info.row.original;
          const val = Number(info.getValue() || 0);
          const symbol = getCurrencySymbol(c, lookups.currencies);
          return (
            <span className="font-mono text-xs font-bold text-heading">
              {symbol} {val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          );
        },
      }),
      costingColumnHelper.accessor('phaseName', {
        header: 'PHASE',
        size: 160,
        minSize: 120,
        cell: (info) => (
          <span className="text-xs text-text-muted truncate block max-w-[150px]">
            {info.getValue() || '—'}
          </span>
        ),
      }),
      costingColumnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 110,
        minSize: 90,
        cell: (info) => {
          const c = info.row.original;
          return (
            <TableActions
              onView={() => setViewingCosting(c)}
              viewTooltip="View Cost Details"
              onEdit={isEditable ? () => handleOpenEditCosting(c) : undefined}
              editTooltip="Edit Cost Item"
              onDelete={isEditable ? () => setItemToDelete({ type: 'costing', id: c.id, name: c.description }) : undefined}
              deleteTooltip="Delete Cost Item"
            />
          );
        },
      }),
    ];
  }, [isEditable]);

  const costingsTable = useReactTable({
    data: project?.costings || [],
    columns: costingColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  if (isLoading || !project) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="text-xs text-text-muted">Loading project details...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-20 animate-in fade-in duration-150">
      {/* ── Page Header ── */}
      <PageHeader
        title={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-base font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/20">
              {project.projectCode}
            </span>
            <span className="font-bold text-heading text-lg">{project.projectName}</span>
          </div>
        }
        subtitle={
          <div className="flex items-center gap-2 text-xs text-text-muted mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 font-medium text-heading">
              {isCustomerOrder ? <Briefcase size={12} className="text-primary" /> : <Wrench size={12} />}
              <span>{project.projectTypeName}</span>
            </span>
            <span>•</span>
            <span>Billing: <strong className="text-heading font-medium">{project.projectBillingTypeName || '—'}</strong></span>
            <span>•</span>
            <span>Client: <strong className="text-heading font-medium">{project.clientName || '—'}</strong></span>
          </div>
        }
        icon={IconProject}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/projects')}
          >
            Back to Projects
          </Button>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Dynamic Status Workflow Progression Buttons from nextStatuses */}
            {project.nextStatuses?.map((st) => (
              <Button
                key={st}
                type="button"
                variant={st === 'Completed' ? 'primary' : st === 'Cancelled' ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => setStatusToChange(st)}
                className="text-xs font-semibold h-8 px-3"
              >
                {st === 'In Progress' && <Play size={12} className="mr-1" />}
                {st === 'On Hold' && <Pause size={12} className="mr-1" />}
                {st === 'Completed' && <CheckCircle2 size={12} className="mr-1" />}
                {st === 'Cancelled' && <XCircle size={12} className="mr-1" />}
                <span>{st === 'In Progress' ? 'Start Project' : st}</span>
              </Button>
            ))}

            {/* Edit Button (Allowed while project is open) */}
            {isEditable && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/projects/${project.id}/edit`)}
                className="text-xs font-semibold h-8 px-3"
              >
                <IconEdit size={13} className="mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      {/* ── Status Banner ── */}
      <div className="p-3.5 bg-surface border border-border rounded-xl flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <Badge variant={getStatusBadgeVariant(project.status)} size="md">
            {project.status}
          </Badge>
          <span className="text-xs text-text-muted">
            {project.status === 'Completed'
              ? 'This project is completed and locked for modifications.'
              : project.status === 'Cancelled'
              ? 'This project has been cancelled.'
              : 'Active project workspace.'}
          </span>
        </div>

        {project.orderConfirmationNo && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Linked Sales Order:</span>
            <Link
              to={`/sales-orders/${project.orderConfirmationId}`}
              state={{ from: location.pathname }}
              className="font-mono text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>{project.orderConfirmationNo}</span>
              <ExternalLink size={11} />
            </Link>
          </div>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 border-b border-border text-sm overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: FileText },
          { key: 'phases', label: `Phases (${project.phases?.length || 0})`, icon: Layers },
          { key: 'milestones', label: `Milestones (${project.milestones?.length || 0})`, icon: Calendar },
          { key: 'costings', label: `Costings & Summary (${project.costings?.length || 0})`, icon: IndianRupee },
          { key: 'documents', label: `Documents (${project.documents?.length || 0})`, icon: Upload },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap text-xs',
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-text-muted hover:text-heading',
              ].join(' ')}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card padding="md" className="space-y-4">
            <h4 className="text-xs font-bold text-heading uppercase tracking-wider">
              Project Information
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <DetailField label="Project Code" value={project.projectCode} mono />
              <DetailField label="Project Type" value={project.projectTypeName} />
              <DetailField label="Billing Type" value={project.projectBillingTypeName || '—'} />
              <DetailField label="Status" value={<Badge variant={getStatusBadgeVariant(project.status)} size="sm">{project.status}</Badge>} />
              <DetailField label="Client" value={project.clientName || '—'} />
              <DetailField label="Start Date" value={project.startDate ? formatDate(project.startDate) : '—'} />
              <DetailField label="End Date" value={project.endDate ? formatDate(project.endDate) : '—'} />
              <DetailField label="Total Phases" value={project.phases?.length || 0} mono />
            </div>

            {project.remarks && (
              <>
                <div className="border-t border-border/60" />
                <DetailField label="Project Remarks / Scope Notes">
                  <p className="text-xs text-text whitespace-pre-wrap leading-relaxed">
                    {project.remarks}
                  </p>
                </DetailField>
              </>
            )}
          </Card>

          {/* Audit Metadata */}
          <div className="p-3 bg-surface-subtle border border-border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-text-muted">
            <div>
              <span>Created By: </span>
              <strong className="text-heading font-medium">{project.createdByName || `User #${project.createdBy}`}</strong>
              <span> on </span>
              <span className="font-mono">{project.createdOn ? formatDateTime(project.createdOn) : '—'}</span>
            </div>
            {project.lastUpdatedOn && (
              <div className="sm:text-right">
                <span>Last Updated: </span>
                <span className="font-mono">{formatDateTime(project.lastUpdatedOn)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Phases ── */}
      {activeTab === 'phases' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-heading uppercase tracking-wider">
                Project Phases
              </h4>
              <p className="text-2xs text-text-muted mt-0.5">
                Sequential execution stages (drag column edges to resize)
              </p>
            </div>
            {isEditable && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={IconAdd}
                onClick={handleOpenAddPhase}
                className="self-start sm:self-auto"
              >
                Add Phase
              </Button>
            )}
          </div>

          <DataTable
            table={phasesTable}
            columns={phaseColumns}
            showPagination={(project.phases?.length || 0) > 10}
            entityName="phases"
            emptyTitle="No phases defined yet"
            emptyDescription="Click 'Add Phase' to create workflow stages for this project."
            renderMobileCard={(row) => {
              const ph = row.original || row;
              return (
                <div className="p-3.5 bg-surface border border-border rounded-lg space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-3xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          #{ph.sequenceNo || 1}
                        </span>
                        <span className="font-semibold text-xs text-heading break-words">
                          {ph.phaseName}
                        </span>
                      </div>
                      {ph.remarks && (
                        <p className="text-3xs text-text-muted mt-0.5 line-clamp-2">
                          {ph.remarks}
                        </p>
                      )}
                    </div>
                    <Badge variant={getPhaseStatusBadgeVariant(ph.status)} size="sm">
                      {ph.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-2xs">
                    <div>
                      <span className="text-text-muted block text-3xs">Planned Dates:</span>
                      <span className="font-mono text-heading">
                        {ph.plannedStartDate ? formatDate(ph.plannedStartDate) : '—'} →{' '}
                        {ph.plannedEndDate ? formatDate(ph.plannedEndDate) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-3xs">Actual End:</span>
                      <span className="font-mono text-heading">
                        {ph.actualEndDate ? formatDate(ph.actualEndDate) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-border/60">
                    <TableActions
                      onView={() => setViewingPhase(ph)}
                      viewTooltip="View Phase Details"
                      onEdit={isEditable ? () => handleOpenEditPhase(ph) : undefined}
                      editTooltip="Edit Phase"
                      onDelete={isEditable ? () => setItemToDelete({ type: 'phase', id: ph.id, name: ph.phaseName }) : undefined}
                      deleteTooltip="Delete Phase"
                    />
                  </div>
                </div>
              );
            }}
          />
        </Card>
      )}

      {/* ── Tab 3: Milestones ── */}
      {activeTab === 'milestones' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-heading uppercase tracking-wider">
                Milestones & Key Deliverables
              </h4>
              <p className="text-2xs text-text-muted mt-0.5">
                Deliverable dates and client approval gates
              </p>
            </div>
            {isEditable && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={IconAdd}
                onClick={handleOpenAddMilestone}
                className="self-start sm:self-auto"
              >
                Add Milestone
              </Button>
            )}
          </div>

          <DataTable
            table={milestonesTable}
            columns={milestoneColumns}
            showPagination={(project.milestones?.length || 0) > 10}
            entityName="milestones"
            emptyTitle="No milestones recorded yet"
            emptyDescription="Click 'Add Milestone' to track deliverables and completion dates."
            renderMobileCard={(row) => {
              const ms = row.original || row;
              return (
                <div className="p-3.5 bg-surface border border-border rounded-lg space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-xs text-heading break-words block">
                        {ms.milestoneName}
                      </span>
                      <span className="text-3xs text-text-muted block mt-0.5">
                        Phase: {ms.phaseName || '— (Project Level)'}
                      </span>
                      {ms.remarks && (
                        <p className="text-3xs text-text-muted mt-0.5 line-clamp-2">
                          {ms.remarks}
                        </p>
                      )}
                    </div>
                    <Badge variant={ms.status === 'Completed' ? 'approved' : 'warning'} size="sm">
                      {ms.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-2xs">
                    <div>
                      <span className="text-text-muted block text-3xs">Due Date:</span>
                      <span className="font-mono text-heading">
                        {ms.dueDate ? formatDate(ms.dueDate) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-3xs">Completed On:</span>
                      <span className="font-mono text-heading">
                        {ms.completedOn ? formatDate(ms.completedOn) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-border/60">
                    <TableActions
                      onView={() => setViewingMilestone(ms)}
                      viewTooltip="View Milestone Details"
                      onEdit={isEditable ? () => handleOpenEditMilestone(ms) : undefined}
                      editTooltip="Edit Milestone"
                      onDelete={isEditable ? () => setItemToDelete({ type: 'milestone', id: ms.id, name: ms.milestoneName }) : undefined}
                      deleteTooltip="Delete Milestone"
                    />
                  </div>
                </div>
              );
            }}
          />
        </Card>
      )}

      {/* ── Tab 4: Costings & Cost Summary ── */}
      {activeTab === 'costings' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-heading uppercase tracking-wider">
                Cost Entries
              </h4>
              <p className="text-2xs text-text-muted mt-0.5">
                Estimated and actual material, labour, machine, or outsourcing expenditures
              </p>
            </div>
            {isEditable && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={IconAdd}
                onClick={handleOpenAddCosting}
                className="self-start sm:self-auto"
              >
                Add Cost Item
              </Button>
            )}
          </div>

          <DataTable
            table={costingsTable}
            columns={costingColumns}
            showPagination={(project.costings?.length || 0) > 10}
            entityName="cost entries"
            emptyTitle="No cost items recorded yet"
            emptyDescription="Click 'Add Cost Item' to track project expenditures."
            renderMobileCard={(row) => {
              const c = row.original || row;
              const symbol = getCurrencySymbol(c, lookups.currencies);
              const val = Number(c.amount || 0);
              return (
                <div className="p-3.5 bg-surface border border-border rounded-lg space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-heading break-words">
                          {c.costCategory}
                        </span>
                        <Badge variant={c.costType === 'Actual' ? 'active' : 'neutral'} size="sm">
                          {c.costType}
                        </Badge>
                      </div>
                      <p className="text-xs text-text mt-1 break-words">
                        {c.description}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-heading whitespace-nowrap">
                      {symbol} {val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-2xs">
                    <div>
                      <span className="text-text-muted block text-3xs">Cost Date:</span>
                      <span className="font-mono text-heading">
                        {c.costDate ? formatDate(c.costDate) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-3xs">Phase:</span>
                      <span className="text-heading truncate block">
                        {c.phaseName || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-border/60">
                    <TableActions
                      onView={() => setViewingCosting(c)}
                      viewTooltip="View Cost Details"
                      onEdit={isEditable ? () => handleOpenEditCosting(c) : undefined}
                      editTooltip="Edit Cost Item"
                      onDelete={isEditable ? () => setItemToDelete({ type: 'costing', id: c.id, name: c.description }) : undefined}
                      deleteTooltip="Delete Cost Item"
                    />
                  </div>
                </div>
              );
            }}
          />
        </Card>
      )}

      {/* ── Tab 5: Documents ── */}
      {activeTab === 'documents' && (
        <Card padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-heading uppercase tracking-wider">
                Project Documents & Attachments
              </h4>
              <p className="text-2xs text-text-muted mt-0.5">
                Drawings, inspection sheets, customer sign-offs, and work orders
              </p>
            </div>
            {isEditable && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Upload}
                onClick={() => setIsDocModalOpen(true)}
                className="self-start sm:self-auto"
              >
                Upload Document
              </Button>
            )}
          </div>

          {project.documents?.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
              No documents uploaded yet. Click "Upload Document" to attach files.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <span
                      className="font-semibold text-xs text-heading truncate block"
                      title={doc.documentName || doc.fileName}
                    >
                      {doc.documentName || doc.fileName}
                    </span>
                    <div className="flex items-center gap-2 text-3xs text-text-muted mt-0.5">
                      <span className="font-medium text-primary">{doc.documentTypeName || 'Document'}</span>
                      {doc.fileSize > 0 && (
                        <>
                          <span>•</span>
                          <span>{(Number(doc.fileSize) / 1024).toFixed(1)} KB</span>
                        </>
                      )}
                    </div>
                    {doc.uploadedByName && (
                      <span className="text-3xs text-text-muted mt-1 block">
                        Uploaded by {doc.uploadedByName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(doc)}
                      disabled={downloadingDocId === doc.id}
                      className="p-1.5 rounded-lg border border-border hover:bg-surface-subtle text-primary transition-colors cursor-pointer disabled:opacity-50"
                      title="Download document"
                    >
                      {downloadingDocId === doc.id ? (
                        <Loader2 size={14} className="animate-spin text-primary" />
                      ) : (
                        <Download size={14} />
                      )}
                    </button>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() =>
                          setItemToDelete({
                            type: 'document',
                            id: doc.id,
                            name: doc.documentName || doc.fileName,
                          })
                        }
                        className="p-1.5 rounded-lg border border-border hover:bg-danger/10 hover:border-danger/30 text-danger transition-colors cursor-pointer"
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Confirm Status Progression Modal ── */}
      {statusToChange && (
        <ConfirmModal
          isOpen={Boolean(statusToChange)}
          onClose={() => setStatusToChange(null)}
          onConfirm={handleConfirmStatusChange}
          isLoading={isUpdatingStatus}
          title={`Update Status to "${statusToChange}"`}
          confirmText={
            statusToChange === 'Completed'
              ? 'Complete Project'
              : statusToChange === 'Cancelled'
              ? 'Cancel Project'
              : 'Update Status'
          }
          confirmVariant={statusToChange === 'Cancelled' ? 'danger' : 'primary'}
        >
          <div className="space-y-2 text-xs text-text-muted">
            <p>
              Are you sure you want to transition project <strong>{project.projectCode}</strong> to{' '}
              <strong className="text-heading font-bold">{statusToChange}</strong>?
            </p>
            {(statusToChange === 'Completed' || statusToChange === 'Cancelled') && (
              <p className="p-2.5 rounded bg-warning/10 text-warning-heading border border-warning/20">
                ⚠️ Warning: Once marked as <strong>{statusToChange}</strong>, this project becomes final and cannot be edited.
              </p>
            )}
          </div>
        </ConfirmModal>
      )}

      {/* ── Modal: Add / Edit Phase ── */}
      {isPhaseModalOpen && (
        <Modal
          isOpen={isPhaseModalOpen}
          onClose={() => {
            setIsPhaseModalOpen(false);
            setEditingPhase(null);
          }}
          title={editingPhase ? 'Edit Project Phase' : 'Add Project Phase'}
          subtitle={`Phase details for ${project.projectCode}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <CancelButton
                onClick={() => {
                  setIsPhaseModalOpen(false);
                  setEditingPhase(null);
                }}
              />
              <SaveButton onClick={handleSavePhase} loading={isSubmittingChild}>
                {editingPhase ? 'Update Phase' : 'Save Phase'}
              </SaveButton>
            </div>
          }
        >
          <form onSubmit={handleSavePhase} className="space-y-3.5 text-xs">
            <Input
              label="Phase Name"
              required
              value={phaseForm.phaseName}
              onChange={(e) => setPhaseForm((p) => ({ ...p, phaseName: e.target.value }))}
              placeholder="e.g. Design, Machining, Inspection"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Sequence #"
                type="number"
                min="1"
                value={phaseForm.sequenceNo}
                onChange={(e) => setPhaseForm((p) => ({ ...p, sequenceNo: e.target.value }))}
                placeholder="1, 2, 3..."
              />
              <SearchableSelect
                label="Status"
                options={PHASE_STATUS_OPTIONS}
                value={phaseForm.status}
                onChange={(e) => setPhaseForm((p) => ({ ...p, status: e?.target?.value ?? e }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Planned Start"
                value={phaseForm.plannedStartDate}
                onChange={(e) => setPhaseForm((p) => ({ ...p, plannedStartDate: e?.target?.value ?? e }))}
              />
              <DatePicker
                label="Planned End"
                value={phaseForm.plannedEndDate}
                onChange={(e) => setPhaseForm((p) => ({ ...p, plannedEndDate: e?.target?.value ?? e }))}
              />
            </div>
            {editingPhase && (
              <DatePicker
                label="Actual End Date"
                value={phaseForm.actualEndDate}
                onChange={(e) => setPhaseForm((p) => ({ ...p, actualEndDate: e?.target?.value ?? e }))}
                hint="Setting status to Completed defaults this to today."
              />
            )}
            <Textarea
              label="Remarks"
              rows={2}
              value={phaseForm.remarks}
              onChange={(e) => setPhaseForm((p) => ({ ...p, remarks: e.target.value }))}
              placeholder="Optional notes..."
            />
          </form>
        </Modal>
      )}

      {/* ── Modal: Add / Edit Milestone ── */}
      {isMilestoneModalOpen && (
        <Modal
          isOpen={isMilestoneModalOpen}
          onClose={() => {
            setIsMilestoneModalOpen(false);
            setEditingMilestone(null);
          }}
          title={editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
          subtitle={`Deliverable gate for ${project.projectCode}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <CancelButton
                onClick={() => {
                  setIsMilestoneModalOpen(false);
                  setEditingMilestone(null);
                }}
              />
              <SaveButton onClick={handleSaveMilestone} loading={isSubmittingChild}>
                {editingMilestone ? 'Update Milestone' : 'Save Milestone'}
              </SaveButton>
            </div>
          }
        >
          <form onSubmit={handleSaveMilestone} className="space-y-3.5 text-xs">
            <Input
              label="Milestone Title"
              required
              value={milestoneForm.milestoneName}
              onChange={(e) => setMilestoneForm((m) => ({ ...m, milestoneName: e.target.value }))}
              placeholder="e.g. Raw Material Inspection Passed"
            />
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Due Date"
                required
                value={milestoneForm.dueDate}
                onChange={(e) => setMilestoneForm((m) => ({ ...m, dueDate: e?.target?.value ?? e }))}
              />
              <SearchableSelect
                label="Status"
                options={MILESTONE_STATUS_OPTIONS}
                value={milestoneForm.status}
                onChange={(e) => setMilestoneForm((m) => ({ ...m, status: e?.target?.value ?? e }))}
              />
            </div>
            <SearchableSelect
              label="Linked Phase"
              options={phaseSelectOptions}
              value={milestoneForm.projectPhaseId}
              onChange={(e) => setMilestoneForm((m) => ({ ...m, projectPhaseId: e?.target?.value ?? e }))}
            />
            <Textarea
              label="Remarks"
              rows={2}
              value={milestoneForm.remarks}
              onChange={(e) => setMilestoneForm((m) => ({ ...m, remarks: e.target.value }))}
              placeholder="Optional deliverable notes..."
            />
          </form>
        </Modal>
      )}

      {/* ── Modal: Add / Edit Costing ── */}
      {isCostingModalOpen && (
        <Modal
          isOpen={isCostingModalOpen}
          onClose={() => {
            setIsCostingModalOpen(false);
            setEditingCosting(null);
          }}
          title={editingCosting ? 'Edit Cost Item' : 'Add Cost Item'}
          subtitle={`Record expenditure for ${project.projectCode}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <CancelButton
                onClick={() => {
                  setIsCostingModalOpen(false);
                  setEditingCosting(null);
                }}
              />
              <SaveButton onClick={handleSaveCosting} loading={isSubmittingChild}>
                {editingCosting ? 'Update Cost' : 'Save Cost'}
              </SaveButton>
            </div>
          }
        >
          <form onSubmit={handleSaveCosting} className="space-y-3.5 text-xs">
            <Input
              label="Description"
              required
              value={costingForm.description}
              onChange={(e) => setCostingForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="e.g. Precision granite blank block"
            />
            <div className="grid grid-cols-2 gap-3">
              <SearchableSelect
                label="Cost Type"
                required
                options={COST_TYPE_OPTIONS}
                value={costingForm.costType}
                onChange={(e) => setCostingForm((c) => ({ ...c, costType: e?.target?.value ?? e }))}
              />
              <SearchableSelect
                label="Category"
                required
                options={(lookups.costCategories || DEFAULT_COST_CATEGORIES).map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
                value={costingForm.costCategory}
                onChange={(e) => setCostingForm((c) => ({ ...c, costCategory: e?.target?.value ?? e }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SearchableSelect
                label="Currency"
                required
                options={currencyOptions}
                value={costingForm.currencyId}
                onChange={(e) => setCostingForm((c) => ({ ...c, currencyId: e?.target?.value ?? e }))}
                placeholder="Select currency..."
              />
              <Input
                label="Amount"
                required
                type="number"
                step="0.01"
                value={costingForm.amount}
                onChange={(e) => setCostingForm((c) => ({ ...c, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePicker
                label="Cost Date"
                required
                value={costingForm.costDate}
                onChange={(e) => setCostingForm((c) => ({ ...c, costDate: e?.target?.value ?? e }))}
              />
              <SearchableSelect
                label="Linked Phase"
                options={phaseSelectOptions}
                value={costingForm.projectPhaseId}
                onChange={(e) => setCostingForm((c) => ({ ...c, projectPhaseId: e?.target?.value ?? e }))}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Upload Document (Aligned with Swagger Image 8) ── */}
      {isDocModalOpen && (
        <Modal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          title="Upload Project Document"
          subtitle={`Attach files to ${project.projectCode}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <CancelButton onClick={() => setIsDocModalOpen(false)} />
              <SaveButton onClick={handleUploadDocument} loading={isSubmittingChild}>
                Upload
              </SaveButton>
            </div>
          }
        >
          <form onSubmit={handleUploadDocument} className="space-y-3.5 text-xs">
            <SearchableSelect
              label="Document Type"
              required
              options={(lookups.documentTypes || []).map((dt) => ({
                value: String(dt.id),
                label: dt.documentTypeName || dt.typeName || 'Document',
              }))}
              value={docForm.documentTypeId}
              onChange={(e) => setDocForm((d) => ({ ...d, documentTypeId: e?.target?.value ?? e }))}
              placeholder="Select document category..."
            />
            <Input
              label="Document Name (Optional)"
              value={docForm.documentName}
              onChange={(e) => setDocForm((d) => ({ ...d, documentName: e.target.value }))}
              placeholder="Defaults to document type name"
            />
            <Input
              label="Document Title (Optional)"
              value={docForm.documentTitle}
              onChange={(e) => setDocForm((d) => ({ ...d, documentTitle: e.target.value }))}
              placeholder="File title"
            />
            <Textarea
              label="Remarks (Optional)"
              rows={2}
              value={docForm.remarks}
              onChange={(e) => setDocForm((d) => ({ ...d, remarks: e.target.value }))}
              placeholder="Optional notes or scope description..."
            />
            <div>
              <label className="mf-label">
                Select File <span className="mf-required">*</span>
              </label>
              <input
                type="file"
                required
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: View Phase Details ── */}
      {viewingPhase && (
        <Modal
          isOpen={Boolean(viewingPhase)}
          onClose={() => setViewingPhase(null)}
          title="Phase Details"
          subtitle={`Phase #${viewingPhase.sequenceNo || 1} — ${viewingPhase.phaseName}`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <CancelButton label="Close" onClick={() => setViewingPhase(null)} />
              {isEditable && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={IconEdit}
                  onClick={() => {
                    const target = viewingPhase;
                    setViewingPhase(null);
                    handleOpenEditPhase(target);
                  }}
                >
                  Edit Phase
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Phase Name" value={viewingPhase.phaseName} />
              <DetailField label="Sequence No" value={`#${viewingPhase.sequenceNo || 1}`} mono />
              <DetailField
                label="Status"
                value={
                  <Badge variant={getPhaseStatusBadgeVariant(viewingPhase.status)} size="sm">
                    {viewingPhase.status}
                  </Badge>
                }
              />
              <DetailField
                label="Actual End Date"
                value={viewingPhase.actualEndDate ? formatDate(viewingPhase.actualEndDate) : '—'}
                mono
              />
              <DetailField
                label="Planned Start Date"
                value={viewingPhase.plannedStartDate ? formatDate(viewingPhase.plannedStartDate) : '—'}
                mono
              />
              <DetailField
                label="Planned End Date"
                value={viewingPhase.plannedEndDate ? formatDate(viewingPhase.plannedEndDate) : '—'}
                mono
              />
            </div>

            {viewingPhase.remarks && (
              <div className="pt-2 border-t border-border/60">
                <DetailField label="Remarks / Scope Details">
                  <p className="text-xs text-text whitespace-pre-wrap leading-relaxed mt-1 bg-surface-subtle p-3 rounded-lg border border-border">
                    {viewingPhase.remarks}
                  </p>
                </DetailField>
              </div>
            )}

            {(viewingPhase.createdOn || viewingPhase.lastUpdatedOn) && (
              <div className="p-3 bg-surface-subtle border border-border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-text-muted">
                <div>
                  <span>Created: </span>
                  <span className="font-mono">{viewingPhase.createdOn ? formatDateTime(viewingPhase.createdOn) : '—'}</span>
                </div>
                {viewingPhase.lastUpdatedOn && (
                  <div className="sm:text-right">
                    <span>Last Updated: </span>
                    <span className="font-mono">{formatDateTime(viewingPhase.lastUpdatedOn)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: View Milestone Details ── */}
      {viewingMilestone && (
        <Modal
          isOpen={Boolean(viewingMilestone)}
          onClose={() => setViewingMilestone(null)}
          title="Milestone Details"
          subtitle={viewingMilestone.milestoneName}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <CancelButton label="Close" onClick={() => setViewingMilestone(null)} />
              {isEditable && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={IconEdit}
                  onClick={() => {
                    const target = viewingMilestone;
                    setViewingMilestone(null);
                    handleOpenEditMilestone(target);
                  }}
                >
                  Edit Milestone
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Milestone Title" value={viewingMilestone.milestoneName} />
              <DetailField label="Linked Phase" value={viewingMilestone.phaseName || '— (Project Level)'} />
              <DetailField
                label="Status"
                value={
                  <Badge variant={viewingMilestone.status === 'Completed' ? 'approved' : 'warning'} size="sm">
                    {viewingMilestone.status}
                  </Badge>
                }
              />
              <DetailField
                label="Due Date"
                value={viewingMilestone.dueDate ? formatDate(viewingMilestone.dueDate) : '—'}
                mono
              />
              <DetailField
                label="Completed On"
                value={viewingMilestone.completedOn ? formatDate(viewingMilestone.completedOn) : '—'}
                mono
              />
            </div>

            {viewingMilestone.remarks && (
              <div className="pt-2 border-t border-border/60">
                <DetailField label="Remarks / Deliverable Notes">
                  <p className="text-xs text-text whitespace-pre-wrap leading-relaxed mt-1 bg-surface-subtle p-3 rounded-lg border border-border">
                    {viewingMilestone.remarks}
                  </p>
                </DetailField>
              </div>
            )}

            {(viewingMilestone.createdOn || viewingMilestone.lastUpdatedOn) && (
              <div className="p-3 bg-surface-subtle border border-border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-text-muted">
                <div>
                  <span>Created: </span>
                  <span className="font-mono">{viewingMilestone.createdOn ? formatDateTime(viewingMilestone.createdOn) : '—'}</span>
                </div>
                {viewingMilestone.lastUpdatedOn && (
                  <div className="sm:text-right">
                    <span>Last Updated: </span>
                    <span className="font-mono">{formatDateTime(viewingMilestone.lastUpdatedOn)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: View Cost Entry Details ── */}
      {viewingCosting && (
        <Modal
          isOpen={Boolean(viewingCosting)}
          onClose={() => setViewingCosting(null)}
          title="Cost Entry Details"
          subtitle={viewingCosting.description}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <CancelButton label="Close" onClick={() => setViewingCosting(null)} />
              {isEditable && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={IconEdit}
                  onClick={() => {
                    const target = viewingCosting;
                    setViewingCosting(null);
                    handleOpenEditCosting(target);
                  }}
                >
                  Edit Cost Item
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Cost Category" value={viewingCosting.costCategory} />
              <DetailField
                label="Cost Type"
                value={
                  <Badge variant={viewingCosting.costType === 'Actual' ? 'active' : 'neutral'} size="sm">
                    {viewingCosting.costType}
                  </Badge>
                }
              />
              <DetailField
                label="Amount"
                value={
                  <span className="font-mono font-bold text-sm text-heading">
                    {getCurrencySymbol(viewingCosting, lookups.currencies)}{' '}
                    {Number(viewingCosting.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    {viewingCosting.currencyCode ? ` (${viewingCosting.currencyCode})` : ''}
                  </span>
                }
              />
              <DetailField
                label="Cost Date"
                value={viewingCosting.costDate ? formatDate(viewingCosting.costDate) : '—'}
                mono
              />
              <DetailField label="Linked Phase" value={viewingCosting.phaseName || '—'} />
            </div>

            <div className="pt-2 border-t border-border/60">
              <DetailField label="Description">
                <p className="text-xs text-text whitespace-pre-wrap leading-relaxed mt-1 bg-surface-subtle p-3 rounded-lg border border-border">
                  {viewingCosting.description}
                </p>
              </DetailField>
            </div>

            {(viewingCosting.createdOn || viewingCosting.lastUpdatedOn) && (
              <div className="p-3 bg-surface-subtle border border-border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-text-muted">
                <div>
                  <span>Created: </span>
                  <span className="font-mono">{viewingCosting.createdOn ? formatDateTime(viewingCosting.createdOn) : '—'}</span>
                </div>
                {viewingCosting.lastUpdatedOn && (
                  <div className="sm:text-right">
                    <span>Last Updated: </span>
                    <span className="font-mono">{formatDateTime(viewingCosting.lastUpdatedOn)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal: Confirm Delete Item ── */}
      {itemToDelete && (
        <ConfirmModal
          isOpen={Boolean(itemToDelete)}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeletingItem}
          title={`Delete ${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)}`}
          confirmText="Delete"
          confirmVariant="danger"
        >
          <p className="text-xs text-text-muted">
            Are you sure you want to delete{' '}
            <strong className="text-heading font-semibold">"{itemToDelete.name}"</strong>? This action
            cannot be undone.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
