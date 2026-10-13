/**
 * VendorBankDetailsPage.jsx — Dashboard and data table for Vendor Bank Details.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Landmark,
  Pencil,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  Button,
  Input,
  Badge,
  Card,
  Modal,
  TableContainer,
  Th,
  Td,
  PageHeader,
} from '../../components/ui';
import { useVendorBankDetails } from '../../context/VendorBankDetailsContext';
import { useVendorBankTable } from './useVendorBankTable.jsx';
import { formatDate } from '../../utils/dateUtils';

function getFileIcon(fileName = '', fileType = '') {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || fileType.includes('pdf')) {
    return <FileText size={18} className="text-danger" />;
  }
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    fileType.includes('image')
  ) {
    return <ImageIcon size={18} className="text-info" />;
  }
  return <Paperclip size={18} className="text-primary" />;
}

export default function VendorBankDetailsPage() {
  const navigate = useNavigate();
  const { getAllBanks, toggleBankActive } = useVendorBankDetails();

  // Simulated initial loading delay
  const [loading, setLoading] = useState(true);
  const [viewingAttachmentsRow, setViewingAttachmentsRow] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const allBanks = useMemo(() => getAllBanks(), [getAllBanks]);

  const {
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
  } = useVendorBankTable({
    allBanks,
    toggleBankActive,
    onViewAttachments: setViewingAttachmentsRow,
  });

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== 'ALL');

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const totalRows = filteredData.length;
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const pageCount = table.getPageCount();
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Page Header ── */}
      <PageHeader
        title="Vendor Bank Details"
        subtitle="Overview of bank accounts, IFSC, and payment routing across all registered vendors"
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/vendor-bank-details/new')}
            className="shadow-2xs text-xs font-semibold"
          >
            <Plus size={16} className="mr-1.5" aria-hidden="true" />
            <span>Add Bank Details</span>
          </Button>
        }
      />

      {/* ── Toolbar: Search & Status Filters ── */}
      <Card padding="sm" className="shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="w-full md:w-96">
            <Input
              id="bank-search-input"
              type="search"
              placeholder="Search by vendor, bank, account no, IFSC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} className="text-text-muted" aria-hidden="true" />}
              aria-label="Search bank details"
            />
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Accounts' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'INACTIVE', label: 'Inactive' },
            ].map((chip) => {
              const isSelected = statusFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={[
                    'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors select-none cursor-pointer whitespace-nowrap',
                    isSelected
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-surface text-text-muted hover:text-heading hover:bg-surface/80 border border-border',
                  ].join(' ')}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── DESKTOP VIEW (>= md): TanStack Table with Resizing ── */}
      <div className="hidden md:block">
        <Card padding="none" className="overflow-hidden border border-border bg-bg shadow-2xs">
          <TableContainer tableClassName="w-full text-left border-collapse text-xs table-fixed">
            <thead className="bg-surface/90 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <Th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        isResizing={header.column.getIsResizing()}
                        resizeHandler={
                          header.column.getCanResize()
                            ? header.getResizeHandler()
                            : undefined
                        }
                        className={`relative py-3.5 px-4 select-none bg-surface ${
                          canSort ? 'cursor-pointer hover:bg-surface/80' : ''
                        }`}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="group/th-btn flex items-center gap-1.5 w-full text-left select-none cursor-pointer hover:text-heading transition-colors"
                          >
                            <span className="truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>

                            <span className="shrink-0 ml-1 inline-flex items-center">
                              {sorted === 'asc' ? (
                                <ChevronUp
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : sorted === 'desc' ? (
                                <ChevronDown
                                  size={14}
                                  className="text-primary stroke-[2.5]"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="flex flex-col items-center -space-y-1.5 opacity-40 group-hover/th-btn:opacity-90 group-hover/th-btn:text-heading transition-all">
                                  <ChevronUp size={11} strokeWidth={2.5} />
                                  <ChevronDown size={11} strokeWidth={2.5} />
                                </span>
                              )}
                            </span>
                          </button>
                        ) : (
                          <div
                            className={`select-none ${
                              header.id === 'actions' ? 'text-right w-full pr-1' : ''
                            }`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </Th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-border bg-bg">
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={`skel-${rIdx}`} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={`skel-cell-${cIdx}`} className="py-3.5 px-4">
                        <div className="h-4 bg-surface rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-text-muted">
                        <SearchX size={20} />
                      </div>
                      <p className="text-sm font-semibold text-heading">No bank accounts found</p>
                      <p className="text-xs text-text-muted max-w-sm">
                        {hasActiveFilters
                          ? 'Try adjusting your search criteria or clearing active filters.'
                          : 'Get started by clicking "+ Add Bank Details" above.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-2 text-xs text-primary"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-surface/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="py-3 px-4"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </Td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </TableContainer>

          {/* ── Table Pagination Bar ── */}
          {filteredData.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface/30 text-xs text-text-muted">
              <div>
                Showing{' '}
                <strong className="text-heading font-medium">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-heading font-medium">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    filteredData.length
                  )}
                </strong>{' '}
                of <strong className="text-heading font-medium">{filteredData.length}</strong> bank accounts
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="h-7 px-2"
                >
                  <ChevronLeft size={14} className="mr-0.5" />
                  Previous
                </Button>

                <span className="font-mono tabular-nums px-2">
                  Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="h-7 px-2"
                >
                  Next
                  <ChevronRight size={14} className="ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── MOBILE VIEW (< md): Card List ── */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={`m-skel-${idx}`} padding="sm" className="animate-pulse space-y-2">
              <div className="h-4 bg-surface rounded w-1/2" />
              <div className="h-3 bg-surface rounded w-3/4" />
              <div className="h-3 bg-surface rounded w-1/3" />
            </Card>
          ))
        ) : filteredData.length === 0 ? (
          <Card padding="lg" className="text-center py-12 space-y-3">
            <Landmark size={28} className="mx-auto text-text-muted/60" />
            <h4 className="text-sm font-semibold text-heading">No bank accounts found</h4>
            <p className="text-xs text-text-muted">
              {hasActiveFilters
                ? 'Try changing your search keywords or filter.'
                : 'Get started by registering a bank account for a vendor.'}
            </p>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-primary">
                Clear filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/vendor-bank-details/new')}
                className="shadow-2xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus size={14} className="mr-1.5" />
                <span>Add Bank Account</span>
              </Button>
            )}
          </Card>
        ) : (
          filteredData.map((bank) => {
            const bankId = bank.bankDetailId || bank.id;
            return (
              <Card
                key={bankId}
                padding="sm"
                className="space-y-3 border border-border hover:border-primary/30 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono tabular-nums font-semibold text-2xs text-heading bg-surface border border-border px-1.5 py-0.5 rounded shadow-2xs">
                        {bank.vendorCode}
                      </span>
                      <span className="font-semibold text-xs text-heading truncate">
                        {bank.vendorName}
                      </span>
                    </div>
                    <p className="text-2xs text-text-muted truncate mt-0.5">
                      {bank.bankName} • {bank.branchName || 'Main Branch'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingAttachmentsRow(bank)}
                      className={`h-8 w-8 ${
                        Array.isArray(bank.attachments) && bank.attachments.length > 0
                          ? 'text-primary hover:bg-primary/10'
                          : 'text-text-muted/40 hover:bg-surface'
                      }`}
                      title={
                        Array.isArray(bank.attachments) && bank.attachments.length > 0
                          ? `View ${bank.attachments.length} attachment(s)`
                          : 'No attachments'
                      }
                      aria-label="View attachments"
                    >
                      <Paperclip size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/vendor-bank-details/${bank.vendorId}/edit?bank=${bankId}`)}
                      className="h-8 w-8 text-text-muted hover:text-primary"
                      title="Edit account"
                      aria-label={`Edit ${bank.bankName} account for ${bank.vendorName}`}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-2xs text-text-muted block">Account Number</span>
                    <span className="font-mono tabular-nums font-semibold text-heading">
                      {maskAccountNumber(bank.accountNumber)}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-text-muted block">Account Type</span>
                    <Badge variant="neutral" size="sm">
                      {bank.accountType}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-2xs text-text-muted block">IFSC / SWIFT</span>
                    <span className="font-mono tabular-nums text-xs text-text">
                      {bank.ifscCode || bank.swiftCode || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-text-muted block">Account Holder</span>
                    <span className="text-xs text-text truncate block">
                      {bank.accountHolderName || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted">Files:</span>
                    {Array.isArray(bank.attachments) && bank.attachments.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setViewingAttachmentsRow(bank)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 cursor-pointer"
                      >
                        <Paperclip size={10} /> {bank.attachments.length} View
                      </button>
                    ) : (
                      <span className="text-text-muted font-mono">None</span>
                    )}
                  </div>
                  <Badge variant={bank.isActive ? 'active' : 'inactive'} size="sm">
                    {bank.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── View Attachments Modal ── */}
      <Modal
        isOpen={Boolean(viewingAttachmentsRow)}
        onClose={() => {
          setViewingAttachmentsRow(null);
          setPreviewingFile(null);
        }}
        title="Bank Account Attachments"
        subtitle={
          viewingAttachmentsRow
            ? `${viewingAttachmentsRow.bankName} • Account •••• ${String(
                viewingAttachmentsRow.accountNumber || ''
              ).slice(-4)}`
            : ''
        }
        icon={Paperclip}
        size="lg"
      >
        <div className="space-y-4">
          {viewingAttachmentsRow &&
          Array.isArray(viewingAttachmentsRow.attachments) &&
          viewingAttachmentsRow.attachments.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted pb-2 border-b border-border">
                <span className="font-medium text-heading">
                  Attached Documents ({viewingAttachmentsRow.attachments.length})
                </span>
                <span className="text-2xs font-mono">
                  {viewingAttachmentsRow.accountHolderName || viewingAttachmentsRow.vendorName}
                </span>
              </div>

              <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-surface/30">
                {viewingAttachmentsRow.attachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center shrink-0 shadow-2xs">
                        {getFileIcon(att.fileName, att.fileType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-heading">
                            {att.documentName || 'Bank Proof'}
                          </span>
                          <Badge variant="neutral" size="sm" className="font-mono text-2xs">
                            {att.fileName}
                          </Badge>
                        </div>
                        <p className="text-2xs text-text-muted mt-0.5 font-mono">
                          {att.fileSize || 'Standard file'} • Uploaded {att.uploadedAt || 'Recently'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          toast.success(`Opening preview for ${att.fileName}`);
                          setPreviewingFile(att);
                        }}
                        className="text-xs font-medium"
                      >
                        <Eye size={13} className="mr-1.5" />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast.success(`Downloading ${att.fileName}...`);
                        }}
                        className="text-xs text-text-muted hover:text-primary"
                        title="Download file"
                      >
                        <Download size={13} className="mr-1.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* In-modal preview box if user clicks Preview on a file */}
              {previewingFile && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 mt-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye size={14} className="text-primary" />
                      <span className="text-xs font-semibold text-heading">
                        Document Preview: {previewingFile.fileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewingFile(null)}
                      className="p-1 text-text-muted hover:text-heading rounded cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="p-6 rounded-lg bg-bg border border-border text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {getFileIcon(previewingFile.fileName, previewingFile.fileType)}
                    </div>
                    <p className="text-xs font-medium text-heading">
                      {previewingFile.documentName}
                    </p>
                    <p className="text-2xs text-text-muted font-mono">
                      {previewingFile.fileName} ({previewingFile.fileSize || 'Verified'})
                    </p>
                    <div className="pt-2">
                      <Badge variant="approved" size="sm">
                        Verified Banking Document
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2 border border-dashed border-border rounded-xl bg-surface/30">
              <Paperclip size={24} className="mx-auto text-text-muted/60" />
              <p className="text-xs font-semibold text-heading">No attachments found</p>
              <p className="text-2xs text-text-muted max-w-sm mx-auto">
                No bank proof documents have been attached to this bank account yet.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setViewingAttachmentsRow(null);
                setPreviewingFile(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
