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
  IconDownload,
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
import * as companyService from '../../services/companies/companyService';
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

export default function CompanyBankDetailsViewPage({ companyId: propCompanyId, embedded = false }) {
  const { companyId: routeCompanyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const bankQueryId = searchParams.get('bank');
  const navigate = useNavigate();

  const companyId = propCompanyId || routeCompanyId;

  const { companies = [], getCompanyById } = useCompanyContext();
  const {
    getBanksForCompany,
    deleteBankDetail,
    downloadAttachment,
  } = useCompanyBankDetails();

  const effectiveCompanyId = companyId || companies[0]?.id || 'COMP-001';
  const [loading, setLoading] = useState(true);
  const [loadedCompany, setLoadedCompany] = useState(null);
  const [singleBankDetail, setSingleBankDetail] = useState(null);
  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);

  const currentCompany = useMemo(() => {
    if (loadedCompany) return loadedCompany;
    return (
      (getCompanyById && getCompanyById(effectiveCompanyId)) ||
      companies.find((c) => String(c.id) === String(effectiveCompanyId)) ||
      companies[0] ||
      null
    );
  }, [loadedCompany, effectiveCompanyId, getCompanyById, companies]);

  // Load bank accounts for this company
  const bankAccounts = useMemo(() => {
    if (companyBankAccounts.length > 0) return companyBankAccounts;
    return getBanksForCompany(effectiveCompanyId) || [];
  }, [companyBankAccounts, effectiveCompanyId, getBanksForCompany]);

  const [selectedBankId, setSelectedBankId] = useState(bankQueryId || null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Security Auth Verification Modal State for deletion
  const [authModalState, setAuthModalState] = useState({
    isOpen: false,
    bank: null,
  });

  // Load live bank detail and company bank details via API on mount
  useEffect(() => {
    let isMounted = true;
    async function loadViewData() {
      setLoading(true);
      try {
        const targetBankId = bankQueryId || selectedBankId;
        // 1. Call GET /api/company-bank-details/{id}
        if (targetBankId) {
          try {
            const freshAccount = await companyService.getCompanyBankDetailById(targetBankId);
            if (freshAccount && isMounted) {
              setSingleBankDetail(freshAccount);
              setSelectedBankId(String(freshAccount.companyBankDetailId || freshAccount.id));
            }
          } catch (e) {
            console.warn('Failed to load single bank detail:', e);
          }
        }

        // 2. Call GET /api/companies/{companyid}/bank-details
        let compId = companyId || (companies[0]?.companyId || companies[0]?.id);
        if (!compId) {
          try {
            const res = await companyService.listCompanies({ pageNumber: 1, pageSize: 20 });
            if (res?.items && res.items.length > 0) {
              compId = res.items[0].companyId || res.items[0].id;
            }
          } catch (e) {
            console.warn('Failed to list companies:', e);
          }
        }
        if (compId) {
          try {
            const banks = await companyService.getCompanyBankDetails(compId);
            if (Array.isArray(banks) && isMounted) {
              setCompanyBankAccounts(banks);
            }
            const comp = await companyService.getCompanyById(compId);
            if (comp && isMounted) {
              setLoadedCompany(comp);
            }
          } catch (e) {
            console.warn('Failed to load company bank details:', e);
          }
        }
      } catch (err) {
        console.warn('Failed in view bank data load:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadViewData();
    return () => {
      isMounted = false;
    };
  }, [bankQueryId, effectiveCompanyId, companyId]);

  // Status Filter for Master Bank Accounts list: 'ALL' | 'ACTIVE'
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredBankAccounts = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return bankAccounts.filter((b) => b.isActive);
    }
    return bankAccounts;
  }, [bankAccounts, statusFilter]);

  // Sync selectedBankId
  useEffect(() => {
    if (filteredBankAccounts.length > 0) {
      const exists = filteredBankAccounts.some(
        (b) => String(b.bankDetailId || b.id) === String(selectedBankId)
      );
      if (!exists) {
        if (bankQueryId) {
          const match = filteredBankAccounts.find(
            (b) => String(b.bankDetailId || b.id) === String(bankQueryId)
          );
          if (match) {
            setSelectedBankId(match.bankDetailId || match.id);
            return;
          }
        }
        const activeOne = filteredBankAccounts.find((b) => b.isActive);
        const first = filteredBankAccounts[0];
        setSelectedBankId((activeOne || first).bankDetailId || (activeOne || first).id);
      }
    }
  }, [filteredBankAccounts, selectedBankId, bankQueryId]);

  const handleSelectAccount = useCallback(async (accId) => {
    setSelectedBankId(accId);
    setIsRevealed(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('bank', accId);
      window.history.replaceState(window.history.state, '', url.toString());

      // Fetch GET /api/company-bank-details/{id}
      const fresh = await companyService.getCompanyBankDetailById(accId);
      if (fresh) {
        setSingleBankDetail(fresh);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const selectedAccount = useMemo(() => {
    if (singleBankDetail && (String(singleBankDetail.companyBankDetailId) === String(selectedBankId) || String(singleBankDetail.id) === String(selectedBankId))) {
      return singleBankDetail;
    }
    if (!bankAccounts.length) return singleBankDetail || null;
    return (
      bankAccounts.find(
        (b) => String(b.bankDetailId) === String(selectedBankId) || String(b.id) === String(selectedBankId)
      ) || singleBankDetail || bankAccounts[0]
    );
  }, [singleBankDetail, selectedBankId, bankAccounts]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-muted font-medium">Loading bank details...</p>
        </div>
      </div>
    );
  }

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

  const editUrl = embedded
    ? `/company-registration/${companyId}/edit?tab=bank`
    : `/company-bank-details/${companyId}/edit`;

  const getEditAccountUrl = (accId) =>
    embedded
      ? `/company-registration/${companyId}/edit?tab=bank&bank=${accId}`
      : `/company-bank-details/${companyId}/edit?bank=${accId}`;

  return (
    <div className={`space-y-6 ${embedded ? 'pb-6' : 'pb-20'} w-full`}>
      {/* ── Top Header & Actions (shown only when standalone) ── */}
      {!embedded && (
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
                onClick={() => navigate(editUrl)}
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
                      getEditAccountUrl(
                        selectedAccount.bankDetailId || selectedAccount.id
                      )
                    )
                  }
                >
                  Edit Account
                </Button>
              )}
            </div>
          }
        />
      )}

      {/* ── 2-Column Responsive Bank Console Layout (lg:grid-cols-12) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT RAIL: Compact Metrics & Bank Account Navigator (lg:col-span-4) ── */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          {/* Metrics Pill Bar with interactive status filter */}
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
                <span className="w-2 h-2 rounded-full bg-primary/60" />
              </div>
              <span className="text-xl font-bold text-heading font-mono mt-1">
                {bankAccounts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`p-3 rounded-xl border flex flex-col justify-between shadow-2xs text-left cursor-pointer transition-all duration-150 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-success/[0.08] border-success ring-2 ring-success/20'
                  : 'bg-surface/60 border-border hover:border-success/40 hover:bg-surface'
              }`}
              title="Click to view active bank accounts only"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold">
                  Active Accounts
                </span>
                <span className="w-2 h-2 rounded-full bg-success" />
              </div>
              <span className="text-xl font-bold text-success font-mono mt-1">
                {activeCount}
              </span>
            </button>
          </div>

          {/* Account Selection Cards List */}
          <Card padding="none" className="shadow-xs border-border bg-bg overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <IconBankDetails size={16} className="text-primary shrink-0" />
                <h3 className="text-xs font-bold text-heading uppercase tracking-wider">
                  Configured Accounts ({filteredBankAccounts.length})
                </h3>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                icon={IconAdd}
                onClick={() => navigate(editUrl)}
                className="text-2xs font-semibold h-7 px-2"
              >
                Add Account
              </Button>
            </div>

            <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto overscroll-contain">
              {filteredBankAccounts.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted space-y-2">
                  <p>
                    {statusFilter === 'ACTIVE'
                      ? 'No active bank accounts found.'
                      : 'No bank accounts configured for this company.'}
                  </p>
                  {statusFilter === 'ACTIVE' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setStatusFilter('ALL')}
                      className="text-2xs"
                    >
                      Show All Accounts
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(editUrl)}
                      className="text-xs"
                    >
                      Configure Bank Account
                    </Button>
                  )}
                </div>
              ) : (
                filteredBankAccounts.map((acc) => {
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
                })
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT STAGE: Active Account Unified Console Card (lg:col-span-8) ── */}
        <div className="lg:col-span-8 xl:col-span-8">
          {selectedAccount ? (
            <Card className="overflow-hidden shadow-xs border-border bg-bg">
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
                    Primary banking credentials for disbursement and statutory routing
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    icon={IconEdit}
                    onClick={() =>
                      navigate(
                        getEditAccountUrl(
                          selectedAccount.bankDetailId || selectedAccount.id
                        )
                      )
                    }
                    className="text-xs font-semibold h-8 px-3 shadow-2xs"
                  >
                    Edit Account
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
                        <span className="font-mono text-xs sm:text-sm font-bold text-heading tabular-nums">
                          {maskedAccount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsRevealed((prev) => !prev)}
                          className="text-text-muted hover:text-heading p-1 rounded transition-colors cursor-pointer"
                          title={isRevealed ? 'Hide account number' : 'Reveal full account number'}
                        >
                          {isRevealed ? <IconEyeOff size={14} /> : <IconView size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(selectedAccount.accountNumber, 'Account Number')
                          }
                          className="text-text-muted hover:text-primary p-1 rounded transition-colors cursor-pointer"
                          title="Copy account number"
                        >
                          {copiedField === 'Account Number' ? (
                            <IconCheck size={14} className="text-success" />
                          ) : (
                            <IconCopy size={14} />
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
                  </div>
                </div>

                {/* 2. BRANCH & ROUTING DETAILS */}
                <div className="space-y-2.5 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                    <IconLocation size={14} className="text-primary" />
                    Branch & Routing Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 pt-0.5">
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
                            className="text-text-muted hover:text-primary p-0.5 rounded transition-colors cursor-pointer"
                            title="Copy IFSC"
                          >
                            {copiedField === 'IFSC Code' ? (
                              <IconCheck size={13} className="text-success" />
                            ) : (
                              <IconCopy size={13} />
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
                            className="text-text-muted hover:text-primary p-0.5 rounded transition-colors cursor-pointer"
                            title="Copy SWIFT"
                          >
                            {copiedField === 'SWIFT Code' ? (
                              <IconCheck size={13} className="text-success" />
                            ) : (
                              <IconCopy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="view-field-label">MICR Code</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border font-bold text-heading">
                          {selectedAccount.micrCode || '—'}
                        </span>
                        {selectedAccount.micrCode && (
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedAccount.micrCode, 'MICR Code')}
                            className="text-text-muted hover:text-primary p-0.5 rounded transition-colors cursor-pointer"
                            title="Copy MICR Code"
                          >
                            {copiedField === 'MICR Code' ? (
                              <IconCheck size={13} className="text-success" />
                            ) : (
                              <IconCopy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="view-field-label">IBAN</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface border border-border font-bold text-heading">
                          {selectedAccount.iban || '—'}
                        </span>
                        {selectedAccount.iban && (
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedAccount.iban, 'IBAN')}
                            className="text-text-muted hover:text-primary p-0.5 rounded transition-colors cursor-pointer"
                            title="Copy IBAN"
                          >
                            {copiedField === 'IBAN' ? (
                              <IconCheck size={13} className="text-success" />
                            ) : (
                              <IconCopy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-span-full pt-1">
                      <DetailField
                        label="Branch Address"
                        value={selectedAccount.branchAddress || '—'}
                        icon={IconLocation}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. DUAL-COLUMN SUBGRID: DISBURSEMENT & ATTACHMENTS */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-4 border-t border-border/60">
                  {/* Disbursement & Audit Trail */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                      <IconClock size={14} className="text-primary" />
                      Disbursement & Audit Information
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="view-field-label">Disbursement Remarks</span>
                        <p className="text-xs text-heading p-2.5 rounded-lg bg-surface/50 border border-border min-h-[46px] mt-1">
                          {selectedAccount.remarks || 'No specific remarks entered for this account.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                  </div>

                  {/* Supporting Documents */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-heading font-semibold text-xs uppercase tracking-wider">
                        <IconAttachment size={14} className="text-primary" />
                        Attached Documents ({selectedAttachments.length})
                      </div>
                    </div>

                    {selectedAttachments.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border bg-surface/30 text-center">
                        <p className="text-xs text-text-muted italic">
                          No supporting documents attached for this account.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto overscroll-contain pr-1">
                        {selectedAttachments.map((att) => (
                          <div
                            key={att.id}
                            className="p-2.5 bg-surface/50 rounded-lg border border-border flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {getFileIcon(att.fileName, att.fileType)}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-heading truncate" title={att.documentTypeName || att.documentName || att.fileName}>
                                  {att.documentTypeName || att.documentName || 'Banking Document'}
                                </p>
                                <p className="text-3xs text-text-muted truncate" title={att.fileName}>
                                  {att.fileName} {att.fileSize ? `• ${att.fileSize}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary shrink-0 hover:bg-primary/10"
                                onClick={() => downloadAttachment(att.downloadUrl || att.companyBankAttachmentId || att.id, att.fileName)}
                                title="Download attachment"
                              >
                                <IconDownload size={14} />
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

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="primary"
              size="sm"
              icon={IconDownload}
              onClick={() => {
                if (previewItem) {
                  downloadAttachment(
                    previewItem.downloadUrl || previewItem.companyBankAttachmentId || previewItem.id,
                    previewItem.fileName
                  );
                }
              }}
            >
              Download
            </Button>
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
