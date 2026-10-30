/**
 * ClientsPage.jsx — Client Registration List view for MicroFlat ERP.
 *
 * Implements standard ERP master view with TanStack Table:
 *   - Server-side and client-side pagination / search / filtering
 *   - Status & Contact Type filtering using dynamic lookups
 *   - Summary counts metrics bar
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconClient,
  IconEdit,
  IconView,
} from '../../constants/icons';
import {
  Button,
  Card,
  Badge,
  PageHeader,
  DataTable,
  TableToolbar,
  StatusBadge,
  SearchableSelect,
} from '../../components/ui';
import { useClientsContext } from '../../context/ClientsContext';
import { useClientsTable } from './useClientsTable.jsx';
import { getContactTypeBadgeVariant } from '../../mocks/clients';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export default function ClientsPage() {
  const navigate = useNavigate();

  const {
    filteredClients,
    summary,
    lookups,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    contactTypeFilter,
    setContactTypeFilter,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    isLoading,
    resetFilters,
  } = useClientsContext();

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  const contactTypeOptions = useMemo(() => {
    const list = Array.isArray(lookups?.contactTypes) && lookups.contactTypes.length > 0
      ? lookups.contactTypes
      : ['Customer', 'Distributor', 'Dealer', 'Agency'];

    return [
      { value: 'ALL', label: 'All Contact Types' },
      ...list.map((t) => ({ value: t, label: t })),
    ];
  }, [lookups]);

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter !== 'ALL' || contactTypeFilter !== 'ALL'
  );

  const { columns } = useClientsTable({
    onViewClick: (client) => {
      const id = client.clientId || client.id;
      navigate(`/clients/${id}/effective-dates`, { state: { readOnly: true } });
    },
    onEditClick: (client) => {
      const id = client.clientId || client.id;
      navigate(`/clients/${id}/effective-dates`);
    },
  });

  const pagination = useMemo(
    () => ({
      pageIndex: Math.max(0, pageNumber - 1),
      pageSize: pageSize,
    }),
    [pageNumber, pageSize]
  );

  const table = useReactTable({
    data: filteredClients,
    columns,
    pageCount: totalPages,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      setPageNumber(next.pageIndex + 1);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  });

  return (
    <div className="space-y-5 pb-16">
      {/* ── Page Header ── */}
      <PageHeader
        title="Clients"
        subtitle="Register and manage customers, distributors, dealers, and agents"
        icon={<IconClient className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/clients/new')}
            className="shadow-2xs text-xs font-semibold"
          >
            <IconAdd size={15} className="mr-1.5" />
            Add Client
          </Button>
        }
      />

      {/* ── KPI Summary Cards ── */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card padding="none" className="p-3 bg-surface border border-border rounded-xl">
            <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Total Clients</span>
            <p className="text-lg font-bold text-heading mt-0.5">{summary.total}</p>
          </Card>
          <Card padding="none" className="p-3 bg-surface border border-border rounded-xl">
            <span className="text-2xs text-success font-medium uppercase tracking-wider">Active</span>
            <p className="text-lg font-bold text-success mt-0.5">{summary.active}</p>
          </Card>
          <Card padding="none" className="p-3 bg-surface border border-border rounded-xl">
            <span className="text-2xs text-text-muted font-medium uppercase tracking-wider">Inactive</span>
            <p className="text-lg font-bold text-text-muted mt-0.5">{summary.inactive}</p>
          </Card>
          <Card padding="none" className="p-3 bg-surface border border-border rounded-xl">
            <span className="text-2xs text-warning font-medium uppercase tracking-wider">Scheduled Changes</span>
            <p className="text-lg font-bold text-warning mt-0.5">{summary.scheduledChanges || 0}</p>
          </Card>
        </div>
      )}

      {/* ── Toolbar & Filter Controls ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPageNumber(1);
        }}
        searchPlaceholder="Search client code, company, contact, GST, city..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset"
      >
        {/* Status SearchableSelect */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPageNumber(1);
            }}
            options={STATUS_FILTER_OPTIONS}
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
          />
        </div>

        {/* Contact Type SearchableSelect */}
        <div className="w-full sm:w-48">
          <SearchableSelect
            id="contact-type-filter"
            value={contactTypeFilter}
            onChange={(e) => {
              setContactTypeFilter(e.target.value);
              setPageNumber(1);
            }}
            options={contactTypeOptions}
            placeholder="All Contact Types"
            searchPlaceholder="Search contact types..."
          />
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        totalCount={totalCount || filteredClients.length}
        entityName="clients"
        isLoading={isLoading}
        emptyTitle="No clients found"
        emptyDescription={
          hasActiveFilters
            ? 'Try adjusting your search criteria or clearing active filters.'
            : 'Get started by clicking "+ Add Client" above.'
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
              Clear all filters
            </Button>
          ) : null
        }
        renderMobileCard={(row) => {
          const client = row.original;
          const id = client.clientId || client.id;
          const code = client.clientCode || (typeof id === 'number' ? `CLI-${String(id).padStart(3, '0')}` : id);
          const contactType = client.contactTypeId || client.contactType || 'Customer';

          const addresses = client.addresses || [];
          const primaryAddr = addresses.find((a) => a.isDefault || a.isActive !== false) || addresses[0];
          const city = primaryAddr?.city || client.city;

          return (
            <div
              key={id}
              className="bg-surface border border-border rounded-xl p-4 shadow-2xs space-y-3"
            >
              {/* Header: ID, Type & Active/Inactive Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">
                      {code}
                    </span>
                    <Badge variant={getContactTypeBadgeVariant(contactType)}>
                      {contactType}
                    </Badge>
                  </div>
                  <Link
                    to={`/clients/${id}`}
                    state={{ readOnly: true }}
                    className="block text-sm font-semibold text-heading leading-tight mt-1 hover:text-primary transition-colors"
                  >
                    {client.companyName || client.clientName}
                  </Link>
                  {(client.email || client.officialEmail) && (
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {client.email || client.officialEmail}
                    </p>
                  )}
                </div>

                <StatusBadge status={client.isActive} size="sm" />
              </div>

              {/* Location & Primary contact if present */}
              {(city || client.primaryContactName) && (
                <div className="text-xs text-text-muted pt-2 border-t border-border/50 flex items-center justify-between">
                  {client.primaryContactName && (
                    <span className="truncate font-medium text-heading">
                      {client.primaryContactName}
                    </span>
                  )}
                  {city && <span className="truncate">{city}</span>}
                </div>
              )}

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/clients/${id}/effective-dates`, { state: { readOnly: true } })}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/clients/${id}/effective-dates`)}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
