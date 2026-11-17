/**
 * SalesOrdersPage.jsx — Order Confirmations (Sales Orders) list page.
 *
 * Route: /sales-orders
 * Aligned with Frontend-API-Guide.md §5.4g.
 */

import { useState, useMemo } from 'react';
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
  IconDownload,
  IconSalesOrder,
} from '../../constants/icons';
import {
  PageHeader,
  Button,
  DataTable,
  TableToolbar,
  TableActions,
  Badge,
  SearchableSelect,
  DatePicker,
} from '../../components/ui';
import { useSalesOrdersContext } from '../../context/SalesOrdersContext';
import {
  ORDER_STATUS_FILTER_OPTIONS,
  formatCurrency,
  getOrderStatusBadgeVariant,
} from '../../mocks/salesOrders';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const { salesOrders = [] } = useSalesOrdersContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilter !== 'ALL' || fromDate || toDate
  );

  function handleResetFilters() {
    setSearchQuery('');
    setStatusFilter('ALL');
    setFromDate('');
    setToDate('');
  }

  const filteredData = useMemo(() => {
    return salesOrders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      if (fromDate && order.orderConfirmationDate && order.orderConfirmationDate < fromDate) {
        return false;
      }

      if (toDate && order.orderConfirmationDate && order.orderConfirmationDate > toDate) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const combined = [
          order.orderConfirmationNo,
          order.quotationNo,
          order.inquiryNo,
          order.clientName,
          order.clientPoNo,
          order.contactPerson,
          order.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!combined.includes(q)) return false;
      }

      return true;
    });
  }, [salesOrders, statusFilter, fromDate, toDate, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('orderConfirmationNo', {
        header: 'Order Confirmation',
        size: 165,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <Link
                to={`/sales-orders/${row.id}`}
                className="font-mono font-bold text-primary hover:underline text-xs tracking-wide block"
              >
                {info.getValue()}
              </Link>
              <span className="font-mono text-2xs text-text-muted">
                {row.orderConfirmationDate ? formatDate(row.orderConfirmationDate) : '—'}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor('clientName', {
        header: 'Client / Quotation',
        size: 230,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div
                className="font-semibold text-heading text-xs truncate max-w-[210px]"
                title={info.getValue()}
              >
                {info.getValue()}
              </div>
              <div className="font-mono text-2xs text-text-muted flex items-center gap-1.5">
                {row.quotationId ? (
                  <Link
                    to={`/quotations/${row.quotationId}`}
                    className="text-primary hover:underline"
                  >
                    {row.quotationNo}
                  </Link>
                ) : (
                  <Badge variant="neutral" size="xs">
                    Direct Order
                  </Badge>
                )}
                {row.inquiryNo && <span>· {row.inquiryNo}</span>}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('clientPoNo', {
        header: 'Client PO',
        size: 155,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-mono font-semibold text-xs text-heading">
                {info.getValue() || '—'}
              </div>
              {row.clientPoDate && (
                <div className="font-mono text-2xs text-text-muted">
                  {formatDate(row.clientPoDate)}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('expectedDeliveryDate', {
        header: 'Expected Delivery',
        size: 140,
        cell: (info) => (
          <span className="font-mono text-xs text-text-muted">
            {info.getValue() ? formatDate(info.getValue()) : '—'}
          </span>
        ),
      }),
      columnHelper.accessor('grandTotal', {
        header: () => <span className="w-full text-right block">Total</span>,
        size: 140,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-right font-mono font-semibold text-xs text-heading">
              {formatCurrency(info.getValue(), row.currency)}
            </div>
          );
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        size: 120,
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge variant={getOrderStatusBadgeVariant(status)} size="sm">
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        size: 110,
        enableResizing: false,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <TableActions
              onView={() => navigate(`/sales-orders/${order.id}`)}
              onEdit={
                order.isEditable
                  ? () => navigate(`/sales-orders/${order.id}/edit`)
                  : undefined
              }
              viewTitle="View Sales Order"
              editTitle="Edit Draft Sales Order"
              extraActions={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                  title="Download Order Confirmation PDF"
                >
                  <IconDownload size={15} />
                </button>
              }
            />
          );
        },
      }),
    ],
    [navigate]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
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
      <PageHeader
        title="Sales Orders"
        subtitle="Order confirmations generated from Confirmed quotations after receiving client POs."
        icon={<IconSalesOrder size={24} className="text-primary" />}
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/sales-orders/new')}
            icon={IconAdd}
          >
            New Sales Order
          </Button>
        }
      />

      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search OC no, PO no, quotation, client..."
        hasActiveFilters={hasActiveFilters}
        onReset={handleResetFilters}
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="sales-order-status-filter"
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            options={ORDER_STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-44 sm:min-w-[170px]">
          <DatePicker
            id="sales-order-from-date"
            size="sm"
            placeholder="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-44 sm:min-w-[170px]">
          <DatePicker
            id="sales-order-to-date"
            size="sm"
            placeholder="To date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </TableToolbar>

      <DataTable
        table={table}
        columns={columns}
        totalCount={filteredData.length}
        entityName="sales orders"
        emptyTitle="No sales orders found"
        emptyDescription={
          hasActiveFilters
            ? 'No sales orders match your active search and filter criteria.'
            : 'No sales orders have been created yet.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-primary"
            >
              Clear filters
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate('/sales-orders/new')}
              className="text-xs"
            >
              <IconAdd size={14} className="mr-1.5" />
              New Sales Order
            </Button>
          )
        }
        renderMobileCard={(row) => {
          const order = row.original;
          return (
            <div
              key={order.id}
              className="bg-surface rounded-xl border border-border p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to={`/sales-orders/${order.id}`}
                    className="font-mono text-xs font-bold text-primary hover:underline"
                  >
                    {order.orderConfirmationNo}
                  </Link>
                  <div className="text-sm font-semibold text-heading mt-0.5">
                    {order.clientName}
                  </div>
                </div>
                <Badge variant={getOrderStatusBadgeVariant(order.status)} size="sm">
                  {order.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-text-muted pt-2 border-t border-border/60">
                <div>
                  <span className="block text-3xs uppercase tracking-wider">Quotation</span>
                  <span className="font-mono text-heading">{order.quotationNo}</span>
                </div>
                <div>
                  <span className="block text-3xs uppercase tracking-wider">Client PO</span>
                  <span className="font-mono text-heading">{order.clientPoNo || '—'}</span>
                </div>
                <div>
                  <span className="block text-3xs uppercase tracking-wider">Order Date</span>
                  <span className="font-mono">
                    {order.orderConfirmationDate ? formatDate(order.orderConfirmationDate) : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-3xs uppercase tracking-wider">Total</span>
                  <span className="font-mono font-semibold text-heading">
                    {formatCurrency(order.grandTotal, order.currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-border/60">
                <TableActions
                  onView={() => navigate(`/sales-orders/${order.id}`)}
                  onEdit={
                    order.isEditable
                      ? () => navigate(`/sales-orders/${order.id}/edit`)
                      : undefined
                  }
                  viewTitle="View Sales Order"
                  editTitle="Edit Draft Sales Order"
                />
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

