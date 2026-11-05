/**
 * MeetingPage.jsx — Main list view for scheduling, tracking, and managing meetings.
 *
 * Conforms to Section 5.4i of Frontend-API-Guide.md:
 * - Real API integration via meetingsService with offline mock fallback.
 * - Single-table TanStack DataTable with pagination, responsive cards, and full column sizing.
 * - Toolbar with search, scope filter (All vs My Meetings), status, type, and date filters.
 * - Responsive filter grid for small screens (prevents stacking into 5 massive rows on mobile).
 * - Status transition modals for Completing and Cancelling meetings.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Button,
  TableToolbar,
  SearchableSelect,
  DatePicker,
} from '../../components/ui';
import {
  IconCalendar,
  IconAdd,
} from '../../constants/icons';
import { useMeetings } from './hooks/useMeetings';
import MeetingTable from './components/MeetingTable';
import CompleteMeetingModal from './components/CompleteMeetingModal';
import CancelMeetingModal from './components/CancelMeetingModal';

const SCOPE_FILTERS = [
  { value: 'all', label: 'All Meetings' },
  { value: 'mine', label: 'My Meetings' },
];

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const TYPE_FILTERS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'Internal', label: 'Internal' },
  { value: 'Client', label: 'Client' },
  { value: 'Vendor', label: 'Vendor' },
];

export default function MeetingPage() {
  const navigate = useNavigate();
  const {
    scopeFilter,
    setScopeFilter,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    meetingTypeFilter,
    setMeetingTypeFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    meetings,
    loading,
    error,
    hasActiveFilters,
    resetFilters,
    handleComplete,
    handleCancel,
  } = useMeetings();

  const [selectedForComplete, setSelectedForComplete] = useState(null);
  const [selectedForCancel, setSelectedForCancel] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function onConfirmComplete(remarks) {
    if (!selectedForComplete) return;
    setActionLoading(true);
    try {
      await handleComplete(selectedForComplete.id, remarks);
      setSelectedForComplete(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function onConfirmCancel(remarks) {
    if (!selectedForCancel) return;
    setActionLoading(true);
    try {
      await handleCancel(selectedForCancel.id, remarks);
      setSelectedForCancel(null);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-16 w-full">
      {/* Page Header */}
      <PageHeader
        title="Meetings"
        subtitle="Schedule, manage and track internal discussions, client reviews, and vendor negotiations."
        icon={<IconCalendar className="h-6 w-6 text-primary" aria-hidden="true" />}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Meetings' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/meetings/new')}
            className="gap-2 shadow-2xs font-semibold"
          >
            <IconAdd className="w-4 h-4" />
            Schedule Meeting
          </Button>
        }
      />

      {/* Table Toolbar & Inline Responsive Filters */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title, attendee, inquiry, location..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset Filters"
      >
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:items-center sm:w-auto">
          {/* Scope: All vs My Meetings */}
          <div className="col-span-1 sm:w-36 min-w-0">
            <SearchableSelect
              placeholder="All Meetings"
              searchPlaceholder="Search scope..."
              options={SCOPE_FILTERS}
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e?.target?.value ?? e)}
            />
          </div>

          {/* Status Filter */}
          <div className="col-span-1 sm:w-36 min-w-0">
            <SearchableSelect
              placeholder="All Statuses"
              searchPlaceholder="Search status..."
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e?.target?.value ?? e)}
            />
          </div>

          {/* Type Filter */}
          <div className="col-span-2 sm:col-span-1 sm:w-36 min-w-0">
            <SearchableSelect
              placeholder="All Types"
              searchPlaceholder="Search type..."
              options={TYPE_FILTERS}
              value={meetingTypeFilter}
              onChange={(e) => setMeetingTypeFilter(e?.target?.value ?? e)}
            />
          </div>

          {/* From Date */}
          <div className="col-span-1 sm:w-44 sm:min-w-[170px] min-w-0">
            <DatePicker
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e?.target?.value ?? e)}
            />
          </div>

          {/* To Date */}
          <div className="col-span-1 sm:w-44 sm:min-w-[170px] min-w-0">
            <DatePicker
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e?.target?.value ?? e)}
            />
          </div>
        </div>
      </TableToolbar>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}

      {/* TanStack DataTable View */}
      {meetings.length === 0 && !loading ? (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-2xs">
          <MeetingTable
            meetings={[]}
            loading={false}
            onView={(m) => navigate(`/meetings/${m.id}`)}
            onEdit={(m) => navigate(`/meetings/${m.id}/edit`)}
            onComplete={(meeting) => setSelectedForComplete(meeting)}
            onCancel={(meeting) => setSelectedForCancel(meeting)}
          />
        </div>
      ) : (
        <MeetingTable
          meetings={meetings}
          loading={loading}
          onView={(m) => navigate(`/meetings/${m.id}`)}
          onEdit={(m) => navigate(`/meetings/${m.id}/edit`)}
          onComplete={(meeting) => setSelectedForComplete(meeting)}
          onCancel={(meeting) => setSelectedForCancel(meeting)}
        />
      )}

      {/* Status Transition Modals */}
      <CompleteMeetingModal
        isOpen={Boolean(selectedForComplete)}
        meeting={selectedForComplete}
        onClose={() => setSelectedForComplete(null)}
        onConfirm={onConfirmComplete}
        loading={actionLoading}
      />

      <CancelMeetingModal
        isOpen={Boolean(selectedForCancel)}
        meeting={selectedForCancel}
        onClose={() => setSelectedForCancel(null)}
        onConfirm={onConfirmCancel}
        loading={actionLoading}
      />
    </div>
  );
}
