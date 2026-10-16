/**
 * PurchaseRequisitionApprovalPage — Dedicated review and approval queue for pending purchase requisitions.
 * Route: /approvals/purchase-requisitions
 *
 * Core Behavior:
 *   - Shows ONLY requisitions where status === 'Pending Approval' from live PurchaseRequisitionContext.
 *   - Real-time filtered state: As soon as a requisition is approved or rejected, it immediately
 *     disappears from the queue without manual removal logic or page refresh.
 *   - Labeled ghost action buttons: "Approve" (success) and "Reject" (danger).
 *   - Confirmation dialog on Approve according to system standard.
 *   - Polished Reject modal with quick-reasons and clear validation.
 *   - Row click navigates to /purchase-requisition/:id for full read-only inspection.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAttachment,
  IconBuilding2,
  IconCalendar,
  IconCheck,
  IconClock,
  IconClose,
  IconDownload,
  IconError,
  IconFileSpreadsheet,
  IconFileText,
  IconFlame,
  IconLayers,
  IconPRApproval,
  IconPackage,
  IconSuccess,
  IconUser,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  Modal,
  Badge,
  PageHeader,
  DataTable,
  TableToolbar,
  Textarea,
} from '../../components/ui';
import { usePurchaseRequisitionContext } from '../../context/PurchaseRequisitionContext';
import {
  formatPRDate,
  formatPRDateTime,
  getPRPriorityBadgeVariant,
} from '../../mocks/purchaseRequisitions';
import { formatDateTime } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

export default function PurchaseRequisitionApprovalPage() {
  const navigate = useNavigate();
  const { requisitions, approvePR, rejectPR } = usePurchaseRequisitionContext();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Modal States
  const [prToApprove, setPrToApprove] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const [prToReject, setPrToReject] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const [prToViewAttachments, setPrToViewAttachments] = useState(null);

  /* ── Filter all requisitions for Pending only & Search query ── */
  const pendingPRs = useMemo(() => {
    return requisitions.filter(
      (pr) => (pr.status || '').toLowerCase().includes('pending')
    );
  }, [requisitions]);

  const filteredPendingPRs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pendingPRs.filter((pr) => {
      // Priority filter
      if (priorityFilter !== 'ALL') {
        if ((pr.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) {
          return false;
        }
      }

      // Search text
      if (!q) return true;
      const matchNumber = (pr.prNumber || '').toLowerCase().includes(q);
      const matchRequester = (pr.requestedBy || '').toLowerCase().includes(q);
      const matchDept = (pr.department || '').toLowerCase().includes(q);
      const matchItem = (pr.items || []).some(
        (it) =>
          (it.itemCode || '').toLowerCase().includes(q) ||
          (it.itemName || '').toLowerCase().includes(q)
      );

      return matchNumber || matchRequester || matchDept || matchItem;
    });
  }, [pendingPRs, search, priorityFilter]);

  const totalPendingCount = pendingPRs.length;
  const urgentCount = useMemo(
    () => pendingPRs.filter((pr) => pr.priority === 'Urgent').length,
    [pendingPRs]
  );
  const totalLineItems = useMemo(
    () => pendingPRs.reduce((sum, pr) => sum + (pr.items?.length || 0), 0),
    [pendingPRs]
  );
  const distinctDeptsCount = useMemo(
    () => new Set(pendingPRs.map((pr) => pr.department).filter(Boolean)).size,
    [pendingPRs]
  );

  const hasSearchFilter = Boolean(search.trim() || priorityFilter !== 'ALL');

  /* ── Approve Handler with Confirmation ── */
  function handleOpenApprove(pr) {
    setPrToApprove(pr);
    setApproveRemarks('');
  }

  function handleCloseApprove() {
    if (isSubmittingApprove) return;
    setPrToApprove(null);
    setApproveRemarks('');
  }

  async function handleConfirmApprove() {
    if (!prToApprove) return;

    try {
      setIsSubmittingApprove(true);
      await approvePR(prToApprove.prId || prToApprove.prNumber, {
        approvedBy: 'Ian Chesnut',
        remarks: approveRemarks.trim(),
      });

      toast.success(`Purchase Requisition ${prToApprove.prNumber} approved successfully`);
      setPrToApprove(null);
      setApproveRemarks('');
    } catch {
      toast.error('Failed to approve purchase requisition. Please try again.');
    } finally {
      setIsSubmittingApprove(false);
    }
  }

  /* ── Reject Modal Handlers ── */
  function handleOpenReject(pr) {
    setPrToReject(pr);
    setRejectComments('');
  }

  function handleCloseReject() {
    if (isSubmittingReject) return;
    setPrToReject(null);
    setRejectComments('');
  }

  async function handleConfirmReject(e) {
    if (e) e.preventDefault();
    if (!prToReject || !rejectComments.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }

    try {
      setIsSubmittingReject(true);
      await rejectPR(prToReject.prId || prToReject.prNumber, {
        rejectedBy: 'Ian Chesnut',
        rejectionReason: rejectComments.trim(),
      });

      toast.success(`Purchase Requisition ${prToReject.prNumber} rejected`);
      handleCloseReject();
    } catch {
      toast.error('Failed to reject purchase requisition. Please try again.');
    } finally {
      setIsSubmittingReject(false);
    }
  }

  /* ── Download Attachment Handler ── */
  const handleDownloadAttachment = (file, pr) => {
    if (!file) return;
    try {
      const fileName = file.fileName || file.name || 'requisition-document.pdf';
      const fileUrl = file.url || file.fileUrl;

      if (file.file instanceof File || file.file instanceof Blob) {
        const blobUrl = URL.createObjectURL(file.file);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else if (fileUrl && fileUrl !== '#') {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const fileContent = [
          `================================================================`,
          ` MICROFLAT ERP - PURCHASE REQUISITION ATTACHMENT`,
          `================================================================`,
          `PR Number        : ${pr?.prNumber || 'N/A'}`,
          `File Name        : ${fileName}`,
          `File Size        : ${file.fileSizeKB ? `${file.fileSizeKB} KB` : (file.size || '150 KB')}`,
          `Requested By     : ${pr?.requestedBy || 'N/A'}`,
          `Department       : ${pr?.department || 'N/A'}`,
          `Uploaded By      : ${file.uploadedBy || pr?.requestedBy || 'Ian Chesnut'}`,
          `Uploaded Date    : ${file.uploadedDate ? formatDateTime(file.uploadedDate) : 'N/A'}`,
          `================================================================`,
          `Exported On      : ${formatDateTime(new Date())}`,
          `Status           : Verified Requisition Document`,
          `================================================================\n`,
        ].join('\n');

        const mimeType = fileName.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : fileName.toLowerCase().endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : fileName.toLowerCase().endsWith('.dwg')
          ? 'application/acad'
          : 'text/plain;charset=utf-8';

        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download document attachment.');
    }
  };

  /* ── TanStack Table Columns ── */
  const columns = useMemo(
    () => [
      /* 1. PR NUMBER & PRIORITY */
      columnHelper.accessor('prNumber', {
        header: 'REQUISITION NO.',
        minSize: 150,
        size: 170,
        cell: (info) => {
          const row = info.row.original;
          const isUrgent = row.priority === 'Urgent';
          return (
            <div className="flex items-center gap-2 flex-wrap py-0.5">
              <span className="font-mono text-xs font-bold text-primary">
                {info.getValue() || '—'}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold border ${
                  isUrgent
                    ? 'bg-danger/10 text-danger border-danger/25'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                {isUrgent && <IconFlame size={10} className="" />}
                {row.priority || 'Normal'}
              </span>
            </div>
          );
        },
      }),

      /* 2. REQUESTER & DEPARTMENT */
      columnHelper.accessor('requestedBy', {
        header: 'REQUESTER & DEPT',
        minSize: 200,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col py-0.5">
              <span className="font-semibold text-heading text-xs sm:text-sm leading-snug">
                {row.requestedBy || 'Unknown'}
              </span>
              <span className="text-text-muted text-2xs sm:text-xs leading-normal flex items-center gap-1 mt-0.5">
                <IconBuilding2 size={12} className="text-text-muted/70 shrink-0" />
                {row.department || 'General'}
              </span>
            </div>
          );
        },
      }),

      /* 3. LINE ITEMS COUNT */
      columnHelper.accessor('items', {
        header: 'LINE ITEMS',
        minSize: 110,
        size: 130,
        cell: (info) => {
          const items = info.getValue() || [];
          const itemCount = items.length;

          return (
            <div className="flex items-center py-0.5">
              <span
                className="font-mono text-xs font-semibold px-2.5 py-0.5 bg-surface border border-border text-heading rounded-md shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
                title={items.map((i) => i.itemName || i.itemCode).join(', ')}
              >
                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </span>
            </div>
          );
        },
      }),

      /* 4. ATTACHMENTS */
      columnHelper.accessor('attachments', {
        header: 'ATTACHMENTS',
        minSize: 130,
        size: 140,
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const attachments = row.attachments || [];
          const count = attachments.length;

          if (count === 0) {
            return <span className="text-xs text-text-muted/60">—</span>;
          }

          return (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setPrToViewAttachments(row);
              }}
              className="text-xs font-semibold text-primary hover:text-primary bg-primary/5 hover:bg-primary/10 border border-primary/30 hover:border-primary/50 transition-all h-7 px-2.5 shadow-2xs flex items-center gap-1.5 cursor-pointer rounded-md"
              title={`View ${count} attachment${count > 1 ? 's' : ''} for ${row.prNumber}`}
            >
              <IconAttachment size={12} className="shrink-0" />
              <span>{count} {count === 1 ? 'file' : 'files'}</span>
            </Button>
          );
        },
      }),

      /* 5. SUBMITTED / REQUIRED DATE */
      columnHelper.accessor('prDate', {
        header: 'SUBMITTED ON',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col text-xs text-text-muted font-mono tabular-nums py-0.5">
              <div className="flex items-center gap-1.5 text-heading font-medium">
                <IconCalendar size={12} className="text-primary shrink-0" />
                <span>{formatPRDate(row.prDate) || '—'}</span>
              </div>
              {row.requiredDate && (
                <span className="text-2xs text-text-muted mt-0.5">
                  Req: {formatPRDate(row.requiredDate)}
                </span>
              )}
            </div>
          );
        },
      }),

      /* 6. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 300,
        size: 310,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;

          return (
            <div
              className="flex items-center justify-end gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* View Button */}
              <Button
                type="button"
                variant="primary-soft"
                size="sm"
                onClick={() =>
                  navigate(`/purchase-requisition/${row.prNumber || row.prId}`, {
                    state: { from: '/approvals/purchase-requisitions', backLabel: 'PR Approval', readOnly: true },
                  })
                }
                className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`View ${row.prNumber}`}
              >
                <IconView size={14} className="" aria-hidden="true" />
                View
              </Button>

              {/* Approve Button */}
              <Button
                type="button"
                variant="success"
                size="sm"
                onClick={() => handleOpenApprove(row)}
                className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`Approve ${row.prNumber}`}
              >
                <IconCheck size={14} className="" aria-hidden="true" />
                Approve
              </Button>

              {/* Reject Button */}
              <Button
                type="button"
                variant="danger-soft"
                size="sm"
                onClick={() => handleOpenReject(row)}
                className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title={`Reject ${row.prNumber}`}
              >
                <IconClose size={14} className="" aria-hidden="true" />
                Reject
              </Button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredPendingPRs,
    columns,
    state: { sorting, columnSizing, pagination },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });



  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Purchase Requisition Approval"
        subtitle="Purchase requisitions awaiting review. Click the View button to inspect complete item specifications before deciding."
        icon={<IconPRApproval className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <Badge variant="warning">
            <IconClock size={12} className="shrink-0 mr-1" />
            {totalPendingCount} pending
          </Badge>
        }
      />

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Pending PRs
            </span>
            <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
              <IconClock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{totalPendingCount}</p>
          <span className="text-2xs text-text-muted mt-0.5 block">Awaiting manager signoff</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Urgent Priority
            </span>
            <div className="p-1.5 rounded-lg bg-danger/10 text-danger">
              <IconFlame size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{urgentCount}</p>
          <span className="text-2xs text-text-muted mt-0.5 block">High urgency requisitions</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Line Items
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <IconPackage size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{totalLineItems}</p>
          <span className="text-2xs text-text-muted mt-0.5 block">Materials requested</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface/50 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Departments
            </span>
            <div className="p-1.5 rounded-lg bg-success/10 text-success">
              <IconBuilding2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-heading mt-2 font-mono">{distinctDeptsCount}</p>
          <span className="text-2xs text-text-muted mt-0.5 block">Active request centers</span>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        searchPlaceholder="Search PR number, requester, department, item..."
        hasActiveFilters={hasSearchFilter}
        onReset={() => {
          setSearch('');
          setPriorityFilter('ALL');
        }}
      >
        {/* Priority Quick Filter */}
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-lg border border-border text-xs">
          {['ALL', 'Normal', 'Urgent'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPriorityFilter(p);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                priorityFilter === p
                  ? 'bg-primary text-white shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-heading hover:bg-bg'
              }`}
            >
              {p === 'ALL' ? 'All Priority' : p}
            </button>
          ))}
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        totalCount={filteredPendingPRs.length}
        entityName="pending requisitions"
        emptyTitle={
          hasSearchFilter
            ? 'No matching pending requisitions'
            : 'All purchase requisitions reviewed'
        }
        emptyDescription={
          hasSearchFilter
            ? `No pending requisitions match your query. Try resetting filters.`
            : 'There are currently no purchase requisitions awaiting approval in the queue.'
        }
        emptyAction={
          hasSearchFilter ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setPriorityFilter('ALL');
              }}
              className="text-xs text-primary"
            >
              Clear filters
            </Button>
          ) : null
        }
        renderMobileCard={(row) => {
          const pr = row.original;
          const isUrgent = (pr.priority || '').toLowerCase() === 'urgent';
          const itemsCount = pr.items?.length || 0;

          return (
            <div
              key={pr.prNumber}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      {pr.prNumber}
                    </span>
                    {isUrgent && (
                      <Badge variant="danger" size="sm" className="gap-1 font-semibold">
                        <IconFlame size={11} className="shrink-0" />
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-heading leading-tight mt-0.5 truncate">
                    {pr.requestedBy}
                  </h3>
                  <span className="text-xs text-text-muted block mt-0.5">
                    {pr.department}
                  </span>
                </div>
                <Badge variant="warning" size="sm">
                  Pending Review
                </Badge>
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-2 border-t border-border/50">
                <div>
                  <span className="text-2xs text-text-muted block">Project</span>
                  <span className="font-medium text-heading truncate block">
                    {pr.projectId || 'General Inventory'}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-text-muted block">Line Items</span>
                  <span className="font-medium text-heading block">
                    {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-text-muted block">Required By</span>
                  <span className="font-mono text-2xs text-heading">
                    {formatPRDate(pr.requiredDate)}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-text-muted block">Created Date</span>
                  <span className="font-mono text-2xs text-text-muted">
                    {formatPRDate(pr.prDate)}
                  </span>
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1"
                >
                  <IconView size={13} />
                  View
                </Button>

                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={() => handleOpenApprove(pr)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1"
                >
                  <IconCheck size={13} className="" />
                  Approve
                </Button>

                <Button
                  type="button"
                  variant="danger-soft"
                  size="sm"
                  onClick={() => handleOpenReject(pr)}
                  className="flex-1 text-xs font-semibold h-8 justify-center gap-1"
                >
                  <IconClose size={13} className="" />
                  Reject
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* ── 1. APPROVE CONFIRMATION MODAL WITH REMARKS ── */}
      {prToApprove && (
        <Modal
          isOpen={Boolean(prToApprove)}
          onClose={handleCloseApprove}
          title="Approve Purchase Requisition"
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmApprove();
            }}
            className="space-y-4"
          >
            <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 flex items-start gap-3">
              <IconSuccess size={18} className="text-success shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-semibold text-success">
                  Approving {prToApprove.prNumber}
                </p>
                <p className="text-text-muted mt-0.5">
                  Requested by <strong className="text-heading">{prToApprove.requestedBy}</strong> ({prToApprove.department}) for{' '}
                  <strong className="text-heading">{prToApprove.items?.length || 0} line items</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              Approving this requisition authorizes procurement and generation of purchase orders.
            </p>

            {/* Approval Comments / Remarks Field */}
            <Textarea
                id="pr-approval-remarks"
                name="pr-approval-remarks"
                label="Approval Remarks / Comments (Optional)"
                rows={3}
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                placeholder="Enter approval remarks or authorization notes..."
              />

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCloseApprove}
                disabled={isSubmittingApprove}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmittingApprove}
                loading={isSubmittingApprove}
                icon={IconCheck} className="bg-success hover:bg-success/90 text-white border-transparent">Confirm Approval
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 2. REJECT MODAL WITH REASONS & VALIDATION ── */}
      {prToReject && (
        <Modal
          isOpen={Boolean(prToReject)}
          onClose={handleCloseReject}
          title="Reject Purchase Requisition"
          size="md"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3">
              <IconError size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs">
                <p className="font-semibold text-danger">
                  Rejecting {prToReject.prNumber}
                </p>
                <p className="text-text-muted mt-0.5">
                  Requested by <strong className="text-heading">{prToReject.requestedBy}</strong> ({prToReject.department})
                </p>
              </div>
            </div>

            {/* Reason Textarea */}
            <Textarea
                id="rejection-reason"
                name="rejection-reason"
                label="Reason for Rejection"
                required
                rows={3}
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Explain clearly why this purchase requisition is rejected..."
              />

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleCloseReject}
                disabled={isSubmittingReject}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={isSubmittingReject || !rejectComments.trim()}
                loading={isSubmittingReject}
              >
                <IconClose size={14} className="mr-1.5" />
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 3. ATTACHMENT VIEW MODAL ── */}
      {prToViewAttachments && (
        <Modal
          isOpen={Boolean(prToViewAttachments)}
          onClose={() => setPrToViewAttachments(null)}
          title={`Attachments — ${prToViewAttachments.prNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-heading">
                  Requisition {prToViewAttachments.prNumber}
                </p>
                <p className="text-2xs text-text-muted mt-0.5">
                  Requested by <strong className="text-heading">{prToViewAttachments.requestedBy}</strong> ({prToViewAttachments.department})
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {(prToViewAttachments.attachments || []).length} file{((prToViewAttachments.attachments || []).length !== 1 ? 's' : '')}
              </Badge>
            </div>

            {(!prToViewAttachments.attachments || prToViewAttachments.attachments.length === 0) ? (
              <div className="p-6 text-center text-text-muted text-xs border border-dashed border-border rounded-xl">
                <IconAttachment size={24} className="mx-auto mb-2 opacity-40" />
                <p>No documents attached to this requisition.</p>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-bg">
                {prToViewAttachments.attachments.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="flex items-center justify-between p-3 hover:bg-surface/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <IconFileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-heading truncate" title={file.fileName || file.name}>
                          {file.fileName || file.name}
                        </p>
                        <p className="text-2xs text-text-muted mt-0.5 font-mono">
                          {file.fileSizeKB ? `${file.fileSizeKB} KB` : (file.size || '120 KB')}
                          {file.uploadedDate ? ` • ${formatDateTime(file.uploadedDate)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadAttachment(file, prToViewAttachments)}
                        className="text-xs text-primary hover:text-primary-hover h-7 px-2.5 flex items-center gap-1 border-primary/30 cursor-pointer"
                      >
                        <IconDownload size={12} />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const pr = prToViewAttachments;
                  setPrToViewAttachments(null);
                  navigate(`/purchase-requisition/${pr.prNumber || pr.prId}`, {
                    state: { from: '/approvals/purchase-requisitions', backLabel: 'PR Approval', readOnly: true },
                  });
                }}
                className="text-xs font-medium text-heading hover:text-primary"
              >
                <IconView size={13} className="mr-1.5" />
                Open Full View
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPrToViewAttachments(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
