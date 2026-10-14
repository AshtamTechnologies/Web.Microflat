/**
 * VendorBankDetailsViewPage.jsx — Read-only Master View for Vendor Bank Details.
 *
 * Route: /vendor-bank-details/:vendorId/view or /vendor-bank-details/:vendorId
 *
 * Implements:
 *   - Vendor executive profile & verification status
 *   - Comprehensive 360-degree card layout for each configured bank account
 *   - Reveal/Mask account number toggle & copy-to-clipboard utilities
 *   - Full details for IFSC, MICR, SWIFT, IBAN, Branch Address, Remarks
 *   - Document attachment browser with in-modal preview and download
 *   - Direct 1-click edit buttons linking to the edit form for any account
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  ExternalLink,
  X,
  CreditCard,
  MapPin,
} from 'lucide-react';
import { IconBankDetails } from '../../constants/icons';

import {
  Button,
  Badge,
  Card,
  DetailField,
  Modal,
  PageHeader,
  EmptyState,
} from '../../components/ui';

import { useVendorsContext } from '../../context/VendorsContext';
import { useVendorBankDetails } from '../../context/VendorBankDetailsContext';
import { getCountryName } from '../../mocks/vendors';
import { formatDate } from '../../utils/dateUtils';

function getApprovalBadgeVariant(status) {
  switch (status) {
    case 'Approved':
      return 'approved';
    case 'Pending':
      return 'pending';
    case 'Rejected':
      return 'rejected';
    default:
      return 'neutral';
  }
}

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

export default function VendorBankDetailsViewPage() {
  const { vendorId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightBankId = searchParams.get('bank');
  const navigate = useNavigate();

  const { allVendors = [], getVendorById } = useVendorsContext();
  const { getBanksForVendor } = useVendorBankDetails();

  // Reveal state for account numbers (set of bankDetailId)
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState(null);

  // Document preview modal
  const [previewingFile, setPreviewingFile] = useState(null);

  // Resolve vendor
  const vendor = useMemo(() => {
    if (!vendorId) return null;
    return (
      (getVendorById && getVendorById(vendorId)) ||
      allVendors.find((v) => v.id === vendorId) ||
      null
    );
  }, [vendorId, getVendorById, allVendors]);

  // Load banks
  const bankAccounts = useMemo(() => {
    if (!vendorId) return [];
    return getBanksForVendor(vendorId);
  }, [vendorId, getBanksForVendor]);

  // Statistics
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

  const toggleRevealAccount = (id) => {
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

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!vendor) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested vendor record with ID &quot;{vendorId}&quot; does not exist or has been removed.
          </p>
          <div className="pt-2">
            <Button variant="primary" onClick={() => navigate('/vendor-bank-details')}>
              Return to Bank Details List
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title={`Vendor Bank Details: ${vendor.vendorName}`}
        subtitle={`Official beneficiary banking configurations and disbursement routes for ${vendor.vendorCode}`}
        icon={<IconBankDetails className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <button
            type="button"
            onClick={() => navigate('/vendor-bank-details')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
          >
            <ArrowLeft
              size={14}
              className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform"
            />
            <span>Back to Bank Details</span>
          </button>
        }
      />

      {/* ── 1. Vendor Identity Card ── */}
      <Card padding="md" className="space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-heading">{vendor.vendorName}</h2>
                <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)} size="sm">
                  {vendor.approvalStatus || 'Pending'}
                </Badge>
                <Badge variant={vendor.isActive !== false ? 'active' : 'inactive'} size="sm">
                  {vendor.isActive !== false ? 'Active Vendor' : 'Inactive Vendor'}
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5 font-mono">
                Vendor Code: <strong className="text-heading font-semibold">{vendor.vendorCode}</strong>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/50 text-center">
              <span className="text-2xs text-text-muted block uppercase tracking-wider font-medium">
                Total Accounts
              </span>
              <span className="text-sm font-bold text-heading tabular-nums">
                {bankAccounts.length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-success/20 bg-success/5 text-center">
              <span className="text-2xs text-success block uppercase tracking-wider font-medium">
                Active for Payout
              </span>
              <span className="text-sm font-bold text-success tabular-nums">
                {activeCount}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-border bg-surface/50 text-center">
              <span className="text-2xs text-text-muted block uppercase tracking-wider font-medium">
                Bank Proofs
              </span>
              <span className="text-sm font-bold text-heading tabular-nums">
                {totalAttachments}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
          <DetailField label="Vendor Code" value={vendor.vendorCode} mono />
          <DetailField label="Country" value={getCountryName(vendor.countryId)} />
          <DetailField label="Company Type" value={vendor.businessType || 'Vendor / Supplier'} />
          <DetailField label="Approval Status">
            <Badge variant={getApprovalBadgeVariant(vendor.approvalStatus)}>
              {vendor.approvalStatus || 'Pending'}
            </Badge>
          </DetailField>
        </div>
      </Card>

      {/* ── 2. Bank Accounts Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-heading uppercase tracking-wider">
              Configured Bank Accounts ({bankAccounts.length})
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/vendor-bank-details/${vendorId}/edit`)}
            className="text-xs text-primary hover:text-primary-hover"
          >
            <Plus size={14} className="mr-1" />
            Add Another Account
          </Button>
        </div>

        {bankAccounts.length === 0 ? (
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
                onClick={() => navigate(`/vendor-bank-details/${vendorId}/edit`)}
                className="text-xs font-semibold shadow-2xs"
              >
                <Plus size={14} className="mr-1.5" />
                Add Bank Account
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            {bankAccounts.map((account, index) => {
              const accId = account.bankDetailId || account.id || `acc_${index}`;
              const isRevealed = revealedIds.has(accId);
              const isHighlighted = highlightBankId && (account.bankDetailId === highlightBankId || account.id === highlightBankId);
              const attachments = Array.isArray(account.attachments) ? account.attachments : [];

              return (
                <Card
                  key={accId}
                  padding="md"
                  className={[
                    'space-y-4 shadow-2xs transition-all duration-200',
                    isHighlighted ? 'ring-2 ring-primary border-primary/60 bg-primary/[0.02]' : 'hover:border-primary/40',
                  ].join(' ')}
                >
                  {/* Account Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border pb-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Landmark size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-heading">
                            {account.bankName}
                          </h4>
                          <Badge variant="neutral" size="sm">
                            {account.accountType || 'Current'}
                          </Badge>
                          <Badge variant={account.isActive ? 'active' : 'inactive'} size="sm">
                            {account.isActive ? 'Active for Payout' : 'Inactive'}
                          </Badge>
                          {index === 0 && account.isActive && (
                            <Badge variant="approved" size="sm" className="font-semibold">
                              Primary Payout Account
                            </Badge>
                          )}
                          {isHighlighted && (
                            <Badge variant="pending" size="sm">
                              Selected Account
                            </Badge>
                          )}
                        </div>
                        <p className="text-2xs text-text-muted mt-0.5 flex items-center gap-1.5">
                          <MapPin size={12} className="text-text-muted/70" />
                          <span>{account.branchName || 'Main Branch'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/vendor-bank-details/${vendorId}/edit?bank=${accId}`)}
                        className="text-xs shadow-2xs"
                      >
                        <Pencil size={13} className="mr-1" />
                        Edit Account
                      </Button>
                    </div>
                  </div>

                  {/* Core Bank Account Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                    {/* Account Holder Name */}
                    <div className="sm:col-span-2">
                      <DetailField
                        label="Account Holder Name"
                        value={account.accountHolderName}
                        icon={Building2}
                      />
                    </div>

                    {/* Account Number with Eye Reveal and Copy */}
                    <div className="sm:col-span-2">
                      <div className="space-y-1">
                        <span className="text-2xs text-text-muted block uppercase tracking-wider font-medium">
                          Account Number
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-heading tabular-nums tracking-wide">
                            {isRevealed
                              ? account.accountNumber
                              : `•••• •••• •••• ${String(account.accountNumber || '').slice(-4)}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealAccount(accId)}
                            className="p-1 rounded text-text-muted hover:text-heading hover:bg-surface cursor-pointer transition-colors"
                            title={isRevealed ? 'Mask account number' : 'Reveal full account number'}
                            aria-label={isRevealed ? 'Mask account number' : 'Reveal full account number'}
                          >
                            {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(account.accountNumber, `acc_${accId}`)}
                            className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface cursor-pointer transition-colors"
                            title="Copy account number"
                            aria-label="Copy account number"
                          >
                            {copiedKey === `acc_${accId}` ? (
                              <Check size={14} className="text-success" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bank Name */}
                    <DetailField label="Bank Name" value={account.bankName} />

                    {/* Branch Name */}
                    <DetailField label="Branch Name" value={account.branchName} />

                    {/* Account Type */}
                    <DetailField label="Account Type">
                      <Badge variant="neutral" size="sm">
                        {account.accountType || 'Current'}
                      </Badge>
                    </DetailField>

                    {/* IFSC Code with Copy */}
                    <div>
                      <div className="space-y-1">
                        <span className="text-2xs text-text-muted block uppercase tracking-wider font-medium">
                          IFSC Code
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-heading uppercase tabular-nums">
                            {account.ifscCode || '—'}
                          </span>
                          {account.ifscCode && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(account.ifscCode, `ifsc_${accId}`)}
                              className="p-1 rounded text-text-muted hover:text-primary hover:bg-surface cursor-pointer transition-colors"
                              title="Copy IFSC code"
                              aria-label="Copy IFSC code"
                            >
                              {copiedKey === `ifsc_${accId}` ? (
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
                    <DetailField label="MICR Code" value={account.micrCode} mono />

                    {/* SWIFT / BIC */}
                    <DetailField label="SWIFT / BIC Code" value={account.swiftCode} mono />

                    {/* IBAN */}
                    <DetailField label="IBAN (International)" value={account.iban} mono />

                    {/* Account Status */}
                    <DetailField label="Account Status">
                      <Badge variant={account.isActive ? 'active' : 'inactive'} size="sm">
                        {account.isActive ? 'Active for vendor payouts' : 'Inactive account'}
                      </Badge>
                    </DetailField>

                    {/* Branch Address */}
                    <div className="sm:col-span-2">
                      <DetailField label="Branch Address" value={account.branchAddress} />
                    </div>

                    {/* Remarks */}
                    <div className="sm:col-span-2">
                      <DetailField label="Remarks / Notes" value={account.remarks} />
                    </div>
                  </div>

                  {/* ── Document Attachments Browser ── */}
                  <div className="pt-3 border-t border-border/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip size={13} className="text-primary" />
                        Bank Proof Attachments ({attachments.length})
                      </span>
                      <span className="text-2xs text-text-muted">
                        Verified documents (Cancelled Cheque, Passbook, Bank Letter)
                      </span>
                    </div>

                    {attachments.length === 0 ? (
                      <div className="p-3 rounded-lg border border-dashed border-border bg-surface/30 text-center">
                        <p className="text-2xs text-text-muted">
                          No bank proof documents attached to this account record.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {attachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between gap-2 text-xs hover:border-primary/40 transition-colors shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-bg border border-border shrink-0">
                                {getFileIcon(att.fileName, att.fileType)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-heading text-xs truncate block">
                                  {att.documentName || 'Bank Proof'}
                                </span>
                                <span className="font-mono text-2xs text-text-muted truncate block">
                                  {att.fileName}
                                </span>
                                <span className="text-2xs text-text-muted/70 font-mono block mt-0.5">
                                  {att.fileSize || 'Standard file'} • {att.uploadedAt || 'Uploaded'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewingFile(att)}
                                title="Preview document"
                                className="h-7 w-7 text-text-muted hover:text-primary"
                              >
                                <Eye size={13} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => toast.success(`Downloading ${att.fileName}...`)}
                                title="Download file"
                                className="h-7 w-7 text-text-muted hover:text-primary"
                              >
                                <Download size={13} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit Trail Row */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-2xs text-text-muted font-mono">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-text-muted/70" />
                      <span>
                        Last updated:{' '}
                        {account.updatedAt
                          ? formatDate(account.updatedAt)
                          : account.createdAt
                          ? formatDate(account.createdAt)
                          : 'Recorded'}
                      </span>
                    </span>
                    <span>
                      by {account.updatedBy || account.createdBy || 'Ian Chesnut'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Document Preview Modal ── */}
      {previewingFile && (
        <Modal
          isOpen={Boolean(previewingFile)}
          onClose={() => setPreviewingFile(null)}
          title={`Document Preview: ${previewingFile.fileName}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-8 rounded-xl bg-surface border border-border text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                {getFileIcon(previewingFile.fileName, previewingFile.fileType)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-heading">
                  {previewingFile.documentName || 'Bank Proof Document'}
                </h4>
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  {previewingFile.fileName} ({previewingFile.fileSize || 'Standard file'})
                </p>
                <p className="text-2xs text-text-muted mt-1">
                  Uploaded on {previewingFile.uploadedAt || 'Recently'}
                </p>
              </div>

              <div className="pt-2">
                <Badge variant="approved" size="sm">
                  Verified Banking Document Proof
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => toast.success(`Downloading ${previewingFile.fileName}...`)}
              >
                <Download size={13} className="mr-1.5" />
                Download Document
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewingFile(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
