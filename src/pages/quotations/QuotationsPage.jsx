/**
 * QuotationsPage.jsx — Quotation Management Dashboard for MicroFlat ERP.
 *
 * Route: /quotations
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconView,
  IconEdit,
  IconDownload,
  IconQuotation,
  IconSearch,
} from '../../constants/icons';
import {
  PageHeader,
  Button,
  DataTable,
  TableToolbar,
  Badge,
  SearchableSelect,
} from '../../components/ui';
import { useQuotationsContext } from '../../context/QuotationsContext';
import { triggerPdfDownload } from '../../utils/fileHelpers';
import { formatCurrency } from '../../mocks/quotations';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Sent', label: 'Sent' },
  { value: 'In Negotiation', label: 'In Negotiation' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Lost', label: 'Lost' },
  { value: 'PO Received', label: 'PO Received' },
];

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { quotations = [], refreshQuotations, isLoading } = useQuotationsContext();

  useEffect(() => {
    refreshQuotations?.();
  }, [refreshQuotations]);

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered quotations
  const filteredData = useMemo(() => {
    return quotations.filter((q) => {
      // Status filter
      if (activeFilter === 'PO Received') {
        if (!q.poReceived && q.status !== 'PO Received') return false;
      } else if (activeFilter !== 'All') {
        if (q.status !== activeFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const combined = `${q.quotationNo} ${q.inquiryNo} ${q.clientName} ${q.contactPerson} ${q.status}`.toLowerCase();
        if (!combined.includes(query)) return false;
      }

      return true;
    });
  }, [quotations, activeFilter, searchQuery]);

  // TanStack columns definition
  const columns = useMemo(
    () => [
      columnHelper.accessor('quotationNo', {
        header: 'Quotation No',
        cell: (info) => {
          const row = info.row.original;
          const val = info.getValue();
          const displayNo =
            typeof val === 'object' && val !== null
              ? (val.documentNumber || val.nextNumber || val.seriesNumber || String(row.id || ''))
              : String(val || row.id || '');
          const rowId =
            typeof row.id === 'object' && row.id !== null
              ? (row.id.documentNumber || row.id.id || displayNo)
              : String(row.id || displayNo);

          return (
            <Link
              to={`/quotations/${rowId}`}
              className="font-mono font-bold text-primary hover:underline text-xs tracking-wide"
            >
              {displayNo}
            </Link>
          );
        },
      }),
      columnHelper.accessor('clientName', {
        header: 'Client / Inquiry',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-semibold text-heading text-xs truncate max-w-[200px]" title={info.getValue()}>
                {info.getValue()}
              </div>
              <div className="font-mono text-2xs text-text-muted">
                {row.inquiryNo}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('currentRevision', {
        header: 'Latest Revision',
        cell: (info) => {
          const row = info.row.original;
          const currentRev = row.revisions?.[row.currentRevision] || row.revisions?.[row.revisions.length - 1];
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-mono font-semibold">Rev {info.getValue()}</span>
              {currentRev && (
                <Badge variant={currentRev.status === 'Sent' ? 'info' : 'neutral'} size="sm">
                  {currentRev.status}
                </Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => {
        const currentRev = row.revisions?.[row.currentRevision] || row.revisions?.[row.revisions.length - 1];
        return Number(currentRev?.grandTotal ?? row.totalAmount ?? row.grandTotal) || 0;
      }, {
        id: 'grandTotal',
        header: () => <span className="w-full text-right block">Total</span>,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-right font-mono font-semibold text-xs text-heading">
              {formatCurrency(info.getValue(), row.currency)}
            </div>
          );
        },
      }),
      columnHelper.accessor('validUntil', {
        header: 'Valid Until',
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted">
            {info.getValue() ? formatDate(info.getValue()) : '—'}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const row = info.row.original;
          const status = info.getValue();
          const isPo = Boolean(row.poReceived || status === 'PO Received');
          let variant = 'neutral';
          if (isPo || status === 'Confirmed') variant = 'success';
          else if (status === 'Sent') variant = 'info';
          else if (status === 'In Negotiation') variant = 'warning';
          else if (status === 'Lost') variant = 'danger';

          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={variant} size="sm">
                {isPo ? 'PO Received' : status}
              </Badge>
            </div>
          );
        },
      }),
      columnHelper.accessor('lastUpdatedBy', {
        header: 'Last Updated',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-2xs text-text-muted">
              <div>{info.getValue() || 'Admin'}</div>
              <div className="font-mono">{row.lastUpdatedAt ? formatDate(row.lastUpdatedAt) : '—'}</div>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="w-full text-right block">Actions</span>,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              {/* Quotation PDF download hidden until backend provides PDF generation endpoint */}
              {/* <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerPdfDownload(
                    `Quotation-${row.quotationNo || row.id}.pdf`,
                    {
                      title: `Commercial Quotation ${row.quotationNo || row.id}`,
                      documentType: 'Official Quotation',
                      fileName: `Quotation-${row.quotationNo || row.id}.pdf`,
                      clientName: row.clientName,
                      quotationNo: row.quotationNo || row.id,
                      totalAmount: `₹${(Number(row.totalAmount || row.grandTotal) || 0).toLocaleString('en-IN')}`,
                      uploadedAt: row.lastUpdatedAt || new Date().toISOString().split('T')[0],
                      remarks: `Client: ${row.clientName || 'Client'} | Status: ${row.status || 'Active'}`,
                    }
                  );
                }}
                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                title="Download PDF"
              >
                <IconDownload size={15} />
              </button> */}
              <button
                type="button"
                onClick={() => navigate(`/quotations/${row.id}`)}
                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                title="View Quotation"
              >
                <IconView size={15} />
              </button>
              {!(row.poReceived || row.status === 'PO Received') ? (
                <button
                  type="button"
                  onClick={() => navigate(`/quotations/${row.id}/new-revision`)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                  title="Create New Revision"
                >
                  <IconEdit size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="p-1.5 rounded-lg text-text-muted/30 cursor-not-allowed"
                  title="Customer PO Received: Revisions are locked."
                >
                  <IconEdit size={15} />
                </button>
              )}
            </div>
          );
        },
      }),
    ],
    [navigate]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quotations"
        subtitle="One quotation per inquiry. Every change is tracked as a new revision."
        icon={<IconQuotation size={24} className="text-primary" />}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/quotations/new')}
            icon={<IconAdd size={16} />}
          >
            New Quotation
          </Button>
        }
      />

      {/* Table Toolbar with Search and Status Filter */}
      <TableToolbar
        searchPlaceholder="Search quotation no, client, inquiry, contact..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredData.length}
      >
        <div className="w-full sm:w-48">
          <SearchableSelect
            id="filter-status"
            placeholder="All Statuses"
            searchPlaceholder="Search status..."
            options={STATUS_FILTER_OPTIONS}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* Data Table */}
      <DataTable
        table={table}
        emptyMessage="No quotations found matching your criteria."
      />
    </div>
  );
}
