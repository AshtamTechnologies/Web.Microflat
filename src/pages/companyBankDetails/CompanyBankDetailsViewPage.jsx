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

      {/* ── 2-Column Responsive Bank Console Layout (xl:grid-cols-12) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── LEFT RAIL: Compact Metrics & Bank Account Navigator (xl:col-span-5) ── */}
        <div className="xl:col-span-5 space-y-4">
          {/* Metrics Pill Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            <Card padding="sm" className="bg-bg text-center space-y-0.5">
              <span className="text-3xs text-text-muted uppercase font-semibold block">Total</span>
              <span className="text-base font-bold text-heading font-mono">{bankAccounts.length}</span>
            </Card>
            <Card padding="sm" className="bg-bg text-center space-y-0.5">
              <span className="text-3xs text-success uppercase font-semibold block">Active</span>
              <span className="text-base font-bold text-success font-mono">{activeCount}</span>
            </Card>
            <Card padding="sm" className="bg-bg text-center space-y-0.5">
              <span className="text-3xs text-info uppercase font-semibold block">Docs</span>
              <span className="text-base font-bold text-info font-mono">{totalAttachments}</span>
            </Card>
          </div>

          {/* Account Selection Cards List */}
          <Card padding="md" className="space-y-3.5 shadow-xs border-border bg-bg">
            <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <IconBankDetails size={17} className="text-primary shrink-0" />
                <h3 className="text-sm font-bold text-heading">Configured Accounts</h3>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                icon={IconAdd}
                onClick={() => navigate(`/company-bank-details/${companyId}/edit`)}
                className="text-2xs font-semibold h-7 px-2"
              >
                Add Account
              </Button>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted space-y-2">
                <p>No bank accounts configured for this company.</p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/company-bank-details/${companyId}/edit`)}
                  className="text-xs"
                >
                  Configure Bank Account
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-0.5 overscroll-contain">
                {bankAccounts.map((acc) => {
                  const accId = acc.bankDetailId || acc.id;
                  const isSelected =
                    (selectedAccount?.bankDetailId || selectedAccount?.id) === accId;

                  return (
                    <div
                      key={accId}
                      onClick={() => handleSelectAccount(accId)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs'
                          : 'bg-surface/50 border-border hover:bg-surface hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-heading truncate">
                              {acc.bankName}
                            </span>
                            <Badge variant={acc.isActive ? 'active' : 'inactive'} size="sm">
                              {acc.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <span className="text-2xs text-text-muted block mt-0.5 truncate">
                            {acc.branchName || 'Main Branch'}
                          </span>
                        </div>

                        <span className="font-mono text-xs font-semibold text-heading px-2 py-0.5 rounded bg-bg border border-border shrink-0">
                          •••• {String(acc.accountNumber || '').slice(-4) || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-2xs">
                        <Badge variant="neutral" size="sm" className="text-3xs">
                          {acc.accountType || 'Current'}
                        </Badge>
                        <span className="font-mono text-text-muted">
                          IFSC: <strong className="text-heading font-medium">{acc.ifscCode || '—'}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── RIGHT STAGE: Active Account Details Console (xl:col-span-7) ── */}
        <div className="xl:col-span-7 space-y-6">
          {selectedAccount ? (
            <>
              {/* Card 1: Beneficiary & Account Information */}
              <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
                <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <IconCreditCard size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-heading">
                        {selectedAccount.bankName}
                      </h3>
                      <p className="text-2xs text-text-muted">
                        Primary banking credentials for disbursement
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={selectedAccount.isActive ? 'active' : 'inactive'}>
                      {selectedAccount.isActive ? 'Active' : 'Inactive'}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                  <DetailField
                    label="Account Holder Name"
                    value={selectedAccount.accountHolderName || '—'}
                    valueClassName="font-semibold text-heading"
                  />
                  <DetailField label="Bank Name" value={selectedAccount.bankName || '—'} />
                  <DetailField label="Branch Name" value={selectedAccount.branchName || '—'} />

                  {/* Account Number with Reveal & Copy */}
                  <div>
                    <span className="view-field-label">Account Number</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-sm font-bold text-heading tabular-nums">
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
              <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <IconLocation size={17} />
                  </div>
                  <h3 className="text-sm font-bold text-heading">Branch & Routing Details</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="view-field-label">IFSC Code</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border font-bold text-heading">
                        {selectedAccount.ifscCode || '—'}
                      </span>
                      {selectedAccount.ifscCode && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedAccount.ifscCode, 'IFSC Code')}
                          className="text-text-muted hover:text-primary p-0.5 rounded transition-colors"
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
                    <span className="view-field-label">SWIFT / BIC Code</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border font-bold text-heading">
                        {selectedAccount.swiftCode || '—'}
                      </span>
                      {selectedAccount.swiftCode && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedAccount.swiftCode, 'SWIFT Code')}
                          className="text-text-muted hover:text-primary p-0.5 rounded transition-colors"
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
                        <span className="font-mono text-xs font-semibold text-heading">
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
                        <span className="font-mono text-xs font-semibold text-heading">
                          {selectedAccount.iban}
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />

                  <div className="sm:col-span-2 lg:col-span-4 pt-1 border-t border-border/50">
                    <DetailField
                      label="Branch Address"
                      value={selectedAccount.branchAddress || '—'}
                      icon={IconLocation}
                    />
                  </div>
                </div>
              </Card>

              {/* Card 3: Disbursement Remarks & Audit Trail */}
              <Card padding="md" className="space-y-4 shadow-xs border-border bg-bg">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <IconClock size={17} />
                  </div>
                  <h3 className="text-sm font-bold text-heading">
                    Disbursement & Audit Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="view-field-label">Disbursement Remarks</span>
                    <p className="text-xs text-heading p-3 rounded-lg bg-surface/50 border border-border min-h-[50px] mt-1">
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
              <Card padding="md" className="space-y-3.5 shadow-xs border-border bg-bg">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <IconAttachment size={17} />
                    </div>
                    <h3 className="text-sm font-bold text-heading">
                      Attached Documents ({selectedAttachments.length})
                    </h3>
                  </div>
                </div>

                {selectedAttachments.length === 0 ? (
                  <p className="text-xs text-text-muted py-5 text-center italic">
                    No supporting documents attached for this account.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-surface/50 rounded-xl border border-border flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
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
            </>
          ) : (
            <Card padding="lg" className="py-12 text-center text-text-muted">
              Select a bank account from the left to view complete details.
            </Card>
          )}
        </div>
      </div>

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
