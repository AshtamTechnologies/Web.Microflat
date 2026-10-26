/**
 * CompanyBankDetailsPage.jsx — Dashboard and data table for Company Bank Details.
 * Uses the system's standardized DataTable and TableToolbar for full UI consistency.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  IconAdd,
  IconBankDetails,
  IconDelete,
  IconEdit,
  IconView,
} from '../../constants/icons';
import toast from 'react-hot-toast';

import {
  Button,
  Badge,
  Card,
  PageHeader,
  SearchableSelect,
  DataTable,
  TableToolbar,
  StatusBadge,
} from '../../components/ui';
import { useCompanyContext } from '../../context/CompanyContext';
import { useCompanyBankDetails } from '../../context/CompanyBankDetailsContext';
import { useCompanyBankTable, STATUS_FILTER_OPTIONS } from './useCompanyBankTable';
import AuthVerificationModal from './components/AuthVerificationModal';
import { formatDate } from '../../utils/dateUtils';

export default function CompanyBankDetailsPage() {
  const navigate = useNavigate();
  const { getAllBanks, toggleBankActive, deleteBankDetail } = useCompanyBankDetails();
  const { companies = [] } = useCompanyContext();

  const [loading, setLoading] = useState(true);

  // Security Auth Modal State for deletion
  const [authModalState, setAuthModalState] = useState({
    isOpen: false,
    bank: null,
  });

  const handleDeleteRequest = (bankRow) => {
    setAuthModalState({
      isOpen: true,
      bank: bankRow,
    });
  };

  const handleAuthDeleteSuccess = (authUser) => {
    if (!authModalState.bank) return;
    const bankId = authModalState.bank.bankDetailId || authModalState.bank.id;
    if (deleteBankDetail) {
      deleteBankDetail(bankId, authUser);
    }
    toast.success(`Bank account for ${authModalState.bank.bankName} deleted successfully`);
    setAuthModalState({ isOpen: false, bank: null });
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
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
    resetFilters,
  } = useCompanyBankTable({
    allBanks,
    toggleBankActive,
    onDeleteBank: handleDeleteRequest,
  });

  const hasActiveFilters = Boolean(
    (search && search.trim() !== '') ||
    (statusFilter && statusFilter !== 'ALL')
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, setPagination]);

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

  return (
    <div className="space-y-6 pb-8">
      {/* ── Page Header ── */}
      <PageHeader
        title="Company Bank Details"
        subtitle="Overview of registered corporate bank accounts, IFSC routing codes, and payment disbursement profiles."
        icon={<IconBankDetails className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/company-bank-details/new')}
            className="shadow-2xs text-xs font-semibold"
          >
            <IconAdd size={16} className="mr-1.5" aria-hidden="true" />
            <span>Add Bank Details</span>
          </Button>
        }
      />

      {/* ── Toolbar: Search, Status Filter & Reset ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bank name, branch, account number, IFSC..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset Filters"
      >
        {/* Status Filter */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="company-bank-status-filter"
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

      {/* ── Standardized TanStack Data Table & Mobile Responsive Cards ── */}
      <DataTable
        table={table}
        columns={columns}
        isLoading={loading}
        totalCount={filteredData.length}
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
          const dateVal = bank.updatedAt || bank.createdAt;
          const userVal = bank.updatedBy || bank.createdBy || 'Ian Chesnut';

          return (
            <Card
              key={bankId}
              padding="sm"
              className="space-y-3 border border-border hover:border-primary/30 transition-colors shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-heading truncate block">
                    {bank.companyName}
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
                    <span className="text-2xs text-text-muted/80 font-sans mt-0.5 truncate">
                      by {userVal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/company-bank-details/${bank.companyId}/view?bank=${bankId}`)}
                  className="flex-1 text-xs"
                >
                  <IconView size={13} className="mr-1.5" aria-hidden="true" />
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/company-bank-details/${bank.companyId}/edit?bank=${bankId}`)}
                  className="flex-1 text-xs"
                >
                  <IconEdit size={13} className="mr-1.5" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteRequest(bank)}
                  className="flex-1 text-xs"
                >
                  <IconDelete size={13} className="mr-1.5" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </Card>
          );
        }}
      />

      {/* ── Security Auth Verification Modal for Deletion ── */}
      <AuthVerificationModal
        isOpen={authModalState.isOpen}
        onClose={() => setAuthModalState({ isOpen: false, bank: null })}
        onSuccess={handleAuthDeleteSuccess}
        action="delete"
        bankAccount={authModalState.bank}
        companyName={authModalState.bank?.companyName || ''}
      />
    </div>
  );
}
