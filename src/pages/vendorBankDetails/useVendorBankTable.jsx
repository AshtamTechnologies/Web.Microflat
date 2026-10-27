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

export const ACCOUNT_TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Account Types' },
  { value: 'Current', label: 'Current' },
  { value: 'Savings', label: 'Savings' },
  { value: 'Cash Credit', label: 'Cash Credit' },
  { value: 'Overdraft', label: 'Overdraft' },
];

const columnHelper = createColumnHelper();

export function useVendorBankTable({
  allBanks = [],
  toggleBankActive,
  onViewAttachments,
  onDeleteBank,
} = {}) {
  const navigate = useNavigate();

  // Search and Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [vendorFilter, setVendorFilter] = useState('ALL'); // 'ALL' | vendorId
  const [accountTypeFilter, setAccountTypeFilter] = useState('ALL'); // 'ALL' | accountType
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Reset all filters and pagination back to page 1
  const resetFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('ALL');
    setVendorFilter('ALL');
    setAccountTypeFilter('ALL');
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Filtered dataset for local fallback
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allBanks.filter((bank) => {
      // Vendor filter
      if (
        vendorFilter &&
        vendorFilter !== 'ALL' &&
        String(bank.vendorId).trim() !== String(vendorFilter).trim()
      ) {
        return false;
      }

      // Account Type filter
      if (
        accountTypeFilter &&
        accountTypeFilter !== 'ALL' &&
        bank.accountType?.toLowerCase() !== accountTypeFilter.toLowerCase()
      ) {
        return false;
      }

      // Status filter
      const st = (statusFilter || '').toUpperCase();
      if (st === 'ACTIVE' && !Boolean(bank.isActive)) return false;
      if (st === 'INACTIVE' && Boolean(bank.isActive)) return false;

      // Text search
      if (!q) return true;

      const last4 = bank.accountNumber ? String(bank.accountNumber).slice(-4) : '';
      const matchesSearch =
        (bank.vendorCode && bank.vendorCode.toLowerCase().includes(q)) ||
        (bank.vendorName && bank.vendorName.toLowerCase().includes(q)) ||
        (bank.bankName && bank.bankName.toLowerCase().includes(q)) ||
        (bank.branchName && bank.branchName.toLowerCase().includes(q)) ||
        (bank.accountHolderName && bank.accountHolderName.toLowerCase().includes(q)) ||
        (bank.ifscCode && bank.ifscCode.toLowerCase().includes(q)) ||
        (bank.swiftCode && bank.swiftCode.toLowerCase().includes(q)) ||
        (bank.accountNumber && String(bank.accountNumber).includes(q)) ||
        last4.includes(q);

      return matchesSearch;
    });
  }, [allBanks, search, statusFilter, vendorFilter, accountTypeFilter]);

  // Mask account number helper: "•••• 4821"
  const maskAccountNumber = (num) => {
    if (!num) return '•••• —';
    const str = String(num);
    const last4 = str.slice(-4);
    return `•••• ${last4}`;
  };

  // Columns definition (Unchanged: displays exact columns as requested)
  const columns = useMemo(
    () => [
      /* 1. Vendor (name only) */
      columnHelper.accessor('vendorName', {
        id: 'vendor',
        header: 'VENDOR',
        minSize: 180,
        size: 220,
        cell: (info) => {
          const row = info.row.original;
          const bankId = row.bankDetailId || row.id;
          return (
            <Link
              to={`/vendor-bank-details/${row.vendorId}/view?bank=${bankId}`}
              className="flex items-center min-w-0 py-0.5 group/vendor"
              title={`View all bank details for ${row.vendorName}`}
            >
              <span className="font-semibold text-xs text-heading group-hover/vendor:text-primary truncate transition-colors">
                {row.vendorName || '—'}
              </span>
            </Link>
          );
        },
      }),

      /* 2. Bank (bank name, branch muted below) */
      columnHelper.accessor('bankName', {
        id: 'bank',
        header: 'BANK & BRANCH',
        minSize: 180,
        size: 220,
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

      /* 3. Type (neutral Badge) */
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

      /* 5. Last Updated (mono date + by <name> muted) */
      columnHelper.accessor('lastUpdatedOn', {
        id: 'lastUpdated',
        header: 'LAST UPDATED',
        minSize: 140,
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          const dateVal = row.lastUpdatedOn || row.updatedAt || row.createdOn || row.createdAt;
          const userVal = row.updatedBy || row.createdBy;
          return (
            <div className="flex flex-col font-mono tabular-nums text-xs">
              <span className="text-text-muted">
                {dateVal ? formatDate(dateVal) : '—'}
              </span>
              {userVal && (
                <span className="text-2xs text-text-muted/80 font-sans mt-0.5 truncate">
                  by {userVal}
                </span>
              )}
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
              onView={() => navigate(`/vendor-bank-details/${row.vendorId}/view?bank=${bankId}`)}
              onEdit={() => navigate(`/vendor-bank-details/${row.vendorId}/edit?bank=${bankId}`)}
              onDelete={onDeleteBank ? () => onDeleteBank(row) : undefined}
              viewTitle={`View bank details for ${row.vendorName}`}
              editTitle={`Edit bank account for ${row.vendorName}`}
              deleteTitle={`Delete bank account for ${row.vendorName}`}
            />
          );
        },
      }),
    ],
    [navigate, onDeleteBank]
  );

  return {
    columns,
    filteredData,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    vendorFilter,
    setVendorFilter,
    accountTypeFilter,
    setAccountTypeFilter,
    sorting,
    setSorting,
    columnSizing,
    setColumnSizing,
    pagination,
    setPagination,
    resetFilters,
    maskAccountNumber,
  };
}
