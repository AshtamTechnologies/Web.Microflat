/**
 * MeetingViewPage.jsx — Full-page 360-degree cockpit view for a Meeting record.
 *
 * Route: /meetings/:id
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
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
  IconExternalLink,
  IconBuilding2,
  IconUser,
} from '../../constants/icons';
import {
  getMeetingById,
  changeMeetingStatus,
  getMeetingDocumentTypes,
  uploadMeetingAttachment,
  downloadMeetingAttachment,
  deleteMeetingAttachment,
} from '../../services/meetings/meetingsService';
import { formatDate } from '../../utils/dateUtils';
import AttendeeManager from './components/AttendeeManager';
import MeetingAttachmentManager from './components/MeetingAttachmentManager';
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

function getDurationBadge(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = String(startTime).split(':').map(Number);
  const [eh, em] = String(endTime).split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${mins} min`;
}

export default function MeetingViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dynamic return destination & label
  const returnUrl =
    location.state?.from ||
    (meeting?.inquiryId ? `/inquiries/${meeting.inquiryId}` : '/meetings');
  const returnLabel =
    location.state?.fromTitle ||
    (meeting?.inquiryId ? 'Back to Inquiry' : 'Back to Meetings');

  const [documentTypes, setDocumentTypes] = useState([]);

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchDocTypes() {
      try {
        const types = await getMeetingDocumentTypes();
        if (mounted && Array.isArray(types)) {
          setDocumentTypes(types);
        }
      } catch (err) {
        console.warn('Failed to load meeting document types:', err);
      }
    }
    fetchDocTypes();
    return () => {
      mounted = false;
    };
  }, []);

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

  async function handleUploadAttachment(attachmentData) {
    await uploadMeetingAttachment(id, attachmentData);
    await loadMeeting();
  }

  async function handleDeleteAttachment(attachmentId) {
    await deleteMeetingAttachment(attachmentId);
    await loadMeeting();
  }

  async function handleDownloadAttachment(attachment) {
    await downloadMeetingAttachment(
      attachment.downloadUrl || attachment.id,
      attachment.fileName || attachment.documentTitle || 'attachment'
    );
  }

  const isVideoUrl = useMemo(() => {
    if (!meeting?.location) return false;
    const loc = meeting.location.trim().toLowerCase();
    return loc.startsWith('http://') || loc.startsWith('https://');
  }, [meeting?.location]);

  const durationText = useMemo(() => {
    return getDurationBadge(meeting?.startTime, meeting?.endTime);
  }, [meeting?.startTime, meeting?.endTime]);

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
        <Button variant="secondary" onClick={() => navigate(returnUrl)}>
          {returnLabel}
        </Button>
      </div>
    );
  }

  const isScheduled = meeting.status === 'Scheduled';
  const isCompleted = meeting.status === 'Completed';
  const isCancelled = meeting.status === 'Cancelled';

  return (
    <div className="space-y-5 pb-12 w-full">
      {/* Page Header */}
      <PageHeader
        title={meeting.meetingTitle}
        subtitle={`${meeting.meetingType ? `${meeting.meetingType} Discussion` : 'Meeting Details'}`}
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
            onClick={() => navigate(returnUrl)}
          >
            {returnLabel}
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
                  <IconEdit className="w-3.5 h-3.5" />
                  Edit
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="gap-1.5 bg-success hover:bg-success/90 text-white"
                >
                  <IconCheck className="w-3.5 h-3.5" />
                  Complete
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="gap-1.5"
                >
                  <IconClose className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* 2-Column Responsive Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Agenda, Outcomes, Attendees & Attachments (lg:col-span-7 xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Section: Minutes of Meeting (MoM) & Outcomes Card (if Completed) */}
          {isCompleted && meeting.remarks && (
            <Card padding="md" className="border-l-4 border-l-success shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                    <IconSuccess className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-heading leading-tight">
                      Minutes of Meeting (MoM) & Outcome
                    </h2>
                    <p className="text-2xs text-text-muted">Recorded discussion conclusions & action items</p>
                  </div>
                </div>
                <Badge variant="success" size="sm" className="text-2xs font-medium">
                  Official Record
                </Badge>
              </div>

              <div className="rounded-lg bg-slate-50/70 dark:bg-card-hover/40 border border-border/60 p-4">
                <div
                  className="text-xs sm:text-sm text-text leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: meeting.remarks }}
                />
              </div>
            </Card>
          )}

          {/* Section: Cancellation Notice Card (if Cancelled) */}
          {isCancelled && meeting.remarks && (
            <Card padding="md" className="border-l-4 border-l-danger shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center shrink-0">
                    <IconError className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-heading leading-tight">
                      Meeting Cancellation Notice
                    </h2>
                    <p className="text-2xs text-text-muted">Official reason for cancelling this meeting</p>
                  </div>
                </div>
                <Badge variant="danger" size="sm" className="text-2xs font-medium">
                  Cancelled
                </Badge>
              </div>

              <div className="rounded-lg bg-danger/5 border border-danger/20 p-4">
                <span className="text-2xs font-semibold text-danger uppercase tracking-wider block mb-1.5">
                  Reason for Cancellation
                </span>
                <div
                  className="text-xs sm:text-sm text-text leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: meeting.remarks }}
                />
              </div>
            </Card>
          )}

          {/* Section 1: Agenda & Discussion Topics Card */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <IconFileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-heading">Agenda & Discussion Topics</h2>
              </div>
              <Badge
                variant={
                  meeting.meetingType === 'Client'
                    ? 'primary'
                    : meeting.meetingType === 'Vendor'
                    ? 'warning'
                    : 'neutral'
                }
                size="sm"
                className="text-2xs"
              >
                {meeting.meetingType}
              </Badge>
            </div>

            <div>
              <span className="text-2xs font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
                Discussion Points & Purpose
              </span>
              {meeting.agenda ? (
                <div
                  className="text-xs sm:text-sm text-text leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: meeting.agenda }}
                />
              ) : (
                <p className="text-xs text-text-muted italic">No specific agenda outlined.</p>
              )}
            </div>
          </Card>

          {/* Section 2: Attendees Card */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <IconUsers className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-heading">Participants & Invitees</h2>
              </div>
              <Badge variant="neutral" size="sm" className="text-2xs px-2 py-0.5">
                {meeting.attendees?.length || 0} Attending
              </Badge>
            </div>

            <AttendeeManager
              attendees={meeting.attendees || []}
              readOnly={true}
            />
          </Card>

          {/* Section 3: Attachments & Documents Card */}
          <Card padding="md">
            <MeetingAttachmentManager
              attachments={meeting.attachments || []}
              onUploadDirect={handleUploadAttachment}
              onDelete={handleDeleteAttachment}
              onDownload={handleDownloadAttachment}
              documentTypes={documentTypes}
              canUpload={!isCancelled}
              readOnly={isCancelled}
            />
          </Card>
        </div>

        {/* RIGHT COLUMN / SIDEBAR: Schedule, Logistics & Context (lg:col-span-5 xl:col-span-4) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Card 1: Schedule & Logistics */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <IconClock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-heading">Schedule & Logistics</h2>
              </div>
              {durationText && (
                <span className="text-2xs font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {durationText}
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <DetailField
                label="Date"
                value={
                  <div className="flex items-center gap-1.5 font-medium text-text">
                    <IconCalendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span>{formatDate(meeting.meetingDate)}</span>
                  </div>
                }
              />

              <DetailField
                label="Time Window"
                value={
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <IconClock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span>
                      {formatTime12(meeting.startTime)}
                      {meeting.endTime ? ` – ${formatTime12(meeting.endTime)}` : ''}
                    </span>
                  </div>
                }
              />

              <DetailField
                label="Location / Link"
                value={
                  meeting.location ? (
                    isVideoUrl ? (
                      <div className="space-y-1.5 pt-0.5">
                        <a
                          href={meeting.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-2xs transition-colors w-full"
                        >
                          <IconExternalLink className="w-3.5 h-3.5" />
                          <span>Join Video Meeting</span>
                        </a>
                        <p className="text-2xs text-text-muted font-mono truncate" title={meeting.location}>
                          {meeting.location}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-text">
                        <IconMapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="break-all">{meeting.location}</span>
                      </div>
                    )
                  ) : (
                    <span className="text-text-muted">—</span>
                  )
                }
              />
            </div>
          </Card>

          {/* Card 2: Organizer & Linked Context */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
              <IconBuilding2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-heading">Organizer & Context</h2>
            </div>

            <div className="space-y-3 text-xs">
              <DetailField
                label="Organized By"
                value={
                  <div className="space-y-0.5">
                    <p className="font-medium text-text">{meeting.organizerName || 'Staff Member'}</p>
                    {meeting.organizerEmail && (
                      <p className="text-2xs text-text-muted font-mono">{meeting.organizerEmail}</p>
                    )}
                  </div>
                }
              />

              <DetailField
                label="Linked Inquiry"
                value={
                  meeting.inquiryId ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/20 bg-primary/5 mt-1">
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-2xs text-text-muted block">Related Inquiry</span>
                        <span className="font-mono font-bold text-xs text-primary truncate block">
                          {meeting.inquiryNumber || `#${meeting.inquiryId}`}
                        </span>
                      </div>
                      <Link
                        to={`/inquiries/${meeting.inquiryId}`}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0 ml-2"
                      >
                        <span>View</span>
                        <IconExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-text-muted">General (No inquiry linked)</span>
                  )
                }
              />
            </div>
          </Card>
        </div>
      </div>

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
