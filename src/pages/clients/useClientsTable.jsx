/**
 * useClientsTable.jsx — TanStack Table configuration and column definitions for ClientsPage.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, StatusBadge, TableActions } from '../../components/ui';
import {
  getContactTypeBadgeVariant,
  getCountryName,
} from '../../mocks/clients';
import { formatDate } from '../../utils/dateUtils';
import { formatDateDisplay, getEffectiveDateStatus } from '../../utils/effectiveDateUtils';

const columnHelper = createColumnHelper();

export function useClientsTable({ onDeleteClick, onEditClick, onViewClick }) {
  const columns = useMemo(() => [
    /* 1. COMPANY */
    columnHelper.accessor('companyName', {
      id: 'company',
      header: 'COMPANY',
      minSize: 240,
      size: 280,
      cell: (info) => {
        const row = info.row.original;
        const id = row.clientId || row.id;
        return (
          <Link
            to={`/clients/${id}`}
            state={{ readOnly: true }}
            className="flex flex-col py-0.5 max-w-xs group cursor-pointer"
            title={`View ${row.companyName}`}
          >
            <span
              className="font-semibold text-heading text-xs sm:text-sm leading-snug truncate group-hover:text-primary transition-colors"
            >
              {row.companyName}
            </span>
            <span className="text-text-muted text-xs truncate mt-0.5">
              {row.email || row.billingName || '—'}
            </span>
          </Link>
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

    /* 5. STATUS */
    columnHelper.accessor('isActive', {
      id: 'status',
      header: 'STATUS',
      minSize: 110,
      size: 120,
      cell: (info) => <StatusBadge status={Boolean(info.getValue())} size="sm" />,
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

    /* 6. EFFECTIVE DATE */
    columnHelper.accessor(
      (row) => row.effectiveDate || row.activeVersion?.effectiveDate || (row.createdAt ? row.createdAt.slice(0, 10) : ''),
      {
        id: 'effectiveDate',
        header: 'EFFECTIVE DATE',
        minSize: 145,
        size: 165,
        cell: (info) => {
          const row = info.row.original;
          const id = row.clientId || row.id;
          const effectiveDate =
            row.effectiveDate ||
            row.activeVersion?.effectiveDate ||
            (row.createdAt ? row.createdAt.slice(0, 10) : '');
          const statusInfo = getEffectiveDateStatus(effectiveDate);
          return (
            <Link
              to={`/clients/${id}/effective-dates`}
              className="flex flex-col py-0.5 gap-1 group/eff hover:opacity-90 transition-opacity"
              title="Click to view effective date history"
            >
              <span className="font-mono text-xs text-heading font-medium group-hover/eff:text-primary transition-colors">
                {effectiveDate ? formatDateDisplay(effectiveDate) : '—'}
              </span>
              <div>
                <Badge variant={statusInfo.badgeVariant} className="text-2xs px-1.5 py-0">
                  {statusInfo.label}
                </Badge>
              </div>
            </Link>
          );
        },
      }
    ),

    /* 7. ACTIONS */
    columnHelper.display({
      id: 'actions',
      header: 'ACTIONS',
      size: 130,
      minSize: 120,
      enableSorting: false,
      enableResizing: false,
      cell: (info) => {
        const row = info.row.original;
        return (
          <TableActions
            onView={onViewClick ? () => onViewClick(row) : undefined}
            onEdit={onEditClick ? () => onEditClick(row) : undefined}
            onDelete={onDeleteClick ? () => onDeleteClick(row) : undefined}
            viewTitle="View Client details"
            editTitle="Edit Client"
            deleteTitle="Delete Client"
          />
        );
      },
    }),
  ], [onDeleteClick, onEditClick, onViewClick]);

  return { columns };
}
