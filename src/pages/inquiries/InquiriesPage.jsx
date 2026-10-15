/**
 * InquiriesPage.jsx — Inquiry management dashboard for MicroFlat ERP.
 *
 * Route: /inquiries
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Plus,
  UserPlus,
  Inbox,
  Eye,
  Pencil,
} from 'lucide-react';

import {
  Button,
  SearchableSelect,
  Badge,
  PageHeader,
  DataTable,
  TableToolbar,
  TableActions,
} from '../../components/ui';
import { useInquiriesContext } from '../../context/InquiriesContext';
import { useUsersContext } from '../../context/UsersContext';
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  getRegionName,
  getStatusOption,
  getPriorityBadgeVariant,
} from '../../mocks/inquiries';
import AssignInquiryModal from './components/AssignInquiryModal';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  ...STATUS_OPTIONS.map((s) => ({ value: s.id, label: s.name })),
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  ...PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
];

export default function InquiriesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    inquiries,
    allInquiries,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    resetFilters,
    deleteInquiry,
  } = useInquiriesContext();

  const { allUsers = [], users = [] } = useUsersContext();
  const userList = allUsers.length > 0 ? allUsers : users;

  // Modals state
  const [assignModalInquiry, setAssignModalInquiry] = useState(null);
  const [inquiryToDelete, setInquiryToDelete] = useState(null);

  // TanStack table state
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [loading] = useState(false);

  // Helper to resolve user names from user IDs
  const resolveUserName = (userId) => {
    if (!userId) return 'Unassigned';
    const found = userList.find((u) => u.id === userId);
    return found ? `${found.firstName} ${found.lastName}` : 'Unassigned';
  };

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
  );

  // Sync search parameters from URL if any
  useEffect(() => {
    const s = searchParams.get('status');
    const q = searchParams.get('search');
    if (s) setStatusFilter(s);
    if (q) setSearch(q);
  }, [searchParams, setStatusFilter, setSearch]);

  // Reset pagination on filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, priorityFilter]);

  /* ── Column Definitions for TanStack Table ── */
  const columns = useMemo(
    () => [
      /* 1. INQUIRY NO */
      columnHelper.accessor('InquiryNo', {
        header: 'INQUIRY NO',
        minSize: 140,
        size: 155,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/inquiries/${row.id || row.InquiryId}`}
              className="font-mono text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              {row.InquiryNo}
            </Link>
          );
        },
      }),

      /* 2. CUSTOMER / CONTACT */
      columnHelper.accessor(
        (row) => `${row.CustomerName} ${row.ContactPerson} ${row.Email}`,
        {
          id: 'customerContact',
          header: 'CUSTOMER / CONTACT',
          minSize: 220,
          size: 260,
          cell: (info) => {
            const row = info.row.original;
            return (
              <div className="flex flex-col py-0.5 max-w-xs">
                <Link
                  to={`/inquiries/${row.id || row.InquiryId}`}
                  className="font-semibold text-heading text-sm leading-snug hover:text-primary transition-colors truncate"
                >
                  {row.CustomerName}
                </Link>
                <span className="text-text-muted text-xs leading-normal truncate">
                  {row.ContactPerson || '—'} {row.Email ? `• ${row.Email}` : ''}
                </span>
              </div>
            );
          },
        }
      ),

      /* 3. SUBJECT */
      columnHelper.accessor('Subject', {
        header: 'SUBJECT',
        minSize: 200,
        size: 250,
        cell: (info) => {
          const subject = info.getValue() || info.row.original.items?.[0]?.itemName || info.row.original.items?.[0]?.specification || '—';
          return (
            <span
              className="text-xs text-text font-medium line-clamp-1"
              title={subject}
            >
              {subject}
            </span>
          );
        },
      }),

      /* 4. REGION */
      columnHelper.accessor('RegionId', {
        header: 'REGION',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const regionId = info.getValue();
          const regionLabel = getRegionName(regionId);
          return (
            <span className="text-xs text-text-muted truncate block" title={regionLabel}>
              {regionLabel}
            </span>
          );
        },
      }),

      /* 5. PRIORITY */
      columnHelper.accessor('Priority', {
        header: 'PRIORITY',
        minSize: 105,
        size: 115,
        cell: (info) => {
          const priority = info.getValue() || 'Medium';
          return (
            <Badge variant={getPriorityBadgeVariant(priority)} className="text-2xs px-2 py-0.5">
              {priority}
            </Badge>
          );
        },
      }),

      /* 6. STATUS */
      columnHelper.accessor('StatusId', {
        header: 'STATUS',
        minSize: 125,
        size: 140,
        cell: (info) => {
          const statusId = info.getValue() || 'New';
          const statusInfo = getStatusOption(statusId);
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border ${statusInfo.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} aria-hidden="true" />
              {statusInfo.name}
            </span>
          );
        },
      }),

      /* 7. ASSIGNED TO */
      columnHelper.accessor('AssignedTo', {
        header: 'ASSIGNED TO',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const assignedId = info.getValue();
          const resolvedName = resolveUserName(assignedId);
          const isUnassigned = !assignedId || resolvedName === 'Unassigned';

          return isUnassigned ? (
            <span className="text-xs text-text-muted italic">Unassigned</span>
          ) : (
            <span className="text-xs font-medium text-heading">
              {resolvedName}
            </span>
          );
        },
      }),

      /* 8. CREATED ON */
      columnHelper.accessor('CreatedOn', {
        header: 'CREATED ON',
        minSize: 140,
        size: 150,
        cell: (info) => {
          const createdOn = info.getValue();
          return (
            <span className="font-mono tabular-nums text-xs text-text-muted whitespace-nowrap">
              {formatDate(createdOn)}
            </span>
          );
        },
      }),

      /* 9. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 100,
        size: 110,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;

          return (
            <TableActions
              onView={() => navigate(`/inquiries/${row.id || row.InquiryId}`)}
              onEdit={() => navigate(`/inquiries/${row.id || row.InquiryId}/edit`)}
              viewTitle="View Inquiry Details"
              editTitle="Edit Inquiry"
              extraActions={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAssignModalInquiry(row)}
                  title={row.AssignedTo ? 'Reassign Inquiry' : 'Assign Inquiry'}
                  className="h-8 w-8 text-text-muted hover:text-primary hover:bg-surface transition-colors"
                >
                  <UserPlus size={15} aria-hidden="true" />
                </Button>
              }
            />
          );
        },
      }),
    ],
    [navigate, userList]
  );

  /* ── React Table Instance ── */
  const table = useReactTable({
    data: inquiries,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });



  function handleDeleteConfirm() {
    if (!inquiryToDelete) return;
    deleteInquiry(inquiryToDelete.id || inquiryToDelete.InquiryId);
    setInquiryToDelete(null);
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Top Header Bar ── */}
      <PageHeader
        title="Inquiry Management"
        subtitle="Track customer RFQs, precision manufacturing enquiries, assignments & conversion status."
        icon={<Inbox className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/inquiries/new')}
            className="shadow-sm text-xs font-semibold"
          >
            <Plus size={16} className="mr-1.5" aria-hidden="true" />
            New Inquiry
          </Button>
        }
      />

      {/* ── Table Toolbar ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer, inquiry no, subject, email..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="filter-status"
            placeholder="All Statuses"
            searchPlaceholder="Search status..."
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-44">
          <SearchableSelect
            id="filter-priority"
            placeholder="All Priorities"
            searchPlaceholder="Search priority..."
            options={PRIORITY_FILTER_OPTIONS}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Responsive Mobile Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={loading}
        totalCount={inquiries.length}
        entityName="inquiries"
        emptyTitle="No inquiries found"
        emptyDescription={
          hasActiveFilters
            ? 'Try altering your search or status filters.'
            : 'No customer inquiries have been logged yet.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-primary"
            >
              Clear filters
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate('/inquiries/new')}
              className="text-xs"
            >
              <Plus size={14} className="mr-1.5" />
              New Inquiry
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const inq = row.original;
          const statusInfo = getStatusOption(inq.StatusId);
          const assigneeName = resolveUserName(inq.AssignedTo);

          return (
            <div
              key={inq.id || inq.InquiryId}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">
                      {inq.InquiryNo}
                    </span>
                    <Badge variant={getPriorityBadgeVariant(inq.Priority)} className="text-2xs px-1.5 py-0">
                      {inq.Priority}
                    </Badge>
                  </div>

                  <Link
                    to={`/inquiries/${inq.id || inq.InquiryId}`}
                    className="block text-sm font-semibold text-heading leading-tight mt-1 hover:text-primary"
                  >
                    {inq.CustomerName}
                  </Link>
                  <p className="text-xs text-text font-medium mt-1 line-clamp-1">
                    {inq.Subject}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border shrink-0 ${statusInfo.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                  {statusInfo.name}
                </span>
              </div>

              {/* Details summary */}
              <div className="space-y-1 text-xs text-text-muted pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span>Assigned:</span>
                  <span className="font-medium text-heading">
                    {assigneeName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Region:</span>
                  <span className="truncate max-w-[180px]">
                    {getRegionName(inq.RegionId)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono tabular-nums text-2xs">
                  <span>Date:</span>
                  <span>{formatDate(inq.InquiryDate)}</span>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAssignModalInquiry(inq)}
                  className="flex-1 text-xs"
                >
                  <UserPlus size={13} className="mr-1.5" aria-hidden="true" />
                  {inq.AssignedTo ? 'Reassign' : 'Assign'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/inquiries/${inq.id || inq.InquiryId}`)}
                  className="flex-1 text-xs"
                >
                  <Eye size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/inquiries/${inq.id || inq.InquiryId}/edit`)}
                  className="flex-1 text-xs"
                >
                  <Pencil size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* ── Assign Inquiry Modal ── */}
      <AssignInquiryModal
        isOpen={Boolean(assignModalInquiry)}
        onClose={() => setAssignModalInquiry(null)}
        inquiry={assignModalInquiry}
      />
    </div>
  );
}
