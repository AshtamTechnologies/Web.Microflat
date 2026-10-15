/**
 * VendorBankDetailsViewPage.jsx — Read-only Master View for Vendor Bank Details.
 *
 * Route: /vendor-bank-details/:vendorId/view or /vendor-bank-details/:vendorId
 *
 * Designed to be consistent with VendorEffectiveDatesPage:
 *   - Executive PageHeader with vendor code badge, status pill, approval badge, and quick actions
 *   - Quick metrics counter (Total accounts, Active accounts, Verified attachments)
 *   - Inactive vendor alert banner (if vendor is inactive)
 *   - Resizable TanStack Table Grid & Mobile Card list of configured bank accounts (instant row selection)
 *   - Active selection context banner & detail panel card for the selected bank account:
 *       1. Beneficiary & Account Information (with Reveal/Mask & Copy)
 *       2. Branch & Routing Details
 *       3. Disbursement Remarks & Audit Trail
 *       4. Bank Proof Attachments & Supporting Documents
 *   - Interactive Document Screen Popup Modal with high-fidelity certificate/document preview & download
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  ArrowLeft,
  Pencil,
  Building2,
  Landmark,
  Eye,
  EyeOff,
  Copy,
  Check,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  AlertCircle,
  Clock,
  ShieldCheck,
  Plus,
  CreditCard,
  MapPin,
  Maximize2,
  ChevronUp,
  ChevronDown,
  FileCheck,
} from 'lucide-react';
import { IconBankDetails } from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Badge,
  Card,
  DetailField,
  TableContainer,
  Th,
  Td,
  Modal,
  PageHeader,
} from '../../components/ui';

import { useVendorsContext } from '../../context/VendorsContext';
import { useVendorBankDetails } from '../../context/VendorBankDetailsContext';
import { getCountryName } from '../../mocks/vendors';
import { formatDate } from '../../utils/dateUtils';

const columnHelper = createColumnHelper();

function getApprovalBadgeVariant(status) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'pending':
    default:
      return 'pending';
  }
}

function getFileIcon(fileName = '', fileType = '') {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <FileText size={18} className="text-danger shrink-0" />;
  }
  return <ImageIcon size={18} className="text-primary shrink-0" />;
}

export default function VendorBankDetailsViewPage() {
  const { vendorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const bankQueryId = searchParams.get('bank');
  const navigate = useNavigate();
  const location = useLocation();

  const backPath = location.state?.from || '/vendor-bank-details';
  const backLabel = location.state?.backLabel || 'Bank Details';

  const { allVendors = [], getVendorById } = useVendorsContext();
  const { getBanksForVendor } = useVendorBankDetails();

  // Resolve vendor
  const vendor = useMemo(() => {
    if (!vendorId) return null;
    return (
      (getVendorById && getVendorById(vendorId)) ||
      allVendors.find((v) => v.id === vendorId) ||
      null
    );
  }, [vendorId, getVendorById, allVendors]);

  // Load bank accounts for this vendor
  const bankAccounts = useMemo(() => {
    if (!vendorId) return [];
    return getBanksForVendor(vendorId);
  }, [vendorId, getBanksForVendor]);

  // Reveal state for account numbers (set of bankDetailId)
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState(null);

  // Selected account for view detail panel (initialized cleanly from query param or null)
  const [selectedBankId, setSelectedBankId] = useState(() => bankQueryId || null);

  // TanStack table state for resizable column grid
  const [sorting, setSorting] = useState([]);
  const [columnSizing, setColumnSizing] = useState({});

  // Document preview modal
  const [previewItem, setPreviewItem] = useState(null);

  // Sync selectedBankId if the list updates or if the selected account is no longer valid
  useEffect(() => {
    if (bankAccounts.length > 0) {
      const exists = bankAccounts.some(
        (b) => (b.bankDetailId === selectedBankId || b.id === selectedBankId)
      );
      if (!exists) {
        const queryBank = new URLSearchParams(window.location.search).get('bank');
        const matchQuery = bankAccounts.find(
          (b) => (b.bankDetailId === queryBank || b.id === queryBank)
        );
        if (matchQuery) {
          setSelectedBankId(matchQuery.bankDetailId || matchQuery.id);
        } else {
          const activeOne = bankAccounts.find((b) => b.isActive);
          const first = bankAccounts[0];
          setSelectedBankId((activeOne || first).bankDetailId || (activeOne || first).id);
        }
      }
    }
  }, [bankAccounts, selectedBankId]);

  // Handler to select an account smoothly without triggering page navigation or scrolling to the top
  const handleSelectAccount = useCallback((accId) => {
    setSelectedBankId(accId);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('bank', accId);
      window.history.replaceState(window.history.state, '', url.toString());
    } catch {
      /* ignore */
    }
  }, []);

  // The currently viewed/selected bank account object
  const selectedAccount = useMemo(() => {
    if (!bankAccounts.length) return null;
    return (
      bankAccounts.find((b) => b.bankDetailId === selectedBankId || b.id === selectedBankId) ||
      bankAccounts[0]
    );
  }, [bankAccounts, selectedBankId]);

  // Attachments for the currently selected bank account
  const selectedAttachments = useMemo(() => {
    if (!selectedAccount) return [];
    return Array.isArray(selectedAccount.attachments) ? selectedAccount.attachments : [];
  }, [selectedAccount]);

  // Metrics
  const activeCount = useMemo(
    () => bankAccounts.filter((b) => b.isActive).length,
    [bankAccounts]
  );
  const totalAttachments = useMemo(
    () =>
      bankAccounts.reduce(
        (sum, b) => sum + (Array.isArray(b.attachments) ? b.attachments.length : 0),
        0
      ),
    [bankAccounts]
  );

  const toggleRevealAccount = (id, e) => {
    if (e) e.stopPropagation();
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text, key, e) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadAttachment = (att, e) => {
    if (e) e.stopPropagation();
    if (att.fileUrl) {
      const a = document.createElement('a');
      a.href = att.fileUrl;
      a.download = att.fileName || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob(
        [
          `MicroFlat ERP Banking Document: ${att.documentName || 'Proof'}\n` +
            `File: ${att.fileName || ''}\n` +
            `Vendor: ${vendor?.vendorName || ''} (${vendor?.vendorCode || ''})\n` +
            `Bank: ${selectedAccount?.bankName || ''}\n` +
            `Account Number: ${selectedAccount?.accountNumber || ''}\n` +
            `IFSC: ${selectedAccount?.ifscCode || ''}\n`,
        ],
        { type: 'text/plain;charset=utf-8' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.fileName || 'document.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    toast.success(`Downloading ${att.fileName || 'document'}...`);
  };

  /* ── TanStack Table Columns Definition ── */
  const columns = useMemo(
    () => [
      /* 1. BANK NAME & TYPE */
      columnHelper.accessor('bankName', {
        header: 'BANK NAME',
        minSize: 220,
        size: 300,
        cell: (info) => {
          const row = info.row.original;
          const accId = row.bankDetailId || row.id;
          const isSelected = (selectedAccount?.bankDetailId || selectedAccount?.id) === accId;

          return (
            <div className="flex items-center gap-2 flex-wrap py-0.5 min-w-0">
              <Landmark size={15} className="text-primary shrink-0" />
              <span className="text-xs font-bold text-heading truncate">
                {row.bankName}
              </span>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold bg-surface border border-border text-text-muted">
                {row.accountType || 'Current'}
              </span>
              {isSelected && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold bg-primary/15 text-primary border border-primary/30 select-none">
                  Selected
                </span>
              )}
            </div>
          );
        },
      }),

      /* 2. BRANCH / LOCATION */
      columnHelper.accessor('branchName', {
        header: 'BRANCH / LOCATION',
        minSize: 240,
        size: 340,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="text-xs text-text truncate block py-0.5">
              {row.branchName || row.branchAddress || '—'}
            </span>
          );
        },
      }),

      /* 3. STATUS */
      columnHelper.accessor('isActive', {
        header: 'STATUS',
        minSize: 110,
        size: 130,
        cell: (info) => {
          const active = info.getValue() !== false;
          return (
            <div className="py-0.5">
              <Badge variant={active ? 'active' : 'inactive'} size="sm">
                {active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          );
        },
      }),

      /* 4. ACTIONS */
      columnHelper.display({
        id: 'actions',
        header: 'ACTIONS',
        minSize: 110,
        size: 120,
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          const row = info.row.original;
          const accId = row.bankDetailId || row.id;
          const isSelected = (selectedAccount?.bankDetailId || selectedAccount?.id) === accId;

          return (
            <div
              className="flex items-center justify-end gap-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleSelectAccount(accId)}
                title={isSelected ? 'Currently viewing this bank account' : 'View this bank account'}
                className={`h-7 w-7 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-muted hover:text-primary hover:bg-surface'
                }`}
              >
                <Eye size={15} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigate(`/vendor-bank-details/${vendorId}/edit?bank=${accId}`)
                }
                title="Edit this account"
                className="h-7 w-7 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors"
              >
                <Pencil size={14} />
              </Button>
            </div>
          );
        },
      }),
    ],
    [selectedAccount, vendorId, navigate, handleSelectAccount]
  );

  /* ── TanStack Table Instance with Resizing Enabled ── */
  const table = useReactTable({
    data: bankAccounts,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Not found fallback
  if (!vendor) {
    return (
      <div className="w-full py-12 px-4 sm:px-6">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <AlertCircle size={40} className="text-warning mx-auto" />
          <h2 className="text-xl font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested vendor record with ID &quot;{vendorId}&quot; does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/vendor-bank-details')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Bank Details
          </Button>
        </div>
      </div>
    );
  }

  const selectedAccId = selectedAccount?.bankDetailId || selectedAccount?.id;
  const isSelectedAccountRevealed = selectedAccId ? revealedIds.has(selectedAccId) : false;

  return (
    <div className="w-full space-y-6 pb-16">
      {/* ── 1. HEADER (FULL SCREEN WIDTH) ── */}
      <PageHeader
        title={vendor.vendorName}
        subtitle="Beneficiary banking details, official disbursement accounts, and verification proof"
        icon={<IconBankDetails className="h-6 w-6 text-primary" aria-hidden="true" />}
        badge={
          <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
            {vendor.vendorCode}
          </span>
        }
        backButton={{
          onClick: () => navigate(backPath),
          label: backLabel,
        }}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium select-none',
                vendor.isActive !== false
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20',
              ].join(' ')}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  vendor.isActive !== false ? 'bg-success' : 'bg-danger'
                }`}
                aria-hidden="true"
              />
              {vendor.isActive !== false ? 'Active' : 'Inactive'}
            </span>

            <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
              {vendor.approvalStatus || 'Pending'}
            </Badge>

            {selectedAccount && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigate(
                    `/vendor-bank-details/${vendorId}/edit?bank=${selectedAccId}`
                  )
                }
                disabled={vendor.isActive === false}
                className="text-xs font-semibold transition-all h-8 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title={
                  vendor.isActive === false
                    ? 'Vendor is inactive. Activate vendor to edit details.'
                    : `Edit ${selectedAccount.bankName} details`
                }
              >
                <Pencil size={13} aria-hidden="true" />
                Edit Bank Details
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate(`/vendor-bank-details/${vendorId}/edit?action=add`)}
              disabled={vendor.isActive === false}
              className="text-xs font-semibold transition-all h-8 px-3.5 shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title={
                vendor.isActive === false
                  ? 'Vendor is inactive. Activate vendor to add bank accounts.'
                  : 'Add a new bank account for this vendor'
              }
            >
              <Plus size={14} className="stroke-[2.5]" aria-hidden="true" />
              Add Bank Account
            </Button>
          </div>
        }
      />

      {/* ── INACTIVE VENDOR NOTICE ── */}
      {vendor.isActive === false && (
        <div className="rounded-xl border border-danger/30 bg-danger/[0.04] p-3.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-danger/10 text-danger shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle size={16} className="stroke-[2.2]" />
            </div>
            <div className="text-xs text-heading flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-danger">Inactive Reason:</span>
              <span className="font-medium text-heading">
                {vendor.inactiveComment || 'No inactive reason specified.'}
              </span>
              {vendor.inactiveDate && (
                <span className="text-2xs font-mono text-text-muted ml-1">
                  ({vendor.inactiveDate})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. QUICK METRICS OVERVIEW CARD ── */}
      <Card padding="md" className="shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-surface/50 rounded-xl border border-border">
            <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block">
              Total Accounts
            </span>
            <span className="text-lg font-bold text-heading font-mono mt-0.5 block">
              {bankAccounts.length}
            </span>
          </div>

          <div className="p-3 bg-success/5 rounded-xl border border-success/20">
            <span className="text-2xs uppercase tracking-wider text-success font-semibold block">
              Active Accounts
            </span>
            <span className="text-lg font-bold text-success font-mono mt-0.5 block">
              {activeCount}
            </span>
          </div>

          <div className="p-3 bg-surface/50 rounded-xl border border-border">
            <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block">
              Bank Proof Documents
            </span>
            <span className="text-lg font-bold text-heading font-mono mt-0.5 block">
              {totalAttachments}
            </span>
          </div>

          <div className="p-3 bg-surface/50 rounded-xl border border-border">
            <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold block">
              Vendor Country
            </span>
            <span className="text-xs font-bold text-heading mt-1 block truncate">
              {getCountryName(vendor.countryId)}
            </span>
          </div>
        </div>
      </Card>

      {/* ── 3. REGISTERED BANK ACCOUNTS (GRID / CARDS TABLE CONTAINER) ── */}
      <Card className="overflow-hidden shadow-xs border-border">
        <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-heading flex items-center gap-2">
              <Landmark size={17} className="text-primary shrink-0" />
              Registered Bank Accounts ({bankAccounts.length})
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Click any bank account row to inspect complete details, branch routing, and verified attachments below.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/vendor-bank-details/${vendorId}/edit?action=add`)}
            disabled={vendor.isActive === false}
            className="text-xs shrink-0 w-full sm:w-auto justify-center"
            title={
              vendor.isActive === false
                ? 'Vendor is inactive. Activate vendor to add bank accounts.'
                : 'Add a new bank account'
            }
          >
            <Plus size={14} className="mr-1.5" />
            Add Bank Account
          </Button>
        </div>

        {/* ── MOBILE VIEW (< md): Card List for Small Screens ── */}
        <div className="block md:hidden p-3 space-y-2.5 bg-bg/50 max-h-[300px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          {bankAccounts.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No bank accounts configured for this vendor.
            </div>
          ) : (
            bankAccounts.map((acc, idx) => {
              const accId = acc.bankDetailId || acc.id || `acc_${idx}`;
              const isSelected = selectedAccId === accId;
              const isRevealed = revealedIds.has(accId);
              const attCount = Array.isArray(acc.attachments) ? acc.attachments.length : 0;
              const rawNum = String(acc.accountNumber || '');

              return (
                <div
                  key={accId}
                  onClick={() => handleSelectAccount(accId)}
                  className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left relative ${
                    isSelected
                      ? 'bg-primary/[0.08] border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'bg-surface border-border hover:border-primary/40'
                  }`}
                >
                  {/* Top line: Bank Name + Type Badge + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-heading">
                          {acc.bankName}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {acc.accountType || 'Current'}
                        </Badge>
                        <Badge variant={acc.isActive ? 'active' : 'inactive'} size="sm">
                          {acc.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold bg-primary/15 text-primary border border-primary/30">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Card Actions */}
                    <div
                      className="flex items-center gap-1 shrink-0 -mt-1 -mr-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSelectAccount(accId)}
                        title={isSelected ? 'Currently viewing this bank account' : 'View this bank account'}
                        className={`h-7 w-7 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary/15 text-primary'
                            : 'text-text-muted hover:text-primary hover:bg-surface'
                        }`}
                      >
                        <Eye size={14} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(`/vendor-bank-details/${vendorId}/edit?bank=${accId}`)
                        }
                        title="Edit this account"
                        className="h-7 w-7 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors"
                      >
                        <Pencil size={13} />
                      </Button>
                    </div>
                  </div>

                  {/* Bottom: Branch / Location */}
                  <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-2xs text-text-muted">
                    <span className="truncate flex items-center gap-1">
                      <MapPin size={11} className="shrink-0 text-text-muted/70" />
                      {acc.branchName || 'Main Branch'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── DESKTOP & TABLET VIEW (md+): Resizable TanStack Table Grid ── */}
        <div className="hidden md:block max-h-[280px] overflow-y-auto overscroll-y-contain border-t border-border/60">
          <TableContainer>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-surface border-b border-border sticky top-0 z-10 shadow-2xs"
                >
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
                        className={`relative py-3.5 px-6 select-none bg-surface ${
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-8 text-center text-xs text-text-muted"
                  >
                    No bank accounts configured for this vendor.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const accId = row.original.bankDetailId || row.original.id;
                  const isSelected = selectedAccId === accId;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectAccount(accId)}
                      className={`cursor-pointer transition-colors duration-150 select-none ${
                        isSelected
                          ? 'bg-primary/[0.08] font-semibold'
                          : 'hover:bg-surface/70'
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <Td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className={`py-3.5 px-6 ${
                            isSelected && cell.column.id === 'bankName'
                              ? 'border-l-4 border-l-primary'
                              : ''
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </Td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableContainer>
        </div>
      </Card>

      {/* ── 4. DETAIL PANEL (CARD) — FOR CURRENTLY SELECTED BANK ACCOUNT ── */}
      {selectedAccount ? (
        <Card className="overflow-hidden shadow-xs border-border">
          {/* Panel Header */}
          <div className="p-4 sm:px-6 sm:py-4 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-heading break-words">
                Viewing Bank Account —{' '}
                <span className="font-mono text-primary">
                  {selectedAccount.bankName}
                </span>{' '}
                <span className="text-text-muted font-normal text-xs sm:text-sm">
                  ({selectedAccount.accountType || 'Current'})
                </span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Detailed beneficiary parameters, branch routing, and verified bank documents.
              </p>
            </div>

            {/* Panel Top Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigate(`/vendor-bank-details/${vendorId}/edit?bank=${selectedAccId}`)
                }
                disabled={vendor.isActive === false}
                className="text-xs w-full sm:w-auto justify-center shadow-2xs"
                title={
                  vendor.isActive === false
                    ? 'Vendor is inactive. Activate vendor to edit details.'
                    : 'Edit this account'
                }
              >
                <Pencil size={13} className="mr-1.5" />
                Edit this account
              </Button>
            </div>
          </div>

          {/* Active Account Quick Context Strip */}
          <div className="bg-primary/[0.04] border-b border-primary/20 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
              <span className="text-text-muted">Selected Account:</span>
              <span className="font-bold text-heading truncate">
                {selectedAccount.bankName}
              </span>
              <span className="font-mono text-2xs font-semibold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                •••• {String(selectedAccount.accountNumber || '').slice(-4)}
              </span>
              <Badge variant={selectedAccount.isActive ? 'active' : 'inactive'} size="sm">
                {selectedAccount.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <span className="text-2xs text-text-muted hidden md:inline">
              Click any row in the table above to switch bank accounts
            </span>
          </div>

          {/* Panel Body: Segmented Sections Consistent with VendorEffectiveDatesPage */}
          <div className="p-4 sm:p-6 space-y-6 divide-y divide-border/60">
            {/* Section 1: Account Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <CreditCard size={15} className="text-primary" />
                Beneficiary & Account Information
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                {/* Account Holder Name */}
                <DetailField
                  label="Account Holder Name"
                  value={selectedAccount.accountHolderName}
                  icon={Building2}
                />

                {/* Account Number with Reveal and Copy */}
                <div>
                  <div className="space-y-1">
                    <span className="text-2xs text-text-muted block uppercase tracking-wider font-medium">
                      Account Number
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-heading tabular-nums tracking-wide">
                        {isSelectedAccountRevealed
                          ? selectedAccount.accountNumber
                          : `•••• •••• •••• ${String(selectedAccount.accountNumber || '').slice(-4)}`}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleRevealAccount(selectedAccId, e)}
                        className="p-1 rounded text-text-muted hover:text-heading hover:bg-surface cursor-pointer transition-colors"
                        title={
                          isSelectedAccountRevealed
                            ? 'Mask account number'
                            : 'Reveal full account number'
                        }
                        aria-label="Toggle account number visibility"
                      >
                        {isSelectedAccountRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) =>
                          copyToClipboard(
                            selectedAccount.accountNumber,
                            `panel_acc_${selectedAccId}`,
                            e
                          )
                        }
                        className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface cursor-pointer transition-colors"
                        title="Copy account number"
                        aria-label="Copy account number"
                      >
                        {copiedKey === `panel_acc_${selectedAccId}` ? (
                          <Check size={14} className="text-success" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bank Name */}
                <DetailField label="Bank Name" value={selectedAccount.bankName} />

                {/* Account Type */}
                <DetailField label="Account Type">
                  <Badge variant="neutral" size="sm">
                    {selectedAccount.accountType || 'Current'}
                  </Badge>
                </DetailField>

                {/* Account Status */}
                <DetailField label="Account Status">
                  <Badge variant={selectedAccount.isActive ? 'active' : 'inactive'} size="sm">
                    {selectedAccount.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </DetailField>

                {/* IFSC Code with Copy */}
                <div>
                  <div className="space-y-1">
                    <span className="text-2xs text-text-muted block uppercase tracking-wider font-medium">
                      IFSC Code
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-heading uppercase tabular-nums">
                        {selectedAccount.ifscCode || '—'}
                      </span>
                      {selectedAccount.ifscCode && (
                        <button
                          type="button"
                          onClick={(e) =>
                            copyToClipboard(
                              selectedAccount.ifscCode,
                              `panel_ifsc_${selectedAccId}`,
                              e
                            )
                          }
                          className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface cursor-pointer transition-colors"
                          title="Copy IFSC code"
                          aria-label="Copy IFSC code"
                        >
                          {copiedKey === `panel_ifsc_${selectedAccId}` ? (
                            <Check size={13} className="text-success" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* MICR Code */}
                <DetailField label="MICR Code" value={selectedAccount.micrCode} mono />

                {/* SWIFT / BIC Code */}
                <DetailField label="SWIFT / BIC Code" value={selectedAccount.swiftCode} mono />

                {/* IBAN Code */}
                <DetailField label="IBAN (International)" value={selectedAccount.iban} mono />
              </div>
            </div>

            {/* Section 2: Branch & Routing Details */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <MapPin size={15} className="text-primary" />
                Branch & Routing Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                <DetailField label="Branch Name" value={selectedAccount.branchName} />
                <DetailField label="Country" value={getCountryName(vendor.countryId)} />
                <div className="sm:col-span-2">
                  <DetailField
                    label="Branch Address"
                    value={selectedAccount.branchAddress || '—'}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Disbursement Remarks & Audit Trail */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                <FileText size={15} className="text-primary" />
                Disbursement Remarks & Audit Trail
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted block">
                    Remarks & Payment Instructions
                  </span>
                  <div className="text-xs text-heading font-medium bg-surface/50 rounded-lg p-3.5 border border-border/60 whitespace-pre-line leading-relaxed">
                    {selectedAccount.remarks || 'No specific remarks or payment instructions recorded.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <DetailField
                    label="Created On"
                    value={
                      selectedAccount.createdAt
                        ? formatDate(selectedAccount.createdAt)
                        : 'Recorded'
                    }
                    mono
                  />
                  <DetailField
                    label="Created By"
                    value={selectedAccount.createdBy || 'Ian Chesnut'}
                  />
                  {selectedAccount.updatedAt && (
                    <>
                      <DetailField
                        label="Last Updated On"
                        value={formatDate(selectedAccount.updatedAt)}
                        mono
                      />
                      <DetailField
                        label="Last Updated By"
                        value={selectedAccount.updatedBy || 'Ian Chesnut'}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Bank Proof Attachments & Supporting Documents */}
            <div className="space-y-3 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                  <Paperclip size={15} className="text-primary" />
                  Bank Proof Attachments & Supporting Documents
                  <span className="text-2xs font-normal text-text-muted ml-1">
                    ({selectedAttachments.length})
                  </span>
                </div>
                <span className="text-2xs text-text-muted hidden sm:inline">
                  Click any document card to view details in popup
                </span>
              </div>

              {selectedAttachments.length === 0 ? (
                <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted">
                  No bank proof documents (Cancelled Cheque, Passbook, Bank Letter) attached for this account.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {selectedAttachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setPreviewItem(att)}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-bg hover:border-primary/60 hover:bg-primary/[0.03] hover:shadow-xs transition-all duration-150 cursor-pointer group select-none"
                      title="Click to view document in popup"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-surface border border-border group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors shrink-0">
                          {getFileIcon(att.fileName, att.fileType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                            {att.documentName || att.fileName}
                          </p>
                          <p className="text-2xs text-text-muted truncate mt-0.5">
                            {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(att);
                          }}
                          title="View preview"
                          className="h-8 w-8 text-text-muted group-hover:text-primary hover:bg-primary/10"
                        >
                          <Maximize2 size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDownloadAttachment(att, e)}
                          title="Download document"
                          className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/10"
                        >
                          <Download size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="text-center py-12 border-dashed border-border shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto text-text-muted">
            <Landmark size={24} />
          </div>
          <h4 className="text-sm font-semibold text-heading">No Bank Details Registered</h4>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            This vendor does not have any bank accounts configured yet. Add beneficiary bank details to enable invoice settlement and payment processing.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => navigate(`/vendor-bank-details/${vendorId}/edit?action=add`)}
              disabled={vendor.isActive === false}
              className="text-xs font-semibold shadow-2xs"
            >
              <Plus size={14} className="mr-1.5" />
              Add Bank Account
            </Button>
          </div>
        </Card>
      )}

      {/* ── 5. DOCUMENT SCREEN POPUP (MODAL) — MATCHING VENDOR EFFECTIVE DATES PAGE ── */}
      {previewItem && (
        <Modal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={previewItem.documentName || previewItem.fileName}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-surface/50 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="text-2xs font-mono">
                  {previewItem.fileName?.split('.').pop()?.toUpperCase() || 'DOC'}
                </Badge>
                <span className="text-heading font-medium truncate max-w-xs sm:max-w-md">
                  {previewItem.fileName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-text-muted">
                {previewItem.fileSize && (
                  <span>
                    Size: <strong className="text-heading">{previewItem.fileSize}</strong>
                  </span>
                )}
                {previewItem.uploadedAt && (
                  <span>
                    Uploaded:{' '}
                    <strong className="text-heading font-mono">{previewItem.uploadedAt}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Screen Popup Preview Content */}
            <div className="bg-bg rounded-2xl border border-border p-4 sm:p-6 flex items-center justify-center min-h-[320px] max-h-[65vh] overflow-auto shadow-inner">
              {previewItem.fileUrl ? (
                previewItem.fileType?.startsWith('image/') ? (
                  <img
                    src={previewItem.fileUrl}
                    alt={previewItem.documentName}
                    className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md"
                  />
                ) : (
                  <iframe
                    src={previewItem.fileUrl}
                    title={previewItem.documentName}
                    className="w-full h-[55vh] rounded-xl border border-border shadow-xs"
                  />
                )
              ) : (
                /* Enhanced visual certificate / document card presentation for mock documents */
                <div className="w-full max-w-lg bg-surface border-2 border-border/80 rounded-2xl p-6 shadow-sm text-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                    <ShieldCheck size={180} />
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                    {previewItem.fileName?.toLowerCase().endsWith('.pdf') ? (
                      <FileText size={28} className="text-danger" />
                    ) : (
                      <FileCheck size={28} className="text-primary" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-bold bg-success/10 text-success border border-success/20">
                      <ShieldCheck size={12} /> Verified Banking Document Proof
                    </span>
                    <h4 className="text-base font-bold text-heading mt-2">
                      {previewItem.documentName || previewItem.fileName}
                    </h4>
                    <p className="text-xs text-text-muted font-mono">
                      {previewItem.fileName}
                    </p>
                  </div>

                  <div className="bg-bg rounded-xl p-3 border border-border text-left space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Vendor:</span>
                      <span className="font-semibold text-heading">{vendor.vendorName}</span>
                    </div>
                    {selectedAccount && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Bank Name:</span>
                          <span className="font-semibold text-heading">
                            {selectedAccount.bankName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Account Number:</span>
                          <span className="font-mono text-heading">
                            •••• •••• •••• {String(selectedAccount.accountNumber || '').slice(-4)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-muted">Document Type:</span>
                      <span className="font-semibold text-heading">
                        {previewItem.documentName || 'Banking Proof Document'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">File Size:</span>
                      <span className="font-mono text-heading">
                        {previewItem.fileSize || 'Standard Document'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Popup Action Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
                Close
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={(e) => handleDownloadAttachment(previewItem, e)}
              >
                <Download size={14} className="mr-1.5" />
                Download Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
