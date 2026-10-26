/**
 * useCompanyBankTable.jsx — TanStack table hook for Company Bank Details.
 * Designed to mirror useVendorBankTable.jsx for complete UI consistency across the ERP.
 */

import { useMemo, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Badge, TableActions } from '../../components/ui';
import { formatDate } from '../../utils/dateUtils';

export const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const columnHelper = createColumnHelper();

export function useCompanyBankTable({
  allBanks = [],
  toggleBankActive,
  onViewAttachments,
  onDeleteBank,
}) {
  const navigate = useNavigate();

  // Search and Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Reset all filters and pagination back to page 1
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allBanks.filter((bank) => {

      // Status filter
      const st = (statusFilter || '').toUpperCase();
      if (st === 'ACTIVE' && !Boolean(bank.isActive)) return false;
      if (st === 'INACTIVE' && Boolean(bank.isActive)) return false;

      // Text search
      if (!q) return true;

      const last4 = bank.accountNumber ? String(bank.accountNumber).slice(-4) : '';
      const matchesSearch =
        (bank.companyCode && bank.companyCode.toLowerCase().includes(q)) ||
        (bank.companyName && bank.companyName.toLowerCase().includes(q)) ||
        (bank.bankName && bank.bankName.toLowerCase().includes(q)) ||
        (bank.branchName && bank.branchName.toLowerCase().includes(q)) ||
        (bank.accountHolderName && bank.accountHolderName.toLowerCase().includes(q)) ||
        (bank.ifscCode && bank.ifscCode.toLowerCase().includes(q)) ||
        (bank.swiftCode && bank.swiftCode.toLowerCase().includes(q)) ||
        (bank.accountNumber && String(bank.accountNumber).includes(q)) ||
        last4.includes(q);

      return matchesSearch;
    });
  }, [allBanks, search, statusFilter]);

  // Columns definition matching Vendor Bank Details
  const columns = useMemo(
    () => [
      /* 1. Company Name */
      columnHelper.accessor('companyName', {
        id: 'company',
        header: 'COMPANY',
        minSize: 180,
        size: 240,
        cell: (info) => {
          const row = info.row.original;
          const bankId = row.bankDetailId || row.id;
          return (
            <Link
              to={`/company-bank-details/${row.companyId}/view?bank=${bankId}`}
              className="flex flex-col min-w-0 py-0.5 group/company cursor-pointer"
              title={`View all bank details for ${row.companyName}`}
            >
              <span className="font-semibold text-xs text-heading group-hover/company:text-primary truncate transition-colors">
                {row.companyName}
              </span>
              <span className="text-2xs font-mono text-primary truncate mt-0.5">
                {row.companyCode || row.companyId}
              </span>
            </Link>
          );
        },
      }),

      /* 2. Bank Name & Branch */
      columnHelper.accessor('bankName', {
        id: 'bank',
        header: 'BANK & BRANCH',
        minSize: 180,
        size: 260,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs text-heading truncate" title={row.bankName}>
                {row.bankName}
              </span>
              <span className="text-2xs text-text-muted truncate mt-0.5" title={row.branchName || '—'}>
                {row.branchName || '—'}
              </span>
            </div>
          );
        },
      }),

      /* 3. Account Type */
      columnHelper.accessor('accountType', {
        id: 'accountType',
        header: 'TYPE',
        minSize: 100,
        size: 110,
        cell: (info) => (
          <Badge variant="neutral" size="sm">
            {info.getValue() || 'Current'}
          </Badge>
        ),
      }),

      /* 4. Status Badge */
      columnHelper.accessor('isActive', {
        id: 'status',
        header: 'STATUS',
        minSize: 100,
        size: 110,
        cell: (info) => {
          const isActive = Boolean(info.getValue());
          return (
            <Badge variant={isActive ? 'active' : 'inactive'} size="sm">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      }),

      /* 5. Last Updated */
      columnHelper.accessor('updatedAt', {
        id: 'lastUpdated',
        header: 'LAST UPDATED',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          const dateVal = row.updatedAt || row.createdAt;
          const userVal = row.updatedBy || row.createdBy || 'Ian Chesnut';
          return (
            <div className="flex flex-col font-mono tabular-nums text-xs">
              <span className="text-text-muted">
                {dateVal ? formatDate(dateVal) : '—'}
              </span>
              <span className="text-2xs text-text-muted/80 font-sans mt-0.5 truncate">
                by {userVal}
              </span>
            </div>
          );
        },
      }),

      /* 6. Actions (View, Edit, Delete) */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 100,
        size: 110,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const bankId = row.bankDetailId || row.id;
          return (
            <TableActions
              onView={() => navigate(`/company-bank-details/${row.companyId}/view?bank=${bankId}`)}
              onEdit={() => navigate(`/company-bank-details/${row.companyId}/edit?bank=${bankId}`)}
              onDelete={onDeleteBank ? () => onDeleteBank(row) : undefined}
              viewTitle={`View bank details for ${row.companyName}`}
              editTitle={`Edit bank account for ${row.companyName}`}
              deleteTitle={`Delete bank account for ${row.companyName}`}
            />
          );
        },
      }),
    ],
    [navigate, toggleBankActive, onViewAttachments, onDeleteBank]
  );

  return {
    columns,
    filteredData,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    columnSizing,
    setColumnSizing,
    pagination,
    setPagination,
    resetFilters,
  };
}
