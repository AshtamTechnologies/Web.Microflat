/**
 * ClientsPage.jsx — Client Registration List view for MicroFlat ERP.
 *
 * Implements standard ERP master view with TanStack Table:
 *   - Resizable columns
 *   - Sortable headers with hover chevrons
 *   - Status & Contact Type filtering
 *   - Full-text search across company, contacts, and addresses
 *   - Confirmation dialog on Delete
 */

import { useState } from 'react';
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
import {
  CONTACT_TYPE_OPTIONS,
  getContactTypeBadgeVariant,
} from '../../mocks/clients';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const CONTACT_TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Contact Types' },
  ...CONTACT_TYPE_OPTIONS,
];

export default function ClientsPage() {
  const navigate = useNavigate();

  const {
    filteredClients,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    contactTypeFilter,
    setContactTypeFilter,
    resetFilters,
  } = useClientsContext();

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

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

  const table = useReactTable({
    data: filteredClients,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
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

      {/* ── Toolbar & Filter Controls ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search company, contact, GST, city..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset"
      >
        {/* Status SearchableSelect */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            onChange={(e) => setContactTypeFilter(e.target.value)}
            options={CONTACT_TYPE_FILTER_OPTIONS}
            placeholder="All Contact Types"
            searchPlaceholder="Search contact types..."
          />
        </div>
      </TableToolbar>

      {/* ── Standard TanStack DataTable & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        totalCount={filteredClients.length}
        entityName="clients"
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
          const contactType = client.contactTypeId || 'Customer';

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
                      {id}
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
                    {client.companyName}
                  </Link>
                  {client.email && (
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {client.email}
                    </p>
                  )}
                </div>

                <StatusBadge status={client.isActive} size="sm" />
              </div>

              {/* Location if present */}
              {city && (
                <div className="text-xs text-text-muted pt-2 border-t border-border/50">
                  <span className="truncate">{city}</span>
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
