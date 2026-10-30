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
      header: 'CLIENT',
      minSize: 220,
      size: 260,
      cell: (info) => {
        const row = info.row.original;
        const id = row.clientId || row.id;
        const code = row.clientCode || (typeof id === 'number' ? `CLI-${String(id).padStart(3, '0')}` : id);
        return (
          <Link
            to={`/clients/${id}`}
            state={{ readOnly: true }}
            className="flex items-center gap-1.5 py-0.5 max-w-xs group cursor-pointer"
            title={`View ${row.companyName || row.clientName}`}
          >
            <span className="font-mono text-2xs font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded shrink-0">
              {code}
            </span>
            <span className="font-semibold text-heading text-xs sm:text-sm leading-snug truncate group-hover:text-primary transition-colors">
              {row.companyName || row.clientName}
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
        const type = info.getValue() || info.row.original.contactType || 'Customer';
        return (
          <Badge variant={getContactTypeBadgeVariant(type)} className="text-xs px-2.5 py-0.5">
            {type}
          </Badge>
        );
      },
    }),

    /* 3. PRIMARY CONTACT & CITY */
    columnHelper.accessor('primaryContactName', {
      id: 'primaryContact',
      header: 'PRIMARY CONTACT',
      minSize: 160,
      size: 180,
      cell: (info) => {
        const row = info.row.original;
        const name = row.primaryContactName;
        const phone = row.primaryContactPhoneNo;
        const city = row.city;

        if (!name && !city) return <span className="text-text-muted text-xs">—</span>;

        return (
          <div className="flex flex-col text-xs leading-tight">
            {name ? (
              <span className="font-medium text-heading truncate">{name}</span>
            ) : null}
            <div className="flex items-center gap-1.5 text-text-muted text-2xs mt-0.5 truncate">
              {phone ? <span className="font-mono tabular-nums">{phone}</span> : null}
              {phone && city ? <span>•</span> : null}
              {city ? <span>{city}</span> : null}
            </div>
          </div>
        );
      },
    }),

    /* 4. STATUS */
    columnHelper.accessor('isActive', {
      id: 'status',
      header: 'STATUS',
      minSize: 110,
      size: 120,
      cell: (info) => {
        const row = info.row.original;
        const isScheduled = row.versionState === 'Scheduled' || row.hasScheduledChange;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={Boolean(info.getValue())} size="sm" />
            {isScheduled && (
              <Badge variant="warning" className="text-2xs px-1.5 py-0">
                Scheduled
              </Badge>
            )}
          </div>
        );
      },
    }),

    /* 5. CREATED */
    columnHelper.accessor('createdAt', {
      id: 'createdAt',
      header: 'CREATED',
      minSize: 120,
      size: 130,
      cell: (info) => (
        <span className="font-mono tabular-nums text-xs text-text-muted">
          {formatDate(info.getValue() || info.row.original.createdOn)}
        </span>
      ),
    }),

    /* 6. ACTIONS */
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
