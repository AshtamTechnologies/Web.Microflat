/**
 * useVendorBankTable.jsx — Custom hook managing columns, sorting, filtering, and handlers for VendorBankDetailsPage.
 */

import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Paperclip } from 'lucide-react';
import { Badge, Button } from '../../components/ui';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

export function useVendorBankTable({ allBanks = [], toggleBankActive, onViewAttachments }) {
  const navigate = useNavigate();

  // Search and Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Filtered dataset
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allBanks.filter((bank) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !bank.isActive) return false;
      if (statusFilter === 'INACTIVE' && bank.isActive) return false;

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
  }, [allBanks, search, statusFilter]);

  // Mask account number helper: "•••• 4821"
  const maskAccountNumber = (num) => {
    if (!num) return '•••• —';
    const str = String(num);
    const last4 = str.slice(-4);
    return `•••• ${last4}`;
  };

  // Columns definition
  const columns = useMemo(
    () => [
      /* 1. Vendor (code in mono + name) */
      columnHelper.accessor('vendorName', {
        id: 'vendor',
        header: 'VENDOR',
        minSize: 180,
        size: 220,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col min-w-0 py-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono tabular-nums font-semibold text-2xs text-heading bg-surface border border-border px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                  {row.vendorCode}
                </span>
                <span className="font-semibold text-xs text-heading truncate" title={row.vendorName}>
                  {row.vendorName}
                </span>
              </div>
            </div>
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

      /* 3. Account Holder */
      columnHelper.accessor('accountHolderName', {
        id: 'accountHolder',
        header: 'ACCOUNT HOLDER',
        minSize: 150,
        size: 190,
        cell: (info) => (
          <span className="text-xs text-text truncate block" title={info.getValue()}>
            {info.getValue() || '—'}
          </span>
        ),
      }),

      /* 4. Account No (masked "•••• 4821", mono) */
      columnHelper.accessor('accountNumber', {
        id: 'accountNumber',
        header: 'ACCOUNT NO',
        minSize: 130,
        size: 150,
        cell: (info) => (
          <span className="font-mono tabular-nums text-xs font-medium text-heading">
            {maskAccountNumber(info.getValue())}
          </span>
        ),
      }),

      /* 5. IFSC / SWIFT (mono) */
      columnHelper.accessor('ifscCode', {
        id: 'ifscOrSwift',
        header: 'IFSC / SWIFT',
        minSize: 130,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col font-mono tabular-nums text-xs">
              {row.ifscCode ? (
                <span className="font-medium text-heading">{row.ifscCode}</span>
              ) : null}
              {row.swiftCode ? (
                <span className="text-2xs text-text-muted">{row.swiftCode}</span>
              ) : null}
              {!row.ifscCode && !row.swiftCode ? (
                <span className="text-text-muted text-xs">—</span>
              ) : null}
            </div>
          );
        },
      }),

      /* 6. Type (neutral Badge) */
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

      /* 7. Attachments */
      columnHelper.accessor('attachments', {
        id: 'attachments',
        header: 'ATTACHMENTS',
        minSize: 110,
        size: 130,
        cell: (info) => {
          const row = info.row.original;
          const atts = Array.isArray(row.attachments) ? row.attachments : [];
          if (atts.length === 0) {
            return <span className="text-2xs text-text-muted">—</span>;
          }
          return (
            <button
              type="button"
              onClick={() => onViewAttachments && onViewAttachments(row)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 transition-colors cursor-pointer shadow-2xs"
              title={`View ${atts.length} attachment(s)`}
            >
              <Paperclip size={11} />
              <span>{atts.length} File{atts.length > 1 ? 's' : ''}</span>
            </button>
          );
        },
      }),

      /* 8. Status Badge */
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

      /* 9. Last Updated (mono date + by <name> muted) */
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

      /* 10. Actions (Attachment view & Edit) */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 90,
        size: 110,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const bankId = row.bankDetailId || row.id;
          const hasAtts = Array.isArray(row.attachments) && row.attachments.length > 0;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewAttachments && onViewAttachments(row)}
                title={
                  hasAtts
                    ? `View ${row.attachments.length} attachment(s)`
                    : 'View attachments (none)'
                }
                className={`h-8 w-8 inline-flex items-center justify-center rounded-lg cursor-pointer ${
                  hasAtts ? 'text-primary hover:bg-primary/10' : 'text-text-muted/40 hover:bg-surface'
                }`}
                aria-label="View attachments"
              >
                <Paperclip size={14} aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/vendor-bank-details/${row.vendorId}/edit?bank=${bankId}`)}
                title="Edit bank account"
                className="text-text-muted hover:text-primary hover:bg-surface h-8 w-8 inline-flex items-center justify-center rounded-lg cursor-pointer"
                aria-label={`Edit bank account for ${row.vendorName}`}
              >
                <Pencil size={14} aria-hidden="true" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [navigate, toggleBankActive, onViewAttachments]
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
    maskAccountNumber,
  };
}
