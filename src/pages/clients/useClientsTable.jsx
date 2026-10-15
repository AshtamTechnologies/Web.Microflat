import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, StatusBadge, TableActions } from '../../components/ui';
import { getContactTypeBadgeVariant } from '../../mocks/clients';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

export function useClientsTable({ onEditClick, onViewClick }) {
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

    /* 3. STATUS */
    columnHelper.accessor('isActive', {
      id: 'status',
      header: 'STATUS',
      minSize: 110,
      size: 120,
      cell: (info) => <StatusBadge status={Boolean(info.getValue())} size="sm" />,
    }),

    /* 4. CREATED */
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

    /* 5. ACTIONS */
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
            onView={onViewClick ? () => onViewClick(row) : undefined}
            onEdit={onEditClick ? () => onEditClick(row) : undefined}
            viewTitle="View Client details"
            editTitle="Edit Client"
          />
        );
      },
    }),
  ], [onEditClick, onViewClick]);

  return { columns };
}
