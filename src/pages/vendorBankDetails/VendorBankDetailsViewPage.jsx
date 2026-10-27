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
  IconAdd,
  IconAttachment,
  IconBack,
  IconBankDetails,
  IconBuilding2,
  IconCheck,
  IconClock,
  IconCopy,
  IconCreditCard,
  IconDocumentTypes,
  IconDownload,
  IconEdit,
  IconError,
  IconEyeOff,
  IconFileText,
  IconImage,
  IconLocation,
  IconMaximize2,
  IconShieldCheck,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Badge,
  Card,
  DetailField,
  Modal,
  PageHeader,
} from '../../components/ui';

import { useVendorsContext } from '../../context/VendorsContext';
import { useVendorBankDetails } from '../../context/VendorBankDetailsContext';
import { vendorService } from '../../services';
import { getCountryName } from '../../mocks/vendors';
import { formatDate } from '../../utils/dateUtils';

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
    return <IconFileText size={18} className="text-danger shrink-0" />;
  }
  return <IconImage size={18} className="text-primary shrink-0" />;
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
  const { getBanksForVendor, fetchBanksForVendor } = useVendorBankDetails();

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
  const [bankAccounts, setBankAccounts] = useState(() => getBanksForVendor(vendorId));

  useEffect(() => {
    let isCancelled = false;
    async function loadVendorBanks() {
      if (vendorId) {
        const banks = await fetchBanksForVendor(vendorId);
        if (!isCancelled && Array.isArray(banks)) {
          setBankAccounts(banks);
        }
      }
    }
    loadVendorBanks();
    return () => {
      isCancelled = true;
    };
  }, [vendorId, fetchBanksForVendor]);


  // Reveal state for account numbers (set of bankDetailId)
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState(null);

  // Selected account for view detail panel (initialized cleanly from query param or null)
  const [selectedBankId, setSelectedBankId] = useState(() => bankQueryId || null);

  // Document preview modal
  const [previewItem, setPreviewItem] = useState(null);

  // Status Filter for Master Bank Accounts list: 'ALL' | 'ACTIVE'
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredBankAccounts = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return bankAccounts.filter((b) => b.isActive);
    }
    return bankAccounts;
  }, [bankAccounts, statusFilter]);

  // Sync selectedBankId if the list updates or if the selected account is no longer valid
  useEffect(() => {
    if (filteredBankAccounts.length > 0) {
      const exists = filteredBankAccounts.some(
        (b) => (b.bankDetailId === selectedBankId || b.id === selectedBankId)
      );
      if (!exists) {
        const queryBank = new URLSearchParams(window.location.search).get('bank');
        const matchQuery = filteredBankAccounts.find(
          (b) => (b.bankDetailId === queryBank || b.id === queryBank)
        );
        if (matchQuery) {
          setSelectedBankId(matchQuery.bankDetailId || matchQuery.id);
        } else {
          const activeOne = filteredBankAccounts.find((b) => b.isActive);
          const first = filteredBankAccounts[0];
          setSelectedBankId((activeOne || first).bankDetailId || (activeOne || first).id);
        }
      }
    }
  }, [filteredBankAccounts, selectedBankId]);

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
    if (!filteredBankAccounts.length) return null;
    return (
      filteredBankAccounts.find((b) => b.bankDetailId === selectedBankId || b.id === selectedBankId) ||
      filteredBankAccounts[0]
    );
  }, [filteredBankAccounts, selectedBankId]);

  const [remoteAttachments, setRemoteAttachments] = useState({});

  useEffect(() => {
    let isCancelled = false;
    async function loadBankAttachments() {
      const bankId = selectedAccount?.bankDetailId || selectedAccount?.id;
      if (bankId && !String(bankId).startsWith('temp_') && !String(bankId).startsWith('bd_')) {
        try {
          const docs = await vendorService.getBankDetailAttachments(bankId);
          if (!isCancelled && Array.isArray(docs)) {
            setRemoteAttachments((prev) => ({ ...prev, [bankId]: docs }));
          }
        } catch (err) {
          console.warn('Could not load attachments for bank account:', err);
        }
      }
    }
    loadBankAttachments();
    return () => {
      isCancelled = true;
    };
  }, [selectedAccount]);

  // Attachments for the currently selected bank account
  const selectedAttachments = useMemo(() => {
    if (!selectedAccount) return [];
    const bankId = selectedAccount.bankDetailId || selectedAccount.id;
    const remote = remoteAttachments[bankId];
    if (Array.isArray(remote) && remote.length > 0) return remote;
    return Array.isArray(selectedAccount.attachments) ? selectedAccount.attachments : [];
  }, [selectedAccount, remoteAttachments]);

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

  const handleDownloadAttachment = async (att, e) => {
    if (e) e.stopPropagation();
    const attId = att.id || att.attachmentId;
    if (attId && !String(attId).startsWith('att_')) {
      try {
        await vendorService.downloadBankAttachment(attId, att.fileName || 'bank_attachment');
        toast.success(`Downloaded ${att.fileName || 'attachment'}`);
        return;
      } catch (err) {
        console.warn('Real bank attachment download failed:', err);
      }
    }
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

  // Not found fallback
  if (!vendor) {
    return (
      <div className="w-full py-12 px-4 sm:px-6">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <IconError size={40} className="text-warning mx-auto" />
          <h2 className="text-xl font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested vendor record with ID &quot;{vendorId}&quot; does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/vendor-bank-details')}>
            <IconBack size={16} className="mr-2" />
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
                <IconEdit size={13} aria-hidden="true" />
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
              <IconAdd size={14} className="" aria-hidden="true" />
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
              <IconError size={16} className="" />
            </div>
            <div className="text-xs text-heading flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-danger">Inactive Reason:</span>
              <span className="font-medium text-heading">
                {vendor.inactiveComment || 'No inactive reason specified.'}
              </span>
              {vendor.inactiveDate && (
                <span className="text-2xs font-mono text-text-muted ml-1">
                  ({formatDate(vendor.inactiveDate)})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. TWO-COLUMN SPLIT MASTER-DETAIL LAYOUT (OPTION A) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN (MASTER PANE: 4 of 12) ── */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          {/* Quick Metrics & Filter Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`p-3 rounded-xl border flex flex-col justify-between shadow-2xs text-left cursor-pointer transition-all duration-150 ${
                statusFilter === 'ALL'
                  ? 'bg-primary/[0.08] border-primary ring-2 ring-primary/20'
                  : 'bg-surface/60 border-border hover:border-primary/40 hover:bg-surface'
              }`}
              title="Click to view all bank accounts"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold">
                  Total Accounts
                </span>
                {statusFilter === 'ALL' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-lg font-bold text-heading font-mono mt-1">
                {bankAccounts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter((prev) => (prev === 'ACTIVE' ? 'ALL' : 'ACTIVE'))
              }
              className={`p-3 rounded-xl border flex flex-col justify-between shadow-2xs text-left cursor-pointer transition-all duration-150 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-success/15 border-success ring-2 ring-success/30'
                  : 'bg-success/5 border-success/20 hover:border-success/50 hover:bg-success/10'
              }`}
              title={
                statusFilter === 'ACTIVE'
                  ? 'Showing active accounts only. Click to show all.'
                  : 'Click to filter and show only active accounts'
              }
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xs uppercase tracking-wider text-success font-semibold">
                  Active Accounts
                </span>
                {statusFilter === 'ACTIVE' && (
                  <span className="text-2xs font-semibold px-1.5 py-0.2 rounded-full bg-success text-white">
                    Active
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-success font-mono mt-1">
                {activeCount}
              </span>
            </button>
          </div>

          {/* Master Accounts List Card */}
          <Card className="overflow-hidden shadow-2xs border-border">
            <div className="p-3.5 sm:px-4 sm:py-3 bg-bg border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <IconBankDetails size={16} className="text-primary shrink-0" />
                <h2 className="text-xs sm:text-sm font-bold text-heading truncate">
                  Registered Accounts ({filteredBankAccounts.length})
                </h2>
                {statusFilter === 'ACTIVE' && (
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 shrink-0">
                    Active
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => navigate(`/vendor-bank-details/${vendorId}/edit?action=add`)}
                disabled={vendor.isActive === false}
                className="text-2xs px-2.5 h-7 font-semibold shrink-0 cursor-pointer"
                title={
                  vendor.isActive === false
                    ? 'Vendor is inactive. Activate vendor to add bank accounts.'
                    : 'Add a new bank account'
                }
              >
                <IconAdd size={12} className="mr-1" />
                Add Account
              </Button>
            </div>

            {/* Account List Cards */}
            <div className="p-3 space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto overscroll-y-contain">
              {filteredBankAccounts.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  {statusFilter === 'ACTIVE'
                    ? 'No active bank accounts found for this vendor.'
                    : 'No bank accounts configured for this vendor.'}
                </div>
              ) : (
                filteredBankAccounts.map((acc, idx) => {
                  const accId = acc.bankDetailId || acc.id || `acc_${idx}`;
                  const isSelected = selectedAccId === accId;
                  const isRevealed = revealedIds.has(accId);
                  const rawNum = String(acc.accountNumber || '');
                  const maskedNum = rawNum ? `•••• ${rawNum.slice(-4)}` : '•••• —';

                  return (
                    <div
                      key={accId}
                      onClick={() => handleSelectAccount(accId)}
                      className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left relative ${
                        isSelected
                          ? 'bg-primary/[0.08] border-primary ring-1.5 ring-primary/30 shadow-xs'
                          : 'bg-surface/50 border-border hover:border-primary/40 hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-heading truncate">
                              {acc.bankName}
                            </span>
                            <Badge variant="neutral" size="sm">
                              {acc.accountType || 'Current'}
                            </Badge>
                            <Badge variant={acc.isActive ? 'active' : 'inactive'} size="sm">
                              {acc.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>

                          <div className="mt-1.5 flex items-center gap-2 text-2xs text-text-muted font-mono">
                            <span className="font-semibold text-heading">
                              {isRevealed ? rawNum : maskedNum}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => toggleRevealAccount(accId, e)}
                              className="p-0.5 text-text-muted hover:text-heading cursor-pointer transition-colors"
                              title={isRevealed ? 'Mask number' : 'Reveal number'}
                              aria-label="Toggle account number visibility"
                            >
                              {isRevealed ? <IconEyeOff size={11} /> : <IconView size={11} />}
                            </button>
                          </div>
                        </div>

                        {/* Quick Edit */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate(`/vendor-bank-details/${vendorId}/edit?bank=${accId}`)
                            }
                            title="Edit this account"
                            className="h-7 w-7 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors"
                          >
                            <IconEdit size={13} />
                          </Button>
                        </div>
                      </div>

                      {/* Branch & Selected Footer */}
                      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-2xs text-text-muted">
                        <span className="truncate flex items-center gap-1">
                          <IconLocation size={11} className="shrink-0 text-text-muted/70" />
                          {acc.branchName || 'Main Branch'}
                        </span>
                        {isSelected && (
                          <span className="text-2xs font-bold text-primary flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Viewing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN (DETAIL INSPECTOR PANE: 8 of 12) ── */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          {selectedAccount ? (
            <Card className="overflow-hidden shadow-xs border-border">
              {/* Panel Top Header */}
              <div className="p-4 sm:px-6 sm:py-3.5 bg-bg border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-heading">
                      {selectedAccount.bankName}
                    </h3>
                    <Badge variant="neutral" size="sm">
                      {selectedAccount.accountType || 'Current'}
                    </Badge>
                    <Badge variant={selectedAccount.isActive ? 'active' : 'inactive'} size="sm">
                      {selectedAccount.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-2xs sm:text-xs text-text-muted mt-0.5">
                    Beneficiary parameters, branch routing, and verified bank documents.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(`/vendor-bank-details/${vendorId}/edit?bank=${selectedAccId}`)
                    }
                    disabled={vendor.isActive === false}
                    className="text-xs h-8 px-3 shadow-2xs cursor-pointer flex items-center gap-1.5"
                    title={
                      vendor.isActive === false
                        ? 'Vendor is inactive. Activate vendor to edit details.'
                        : 'Edit this account'
                    }
                  >
                    <IconEdit size={13} />
                    Edit this account
                  </Button>
                </div>
              </div>

              {/* Panel Body: Cleanly Segmented Grid */}
              <div className="p-4 sm:p-5 space-y-5">
                {/* 1. BENEFICIARY & ACCOUNT INFORMATION */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                    <IconCreditCard size={14} className="text-primary" />
                    Beneficiary & Account Information
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-0.5">
                    {/* Account Holder Name */}
                    <DetailField
                      label="Account Holder Name"
                      value={selectedAccount.accountHolderName}
                      icon={IconBuilding2}
                    />

                    {/* Account Number with Reveal and Copy */}
                    <div>
                      <div className="space-y-1">
                        <span className="view-field-label mf-detail-label">
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
                            {isSelectedAccountRevealed ? <IconEyeOff size={13} /> : <IconView size={13} />}
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
                              <IconCheck size={13} className="text-success" />
                            ) : (
                              <IconCopy size={13} />
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
                        <span className="view-field-label mf-detail-label">
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
                                <IconCheck size={13} className="text-success" />
                              ) : (
                                <IconCopy size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* MICR Code with Copy */}
                    <div>
                      <div className="space-y-1">
                        <span className="view-field-label mf-detail-label">
                          MICR Code
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-heading tabular-nums">
                            {selectedAccount.micrCode || '—'}
                          </span>
                          {selectedAccount.micrCode && (
                            <button
                              type="button"
                              onClick={(e) =>
                                copyToClipboard(
                                  selectedAccount.micrCode,
                                  `panel_micr_${selectedAccId}`,
                                  e
                                )
                              }
                              className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface cursor-pointer transition-colors"
                              title="Copy MICR code"
                              aria-label="Copy MICR code"
                            >
                              {copiedKey === `panel_micr_${selectedAccId}` ? (
                                <IconCheck size={13} className="text-success" />
                              ) : (
                                <IconCopy size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SWIFT / BIC Code with Copy */}
                    <div>
                      <div className="space-y-1">
                        <span className="view-field-label mf-detail-label">
                          SWIFT / BIC Code
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-heading uppercase tabular-nums">
                            {selectedAccount.swiftCode || '—'}
                          </span>
                          {selectedAccount.swiftCode && (
                            <button
                              type="button"
                              onClick={(e) =>
                                copyToClipboard(
                                  selectedAccount.swiftCode,
                                  `panel_swift_${selectedAccId}`,
                                  e
                                )
                              }
                              className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface cursor-pointer transition-colors"
                              title="Copy SWIFT/BIC code"
                              aria-label="Copy SWIFT/BIC code"
                            >
                              {copiedKey === `panel_swift_${selectedAccId}` ? (
                                <IconCheck size={13} className="text-success" />
                              ) : (
                                <IconCopy size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* IBAN Code with Copy */}
                    <div>
                      <div className="space-y-1">
                        <span className="view-field-label mf-detail-label">
                          IBAN (International)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-heading uppercase tabular-nums">
                            {selectedAccount.iban || '—'}
                          </span>
                          {selectedAccount.iban && (
                            <button
                              type="button"
                              onClick={(e) =>
                                copyToClipboard(
                                  selectedAccount.iban,
                                  `panel_iban_${selectedAccId}`,
                                  e
                                )
                              }
                              className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface cursor-pointer transition-colors"
                              title="Copy IBAN"
                              aria-label="Copy IBAN"
                            >
                              {copiedKey === `panel_iban_${selectedAccId}` ? (
                                <IconCheck size={13} className="text-success" />
                              ) : (
                                <IconCopy size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. BRANCH & ROUTING DETAILS */}
                <div className="space-y-2.5 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                    <IconLocation size={14} className="text-primary" />
                    Branch & Routing Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-0.5">
                    <DetailField label="Branch Name" value={selectedAccount.branchName} />
                    <DetailField label="Country" value={getCountryName(vendor.countryId)} />
                    <div className="sm:col-span-2 xl:col-span-1">
                      <DetailField
                        label="Branch Address"
                        value={selectedAccount.branchAddress || '—'}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. DUAL-COLUMN SUBGRID: DISBURSEMENT & AUDIT + PROOF ATTACHMENTS */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-4 border-t border-border/60">
                  {/* LEFT SUBCOLUMN: Disbursement Remarks & Audit Trail */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                      <IconFileText size={14} className="text-primary" />
                      Disbursement & Audit Trail
                    </div>

                    <div className="space-y-1">
                      <span className="view-field-label mf-detail-label">
                        Remarks & Payment Instructions
                      </span>
                      <div className="text-xs text-heading font-medium bg-surface/50 rounded-lg p-3 border border-border/60 whitespace-pre-line leading-relaxed min-h-[64px]">
                        {selectedAccount.remarks || 'No specific remarks or payment instructions recorded.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
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

                  {/* RIGHT SUBCOLUMN: Bank Proof Attachments & Supporting Documents */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                        <IconAttachment size={14} className="text-primary" />
                        Proof Attachments
                        <span className="text-2xs font-mono font-semibold px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                          {selectedAttachments.length}
                        </span>
                      </div>
                      <span className="text-2xs text-text-muted hidden sm:inline">
                        Click card to view
                      </span>
                    </div>

                    {selectedAttachments.length === 0 ? (
                      <div className="p-6 text-center bg-surface/30 rounded-xl border border-dashed border-border text-xs text-text-muted flex flex-col items-center justify-center min-h-[140px]">
                        <IconAttachment size={22} className="text-text-muted/40 mb-1.5" />
                        <p className="font-medium text-heading">No Proof Documents Attached</p>
                        <p className="text-2xs text-text-muted mt-0.5">
                          Cancelled cheque, passbook, or bank verification letter.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedAttachments.map((att) => (
                          <div
                            key={att.id || att.attachmentId}
                            onClick={() => setPreviewItem(att)}
                            className="flex items-center justify-between p-3 rounded-xl border border-border bg-bg hover:border-primary/60 hover:bg-primary/[0.03] hover:shadow-2xs transition-all duration-150 cursor-pointer group select-none"
                            title="Click to view document in popup"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="p-2 rounded-lg bg-surface border border-border group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors shrink-0">
                                {getFileIcon(att.fileName, att.fileType)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-heading truncate group-hover:text-primary transition-colors">
                                  {att.documentName || att.fileName}
                                </p>
                                <p className="text-2xs text-text-muted truncate mt-0.5 font-mono">
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
                                className="h-7 w-7 text-text-muted group-hover:text-primary hover:bg-primary/10"
                              >
                                <IconMaximize2 size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDownloadAttachment(att, e)}
                                title="Download document"
                                className="h-7 w-7 text-text-muted hover:text-primary hover:bg-primary/10"
                              >
                                <IconDownload size={12} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card padding="lg" className="text-center py-12 border-dashed border-border shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center mx-auto text-text-muted">
                <IconBankDetails size={24} />
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
                  <IconAdd size={14} className="mr-1.5" />
                  Add Bank Account
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

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
                    <strong className="text-heading font-mono">{formatDate(previewItem.uploadedAt)}</strong>
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
                    <IconShieldCheck size={180} />
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 shadow-xs">
                    {previewItem.fileName?.toLowerCase().endsWith('.pdf') ? (
                      <IconFileText size={28} className="text-danger" />
                    ) : (
                      <IconDocumentTypes size={28} className="text-primary" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-bold bg-success/10 text-success border border-success/20">
                      <IconShieldCheck size={12} /> Verified Banking Document Proof
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
                <IconDownload size={14} className="mr-1.5" />
                Download Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
