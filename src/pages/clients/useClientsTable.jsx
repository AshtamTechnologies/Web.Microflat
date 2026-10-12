/**
 * useClientsTable.jsx — TanStack Table configuration and column definitions for ClientsPage.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui';
import {
  getContactTypeBadgeVariant,
  getCountryName,
} from '../../mocks/clients';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

export function useClientsTable({ onDeleteClick }) {
  const columns = useMemo(() => [
    /* 1. COMPANY */
    columnHelper.accessor('companyName', {
      id: 'company',
      header: 'COMPANY',
      minSize: 240,
      size: 280,
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex flex-col py-0.5 max-w-xs">
            <span
              className="font-semibold text-heading text-xs sm:text-sm leading-snug truncate"
              title={row.companyName}
            >
              {row.companyName}
            </span>
            <span className="text-text-muted text-xs truncate mt-0.5">
              {row.email || row.billingName || '—'}
            </span>
          </div>
        );
      },
    }),

    /* 2. CONTACT TYPE */
    columnHelper.accessor('contactTypeId', {
      id: 'contactType',
      header: 'CONTACT TYPE',
      minSize: 130,
      size: 140,
      cell: (info) => {
        const type = info.getValue() || 'Customer';
        return (
          <Badge variant={getContactTypeBadgeVariant(type)} className="text-xs px-2.5 py-0.5">
            {type}
          </Badge>
        );
      },
    }),

    /* 3. COUNTRY */
    columnHelper.accessor('countryId', {
      id: 'country',
      header: 'COUNTRY',
      minSize: 120,
      size: 140,
      cell: (info) => {
        const val = info.getValue();
        const countryCode = typeof val === 'object' && val !== null ? val.value || '' : val;
        const countryName = getCountryName(countryCode);
        return (
          <span className="text-xs text-text truncate block" title={countryName}>
            {countryName}
          </span>
        );
      },
    }),

    /* 4. PRIMARY CONTACT */
    columnHelper.accessor((row) => row.contacts, {
      id: 'primaryContact',
      header: 'PRIMARY CONTACT',
      minSize: 190,
      size: 220,
      enableSorting: false,
      cell: (info) => {
        const contacts = info.getValue() || [];
        const primary = contacts.find((c) => c.isActive !== false) || contacts[0];

        if (!primary) {
          return <span className="text-text-muted text-xs">—</span>;
        }

        const fullName = `${primary.firstName || ''} ${primary.lastName || ''}`.trim() || '—';

        return (
          <div className="flex flex-col py-0.5 max-w-xs">
            <span className="font-medium text-heading text-xs truncate">
              {fullName}
            </span>
            <span className="font-mono tabular-nums text-text-muted text-2xs truncate mt-0.5">
              {primary.mobile1 || primary.email || '—'}
            </span>
          </div>
        );
      },
    }),

    /* 5. STATUS (Read-only badge like VendorsPage, no switch) */
    columnHelper.accessor('isActive', {
      id: 'status',
      header: 'STATUS',
      minSize: 110,
      size: 120,
      cell: (info) => {
        const isActive = Boolean(info.getValue());
        return (
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium select-none',
              isActive
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20',
            ].join(' ')}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isActive ? 'bg-success' : 'bg-danger'
              }`}
              aria-hidden="true"
            />
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    }),

    /* 6. CREATED */
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: 'CREATED',
      minSize: 120,
      size: 130,
      cell: (info) => (
        <span className="font-mono tabular-nums text-xs text-text-muted">
          {formatDate(info.getValue())}
        </span>
      ),
    }),

    /* 7. ACTIONS */
    columnHelper.display({
      id: 'actions',
      header: 'ACTIONS',
      size: 110,
      minSize: 100,
      enableSorting: false,
      enableResizing: false,
      cell: (info) => {
        const row = info.row.original;
        const id = row.clientId || row.id;
        return (
          <div className="flex items-center justify-end gap-1">
            <Link
              to={`/clients/${id}`}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
              title="View Client Details"
            >
              <Eye size={15} />
            </Link>
            <Link
              to={`/clients/${id}/edit`}
              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
              title="Edit Client"
            >
              <Pencil size={15} />
            </Link>
            <button
              type="button"
              onClick={() => onDeleteClick(row)}
              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-surface transition-colors cursor-pointer"
              title="Delete Client"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      },
    }),
  ], [onDeleteClick]);

  return { columns };
}
