/**
 * src/pages/companyRegistration/CompanyRegistrationPage.jsx — List of all registered companies.
 *
 * Route: /company-registration
 * Features:
 *   - TanStack DataTable with sorting, searching, and status filters
 *   - Standardized TableActions column matching ERP conventions
 *   - Responsive mobile card view for small touch screens (< 768px)
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';

import {
  PageHeader,
  TableToolbar,
  DataTable,
  Button,
  StatusBadge,
  TableActions,
  Badge,
} from '../../components/ui';

import {
  IconBuilding2,
  IconAdd,
  IconMail,
  IconPhone,
  IconMapPin,
  IconView,
  IconEdit,
} from '../../constants/icons';

import { useCompanyContext } from '../../context/CompanyContext';
import { getStateName } from '../../mocks/vendors';

const columnHelper = createColumnHelper();

export default function CompanyRegistrationPage() {
  const navigate = useNavigate();
  const { companies } = useCompanyContext();

  const [sorting, setSorting] = useState([{ id: 'companyName', desc: false }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter companies by search query and active status
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !c.isActive) return false;
      if (statusFilter === 'INACTIVE' && c.isActive) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = (c.companyName || '').toLowerCase().includes(q);
      const matchCity = (c.city || '').toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const matchGst = (c.gstNo || '').toLowerCase().includes(q);
      const matchPerson = (c.contactPersonName || '').toLowerCase().includes(q);
      const matchPersonEmail = (c.contactPersonEmail || '').toLowerCase().includes(q);
      const matchPersonMobile = (c.contactPersonMobile || '').toLowerCase().includes(q);
      const matchWebsite = (c.website || '').toLowerCase().includes(q);

      return (
        matchName ||
        matchCity ||
        matchEmail ||
        matchWebsite ||
        matchGst ||
        matchPerson ||
        matchPersonEmail ||
        matchPersonMobile
      );
    });
  }, [companies, searchQuery, statusFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'COMPANY ID',
        size: 130,
        cell: (info) => {
          const row = info.row.original;
          return (
            <Link
              to={`/company-registration/${row.id}`}
              className="font-mono text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer text-left"
            >
              {row.id}
            </Link>
          );
        },
      }),

      columnHelper.accessor('companyName', {
        header: 'COMPANY NAME',
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          const person = row.contactPersonName;
          return (
            <div className="min-w-0">
              <Link
                to={`/company-registration/${row.id}`}
                className="font-semibold text-heading text-xs leading-snug hover:text-primary transition-colors truncate block text-left cursor-pointer"
                title={info.getValue()}
              >
                {info.getValue()}
              </Link>
              {person && (
                <span className="text-2xs text-text-muted truncate block">
                  Contact: {person}
                </span>
              )}
            </div>
          );
        },
      }),

      columnHelper.accessor('city', {
        header: 'CITY / STATE',
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          const stateLabel = getStateName(row.country, row.state) || row.state;
          return (
            <div className="flex items-center gap-1 text-xs text-heading">
              <IconMapPin size={12} className="text-text-muted shrink-0" />
              <span className="truncate">{[row.city, stateLabel].filter(Boolean).join(', ') || '—'}</span>
            </div>
          );
        },
      }),

      columnHelper.accessor('email', {
        header: 'CONTACT INFO',
        size: 200,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="space-y-0.5 text-2xs text-text-muted">
              {row.email && (
                <div className="flex items-center gap-1 truncate text-heading">
                  <IconMail size={11} className="text-primary shrink-0" />
                  <span className="truncate">{row.email}</span>
                </div>
              )}
              {row.phone1 && (
                <div className="flex items-center gap-1 font-mono">
                  <IconPhone size={11} className="shrink-0" />
                  <span>{row.phone1}</span>
                </div>
              )}
            </div>
          );
        },
      }),

      columnHelper.accessor('gstNo', {
        header: 'GST NO.',
        size: 150,
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="font-mono tabular-nums text-xs text-text font-medium">
              {val || '—'}
            </span>
          );
        },
      }),

      columnHelper.accessor('isActive', {
        header: 'STATUS',
        size: 100,
        cell: (info) => <StatusBadge status={info.getValue()} size="sm" />,
      }),

      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 100,
        minSize: 90,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          return (
            <TableActions
              onView={() => navigate(`/company-registration/${row.id}`)}
              onEdit={() => navigate(`/company-registration/${row.id}/edit`)}
              viewTooltip="View company details"
              editTooltip="Edit company"
            />
          );
        },
      }),
    ],
    [navigate]
  );

  const table = useReactTable({
    data: filteredCompanies,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Page Header ── */}
      <PageHeader
        title="Company Registration"
        icon={<IconBuilding2 className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle="Registered organization profile, legal identifiers, and official business details."
      />

      {/* ── Table Toolbar & Filters ── */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by company name, city, GST, or contact..."
        hasActiveFilters={Boolean(searchQuery || statusFilter !== 'ALL')}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('ALL');
        }}
      >
        <div className="flex items-center gap-1.5 bg-surface/60 p-1 rounded-lg border border-border">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-text-muted hover:text-heading hover:bg-surface'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </TableToolbar>

      {/* ── DataTable with Responsive Mobile Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        emptyTitle="No companies registered"
        emptyDescription="Get started by registering your company master profile and bank accounts."
        emptyAction={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconAdd}
            onClick={() => navigate('/company-registration/new')}
          >
            Register Company
          </Button>
        }
        entityName="companies"
        renderMobileCard={(row) => {
          const comp = row.original;
          const person = comp.contactPersonName;
          const stateLabel = getStateName(comp.country, comp.state) || comp.state;

          return (
            <div className="p-4 space-y-3 bg-bg border border-border rounded-xl shadow-2xs hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/company-registration/${comp.id}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {comp.id}
                    </Link>
                    <Link
                      to={`/company-registration/${comp.id}`}
                      className="font-semibold text-sm text-heading truncate hover:text-primary transition-colors"
                    >
                      {comp.companyName}
                    </Link>
                  </div>
                  {person && <p className="text-2xs text-text-muted mt-0.5">Contact: {person}</p>}
                </div>

                <Badge variant={comp.isActive ? 'active' : 'inactive'} className="text-2xs">
                  {comp.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-2 border-t border-border/50">
                <div>
                  <span className="block text-2xs uppercase tracking-wider font-medium text-text-muted">
                    Location
                  </span>
                  <span className="text-heading truncate block">
                    {[comp.city, stateLabel].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>

                <div>
                  <span className="block text-2xs uppercase tracking-wider font-medium text-text-muted">
                    GST No.
                  </span>
                  <span className="font-mono font-medium text-heading truncate block">
                    {comp.gstNo || '—'}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="block text-2xs uppercase tracking-wider font-medium text-text-muted">
                    Contact
                  </span>
                  <span className="text-heading truncate block">{comp.email || comp.phone1 || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/company-registration/${comp.id}`)}
                  className="flex-1 text-xs"
                >
                  <IconView size={14} className="mr-1.5" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/company-registration/${comp.id}/edit`)}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={14} className="mr-1.5" />
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
