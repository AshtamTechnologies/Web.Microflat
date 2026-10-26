/**
 * CompanyBankDetailsViewPage.jsx — Read-only Master View for Company Bank Details.
 *
 * Route: /company-bank-details/:companyId/view or /company-bank-details/:companyId
 *
 * Designed to mirror VendorBankDetailsViewPage:
 *   - PageHeader with company badge, status pill, and quick actions
 *   - Metrics counter (Total accounts, Active accounts, Verified attachments)
 *   - Table grid of configured bank accounts with instant row selection
 *   - Detail panel card for selected account:
 *       1. Beneficiary & Account Information (with Reveal & Copy)
 *       2. Branch & Routing Details (IFSC, SWIFT, MICR, IBAN)
 *       3. Disbursement Remarks & Audit Trail
 *       4. Supporting Documents & Certificate previews
 *   - AuthVerificationModal for secure account deletion
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  IconDelete,
  IconEdit,
  IconError,
  IconEyeOff,
  IconFileText,
  IconImage,
  IconLocation,
  IconShieldCheck,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Badge,
  Card,
  DetailField,
  TableContainer,
  Th,
  Modal,
  PageHeader,
} from '../../components/ui';

import { useCompanyContext } from '../../context/CompanyContext';
import { useCompanyBankDetails } from '../../context/CompanyBankDetailsContext';
import { getCountryName, getStateName } from '../../mocks/vendors';
import { formatDate } from '../../utils/dateUtils';
import AuthVerificationModal from './components/AuthVerificationModal';

function getFileIcon(fileName = '', fileType = '') {
  const name = (fileName || '').toLowerCase();
  const type = (fileType || '').toLowerCase();
  if (name.endsWith('.pdf') || type.includes('pdf')) {
    return <IconFileText size={18} className="text-danger shrink-0" />;
  }
  return <IconImage size={18} className="text-primary shrink-0" />;
}

export default function CompanyBankDetailsViewPage() {
  const { companyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const bankQueryId = searchParams.get('bank');
  const navigate = useNavigate();

  const { companies = [], getCompanyById } = useCompanyContext();
  const {
    getBanksForCompany,
    deleteBankDetail,
  } = useCompanyBankDetails();

  const effectiveCompanyId = companyId || companies[0]?.id || 'COMP-001';

  const currentCompany = useMemo(() => {
    return (
      (getCompanyById && getCompanyById(effectiveCompanyId)) ||
      companies.find((c) => String(c.id) === String(effectiveCompanyId)) ||
      companies[0] ||
      null
    );
  }, [effectiveCompanyId, getCompanyById, companies]);

  // Load bank accounts for this company
  const bankAccounts = useMemo(() => {
    return getBanksForCompany(effectiveCompanyId) || [];
  }, [effectiveCompanyId, getBanksForCompany]);

  const [selectedBankId, setSelectedBankId] = useState(bankQueryId || null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Security Auth Verification Modal State for deletion
  const [authModalState, setAuthModalState] = useState({
    isOpen: false,
    bank: null,
  });

  // Sync selectedBankId
  useEffect(() => {
    if (bankAccounts.length > 0) {
      const exists = bankAccounts.some(
        (b) => b.bankDetailId === selectedBankId || b.id === selectedBankId
      );
      if (!exists) {
        if (bankQueryId) {
          const match = bankAccounts.find(
            (b) => b.bankDetailId === bankQueryId || b.id === bankQueryId
          );
          if (match) {
            setSelectedBankId(match.bankDetailId || match.id);
            return;
          }
        }
        const activeOne = bankAccounts.find((b) => b.isActive);
        const first = bankAccounts[0];
        setSelectedBankId((activeOne || first).bankDetailId || (activeOne || first).id);
      }
    }
  }, [bankAccounts, selectedBankId, bankQueryId]);

  const handleSelectAccount = useCallback((accId) => {
    setSelectedBankId(accId);
    setIsRevealed(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('bank', accId);
      window.history.replaceState(window.history.state, '', url.toString());
    } catch {
      /* ignore */
    }
  }, []);

  const selectedAccount = useMemo(() => {
    if (!bankAccounts.length) return null;
    return (
      bankAccounts.find(
        (b) => b.bankDetailId === selectedBankId || b.id === selectedBankId
      ) || bankAccounts[0]
    );
  }, [bankAccounts, selectedBankId]);

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

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePromptDelete = () => {
    if (!selectedAccount) return;
    setAuthModalState({
      isOpen: true,
      bank: selectedAccount,
    });
  };

  const handleAuthDeleteSuccess = (authUser) => {
    if (!authModalState.bank) return;
    const bankId = authModalState.bank.bankDetailId || authModalState.bank.id;
    if (deleteBankDetail) {
      deleteBankDetail(bankId, authUser);
    }
    toast.success('Bank account deleted successfully');
    setAuthModalState({ isOpen: false, bank: null });
  };

  if (!currentCompany) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Company Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested company ID "{companyId}" was not found.
          </p>
          <Button variant="primary" onClick={() => navigate('/company-bank-details')}>
            Back to Company Bank Details
          </Button>
        </Card>
      </div>
    );
  }

  const maskedAccount = selectedAccount?.accountNumber
    ? isRevealed
      ? selectedAccount.accountNumber
      : `•••• ${String(selectedAccount.accountNumber).slice(-4)}`
    : '—';

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* ── Top Header & Actions ── */}
      <PageHeader
        title={currentCompany.companyName}
        icon={<IconBankDetails className="h-6 w-6 text-primary" aria-hidden="true" />}
        subtitle={`Company ID: ${currentCompany.id} • Corporate Banking & Disbursement Profiles`}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/company-bank-details')}
          >
            Back to Bank Details
          </Button>
        }
        badge={
          <Badge variant={currentCompany.isActive ? 'active' : 'inactive'}>
            {currentCompany.isActive ? 'Active Company' : 'Inactive'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={IconAdd}
              onClick={() => navigate(`/company-bank-details/${companyId}/edit`)}
            >
              Add Account
            </Button>

            {selectedAccount && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={IconEdit}
                onClick={() =>
                  navigate(
                    `/company-bank-details/${companyId}/edit?bank=${
                      selectedAccount.bankDetailId || selectedAccount.id
                    }`
                  )
                }
              >
                Edit Account
              </Button>
            )}
          </div>
        }
      />

      {/* ── Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IconCreditCard size={20} />
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase font-medium">Configured Accounts</p>
            <p className="text-xl font-bold text-heading mt-0.5">{bankAccounts.length}</p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
            <IconShieldCheck size={20} />
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase font-medium">Active Accounts</p>
            <p className="text-xl font-bold text-heading mt-0.5">{activeCount}</p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
            <IconAttachment size={20} />
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase font-medium">Attached Documents</p>
            <p className="text-xl font-bold text-heading mt-0.5">{totalAttachments}</p>
          </div>
        </Card>
      </div>

      {/* ── Configured Accounts Selection List ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <IconBankDetails size={16} />
            </div>
            <h3 className="text-sm font-semibold text-heading">Registered Bank Accounts</h3>
          </div>
          <span className="text-2xs text-text-muted">Click an account to inspect details</span>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            No bank accounts configured for this company.{' '}
            <button
              type="button"
              onClick={() => navigate(`/company-bank-details/${companyId}/edit`)}
              className="text-primary hover:underline font-semibold"
            >
              Add a bank account now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <Th className="text-2xs uppercase">Bank & Branch</Th>
                  <Th className="text-2xs uppercase">Account No.</Th>
                  <Th className="text-2xs uppercase">Type</Th>
                  <Th className="text-2xs uppercase">Status</Th>
                  <Th className="text-2xs uppercase text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bankAccounts.map((acc) => {
                  const accId = acc.bankDetailId || acc.id;
                  const isSelected =
                    (selectedAccount?.bankDetailId || selectedAccount?.id) === accId;

                  return (
                    <tr
                      key={accId}
                      onClick={() => handleSelectAccount(accId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-surface/50'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-xs">
                        <span className="font-semibold text-heading block">{acc.bankName}</span>
                        <span className="text-2xs text-text-muted block">{acc.branchName || '—'}</span>
                      </td>

                      <td className="px-3 py-2.5 text-xs font-mono">
                        {acc.accountNumber
                          ? `•••• ${String(acc.accountNumber).slice(-4)}`
                          : '—'}
                      </td>

                      <td className="px-3 py-2.5 text-xs">
                        <Badge variant="neutral" size="sm">
                          {acc.accountType || 'Current'}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5 text-xs">
                        <Badge variant={acc.isActive ? 'active' : 'inactive'} size="sm">
                          {acc.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>

                      <td className="px-3 py-2.5 text-xs text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/company-bank-details/${companyId}/edit?bank=${accId}`);
                            }}
                            title="Edit this account"
                            className="h-7 w-7 text-text-muted hover:text-primary hover:bg-surface"
                          >
                            <IconEdit size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Active Selection Detail Panel ── */}
      {selectedAccount && (
        <div className="space-y-6">
          {/* Card 1: Beneficiary & Account Information */}
          <Card padding="md" className="space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconBankDetails size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-heading">
                    Beneficiary & Account Information
                  </h3>
                  <p className="text-2xs text-text-muted">
                    Primary banking credentials for disbursement
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={selectedAccount.isActive ? 'active' : 'inactive'}>
                  {selectedAccount.isActive ? 'Active Account' : 'Inactive Account'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-danger hover:bg-danger/10"
                  onClick={handlePromptDelete}
                  title="Delete account (requires authorization)"
                >
                  <IconDelete size={15} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-6">
              <DetailField
                label="Account Holder Name"
                value={selectedAccount.accountHolderName || '—'}
              />
              <DetailField label="Bank Name" value={selectedAccount.bankName || '—'} />
              <DetailField label="Branch Name" value={selectedAccount.branchName || '—'} />

              {/* Account Number with Reveal & Copy */}
              <div>
                <span className="block text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Account Number
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-heading tabular-nums">
                    {maskedAccount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRevealed((prev) => !prev)}
                    className="text-text-muted hover:text-heading p-1 rounded transition-colors"
                    title={isRevealed ? 'Hide account number' : 'Reveal full account number'}
                  >
                    {isRevealed ? <IconEyeOff size={15} /> : <IconView size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(selectedAccount.accountNumber, 'Account Number')
                    }
                    className="text-text-muted hover:text-primary p-1 rounded transition-colors"
                    title="Copy account number"
                  >
                    {copiedField === 'Account Number' ? (
                      <IconCheck size={15} className="text-success" />
                    ) : (
                      <IconCopy size={15} />
                    )}
                  </button>
                </div>
              </div>

              <DetailField
                label="Account Type"
                value={
                  <Badge variant="neutral" size="sm">
                    {selectedAccount.accountType || 'Current'}
                  </Badge>
                }
              />

              <DetailField
                label="Company ID"
                value={
                  <span className="font-mono text-xs font-semibold text-primary">
                    {selectedAccount.companyId}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Card 2: Branch & Routing Details */}
          <Card padding="md" className="space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconLocation size={17} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-heading">Branch & Routing Details</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-6">
              <div>
                <span className="block text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  IFSC Code
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border font-semibold text-heading">
                    {selectedAccount.ifscCode || '—'}
                  </span>
                  {selectedAccount.ifscCode && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedAccount.ifscCode, 'IFSC Code')}
                      className="text-text-muted hover:text-primary p-0.5 rounded"
                      title="Copy IFSC"
                    >
                      {copiedField === 'IFSC Code' ? (
                        <IconCheck size={14} className="text-success" />
                      ) : (
                        <IconCopy size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  SWIFT / BIC Code
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border font-semibold text-heading">
                    {selectedAccount.swiftCode || '—'}
                  </span>
                  {selectedAccount.swiftCode && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedAccount.swiftCode, 'SWIFT Code')}
                      className="text-text-muted hover:text-primary p-0.5 rounded"
                      title="Copy SWIFT"
                    >
                      {copiedField === 'SWIFT Code' ? (
                        <IconCheck size={14} className="text-success" />
                      ) : (
                        <IconCopy size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <DetailField
                label="MICR Code"
                value={
                  selectedAccount.micrCode ? (
                    <span className="font-mono text-xs font-medium text-heading">
                      {selectedAccount.micrCode}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />

              <DetailField
                label="IBAN"
                value={
                  selectedAccount.iban ? (
                    <span className="font-mono text-xs font-medium text-heading">
                      {selectedAccount.iban}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />

              <div className="md:col-span-2 lg:col-span-4">
                <DetailField
                  label="Branch Address"
                  value={selectedAccount.branchAddress || '—'}
                  icon={IconLocation}
                />
              </div>
            </div>
          </Card>

          {/* Card 3: Disbursement Remarks & Audit Trail */}
          <Card padding="md" className="space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconClock size={17} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-heading">
                  Disbursement Remarks & Audit Information
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-2xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Disbursement Remarks
                </span>
                <p className="text-xs text-heading p-3 rounded-lg bg-surface/70 border border-border min-h-[60px]">
                  {selectedAccount.remarks || 'No specific remarks entered for this account.'}
                </p>
              </div>

              <div className="space-y-3">
                <DetailField
                  label="Record Created"
                  value={
                    selectedAccount.createdAt
                      ? `${formatDate(selectedAccount.createdAt)} by ${
                          selectedAccount.createdBy || 'System'
                        }`
                      : '—'
                  }
                />
                <DetailField
                  label="Last Updated"
                  value={
                    selectedAccount.updatedAt
                      ? `${formatDate(selectedAccount.updatedAt)} by ${
                          selectedAccount.updatedBy || 'Admin'
                        }`
                      : 'Never modified'
                  }
                />
              </div>
            </div>
          </Card>

          {/* Card 4: Supporting Documents & Attachments */}
          <Card padding="md" className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <IconAttachment size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-heading">
                    Attached Documents ({selectedAttachments.length})
                  </h3>
                </div>
              </div>
            </div>

            {selectedAttachments.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                No supporting documents attached for this account.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getFileIcon(att.fileName, att.fileType)}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-heading truncate" title={att.fileName}>
                          {att.fileName}
                        </p>
                        <p className="text-3xs text-text-muted">
                          {att.documentName} • {att.fileSize}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary shrink-0"
                      onClick={() => setPreviewItem(att)}
                      title="Preview attachment"
                    >
                      <IconView size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Document Preview Modal ── */}
      <Modal
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={`Document Preview — ${previewItem?.fileName || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="p-8 bg-surface rounded-xl border border-border text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <IconFileText size={28} />
            </div>
            <div>
              <p className="font-semibold text-sm text-heading">{previewItem?.fileName}</p>
              <p className="text-xs text-text-muted mt-1">
                Document Type: {previewItem?.documentName} • {previewItem?.fileSize}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Security Auth Verification Modal for Account Deletion ── */}
      <AuthVerificationModal
        isOpen={authModalState.isOpen}
        onClose={() => setAuthModalState({ isOpen: false, bank: null })}
        onSuccess={handleAuthDeleteSuccess}
        action="delete"
        bankAccount={authModalState.bank}
        companyName={currentCompany?.companyName}
      />
    </div>
  );
}
