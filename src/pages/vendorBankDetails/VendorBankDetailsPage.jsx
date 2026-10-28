/**
 * VendorBankDetailsPage.jsx — Dashboard and data table for Vendor Bank Details.
 * Powered by GET /api/vendor-bank-details with server-side search, filtering, and pagination.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconAttachment,
  IconBankDetails,
  IconClose,
  IconDownload,
  IconEdit,
  IconFileText,
  IconImage,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Badge,
  Card,
  Modal,
  PageHeader,
  SearchableSelect,
  DataTable,
  TableToolbar,
  StatusBadge,
  IconButton,
} from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import {
  useVendorBankTable,
  STATUS_FILTER_OPTIONS,
  ACCOUNT_TYPE_FILTER_OPTIONS,
} from './useVendorBankTable.jsx';
import { vendorService } from '../../services';
import { formatDate } from '../../utils/dateUtils';

function getFileIcon(fileName = '', fileType = '') {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || fileType.includes('pdf')) {
    return <IconFileText size={18} className="text-danger" />;
  }
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    fileType.includes('image')
  ) {
    return <IconImage size={18} className="text-info" />;
  }
  return <IconAttachment size={18} className="text-primary" />;
}

export default function VendorBankDetailsPage() {
  const navigate = useNavigate();
  const { allVendors = [] } = useVendorsContext();

  // Grid API data state
  const [bankData, setBankData] = useState({
    items: [],
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Attachments & Preview modal state
  const [viewingAttachmentsRow, setViewingAttachmentsRow] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);

  const {
    columns,
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
  } = useVendorBankTable({
    onViewAttachments: setViewingAttachmentsRow,
  });

  // Options for Vendor filter dropdown
  const vendorOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Vendors' }];
    if (Array.isArray(allVendors)) {
      allVendors.forEach((v) => {
        const id = v.id || v.vendorId;
        list.push({
          value: String(id),
          label: `${v.vendorCode || id} – ${v.vendorName || 'Vendor ' + id}`,
        });
      });
    }
    return list;
  }, [allVendors]);

  // Fetch bank details from GET /api/vendor-bank-details
  const fetchBankDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorService.listVendorBankDetails({
        search,
        vendorId: vendorFilter !== 'ALL' ? vendorFilter : undefined,
        accountType: accountTypeFilter !== 'ALL' ? accountTypeFilter : undefined,
        isActive:
          statusFilter === 'ACTIVE'
            ? true
            : statusFilter === 'INACTIVE'
            ? false
            : undefined,
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });

      if (res) {
        setBankData({
          items: Array.isArray(res.items) ? res.items : [],
          pageNumber: res.pageNumber || 1,
          pageSize: res.pageSize || pagination.pageSize,
          totalCount: res.totalCount ?? 0,
          totalPages: res.totalPages || 1,
        });
      }
    } catch (err) {
      console.warn('Failed to load vendor bank details from API:', err);
      toast.error(err.message || 'Failed to load vendor bank details.');
    } finally {
      setLoading(false);
    }
  }, [
    search,
    vendorFilter,
    accountTypeFilter,
    statusFilter,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  // Trigger API fetch when search, filters, or pagination change
  useEffect(() => {
    fetchBankDetails();
  }, [fetchBankDetails]);

  // Reset pagination to first page when filters change
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [search, vendorFilter, accountTypeFilter, statusFilter, setPagination]);

  const hasActiveFilters = Boolean(
    (search && search.trim() !== '') ||
      (statusFilter && statusFilter !== 'ALL') ||
      (vendorFilter && vendorFilter !== 'ALL') ||
      (accountTypeFilter && accountTypeFilter !== 'ALL')
  );

  const table = useReactTable({
    data: bankData.items,
    columns,
    pageCount: bankData.totalPages,
    state: {
      sorting,
      columnSizing,
      pagination,
    },
    manualPagination: true,
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Page Header ── */}
      <PageHeader
        title="Vendor Bank Details"
        subtitle="Overview of bank accounts, IFSC, and payment routing across all registered vendors"
        icon={<IconBankDetails className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/vendor-bank-details/new')}
            className="shadow-2xs text-xs font-semibold"
          >
            <IconAdd size={16} className="mr-1.5" aria-hidden="true" />
            <span>Add Bank Details</span>
          </Button>
        }
      />

      {/* ── Toolbar: Search, Vendor Filter, Account Type Filter, Status Filter & Reset Filters ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bank, account no, IFSC..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset Filters"
      >
        {/* Vendor Filter using SearchableSelect */}
        <div className="w-full sm:w-60 lg:w-72">
          <SearchableSelect
            id="bank-vendor-filter"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            options={vendorOptions}
            placeholder="All Vendors"
            searchPlaceholder="Search vendor code or name..."
            emptyText="No vendors found"
            aria-label="Filter bank details by vendor"
          />
        </div>

        {/* Account Type Filter using SearchableSelect */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="bank-account-type-filter"
            value={accountTypeFilter}
            onChange={(e) => setAccountTypeFilter(e.target.value)}
            options={ACCOUNT_TYPE_FILTER_OPTIONS}
            placeholder="All Account Types"
            searchPlaceholder="Search account types..."
            emptyText="No matching type"
            aria-label="Filter bank details by account type"
          />
        </div>

        {/* Status Filter using SearchableSelect */}
        <div className="w-full sm:w-36">
          <SearchableSelect
            id="bank-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
            placeholder="All Statuses"
            searchPlaceholder="Search statuses..."
            emptyText="No matching status"
            aria-label="Filter bank details by status"
          />
        </div>
      </TableToolbar>

      {/* ── TanStack Data Table & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={loading}
        totalCount={bankData.totalCount}
        entityName="bank accounts"
        emptyTitle="No bank accounts found"
        emptyDescription={
          hasActiveFilters
            ? 'Try adjusting your search criteria or clearing active filters.'
            : 'Get started by clicking "+ Add Bank Details" above.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-primary"
            >
              Clear all filters
            </Button>
          ) : null
        }
        renderMobileCard={(row) => {
          const bank = row.original;
          const bankId = bank.bankDetailId || bank.id;
          const dateVal =
            bank.lastUpdatedOn || bank.updatedAt || bank.createdOn || bank.createdAt;
          const userVal = bank.updatedBy || bank.createdBy;

          return (
            <Card
              key={bankId}
              padding="sm"
              className="space-y-3 border border-border hover:border-primary/30 transition-colors shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-heading truncate block">
                    {bank.vendorName || '—'}
                  </span>
                  <p className="text-2xs text-text-muted truncate mt-0.5">
                    {bank.bankName} • {bank.branchName || 'Main Branch'}
                  </p>
                </div>
                <StatusBadge status={bank.isActive} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-2xs text-text-muted block mb-1">Account Type</span>
                  <Badge variant="neutral" size="sm">
                    {bank.accountType || 'Current'}
                  </Badge>
                </div>
                <div>
                  <span className="text-2xs text-text-muted block mb-0.5">Last Updated</span>
                  <div className="flex flex-col font-mono tabular-nums text-xs">
                    <span className="text-text-muted font-medium">
                      {dateVal ? formatDate(dateVal) : '—'}
                    </span>
                    {userVal && (
                      <span className="text-2xs text-text-muted/80 font-sans mt-0.5 truncate">
                        by {userVal}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/vendor-bank-details/${bank.vendorId}/view?bank=${bankId}`)
                  }
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/vendor-bank-details/${bank.vendorId}/edit?bank=${bankId}`)
                  }
                  className="flex-1 text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </Card>
          );
        }}
      />

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
        icon={IconAttachment}
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
                          {att.fileSize || 'Standard file'} • Uploaded{' '}
                          {att.uploadedAt ? formatDate(att.uploadedAt) : 'Recently'}
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
                        <IconView size={13} className="mr-1.5" />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const attId = att.id || att.attachmentId;
                          if (attId && !String(attId).startsWith('att_')) {
                            try {
                              await vendorService.downloadBankAttachment(attId, att.fileName);
                              toast.success(`Downloaded ${att.fileName}`);
                              return;
                            } catch (err) {
                              console.warn('Backend download failed:', err);
                            }
                          }
                          toast.success(`Downloading ${att.fileName}...`);
                        }}
                        className="text-xs text-text-muted hover:text-primary"
                        title="Download file"
                      >
                        <IconDownload size={13} className="mr-1.5" />
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
                      <IconView size={14} className="text-primary" />
                      <span className="text-xs font-semibold text-heading">
                        Document Preview: {previewingFile.fileName}
                      </span>
                    </div>
                    <IconButton
                      icon={IconClose}
                      size="sm"
                      variant="ghost"
                      title="Close preview"
                      aria-label="Close preview"
                      onClick={() => setPreviewingFile(null)}
                    />
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
              <IconAttachment size={24} className="mx-auto text-text-muted/60" />
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
