/**
 * MeetingViewPage.jsx — Full-page 360-degree view for a Meeting record.
 *
 * Route: /meetings/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Badge,
  StatusBadge,
  Card,
  DetailField,
} from '../../components/ui';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconUsers,
  IconFileText,
  IconEdit,
  IconCheck,
  IconClose,
  IconInquiry,
  IconSuccess,
  IconError,
  IconBack,
} from '../../constants/icons';
import {
  getMeetingById,
  changeMeetingStatus,
} from '../../services/meetings/meetingsService';
import { formatDate } from '../../utils/dateUtils';
import AttendeeManager from './components/AttendeeManager';
import CompleteMeetingModal from './components/CompleteMeetingModal';
import CancelMeetingModal from './components/CancelMeetingModal';

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

export default function MeetingViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMeeting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMeetingById(id);
      setMeeting(data);
    } catch (err) {
      setError(err?.message || 'Failed to load meeting details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  async function handleConfirmComplete(remarks) {
    setActionLoading(true);
    try {
      await changeMeetingStatus(id, { status: 'Completed', remarks });
      setIsCompleteModalOpen(false);
      await loadMeeting();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmCancel(remarks) {
    setActionLoading(true);
    try {
      await changeMeetingStatus(id, { status: 'Cancelled', remarks });
      setIsCancelModalOpen(false);
      await loadMeeting();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-text-muted text-sm animate-pulse">
        Loading meeting details...
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 text-danger text-sm">
          {error || 'Meeting not found.'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/meetings')}>
          Back to Meetings
        </Button>
      </div>
    );
  }

  const isScheduled = meeting.status === 'Scheduled';
  const isCompleted = meeting.status === 'Completed';
  const isCancelled = meeting.status === 'Cancelled';

  return (
    <div className="space-y-6 pb-20 w-full">
      {/* Page Header */}
      <PageHeader
        title={meeting.meetingTitle}
        subtitle={`Meeting #${meeting.id} • ${meeting.meetingType} Discussion`}
        icon={<IconCalendar className="h-6 w-6 text-primary" aria-hidden="true" />}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Meetings', path: '/meetings' },
          { label: meeting.meetingTitle },
        ]}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/meetings')}
          >
            Back to Meetings
          </Button>
        }
        actions={
          <div className="flex items-center flex-wrap gap-2">
            <StatusBadge status={meeting.status} size="md" />

            {isScheduled && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/meetings/${meeting.id}/edit`)}
                  className="gap-1.5"
                >
                  <IconEdit className="w-4 h-4" />
                  Edit / Reschedule
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="gap-1.5 bg-success hover:bg-success/90 text-white"
                >
                  <IconCheck className="w-4 h-4" />
                  Complete
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="gap-1.5"
                >
                  <IconClose className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Outcome / Cancellation Remarks Banner */}
      {isCompleted && meeting.remarks && (
        <div className="p-4 rounded-xl border border-success/30 bg-success/10 space-y-1">
          <div className="flex items-center gap-2 text-success font-semibold text-sm">
            <IconSuccess className="w-4 h-4" />
            <span>Meeting Outcome & Minutes</span>
          </div>
          <p className="text-sm text-text whitespace-pre-wrap pl-6">{meeting.remarks}</p>
        </div>
      )}

      {isCancelled && meeting.remarks && (
        <div className="p-4 rounded-xl border border-danger/30 bg-danger/10 space-y-1">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <IconError className="w-4 h-4" />
            <span>Cancellation Reason</span>
          </div>
          <p className="text-sm text-text whitespace-pre-wrap pl-6">{meeting.remarks}</p>
        </div>
      )}

      {/* Overview & Timing Card */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <IconCalendar className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-heading">Meeting Details & Schedule</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
          <DetailField
            label="Meeting Type"
            value={
              <Badge
                variant={
                  meeting.meetingType === 'Client'
                    ? 'primary'
                    : meeting.meetingType === 'Vendor'
                    ? 'warning'
                    : 'neutral'
                }
              >
                {meeting.meetingType}
              </Badge>
            }
          />

          <DetailField
            label="Date"
            value={formatDate(meeting.meetingDate)}
          />

          <DetailField
            label="Time Window"
            value={
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <IconClock className="w-4 h-4 text-text-muted shrink-0" />
                <span>
                  {formatTime12(meeting.startTime)}
                  {meeting.endTime ? ` – ${formatTime12(meeting.endTime)}` : ''}
                </span>
              </div>
            }
          />

          <DetailField
            label="Organizer"
            value={
              <div>
                <p className="font-medium text-text">{meeting.organizerName}</p>
                <p className="text-xs text-text-muted font-mono">{meeting.organizerEmail}</p>
              </div>
            }
          />

          <DetailField
            label="Linked Inquiry"
            value={
              meeting.inquiryNumber ? (
                <span className="font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 text-xs">
                  {meeting.inquiryNumber}
                </span>
              ) : (
                <span className="text-text-muted">None (General)</span>
              )
            }
          />

          <DetailField
            label="Location / Link"
            value={
              meeting.location ? (
                <div className="flex items-center gap-1.5 text-text">
                  <IconMapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="break-all">{meeting.location}</span>
                </div>
              ) : (
                <span className="text-text-muted">—</span>
              )
            }
          />
        </div>
      </Card>

      {/* Agenda Card */}
      <Card>
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
          <IconFileText className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-heading">Agenda & Discussion Topics</h2>
        </div>
        {meeting.agenda ? (
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
            {meeting.agenda}
          </p>
        ) : (
          <p className="text-sm text-text-muted italic">No specific agenda provided.</p>
        )}
      </Card>

      {/* Attendees Card */}
      <Card>
        <AttendeeManager
          attendees={meeting.attendees || []}
          readOnly={true}
        />
      </Card>

      {/* Complete Meeting Modal */}
      <CompleteMeetingModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={handleConfirmComplete}
        meetingTitle={meeting.meetingTitle}
        loading={actionLoading}
      />

      {/* Cancel Meeting Modal */}
      <CancelMeetingModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        meetingTitle={meeting.meetingTitle}
        loading={actionLoading}
      />
    </div>
  );
}
