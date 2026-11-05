/**
 * MeetingPage.jsx — Main Meetings overview and management page.
 *
 * Route: /meetings
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Button,
  TableToolbar,
  SearchableSelect,
  DatePicker,
  EmptyState,
} from '../../components/ui';
import {
  IconCalendar,
  IconAdd,
} from '../../constants/icons';
import { useMeetings } from './hooks/useMeetings';
import MeetingTable from './components/MeetingTable';
import CompleteMeetingModal from './components/CompleteMeetingModal';
import CancelMeetingModal from './components/CancelMeetingModal';

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
    counts,
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

      {/* Table Toolbar & Inline Filters */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title, attendee, inquiry, location..."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        resetLabel="Reset Filters"
      >
        <div className="w-full sm:w-44">
          <SearchableSelect
            placeholder="All Statuses"
            searchPlaceholder="Search status..."
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e?.target?.value ?? e)}
          />
        </div>
        <div className="w-full sm:w-44">
          <SearchableSelect
            placeholder="All Types"
            searchPlaceholder="Search type..."
            options={TYPE_FILTERS}
            value={meetingTypeFilter}
            onChange={(e) => setMeetingTypeFilter(e?.target?.value ?? e)}
          />
        </div>
        <div className="w-full sm:w-44 min-w-[170px]">
          <DatePicker
            placeholder="From Date"
            value={fromDate}
            onChange={(e) => setFromDate(e?.target?.value ?? e)}
          />
        </div>
        <div className="w-full sm:w-44 min-w-[170px]">
          <DatePicker
            placeholder="To Date"
            value={toDate}
            onChange={(e) => setToDate(e?.target?.value ?? e)}
          />
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
          <EmptyState
            title="No meetings found"
            description={
              hasActiveFilters
                ? 'No meetings match your current search or filter criteria.'
                : 'No meetings scheduled yet. Click below to schedule your first meeting.'
            }
            actionLabel={hasActiveFilters ? 'Clear Filters' : 'Schedule Meeting'}
            onAction={hasActiveFilters ? resetFilters : () => navigate('/meetings/new')}
          />
        </div>
      ) : (
        <MeetingTable
          meetings={meetings}
          loading={loading}
          onView={(m) => navigate(`/meetings/${m.id}`)}
          onEdit={(m) => navigate(`/meetings/${m.id}/edit`)}
          onComplete={(m) => setSelectedForComplete(m)}
          onCancel={(m) => setSelectedForCancel(m)}
        />
      )}

      {/* Complete Meeting Modal */}
      <CompleteMeetingModal
        isOpen={Boolean(selectedForComplete)}
        onClose={() => setSelectedForComplete(null)}
        onConfirm={onConfirmComplete}
        meetingTitle={selectedForComplete?.meetingTitle}
        loading={actionLoading}
      />

      {/* Cancel Meeting Modal */}
      <CancelMeetingModal
        isOpen={Boolean(selectedForCancel)}
        onClose={() => setSelectedForCancel(null)}
        onConfirm={onConfirmCancel}
        meetingTitle={selectedForCancel?.meetingTitle}
        loading={actionLoading}
      />
    </div>
  );
}
