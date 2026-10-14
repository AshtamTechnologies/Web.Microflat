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
} from 'lucide-react';
import { IconClient } from '../../constants/icons';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  ConfirmModal,
  TableContainer,
  Th,
  Td,
  PageHeader,
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
      <Card padding="sm" className="bg-bg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="w-full lg:w-80">
            <Input
              id="clients-search"
              type="search"
              placeholder="Search company, contact, GST, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} aria-hidden="true" />}
              rightElement={
                search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="p-1 text-text-muted hover:text-text cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Filter Group: Status Chips + Contact Type Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
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

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-text-muted hover:text-danger flex items-center gap-1"
                title="Reset active filters"
              >
                <RotateCcw size={13} />
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── DESKTOP VIEW (>= md): Client TanStack Data Table ── */}
      <div className="hidden md:block">
        <Card padding="none" className="overflow-hidden border border-border bg-bg shadow-2xs">
          <TableContainer tableClassName="w-full text-left border-collapse text-xs">
            {/* Contrast Table Header */}
            <thead className="bg-surface/90 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
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
                        className={`relative py-3.5 px-4 select-none bg-surface ${
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

            {/* Table Rows */}
            <tbody className="divide-y divide-border bg-bg">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-16 text-center text-text-muted"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-text-muted">
                        <SearchX size={20} />
                      </div>
                      <p className="text-sm font-semibold text-heading">No clients found</p>
                      <p className="text-xs text-text-muted max-w-sm">
                        {hasActiveFilters
                          ? 'Try adjusting your search criteria or clearing active filters.'
                          : 'Get started by clicking "+ Add Client" above.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-2 text-xs text-primary"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-surface/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td key={cell.id} className="py-3 px-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </Td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </TableContainer>

          {/* ── Desktop Table Pagination Bar ── */}
          {filteredClients.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface/30 text-xs text-text-muted">
              <div>
                Showing{' '}
                <strong className="text-heading font-medium">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-heading font-medium">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    filteredClients.length
                  )}
                </strong>{' '}
                of <strong className="text-heading font-medium">{filteredClients.length}</strong> clients
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-7 px-2"
                >
                  <ChevronLeft size={14} className="mr-0.5" />
                  Previous
                </Button>

                <span className="font-mono tabular-nums px-2">
                  Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-7 px-2"
                >
                  Next
                  <ChevronRight size={14} className="ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── MOBILE VIEW (< md): Card List ── */}
      <div className="block md:hidden space-y-3">
        {table.getRowModel().rows.length === 0 ? (
          <Card padding="lg" className="text-center py-12 space-y-3">
            <SearchX size={28} className="mx-auto text-text-muted/60" />
            <h4 className="text-sm font-semibold text-heading">No clients found</h4>
            <p className="text-xs text-text-muted">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or clearing active filters.'
                : 'Get started by clicking "+ Add Client" above.'}
            </p>
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-primary text-xs"
              >
                Clear all filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/clients/new')}
                className="shadow-2xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus size={14} className="mr-1.5" />
                <span>Add Client</span>
              </Button>
            )}
          </Card>
        ) : (
          table.getRowModel().rows.map((row) => {
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

                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 select-none',
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
          })
        )}

        {/* Mobile Pagination */}
        {filteredClients.length > 0 && (
          <div className="px-3.5 py-3 bg-surface border border-border rounded-xl flex items-center justify-between text-xs text-text-muted shadow-2xs">
            <span>
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                filteredClients.length
              )}{' '}
              of {filteredClients.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft size={14} className="mr-0.5" />
                Prev
              </Button>
              <span className="font-mono tabular-nums px-1">
                {table.getState().pagination.pageIndex + 1}/{Math.max(1, table.getPageCount())}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 px-2.5 text-xs"
              >
                Next
                <ChevronRight size={14} className="ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

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
