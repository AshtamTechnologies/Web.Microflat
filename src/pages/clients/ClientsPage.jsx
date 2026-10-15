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
  flexRender,
} from '@tanstack/react-table';
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SearchX,
  RotateCcw,
  X,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  Phone,
  User,
  Eye,
} from 'lucide-react';
import { IconClient } from '../../constants/icons';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  ConfirmModal,
  PageHeader,
  DataTable,
  TableToolbar,
  StatusBadge,
} from '../../components/ui';
import { useClientsContext } from '../../context/ClientsContext';
import { useClientsTable } from './useClientsTable.jsx';
import {
  CONTACT_TYPE_OPTIONS,
  getContactTypeBadgeVariant,
  getCountryName,
} from '../../mocks/clients';
import { formatDateDisplay, getEffectiveDateStatus } from '../../utils/effectiveDateUtils';

const STATUS_CHIPS = [
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
    deleteClient,
    toggleClientActive,
  } = useClientsContext();

  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [clientToDelete, setClientToDelete] = useState(null);

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
    onDeleteClick: (client) => setClientToDelete(client),
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

  const handleDeleteConfirm = () => {
    if (!clientToDelete) return;
    const id = clientToDelete.clientId || clientToDelete.id;
    // NOTE: Before production API integration, verify no active Inquiries, Quotations,
    // or Sales Orders link to this clientId before allowing hard delete.
    deleteClient(id);
    setClientToDelete(null);
  };

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
            <Plus size={15} className="mr-1.5" />
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
        {/* Status Chips */}
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface/50">
          {STATUS_CHIPS.map((chip) => {
            const isSelected = statusFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-bg text-heading font-semibold shadow-2xs border border-border/80'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Contact Type Select */}
        <div className="w-44">
          <Select
            id="contact-type-filter"
            value={contactTypeFilter}
            onChange={(e) => setContactTypeFilter(e.target.value)}
            options={CONTACT_TYPE_FILTER_OPTIONS}
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
          const countryVal = client.countryId;
          const countryCode = typeof countryVal === 'object' && countryVal !== null ? countryVal.value || '' : countryVal;
          const countryName = getCountryName(countryCode);

          const contacts = client.contacts || [];
          const primary = contacts.find((c) => c.isActive !== false) || contacts[0];
          const primaryName = primary ? `${primary.firstName || ''} ${primary.lastName || ''}`.trim() : null;
          const primaryPhone = primary?.mobile1 || primary?.phone;

          const addresses = client.addresses || [];
          const primaryAddr = addresses.find((a) => a.isDefault || a.isActive !== false) || addresses[0];
          const city = primaryAddr?.city || client.city;

          const effectiveDate =
            client.effectiveDate ||
            client.activeVersion?.effectiveDate ||
            (client.createdAt ? client.createdAt.slice(0, 10) : '');
          const statusInfo = getEffectiveDateStatus(effectiveDate);

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

              {/* Details: Effective Date, Primary Contact, Location */}
              <div className="space-y-1.5 text-xs text-text-muted pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                    <span>Eff:</span>
                    <span className="font-mono text-2xs font-medium text-heading">
                      {effectiveDate ? formatDateDisplay(effectiveDate) : '—'}
                    </span>
                  </div>
                  {effectiveDate && (
                    <Badge variant={statusInfo.badgeVariant} className="text-2xs px-1.5 py-0">
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>

                {(primaryName || primaryPhone) && (
                  <div className="flex items-center gap-2">
                    {primaryPhone ? (
                      <Phone size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                    ) : (
                      <User size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                    )}
                    <span className="truncate">
                      {primaryName && <span className="text-heading font-medium">{primaryName}</span>}
                      {primaryName && primaryPhone && <span className="mx-1">•</span>}
                      {primaryPhone && <span className="font-mono tabular-nums">{primaryPhone}</span>}
                    </span>
                  </div>
                )}

                {(city || countryName) && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="shrink-0 text-text-muted/70" aria-hidden="true" />
                    <span className="truncate">
                      {[city, countryName].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/clients/${id}/effective-dates`, { state: { readOnly: true } })}
                  className="flex-1 text-xs"
                >
                  <Eye size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/clients/${id}/effective-dates`)}
                  className="flex-1 text-xs"
                >
                  <Pencil size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setClientToDelete(client)}
                  className="flex-1 text-xs"
                >
                  <Trash2 size={13} className="mr-1.5" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(clientToDelete)}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Client"
        message={
          clientToDelete
            ? `Are you sure you want to delete ${clientToDelete.companyName}? This action will permanently remove the client and all associated address and contact records.`
            : ''
        }
        confirmText="Delete Client"
        confirmVariant="danger"
      />
    </div>
  );
}
