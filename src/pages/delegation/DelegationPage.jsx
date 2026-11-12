/**
 * DelegationPage.jsx — Main delegation management page.
 *
 * Route: /delegation
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Button,
  ScrollableTabs,
  TableToolbar,
  SearchableSelect,
} from '../../components/ui';
import { IconDelegation, IconAdd } from '../../constants/icons';
import { DELEGATION_STATUS_OPTIONS } from '../../constants/delegation';
import { useDelegations } from './hooks/useDelegations';
import DelegationList from './components/DelegationList';
import CancelDelegationModal from './components/CancelDelegationModal';
import ReinstateDelegationModal from './components/ReinstateDelegationModal';

export default function DelegationPage() {
  const navigate = useNavigate();
  const {
    activeTab,
    setTab,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    hasActiveFilters,
    resetFilters,
    delegations,
    counts,
    loading,
    error,
    refresh,
  } = useDelegations();

  const [selectedForCancel, setSelectedForCancel] = useState(null);
  const [selectedForReinstate, setSelectedForReinstate] = useState(null);

  const tabs = [
    {
      id: 'given',
      label: `Send (${counts.given})`,
    },
    {
      id: 'received',
      label: `Recived (${counts.received})`,
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* ── Page Header ── */}
      <PageHeader
        title="Delegation"
        subtitle="Going on leave? Hand your work to a colleague for the dates you are away. They will see your records as well as their own and can work on them for you. Nothing is moved: when the delegation ends, their access stops by itself."
        icon={<IconDelegation className="h-6 w-6 text-primary" aria-hidden="true" />}
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={IconAdd}
            onClick={() => navigate('/delegation/new')}
            className="shadow-2xs text-xs font-semibold"
          >
            New Delegation
          </Button>
        }
      />

      {/* ── Tab Bar (Send / Recived) ── */}
      <div className="border-b border-border">
        <ScrollableTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setTab}
          variant="underline"
        />
      </div>

      {/* ── Standard Table Toolbar & Filter Section ── */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          activeTab === 'given'
            ? 'Search by colleague, page, reason, or note…'
            : 'Search by delegator, page, reason, or note…'
        }
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset Filters"
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="delegation-filter-status"
            placeholder="All Statuses"
            searchPlaceholder="Search status…"
            options={DELEGATION_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </TableToolbar>

      {/* ── Main Delegation List ── */}
      <DelegationList
        delegations={delegations}
        activeTab={activeTab}
        loading={loading}
        error={error}
        onRetry={refresh}
        onView={(d) =>
          navigate(`/delegation/${d.id}`, {
            state: { from: `/delegation?tab=${activeTab}` },
          })
        }
        onEdit={(d) =>
          navigate(`/delegation/${d.id}/edit`, {
            state: { from: `/delegation?tab=${activeTab}` },
          })
        }
        onCancel={setSelectedForCancel}
        onReinstate={setSelectedForReinstate}
        onNewDelegation={() => navigate('/delegation/new')}
      />

      {/* ── Cancel Delegation Modal ── */}
      <CancelDelegationModal
        isOpen={Boolean(selectedForCancel)}
        onClose={() => setSelectedForCancel(null)}
        delegation={selectedForCancel}
        onSuccess={refresh}
      />

      {/* ── Reinstate Delegation Modal ── */}
      <ReinstateDelegationModal
        isOpen={Boolean(selectedForReinstate)}
        onClose={() => setSelectedForReinstate(null)}
        delegation={selectedForReinstate}
        onSuccess={refresh}
      />
    </div>
  );
}

